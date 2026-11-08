/**
 * @gallery/sync-engine - DiscoveryManager
 * Local network peer announcement and discovery via UDP broadcast and mDNS protocol.
 */

import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import type { SyncPeerDescriptor } from './types.js';

export const SYNC_BROADCAST_PORT = 41235;
export const SYNC_BEACON_MAGIC = 'GALLERY_P2P_BEACON_V1';

export interface DiscoveryOptions {
  deviceId: string;
  deviceName: string;
  deviceType: 'windows' | 'android';
  tcpSyncPort: number;
}

export class DiscoveryManager extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private isAnnouncing = false;
  private announceInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private peers = new Map<string, SyncPeerDescriptor>();

  constructor(private readonly options: DiscoveryOptions) {
    super();
  }

  /**
   * Starts local broadcast beacon and listening on UDP port.
   */
  public async start(): Promise<void> {
    if (this.socket) return;

    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        this.emit('error', err);
      });

      this.socket.on('message', (msg, rinfo) => {
        this.handleIncomingBeacon(msg, rinfo.address);
      });

      this.socket.bind(SYNC_BROADCAST_PORT, () => {
        try {
          this.socket?.setBroadcast(true);
        } catch {
          // Some network interfaces may block setting broadcast, ignore
        }

        this.startAnnouncing();
        this.startPeerCleanup();
        resolve();
      });
    });
  }

  /**
   * Stops broadcast beacon and closes UDP socket.
   */
  public stop(): void {
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore close error
      }
      this.socket = null;
    }
    this.peers.clear();
  }

  public getActivePeers(): SyncPeerDescriptor[] {
    return Array.from(this.peers.values());
  }

  private startAnnouncing(): void {
    const beaconPayload = JSON.stringify({
      magic: SYNC_BEACON_MAGIC,
      deviceId: this.options.deviceId,
      name: this.options.deviceName,
      type: this.options.deviceType,
      port: this.options.tcpSyncPort,
    });

    const buffer = Buffer.from(beaconPayload);

    const sendBeacon = () => {
      if (!this.socket) return;
      try {
        this.socket.send(buffer, 0, buffer.length, SYNC_BROADCAST_PORT, '255.255.255.255');
      } catch {
        // Broadcast error on inactive network adapter
      }
    };

    sendBeacon();
    this.announceInterval = setInterval(sendBeacon, 3000);
    this.announceInterval.unref();
  }

  private handleIncomingBeacon(buffer: Buffer, senderAddress: string): void {
    try {
      const data = JSON.parse(buffer.toString('utf-8'));
      if (data.magic !== SYNC_BEACON_MAGIC) return;
      if (data.deviceId === this.options.deviceId) return; // Ignore own beacon

      const peer: SyncPeerDescriptor = {
        id: data.deviceId,
        name: data.name || 'Nearby Device',
        deviceType: data.type || 'android',
        address: senderAddress,
        port: Number(data.port) || 41236,
        lastSeen: Date.now(),
        isPaired: false,
      };

      const isNew = !this.peers.has(peer.id);
      this.peers.set(peer.id, peer);

      if (isNew) {
        this.emit('peerFound', peer);
      } else {
        this.emit('peerUpdated', peer);
      }
    } catch {
      // Ignore malformed packets
    }
  }

  private startPeerCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, peer] of this.peers.entries()) {
        if (now - peer.lastSeen > 10000) {
          // Expire after 10s of no beacon
          this.peers.delete(id);
          this.emit('peerLost', peer);
        }
      }
    }, 5000);
    this.cleanupInterval.unref();
  }
}

