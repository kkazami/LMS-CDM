import { ipcMain, BrowserWindow, dialog, Notification } from 'electron';
import * as fs from 'fs';
import { isTrustedIpc } from '../security';

export function registerIpcHandlers(mainWindow: BrowserWindow, trustedWebUrl: string) {
  const isAuthorizedSender = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) =>
    isTrustedIpc(event, mainWindow.webContents, trustedWebUrl);
  // ─── 1. Export Data as File (CSV, JSON, TXT) ───
  ipcMain.handle('admin:export-file', async (event, args: {
    fileName: string;
    content: string;
    fileType: 'csv' | 'json' | 'txt';
  }) => {
    if (!isAuthorizedSender(event)) {
      return { success: false, error: 'Unauthorized IPC origin' };
    }
    if (!args || typeof args.fileName !== 'string' || !args.fileName || /[\\/\x00-\x1f]/.test(args.fileName) ||
      typeof args.content !== 'string' || !['csv', 'json', 'txt'].includes(args.fileType)) {
      return { success: false, error: 'Invalid export arguments' };
    }
    const { fileName, content, fileType } = args;

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
  ipcMain.handle('admin:print-pdf', async (event) => {
    if (!isAuthorizedSender(event)) {
      return { success: false, error: 'Unauthorized IPC origin' };
    }

    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
    });

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save as PDF',
      defaultPath: "cdm-lms-admin-report-" + new Date().toISOString().slice(0, 10) + ".pdf",
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (result.filePath) {
      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  // ─── 3. Show Native OS Notification ───
  ipcMain.on('admin:notify', (event, args: { title: string; body: string }) => {
    if (!isAuthorizedSender(event)) {
      return;
    }
    if (!args || typeof args.title !== 'string' || typeof args.body !== 'string') return;
    const { title, body } = args;

    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // ─── 4. Get App Info (Omit sensitive local filesystem paths) ───
  ipcMain.handle('admin:get-app-info', (event) => {
    if (!isAuthorizedSender(event)) {
      return null;
    }

    const { app } = require('electron');
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    };
  });
}
