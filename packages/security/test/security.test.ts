/**
 * Unit Tests: Security, Folder Exclusions & Hardware-Isolated Vault
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ExclusionManager } from '../dist/exclusion-manager.js';
import { VaultCrypto } from '../dist/vault-crypto.js';

describe('ExclusionManager - Strict Directory Boundary Enforcement', () => {
  const manager = new ExclusionManager();

  it('should strictly exclude registered directory and its children', () => {
    const secretDir = path.resolve('./temp-secret-vault');
    manager.addExclusion(secretDir, true);

    assert.strictEqual(manager.isPathExcluded(secretDir), true);
    assert.strictEqual(manager.isPathExcluded(path.join(secretDir, 'photo.jpg')), true);
    assert.strictEqual(manager.isPathExcluded(path.join(secretDir, 'subfolder', 'nested.png')), true);
  });

  it('should allow legitimate public gallery directories', () => {
    const publicPhotos = path.resolve('./public-gallery-photos');
    assert.strictEqual(manager.isPathExcluded(publicPhotos), false);
  });

  it('should fail-closed when null-bytes or empty path evaluation is attempted', () => {
    assert.strictEqual(manager.isPathExcluded('path/with\0nullbyte.jpg'), true);
    assert.strictEqual(manager.isPathExcluded(''), true);
  });
});

describe('VaultCrypto - AES-256-GCM Isolation & Zero Leakage', () => {
  const key = randomBytes(32);
  const samplePhotoBuffer = Buffer.from('RAW_PHOTOGRAPH_PIXEL_DATA_ZERO_MOCK_COMPLIANCE');

  it('should encrypt and decrypt photographic payloads deterministically', () => {
    const encrypted = VaultCrypto.encrypt(samplePhotoBuffer, key);

    assert.notDeepStrictEqual(encrypted.cipherBuffer, samplePhotoBuffer);
    assert.ok(encrypted.iv.length > 0);
    assert.ok(encrypted.authTag.length > 0);

    const decrypted = VaultCrypto.decrypt(
      encrypted.cipherBuffer,
      encrypted.iv,
      encrypted.authTag,
      key
    );

    assert.deepStrictEqual(decrypted, samplePhotoBuffer);
  });

  it('should reject tampered ciphertext with cryptographic authentication error', () => {
    const encrypted = VaultCrypto.encrypt(samplePhotoBuffer, key);
    
    // Tamper with 1 byte of the cipher buffer
    const tampered = Buffer.from(encrypted.cipherBuffer);
    tampered[0] ^= 0xff;

    assert.throws(() => {
      VaultCrypto.decrypt(tampered, encrypted.iv, encrypted.authTag, key);
    });
  });

  it('should reject tampered authentication tag', () => {
    const encrypted = VaultCrypto.encrypt(samplePhotoBuffer, key);

    assert.throws(() => {
      VaultCrypto.decrypt(encrypted.cipherBuffer, encrypted.iv, 'TAMPERED_TAG_AAAA', key);
    });
  });
});
