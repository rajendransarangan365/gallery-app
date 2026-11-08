/**
 * Unit Tests: @gallery/photo-engine - Windows MTP Phone Import Engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExclusionManager } from '@gallery/security';
import { MtpManager, type MtpPhotoCandidate } from '../dist/mtp.js';

describe('MtpManager - Windows MTP Phone Import Pipeline', () => {
  it('should detect connected system devices safely without throwing errors', async () => {
    const devices = await MtpManager.detectConnectedDevices();
    assert.ok(Array.isArray(devices), 'detectConnectedDevices should always return an array');
  });

  it('should scan simulated device directory structure and respect exclusion boundaries', async () => {
    const tempDeviceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-mtp-dev-'));
    const dcimCamera = path.join(tempDeviceRoot, 'DCIM', 'Camera');
    const excludedDir = path.join(tempDeviceRoot, 'DCIM', 'PrivateCamera');

    fs.mkdirSync(dcimCamera, { recursive: true });
    fs.mkdirSync(excludedDir, { recursive: true });

    // Create real test files
    fs.writeFileSync(path.join(dcimCamera, 'photo1.jpg'), Buffer.from('REAL_PHOTO_DATA_1'));
    fs.writeFileSync(path.join(dcimCamera, 'photo2.png'), Buffer.from('REAL_PHOTO_DATA_2'));
    fs.writeFileSync(path.join(excludedDir, 'secret.jpg'), Buffer.from('SECRET_VAULT_PHOTO'));

    const exclusionManager = new ExclusionManager();
    exclusionManager.addExclusion(excludedDir);

    const candidates = await MtpManager.scanDevicePhotos(tempDeviceRoot, new Set(), exclusionManager);

    assert.strictEqual(candidates.length, 2, 'Should discover 2 photos and skip excluded directory');
    const fileNames = candidates.map((c) => c.fileName);
    assert.ok(fileNames.includes('photo1.jpg'));
    assert.ok(fileNames.includes('photo2.png'));
    assert.ok(!fileNames.includes('secret.jpg'), 'Excluded photo must NEVER be discovered');

    // Cleanup
    fs.rmSync(tempDeviceRoot, { recursive: true, force: true });
  });

  it('should transfer photos with SHA-256 integrity check and fail-closed on excluded destination', async () => {
    const tempSrcRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-mtp-src-'));
    const tempDestRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-mtp-dest-'));
    const excludedDest = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-mtp-excl-'));

    const srcFile = path.join(tempSrcRoot, 'vacation.jpg');
    fs.writeFileSync(srcFile, Buffer.from('VACATION_IMAGE_BYTES_2026'));

    const exclusionManager = new ExclusionManager();
    exclusionManager.addExclusion(excludedDest);

    const candidates: MtpPhotoCandidate[] = [
      {
        fileName: 'vacation.jpg',
        sourceUri: srcFile,
        fileSize: Buffer.from('VACATION_IMAGE_BYTES_2026').length,
        modifiedDate: new Date().toISOString(),
      },
    ];

    // 1. Attempt transfer to excluded destination (MUST throw Security Exception)
    await assert.rejects(
      async () => {
        await MtpManager.transferPhotos(candidates, excludedDest, { exclusionManager });
      },
      /Security Exception/,
      'Must reject transfer into excluded directory'
    );

    // 2. Transfer to legitimate destination
    let progressFired = false;
    const result = await MtpManager.transferPhotos(candidates, tempDestRoot, {
      exclusionManager,
      onProgress: (prog) => {
        progressFired = true;
        assert.ok(prog.totalFiles >= 1);
      },
    });

    assert.strictEqual(result.transferredPhotos.length, 1);
    assert.strictEqual(result.transferredPhotos[0].fileName, 'vacation.jpg');
    assert.ok(result.transferredPhotos[0].contentHash, 'Should compute content hash');
    assert.ok(fs.existsSync(path.join(tempDestRoot, 'vacation.jpg')));
    assert.strictEqual(progressFired, true);

    // Cleanup
    fs.rmSync(tempSrcRoot, { recursive: true, force: true });
    fs.rmSync(tempDestRoot, { recursive: true, force: true });
    fs.rmSync(excludedDest, { recursive: true, force: true });
  });
});

