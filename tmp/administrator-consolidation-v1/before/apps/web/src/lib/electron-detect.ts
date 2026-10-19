/**
 * Detect if the web app is running inside the Electron Desktop Admin shell.
 * Safe to call on both server and client — returns false on the server.
 */

interface ElectronAPI {
  platform: string;
  getVersion: () => string;
  isElectron: boolean;
  isDesktopAdmin: boolean;
  exportFile?: (args: { fileName: string; content: string; fileType: string }) => Promise<{ success: boolean; path?: string }>;
  printPdf?: () => Promise<{ success: boolean; path?: string }>;
  notify?: (args: { title: string; body: string }) => void;
  getAppInfo?: () => Promise<{
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

/** Returns true only when running inside Electron */
export function isElectronApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.electronAPI?.isElectron === true ||
    (typeof navigator !== "undefined" &&
      (navigator.userAgent.includes("Electron") ||
        navigator.userAgent.includes("CdMDesktopAdmin") ||
        navigator.userAgent.includes("LuminaDesktopAdmin")))
  );
}

/** Returns true only when running inside the Desktop Admin Console */
export function isDesktopAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.electronAPI?.isDesktopAdmin === true ||
    (typeof navigator !== "undefined" &&
      (navigator.userAgent.includes("Electron") ||
        navigator.userAgent.includes("CdMDesktopAdmin") ||
        navigator.userAgent.includes("LuminaDesktopAdmin"))) ||
    new URLSearchParams(window.location.search).get("desktop") === "admin"
  );
}

/** Returns the OS platform when in Electron, null otherwise */
export function getElectronPlatform(): string | null {
  if (typeof window === "undefined") return null;
  if (window.electronAPI?.platform) return window.electronAPI.platform;
  if (typeof navigator !== "undefined" && navigator.platform) return navigator.platform;
  return null;
}
