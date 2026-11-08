/**
 * Unit & Integration Tests: @gallery/vault-engine
 * Verifies Zero-Leakage AES-256-GCM Vault & Instant Purge Protocol.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExclusionManager } from '@gallery/security';
import { ThumbnailCacheManager } from '@gallery/photo-engine';
import type { PhotoItem } from '@gallery/shared';
import { VaultManager } from '../dist/vault-manager.js';
import { ExclusionRegistry } from '../dist/exclusion-registry.js';

describe('VaultManager - Zero-Leakage Hardware-Bound Encryption', () => {
  it('should initialize, authenticate, encrypt, wipe original, and export', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'));
    const vault = new VaultManager(path.join(tempRoot, 'vault'));
    const photoToHide = path.join(tempRoot, 'sensitive-photo.jpg');

    const originalContent = Buffer.from('TOP_SECRET_ORIGINAL_CAMERA_BYTES_12345');
    fs.writeFileSync(photoToHide, originalContent);

    try {
      // 1. Initial setup with Master PIN
      await vault.setupVault('SecurePIN@2026');
      assert.strictEqual(vault.isUnlocked(), true);

      // 2. Lock Vault
      vault.lock();
      assert.strictEqual(vault.isUnlocked(), false);

      // 3. Attempt access while locked (Must return empty list)
      const lockedItems = await vault.listItems();
      assert.strictEqual(lockedItems.length, 0);

      // 4. Incorrect PIN authentication failure
      const badUnlock = await vault.unlock('WrongPIN!999');
      assert.strictEqual(badUnlock, false);
      assert.strictEqual(vault.isUnlocked(), false);

      // 5. Correct PIN authentication success
      const goodUnlock = await vault.unlock('SecurePIN@2026');
      assert.strictEqual(goodUnlock, true);
      assert.strictEqual(vault.isUnlocked(), true);

      // 6. Import photo into Vault
      const vaultItem = await vault.importPhoto(photoToHide);
      assert.strictEqual(vaultItem.originalFileName, 'sensitive-photo.jpg');

      // Assert original file was scrubbed and unlinked
      assert.strictEqual(fs.existsSync(photoToHide), false);

      // Assert encrypted payload exists
      assert.strictEqual(fs.existsSync(vaultItem.cipherPayloadPath), true);

      // 7. Export photo from Vault
      const exportDir = path.join(tempRoot, 'exported');
      fs.mkdirSync(exportDir, { recursive: true });

      const exportedPath = await vault.exportPhoto(vaultItem.id, exportDir);
      assert.strictEqual(fs.existsSync(exportedPath), true);

      // Verify decrypted content matches original byte-for-byte
      const restoredContent = fs.readFileSync(exportedPath);
      assert.deepStrictEqual(restoredContent, originalContent);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('ExclusionRegistry - Instant Purge Protocol', () => {
  it('should immediately purge thumbnails and database records for newly excluded folders', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exclusion-test-'));
    const cacheDir = path.join(tempRoot, 'cache');
    const folderToExclude = path.join(tempRoot, 'private-camera');

    fs.mkdirSync(folderToExclude, { recursive: true });

    const exclusionManager = new ExclusionManager();
    const thumbnailCache = new ThumbnailCacheManager(cacheDir);
    await thumbnailCache.initialize();

    const registry = new ExclusionRegistry(exclusionManager, thumbnailCache);

    // Mock existing photo in that folder
    const samplePhoto: PhotoItem = {
      id: 'photo-uuid-001',
      contentHash: 'hash1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      fileUri: path.join(folderToExclude, 'photo.jpg'),
      fileName: 'photo.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      width: 100,
      height: 100,
      captureDate: new Date().toISOString(),
      importedDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      isFavorite: false,
      isDeleted: false,
    };

    // Create thumbnail on disk
    const thumbs = thumbnailCache.getThumbnailPaths(samplePhoto.contentHash);
    fs.writeFileSync(thumbs.gridThumbnail, 'WEBP_GRID_THUMB_DATA');
    fs.writeFileSync(thumbs.previewThumbnail, 'WEBP_PREVIEW_THUMB_DATA');

    let deletedDbPhotoId: string | null = null;

    try {
      const result = await registry.addExclusionAndPurge(
        folderToExclude,
        [samplePhoto],
        (id) => {
          deletedDbPhotoId = id;
        }
      );

      assert.strictEqual(result.purgedPhotosCount, 1);
      assert.strictEqual(result.purgedThumbnailsCount, 1);
      assert.strictEqual(deletedDbPhotoId, 'photo-uuid-001');

      // Assert thumbnails were purged from disk
      assert.strictEqual(fs.existsSync(thumbs.gridThumbnail), false);
      assert.strictEqual(fs.existsSync(thumbs.previewThumbnail), false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
