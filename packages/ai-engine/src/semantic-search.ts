/**
 * @gallery/ai-engine - Semantic Natural Language Search Engine
 * On-device vector similarity ranking for SigLIP / CLIP vision-language embeddings.
 */

import type { PhotoItem } from '@gallery/shared';
import type { SemanticSearchResult } from './types.js';

export interface IndexedPhotoVector {
  photo: PhotoItem;
  embedding: Float32Array; // 512-d normalized vector
}

export class SemanticSearchRanker {
  /**
   * Computes dot product of two L2-normalized vectors.
   */
  public static dotProduct(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  /**
   * Searches indexed photo vectors using a natural language query embedding.
   * @param queryVector Text embedding generated locally by SigLIP
   * @param index Array of indexed photo items with image embeddings
   * @param minThreshold Minimum similarity score to return (default: 0.20)
   * @param limit Maximum results to return (default: 50)
   */
  public static rankPhotos(
    queryVector: Float32Array,
    index: IndexedPhotoVector[],
    minThreshold = 0.20,
    limit = 50
  ): SemanticSearchResult[] {
    const scored: SemanticSearchResult[] = [];

    for (const item of index) {
      const score = this.dotProduct(queryVector, item.embedding);
      if (score >= minThreshold) {
        scored.push({
          photo: item.photo,
          similarityScore: score,
        });
      }
    }

    return scored
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }
}
