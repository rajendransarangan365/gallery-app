/**
 * @gallery/photo-engine - Progressive Thumbnail Cache Manager
 * Content-addressable thumbnail storage (SHA-256 hash indexed).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ThumbnailPaths {
  gridThumbnail: string;   // 256px
  previewThumbnail: string;// 1280px
}

export class ThumbnailCacheManager {
  private cacheRoot: string;
  private inMemoryIndex: Set<string> = new Set();

  constructor(customCacheDir?: string) {
    this.cacheRoot = customCacheDir || path.join(os.homedir(), '.photogallery', 'cache');
  }

  /**
   * Initializes disk cache directories.
   */
  public async initialize(): Promise<void> {
    await fs.promises.mkdir(path.join(this.cacheRoot, 'thumbs', '256'), { recursive: true });
    await fs.promises.mkdir(path.join(this.cacheRoot, 'preview', '1280'), { recursive: true });
  }

  /**
   * Computes the deterministic disk cache paths for a photo by its content hash.
   */
  public getThumbnailPaths(contentHash: string): ThumbnailPaths {
    return {
      gridThumbnail: path.join(this.cacheRoot, 'thumbs', '256', `${contentHash}.webp`),
      previewThumbnail: path.join(this.cacheRoot, 'preview', '1280', `${contentHash}.webp`),
    };
  }

  /**
   * Checks if a thumbnail already exists on disk.
   */
  public async hasThumbnail(contentHash: string): Promise<boolean> {
    if (this.inMemoryIndex.has(contentHash)) {
      return true;
    }
    const { gridThumbnail } = this.getThumbnailPaths(contentHash);
    try {
      await fs.promises.access(gridThumbnail, fs.constants.F_OK);
      this.inMemoryIndex.add(contentHash);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Purges all thumbnails associated with a specific content hash.
   * Invoked immediately when a folder is added to exclusions.
   */
  public async purgeThumbnail(contentHash: string): Promise<void> {
    const paths = this.getThumbnailPaths(contentHash);
    await fs.promises.unlink(paths.gridThumbnail).catch(() => {});
    await fs.promises.unlink(paths.previewThumbnail).catch(() => {});
    this.inMemoryIndex.delete(contentHash);
  }
}
