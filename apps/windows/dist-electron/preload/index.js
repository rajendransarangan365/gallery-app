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
});
//# sourceMappingURL=index.js.map