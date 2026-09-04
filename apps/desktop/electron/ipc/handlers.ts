import { ipcMain, BrowserWindow, dialog, Notification } from 'electron';
import * as fs from 'fs';

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // ─── 1. Export Data as File (CSV, JSON, TXT) ───
  ipcMain.handle('admin:export-file', async (_event, { fileName, content, fileType }: {
    fileName: string;
    content: string;
    fileType: 'csv' | 'json' | 'txt';
  }) => {
    const extensions: Record<string, string[]> = {
      csv: ['csv'],
      json: ['json'],
      txt: ['txt'],
    };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Data',
      defaultPath: fileName,
      filters: [{ name: fileType.toUpperCase(), extensions: extensions[fileType] || ['txt'] }],
    });

    if (result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  // ─── 2. Print Current Page to PDF ───
  ipcMain.handle('admin:print-pdf', async () => {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
    });

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save as PDF',
      defaultPath: "lumina-admin-report-" + new Date().toISOString().slice(0, 10) + ".pdf",
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (result.filePath) {
      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  // ─── 3. Show Native OS Notification ───
  ipcMain.on('admin:notify', (_event, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // ─── 4. Get App Info ───
  ipcMain.handle('admin:get-app-info', () => {
    const { app } = require('electron');
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      userDataPath: app.getPath('userData'),
    };
  });
}
