/**
 * @gallery/sync-engine - SyncSession & Protocol
 * Two-way incremental sync protocol using content-addressable SHA-256 hashes.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { SyncManifestItem, PhotoItem } from '@gallery/shared';
import { ExclusionManager } from '@gallery/security';
import { ExifExtractor } from '@gallery/metadata-engine';
import { computeFileHash, ThumbnailCacheManager } from '@gallery/photo-engine';
import type { SyncManifestComparison } from './types.js';

export interface SyncProgressUpdate {
  sessionId: string;
  totalFiles: number;
  transferredFiles: number;
  totalBytes: number;
  transferredBytes: number;
  currentFileName: string;
  speedBytesPerSec: number;
  status: 'comparing' | 'transferring' | 'verifying' | 'completed' | 'error';
  errorMessage?: string;
}

export interface SyncExecutionOptions {
  exclusionManager: ExclusionManager;
  thumbnailCache?: ThumbnailCacheManager;
  onProgress?: (progress: SyncProgressUpdate) => void;
  signal?: AbortSignal;
}

export class SyncEngine {
  /**
   * Compares two manifests using content-addressable SHA-256 hashes.
   * Produces symmetric delta for zero redundant transfers.
   */
  public static compareManifests(
    localManifest: SyncManifestItem[],
    remoteManifest: SyncManifestItem[]
  ): SyncManifestComparison {
    const localHashMap = new Map<string, SyncManifestItem>();
    for (const item of localManifest) {
      localHashMap.set(item.contentHash, item);
    }

    const remoteHashMap = new Map<string, SyncManifestItem>();
    for (const item of remoteManifest) {
      remoteHashMap.set(item.contentHash, item);
    }

    const localMissingItems: SyncManifestItem[] = [];
    const remoteMissingItems: SyncManifestItem[] = [];
    let commonCount = 0;

    // What is remote missing from local?
    for (const [hash, localItem] of localHashMap.entries()) {
      if (!remoteHashMap.has(hash)) {
        remoteMissingItems.push(localItem);
      } else {
        commonCount++;
      }
    }

    // What is local missing from remote?
    for (const [hash, remoteItem] of remoteHashMap.entries()) {
      if (!localHashMap.has(hash)) {
        localMissingItems.push(remoteItem);
      }
    }

    return {
      localMissingItems,
      remoteMissingItems,
      commonCount,
    };
  }

  /**
   * Converts existing library PhotoItem array into SyncManifestItem format.
   */
  public static buildManifestFromPhotos(photos: PhotoItem[]): SyncManifestItem[] {
    return photos.map((p) => ({
      contentHash: p.contentHash,
      fileName: p.fileName,
      fileSize: p.fileSize,
      captureDate: p.captureDate,
      modifiedDate: p.modifiedDate,
      relativeSyncPath: p.fileName,
    }));
  }

  /**
   * Executes local ingestion of missing photos transferred from remote peer.
   * Verifies SHA-256 checksum on arrival, extracts EXIF/GPS, generates progressive WebP thumbnails,
   * and enforces strict folder exclusion boundaries.
   */
  public static async ingestTransferredFile(
    tempFilePath: string,
    targetDirectory: string,
    expectedHash: string,
    fileName: string,
    options: SyncExecutionOptions
  ): Promise<PhotoItem> {
    // 1. Destination exclusion security validation
    if (options.exclusionManager.isPathExcluded(targetDirectory)) {
      throw new Error(`Security Exception: Target sync directory ${targetDirectory} is strictly excluded.`);
    }

    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Temporary file not found: ${tempFilePath}`);
    }

    // 2. Cryptographic Checksum Verification
    const actualHash = await computeFileHash(tempFilePath);
    if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new Error(
        `Integrity Check Failed for ${fileName}: expected ${expectedHash}, computed ${actualHash}`
      );
    }

    if (!fs.existsSync(targetDirectory)) {
      await fs.promises.mkdir(targetDirectory, { recursive: true });
    }

    const finalPath = path.join(targetDirectory, fileName);

    // Fail-closed if destination path is dynamically excluded
    if (options.exclusionManager.isPathExcluded(finalPath)) {
      throw new Error(`Security Exception: Target destination ${finalPath} is strictly excluded.`);
    }

    // Move from temporary staging to final gallery location
    await fs.promises.rename(tempFilePath, finalPath);

    // 3. Extract metadata & generate thumbnails
    const metadata = await ExifExtractor.extract(finalPath);
    const thumbnailManager = options.thumbnailCache || new ThumbnailCacheManager();
    const thumbs = thumbnailManager.getThumbnailPaths(actualHash);

    return {
      id: crypto.randomUUID(),
      contentHash: actualHash,
      fileUri: finalPath,
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
  }
}
