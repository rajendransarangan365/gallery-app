/**
 * apps/windows/src/preload/index.ts
 * Electron Preload Script - Secure Context Bridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { PhotoItem } from '@gallery/shared';
import type { IndexerProgress } from '@gallery/photo-engine';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (path: string): Promise<PhotoItem[]> => ipcRenderer.invoke('scanner:scanDirectory', path),
  onScanProgress: (callback: (progress: IndexerProgress) => void) => {
    const handler = (_event: unknown, progress: IndexerProgress) => callback(progress);
    ipcRenderer.on('scanner:progress', handler);
    return () => ipcRenderer.removeListener('scanner:progress', handler);
  },
  // Vault APIs
  vaultIsConfigured: (): Promise<boolean> => ipcRenderer.invoke('vault:isConfigured'),
  vaultSetup: (pin: string): Promise<boolean> => ipcRenderer.invoke('vault:setup', pin),
  vaultUnlock: (pin: string): Promise<boolean> => ipcRenderer.invoke('vault:unlock', pin),
  vaultLock: (): Promise<boolean> => ipcRenderer.invoke('vault:lock'),
  vaultList: (): Promise<any[]> => ipcRenderer.invoke('vault:list'),
  vaultImport: (filePath: string): Promise<any> => ipcRenderer.invoke('vault:import', filePath),
  vaultExport: (itemId: string, destDir: string): Promise<string> => ipcRenderer.invoke('vault:export', itemId, destDir),
  // Exclusion APIs
  exclusionsList: (): Promise<any[]> => ipcRenderer.invoke('exclusions:list'),
  exclusionsAdd: (folderPath: string): Promise<any> => ipcRenderer.invoke('exclusions:add', folderPath),
  exclusionsRemove: (folderPath: string): Promise<boolean> => ipcRenderer.invoke('exclusions:remove', folderPath),
});
