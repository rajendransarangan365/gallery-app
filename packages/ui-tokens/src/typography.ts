/**
 * @gallery/ui-tokens - Typography Definitions
 */

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',    // 12px - Timestamps & EXIF tags
    sm: '0.875rem',   // 14px - Subtitles & metadata
    base: '1.0rem',   // 16px - Body text
    lg: '1.125rem',   // 18px - Card headings
    xl: '1.25rem',    // 20px - Section titles
    '2xl': '1.5rem',  // 24px - View headings
    '3xl': '1.875rem',// 30px - Page titles
  },
} as const;

