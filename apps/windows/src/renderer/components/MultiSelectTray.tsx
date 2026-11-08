/**
 * apps/windows/src/renderer/components/MultiSelectTray.tsx
 * Bottom floating action dock for batch photo operations.
 */

import React from 'react';
import { Heart, FolderLock, Download, X, CheckSquare, Square } from 'lucide-react';
import type { PhotoItem } from '@gallery/shared';

export interface MultiSelectTrayProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchFavorite: () => void;
  onBatchMoveToVault: () => void;
  onBatchExport: () => void;
}

export function MultiSelectTray({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchFavorite,
  onBatchMoveToVault,
  onBatchExport,
}: MultiSelectTrayProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none animate-slide-up">
      <div className="bg-canvas-elevated/95 backdrop-blur-xl border border-canvas-subtle px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 pointer-events-auto border-blue-500/30 ring-1 ring-blue-500/20">
        {/* Count & Selection Controls */}
        <div className="flex items-center gap-3 pr-4 border-r border-canvas-subtle">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center font-mono">
            {selectedCount}
          </span>
          <span className="text-xs font-medium text-slate-200">Selected</span>

          <button
            onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
            className="text-xs text-blue-400 hover:text-blue-300 ml-2 font-medium"
          >
            {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2">
          {/* Batch Favorite */}
          <button
            onClick={onBatchFavorite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-base hover:bg-canvas-subtle border border-canvas-subtle text-slate-200 hover:text-rose-400 text-xs font-medium transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorite</span>
          </button>

          {/* Batch Move to Vault */}
          <button
            onClick={onBatchMoveToVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas-base hover:bg-canvas-subtle border border-canvas-subtle text-slate-200 hover:text-amber-400 text-xs font-medium transition-colors"
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Move to Vault</span>
          </button>

          {/* Batch Export */}
          <button
            onClick={onBatchExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Copy</span>
          </button>
        </div>

        {/* Close Selection */}
        <button
          onClick={onClearSelection}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-canvas-subtle transition-colors ml-2"
          title="Exit Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
