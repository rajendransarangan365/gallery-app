/**
 * apps/windows/src/renderer/components/PeopleView.tsx
 * Local AI People & Facial Recognition Album Explorer.
 */

import React, { useState } from 'react';
import { Users, User, Edit2, Check, X, Camera, Sparkles, FolderLock } from 'lucide-react';
import type { PhotoItem } from '@gallery/shared';
import type { PersonCluster } from '@gallery/ai-engine';

export interface PeopleViewProps {
  photos: PhotoItem[];
  clusters: PersonCluster[];
  onSelectPhoto: (photo: PhotoItem) => void;
  onRenamePerson: (clusterId: string, newName: string) => void;
}

export function PeopleView({
  photos,
  clusters,
  onSelectPhoto,
  onRenamePerson,
}: PeopleViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<PersonCluster | null>(null);
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');

  const handleStartRename = (cluster: PersonCluster, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClusterId(cluster.id);
    setEditNameText(cluster.name);
  };

  const handleSaveRename = (clusterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editNameText.trim()) {
      onRenamePerson(clusterId, editNameText.trim());
    }
    setEditingClusterId(null);
  };

  if (clusters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto select-none">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 shadow-xl">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Zero-Cloud Facial Recognition</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          100% on-device AI. Photos are analyzed locally using SCRFD and ArcFace with DirectML acceleration. As you index photos with faces, albums are automatically clustered here.
        </p>
        <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-elevated border border-canvas-subtle text-[11px] font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local ONNX Runtime • Zero Cloud Telemetry</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 select-none relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-canvas-subtle pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            People & Recognized Faces
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {clusters.length} people identified • {clusters.reduce((sum, c) => sum + c.faceCount, 0)} total face detections
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-canvas-elevated px-3 py-1.5 rounded-xl border border-canvas-subtle">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>ArcFace 512-d Local Clustering</span>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-4 gap-4 overflow-y-auto pb-8">
        {clusters.map((cluster) => {
          const isSelected = selectedCluster?.id === cluster.id;
          const isEditing = editingClusterId === cluster.id;

          return (
            <div
              key={cluster.id}
              onClick={() => setSelectedCluster(cluster)}
              className={`group p-5 bg-canvas-elevated border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-xl ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-indigo-500/10'
                  : 'border-canvas-subtle hover:border-slate-600'
              }`}
            >
              {/* Circular Avatar / Face Crop */}
              <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-indigo-950 via-canvas-base to-slate-800 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg group-hover:border-indigo-400 transition-colors overflow-hidden">
                <User className="w-10 h-10 opacity-70 group-hover:scale-110 transition-transform" />
              </div>

              {/* Name & Rename Action */}
              <div className="text-center">
                {isEditing ? (
                  <div className="flex items-center justify-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editNameText}
                      onChange={(e) => setEditNameText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(cluster.id, e as any)}
                      autoFocus
                      className="w-28 bg-canvas-base border border-indigo-500 rounded px-2 py-0.5 text-xs text-center text-white focus:outline-none"
                    />
                    <button
                      onClick={(e) => handleSaveRename(cluster.id, e)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClusterId(null);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 group/name">
                    <h3 className="text-sm font-bold text-slate-100 truncate max-w-[140px]">
                      {cluster.name}
                    </h3>
                    <button
                      onClick={(e) => handleStartRename(cluster, e)}
                      className="opacity-0 group-hover/name:opacity-100 text-slate-400 hover:text-indigo-400 transition-opacity p-0.5"
                      title="Rename Person"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  {cluster.photoCount} {cluster.photoCount === 1 ? 'photo' : 'photos'} • {cluster.faceCount} faces
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Person Photo Drawer */}
      {selectedCluster && (
        <div className="fixed inset-x-64 bottom-0 z-30 bg-canvas-elevated/95 backdrop-blur-xl border-t border-canvas-subtle p-6 rounded-t-3xl shadow-2xl space-y-4 max-h-[50vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedCluster.name}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedCluster.photoCount} photographs featuring this person
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
            {photos
              .filter((p) => selectedCluster.photoIds.includes(p.id))
              .map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onSelectPhoto(photo)}
                  className="group relative aspect-square bg-canvas-base rounded-xl overflow-hidden border border-canvas-subtle hover:border-indigo-500 cursor-pointer transition-all hover:scale-105"
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
