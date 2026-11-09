import type { PhotoItem } from '@gallery/shared';
import type { IndexerProgress, MtpDevice, MtpPhotoCandidate, MtpTransferProgress } from '@gallery/photo-engine';
import type { SyncPeerDescriptor } from '@gallery/sync-engine';

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  scanDirectory: (path: string) => Promise<PhotoItem[]>;
  onScanProgress: (callback: (progress: IndexerProgress) => void) => () => void;
  // Vault APIs
  vaultIsConfigured: () => Promise<boolean>;
  vaultSetup: (pin: string) => Promise<boolean>;
  vaultUnlock: (pin: string) => Promise<boolean>;
  vaultLock: () => Promise<boolean>;
  vaultList: () => Promise<any[]>;
  vaultImport: (filePath: string) => Promise<any>;
  vaultExport: (itemId: string, destDir: string) => Promise<string>;
  // Exclusion APIs
  exclusionsList: () => Promise<any[]>;
  exclusionsAdd: (folderPath: string) => Promise<any>;
  exclusionsRemove: (folderPath: string) => Promise<boolean>;
  // Windows MTP APIs
  mtpDetectDevices: () => Promise<MtpDevice[]>;
  mtpScanDevicePhotos: (devicePath: string) => Promise<MtpPhotoCandidate[]>;
  mtpTransferPhotos: (
    candidates: MtpPhotoCandidate[],
    destinationDir: string
  ) => Promise<{ transferredPhotos: PhotoItem[]; skippedCount: number; failedCount: number }>;
  onMtpProgress: (callback: (progress: MtpTransferProgress) => void) => () => void;
  // SyncFlow Real Server APIs
  syncGetStatus: () => Promise<{
    status: string;
    deviceName: string;
    platform: string;
    ip: string;
    port: number;
    pin: string;
    syncDirectory: string;
    trustedCount: number;
  }>;
  syncRegeneratePin: () => Promise<string>;
  syncRegisterPhotos: (photos: PhotoItem[]) => Promise<boolean>;
  onSyncFileReceived?: (callback: (data: { photo: PhotoItem; fileName: string; fileSize: number }) => void) => () => void;
  onSyncPeerFound?: (callback: (peer: SyncPeerDescriptor) => void) => () => void;
  onSyncPeerPaired?: (callback: (peer: any) => void) => () => void;
  // REA Reverse Engineering APIs
  reaOpenFile?: () => Promise<string | null>;
  reaInspectFile?: (filePath: string) => Promise<any>;
  reaExtractAssets?: (archivePath: string, destinationDir?: string) => Promise<{ extractedPaths: string[]; outputDirectory: string }>;
  reaRunCli?: (command: string, args: string[]) => Promise<{ exitCode: number }>;
  onReaCliOutput?: (callback: (chunk: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

