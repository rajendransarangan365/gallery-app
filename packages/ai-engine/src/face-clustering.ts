/**
 * @gallery/ai-engine - Local Face Clustering Engine
 * Groups 512-dimensional ArcFace embeddings into named Person Albums locally.
 */

import type { FaceDetectionResult, PersonCluster } from './types.js';

export class FaceClusterer {
  /**
   * Computes cosine similarity between two L2-normalized 512-d embeddings.
   * Returns value between -1.0 and +1.0 (typically 0.0 to 1.0 for ArcFace).
   */
  public static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  /**
   * Clusters a stream of detected face embeddings into distinct Person Albums.
   * @param detections Array of FaceDetectionResult
   * @param similarityThreshold Threshold for grouping (default: 0.65 for ArcFace)
   */
  public static clusterFaces(
    detections: FaceDetectionResult[],
    similarityThreshold = 0.65
  ): PersonCluster[] {
    const clusters: PersonCluster[] = [];

    for (const detection of detections) {
      let bestCluster: PersonCluster | null = null;
      let highestSimilarity = -1;

      // Find nearest cluster centroid
      for (const cluster of clusters) {
        const sim = this.cosineSimilarity(detection.embedding, cluster.centroidEmbedding);
        if (sim >= similarityThreshold && sim > highestSimilarity) {
          highestSimilarity = sim;
          bestCluster = cluster;
        }
      }

      if (bestCluster) {
        // Add to existing cluster
        bestCluster.faceCount++;
        if (!bestCluster.photoIds.includes(detection.photoId)) {
          bestCluster.photoIds.push(detection.photoId);
          bestCluster.photoCount = bestCluster.photoIds.length;
        }
        // Update centroid running average
        const n = bestCluster.faceCount;
        for (let i = 0; i < bestCluster.centroidEmbedding.length; i++) {
          bestCluster.centroidEmbedding[i] =
            (bestCluster.centroidEmbedding[i] * (n - 1) + detection.embedding[i]) / n;
        }
      } else {
        // Create new person cluster
        const clusterId =
          typeof globalThis.crypto?.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        clusters.push({
          id: clusterId,
          name: `Person ${clusters.length + 1}`,
          photoCount: 1,
          faceCount: 1,
          representativePhotoId: detection.photoId,
          photoIds: [detection.photoId],
          centroidEmbedding: new Float32Array(detection.embedding),
        });
      }
    }

    // Sort by most frequent faces
    return clusters.sort((a, b) => b.faceCount - a.faceCount);
  }

  /**
   * Merges two person clusters when user confirms they are the same person.
   */
  public static mergeClusters(
    primary: PersonCluster,
    secondary: PersonCluster
  ): PersonCluster {
    const combinedPhotoIds = Array.from(new Set([...primary.photoIds, ...secondary.photoIds]));
    const totalFaces = primary.faceCount + secondary.faceCount;

    const newCentroid = new Float32Array(primary.centroidEmbedding.length);
    for (let i = 0; i < newCentroid.length; i++) {
      newCentroid[i] =
        (primary.centroidEmbedding[i] * primary.faceCount +
          secondary.centroidEmbedding[i] * secondary.faceCount) /
        totalFaces;
    }

    return {
      ...primary,
      photoCount: combinedPhotoIds.length,
      faceCount: totalFaces,
      photoIds: combinedPhotoIds,
      centroidEmbedding: newCentroid,
    };
  }
}
