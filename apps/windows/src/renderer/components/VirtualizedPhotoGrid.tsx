/**
 * VirtualizedPhotoGrid.tsx
 * High performance windowed grid renderer for 10,000+ to 50,000+ photo collections.
 * Only mounts visible DOM elements + overscan buffer, maintaining 60/120 FPS scrolling
 * and bounded memory footprint.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { PhotoItem } from '@gallery/shared';
import { Camera, CheckSquare, Square, Heart, Maximize2, SearchX } from 'lucide-react';

interface VirtualizedPhotoGridProps {
  photos: PhotoItem[];
  columns: number;
  selectedPhoto: PhotoItem | null;
  selectedPhotoIds: Set<string>;
  onSelect: (photo: PhotoItem) => void;
  onToggleSelect: (photoId: string, e: React.MouseEvent) => void;
  onToggleFavorite: (photo: PhotoItem, e: React.MouseEvent) => void;
  onOpenFullscreen: (photo: PhotoItem) => void;
  headerSlot?: React.ReactNode;
  gap?: number;
  overscan?: number;
}

export function VirtualizedPhotoGrid({
  photos,
  columns,
  selectedPhoto,
  selectedPhotoIds,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onOpenFullscreen,
  headerSlot,
  gap = 12,
  overscan = 2,
}: VirtualizedPhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [containerHeight, setContainerHeight] = useState(800);
  const [headerHeight, setHeaderHeight] = useState(0);

  // ResizeObserver to track container and header dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setContainerWidth(container.clientWidth || 1200);
      setContainerHeight(container.clientHeight || 800);
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight + 24); // include margin
      } else {
        setHeaderHeight(0);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(container);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [headerSlot]);

  // Handle scroll events with requestAnimationFrame for 60/120 FPS responsiveness
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => {
      setScrollTop(currentScrollTop);
    });
  }, []);

  // Compute item dimensions
  const itemWidth = useMemo(() => {
    const availableWidth = containerWidth - (columns - 1) * gap;
    return Math.max(100, Math.floor(availableWidth / columns));
  }, [containerWidth, columns, gap]);

  // Aspect ratio is 1:1 square
  const itemHeight = itemWidth;
  const rowHeight = itemHeight + gap;

  // Total rows
  const totalRows = Math.ceil(photos.length / columns);
  const totalHeight = totalRows * rowHeight;

  // Visible row calculations accounting for header height
  const effectiveScrollTop = Math.max(0, scrollTop - headerHeight);
  const startRow = Math.max(0, Math.floor(effectiveScrollTop / rowHeight) - overscan);
  const endRow = Math.min(totalRows - 1, Math.ceil((effectiveScrollTop + containerHeight) / rowHeight) + overscan);

  // Sliced items to render
  const visibleRows = useMemo(() => {
    const rows = [];
    for (let r = startRow; r <= endRow; r++) {
      const startIndex = r * columns;
      const endIndex = Math.min(startIndex + columns, photos.length);
      const rowPhotos = photos.slice(startIndex, endIndex);
      if (rowPhotos.length > 0) {
        rows.push({
          rowIndex: r,
          top: r * rowHeight,
          photos: rowPhotos,
        });
      }
    }
    return rows;
  }, [startRow, endRow, columns, photos, rowHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full overflow-y-auto relative custom-scrollbar pr-1"
      style={{ willChange: 'transform' }}
    >
      {/* Optional Top Header Slot (e.g. Photo of the Month banner) */}
      {headerSlot && (
        <div ref={headerRef} className="mb-6">
          {headerSlot}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <SearchX className="w-10 h-10 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">No matching photographs</p>
          <p className="text-xs text-slate-500">Try adjusting your search query or filters.</p>
        </div>
      ) : (
        /* Phantom height placeholder for native scrollbar geometry */
        <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
          {visibleRows.map((row) => (
            <div
              key={row.rowIndex}
              style={{
                position: 'absolute',
                top: `${row.top}px`,
                left: 0,
                right: 0,
                height: `${itemHeight}px`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${gap}px`,
              }}
            >
              {row.photos.map((photo) => {
                const isSelected = selectedPhoto?.id === photo.id;
                const isMultiSelected = selectedPhotoIds.has(photo.id);

                return (
                  <div
                    key={photo.id}
                    onClick={() => onSelect(photo)}
                    onDoubleClick={() => onOpenFullscreen(photo)}
                    className={`group relative aspect-square bg-canvas-elevated rounded-xl overflow-hidden border cursor-pointer transition-all ${
                      isMultiSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                        : isSelected
                        ? 'border-blue-400 ring-1 ring-blue-400/30'
                        : 'border-canvas-subtle hover:border-slate-600'
                    }`}
                  >
                    {/* Thumbnail */}
                    {photo.thumbnailPath ? (
                      <img
                        src={photo.thumbnailPath}
                        alt={photo.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-canvas-subtle/30 text-slate-600">
                        <Camera className="w-8 h-8 opacity-40 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] text-slate-500 font-mono mt-1">
                          {photo.width} × {photo.height}
                        </span>
                      </div>
                    )}

                    {/* Top Left Multi-Select Checkbox */}
                    <button
                      onClick={(e) => onToggleSelect(photo.id, e)}
                      className={`absolute top-2 left-2 z-10 p-1 rounded-lg transition-all ${
                        isMultiSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'bg-black/50 text-slate-300 hover:text-white backdrop-blur-sm opacity-0 group-hover:opacity-100'
                      }`}
                      title={isMultiSelected ? 'Deselect photo' : 'Select photo'}
                    >
                      {isMultiSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    {/* Top Right Favorite Button */}
                    <button
                      onClick={(e) => onToggleFavorite(photo, e)}
                      className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-all ${
                        photo.isFavorite
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-md shadow-rose-500/20'
                          : 'bg-black/50 text-slate-300 hover:text-white backdrop-blur-sm opacity-0 group-hover:opacity-100'
                      }`}
                      title={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${photo.isFavorite ? 'fill-rose-400' : ''}`} />
                    </button>

                    {/* Bottom Gradient Overlay & Meta */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-xs font-semibold text-white truncate">{photo.fileName}</p>
                          <p className="text-[10px] text-slate-300 font-mono">
                            {new Date(photo.captureDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFullscreen(photo);
                          }}
                          className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
