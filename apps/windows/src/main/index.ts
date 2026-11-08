/**
 * apps/windows/src/main/index.ts
 * Electron Main Process - Native Windows Integration
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExclusionManager } from '@gallery/security';
import { PhotoIndexer, MtpManager, type MtpPhotoCandidate } from '@gallery/photo-engine';
import { VaultManager, ExclusionRegistry } from '@gallery/vault-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const exclusionManager = new ExclusionManager();
const vaultManager = new VaultManager();
const exclusionRegistry = new ExclusionRegistry(exclusionManager);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

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

    return PhotoIndexer.indexDirectory(targetPath, {
      exclusionManager,
      onProgress: (progress) => {
        mainWindow?.webContents.send('scanner:progress', progress);
      },
    });
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
