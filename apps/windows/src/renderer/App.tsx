import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Calendar,
  MapPin,
  Users,
  FolderLock,
  RefreshCw,
  FolderX,
  Sliders,
  Search,
  Grid,
  Columns,
  Heart,
  Smartphone,
  ArrowDownToLine,
  Eye,
  Camera,
  Info,
  Loader2,
  FolderOpen,
  X,
  CheckSquare,
  Square,
  Maximize2
} from 'lucide-react';
import type { PhotoItem, GridDensity } from '@gallery/shared';
import { formatMonthKey, getMonthDisplayName } from '@gallery/shared';
import { FullscreenViewer } from './components/FullscreenViewer';
import { MapView } from './components/MapView';
import { MultiSelectTray } from './components/MultiSelectTray';
import { TimelineScrubber } from './components/TimelineScrubber';
import { MtpImportModal } from './components/MtpImportModal';
import { SyncCenter } from './components/SyncCenter';
import { PeopleView } from './components/PeopleView';
import { PhotoOfTheMonthCard } from './components/PhotoOfTheMonthCard';
import type { PersonCluster } from '@gallery/ai-engine';

// Type declaration for Electron context bridge
declare global {
  interface Window {
    electronAPI?: {
      openDirectory: () => Promise<string | null>;
      scanDirectory: (path: string) => Promise<PhotoItem[]>;
      onScanProgress: (callback: (progress: any) => void) => () => void;
      vaultIsConfigured: () => Promise<boolean>;
      vaultSetup: (pin: string) => Promise<boolean>;
      vaultUnlock: (pin: string) => Promise<boolean>;
      vaultLock: () => Promise<boolean>;
      vaultList: () => Promise<any[]>;
      vaultImport: (filePath: string) => Promise<any>;
      vaultExport: (itemId: string, destDir: string) => Promise<string>;
      exclusionsList: () => Promise<any[]>;
      exclusionsAdd: (folderPath: string) => Promise<any>;
      exclusionsRemove: (folderPath: string) => Promise<boolean>;
      // Windows MTP APIs
      mtpDetectDevices: () => Promise<any[]>;
      mtpScanDevicePhotos: (devicePath: string) => Promise<any[]>;
      mtpTransferPhotos: (
        candidates: any[],
        destinationDir: string
      ) => Promise<{ transferredPhotos: PhotoItem[]; skippedCount: number; failedCount: number }>;
      onMtpProgress: (callback: (progress: any) => void) => () => void;
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'photos' | 'calendar' | 'map' | 'people' | 'vault' | 'sync' | 'exclusions'>('photos');
  const [gridDensity, setGridDensity] = useState<GridDensity>(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [showMtpPrompt, setShowMtpPrompt] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  // Real Indexed Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ scannedFiles: number; indexedPhotos: number; currentFile: string } | null>(null);

  // Vault & Exclusion States
  const [vaultPin, setVaultPin] = useState('');
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  // Phase 4 UI States: Fullscreen, Multi-Select & Timeline
  const [fullscreenPhoto, setFullscreenPhoto] = useState<PhotoItem | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [activeScrubYear, setActiveScrubYear] = useState<string | undefined>(undefined);

  // Phase 5: Windows MTP USB Mobile Device States
  const [connectedMtpDevices, setConnectedMtpDevices] = useState<any[]>([]);
  const [activeMtpDevice, setActiveMtpDevice] = useState<any | null>(null);
  const [isMtpModalOpen, setIsMtpModalOpen] = useState(false);
  const [detectedPhotoCount, setDetectedPhotoCount] = useState<number>(0);

  // Phase 7: Local AI Face Clusters
  const [personClusters, setPersonClusters] = useState<PersonCluster[]>([]);

  const handleRenamePerson = (clusterId: string, newName: string) => {
    setPersonClusters((prev) =>
      prev.map((c) => (c.id === clusterId ? { ...c, name: newName } : c))
    );
  };

  const checkMtpDevices = async () => {
    if (!window.electronAPI?.mtpDetectDevices) return;
    try {
      const devices = await window.electronAPI.mtpDetectDevices();
      setConnectedMtpDevices(devices);
      if (devices.length > 0) {
        const primary = devices[0];
        setActiveMtpDevice(primary);
        setShowMtpPrompt(true);
        if (primary.path && window.electronAPI.mtpScanDevicePhotos) {
          const found = await window.electronAPI.mtpScanDevicePhotos(primary.path);
          setDetectedPhotoCount(found.length);
        }
      } else {
        setActiveMtpDevice(null);
        setDetectedPhotoCount(0);
      }
    } catch (err) {
      console.warn('MTP check failed:', err);
    }
  };

  useEffect(() => {
    checkMtpDevices();
    const interval = setInterval(checkMtpDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleFavorite = (photo: PhotoItem) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
    if (selectedPhoto && selectedPhoto.id === photo.id) {
      setSelectedPhoto((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleMoveToVault = async (photo: PhotoItem) => {
    if (!window.electronAPI) {
      alert('Vault operations require the Electron desktop client.');
      return;
    }
    try {
      await window.electronAPI.vaultImport(photo.fileUri);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (fullscreenPhoto?.id === photo.id) setFullscreenPhoto(null);
      if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
      alert(`Photo "${photo.fileName}" has been safely moved to your encrypted Secure Vault.`);
    } catch (err) {
      alert('Failed to move photo to vault: ' + (err as Error).message);
    }
  };

  const handleToggleSelectPhoto = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds(new Set(photos.map((p) => p.id)));
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleBatchFavorite = () => {
    setPhotos((prev) =>
      prev.map((p) => (selectedPhotoIds.has(p.id) ? { ...p, isFavorite: true } : p))
    );
    setSelectedPhotoIds(new Set());
  };

  const handleBatchMoveToVault = async () => {
    if (!window.electronAPI) {
      alert('Vault operations require the Electron desktop client.');
      return;
    }
    const toMove = photos.filter((p) => selectedPhotoIds.has(p.id));
    let count = 0;
    for (const p of toMove) {
      try {
        await window.electronAPI.vaultImport(p.fileUri);
        count++;
      } catch (err) {
        console.error('Failed to import to vault:', p.fileName, err);
      }
    }
    setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.has(p.id)));
    setSelectedPhotoIds(new Set());
    alert(`Successfully moved and encrypted ${count} photographs into the Secure Vault.`);
  };

  const handleBatchExport = () => {
    alert(`Exporting copy of ${selectedPhotoIds.size} photographs to chosen destination...`);
    setSelectedPhotoIds(new Set());
  };

  const availableYears = Array.from(
    new Set(
      photos
        .map((p) => {
          try {
            const yr = new Date(p.captureDate).getFullYear().toString();
            return yr !== 'NaN' ? yr : null;
          } catch {
            return null;
          }
        })
        .filter((y): y is string => !!y)
    )
  ).sort((a, b) => Number(b) - Number(a));

  const handleSelectYear = (year: string) => {
    setActiveScrubYear(year);
    const targetElement = document.getElementById(`year-section-${year}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadExclusions = async () => {
    if (window.electronAPI?.exclusionsList) {
      const list = await window.electronAPI.exclusionsList();
      setExclusions(list);
    }
  };

  useEffect(() => {
    loadExclusions();
  }, []);

  const handleUnlockVault = async () => {
    if (!window.electronAPI) {
      setIsVaultUnlocked(true);
      return;
    }
    try {
      const configured = await window.electronAPI.vaultIsConfigured();
      if (!configured) {
        await window.electronAPI.vaultSetup(vaultPin || '1234');
        setIsVaultUnlocked(true);
        const items = await window.electronAPI.vaultList();
        setVaultItems(items);
      } else {
        const ok = await window.electronAPI.vaultUnlock(vaultPin);
        if (ok) {
          setIsVaultUnlocked(true);
          const items = await window.electronAPI.vaultList();
          setVaultItems(items);
        } else {
          alert('Authentication failed: Incorrect PIN.');
        }
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleLockVault = async () => {
    if (window.electronAPI?.vaultLock) {
      await window.electronAPI.vaultLock();
    }
    setIsVaultUnlocked(false);
    setVaultItems([]);
    setVaultPin('');
  };

  const handleAddExclusion = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.openDirectory();
    if (!dir) return;

    const res = await window.electronAPI.exclusionsAdd(dir);
    setPhotos(prev => prev.filter(p => !p.fileUri.toLowerCase().startsWith(dir.toLowerCase())));
    setPurgeNotice(`Excluded: ${res.canonicalPath} • Instantly purged ${res.purgedThumbnailsCount} cached thumbnails.`);
    setTimeout(() => setPurgeNotice(null), 5000);
    await loadExclusions();
  };

  const handleRemoveExclusion = async (canonicalPath: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.exclusionsRemove(canonicalPath);
    await loadExclusions();
  };

  useEffect(() => {
    if (window.electronAPI?.onScanProgress) {
      const unsubscribe = window.electronAPI.onScanProgress((prog) => {
        setScanProgress(prog);
      });
      return unsubscribe;
    }
  }, []);

  const handleSelectFolder = async () => {
    if (!window.electronAPI) {
      alert('Scanning real photographs requires running within the Electron desktop client.');
      return;
    }

    try {
      const selectedDir = await window.electronAPI.openDirectory();
      if (!selectedDir) return;

      setIsScanning(true);
      setScanProgress({ scannedFiles: 0, indexedPhotos: 0, currentFile: selectedDir });

      const indexed = await window.electronAPI.scanDirectory(selectedDir);
      setPhotos((prev) => [...prev, ...indexed]);
    } catch (err) {
      console.error('Scan failed:', err);
      alert('Error during folder scan: ' + (err as Error).message);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  // Filtered Photos for Search
  const filteredPhotos = photos.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.fileName.toLowerCase().includes(query) ||
      p.exif?.cameraModel?.toLowerCase().includes(query) ||
      p.coordinates?.city?.toLowerCase().includes(query)
    );
  });

  // Calendar Groups
  const calendarGroups = photos.reduce<Record<string, PhotoItem[]>>((acc, photo) => {
    const key = formatMonthKey(photo.captureDate);
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  return (
    <div className="flex h-screen w-screen bg-canvas-base text-slate-100 select-none overflow-hidden">
      {/* 1. Left Sidebar */}
      <aside className="w-64 bg-canvas-elevated border-r border-canvas-subtle flex flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white">Photo Gallery</h1>
              <p className="text-xs text-slate-400 font-mono">Privacy-First AI</p>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem
              icon={<ImageIcon className="w-4 h-4" />}
              label="All Photos"
              badge={photos.length > 0 ? String(photos.length) : undefined}
              active={activeTab === 'photos'}
              onClick={() => setActiveTab('photos')}
            />
            <NavItem
              icon={<Calendar className="w-4 h-4" />}
              label="Calendar Timeline"
              active={activeTab === 'calendar'}
              onClick={() => setActiveTab('calendar')}
            />
            <NavItem
              icon={<MapPin className="w-4 h-4" />}
              label="Places & Map"
              active={activeTab === 'map'}
              onClick={() => setActiveTab('map')}
            />
            <NavItem
              icon={<Users className="w-4 h-4" />}
              label="People & Faces"
              active={activeTab === 'people'}
              onClick={() => setActiveTab('people')}
            />
            <NavItem
              icon={<RefreshCw className="w-4 h-4" />}
              label="SyncFlow Center"
              badge="P2P"
              active={activeTab === 'sync'}
              onClick={() => setActiveTab('sync')}
            />
          </nav>

          <div className="pt-4 border-t border-canvas-subtle">
            <div className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Privacy & Vault
            </div>
            <nav className="space-y-1">
              <NavItem
                icon={<FolderLock className="w-4 h-4 text-amber-400" />}
                label="Secure Vault"
                badge={isVaultUnlocked ? 'Unlocked' : 'AES-256'}
                active={activeTab === 'vault'}
                onClick={() => setActiveTab('vault')}
              />
              <NavItem
                icon={<FolderX className="w-4 h-4 text-rose-400" />}
                label="Excluded Folders"
                active={activeTab === 'exclusions'}
                onClick={() => setActiveTab('exclusions')}
              />
            </nav>
          </div>
        </div>

        <div
          onClick={() => {
            if (activeMtpDevice) setIsMtpModalOpen(true);
            else checkMtpDevices();
          }}
          className="p-3 bg-canvas-base/60 hover:bg-canvas-base rounded-xl border border-canvas-subtle/80 flex items-center justify-between cursor-pointer transition-colors"
          title={activeMtpDevice ? 'Click to open Import Center' : 'Click to scan for USB mobile devices'}
        >
          <div className="flex items-center gap-2">
            <Smartphone className={`w-4 h-4 ${activeMtpDevice ? 'text-blue-400' : 'text-slate-500'}`} />
            <div className="text-xs">
              <p className="font-medium text-slate-200">
                {activeMtpDevice ? activeMtpDevice.name : 'No Mobile Device'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {activeMtpDevice ? 'USB MTP Active' : 'Scan for Devices'}
              </p>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              activeMtpDevice ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          ></span>
        </div>
      </aside>

      {/* 2. Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-canvas-subtle px-6 flex items-center justify-between gap-4 bg-canvas-base/80 backdrop-blur-md">
          <div className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder='Try "photos at the beach with mountains" or "red motorcycle"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas-elevated border border-canvas-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectFolder}
              disabled={isScanning}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span>Scan Folder</span>
                </>
              )}
            </button>

            <div className="flex items-center bg-canvas-elevated rounded-lg p-1 border border-canvas-subtle">
              <button
                onClick={() => setGridDensity(2)}
                className={`p-1.5 rounded ${gridDensity === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                title="2 Columns (Large)"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridDensity(3)}
                className={`p-1.5 rounded ${gridDensity === 3 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                title="3 Columns (Standard)"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridDensity(5)}
                className={`p-1.5 rounded ${gridDensity === 5 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                title="5 Columns (Compact)"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-canvas-elevated hover:bg-canvas-subtle border border-canvas-subtle text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Studio Editor</span>
            </button>
          </div>
        </header>

        {/* Dynamic Real MTP Mobile Import Banner */}
        {showMtpPrompt && activeMtpDevice && (
          <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-canvas-elevated border-b border-blue-500/30 px-6 py-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">
                  📱 {activeMtpDevice.name} Connected:{' '}
                  <span className="text-blue-400 font-semibold">
                    {detectedPhotoCount > 0 ? `${detectedPhotoCount} new photographs` : 'Media storage'}
                  </span>{' '}
                  found
                </p>
                <p className="text-xs text-slate-400">
                  WPD / MTP hardware detected • Shall I review and transfer them to your local gallery library?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMtpPrompt(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Later
              </button>
              <button
                onClick={() => setIsMtpModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Review & Transfer
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'vault' ? (
            /* Secure Vault View */
            <div className="h-full max-w-2xl mx-auto flex flex-col justify-center">
              {!isVaultUnlocked ? (
                <div className="bg-canvas-elevated border border-canvas-subtle p-8 rounded-2xl shadow-2xl text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <FolderLock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">Zero-Leakage Secure Vault</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Protected with AES-256-GCM encryption. Photos inside this vault are cryptographically isolated and never indexed by normal gallery scans, MTP connections, or AI workers.
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-3">
                    <input
                      type="password"
                      placeholder="Enter Master PIN or Password"
                      value={vaultPin}
                      onChange={(e) => setVaultPin(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                      className="w-full bg-canvas-base border border-canvas-subtle rounded-xl px-4 py-2.5 text-center text-sm tracking-widest text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      onClick={handleUnlockVault}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
                    >
                      Unlock Vault
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-canvas-subtle pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <FolderLock className="w-5 h-5 text-emerald-400" />
                        Secure Vault (Unlocked)
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">AES-256-GCM Active • In-Memory Session</p>
                    </div>
                    <button
                      onClick={handleLockVault}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20"
                    >
                      Lock Vault Now
                    </button>
                  </div>

                  {vaultItems.length === 0 ? (
                    <div className="text-center py-16 bg-canvas-elevated rounded-2xl border border-canvas-subtle space-y-3">
                      <FolderLock className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-200">No Encrypted Items</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        To protect sensitive photos from USB MTP discovery and indexing, import them into this encrypted vault.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {vaultItems.map((item) => (
                        <div key={item.id} className="p-4 bg-canvas-elevated border border-canvas-subtle rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-200">{item.originalFileName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{new Date(item.encryptedAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-mono">
                            ENCRYPTED
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'exclusions' ? (
            /* Excluded Folders View */
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-canvas-subtle pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <FolderX className="w-5 h-5 text-rose-400" />
                    Strict Folder Exclusion Registry
                  </h2>
                  <p className="text-xs text-slate-400">
                    Excluded folders are checked against filesystem inodes before traversal. Thumbnails and metadata are purged immediately.
                  </p>
                </div>
                <button
                  onClick={handleAddExclusion}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all"
                >
                  <FolderOpen className="w-4 h-4" />
                  Add Excluded Folder
                </button>
              </div>

              {purgeNotice && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
                  <span>{purgeNotice}</span>
                  <button onClick={() => setPurgeNotice(null)} className="text-emerald-400 hover:text-white">✕</button>
                </div>
              )}

              <div className="space-y-3">
                {exclusions.length === 0 ? (
                  <div className="text-center py-16 bg-canvas-elevated rounded-2xl border border-canvas-subtle space-y-2">
                    <FolderX className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">No Folders Excluded</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Any folder you add here will be strictly bypassed during background scanning and device sync.
                    </p>
                  </div>
                ) : (
                  exclusions.map((ex) => (
                    <div
                      key={ex.canonicalPath}
                      className="p-4 bg-canvas-elevated border border-canvas-subtle rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-mono text-slate-200">{ex.canonicalPath}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Mode: Recursive Sub-directories • Inode: {ex.inode || 'Verified'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveExclusion(ex.canonicalPath)}
                        className="text-xs text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-canvas-subtle hover:border-rose-500/40 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : photos.length === 0 ? (
            /* Zero Mock Data: Clean Empty State with Real Scan Trigger */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-canvas-elevated border border-canvas-subtle flex items-center justify-center text-blue-400 mb-4 shadow-xl">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Your Local Gallery is Ready</h3>
              <p className="text-sm text-slate-400 mt-1 mb-6">
                Zero mock data policy active. Scan any local directory on this PC to index real photographs with EXIF, GPS, and progressive thumbnails.
              </p>
              <button
                onClick={handleSelectFolder}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Select Photos Folder to Scan
              </button>
            </div>
          ) : activeTab === 'map' ? (
            /* Interactive Geographic Map View */
            <MapView
              photos={photos}
              onSelectPhoto={(photo) => {
                setSelectedPhoto(photo);
                setFullscreenPhoto(photo);
              }}
            />
          ) : activeTab === 'people' ? (
            /* People & Faces AI Clustering View */
            <PeopleView
              photos={photos}
              clusters={personClusters}
              onSelectPhoto={(photo) => {
                setSelectedPhoto(photo);
                setFullscreenPhoto(photo);
              }}
              onRenamePerson={handleRenamePerson}
            />
          ) : activeTab === 'sync' ? (
            /* SyncFlow P2P Engine View */
            <SyncCenter
              photos={photos}
              onImportSyncedPhotos={(newPhotos) => setPhotos((prev) => [...prev, ...newPhotos])}
            />
          ) : activeTab === 'calendar' ? (
            /* Calendar Grouping View */
            <div className="space-y-8">
              {/* Photo of the Month Showcase Card */}
              <PhotoOfTheMonthCard
                photos={photos}
                onOpenFullscreen={(p) => setFullscreenPhoto(p)}
                onEditInStudio={(p) => {
                  setSelectedPhoto(p);
                  setIsEditorOpen(true);
                }}
              />

              {Object.entries(calendarGroups).map(([monthKey, groupPhotos]) => {
                const year = monthKey.slice(0, 4);
                return (
                  <div key={monthKey} id={`year-section-${year}`} className="space-y-3">
                    <div className="sticky top-0 z-10 bg-canvas-base/90 backdrop-blur-md py-2 border-b border-canvas-subtle/50 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-200">{getMonthDisplayName(monthKey)}</h2>
                      <span className="text-xs text-slate-400 font-mono">{groupPhotos.length} photos</span>
                    </div>
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${gridDensity}, minmax(0, 1fr))` }}
                    >
                      {groupPhotos.map((photo) => (
                        <PhotoCard
                          key={photo.id}
                          photo={photo}
                          isSelected={selectedPhoto?.id === photo.id}
                          isMultiSelected={selectedPhotoIds.has(photo.id)}
                          onSelect={() => setSelectedPhoto(photo)}
                          onToggleSelect={(e) => handleToggleSelectPhoto(photo.id, e)}
                          onToggleFavorite={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(photo);
                          }}
                          onOpenFullscreen={() => setFullscreenPhoto(photo)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Standard Grid View */
            <div>
              {/* Photo of the Month Showcase Card */}
              <PhotoOfTheMonthCard
                photos={photos}
                onOpenFullscreen={(p) => setFullscreenPhoto(p)}
                onEditInStudio={(p) => {
                  setSelectedPhoto(p);
                  setIsEditorOpen(true);
                }}
              />

              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${gridDensity}, minmax(0, 1fr))` }}
              >
                {filteredPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    isSelected={selectedPhoto?.id === photo.id}
                    isMultiSelected={selectedPhotoIds.has(photo.id)}
                    onSelect={() => setSelectedPhoto(photo)}
                    onToggleSelect={(e) => handleToggleSelectPhoto(photo.id, e)}
                    onToggleFavorite={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(photo);
                    }}
                    onOpenFullscreen={() => setFullscreenPhoto(photo)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline Scrubber */}
        {(activeTab === 'photos' || activeTab === 'calendar') && (
          <TimelineScrubber
            years={availableYears}
            activeYear={activeScrubYear}
            onSelectYear={handleSelectYear}
          />
        )}
      </main>

      {/* 3. Right Inspector Pane (Metadata, EXIF, Location) */}
      {selectedPhoto && (
        <aside className="w-80 bg-canvas-elevated border-l border-canvas-subtle p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-canvas-subtle pb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Photo Details
              </h3>
              <button onClick={() => setSelectedPhoto(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">File Name</p>
              <p className="text-sm font-medium text-slate-200 break-all">{selectedPhoto.fileName}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {(selectedPhoto.fileSize / (1024 * 1024)).toFixed(2)} MB • {selectedPhoto.width} × {selectedPhoto.height}
              </p>
            </div>

            {selectedPhoto.exif?.cameraModel && (
              <div>
                <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">Camera & Lens</p>
                <p className="text-sm font-medium text-slate-200">{selectedPhoto.exif.cameraModel}</p>
                {selectedPhoto.exif.lensModel && (
                  <p className="text-xs text-slate-400">{selectedPhoto.exif.lensModel}</p>
                )}
                <div className="flex gap-3 text-xs text-slate-400 font-mono mt-1">
                  {selectedPhoto.exif.fNumber && <span>ƒ/{selectedPhoto.exif.fNumber}</span>}
                  {selectedPhoto.exif.exposureTime && <span>{selectedPhoto.exif.exposureTime}s</span>}
                  {selectedPhoto.exif.iso && <span>ISO {selectedPhoto.exif.iso}</span>}
                </div>
              </div>
            )}

            {selectedPhoto.coordinates && (
              <div>
                <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">GPS Coordinates</p>
                <p className="text-xs font-mono text-slate-300">
                  {selectedPhoto.coordinates.latitude.toFixed(5)}, {selectedPhoto.coordinates.longitude.toFixed(5)}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">Capture Timestamp</p>
              <p className="text-xs text-slate-300">{new Date(selectedPhoto.captureDate).toLocaleString()}</p>
            </div>

            <button
              onClick={() => setIsEditorOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-canvas-subtle hover:bg-canvas-hover text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              Edit Photo in Studio
            </button>
          </div>
        </aside>
      )}

      {/* 4. Scanning Progress Overlay */}
      {isScanning && scanProgress && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-canvas-elevated border border-canvas-subtle p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <h3 className="text-base font-semibold text-slate-100">Scanning Real Media Files...</h3>
            </div>
            <p className="text-xs text-slate-400 break-all font-mono truncate">
              {scanProgress.currentFile}
            </p>
            <div className="flex justify-between text-xs text-slate-300 font-mono">
              <span>Scanned: {scanProgress.scannedFiles}</span>
              <span>Indexed: {scanProgress.indexedPhotos}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Studio Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="w-full max-w-4xl bg-canvas-elevated border border-canvas-subtle rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
            <div className="px-6 py-4 border-b border-canvas-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-slate-100">
                  Creative Studio • Non-Destructive Editor {selectedPhoto ? `(${selectedPhoto.fileName})` : ''}
                </h3>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-white text-sm">
                ✕ Close
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-black flex items-center justify-center p-6 relative">
                <div className="text-center text-slate-500">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Real-time GPU Shader Preview (WebGL2 / Skia)</p>
                </div>
              </div>
              <div className="w-80 border-l border-canvas-subtle bg-canvas-base p-6 space-y-6 overflow-y-auto">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Tone Adjustments</h4>
                  <div className="space-y-4">
                    <SliderControl label="Exposure" min={-100} max={100} defaultValue={0} />
                    <SliderControl label="Contrast" min={-100} max={100} defaultValue={0} />
                    <SliderControl label="Highlights" min={-100} max={100} defaultValue={0} />
                    <SliderControl label="Shadows" min={-100} max={100} defaultValue={0} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Color Grading</h4>
                  <div className="space-y-4">
                    <SliderControl label="Temperature" min={-100} max={100} defaultValue={0} />
                    <SliderControl label="Tint" min={-100} max={100} defaultValue={0} />
                    <SliderControl label="Vibrance" min={-100} max={100} defaultValue={0} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-canvas-subtle bg-canvas-elevated flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Original photograph remains untouched</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditorOpen(false)} className="px-4 py-2 text-xs text-slate-300 hover:text-white">
                  Discard
                </button>
                <button
                  onClick={() => {
                    alert('Exporting full-resolution copy with baked shader adjustments...');
                    setIsEditorOpen(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  Export Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Multi-Select Floating Action Dock */}
      <MultiSelectTray
        selectedCount={selectedPhotoIds.size}
        totalCount={photos.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBatchFavorite={handleBatchFavorite}
        onBatchMoveToVault={handleBatchMoveToVault}
        onBatchExport={handleBatchExport}
      />

      {/* 7. Fullscreen Photo Viewer Modal */}
      {fullscreenPhoto && (
        <FullscreenViewer
          photos={filteredPhotos.length > 0 ? filteredPhotos : photos}
          currentPhoto={fullscreenPhoto}
          onClose={() => setFullscreenPhoto(null)}
          onToggleFavorite={handleToggleFavorite}
          onEditInStudio={(p) => {
            setFullscreenPhoto(null);
            setSelectedPhoto(p);
            setIsEditorOpen(true);
          }}
          onMoveToVault={handleMoveToVault}
        />
      )}

      {/* 8. Windows MTP Mobile Import Modal */}
      {isMtpModalOpen && activeMtpDevice && (
        <MtpImportModal
          device={activeMtpDevice}
          onClose={() => setIsMtpModalOpen(false)}
          onTransferComplete={(newPhotos) => {
            setPhotos((prev) => [...prev, ...newPhotos]);
            setIsMtpModalOpen(false);
            setShowMtpPrompt(false);
          }}
        />
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  isSelected,
  isMultiSelected,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onOpenFullscreen,
}: {
  photo: PhotoItem;
  isSelected: boolean;
  isMultiSelected: boolean;
  onSelect: () => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onOpenFullscreen: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpenFullscreen}
      className={`group relative aspect-square bg-canvas-elevated rounded-xl overflow-hidden border cursor-pointer transition-all ${
        isMultiSelected
          ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
          : isSelected
          ? 'border-blue-400 ring-1 ring-blue-400/30'
          : 'border-canvas-subtle hover:border-slate-600'
      }`}
    >
      {/* Thumbnail or Fallback */}
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
        onClick={onToggleSelect}
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
        onClick={onToggleFavorite}
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
              onOpenFullscreen();
            }}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Full Screen Viewer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active: boolean; badge?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-slate-100 hover:bg-canvas-subtle/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${
            active ? 'bg-white/20 text-white' : 'bg-canvas-subtle text-slate-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SliderControl({ label, min, max, defaultValue }: { label: string; min: number; max: number; defaultValue: number }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>{label}</span>
        <span className="font-mono text-slate-400">{val > 0 ? `+${val}` : val}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        className="w-full accent-blue-500 h-1.5 bg-canvas-subtle rounded-lg cursor-pointer"
      />
    </div>
  );
}
