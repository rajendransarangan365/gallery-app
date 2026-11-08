/**
 * @gallery/ui-tokens - Dark Photography Color Palette
 */

export const colors = {
  // Canvas & Backgrounds
  canvas: {
    base: '#0A0C10',        // Deepest neutral black
    elevated: '#141820',    // Elevated cards & panels
    overlay: '#1A202C',     // Modals and drop-downs
    subtle: '#222735',      // Borders & separators
    hover: '#2D3446',       // Interactive hover highlights
  },

  // Primary Brand & Accents
  brand: {
    primary: '#3B82F6',     // Modern focus blue
    accent: '#6366F1',      // Accent violet-indigo
    highlight: '#60A5FA',   // Light active state
  },

  // Status Colors
  status: {
    success: '#10B981',     // Verification & sync completed
    warning: '#F59E0B',     // Conflicts & attention
    danger: '#EF4444',      // Deletion & security alerts
    info: '#06B6D4',        // Informational tooltips
  },

  // Text Typography
  text: {
    primary: '#F8FAFC',     // High contrast white-gray
    secondary: '#94A3B8',   // Metadata & secondary labels
    muted: '#64748B',       // Disabled & subtle hints
    inverse: '#0F172A',     // Dark text for bright badges
  },
} as const;

