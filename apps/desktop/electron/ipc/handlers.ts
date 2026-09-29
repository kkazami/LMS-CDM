import { ipcMain, BrowserWindow, dialog, Notification } from 'electron';
import * as fs from 'fs';

/**
 * Validates that an incoming IPC message originates from an authorized frame
 * (either a local file:// renderer asset or the trusted LMS origin).
 */
function isAuthorizedSender(
  event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent,
  trustedBaseUrl: string
): boolean {
  try {
    const senderUrl = event.senderFrame?.url;
    if (!senderUrl) return false;
    // Allow local renderer html files
    if (senderUrl.startsWith('file://')) return true;

    const sender = new URL(senderUrl);
    const trusted = new URL(trustedBaseUrl);
    return sender.protocol === trusted.protocol && sender.host === trusted.host;
  } catch {
    return false;
  }
}

export function registerIpcHandlers(mainWindow: BrowserWindow, trustedWebUrl: string) {
  // ─── 1. Export Data as File (CSV, JSON, TXT) ───
  ipcMain.handle('admin:export-file', async (event, { fileName, content, fileType }: {
    fileName: string;
    content: string;
    fileType: 'csv' | 'json' | 'txt';
  }) => {
    if (!isAuthorizedSender(event, trustedWebUrl)) {
      console.warn('Blocked admin:export-file from unauthorized frame:', event.senderFrame?.url);
      return { success: false, error: 'Unauthorized IPC origin' };
    }

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
    if (!isAuthorizedSender(event, trustedWebUrl)) {
      console.warn('Blocked admin:print-pdf from unauthorized frame:', event.senderFrame?.url);
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
  ipcMain.on('admin:notify', (event, { title, body }: { title: string; body: string }) => {
    if (!isAuthorizedSender(event, trustedWebUrl)) {
      console.warn('Blocked admin:notify from unauthorized frame:', event.senderFrame?.url);
      return;
    }

    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // ─── 4. Get App Info (Omit sensitive local filesystem paths) ───
  ipcMain.handle('admin:get-app-info', (event) => {
    if (!isAuthorizedSender(event, trustedWebUrl)) {
      console.warn('Blocked admin:get-app-info from unauthorized frame:', event.senderFrame?.url);
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
