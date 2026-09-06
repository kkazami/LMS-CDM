import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersion: () => process.env.npm_package_version || '1.0.0',
  isElectron: true,
  isDesktopAdmin: true,

  // ── Admin Desktop IPC Bridges ──
  exportFile: (args: { fileName: string; content: string; fileType: string }) =>
    ipcRenderer.invoke('admin:export-file', args),
  printPdf: () =>
    ipcRenderer.invoke('admin:print-pdf'),
  notify: (args: { title: string; body: string }) =>
    ipcRenderer.send('admin:notify', args),
  getAppInfo: () =>
    ipcRenderer.invoke('admin:get-app-info'),
});
