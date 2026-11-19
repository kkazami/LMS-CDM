import { app, BrowserWindow, shell, session as electronSession } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupMenu } from './menu';
import { registerIpcHandlers } from './ipc/handlers';
import { resolveDesktopWebUrl } from './web-url';
import { rendererPreferences, isTrustedNavigation, isSafeExternal, isAllowedRendererPermission } from './security';

const IS_DEV = !app.isPackaged;
const WEB_URL = resolveDesktopWebUrl(process.env.LMS_WEB_URL, IS_DEV);
const DESKTOP_ROOT = app.isPackaged ? path.join(__dirname, '../..') : path.join(__dirname, '..');

// Administrative console entry point (ADMIN and SUPER_USER).
const ADMIN_LOGIN_URL = WEB_URL + '/login?institute=ics&desktop=admin';

let mainWindow: BrowserWindow | null = null;

/**
 * Validates and safely opens an external URL in the default system browser.
 * Only allows https: protocols (or http: on localhost during local development).
 * Rejects non-HTTP schemes (file:, smb:, tel:, mailto:, local application launchers).
 */
function safeOpenExternal(rawUrl: string): void {
  try {
    if (isSafeExternal(rawUrl, IS_DEV)) {
      shell.openExternal(rawUrl).catch((err) => {
        console.warn('Failed to open external URL:', err.message);
      });
    } else {
      console.warn('Blocked external URL navigation');
    }
  } catch {
    // Malformed URL, reject
  }
}

function createWindow() {
  const adminSession = electronSession.fromPartition('persist:lumina-admin', {
    cache: true,
  });

  // Keep the server's CSP; never replace it with a more permissive desktop policy.
  adminSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(contents === mainWindow?.webContents &&
      isAllowedRendererPermission(permission, details.isMainFrame, details.requestingUrl, WEB_URL));
  });
  adminSession.setPermissionCheckHandler((contents, permission, requestingOrigin, details) =>
    contents === mainWindow?.webContents && isTrustedNavigation(requestingOrigin, WEB_URL) &&
    isAllowedRendererPermission(permission, details.isMainFrame, details.requestingUrl || '', WEB_URL));

  const iconPath = path.join(DESKTOP_ROOT, 'assets', 'icon.png');
  const hasIcon = fs.existsSync(iconPath);

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CdM LMS — Administrator Console',
    ...(hasIcon ? { icon: iconPath } : {}),
    backgroundColor: '#0d0f17',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      ...rendererPreferences,
      session: adminSession,
    },
  });

  mainWindow = win;
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} CdMDesktopAdmin/1.0.0 LuminaDesktopAdmin/1.0.0`);

  // ─── Splash Screen ───
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#0d0f17',
    webPreferences: { ...rendererPreferences, session: adminSession },
  });
  splashWindow.loadFile(path.join(DESKTOP_ROOT, 'renderer', 'splash.html'));

  // ─── Check existing session ───
  adminSession.cookies.get({ name: 'lumina_session' }).then((cookies) => {
    const hasSession = cookies.length > 0;
    const targetURL = hasSession ? (WEB_URL + '/ics') : ADMIN_LOGIN_URL;

    win.loadURL(targetURL).catch(() => {
      win.loadFile(path.join(DESKTOP_ROOT, 'renderer', 'index.html'), { query: { server: WEB_URL } });
    });
  }).catch(() => {
    win.loadURL(ADMIN_LOGIN_URL).catch(() => {
      win.loadFile(path.join(DESKTOP_ROOT, 'renderer', 'index.html'), { query: { server: WEB_URL } });
    });
  });

  win.once('ready-to-show', () => {
    splashWindow.destroy();
    win.show();
    win.focus();
  });

  // ─── Navigation Guard — Block external URLs ───
  const guardNavigation = (event: Electron.Event, url: string) => {
    try {
      if (!isTrustedNavigation(url, WEB_URL)) {
        event.preventDefault();
        safeOpenExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  };
  win.webContents.on('will-navigate', guardNavigation);
  win.webContents.on('will-redirect', (event, url, _inPlace, mainFrame) => {
    if (mainFrame) guardNavigation(event, url);
  });

  // ─── External Links ───
  win.webContents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url);
    return { action: 'deny' };
  });

  // ─── Post-Login Redirect Guard ───
  win.webContents.on('did-navigate', (_event, url) => {
    try {
      const pathname = new URL(url).pathname;
      const adminRoutes = ['academic-operations', 'admin', 'accounts', 'logs', 'backup', 'security', 'login', 'register', 'forgot-password', 'settings', 'help'];
      const segments = pathname.split('/').filter(Boolean);

      if (segments.length >= 2) {
        const route = segments[1];
        const isAdminRoute = adminRoutes.includes(route);

        if (!isAdminRoute) {
          win.loadURL(WEB_URL + '/' + segments[0]);
        }
      }
    } catch {
      // ignore
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  setupMenu(win, WEB_URL);
  registerIpcHandlers(win, WEB_URL);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url);
    return { action: 'deny' };
  });
});
