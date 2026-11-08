/**
 * @gallery/editor-engine - Algorithmic Memory Generator
 * Generates "On This Day" and periodic nostalgic highlights.
 */

import type { PhotoItem } from '@gallery/shared';

export interface GalleryMemoryStory {
  id: string;
  title: string;
  subtitle: string;
  photos: PhotoItem[];
  coverPhoto: PhotoItem;
  yearDifference?: number;
}

export class MemoryGenerator {
  /**
   * Generates memory stories from the user's photo collection based on calendar date.
   */
  public static generateMemories(
    photos: PhotoItem[],
    targetDate: Date = new Date()
  ): GalleryMemoryStory[] {
    const stories: GalleryMemoryStory[] = [];
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const currentYear = targetDate.getFullYear();

    // Group photos by year difference if captured on the same month & day
    const onThisDayByYear = new Map<number, PhotoItem[]>();

    for (const photo of photos) {
      if (photo.isDeleted) continue;
      const d = new Date(photo.captureDate);
      if (isNaN(d.getTime())) continue;

      if (d.getMonth() === targetMonth && d.getDate() === targetDay) {
        const diff = currentYear - d.getFullYear();
        if (diff > 0) {
          if (!onThisDayByYear.has(diff)) {
            onThisDayByYear.set(diff, []);
          }
          onThisDayByYear.get(diff)!.push(photo);
        }
      }
    }

    for (const [yearsAgo, memoryPhotos] of onThisDayByYear.entries()) {
      if (memoryPhotos.length === 0) continue;

      const title = yearsAgo === 1 ? '1 Year Ago Today' : `${yearsAgo} Years Ago Today`;
      stories.push({
        id: `memory_otd_${yearsAgo}_years`,
        title,
        subtitle: `${memoryPhotos.length} moments rediscovered`,
        photos: memoryPhotos,
        coverPhoto: memoryPhotos[0],
        yearDifference: yearsAgo,
      });
    }

    // Best of Month Highlights (if current month has photos)
    const currentMonthKey = targetDate.toISOString().slice(0, 7);
    const monthPhotos = photos.filter(
      (p) => !p.isDeleted && p.captureDate.startsWith(currentMonthKey)
    );

    if (monthPhotos.length >= 3) {
      stories.push({
        id: `memory_month_${currentMonthKey}`,
        title: 'This Month in Review',
        subtitle: `${monthPhotos.length} photographs captured`,
        photos: monthPhotos.slice(0, 10),
        coverPhoto: monthPhotos[0],
      });
    }

    return stories;
  }
}
