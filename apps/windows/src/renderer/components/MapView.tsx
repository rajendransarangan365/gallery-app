/**
 * apps/windows/src/renderer/components/MapView.tsx
 * Geographic Map & Location Clustering Explorer.
 */

import React, { useState } from 'react';
import { MapPin, Camera, Navigation, Layers, X, Calendar } from 'lucide-react';
import type { PhotoItem } from '@gallery/shared';
import { clusterPhotosByLocation, type GeoPhotoCluster } from '@gallery/shared';

export interface MapViewProps {
  photos: PhotoItem[];
  onSelectPhoto: (photo: PhotoItem) => void;
}

export function MapView({ photos, onSelectPhoto }: MapViewProps) {
  const clusters = clusterPhotosByLocation(photos);
  const [selectedCluster, setSelectedCluster] = useState<GeoPhotoCluster | null>(null);

  if (clusters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-canvas-elevated border border-canvas-subtle flex items-center justify-center text-rose-400 mb-4 shadow-xl">
          <MapPin className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">No Location Coordinates Found</h3>
        <p className="text-sm text-slate-400 mt-1">
          None of your currently indexed photographs contain GPS metadata tags. When you import photos taken with location enabled, they will automatically appear here on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 select-none relative overflow-hidden">
      {/* Map Header */}
      <div className="flex items-center justify-between border-b border-canvas-subtle pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            Places & Geographic Clusters
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {clusters.length} geographic locations • {clusters.reduce((sum, c) => sum + c.photoCount, 0)} geocoded photos
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-canvas-elevated px-3 py-1.5 rounded-xl border border-canvas-subtle">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>Local Clustering Mode</span>
        </div>
      </div>

      {/* Interactive Geographic Location Grid */}
      <div className="grid grid-cols-3 gap-4 overflow-y-auto pb-8">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            onClick={() => setSelectedCluster(cluster)}
            className={`group p-5 bg-canvas-elevated border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-xl ${
              selectedCluster?.id === cluster.id
                ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-rose-500/10'
                : 'border-canvas-subtle hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-canvas-base border border-canvas-subtle text-slate-300">
                {cluster.photoCount} {cluster.photoCount === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <h3 className="font-semibold text-slate-100 text-base truncate group-hover:text-rose-300 transition-colors">
              {cluster.label}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {cluster.latitude.toFixed(4)}° N, {cluster.longitude.toFixed(4)}° E
            </p>

            {/* Micro Thumbnail Filmstrip Preview */}
            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-canvas-subtle/60">
              {cluster.photos.slice(0, 4).map((p) => (
                <div key={p.id} className="w-9 h-9 rounded-lg bg-canvas-base border border-canvas-subtle flex items-center justify-center overflow-hidden">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ))}
              {cluster.photoCount > 4 && (
                <span className="text-[10px] text-slate-500 font-mono pl-1">
                  +{cluster.photoCount - 4}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Location Photo Drawer */}
      {selectedCluster && (
        <div className="fixed inset-x-64 bottom-0 z-30 bg-canvas-elevated/95 backdrop-blur-xl border-t border-canvas-subtle p-6 rounded-t-3xl shadow-2xl space-y-4 max-h-[50vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedCluster.label}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedCluster.photoCount} photographs captured at this coordinate
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCluster(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-canvas-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {selectedCluster.photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className="group relative aspect-square bg-canvas-base rounded-xl overflow-hidden border border-canvas-subtle hover:border-rose-500 cursor-pointer transition-all hover:scale-105"
              >
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Camera className="w-6 h-6 opacity-40 group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                  <p className="text-[10px] text-white truncate font-medium">{photo.fileName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
