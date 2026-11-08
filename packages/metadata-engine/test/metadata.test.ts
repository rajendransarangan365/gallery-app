/**
 * Unit Tests: @gallery/metadata-engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExifExtractor } from '../dist/exif-extractor.js';

describe('ExifExtractor - Metadata & MIME Analysis', () => {
  it('should accurately resolve MIME types from file extensions', () => {
    assert.strictEqual(ExifExtractor.getMimeType('IMG_001.JPG'), 'image/jpeg');
    assert.strictEqual(ExifExtractor.getMimeType('photo.png'), 'image/png');
    assert.strictEqual(ExifExtractor.getMimeType('clip.mp4'), 'video/mp4');
    assert.strictEqual(ExifExtractor.getMimeType('unknown.xyz'), 'application/octet-stream');
  });

  it('should identify supported media files correctly', () => {
    assert.strictEqual(ExifExtractor.isSupportedMedia('camera.heic'), true);
    assert.strictEqual(ExifExtractor.isSupportedMedia('document.pdf'), false);
    assert.strictEqual(ExifExtractor.isSupportedMedia('script.js'), false);
  });

  it('should extract metadata from an actual media file on disk', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exif-test-'));
    const testFile = path.join(tempDir, 'sample.jpg');

    // Minimal valid JPEG header (FF D8 FF E0 ... FF D9)
    const minimalJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x0a,
      0x00, 0x0a, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9
    ]);

    fs.writeFileSync(testFile, minimalJpeg);

    try {
      const metadata = await ExifExtractor.extract(testFile);
      assert.strictEqual(metadata.fileName, 'sample.jpg');
      assert.strictEqual(metadata.mimeType, 'image/jpeg');
      assert.strictEqual(metadata.fileSize, minimalJpeg.length);
      assert.ok(metadata.captureDate.length > 0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
