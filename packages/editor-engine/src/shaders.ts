/**
 * @gallery/editor-engine - WebGL2 GPU Shader Definitions
 * Real-time 60/120 FPS GPU rendering fragment shaders.
 */

import type { BasicAdjustments } from '@gallery/shared';

export const PHOTOGRAPHY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_exposure;     // -1.0 to 1.0
uniform float u_contrast;     // -1.0 to 1.0
uniform float u_temperature;  // -1.0 to 1.0 (cool to warm)
uniform float u_tint;         // -1.0 to 1.0 (green to magenta)
uniform float u_vibrance;     // -1.0 to 1.0
uniform float u_saturation;   // -1.0 to 1.0
uniform float u_highlights;   // -1.0 to 1.0
uniform float u_shadows;      // -1.0 to 1.0
uniform float u_vignette;     // 0.0 to 1.0
uniform float u_grain;        // 0.0 to 1.0

// Procedural pseudo-random grain noise
float random(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture(u_image, v_texCoord);

  // 1. Exposure adjustment (power-of-2 EV curve)
  color.rgb *= pow(2.0, u_exposure);

  // 2. Contrast adjustment centered around mid-gray 0.5
  color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;

  // 3. White Balance: Temperature & Tint
  color.r += u_temperature * 0.12;
  color.b -= u_temperature * 0.12;
  color.g += u_tint * 0.10;

  // 4. Highlights & Shadows recovery
  float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  if (u_highlights < 0.0) {
    color.rgb += (color.rgb * u_highlights * smoothstep(0.5, 1.0, luminance));
  }
  if (u_shadows > 0.0) {
    color.rgb += ((1.0 - color.rgb) * u_shadows * (1.0 - smoothstep(0.0, 0.5, luminance)));
  }

  // 5. Saturation & Vibrance
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float sat = maxC - minC;
  color.rgb = mix(vec3(luminance), color.rgb, 1.0 + u_saturation);
  color.rgb = mix(color.rgb, mix(vec3(luminance), color.rgb, 1.0 + u_vibrance * (1.0 - sat)), 1.0);

  // 6. Vignette
  if (u_vignette > 0.0) {
    float dist = distance(v_texCoord, vec2(0.5, 0.5));
    float vignetteFactor = smoothstep(0.8, 0.8 - (u_vignette * 0.5), dist * 1.414);
    color.rgb *= vignetteFactor;
  }

  // 7. Film Grain
  if (u_grain > 0.0) {
    float noise = (random(v_texCoord) - 0.5) * u_grain * 0.15;
    color.rgb += noise;
  }

  fragColor = clamp(color, 0.0, 1.0);
}
`;

export interface ShaderUniforms {
  exposure: number;
  contrast: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  highlights: number;
  shadows: number;
  vignette: number;
  grain: number;
}

export function mapAdjustmentsToUniforms(adj: BasicAdjustments): ShaderUniforms {
  return {
    exposure: adj.exposure / 100,
    contrast: adj.contrast / 100,
    temperature: adj.temperature / 100,
    tint: adj.tint / 100,
    vibrance: adj.vibrance / 100,
    saturation: adj.saturation / 100,
    highlights: adj.highlights / 100,
    shadows: adj.shadows / 100,
    vignette: adj.vignette / 100,
    grain: adj.grain / 100,
  };
}
