/**
 * @gallery/editor-engine - Recipe Models & Presets
 * Non-destructive parameter stack management.
 */

import type { EditRecipe, BasicAdjustments, ToneCurves, HslAdjustments } from '@gallery/shared';

export function createDefaultAdjustments(): BasicAdjustments {
  return {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
    vignette: 0,
    grain: 0,
  };
}

export function createDefaultCurves(): ToneCurves {
  return {
    master: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  };
}

export function createDefaultHsl(): HslAdjustments {
  const ch = () => ({ hue: 0, saturation: 0, luminance: 0 });
  return {
    red: ch(),
    orange: ch(),
    yellow: ch(),
    green: ch(),
    aqua: ch(),
    blue: ch(),
    purple: ch(),
    magenta: ch(),
  };
}

export function createDefaultRecipe(photoId: string): EditRecipe {
  return {
    version: 1,
    photoId,
    adjustments: createDefaultAdjustments(),
    curves: createDefaultCurves(),
    hsl: createDefaultHsl(),
    updatedAt: new Date().toISOString(),
  };
}

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  adjustments: Partial<BasicAdjustments>;
}

export const EDITOR_PRESETS: PresetDefinition[] = [
  {
    id: 'vivid_pop',
    name: 'Vivid Pop',
    description: 'Punchy vibrance with enhanced dynamic contrast',
    adjustments: {
      vibrance: 25,
      contrast: 15,
      saturation: 10,
      highlights: -10,
      shadows: 15,
    },
  },
  {
    id: 'warm_sunset',
    name: 'Warm Sunset',
    description: 'Golden hour warmth with soft highlights',
    adjustments: {
      temperature: 30,
      tint: 8,
      exposure: 10,
      highlights: -15,
      shadows: 10,
    },
  },
  {
    id: 'classic_bw',
    name: 'Classic B&W',
    description: 'High contrast monochrome with subtle grain texture',
    adjustments: {
      saturation: -100,
      contrast: 28,
      blacks: -12,
      grain: 12,
      vignette: 8,
    },
  },
  {
    id: 'moody_teal',
    name: 'Moody Teal & Orange',
    description: 'Cinematic color separation with deep rich tones',
    adjustments: {
      temperature: 15,
      tint: -18,
      contrast: 22,
      shadows: -10,
      vignette: 15,
    },
  },
  {
    id: 'soft_portrait',
    name: 'Soft Portrait',
    description: 'Flattering skin tones with soft highlight rolloff',
    adjustments: {
      contrast: -8,
      highlights: -12,
      shadows: 12,
      temperature: 5,
      vibrance: 8,
      vignette: 10,
    },
  },
];

export function applyPresetToRecipe(recipe: EditRecipe, presetId: string): EditRecipe {
  const preset = EDITOR_PRESETS.find((p) => p.id === presetId);
  if (!preset) return recipe;

  return {
    ...recipe,
    adjustments: {
      ...recipe.adjustments,
      ...preset.adjustments,
    },
    presetApplied: preset.name,
    updatedAt: new Date().toISOString(),
  };
}

