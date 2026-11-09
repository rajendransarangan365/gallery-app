/**
 * apps/windows/src/main/sync-server.ts
 * Real Live SyncFlow HTTP & P2P Server for Desktop-to-Mobile Synchronization
 * Listens on port 41236, accepts paired connections, compares manifests, and ingests real files.
 */
import type { BrowserWindow } from 'electron';
import { ExclusionManager } from '@gallery/security';
import type { PhotoItem } from '@gallery/shared';
export interface SyncServerConfig {
    port?: number;
    syncDirectory?: string;
    exclusionManager: ExclusionManager;
}
export declare class DesktopSyncServer {
    private readonly config;
    private readonly getMainWindow;
    private readonly getLibraryPhotos;
    private server;
    private port;
    private currentPin;
    private trustedDevices;
    private syncDirectory;
    private discoveryManager;
    private thumbnailCache;
    constructor(config: SyncServerConfig, getMainWindow: () => BrowserWindow | null, getLibraryPhotos: () => PhotoItem[]);
    regeneratePin(): string;
    getAllIPs(): Array<{
        name: string;
        address: string;
        isWifi: boolean;
        isRecommended: boolean;
    }>;
    getLocalIP(): string;
    getStatus(): {
        status: string;
        deviceName: string;
        platform: string;
        ip: string;
        availableIps: {
            name: string;
            address: string;
            isWifi: boolean;
            isRecommended: boolean;
        }[];
        port: number;
        pin: string;
        syncDirectory: string;
        trustedCount: number;
    };
    start(): Promise<void>;
    private startBeacon;
    stop(): void;
    private readJsonBody;
}
//# sourceMappingURL=sync-server.d.ts.map