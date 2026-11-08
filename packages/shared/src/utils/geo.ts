/**
 * @gallery/shared - Geographic Location Clustering Utilities
 * Groups photos by GPS coordinates and geographic regions.
 */

import type { PhotoItem } from '../types/photo.js';

export interface GeoPhotoCluster {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  photoCount: number;
  photos: PhotoItem[];
  representativePhoto: PhotoItem;
}

/**
 * Clusters photos with valid GPS coordinates into geographic locations.
 * @param photos Array of PhotoItem objects
 * @param precision Coordinate decimal precision for grid clustering (default: 1, approx 11km)
 */
export function clusterPhotosByLocation(
  photos: PhotoItem[],
  precision = 1
): GeoPhotoCluster[] {
  const clusterMap = new Map<string, PhotoItem[]>();

  for (const photo of photos) {
    if (!photo.coordinates) continue;

    const lat = photo.coordinates.latitude;
    const lon = photo.coordinates.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    // Grid key by rounded coordinates or city name if available
    const gridKey = photo.coordinates.city
      ? `${photo.coordinates.city.toLowerCase()}_${photo.coordinates.country || ''}`
      : `${lat.toFixed(precision)}_${lon.toFixed(precision)}`;

    if (!clusterMap.has(gridKey)) {
      clusterMap.set(gridKey, []);
    }
    clusterMap.get(gridKey)!.push(photo);
  }

  const clusters: GeoPhotoCluster[] = [];

  for (const [key, clusterPhotos] of clusterMap.entries()) {
    if (clusterPhotos.length === 0) continue;

    const firstCoord = clusterPhotos[0].coordinates!;
    const avgLat = clusterPhotos.reduce((sum, p) => sum + p.coordinates!.latitude, 0) / clusterPhotos.length;
    const avgLon = clusterPhotos.reduce((sum, p) => sum + p.coordinates!.longitude, 0) / clusterPhotos.length;

    let label = `${avgLat.toFixed(2)}°, ${avgLon.toFixed(2)}°`;
    if (firstCoord.city && firstCoord.country) {
      label = `${firstCoord.city}, ${firstCoord.country}`;
    } else if (firstCoord.city) {
      label = firstCoord.city;
    }

    clusters.push({
      id: `geo_cluster_${key}`,
      label,
      latitude: avgLat,
      longitude: avgLon,
      photoCount: clusterPhotos.length,
      photos: clusterPhotos,
      representativePhoto: clusterPhotos[0],
    });
  }

  return clusters.sort((a, b) => b.photoCount - a.photoCount);
}
