/**
 * Unit Tests: @gallery/shared - Location Clustering
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { PhotoItem } from '../dist/types/photo.js';
import { clusterPhotosByLocation } from '../dist/utils/geo.js';

describe('Location Clustering & Geo Analysis', () => {
  it('should cluster photos by geographic coordinates and cities', () => {
    const samplePhotos: PhotoItem[] = [
      {
        id: '1',
        contentHash: 'hash1',
        fileUri: '/photos/paris1.jpg',
        fileName: 'paris1.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        captureDate: new Date().toISOString(),
        importedDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        isFavorite: false,
        isDeleted: false,
        coordinates: { latitude: 48.8566, longitude: 2.3522, city: 'Paris', country: 'France' },
      },
      {
        id: '2',
        contentHash: 'hash2',
        fileUri: '/photos/paris2.jpg',
        fileName: 'paris2.jpg',
        fileSize: 1200,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        captureDate: new Date().toISOString(),
        importedDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        isFavorite: true,
        isDeleted: false,
        coordinates: { latitude: 48.8584, longitude: 2.2945, city: 'Paris', country: 'France' },
      },
      {
        id: '3',
        contentHash: 'hash3',
        fileUri: '/photos/tokyo.jpg',
        fileName: 'tokyo.jpg',
        fileSize: 1500,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        captureDate: new Date().toISOString(),
        importedDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        isFavorite: false,
        isDeleted: false,
        coordinates: { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo', country: 'Japan' },
      },
      {
        id: '4',
        contentHash: 'hash4',
        fileUri: '/photos/nolocation.jpg',
        fileName: 'nolocation.jpg',
        fileSize: 800,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        captureDate: new Date().toISOString(),
        importedDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        isFavorite: false,
        isDeleted: false,
      },
    ];

    const clusters = clusterPhotosByLocation(samplePhotos);

    assert.strictEqual(clusters.length, 2); // Paris and Tokyo
    const paris = clusters.find(c => c.label.includes('Paris'));
    const tokyo = clusters.find(c => c.label.includes('Tokyo'));

    assert.ok(paris);
    assert.strictEqual(paris.photoCount, 2);
    assert.ok(tokyo);
    assert.strictEqual(tokyo.photoCount, 1);
  });
});
