/**
 * @gallery/shared - Album Data Models
 */

export type AlbumType = 'user' | 'smart' | 'people' | 'location' | 'favorites';

export interface Album {
  id: string;
  name: string;
  description?: string;
  albumType: AlbumType;
  coverPhotoId?: string;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SmartAlbumRule {
  field: 'captureDate' | 'cameraModel' | 'location' | 'aiTag' | 'fileSize';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | string[];
}

