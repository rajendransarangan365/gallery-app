/**
 * @gallery/security - Folder Exclusion Manager
 * Strictly enforces directory exclusions before any file-system traversal.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ExclusionEntry {
  canonicalPath: string;
  isRecursive: boolean;
  inode?: string;
}

export class ExclusionManager {
  private exclusions: Map<string, ExclusionEntry> = new Map();

  /**
   * Registers a folder to be permanently excluded from gallery scans.
   */
  public addExclusion(targetPath: string, isRecursive = true): string {
    const resolvedCanonical = this.getCanonicalPath(targetPath);
    let inode: string | undefined;

    try {
      const stats = fs.statSync(resolvedCanonical);
      inode = `${stats.dev}:${stats.ino}`;
    } catch {
      // Path may not exist yet or permission denied
    }

    this.exclusions.set(resolvedCanonical.toLowerCase(), {
      canonicalPath: resolvedCanonical,
      isRecursive,
      inode,
    });

    return resolvedCanonical;
  }

  /**
   * Removes an exclusion.
   */
  public removeExclusion(targetPath: string): boolean {
    const resolved = this.getCanonicalPath(targetPath).toLowerCase();
    return this.exclusions.delete(resolved);
  }

  /**
   * Checks whether a given path is excluded.
   * MUST be called before opening, scanning, reading, or indexing any directory or file.
   */
  public isPathExcluded(candidatePath: string): boolean {
    if (!candidatePath || typeof candidatePath !== 'string') {
      return true; // Fail closed
    }

    // Guard against null-byte injection attacks
    if (candidatePath.includes('\0')) {
      return true; // Fail closed
    }

    let candidateCanonical: string;
    try {
      candidateCanonical = this.getCanonicalPath(candidatePath).toLowerCase();
    } catch {
      // If we cannot verify safety, assume excluded (Fail-Closed)
      return true;
    }

    for (const [excludedLower, entry] of this.exclusions.entries()) {
      if (candidateCanonical === excludedLower) {
        return true;
      }
      if (entry.isRecursive && candidateCanonical.startsWith(excludedLower + path.sep.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves canonical real path (evaluating symlinks).
   */
  public getCanonicalPath(targetPath: string): string {
    const absolute = path.resolve(targetPath);
    try {
      return fs.realpathSync.native ? fs.realpathSync.native(absolute) : fs.realpathSync(absolute);
    } catch {
      return path.normalize(absolute);
    }
  }

  public getExclusions(): ExclusionEntry[] {
    return Array.from(this.exclusions.values());
  }
}

