/**
 * apps/windows/src/main/index.ts
 * Electron Main Process - Native Windows Integration
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExclusionManager } from '@gallery/security';
import { PhotoIndexer } from '@gallery/photo-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const exclusionManager = new ExclusionManager();

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
