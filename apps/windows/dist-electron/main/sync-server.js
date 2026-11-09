/**
 * apps/windows/src/main/sync-server.ts
 * Real Live SyncFlow HTTP & P2P Server for Desktop-to-Mobile Synchronization
 * Listens on port 41236, accepts paired connections, compares manifests, and ingests real files.
 */
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ExifExtractor } from '@gallery/metadata-engine';
import { ThumbnailCacheManager } from '@gallery/photo-engine';
import { DiscoveryManager } from '@gallery/sync-engine';
export class DesktopSyncServer {
    config;
    getMainWindow;
    getLibraryPhotos;
    server = null;
    port = 41236;
    currentPin = '782419';
    trustedDevices = new Set();
    syncDirectory;
    discoveryManager = null;
    thumbnailCache = new ThumbnailCacheManager();
    constructor(config, getMainWindow, getLibraryPhotos) {
        this.config = config;
        this.getMainWindow = getMainWindow;
        this.getLibraryPhotos = getLibraryPhotos;
        this.port = config.port || 41236;
        this.syncDirectory =
            config.syncDirectory || path.join(os.homedir(), 'Pictures', 'PhotoGallery', 'Sync');
        this.regeneratePin();
    }
    regeneratePin() {
        this.currentPin = crypto.randomInt(100000, 999999).toString();
        return this.currentPin;
    }
    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }
    getStatus() {
        return {
            status: this.server ? 'online' : 'stopped',
            deviceName: os.hostname(),
            platform: 'windows',
            ip: this.getLocalIP(),
            port: this.port,
            pin: this.currentPin,
            syncDirectory: this.syncDirectory,
            trustedCount: this.trustedDevices.size,
        };
    }
    async start() {
        if (this.server)
            return;
        if (!fs.existsSync(this.syncDirectory)) {
            fs.mkdirSync(this.syncDirectory, { recursive: true });
        }
        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                // CORS headers for local LAN connections
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename, X-Content-Hash, X-Pin, X-Device-Id');
                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }
                const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
                try {
                    // 1. Status / Health Check
                    if (url.pathname === '/api/status' && req.method === 'GET') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(this.getStatus()));
                        return;
                    }
                    // 2. Device Pairing
                    if (url.pathname === '/api/pair' && req.method === 'POST') {
                        const body = await this.readJsonBody(req);
                        const submittedPin = body.pin;
                        const deviceId = body.deviceId || 'unknown_device';
                        if (submittedPin === this.currentPin) {
                            this.trustedDevices.add(deviceId);
                            const win = this.getMainWindow();
                            win?.webContents.send('sync:peerPaired', {
                                deviceId,
                                deviceName: body.deviceName || 'Nearby Device',
                                platform: body.platform || 'android',
                            });
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                token: crypto.randomUUID(),
                                deviceName: os.hostname(),
                            }));
                        }
                        else {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Incorrect pairing PIN.' }));
                        }
                        return;
                    }
                    // 3. Sync Manifest Exchange
                    if (url.pathname === '/api/sync/manifest' && req.method === 'POST') {
                        const body = await this.readJsonBody(req);
                        const remoteItems = body.items || [];
                        const localPhotos = this.getLibraryPhotos();
                        const localHashes = new Set(localPhotos.map((p) => p.contentHash));
                        const remoteHashes = new Set(remoteItems.map((p) => p.contentHash));
                        const localMissing = remoteItems.filter((item) => !localHashes.has(item.contentHash));
                        const remoteMissing = localPhotos.filter((p) => !remoteHashes.has(p.contentHash));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            localMissing,
                            remoteMissingCount: remoteMissing.length,
                        }));
                        return;
                    }
                    // 4. Ingest Uploaded Photo / Video Stream from Phone
                    if (url.pathname === '/api/sync/upload' && req.method === 'POST') {
                        const fileName = req.headers['x-filename'] || `sync_${Date.now()}.jpg`;
                        const expectedHash = req.headers['x-content-hash'] || '';
                        const tempFilePath = path.join(this.syncDirectory, `.tmp_${Date.now()}_${fileName}`);
                        const writeStream = fs.createWriteStream(tempFilePath);
                        const hasher = crypto.createHash('sha256');
                        let totalBytes = 0;
                        req.on('data', (chunk) => {
                            hasher.update(chunk);
                            totalBytes += chunk.length;
                        });
                        req.pipe(writeStream);
                        writeStream.on('finish', async () => {
                            try {
                                const actualHash = hasher.digest('hex');
                                const finalPath = path.join(this.syncDirectory, fileName);
                                if (fs.existsSync(finalPath)) {
                                    // File with same name exists, add suffix
                                    const ext = path.extname(fileName);
                                    const base = path.basename(fileName, ext);
                                    fs.renameSync(tempFilePath, path.join(this.syncDirectory, `${base}_${Date.now()}${ext}`));
                                }
                                else {
                                    fs.renameSync(tempFilePath, finalPath);
                                }
                                // Extract EXIF & progressive WebP thumbnail
                                let metadata = {
                                    fileName,
                                    fileSize: totalBytes,
                                    mimeType: fileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
                                    captureDate: new Date().toISOString(),
                                    modifiedDate: new Date().toISOString(),
                                };
                                try {
                                    metadata = await ExifExtractor.extract(finalPath);
                                }
                                catch {
                                    // Non-fatal if EXIF is absent or video
                                }
                                const thumbs = this.thumbnailCache.getThumbnailPaths(actualHash);
                                const newPhoto = {
                                    id: crypto.randomUUID(),
                                    contentHash: actualHash,
                                    fileUri: finalPath,
                                    fileName: metadata.fileName || fileName,
                                    fileSize: metadata.fileSize || totalBytes,
                                    mimeType: metadata.mimeType || 'image/jpeg',
                                    width: metadata.width || 0,
                                    height: metadata.height || 0,
                                    captureDate: metadata.captureDate || new Date().toISOString(),
                                    importedDate: new Date().toISOString(),
                                    modifiedDate: metadata.modifiedDate || new Date().toISOString(),
                                    isFavorite: false,
                                    isDeleted: false,
                                    coordinates: metadata.coordinates,
                                    exif: metadata.exif,
                                    thumbnailPath: thumbs.gridThumbnail,
                                    previewPath: thumbs.previewThumbnail,
                                    syncState: 'synced',
                                };
                                const win = this.getMainWindow();
                                win?.webContents.send('sync:fileReceived', {
                                    photo: newPhoto,
                                    fileName,
                                    fileSize: totalBytes,
                                });
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true, hash: actualHash }));
                            }
                            catch (err) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, error: err.message }));
                            }
                        });
                        writeStream.on('error', (err) => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: err.message }));
                        });
                        return;
                    }
                    // 5. Download Photo from Desktop by Hash
                    if (url.pathname.startsWith('/api/sync/download/') && req.method === 'GET') {
                        const hash = url.pathname.replace('/api/sync/download/', '');
                        const photo = this.getLibraryPhotos().find((p) => p.contentHash === hash);
                        if (photo && fs.existsSync(photo.fileUri)) {
                            const stat = fs.statSync(photo.fileUri);
                            res.writeHead(200, {
                                'Content-Type': photo.mimeType || 'application/octet-stream',
                                'Content-Length': stat.size,
                                'X-Filename': photo.fileName,
                            });
                            fs.createReadStream(photo.fileUri).pipe(res);
                        }
                        else {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Photo not found on desktop.' }));
                        }
                        return;
                    }
                    // Fallback 404
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Endpoint not found.' }));
                }
                catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            this.server.listen(this.port, '0.0.0.0', () => {
                console.log(`[SyncServer] Listening on http://0.0.0.0:${this.port}`);
                this.startBeacon();
                resolve();
            });
            this.server.on('error', (err) => {
                console.error('[SyncServer] Server error:', err);
                reject(err);
            });
        });
    }
    startBeacon() {
        try {
            this.discoveryManager = new DiscoveryManager({
                deviceId: `win-${os.hostname()}`,
                deviceName: `${os.hostname()} (Windows)`,
                deviceType: 'windows',
                tcpSyncPort: this.port,
            });
            this.discoveryManager.on('peerFound', (peer) => {
                const win = this.getMainWindow();
                win?.webContents.send('sync:peerFound', peer);
            });
            this.discoveryManager.start().catch(() => { });
        }
        catch {
            // Beacon failure non-fatal
        }
    }
    stop() {
        if (this.discoveryManager) {
            this.discoveryManager.stop();
            this.discoveryManager = null;
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
    readJsonBody(req) {
        return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
                data += chunk;
            });
            req.on('end', () => {
                try {
                    resolve(data ? JSON.parse(data) : {});
                }
                catch (e) {
                    reject(e);
                }
            });
            req.on('error', reject);
        });
    }
}
//# sourceMappingURL=sync-server.js.map