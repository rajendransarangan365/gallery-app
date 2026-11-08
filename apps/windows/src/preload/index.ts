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
});
