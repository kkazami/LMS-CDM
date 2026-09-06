/**
 * TypeScript declarations for the Electron preload bridge.
 * Only available when the web app is loaded inside the Electron Desktop Admin shell.
 */

interface ElectronAPI {
  platform: string;
  getVersion: () => string;
  isElectron: boolean;
  isDesktopAdmin: boolean;
  exportFile: (args: { fileName: string; content: string; fileType: string }) => Promise<{ success: boolean; path?: string }>;
  printPdf: () => Promise<{ success: boolean; path?: string }>;
  notify: (args: { title: string; body: string }) => void;
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    arch: string;
    electronVersion: string;
    chromeVersion: string;
    nodeVersion: string;
    userDataPath: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
