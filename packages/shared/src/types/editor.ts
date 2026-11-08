/**
 * @gallery/shared - Non-Destructive Photo Editor Recipe Models
 */

export interface CurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export interface ToneCurves {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface HslChannel {
  hue: number;        // -100 to 100
  saturation: number; // -100 to 100
  luminance: number;  // -100 to 100
}

export interface HslAdjustments {
  red: HslChannel;
  orange: HslChannel;
  yellow: HslChannel;
  green: HslChannel;
  aqua: HslChannel;
  blue: HslChannel;
  purple: HslChannel;
  magenta: HslChannel;
}

export interface BasicAdjustments {
  exposure: number;     // -100 to 100
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  highlights: number;   // -100 to 100
  shadows: number;      // -100 to 100
  whites: number;       // -100 to 100
  blacks: number;       // -100 to 100
  temperature: number;  // -100 (Cool) to 100 (Warm)
  tint: number;         // -100 (Green) to 100 (Magenta)
  vibrance: number;     // -100 to 100
  saturation: number;   // -100 to 100
  vignette: number;     // 0 to 100
  grain: number;        // 0 to 100
}

export interface CropTransform {
  x: number;            // 0.0 to 1.0 normalized
  y: number;
  width: number;
  height: number;
  rotationAngle: number;// 0, 90, 180, 270 or fine degrees
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface EditRecipe {
  version: number;
  photoId: string;
  adjustments: BasicAdjustments;
  curves: ToneCurves;
  hsl: HslAdjustments;
  crop?: CropTransform;
  presetApplied?: string;
  updatedAt: string;
}

