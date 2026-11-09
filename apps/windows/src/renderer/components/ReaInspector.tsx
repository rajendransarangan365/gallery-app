import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  FileCode,
  Image as ImageIcon,
  Terminal,
  ShieldCheck,
  Download,
  FolderOpen,
  RefreshCw,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Database,
  Box,
  Binary,
  ArrowRight,
  ExternalLink,
  Search,
  Copy,
  Sparkles,
  Zap
} from 'lucide-react';

interface ExtractedMediaItem {
  id: string;
  name: string;
  pathInArchive: string;
  sizeBytes: number;
  compressedSize: number;
  mimeType: string;
  dataUri?: string;
}

interface ApkResult {
  kind: 'apk';
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  packageName: string;
  versionCode: string;
  versionName: string;
  minSdkVersion: string;
  targetSdkVersion: string;
  permissions: string[];
  activities: string[];
  services: string[];
  dexFiles: string[];
  nativeArchitectures: string[];
  mediaAssets: ExtractedMediaItem[];
  totalFiles: number;
  uncompressedSizeBytes: number;
  compressionRatio: number;
}

interface SqliteResult {
  kind: 'sqlite';
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  pageSize: number;
  pageCount: number;
  freelistPages: number;
  walMode: boolean;
  tables: Array<{
    name: string;
    columns: string[];
    sql: string;
    hasMediaFields: boolean;
  }>;
  totalTables: number;
}

interface BinaryResult {
  kind: 'binary';
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  architecture: string;
  subsystem: string;
  timestamp: string;
  sections: Array<{
    name: string;
    virtualSize: number;
    rawSize: number;
    characteristics: string;
  }>;
  hasEmbeddedResources: boolean;
}

type InspectionResult = ApkResult | SqliteResult | BinaryResult;

