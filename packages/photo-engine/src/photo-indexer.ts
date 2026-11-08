/**
 * @gallery/photo-engine - Photo Ingestion & Indexing Pipeline
 * Coordinates scanning, hashing, EXIF extraction, and SQLite synchronization.
 */

import crypto from 'node:crypto';
import type { PhotoItem } from '@gallery/shared';
import { ExclusionManager } from '@gallery/security';
import { ExifExtractor } from '@gallery/metadata-engine';
import { FileScanner } from './file-scanner.js';
import { ThumbnailCacheManager } from './thumbnail-cache.js';
import { computeFileHash } from './hash.js';

export interface IndexerProgress {
  scannedFiles: number;
  indexedPhotos: number;
  skippedDuplicates: number;
  currentFile: string;
}

export interface IndexerOptions {
  exclusionManager: ExclusionManager;
  thumbnailCache?: ThumbnailCacheManager;
  onProgress?: (progress: IndexerProgress) => void;
  signal?: AbortSignal;
}

export class PhotoIndexer {
  /**
   * Scans a target directory and processes all real user photographs.
   * Zero mock data: Reads and hashes real files on the filesystem.
   */
  public static async indexDirectory(
    directoryPath: string,
    options: IndexerOptions
  ): Promise<PhotoItem[]> {
    const discoveredPaths = await FileScanner.scanDirectory(directoryPath, {
      exclusionManager: options.exclusionManager,
      signal: options.signal,
    });

    const photos: PhotoItem[] = [];
    const seenHashes = new Set<string>();

    const progress: IndexerProgress = {
      scannedFiles: 0,
      indexedPhotos: 0,
      skippedDuplicates: 0,
      currentFile: '',
    };

    const thumbnailManager = options.thumbnailCache || new ThumbnailCacheManager();

    for (const filePath of discoveredPaths) {
      if (options.signal?.aborted) break;

      progress.scannedFiles++;
      progress.currentFile = filePath;
      options.onProgress?.(progress);

      // Check exclusion again in case state mutated dynamically
      if (options.exclusionManager.isPathExcluded(filePath)) {
        continue;
      }

      try {
        // 1. Compute Content SHA-256 Hash
        const contentHash = await computeFileHash(filePath);

        // Deduplication check
        if (seenHashes.has(contentHash)) {
          progress.skippedDuplicates++;
          options.onProgress?.(progress);
          continue;
        }
        seenHashes.add(contentHash);

        // 2. Extract EXIF & GPS Metadata
        const metadata = await ExifExtractor.extract(filePath);

        // 3. Resolve Thumbnail Paths
        const thumbs = thumbnailManager.getThumbnailPaths(contentHash);

        // 4. Create Fully Formed PhotoItem
        const photo: PhotoItem = {
          id: crypto.randomUUID(),
          contentHash,
          fileUri: metadata.fileUri,
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
          exif: metadata.exif,
          coordinates: metadata.coordinates,
          thumbnailPath: thumbs.gridThumbnail,
          previewPath: thumbs.previewThumbnail,
          syncState: 'synced',
        };

        photos.push(photo);
        progress.indexedPhotos++;
        options.onProgress?.(progress);
      } catch (err) {
        // Skip corrupted or unreadable files gracefully
        console.warn(`[WARN] Failed to index ${filePath}:`, err);
      }
    }

    return photos;
  }
}
