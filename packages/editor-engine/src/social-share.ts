/**
 * @gallery/editor-engine - Social Media & Native Share Engine
 * Formats platform share links, Web Share API triggers, and desktop share contracts.
 */

import type { PhotoItem } from '@gallery/shared';

export interface SocialShareTarget {
  id: 'whatsapp' | 'telegram' | 'twitter' | 'native' | 'clipboard';
  name: string;
  icon: string;
}

export class SocialShareManager {
  /**
   * Generates web share deep-links for desktop and web browsers.
   */
  public static getShareLink(
    platform: 'whatsapp' | 'telegram' | 'twitter',
    text: string,
    url?: string
  ): string {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = url ? encodeURIComponent(url) : '';

    switch (platform) {
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${encodedText}${encodedUrl ? `%20${encodedUrl}` : ''}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedText}${encodedUrl ? `&url=${encodedUrl}` : ''}`;
    }
  }

  /**
   * Triggers native Web Share API (available in modern Electron and Android web views).
   */
  public static async triggerNativeShare(photo: PhotoItem): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: photo.fileName,
          text: `Check out this photograph captured on ${new Date(photo.captureDate).toLocaleDateString()}`,
        });
        return true;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('[WARN] Native share error:', err);
        }
        return false;
      }
    }
    return false;
  }
}