export function ReaInspector() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'manifest' | 'terminal'>('overview');
  const [isInspecting, setIsInspecting] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ExtractedMediaItem | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // REA Terminal states
  const [cliOutput, setCliOutput] = useState<string>('REA Terminal Ready. Choose a command or run analysis.\n');
  const [cliCommand, setCliCommand] = useState<string>('analyze');
  const [isCliRunning, setIsCliRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!window.electronAPI?.onReaCliOutput) return;
    const unsub = window.electronAPI.onReaCliOutput((chunk) => {
      setCliOutput((prev) => prev + chunk);
    });
    return () => unsub?.();
  }, []);

  const handleSelectFile = async () => {
    if (!window.electronAPI?.reaOpenFile) return;
    try {
      const file = await window.electronAPI.reaOpenFile();
      if (file) {
        setTargetPath(file);
        inspectTarget(file);
      }
    } catch (err: any) {
      console.error('Failed to open target:', err);
    }
  };

  const inspectTarget = async (path: string) => {
    if (!window.electronAPI?.reaInspectFile) return;
    setIsInspecting(true);
    setExportNotice(null);
    try {
      const data = await window.electronAPI.reaInspectFile(path);
      setResult(data);
    } catch (err: any) {
      console.error('Inspection failed:', err);
      setCliOutput((prev) => prev + `[Inspection Failed]: ${err.message}\n`);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleExtractAll = async () => {
    if (!targetPath || !window.electronAPI?.reaExtractAssets) return;
    try {
      const res = await window.electronAPI.reaExtractAssets(targetPath);
      setExportNotice(`Successfully extracted ${res.extractedPaths.length} media assets into: ${res.outputDirectory}`);
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err: any) {
      setExportNotice(`Extraction error: ${err.message}`);
    }
  };

  const handleRunReaCli = async (cmd: string, args: string[] = []) => {
    if (!window.electronAPI?.reaRunCli) return;
    setIsCliRunning(true);
    setCliOutput((prev) => prev + `\n$ rea ${cmd} ${args.join(' ')}\n`);
    try {
      const res = await window.electronAPI.reaRunCli(cmd, args);
      setCliOutput((prev) => prev + `\n[Exited with code ${res.exitCode}]\n`);
    } catch (err: any) {
      setCliOutput((prev) => prev + `\n[Error]: ${err.message}\n`);
    } finally {
      setIsCliRunning(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] text-[#F8FAFC] overflow-y-auto">
      {/* OriginOS Dynamic Header Banner */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#141820]/90 via-[#182030]/80 to-[#141820]/90 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6] via-[#06B6D4] to-[#8B5CF6] p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0A0C10] rounded-[14px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#06B6D4]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Reverse Engineer Anything (REA)</h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
                  v4.0.1
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Zero Leakage
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze Android APKs, SQLite databases, and Windows binaries down to byte layout, assets, and permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectFile}
              disabled={isInspecting}
              className="flex items-center space-x-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {isInspecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting Target...</span>
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  <span>Select Target File</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* Target Selector Bar / Dropzone */}
      <div className="p-6 pb-2">
        {!result && (
          <div
            onClick={handleSelectFile}
            className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-2xl p-10 text-center bg-[#141820]/40 hover:bg-[#141820]/70 transition cursor-pointer group"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 group-hover:bg-cyan-500/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition">
              <Box className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition">
              Drag & Drop Target APK, SQLite DB, or Binary here
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
              Supports Android Packages (<code className="text-cyan-400">.apk</code>), SQLite Databases (
              <code className="text-cyan-400">.db, .sqlite</code>), Windows Binaries (
              <code className="text-cyan-400">.exe, .dll</code>), and Electron ASAR bundles.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>APK Metadata & Assets</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>SQLite Schema & Media</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>PE Headers & Sections</span>
              </span>
            </div>
          </div>
        )}

        {/* Active Inspection Bar */}
        {result && (
          <div className="flex items-center justify-between p-4 bg-[#141820] border border-white/10 rounded-2xl mb-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                {result.kind === 'apk' ? <Box className="w-5 h-5" /> : result.kind === 'sqlite' ? <Database className="w-5 h-5" /> : <Binary className="w-5 h-5 text-indigo-400" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-white">{result.fileName}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                    {formatBytes(result.fileSizeBytes)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider bg-cyan-500/20 text-cyan-300">
                    {result.kind}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-xl mt-0.5">
                  {result.filePath}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {result.kind === 'apk' && result.mediaAssets.length > 0 && (
                <button
                  onClick={handleExtractAll}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Extract {result.mediaAssets.length} Assets</span>
                </button>
              )}
              <button
                onClick={handleSelectFile}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs rounded-lg transition"
              >
                Change Target
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      {result && (
        <div className="px-6 flex border-b border-white/5 space-x-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture & Identity</span>
          </button>

          {result.kind === 'apk' && (
            <button
              onClick={() => setActiveTab('assets')}
              className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'assets'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Embedded Media Assets ({result.mediaAssets.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('manifest')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'manifest'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>{result.kind === 'apk' ? 'Manifest & Permissions' : result.kind === 'sqlite' ? 'Schema Tables' : 'PE Sections'}</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'terminal'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>REA Agent CLI Console</span>
          </button>
        </div>
      )}

      {/* Tab 1: Overview & Architecture */}
      {result && activeTab === 'overview' && (
        <div className="p-6 space-y-6">
          {result.kind === 'apk' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Package Identifier</span>
                <p className="text-sm font-bold text-white mt-1 font-mono break-all">{result.packageName}</p>
                <div className="mt-2 text-[11px] text-cyan-400 font-medium">v{result.versionName} (Build {result.versionCode})</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Target SDK Compatibility</span>
                <p className="text-sm font-bold text-white mt-1">{result.targetSdkVersion}</p>
                <div className="mt-2 text-[11px] text-slate-400">Min SDK: {result.minSdkVersion}</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Archive Compression</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">{result.compressionRatio}% Space Saved</p>
                <div className="mt-2 text-[11px] text-slate-400">{formatBytes(result.uncompressedSizeBytes)} uncompressed</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Binary DEX & JNI Count</span>
                <p className="text-sm font-bold text-white mt-1">{result.dexFiles.length} DEX Classes</p>
                <div className="mt-2 text-[11px] text-indigo-400">
                  {result.nativeArchitectures.length > 0 ? result.nativeArchitectures.join(', ') : 'Pure Java/Kotlin'}
                </div>
              </div>
            </div>
          )}

          {result.kind === 'sqlite' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Page Size</span>
                <p className="text-sm font-bold text-white mt-1 font-mono">{result.pageSize} Bytes</p>
                <div className="mt-2 text-[11px] text-cyan-400 font-medium">B-Tree Layout</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Total Database Pages</span>
                <p className="text-sm font-bold text-white mt-1 font-mono">{result.pageCount} Pages</p>
                <div className="mt-2 text-[11px] text-slate-400">{result.freelistPages} Free Pages</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">WAL Journal Mode</span>
                <p className={`text-sm font-bold mt-1 ${result.walMode ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {result.walMode ? 'Active Write-Ahead Log' : 'Standard Rollback Journal'}
                </p>
                <div className="mt-2 text-[11px] text-slate-400">Concurrency Safe</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Database Tables</span>
                <p className="text-sm font-bold text-white mt-1">{result.totalTables} Discovered Tables</p>
                <div className="mt-2 text-[11px] text-indigo-400">
                  {result.tables.filter((t) => t.hasMediaFields).length} Media/Photo Tables
                </div>
              </div>
            </div>
          )}

          {result.kind === 'binary' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Target Architecture</span>
                <p className="text-sm font-bold text-white mt-1 font-mono">{result.architecture}</p>
                <div className="mt-2 text-[11px] text-cyan-400 font-medium">{result.subsystem}</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Compilation Timestamp</span>
                <p className="text-sm font-bold text-white mt-1 font-mono text-xs">{result.timestamp}</p>
                <div className="mt-2 text-[11px] text-slate-400">PE Header Stamp</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">PE Section Count</span>
                <p className="text-sm font-bold text-white mt-1">{result.sections.length} Sections</p>
                <div className="mt-2 text-[11px] text-slate-400">.text, .rdata, .rsrc</div>
              </div>

              <div className="p-4 bg-[#141820] border border-white/5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Embedded Resources</span>
                <p className={`text-sm font-bold mt-1 ${result.hasEmbeddedResources ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {result.hasEmbeddedResources ? 'Icons & Assets Present' : 'No .rsrc section'}
                </p>
                <div className="mt-2 text-[11px] text-indigo-400">Windows Portable Executable</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Embedded Media Assets */}
      {result && result.kind === 'apk' && activeTab === 'assets' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Discovered Graphic & Media Assets</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {result.mediaAssets.length} Files
              </span>
            </h2>

            <button
              onClick={handleExtractAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All to Gallery Library</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {result.mediaAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="group relative bg-[#141820] border border-white/5 hover:border-cyan-500/40 rounded-xl overflow-hidden cursor-pointer transition p-2 flex flex-col justify-between"
              >
                <div className="w-full aspect-square bg-[#0A0C10] rounded-lg overflow-hidden flex items-center justify-center relative">
                  {asset.dataUri ? (
                    <img
                      src={asset.dataUri}
                      alt={asset.name}
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[9px] mt-1 uppercase">{asset.mimeType.split('/')[1]}</span>
                    </div>
                  )}

                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-mono text-slate-300">
                    {formatBytes(asset.sizeBytes)}
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-[11px] font-medium text-slate-200 truncate group-hover:text-cyan-300 transition">
                    {asset.name}
                  </p>
                  <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
                    {asset.pathInArchive}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {result.mediaAssets.length === 0 && (
            <div className="p-12 text-center text-slate-500 bg-[#141820]/30 rounded-2xl border border-white/5">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">No raw image or video files detected in this target archive.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Manifest / Schema / Sections */}
      {result && activeTab === 'manifest' && (
        <div className="p-6 space-y-6">
          {result.kind === 'apk' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Declared Permissions ({result.permissions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.permissions.map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#141820] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-300 truncate">{perm}</span>
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-slate-400">Standard</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-cyan-400" /> Declared Activities & Services ({result.activities.length + result.services.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.activities.map((act, idx) => (
                    <div
                      key={`act-${idx}`}
                      className="p-2.5 bg-[#141820] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-300 truncate">{act}</span>
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-cyan-500/10 text-cyan-400">Activity</span>
                    </div>
                  ))}
                  {result.services.map((srv, idx) => (
                    <div
                      key={`srv-${idx}`}
                      className="p-2.5 bg-[#141820] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-300 truncate">{srv}</span>
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-indigo-500/10 text-indigo-400">Service</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.kind === 'sqlite' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" /> SQLite Tables & Definitions ({result.tables.length})
              </h3>
              <div className="space-y-3">
                {result.tables.map((t, idx) => (
                  <div key={idx} className="p-4 bg-[#141820] border border-white/5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
                        <span>{t.name}</span>
                        {t.hasMediaFields && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Media Table
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.columns.map((c, cIdx) => (
                        <span key={cIdx} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] font-mono text-slate-300">
                          {c}
                        </span>
                      ))}
                    </div>
                    <pre className="text-[10px] font-mono text-slate-400 bg-[#0A0C10] p-2.5 rounded-lg overflow-x-auto">
                      {t.sql}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.kind === 'binary' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-cyan-400" /> PE Binary Sections Layout ({result.sections.length})
              </h3>
              <div className="space-y-2">
                {result.sections.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#141820] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono"
                  >
                    <span className="font-bold text-cyan-400">{s.name}</span>
                    <span className="text-slate-400">Virtual Size: {formatBytes(s.virtualSize)}</span>
                    <span className="text-slate-400">Raw Size: {formatBytes(s.rawSize)}</span>
                    <span className="text-slate-500 text-[10px]">{s.characteristics}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Interactive REA Agent CLI Console */}
      {activeTab === 'terminal' && (
        <div className="p-6 space-y-4 flex-1 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141820] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">Quick Commands:</span>
              <button
                onClick={() => handleRunReaCli('doctor')}
                disabled={isCliRunning}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20 text-xs rounded-lg transition disabled:opacity-50"
              >
                rea doctor
              </button>
              <button
                onClick={() => handleRunReaCli('capabilities')}
                disabled={isCliRunning}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-lg transition disabled:opacity-50"
              >
                rea capabilities
              </button>
              {targetPath && (
                <button
                  onClick={() => handleRunReaCli('analyze', [targetPath])}
                  disabled={isCliRunning}
                  className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs rounded-lg transition disabled:opacity-50"
                >
                  rea analyze target
                </button>
              )}
            </div>

            <button
              onClick={() => setCliOutput('')}
              className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
            >
              Clear Log
            </button>
          </div>

          {/* Terminal Screen */}
          <div className="flex-1 bg-[#050608] border border-white/10 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-y-auto min-h-[300px] shadow-2xl relative">
            <pre className="whitespace-pre-wrap leading-relaxed">{cliOutput}</pre>
            {isCliRunning && (
              <div className="flex items-center space-x-2 text-cyan-400 mt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px]">Executing command with local REA engine...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset Preview Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#141820] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm truncate">{selectedAsset.name}</h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-white/5 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="w-full aspect-video bg-[#0A0C10] rounded-xl overflow-hidden flex items-center justify-center p-2">
              {selectedAsset.dataUri ? (
                <img src={selectedAsset.dataUri} alt={selectedAsset.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <ImageIcon className="w-12 h-12 text-slate-600" />
              )}
            </div>

            <div className="text-xs font-mono space-y-1 text-slate-400">
              <p>Path: <span className="text-slate-200">{selectedAsset.pathInArchive}</span></p>
              <p>Size: <span className="text-slate-200">{formatBytes(selectedAsset.sizeBytes)}</span></p>
              <p>MIME: <span className="text-slate-200">{selectedAsset.mimeType}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

