/**
 * @gallery/photo-engine - Asynchronous Native File Scanner
 * Real filesystem directory traversal with strict folder exclusion enforcement.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ExclusionManager } from '@gallery/security';
import { ExifExtractor } from '@gallery/metadata-engine';

export interface ScanProgress {
  directoriesScanned: number;
  filesFound: number;
  currentDirectory: string;
}

export interface ScannerOptions {
  exclusionManager: ExclusionManager;
  onProgress?: (progress: ScanProgress) => void;
  onError?: (error: Error, path: string) => void;
  signal?: AbortSignal;
}

export class FileScanner {
  /**
   * Recursively scans a root directory for all valid media files.
   * Strictly enforces exclusion rules: Never enters or reads excluded paths.
   */
  public static async scanDirectory(
    rootDirectory: string,
    options: ScannerOptions
  ): Promise<string[]> {
    const mediaFiles: string[] = [];
    const progress: ScanProgress = {
      directoriesScanned: 0,
      filesFound: 0,
      currentDirectory: rootDirectory,
    };

    const traverse = async (currentDir: string): Promise<void> => {
      // 1. Check Cancellation Signal
      if (options.signal?.aborted) {
        return;
      }

      // 2. Strict Exclusion Guard: Must NEVER touch excluded directories
      if (options.exclusionManager.isPathExcluded(currentDir)) {
        return;
      }

      progress.directoriesScanned++;
      progress.currentDirectory = currentDir;
      options.onProgress?.(progress);

      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch (err) {
        options.onError?.(err as Error, currentDir);
        return;
      }

      for (const entry of entries) {
        if (options.signal?.aborted) return;

        const fullPath = path.join(currentDir, entry.name);

        // Check if individual file/symlink path is excluded
        if (options.exclusionManager.isPathExcluded(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recurse into sub-directory
          await traverse(fullPath);
        } else if (entry.isFile()) {
          if (ExifExtractor.isSupportedMedia(fullPath)) {
            mediaFiles.push(fullPath);
            progress.filesFound++;
            options.onProgress?.(progress);
          }
        }
      }
    };

    await traverse(rootDirectory);
    return mediaFiles;
  }
}
