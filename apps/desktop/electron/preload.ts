import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersion: () => process.env.npm_package_version || '1.0.0',
  isElectron: true,
});
