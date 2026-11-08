/**
 * apps/windows/src/renderer/components/PhotoOfTheMonthCard.tsx
 * "Photo of the Month" Aesthetic Quality Highlight Showcase Card.
 */

import React, { useState } from 'react';
import { Trophy, Sparkles, Sliders, Maximize2, X, Star, Zap } from 'lucide-react';
import type { PhotoItem } from '@gallery/shared';
import { AestheticAnalyzer, type PhotoOfTheMonth } from '@gallery/ai-engine';

export interface PhotoOfTheMonthCardProps {
  photos: PhotoItem[];
  onOpenFullscreen: (photo: PhotoItem) => void;
  onEditInStudio: (photo: PhotoItem) => void;
}

export function PhotoOfTheMonthCard({
  photos,
  onOpenFullscreen,
  onEditInStudio,
}: PhotoOfTheMonthCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (photos.length === 0 || isDismissed) return null;

  // Group photos by current month or latest month
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthPhotos = photos.filter((p) => p.captureDate.startsWith(currentMonthKey));
  const candidatePool = monthPhotos.length > 0 ? monthPhotos : photos;

  const winner: PhotoOfTheMonth | null = AestheticAnalyzer.selectPhotoOfTheMonth(
    currentMonthKey,
    candidatePool
  );

  if (!winner) return null;

  const photo = winner.winningPhoto;

  return (
    <div className="mb-6 p-5 bg-gradient-to-r from-amber-950/40 via-canvas-elevated to-indigo-950/30 border border-amber-500/30 rounded-2xl shadow-2xl relative overflow-hidden animate-fade-in select-none">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start gap-5 flex-1 mr-4">
          {/* Trophy Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Trophy className="w-7 h-7" />
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Photo of the Month
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                SCORE: {winner.score.overall} / 100
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100">{photo.fileName}</h3>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl bg-canvas-base/50 p-2.5 rounded-xl border border-canvas-subtle/60">
              💡 <span className="font-semibold text-amber-300">AI Aesthetic Analysis:</span>{' '}
              {winner.aiReasoning}
            </p>

            {/* Score Breakdown Pills */}
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Sharpness: <span className="text-slate-200 font-semibold">{winner.score.sharpness}%</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Exposure: <span className="text-slate-200 font-semibold">{winner.score.exposure}%</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Composition: <span className="text-slate-200 font-semibold">{winner.score.composition}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenFullscreen(photo)}
            className="flex items-center gap-1.5 px-3 py-2 bg-canvas-base hover:bg-canvas-subtle border border-canvas-subtle text-slate-200 rounded-xl text-xs font-medium transition-colors"
            title="View Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <button
            onClick={() => onEditInStudio(photo)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-amber-500/20"
            title="Edit in Creative Studio"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-canvas-subtle ml-1"
            title="Dismiss Card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

