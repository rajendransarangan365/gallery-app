/**
 * @gallery/vault-engine - Persistent Exclusion Registry & Instant Purge Protocol
 * Strictly enforces exclusion persistence and immediate purging of cached assets.
 */

import { ExclusionManager } from '@gallery/security';
import { ThumbnailCacheManager } from '@gallery/photo-engine';
import type { ExcludedFolder, PhotoItem } from '@gallery/shared';
import crypto from 'node:crypto';

export interface ExclusionPurgeResult {
  canonicalPath: string;
  purgedPhotosCount: number;
  purgedThumbnailsCount: number;
}

export class ExclusionRegistry {
  private exclusionManager: ExclusionManager;
  private thumbnailCache: ThumbnailCacheManager;

  constructor(
    exclusionManager: ExclusionManager,
    thumbnailCache?: ThumbnailCacheManager
  ) {
    this.exclusionManager = exclusionManager;
    this.thumbnailCache = thumbnailCache || new ThumbnailCacheManager();
  }

  /**
   * Adds a folder to the exclusion registry and executes the Instant Purge Protocol.
   * Purges all previously generated thumbnails and database items for that path.
   */
  public async addExclusionAndPurge(
    folderPath: string,
    existingPhotos: PhotoItem[],
    onDeletePhotoRecord?: (photoId: string) => Promise<void> | void
  ): Promise<ExclusionPurgeResult> {
    // 1. Register canonical path in memory & filesystem validator
    const canonicalPath = this.exclusionManager.addExclusion(folderPath, true);

    let purgedPhotosCount = 0;
    let purgedThumbnailsCount = 0;

    // 2. Identify all photos that belong to newly excluded directory
    const affectedPhotos = existingPhotos.filter(photo =>
      this.exclusionManager.isPathExcluded(photo.fileUri)
    );

    for (const photo of affectedPhotos) {
      // 3. Purge WebP thumbnails from disk cache
      await this.thumbnailCache.purgeThumbnail(photo.contentHash);
      purgedThumbnailsCount++;

      // 4. Delete photo from SQLite database
      if (onDeletePhotoRecord) {
        await onDeletePhotoRecord(photo.id);
      }
      purgedPhotosCount++;
    }

    return {
      canonicalPath,
      purgedPhotosCount,
      purgedThumbnailsCount,
    };
  }

  /**
   * Removes a folder from exclusions.
   */
  public removeExclusion(folderPath: string): boolean {
    return this.exclusionManager.removeExclusion(folderPath);
  }

  /**
   * Lists all current exclusions.
   */
  public listExclusions(): ExcludedFolder[] {
    return this.exclusionManager.getExclusions().map(e => ({
      id: crypto.randomUUID(),
      canonicalPath: e.canonicalPath,
      inode: e.inode,
      isRecursive: e.isRecursive,
      addedAt: new Date().toISOString(),
    }));
  }
}
