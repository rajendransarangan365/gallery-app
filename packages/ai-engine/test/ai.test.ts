/**
 * Unit Tests: @gallery/ai-engine - Local AI, Face Recognition & Aesthetic Analysis
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { PhotoItem } from '@gallery/shared';
import {
  FaceClusterer,
  SemanticSearchRanker,
  AestheticAnalyzer,
  type FaceDetectionResult,
} from '../dist/index.js';

describe('FaceClusterer - Local Facial Recognition & Clustering', () => {
  it('should accurately compute cosine similarity between normalized embeddings', () => {
    const vecA = new Float32Array([1, 0, 0]);
    const vecB = new Float32Array([1, 0, 0]);
    const vecC = new Float32Array([0, 1, 0]);

    assert.strictEqual(FaceClusterer.cosineSimilarity(vecA, vecB), 1.0);
    assert.strictEqual(FaceClusterer.cosineSimilarity(vecA, vecC), 0.0);
  });

  it('should cluster similar faces into distinct person albums and merge clusters', () => {
    // Person 1 (Alice): two face detections with high similarity
    const faceAlice1: FaceDetectionResult = {
      photoId: 'photo_1',
      bbox: { x: 10, y: 10, width: 50, height: 50 },
      confidence: 0.98,
      embedding: new Float32Array([0.9, 0.1, 0.0]),
    };
    const faceAlice2: FaceDetectionResult = {
      photoId: 'photo_2',
      bbox: { x: 20, y: 20, width: 60, height: 60 },
      confidence: 0.95,
      embedding: new Float32Array([0.88, 0.12, 0.0]),
    };

    // Person 2 (Bob): face detection with orthogonal embedding
    const faceBob: FaceDetectionResult = {
      photoId: 'photo_3',
      bbox: { x: 30, y: 30, width: 70, height: 70 },
      confidence: 0.92,
      embedding: new Float32Array([0.0, 0.1, 0.9]),
    };

    const clusters = FaceClusterer.clusterFaces([faceAlice1, faceAlice2, faceBob], 0.65);

    assert.strictEqual(clusters.length, 2, 'Should create 2 distinct person clusters');
    const aliceCluster = clusters.find((c) => c.faceCount === 2);
    const bobCluster = clusters.find((c) => c.faceCount === 1);

    assert.ok(aliceCluster);
    assert.ok(bobCluster);
    assert.strictEqual(aliceCluster.photoCount, 2);

    // Merge Bob into Alice
    const merged = FaceClusterer.mergeClusters(aliceCluster, bobCluster);
    assert.strictEqual(merged.faceCount, 3);
    assert.strictEqual(merged.photoCount, 3);
  });
});

describe('SemanticSearchRanker - Local Vector Search', () => {
  it('should rank photo embeddings by cosine similarity and filter low scores', () => {
    const query = new Float32Array([1.0, 0.0, 0.0]);

    const samplePhoto = (id: string): PhotoItem => ({
      id,
      contentHash: `hash_${id}`,
      fileUri: `/photos/${id}.jpg`,
      fileName: `${id}.jpg`,
      fileSize: 1000,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      captureDate: new Date().toISOString(),
      importedDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      isFavorite: false,
      isDeleted: false,
    });

    const index = [
      { photo: samplePhoto('beach_sunset'), embedding: new Float32Array([0.95, 0.05, 0.0]) },
      { photo: samplePhoto('mountain_hike'), embedding: new Float32Array([0.70, 0.20, 0.0]) },
      { photo: samplePhoto('office_desk'), embedding: new Float32Array([0.05, 0.90, 0.1]) },
    ];

    const results = SemanticSearchRanker.rankPhotos(query, index, 0.50);

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].photo.fileName, 'beach_sunset.jpg');
    assert.ok(results[0].similarityScore > 0.90);
    assert.strictEqual(results[1].photo.fileName, 'mountain_hike.jpg');
  });
});

describe('AestheticAnalyzer - Photo of the Month', () => {
  it('should compute scores and select highest aesthetic quality winner', () => {
    const highQualityPhoto: PhotoItem = {
      id: 'hq_1',
      contentHash: 'hash_hq1',
      fileUri: '/photos/hq1.jpg',
      fileName: 'golden_hour.jpg',
      fileSize: 6 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 4000,
      height: 3000,
      captureDate: '2026-11-04T12:00:00Z',
      importedDate: '2026-11-04T12:00:00Z',
      modifiedDate: '2026-11-04T12:00:00Z',
      isFavorite: true,
      isDeleted: false,
      exif: {
        cameraModel: 'Sony A7 IV',
        iso: 100,
        fNumber: 2.8,
      },
    };

    const regularPhoto: PhotoItem = {
      id: 'reg_2',
      contentHash: 'hash_reg2',
      fileUri: '/photos/reg2.jpg',
      fileName: 'receipt.jpg',
      fileSize: 400 * 1024,
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      captureDate: '2026-11-05T14:00:00Z',
      importedDate: '2026-11-05T14:00:00Z',
      modifiedDate: '2026-11-05T14:00:00Z',
      isFavorite: false,
      isDeleted: false,
    };

    const scoreHQ = AestheticAnalyzer.evaluatePhoto(highQualityPhoto);
    const scoreReg = AestheticAnalyzer.evaluatePhoto(regularPhoto);

    assert.ok(scoreHQ.overall > scoreReg.overall);
    assert.ok(scoreHQ.reasons.length > 0);

    const winner = AestheticAnalyzer.selectPhotoOfTheMonth('2026-11', [highQualityPhoto, regularPhoto]);
    assert.ok(winner);
    assert.strictEqual(winner.winningPhoto.id, 'hq_1');
    assert.ok(winner.aiReasoning.length > 15);
  });
});

