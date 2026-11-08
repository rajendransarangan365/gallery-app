/**
 * @gallery/shared - Photo Data Models
 * Core types for photo indexing, EXIF, and location metadata.
 */

export type MimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/avif' | 'video/mp4' | 'video/quicktime';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface ExifMetadata {
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: number;
  fNumber?: number;
  iso?: number;
  exposureTime?: string;
  flash?: boolean;
  orientation?: number;
  colorSpace?: string;
}

export interface PhotoItem {
  id: string;                      // UUID or unique hash
  contentHash: string;             // SHA-256 hash for deduplication & sync
  fileUri: string;                 // Real filesystem path or content:// URI
  fileName: string;
  fileSize: number;                // In bytes
  mimeType: MimeType | string;
  width: number;
  height: number;
  captureDate: string;             // ISO-8601 string
  importedDate: string;            // ISO-8601 string
  modifiedDate: string;            // ISO-8601 string
  isFavorite: boolean;
  isDeleted: boolean;              // Soft delete marker
  coordinates?: GeoCoordinates;
  exif?: ExifMetadata;
  thumbnailPath?: string;          // 256px WebP
  previewPath?: string;            // 1280px WebP
  syncState?: 'synced' | 'pending' | 'conflict';
}

export interface PhotoFilter {
  startDate?: string;
  endDate?: string;
  favoriteOnly?: boolean;
  hasLocation?: boolean;
  albumId?: string;
  personId?: string;
  mimeType?: string;
  searchQuery?: string;
}

export type GridDensity = 1 | 2 | 3 | 5; // Columns in grid view
export type GalleryViewMode = 'grid' | 'list' | 'calendar' | 'map';

