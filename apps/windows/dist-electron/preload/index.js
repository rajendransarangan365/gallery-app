/**
 * apps/windows/src/preload/index.ts
 * Electron Preload Script - Secure Context Bridge
 */
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    scanDirectory: (path) => ipcRenderer.invoke('scanner:scanDirectory', path),
    onScanProgress: (callback) => {
        const handler = (_event, progress) => callback(progress);
        ipcRenderer.on('scanner:progress', handler);
        return () => ipcRenderer.removeListener('scanner:progress', handler);
    },
    // Vault APIs
    vaultIsConfigured: () => ipcRenderer.invoke('vault:isConfigured'),
    vaultSetup: (pin) => ipcRenderer.invoke('vault:setup', pin),
    vaultUnlock: (pin) => ipcRenderer.invoke('vault:unlock', pin),
    vaultLock: () => ipcRenderer.invoke('vault:lock'),
    vaultList: () => ipcRenderer.invoke('vault:list'),
    vaultImport: (filePath) => ipcRenderer.invoke('vault:import', filePath),
    vaultExport: (itemId, destDir) => ipcRenderer.invoke('vault:export', itemId, destDir),
    // Exclusion APIs
    exclusionsList: () => ipcRenderer.invoke('exclusions:list'),
    exclusionsAdd: (folderPath) => ipcRenderer.invoke('exclusions:add', folderPath),
    exclusionsRemove: (folderPath) => ipcRenderer.invoke('exclusions:remove', folderPath),
    // Windows MTP Phone Import APIs
    mtpDetectDevices: () => ipcRenderer.invoke('mtp:detectDevices'),
    mtpScanDevicePhotos: (devicePath) => ipcRenderer.invoke('mtp:scanDevicePhotos', devicePath),
    mtpTransferPhotos: (candidates, destinationDir) => ipcRenderer.invoke('mtp:transferPhotos', candidates, destinationDir),
    onMtpProgress: (callback) => {
        const handler = (_event, progress) => callback(progress);
        ipcRenderer.on('mtp:progress', handler);
        return () => ipcRenderer.removeListener('mtp:progress', handler);
    },
    // Real SyncFlow Server APIs
    syncGetStatus: () => ipcRenderer.invoke('sync:getStatus'),
    syncRegeneratePin: () => ipcRenderer.invoke('sync:regeneratePin'),
    syncRegisterPhotos: (photos) => ipcRenderer.invoke('sync:registerPhotos', photos),
    onSyncFileReceived: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('sync:fileReceived', handler);
        return () => ipcRenderer.removeListener('sync:fileReceived', handler);
    },
    onSyncPeerFound: (callback) => {
        const handler = (_event, peer) => callback(peer);
        ipcRenderer.on('sync:peerFound', handler);
        return () => ipcRenderer.removeListener('sync:peerFound', handler);
    },
    onSyncPeerPaired: (callback) => {
        const handler = (_event, peer) => callback(peer);
        ipcRenderer.on('sync:peerPaired', handler);
        return () => ipcRenderer.removeListener('sync:peerPaired', handler);
    },
    // REA Reverse Engineering APIs
    reaOpenFile: () => ipcRenderer.invoke('rea:openFile'),
    reaInspectFile: (filePath) => ipcRenderer.invoke('rea:inspectFile', filePath),
    reaExtractAssets: (archivePath, destinationDir) => ipcRenderer.invoke('rea:extractAssets', archivePath, destinationDir),
    reaRunCli: (command, args) => ipcRenderer.invoke('rea:runCli', command, args),
    onReaCliOutput: (callback) => {
        const handler = (_event, chunk) => callback(chunk);
        ipcRenderer.on('rea:cliOutput', handler);
        return () => ipcRenderer.removeListener('rea:cliOutput', handler);
    },
});
//# sourceMappingURL=index.js.map