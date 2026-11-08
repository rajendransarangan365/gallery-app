/**
 * @gallery/ai-engine - Core AI Types
 * Models for Face Recognition, Semantic Vector Search, and Aesthetic Scoring.
 */

import type { PhotoItem } from '@gallery/shared';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  photoId: string;
  bbox: BoundingBox;
  confidence: number;
  embedding: Float32Array; // 512-d normalized vector
}

export interface PersonCluster {
  id: string;
  name: string;
  photoCount: number;
  faceCount: number;
  representativePhotoId: string;
  representativePhoto?: PhotoItem;
  photoIds: string[];
  centroidEmbedding: Float32Array;
}

export interface SemanticSearchResult {
  photo: PhotoItem;
  similarityScore: number;
}

export interface AestheticScore {
  sharpness: number;    // 0 - 100 (Laplacian variance)
  exposure: number;     // 0 - 100 (Dynamic range & histogram balance)
  composition: number;  // 0 - 100 (Rule of thirds & subject focus)
  overall: number;      // 0 - 100 (Weighted composite score)
  reasons: string[];
}

export interface PhotoOfTheMonth {
  monthKey: string;      // e.g. "2026-11"
  winningPhoto: PhotoItem;
  score: AestheticScore;
  totalCandidates: number;
  aiReasoning: string;
}
