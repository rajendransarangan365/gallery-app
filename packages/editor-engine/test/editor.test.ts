/**
 * Unit Tests: @gallery/editor-engine - Recipe Model, Presets, Shaders & Memories
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { PhotoItem } from '@gallery/shared';
import {
  createDefaultRecipe,
  applyPresetToRecipe,
  mapAdjustmentsToUniforms,
  MemoryGenerator,
  SocialShareManager,
} from '../dist/index.js';

describe('EditorEngine - Recipes & Presets', () => {
  it('should initialize clean default recipe', () => {
    const recipe = createDefaultRecipe('photo_123');
    assert.strictEqual(recipe.photoId, 'photo_123');
    assert.strictEqual(recipe.version, 1);
    assert.strictEqual(recipe.adjustments.exposure, 0);
    assert.strictEqual(recipe.adjustments.contrast, 0);
    assert.strictEqual(recipe.adjustments.temperature, 0);
  });

  it('should correctly apply presets to recipe', () => {
    const recipe = createDefaultRecipe('photo_123');
    const updated = applyPresetToRecipe(recipe, 'vivid_pop');

    assert.strictEqual(updated.presetApplied, 'Vivid Pop');
    assert.strictEqual(updated.adjustments.vibrance, 25);
    assert.strictEqual(updated.adjustments.contrast, 15);
  });

  it('should normalize adjustments to shader uniforms', () => {
    const recipe = createDefaultRecipe('photo_123');
    recipe.adjustments.exposure = 50;
    recipe.adjustments.contrast = -20;
    recipe.adjustments.vignette = 80;

    const uniforms = mapAdjustmentsToUniforms(recipe.adjustments);
    assert.strictEqual(uniforms.exposure, 0.5);
    assert.strictEqual(uniforms.contrast, -0.2);
    assert.strictEqual(uniforms.vignette, 0.8);
  });
});

describe('MemoryGenerator - Nostalgic Stories', () => {
  it('should generate "On This Day" stories from historical captures', () => {
    const now = new Date('2026-11-08T12:00:00Z');

    const photo1YearAgo: PhotoItem = {
      id: 'photo_1y',
      contentHash: 'hash_1y',
      fileUri: '/photos/1y.jpg',
      fileName: '1y.jpg',
      fileSize: 1000,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      captureDate: '2025-11-08T10:00:00Z',
      importedDate: '2025-11-08T10:00:00Z',
      modifiedDate: '2025-11-08T10:00:00Z',
      isFavorite: false,
      isDeleted: false,
    };

    const stories = MemoryGenerator.generateMemories([photo1YearAgo], now);
    assert.strictEqual(stories.length, 1);
    assert.strictEqual(stories[0].title, '1 Year Ago Today');
    assert.strictEqual(stories[0].photos.length, 1);
  });
});

describe('SocialShareManager - Deep Links', () => {
  it('should generate properly encoded share URLs', () => {
    const waLink = SocialShareManager.getShareLink('whatsapp', 'Hello World', 'https://photos.app');
    assert.ok(waLink.includes('Hello%20World'));
    assert.ok(waLink.startsWith('https://api.whatsapp.com'));
  });
});
