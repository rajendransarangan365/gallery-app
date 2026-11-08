/**
 * @gallery/ui-tokens - Motion & Physics Specifications
 */

export const springPresets = {
  // Fluid Grid Density Zoom (Pinch gesture)
  gridZoom: {
    mass: 1.0,
    stiffness: 120,
    damping: 14,
  },

  // Shared-Element Hero Expand (Thumbnail to Full Viewer)
  heroExpand: {
    mass: 0.8,
    stiffness: 140,
    damping: 16,
  },

  // Swipe-Down Dismissal
  gestureDismiss: {
    mass: 0.5,
    stiffness: 180,
    damping: 20,
  },

  // Micro-interactions (Heart favorite, toggle)
  microBounce: {
    mass: 0.4,
    stiffness: 300,
    damping: 12,
  },
} as const;

export const durations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

