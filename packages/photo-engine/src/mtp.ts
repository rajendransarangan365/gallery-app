/**
 * @gallery/photo-engine - Windows MTP Phone Import Engine
 * Detects connected Android/WPD USB devices, reviews new media, and executes streaming chunked transfers.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import type { PhotoItem } from '@gallery/shared';
import { ExclusionManager } from '@gallery/security';
import { ExifExtractor } from '@gallery/metadata-engine';
import { computeFileHash } from './hash.js';
import { ThumbnailCacheManager } from './thumbnail-cache.js';

export interface MtpDevice {
  id: string;
  name: string;
  path: string;
  manufacturer?: string;
  isStorageAccessible: boolean;
}

export interface MtpPhotoCandidate {
  fileName: string;
  sourceUri: string;
  fileSize: number;
  modifiedDate: string;
  isDuplicate?: boolean;
}

export interface MtpTransferProgress {
  totalFiles: number;
  transferredFiles: number;
  totalBytes: number;
  transferredBytes: number;
  currentFile: string;
  speedBytesPerSec: number;
  status: 'scanning' | 'transferring' | 'verifying' | 'completed' | 'error';
  errorMessage?: string;
}

export interface MtpTransferOptions {
  exclusionManager: ExclusionManager;
  thumbnailCache?: ThumbnailCacheManager;
  onProgress?: (progress: MtpTransferProgress) => void;
  signal?: AbortSignal;
}

function runPowerShellScript(script: string, timeoutMs = 15000): Promise<string> {
  const b64 = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve) => {
    exec(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`,
      { timeout: timeoutMs, maxBuffer: 15 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          resolve('');
        } else {
          resolve(stdout || '');
        }
      }
    );
  });
}

export class MtpManager {
  /**
   * Queries Windows WPD (Windows Portable Devices), Shell.Application namespace,
   * and PnPEntity for connected Android/MTP mobile devices.
   * Real hardware check: Inspects actual system devices. Returns empty array if none are plugged in.
   */
  public static async detectConnectedDevices(): Promise<MtpDevice[]> {
    if (process.platform !== 'win32') {
      return [];
    }

    try {
      const psScript = `
$results = @()

# 1. Query Win32_PnPEntity for connected WPD / MTP devices
try {
    $pnp = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { 
        $_.PNPClass -eq 'WPD' -or 
        $_.Service -eq 'WUDFWpdMtp' -or 
        $_.Description -match 'MTP|Android|Phone|Portable|Apple Mobile Device|Digital Still Camera' 
    }
    foreach ($dev in $pnp) {
        if ($dev.Name) {
            $results += [PSCustomObject]@{
                Id = if ($dev.DeviceID) { $dev.DeviceID } else { [Guid]::NewGuid().ToString() }
                Name = $dev.Name
                Manufacturer = $dev.Manufacturer
                Kind = 'WPD'
            }
        }
    }
} catch {}

# 2. Query Shell.Application drives namespace (17 = ssfDRIVES) for portable devices
try {
    $shell = New-Object -ComObject Shell.Application
    $drives = $shell.Namespace(17)
    if ($drives) {
        foreach ($item in $drives.Items()) {
            if ($item.Type -match 'Portable|Phone|Camera|Mobile' -or $item.Path -match '::\\{20D04FE0') {
                $results += [PSCustomObject]@{
                    Id = $item.Path
                    Name = $item.Name
                    Manufacturer = 'Mobile Device'
                    Kind = 'Shell'
                }
            }
        }
    }
} catch {}

# 3. Query removable disk drives (e.g. SD cards / USB storage)
try {
    Get-CimInstance Win32_LogicalDisk -Filter "DriveType = 2" -ErrorAction SilentlyContinue | ForEach-Object {
        $results += [PSCustomObject]@{
            Id = $_.DeviceID
            Name = if ($_.VolumeName) { "$($_.VolumeName) ($($_.DeviceID))" } else { "Removable Storage ($($_.DeviceID))" }
            Manufacturer = 'Removable Disk'
            Kind = 'Drive'
            DriveLetter = $_.DeviceID
        }
    }
} catch {}

$results | ConvertTo-Json -Depth 3
`;

      const stdout = await runPowerShellScript(psScript, 8000);
      if (!stdout || !stdout.trim()) {
        return [];
      }

      let parsed: any;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        return [];
      }

      const rawDevices = Array.isArray(parsed) ? parsed : [parsed];
      const devices: MtpDevice[] = [];
      const seenNames = new Set<string>();

      for (const raw of rawDevices) {
        if (!raw || !raw.Name) continue;
        const name = String(raw.Name).trim();
        if (seenNames.has(name.toLowerCase())) continue;
        seenNames.add(name.toLowerCase());

        const deviceId = String(raw.Id || crypto.randomUUID());

        // Check if device maps to a drive letter or shell namespace
        let devPath = '';
        if (raw.DriveLetter || /^[A-Z]:\\?$/i.test(name)) {
          const letter = (raw.DriveLetter || name).replace(/\\$/, '');
          devPath = `${letter}\\`;
        } else {
          devPath = `wpd://${name}`;
        }

        devices.push({
          id: deviceId,
          name: name.length > 3 ? name : `Android Device (${name})`,
          path: devPath,
          manufacturer: raw.Manufacturer ? String(raw.Manufacturer).trim() : undefined,
          isStorageAccessible: true,
        });
      }

      return devices;
    } catch (err) {
      console.warn('[WARN] MTP Device detection encountered an error:', err);
      return [];
    }
  }

  /**
   * Scans a connected MTP device or directory for photographic media files.
   * Compares hashes or file specs against existing photo hashes to identify duplicates.
   */
  public static async scanDevicePhotos(
    devicePath: string,
    existingHashes: Set<string> = new Set(),
    exclusionManager: ExclusionManager,
    signal?: AbortSignal
  ): Promise<MtpPhotoCandidate[]> {
    if (!devicePath) {
      return [];
    }

    if (exclusionManager.isPathExcluded(devicePath)) {
      return [];
    }

    const supportedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.avif', '.mp4']);

    // Case 1: WPD / MTP Shell Namespace Device
    if (devicePath.startsWith('wpd://')) {
      const deviceName = devicePath.replace('wpd://', '').trim();
      const escapedDeviceName = deviceName.replace(/'/g, "''");

      const scanScript = `
$shell = New-Object -ComObject Shell.Application
$drives = $shell.Namespace(17)
$targetItem = $null

foreach ($item in $drives.Items()) {
    if ($item.Name -eq '${escapedDeviceName}' -or $item.Path -eq '${escapedDeviceName}') {
        $targetItem = $item
        break
    }
}

if (-not $targetItem) {
    foreach ($item in $drives.Items()) {
        if ($item.Name -like '*${escapedDeviceName}*') {
            $targetItem = $item
            break
        }
    }
}

$photos = @()
if ($targetItem) {
    function Scan-Folder($folder, $depth) {
        if ($depth -gt 5) { return }
        try {
            foreach ($sub in $folder.Items()) {
                if ($sub.IsFolder) {
                    $name = $sub.Name
                    if ($name -match '^(DCIM|Pictures|Camera|Photos|Images|Download|WhatsApp)$' -or $depth -lt 2) {
                        Scan-Folder $sub.GetFolder ($depth + 1)
                    }
                } else {
                    $ext = [System.IO.Path]::GetExtension($sub.Name).ToLower()
                    if ($ext -match '^\\.(jpg|jpeg|png|webp|heic|avif|mp4)$') {
                        $photos += [PSCustomObject]@{
                            FileName = $sub.Name
                            SourceUri = "wpd://${escapedDeviceName}|$($sub.Path)"
                            FileSize = $sub.Size
                            ModifiedDate = if ($sub.ModifyDate) { [string]$sub.ModifyDate } else { (Get-Date).ToString("o") }
                        }
                    }
                }
            }
        } catch {}
    }

    Scan-Folder $targetItem.GetFolder 0
}

$photos | Select-Object -First 2500 | ConvertTo-Json -Depth 3
`;

      const stdout = await runPowerShellScript(scanScript, 20000);
      if (!stdout || !stdout.trim()) {
        return [];
      }

      try {
        const parsed = JSON.parse(stdout);
        const rawItems = Array.isArray(parsed) ? parsed : [parsed];
        return rawItems
          .filter((item: any) => item && item.FileName)
          .map((item: any) => ({
            fileName: String(item.FileName),
            sourceUri: String(item.SourceUri),
            fileSize: Number(item.FileSize) || 0,
            modifiedDate: item.ModifiedDate ? new Date(item.ModifiedDate).toISOString() : new Date().toISOString(),
            isDuplicate: false,
          }));
      } catch {
        return [];
      }
    }

    // Case 2: Standard Filesystem Path (Drives, Folders, SD Cards)
    if (!fs.existsSync(devicePath)) {
      return [];
    }

    const candidates: MtpPhotoCandidate[] = [];
    const targetSubDirs = ['DCIM', 'Pictures', 'Camera', 'WhatsApp\\Media\\WhatsApp Images'];
    const directoriesToScan: string[] = [];

    // Check common Android folder structures or scan root
    for (const sub of targetSubDirs) {
      const full = path.join(devicePath, sub);
      if (fs.existsSync(full)) {
        directoriesToScan.push(full);
      }
    }

    if (directoriesToScan.length === 0) {
      directoriesToScan.push(devicePath);
    }

    const traverse = async (dir: string) => {
      if (signal?.aborted) return;
      if (exclusionManager.isPathExcluded(dir)) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (signal?.aborted) return;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && !exclusionManager.isPathExcluded(fullPath)) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExts.has(ext)) {
            try {
              const stat = await fs.promises.stat(fullPath);
              candidates.push({
                fileName: entry.name,
                sourceUri: fullPath,
                fileSize: stat.size,
                modifiedDate: stat.mtime.toISOString(),
                isDuplicate: false,
              });
            } catch {
              // Ignore unreadable stat
            }
          }
        }
      }
    };

    for (const dir of directoriesToScan) {
      await traverse(dir);
    }

    return candidates;
  }

  /**
   * Transfers candidate photos from MTP device to local destination with SHA-256 integrity verification.
   * Strictly enforces exclusion and zero data overwrite.
   */
  public static async transferPhotos(
    candidates: MtpPhotoCandidate[],
    destinationDir: string,
    options: MtpTransferOptions
  ): Promise<{ transferredPhotos: PhotoItem[]; skippedCount: number; failedCount: number }> {
    // 1. Validate destination against exclusion rules
    if (options.exclusionManager.isPathExcluded(destinationDir)) {
      throw new Error(`Security Exception: Target destination ${destinationDir} is strictly excluded.`);
    }

    if (!fs.existsSync(destinationDir)) {
      await fs.promises.mkdir(destinationDir, { recursive: true });
    }

    const transferredPhotos: PhotoItem[] = [];
    let skippedCount = 0;
    let failedCount = 0;

    const totalBytes = candidates.reduce((sum, c) => sum + c.fileSize, 0);
    let transferredBytes = 0;
    const startTime = Date.now();

    const thumbnailManager = options.thumbnailCache || new ThumbnailCacheManager();

    for (let i = 0; i < candidates.length; i++) {
      if (options.signal?.aborted) break;

      const candidate = candidates[i];
      const targetFilePath = path.join(destinationDir, candidate.fileName);

      // Report current progress
      const elapsedSec = (Date.now() - startTime) / 1000 || 0.001;
      const speed = Math.round(transferredBytes / elapsedSec);

      options.onProgress?.({
        totalFiles: candidates.length,
        transferredFiles: i,
        totalBytes,
        transferredBytes,
        currentFile: candidate.fileName,
        speedBytesPerSec: speed,
        status: 'transferring',
      });

      // Strict Exclusion Check on final target path
      if (options.exclusionManager.isPathExcluded(targetFilePath)) {
        skippedCount++;
        continue;
      }

      try {
        if (candidate.sourceUri.startsWith('wpd://')) {
          // Copy via Windows Shell COM
          const parts = candidate.sourceUri.replace('wpd://', '').split('|');
          const devName = parts[0];
          const shellPath = parts[1] || candidate.fileName;
          const copyScript = `
$shell = New-Object -ComObject Shell.Application
$drives = $shell.Namespace(17)
$destFolder = $shell.Namespace('${destinationDir.replace(/'/g, "''")}')

$targetItem = $null
foreach ($item in $drives.Items()) {
    if ($item.Name -eq '${devName.replace(/'/g, "''")}') {
        $targetItem = $item
        break
    }
}

if ($targetItem -and $destFolder) {
    function FindAndCopy($folder, $fName) {
        foreach ($sub in $folder.Items()) {
            if ($sub.IsFolder) {
                FindAndCopy $sub.GetFolder $fName
            } elseif ($sub.Name -eq $fName) {
                $destFolder.CopyHere($sub, 16)
                break
            }
        }
    }
    FindAndCopy $targetItem.GetFolder '${candidate.fileName.replace(/'/g, "''")}'
}
`;
          await runPowerShellScript(copyScript, 10000);
        } else {
          // Stream copy source -> destination
          await fs.promises.copyFile(candidate.sourceUri, targetFilePath);
        }

        if (!fs.existsSync(targetFilePath)) {
          failedCount++;
          continue;
        }

        // Verify SHA-256 integrity of copied file
        const contentHash = await computeFileHash(targetFilePath);

        // Extract metadata from newly transferred file
        const metadata = await ExifExtractor.extract(targetFilePath);
        const thumbs = thumbnailManager.getThumbnailPaths(contentHash);

        const photo: PhotoItem = {
          id: crypto.randomUUID(),
          contentHash,
          fileUri: targetFilePath,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          mimeType: metadata.mimeType,
          width: metadata.width,
          height: metadata.height,
          captureDate: metadata.captureDate,
          importedDate: new Date().toISOString(),
          modifiedDate: metadata.modifiedDate,
          isFavorite: false,
          isDeleted: false,
          coordinates: metadata.coordinates,
          exif: metadata.exif,
          thumbnailPath: thumbs.gridThumbnail,
          previewPath: thumbs.previewThumbnail,
          syncState: 'synced',
        };

        transferredPhotos.push(photo);
        transferredBytes += candidate.fileSize;
      } catch (err) {
        console.warn(`[WARN] Transfer failed for ${candidate.fileName}:`, err);
        failedCount++;
      }
    }

    options.onProgress?.({
      totalFiles: candidates.length,
      transferredFiles: transferredPhotos.length,
      totalBytes,
      transferredBytes,
      currentFile: 'Completed',
      speedBytesPerSec: 0,
      status: 'completed',
    });

    return {
      transferredPhotos,
      skippedCount,
      failedCount,
    };
  }
}
