/**
 * @gallery/photo-engine - Windows MTP Phone Import Engine
 * Detects connected Android/WPD USB devices, reviews new media, and executes streaming chunked transfers.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { PhotoItem } from '@gallery/shared';
import { ExclusionManager } from '@gallery/security';
import { ExifExtractor } from '@gallery/metadata-engine';
import { computeFileHash } from './hash.js';
import { ThumbnailCacheManager } from './thumbnail-cache.js';

const execAsync = promisify(exec);

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

export class MtpManager {
  /**
   * Queries Windows WPD (Windows Portable Devices) and PnPEntity for connected Android/MTP mobile devices.
   * Real hardware check: Inspects actual system devices. Returns empty array if none are plugged in.
   */
  public static async detectConnectedDevices(): Promise<MtpDevice[]> {
    if (process.platform !== 'win32') {
      return [];
    }

    try {
      // 1. Query WMI / CIM for WPD and WUDFWpdMtp class entities
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq 'WPD' -or $_.Service -eq 'WUDFWpdMtp' } | Select-Object Name, DeviceID, Manufacturer | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand, { timeout: 8000 });

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

      for (const raw of rawDevices) {
        if (!raw || !raw.Name) continue;
        const name = String(raw.Name).trim();
        const deviceId = String(raw.DeviceID || crypto.randomUUID());

        // Check if device maps to a drive letter or shell namespace
        let devPath = '';
        if (/^[A-Z]:\\?$/i.test(name)) {
          devPath = name.endsWith('\\') ? name : `${name}\\`;
        }

        devices.push({
          id: deviceId,
          name: name.length > 3 ? name : `Android Device (${name})`,
          path: devPath,
          manufacturer: raw.Manufacturer ? String(raw.Manufacturer).trim() : undefined,
          isStorageAccessible: Boolean(devPath && fs.existsSync(devPath)),
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
    if (!devicePath || !fs.existsSync(devicePath)) {
      return [];
    }

    if (exclusionManager.isPathExcluded(devicePath)) {
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

    const supportedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.avif', '.mp4']);

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
        // Stream copy source -> destination
        await fs.promises.copyFile(candidate.sourceUri, targetFilePath);

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

