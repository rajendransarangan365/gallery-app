/**
 * @gallery/shared - AI & Machine Learning Types
 */

export interface BoundingBox {
  x: number;      // 0.0 to 1.0 normalized
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  id: string;
  photoId: string;
  box: BoundingBox;
  confidence: number;
  embedding: number[];         // 512-dim ArcFace vector
  clusterId?: string;
  personName?: string;
}

export interface PersonCluster {
  id: string;
  displayName: string;
  representativeFacePhotoId: string;
  faceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiTag {
  id: string;
  photoId: string;
  category: 'scene' | 'object' | 'document' | 'activity' | 'sentiment';
  label: string;
  confidence: number;
}

export interface PhotoQualityScore {
  photoId: string;
  overallScore: number;         // 0 to 100
  sharpness: number;            // 0 to 100 (Laplacian variance)
  composition: number;          // 0 to 100 (Rule of thirds balance)
  exposure: number;             // 0 to 100 (Histogram distribution)
  faceQuality: number;          // 0 to 100 (Expression & sharpness)
  noise: number;                // 0 to 100 (Lower noise = higher score)
  reasoning: string;            // AI explanation e.g. "Crisp subject focus, vibrant sunset lighting"
}

export interface BestPhotoOfTheMonth {
  month: string;                // YYYY-MM
  winnerPhotoId: string;
  candidates: PhotoQualityScore[];
  selectedByUser: boolean;
  awardedAt: string;
}

