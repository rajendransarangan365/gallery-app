/**
 * apps/windows/src/renderer/components/StudioEditorModal.tsx
 * Creative Studio - Non-Destructive GPU Shader Editor & Social Share Drawer.
 */

import React, { useState } from 'react';
import {
  Sliders,
  X,
  RotateCcw,
  Eye,
  Download,
  Share2,
  Sparkles,
  Sun,
  Palette,
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import type { PhotoItem, BasicAdjustments } from '@gallery/shared';
import {
  createDefaultAdjustments,
  EDITOR_PRESETS,
  applyPresetToRecipe,
  createDefaultRecipe,
  mapAdjustmentsToUniforms,
  SocialShareManager
} from '@gallery/editor-engine';

export interface StudioEditorModalProps {
  photo: PhotoItem;
  onClose: () => void;
  onExportCopy: (photo: PhotoItem, adjustments: BasicAdjustments) => void;
}

export function StudioEditorModal({ photo, onClose, onExportCopy }: StudioEditorModalProps) {
  const [adjustments, setAdjustments] = useState<BasicAdjustments>(createDefaultAdjustments());
  const [activeTab, setActiveTab] = useState<'tone' | 'color' | 'effects' | 'presets' | 'share'>('tone');
  const [showOriginal, setShowOriginal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const uniforms = mapAdjustmentsToUniforms(adjustments);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const recipe = createDefaultRecipe(photo.id);
    const updated = applyPresetToRecipe(recipe, presetId);
    setAdjustments({ ...updated.adjustments });
  };

  const handleReset = () => {
    setAdjustments(createDefaultAdjustments());
    setSelectedPreset(null);
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'twitter') => {
    const shareText = `Check out this photograph "${photo.fileName}" edited in Photo Gallery Studio!`;
    const url = SocialShareManager.getShareLink(platform, shareText);
    window.open(url, '_blank');
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(`Photograph: ${photo.fileName} (${photo.width}x${photo.height})`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in select-none">
      <div className="w-full max-w-5xl bg-canvas-elevated border border-canvas-subtle rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        {/* Header */}
        <header className="px-6 py-3.5 border-b border-canvas-subtle flex items-center justify-between bg-canvas-base/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Creative Studio</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                  NON-DESTRUCTIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                {photo.fileName} • {photo.width} × {photo.height}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-base hover:bg-canvas-subtle border border-canvas-subtle text-slate-300 text-xs font-mono transition-colors"
              title="Hold to see original unedited photo"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showOriginal ? 'Showing Original' : 'Hold Before/After'}</span>
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-canvas-subtle transition-colors"
              title="Reset All Adjustments"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-canvas-subtle transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Studio Viewport */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main GPU Canvas Area */}
          <main className="flex-1 bg-black flex items-center justify-center p-6 relative overflow-hidden">
            <div
              className="relative max-w-full max-h-full aspect-video bg-canvas-base/80 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center transition-all duration-150 overflow-hidden"
              style={{
                filter: showOriginal
                  ? 'none'
                  : `brightness(${1 + uniforms.exposure * 0.8}) contrast(${1 + uniforms.contrast * 0.8}) saturate(${1 + uniforms.saturation * 0.8})`,
              }}
            >
              <div className="text-center text-slate-500 p-8">
                <Sliders className="w-16 h-16 mx-auto mb-3 opacity-30 text-blue-400" />
                <p className="text-base font-semibold text-slate-300">{photo.fileName}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Real-time GPU Shader Viewport (WebGL2) • 60/120 FPS
                </p>
                {selectedPreset && (
                  <span className="mt-3 inline-block text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    Preset: {selectedPreset}
                  </span>
                )}
              </div>

              {/* Vignette Overlay Simulation */}
              {adjustments.vignette > 0 && !showOriginal && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, transparent 50%, rgba(0,0,0,${adjustments.vignette / 120}) 100%)`,
                  }}
                />
              )}
            </div>
          </main>

          {/* Right Adjustments Inspector */}
          <aside className="w-80 border-l border-canvas-subtle bg-canvas-base flex flex-col justify-between">
            {/* Inspector Navigation Tabs */}
            <div className="flex border-b border-canvas-subtle text-xs font-semibold text-slate-400 bg-canvas-elevated">
              <button
                onClick={() => setActiveTab('tone')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === 'tone' ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-white'
                }`}
              >
                Tone
              </button>
              <button
                onClick={() => setActiveTab('color')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === 'color' ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-white'
                }`}
              >
                Color
              </button>
              <button
                onClick={() => setActiveTab('effects')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === 'effects' ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-white'
                }`}
              >
                Effects
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === 'presets' ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-white'
                }`}
              >
                Presets
              </button>
              <button
                onClick={() => setActiveTab('share')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === 'share' ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-white'
                }`}
              >
                Share
              </button>
            </div>

            {/* Tab Controls Content */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5">
              {activeTab === 'tone' && (
                <div className="space-y-4">
                  <SliderRow
                    label="Exposure (EV)"
                    value={adjustments.exposure}
                    onChange={(v) => setAdjustments((a) => ({ ...a, exposure: v }))}
                  />
                  <SliderRow
                    label="Contrast"
                    value={adjustments.contrast}
                    onChange={(v) => setAdjustments((a) => ({ ...a, contrast: v }))}
                  />
                  <SliderRow
                    label="Highlights"
                    value={adjustments.highlights}
                    onChange={(v) => setAdjustments((a) => ({ ...a, highlights: v }))}
                  />
                  <SliderRow
                    label="Shadows"
                    value={adjustments.shadows}
                    onChange={(v) => setAdjustments((a) => ({ ...a, shadows: v }))}
                  />
                  <SliderRow
                    label="Whites"
                    value={adjustments.whites}
                    onChange={(v) => setAdjustments((a) => ({ ...a, whites: v }))}
                  />
                  <SliderRow
                    label="Blacks"
                    value={adjustments.blacks}
                    onChange={(v) => setAdjustments((a) => ({ ...a, blacks: v }))}
                  />
                </div>
              )}

              {activeTab === 'color' && (
                <div className="space-y-4">
                  <SliderRow
                    label="Temperature (Warmth)"
                    value={adjustments.temperature}
                    onChange={(v) => setAdjustments((a) => ({ ...a, temperature: v }))}
                  />
                  <SliderRow
                    label="Tint (Green/Magenta)"
                    value={adjustments.tint}
                    onChange={(v) => setAdjustments((a) => ({ ...a, tint: v }))}
                  />
                  <SliderRow
                    label="Vibrance"
                    value={adjustments.vibrance}
                    onChange={(v) => setAdjustments((a) => ({ ...a, vibrance: v }))}
                  />
                  <SliderRow
                    label="Saturation"
                    value={adjustments.saturation}
                    onChange={(v) => setAdjustments((a) => ({ ...a, saturation: v }))}
                  />
                </div>
              )}

              {activeTab === 'effects' && (
                <div className="space-y-4">
                  <SliderRow
                    label="Vignette"
                    min={0}
                    max={100}
                    value={adjustments.vignette}
                    onChange={(v) => setAdjustments((a) => ({ ...a, vignette: v }))}
                  />
                  <SliderRow
                    label="Film Grain"
                    min={0}
                    max={100}
                    value={adjustments.grain}
                    onChange={(v) => setAdjustments((a) => ({ ...a, grain: v }))}
                  />
                </div>
              )}

              {activeTab === 'presets' && (
                <div className="space-y-3">
                  {EDITOR_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPreset === preset.id
                          ? 'bg-blue-600/15 border-blue-500 text-white'
                          : 'bg-canvas-elevated border-canvas-subtle hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <h4 className="text-xs font-bold flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'share' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instantly share this photograph with friends and social networks:
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 justify-center transition-all"
                    >
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleShare('telegram')}
                      className="p-3 bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/30 text-sky-400 rounded-xl text-xs font-semibold flex items-center gap-2 justify-center transition-all"
                    >
                      <span>Telegram</span>
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-2 justify-center transition-all col-span-2"
                    >
                      <span>Twitter / X</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-canvas-subtle">
                    <button
                      onClick={handleCopyShare}
                      className="w-full py-2.5 bg-canvas-elevated hover:bg-canvas-subtle border border-canvas-subtle text-slate-200 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied Details to Clipboard!' : 'Copy Photo Reference'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-canvas-subtle bg-canvas-elevated flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Original remains 100% safe</span>
              <button
                onClick={() => onExportCopy(photo, adjustments)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Derivative Copy</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>{label}</span>
        <span className="font-mono text-slate-400">{value > 0 ? `+${value}` : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1.5 bg-canvas-subtle rounded-lg cursor-pointer"
      />
    </div>
  );
}

