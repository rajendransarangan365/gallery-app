/**
 * apps/windows/src/renderer/components/FullscreenViewer.tsx
 * Full-screen photo viewer with pan, zoom, keyboard navigation, and swipe dismiss physics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sliders,
  FolderLock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Calendar,
  Camera,
  MapPin
} from 'lucide-react';
import type { PhotoItem } from '@gallery/shared';

export interface FullscreenViewerProps {
  photos: PhotoItem[];
  currentPhoto: PhotoItem;
  onClose: () => void;
  onToggleFavorite: (photo: PhotoItem) => void;
  onEditInStudio: (photo: PhotoItem) => void;
  onMoveToVault: (photo: PhotoItem) => void;
}

export function FullscreenViewer({
  photos,
  currentPhoto,
  onClose,
  onToggleFavorite,
  onEditInStudio,
  onMoveToVault,
}: FullscreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    photos.findIndex((p) => p.id === currentPhoto.id)
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activePhoto = photos[currentIndex] || currentPhoto;

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [currentIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key.toLowerCase() === 'f') onToggleFavorite(activePhoto);
      else if (e.key.toLowerCase() === 'e') onEditInStudio(activePhoto);
      else if (e.key.toLowerCase() === 'i') setShowInfo((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev, onToggleFavorite, onEditInStudio, activePhoto]);

  // Pan & Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Double-click toggle zoom
  const handleDoubleClick = () => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomLevel(2.5);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between overflow-hidden select-none animate-fade-in"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Controls Toolbar */}
      <header className="h-16 px-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-sm">{activePhoto.fileName}</p>
            <p className="text-xs text-slate-400 font-mono">
              {currentIndex + 1} of {photos.length} • {new Date(activePhoto.captureDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center bg-white/10 rounded-xl px-2 py-1">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.5))}
              className="p-1 text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-300 px-2">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.5))}
              className="p-1 text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Favorite Toggle */}
          <button
            onClick={() => onToggleFavorite(activePhoto)}
            className={`p-2 rounded-xl transition-all ${
              activePhoto.isFavorite
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20 scale-105'
                : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
            }`}
            title="Favorite (F)"
          >
            <Heart className={`w-5 h-5 ${activePhoto.isFavorite ? 'fill-rose-400' : ''}`} />
          </button>

          {/* Studio Editor Trigger */}
          <button
            onClick={() => onEditInStudio(activePhoto)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
            title="Edit in Studio (E)"
          >
            <Sliders className="w-4 h-4" />
            <span>Edit</span>
          </button>

          {/* Move to Vault Trigger */}
          <button
            onClick={() => onMoveToVault(activePhoto)}
            className="p-2 rounded-xl bg-white/10 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 transition-colors"
            title="Move to Secure Vault"
          >
            <FolderLock className="w-5 h-5" />
          </button>

          {/* Info Drawer Toggle */}
          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className={`p-2 rounded-xl transition-colors ${
              showInfo ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
            }`}
            title="Photo Info (I)"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <main
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-default"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Navigation Arrow Left */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-all z-20 hover:scale-110 shadow-xl"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Center Photograph Container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <div className="w-[85vw] h-[75vh] flex items-center justify-center bg-canvas-elevated/40 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="text-center text-slate-600 p-8">
              <Camera className="w-20 h-20 mx-auto mb-4 opacity-30 text-blue-400" />
              <p className="text-lg font-semibold text-slate-200">{activePhoto.fileName}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {activePhoto.width} × {activePhoto.height} • {(activePhoto.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Arrow Right */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-all z-20 hover:scale-110 shadow-xl"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Right Info Inspector Drawer */}
        {showInfo && (
          <aside className="absolute right-6 top-6 bottom-6 w-80 bg-canvas-elevated/95 backdrop-blur-xl border border-canvas-subtle p-6 rounded-2xl shadow-2xl z-30 flex flex-col justify-between overflow-y-auto animate-slide-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-canvas-subtle pb-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Metadata & EXIF
                </h3>
                <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">File Path</p>
                <p className="text-xs font-mono text-slate-300 break-all mt-1">{activePhoto.fileUri}</p>
              </div>

              {activePhoto.exif?.cameraModel && (
                <div>
                  <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">Camera Equipment</p>
                  <p className="text-sm font-medium text-slate-200 mt-1">{activePhoto.exif.cameraModel}</p>
                  {activePhoto.exif.lensModel && <p className="text-xs text-slate-400">{activePhoto.exif.lensModel}</p>}
                  <div className="flex gap-2 text-xs text-slate-400 font-mono mt-1">
                    {activePhoto.exif.fNumber && <span>ƒ/{activePhoto.exif.fNumber}</span>}
                    {activePhoto.exif.exposureTime && <span>{activePhoto.exif.exposureTime}s</span>}
                    {activePhoto.exif.iso && <span>ISO {activePhoto.exif.iso}</span>}
                  </div>
                </div>
              )}

              {activePhoto.coordinates && (
                <div>
                  <p className="text-xs text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    Geographic Location
                  </p>
                  <p className="text-xs font-mono text-slate-300 mt-1">
                    {activePhoto.coordinates.latitude.toFixed(4)}°, {activePhoto.coordinates.longitude.toFixed(4)}°
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Capture Timestamp
                </p>
                <p className="text-xs text-slate-300 mt-1">{new Date(activePhoto.captureDate).toLocaleString()}</p>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Bottom Filmstrip Carousel */}
      <footer className="h-20 px-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2 z-20">
        <div className="flex items-center gap-2 overflow-x-auto max-w-xl py-2 px-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
          {photos.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border transition-all flex-shrink-0 ${
                idx === currentIndex
                  ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30 ring-2 ring-blue-500/20'
                  : 'border-white/10 opacity-50 hover:opacity-100'
              }`}
            >
              <div className="w-full h-full bg-canvas-elevated flex items-center justify-center text-slate-600">
                <Camera className="w-4 h-4 opacity-50" />
              </div>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

