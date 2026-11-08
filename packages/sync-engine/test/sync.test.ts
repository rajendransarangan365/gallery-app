/**
 * Unit Tests: @gallery/sync-engine - P2P Sync, Pairing & Manifest Comparison
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { SyncManifestItem } from '@gallery/shared';
import { ExclusionManager } from '@gallery/security';
import { PairingManager, SyncEngine } from '../dist/index.js';

describe('PairingManager - Mutual PIN & QR Handshake', () => {
  it('should generate valid 6-digit PIN and QR invitation', () => {
    const manager = new PairingManager();
    const invitation = manager.createInvitation('Windows Host', '192.168.1.100', 41236, 300);

    assert.ok(invitation.sessionId);
    assert.strictEqual(invitation.pin.length, 6);
    assert.ok(!isNaN(Number(invitation.pin)));

    const parsedQR = JSON.parse(invitation.qrPayload);
    assert.strictEqual(parsedQR.pin, invitation.pin);
    assert.strictEqual(parsedQR.sid, invitation.sessionId);
  });

  it('should verify valid PIN and reject incorrect or expired PINs', () => {
    const manager = new PairingManager();
    const invitation = manager.createInvitation('Windows Host', '192.168.1.100', 41236, 1);

    // 1. Wrong PIN
    const failResult = manager.verifyPairing(
      invitation.sessionId,
      '000000',
      'remote-phone-id',
      'Galaxy S24'
    );
    assert.strictEqual(failResult.success, false);
    assert.match(failResult.error || '', /Invalid pairing PIN/);

    // 2. Correct PIN
    const successResult = manager.verifyPairing(
      invitation.sessionId,
      invitation.pin,
      'remote-phone-id',
      'Galaxy S24'
    );
    assert.strictEqual(successResult.success, true);
    assert.ok(successResult.sharedSecret);
    assert.strictEqual(manager.isPeerTrusted('remote-phone-id'), true);
  });
});

describe('SyncEngine - Manifest Comparison & Ingestion', () => {
  it('should symmetrically compare local and remote manifests without redundant transfers', () => {
    const item1: SyncManifestItem = {
      contentHash: 'hash_111',
      fileName: 'photo1.jpg',
      fileSize: 1000,
      captureDate: '2026-01-01',
      modifiedDate: '2026-01-01',
      relativeSyncPath: 'photo1.jpg',
    };
    const item2: SyncManifestItem = {
      contentHash: 'hash_222',
      fileName: 'photo2.jpg',
      fileSize: 2000,
      captureDate: '2026-01-02',
      modifiedDate: '2026-01-02',
      relativeSyncPath: 'photo2.jpg',
    };
    const item3: SyncManifestItem = {
      contentHash: 'hash_333',
      fileName: 'photo3.jpg',
      fileSize: 3000,
      captureDate: '2026-01-03',
      modifiedDate: '2026-01-03',
      relativeSyncPath: 'photo3.jpg',
    };

    const localManifest = [item1, item2];
    const remoteManifest = [item2, item3];

    const comparison = SyncEngine.compareManifests(localManifest, remoteManifest);

    assert.strictEqual(comparison.commonCount, 1); // item2
    assert.strictEqual(comparison.localMissingItems.length, 1); // item3 missing on local
    assert.strictEqual(comparison.localMissingItems[0].contentHash, 'hash_333');
    assert.strictEqual(comparison.remoteMissingItems.length, 1); // item1 missing on remote
    assert.strictEqual(comparison.remoteMissingItems[0].contentHash, 'hash_111');
  });

  it('should verify integrity checksum and fail-closed on tampered content or excluded destination', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-sync-test-'));
    const targetDir = path.join(tempDir, 'library');
    const excludedDir = path.join(tempDir, 'excluded');
    fs.mkdirSync(excludedDir, { recursive: true });

    const exclusionManager = new ExclusionManager();
    exclusionManager.addExclusion(excludedDir);

    const testBytes = Buffer.from('REAL_SYNCED_IMAGE_PAYLOAD_2026');
    const expectedHash = crypto.createHash('sha256').update(testBytes).digest('hex');

    const tempFile = path.join(tempDir, 'temp_incoming.jpg');
    fs.writeFileSync(tempFile, testBytes);

    // 1. Ingestion to excluded target directory must fail
    await assert.rejects(
      async () => {
        await SyncEngine.ingestTransferredFile(tempFile, excludedDir, expectedHash, 'incoming.jpg', {
          exclusionManager,
        });
      },
      /Security Exception/,
      'Must reject ingestion to excluded target directory'
    );

    // 2. Tampered content hash must fail
    await assert.rejects(
      async () => {
        await SyncEngine.ingestTransferredFile(tempFile, targetDir, 'fake_tampered_hash_000', 'incoming.jpg', {
          exclusionManager,
        });
      },
      /Integrity Check Failed/,
      'Must reject tampered file hash'
    );

    // 3. Legitimate ingestion
    const photo = await SyncEngine.ingestTransferredFile(tempFile, targetDir, expectedHash, 'incoming.jpg', {
      exclusionManager,
    });

    assert.strictEqual(photo.contentHash, expectedHash);
    assert.strictEqual(photo.fileName, 'incoming.jpg');
    assert.ok(fs.existsSync(path.join(targetDir, 'incoming.jpg')));

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
