/**
 * @gallery/metadata-engine - EXIF & GPS Metadata Extractor
 * High-performance streaming header parser (reads headers without loading full image into RAM).
 */

import fs from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import type { ExifMetadata, GeoCoordinates, MimeType } from '@gallery/shared';

export interface ExtractedMetadata {
  fileUri: string;
  fileName: string;
  fileSize: number;
  mimeType: MimeType | string;
  width: number;
  height: number;
  captureDate: string;  // ISO string
  modifiedDate: string; // ISO string
  orientation: number;
  exif?: ExifMetadata;
  coordinates?: GeoCoordinates;
}

export class ExifExtractor {
  private static readonly MIME_MAP: Record<string, MimeType> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heic',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
  };

  /**
   * Identifies supported MIME type by file extension.
   */
  public static getMimeType(filePath: string): MimeType | string {
    const ext = path.extname(filePath).toLowerCase();
    return this.MIME_MAP[ext] || 'application/octet-stream';
  }

  /**
   * Checks whether the file is a supported image or video format.
   */
  public static isSupportedMedia(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext in this.MIME_MAP;
  }

  /**
   * Parses EXIF, GPS, dimensions, and timestamps from a real media file.
   */
  public static async extract(filePath: string): Promise<ExtractedMetadata> {
    const stats = await fs.promises.stat(filePath);
    const fileName = path.basename(filePath);
    const mimeType = this.getMimeType(filePath);

    let width = 0;
    let height = 0;
    let captureDate = stats.mtime.toISOString();
    let orientation = 1;
    let exifData: ExifMetadata | undefined;
    let coordinates: GeoCoordinates | undefined;

    try {
      // exifr parses only header segments (TIFF, EXIF, GPS) without decoding raw pixels
      const parsed = await exifr.parse(filePath, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: false,
        icc: false,
        iptc: false,
        mergeOutput: true,
      });

      if (parsed) {
        // Dimensions
        width = parsed.ImageWidth || parsed.ExifImageWidth || 0;
        height = parsed.ImageHeight || parsed.ExifImageHeight || 0;
        orientation = parsed.Orientation || 1;

        // Capture Date extraction with fallback hierarchy
        const rawDate = parsed.DateTimeOriginal || parsed.CreateDate || parsed.ModifyDate;
        if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
          captureDate = rawDate.toISOString();
        }

        // Camera & Lens Details
        exifData = {
          cameraMake: parsed.Make ? String(parsed.Make).trim() : undefined,
          cameraModel: parsed.Model ? String(parsed.Model).trim() : undefined,
          lensModel: parsed.LensModel ? String(parsed.LensModel).trim() : undefined,
          focalLength: parsed.FocalLength ? Number(parsed.FocalLength) : undefined,
          fNumber: parsed.FNumber ? Number(parsed.FNumber) : undefined,
          iso: parsed.ISO ? Number(parsed.ISO) : undefined,
          exposureTime: parsed.ExposureTime ? String(parsed.ExposureTime) : undefined,
          flash: parsed.Flash !== undefined ? Boolean(parsed.Flash) : undefined,
          orientation,
          colorSpace: parsed.ColorSpace ? String(parsed.ColorSpace) : undefined,
        };

        // GPS Coordinates
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          coordinates = {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            altitude: typeof parsed.altitude === 'number' ? parsed.altitude : undefined,
          };
        }
      }
    } catch {
      // Fallback to basic file stats if EXIF header is unreadable/corrupted
    }

    return {
      fileUri: path.resolve(filePath),
      fileName,
      fileSize: stats.size,
      mimeType,
      width,
      height,
      captureDate,
      modifiedDate: stats.mtime.toISOString(),
      orientation,
      exif: exifData,
      coordinates,
    };
  }
}
