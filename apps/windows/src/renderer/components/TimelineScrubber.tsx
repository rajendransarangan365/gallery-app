/**
 * apps/windows/src/renderer/components/TimelineScrubber.tsx
 * Sticky right-side scrub bar for fast timeline jumps across years.
 */

import React from 'react';
import { Calendar } from 'lucide-react';

export interface TimelineScrubberProps {
  years: string[];
  activeYear?: string;
  onSelectYear: (year: string) => void;
}

export function TimelineScrubber({ years, activeYear, onSelectYear }: TimelineScrubberProps) {
  if (years.length <= 1) return null;

  return (
    <aside className="fixed right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 py-3 px-1.5 bg-canvas-elevated/70 backdrop-blur-md rounded-2xl border border-canvas-subtle/50 select-none shadow-xl">
      <div className="p-1 text-slate-500 mb-1">
        <Calendar className="w-3.5 h-3.5" />
      </div>
      {years.map((year) => {
        const isCurrent = activeYear === year;
        return (
          <button
            key={year}
            onClick={() => onSelectYear(year)}
            className={`group relative flex items-center justify-center p-1.5 rounded-lg transition-all ${
              isCurrent ? 'text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {/* Year Label */}
            <span className="text-[10px] font-mono tracking-tighter block">{year}</span>

            {/* Hover Tooltip Indicator */}
            <span className="absolute right-full mr-2 px-2 py-0.5 rounded-md bg-canvas-base border border-canvas-subtle text-slate-200 text-[10px] font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              Jump to {year}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
