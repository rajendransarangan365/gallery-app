/**
 * apps/windows/src/main/index.ts
 * Electron Main Process - Native Windows Integration & SyncFlow Server
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExclusionManager } from '@gallery/security';
import { PhotoIndexer, MtpManager, type MtpPhotoCandidate } from '@gallery/photo-engine';
import { VaultManager, ExclusionRegistry } from '@gallery/vault-engine';
import { DesktopSyncServer } from './sync-server.js';
import { ReaEngine } from './rea-engine.js';
import type { PhotoItem } from '@gallery/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let currentPhotos: PhotoItem[] = [];
const exclusionManager = new ExclusionManager();
const vaultManager = new VaultManager();
const exclusionRegistry = new ExclusionRegistry(exclusionManager);

const syncServer = new DesktopSyncServer(
  { exclusionManager },
  () => mainWindow,
  () => currentPhotos
);

function createWindow() {
  const iconPath = path.join(__dirname, '../../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    icon: iconPath,
    backgroundColor: '#0A0C10',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0A0C10',
      symbolColor: '#F8FAFC',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  createWindow();

  // Start SyncFlow HTTP server & UDP beacon
  try {
    await syncServer.start();
  } catch (err) {
    console.warn('[DesktopSyncServer] Startup notice:', err);
  }

  // IPC Handler: Open native folder selection dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // IPC Handler: Scan directory using PhotoIndexer
  ipcMain.handle('scanner:scanDirectory', async (_event: unknown, targetPath: string) => {
    if (!targetPath) return [];

    const scanned = await PhotoIndexer.indexDirectory(targetPath, {
      exclusionManager,
      onProgress: (progress) => {
        mainWindow?.webContents.send('scanner:progress', progress);
      },
    });

    currentPhotos = scanned;
    return scanned;
  });

  // Vault IPC Handlers
  ipcMain.handle('vault:isConfigured', () => vaultManager.isConfigured());
  ipcMain.handle('vault:setup', async (_event: unknown, pin: string) => {
    await vaultManager.setupVault(pin);
    return true;
  });
  ipcMain.handle('vault:unlock', async (_event: unknown, pin: string) => {
    return vaultManager.unlock(pin);
  });
  ipcMain.handle('vault:lock', () => {
    vaultManager.lock();
    return true;
  });
  ipcMain.handle('vault:list', async () => {
    return vaultManager.listItems();
  });
  ipcMain.handle('vault:import', async (_event: unknown, filePath: string) => {
    return vaultManager.importPhoto(filePath);
  });
  ipcMain.handle('vault:export', async (_event: unknown, itemId: string, destDir: string) => {
    return vaultManager.exportPhoto(itemId, destDir);
  });

  // Exclusion IPC Handlers
  ipcMain.handle('exclusions:list', () => exclusionRegistry.listExclusions());
  ipcMain.handle('exclusions:add', async (_event: unknown, folderPath: string) => {
    return exclusionRegistry.addExclusionAndPurge(folderPath, []);
  });
  ipcMain.handle('exclusions:remove', (_event: unknown, folderPath: string) => {
    return exclusionRegistry.removeExclusion(folderPath);
  });

  // Windows MTP Phone Import IPC Handlers
  ipcMain.handle('mtp:detectDevices', async () => {
    return MtpManager.detectConnectedDevices();
  });
  ipcMain.handle('mtp:scanDevicePhotos', async (_event: unknown, devicePath: string) => {
    return MtpManager.scanDevicePhotos(devicePath, new Set(), exclusionManager);
  });
  ipcMain.handle(
    'mtp:transferPhotos',
    async (_event: unknown, candidates: MtpPhotoCandidate[], destinationDir: string) => {
      return MtpManager.transferPhotos(candidates, destinationDir, {
        exclusionManager,
        onProgress: (progress) => {
          mainWindow?.webContents.send('mtp:progress', progress);
        },
      });
    }
  );

  // SyncFlow Real Server IPC Handlers
  ipcMain.handle('sync:getStatus', () => syncServer.getStatus());
  ipcMain.handle('sync:regeneratePin', () => syncServer.regeneratePin());
  ipcMain.handle('sync:registerPhotos', (_event: unknown, photos: PhotoItem[]) => {
    currentPhotos = photos;
    return true;
  });

  // Reverse Engineer Anything (REA) IPC Handlers
  ipcMain.handle('rea:openFile', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Binary, APK, or SQLite Database to Inspect',
      filters: [
        { name: 'All Inspectable Targets', extensions: ['apk', 'sqlite', 'db', 'sqlite3', 'exe', 'dll', 'asar', 'zip'] },
        { name: 'Android Packages (*.apk)', extensions: ['apk', 'zip'] },
        { name: 'SQLite Databases (*.db, *.sqlite)', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'Windows Binaries (*.exe, *.dll)', extensions: ['exe', 'dll'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('rea:inspectFile', async (_event: unknown, targetPath: string) => {
    return ReaEngine.inspectFile(targetPath);
  });

  ipcMain.handle('rea:extractAssets', async (_event: unknown, archivePath: string, destinationDir?: string) => {
    const outDir = destinationDir || path.join(app.getPath('pictures'), 'PhotoGallery_Extracted_Assets');
    const extracted = await ReaEngine.extractAllAssets(archivePath, outDir);
    return { extractedPaths: extracted, outputDirectory: outDir };
  });

  ipcMain.handle('rea:runCli', async (_event: unknown, command: string, args: string[]) => {
    return ReaEngine.runReaCli(command, args, (chunk) => {
      mainWindow?.webContents.send('rea:cliOutput', chunk);
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  syncServer.stop();
  if (process.platform !== 'darwin') app.quit();
});
