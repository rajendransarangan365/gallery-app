/**
 * @gallery/shared - SyncFlow Synchronization Protocol Types
 */

export type DeviceType = 'android' | 'windows' | 'mac' | 'linux';
export type ConnectionMode = 'usb_mtp' | 'wifi_lan' | 'hotspot';
export type SyncStatus = 'idle' | 'discovering' | 'pairing' | 'scanning' | 'transferring' | 'verifying' | 'completed' | 'paused' | 'error';

export interface DeviceDescriptor {
  id: string;                  // Unique device UUID
  name: string;                // e.g. "Galaxy S24 Ultra", "ThinkPad X1"
  type: DeviceType;
  platformVersion: string;
  ipAddress?: string;
  port?: number;
  lastSeen: string;
  isTrusted: boolean;
}

export interface SyncManifestItem {
  contentHash: string;
  fileName: string;
  fileSize: number;
  captureDate: string;
  modifiedDate: string;
  relativeSyncPath: string;
}

export interface SyncSessionState {
  sessionId: string;
  targetDevice: DeviceDescriptor;
  connectionMode: ConnectionMode;
  status: SyncStatus;
  totalFiles: number;
  transferredFiles: number;
  totalBytes: number;
  transferredBytes: number;
  currentFileName?: string;
  speedBytesPerSec: number;
  estimatedRemainingSec: number;
  errorMessage?: string;
}

export interface MtpNewPhotosPrompt {
  deviceId: string;
  deviceName: string;
  newPhotosCount: number;
  newVideosCount: number;
  totalSizeBytes: number;
  candidateItems: SyncManifestItem[];
}

