/**
 * Unit Tests: @gallery/photo-engine
 * Verifies real filesystem directory scanning, strict folder exclusion, and duplicate detection.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExclusionManager } from '@gallery/security';
import { FileScanner } from '../dist/file-scanner.js';
import { PhotoIndexer } from '../dist/photo-indexer.js';
import { ThumbnailCacheManager } from '../dist/thumbnail-cache.js';

describe('Photo Engine & FileScanner Pipeline', () => {
  it('should scan real files and strictly skip excluded directories', async () => {
    const rootTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-engine-test-'));
    const publicPhotos = path.join(rootTemp, 'camera');
    const secretVault = path.join(rootTemp, 'private-vault');

    fs.mkdirSync(publicPhotos, { recursive: true });
    fs.mkdirSync(secretVault, { recursive: true });

    // Minimal valid JPEG buffer
    const minimalJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0xff, 0xd9
    ]);

    fs.writeFileSync(path.join(publicPhotos, 'vacation_1.jpg'), minimalJpeg);
    fs.writeFileSync(path.join(publicPhotos, 'vacation_2.png'), minimalJpeg);
    fs.writeFileSync(path.join(publicPhotos, 'notes.txt'), 'Not a photo');
    fs.writeFileSync(path.join(secretVault, 'secret_passwords.jpg'), minimalJpeg);

    const exclusionManager = new ExclusionManager();
    exclusionManager.addExclusion(secretVault, true);

    try {
      // 1. Test FileScanner directly
      const scannedPaths = await FileScanner.scanDirectory(rootTemp, {
        exclusionManager,
      });

      assert.strictEqual(scannedPaths.length, 2);
      assert.ok(scannedPaths.some(p => p.includes('vacation_1.jpg')));
      assert.ok(scannedPaths.some(p => p.includes('vacation_2.png')));
      assert.ok(!scannedPaths.some(p => p.includes('secret_passwords.jpg')));
      assert.ok(!scannedPaths.some(p => p.includes('notes.txt')));

      // 2. Test PhotoIndexer complete pipeline
      const cacheDir = path.join(rootTemp, 'cache');
      const thumbnailCache = new ThumbnailCacheManager(cacheDir);
      await thumbnailCache.initialize();

      const photos = await PhotoIndexer.indexDirectory(rootTemp, {
        exclusionManager,
        thumbnailCache,
      });

      // Note: vacation_1 and vacation_2 have identical minimalJpeg content, so second is recognized as duplicate!
      assert.strictEqual(photos.length, 1);
      assert.strictEqual(photos[0].mimeType, 'image/jpeg');
      assert.ok(photos[0].contentHash.length === 64); // SHA-256 length
    } finally {
      fs.rmSync(rootTemp, { recursive: true, force: true });
    }
  });
});
