export const rendererPreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webviewTag: false,
  allowRunningInsecureContent: false,
} as const;

export function isTrustedNavigation(raw: string, origin: string): boolean {
  try {
    const url = new URL(raw);
    return !url.username && !url.password && url.origin === new URL(origin).origin;
  } catch { return false; }
}

export function isSafeExternal(raw: string, development: boolean): boolean {
  try {
    const url = new URL(raw);
    return !url.username && !url.password && (url.protocol === 'https:' ||
      development && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch { return false; }
}

export function isTrustedIpc(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent,
  contents: Electron.WebContents, origin: string): boolean {
  // The offline page needs no native capabilities. Only the main LMS frame receives them.
  return event.sender === contents && event.senderFrame === contents.mainFrame &&
    isTrustedNavigation(event.senderFrame?.url || '', origin);
}

export function isAllowedRendererPermission(permission: string, mainFrame: boolean, url: string, origin: string): boolean {
  return mainFrame && ['clipboard-sanitized-write', 'fullscreen'].includes(permission) && isTrustedNavigation(url, origin);
}
