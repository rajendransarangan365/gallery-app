/**
 * @gallery/sync-engine - Type Definitions
 */

import type { SyncSessionState, SyncManifestItem } from '@gallery/shared';

export interface SyncPeerDescriptor {
  id: string;
  name: string;
  deviceType: 'android' | 'windows' | 'mac' | 'linux';
  address: string;
  port: number;
  lastSeen: number;
  isPaired: boolean;
}

export interface PairingInvitation {
  sessionId: string;
  hostName: string;
  pin: string;
  qrPayload: string;
  port: number;
  expiresAt: number;
}

export interface SyncManifestComparison {
  localMissingItems: SyncManifestItem[];
  remoteMissingItems: SyncManifestItem[];
  commonCount: number;
}
