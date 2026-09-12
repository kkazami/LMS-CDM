import { app, BrowserWindow, shell, session as electronSession } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupMenu } from './menu';
import { registerIpcHandlers } from './ipc/handlers';

const IS_DEV = process.env.NODE_ENV !== 'production';
const WEB_URL = IS_DEV
  ? 'http://localhost:3000'
  : (process.env.LMS_WEB_URL || 'http://localhost:3000');

// Admin-only entry point
const ADMIN_LOGIN_URL = WEB_URL + '/login?institute=ics&desktop=admin';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const adminSession = electronSession.fromPartition('persist:lumina-admin', {
    cache: true,
  });

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
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
      nodeIntegration: false,
      contextIsolation: true,
      session: adminSession,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow = win;
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} LuminaDesktopAdmin/1.0.0`);

  // ─── Splash Screen ───
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#0d0f17',
  });
  splashWindow.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'));

  // ─── Check existing session ───
  adminSession.cookies.get({ name: 'lumina_session' }).then((cookies) => {
    const hasSession = cookies.length > 0;
    const targetURL = hasSession ? (WEB_URL + '/ics/admin') : ADMIN_LOGIN_URL;

    win.loadURL(targetURL).catch(() => {
      win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    });
  }).catch(() => {
    win.loadURL(ADMIN_LOGIN_URL).catch(() => {
      win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    });
  });

  win.once('ready-to-show', () => {
    splashWindow.destroy();
    win.show();
    win.focus();
  });

  // ─── Navigation Guard — Block external URLs ───
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      const webHost = new URL(WEB_URL).host;
      if (parsed.host !== webHost) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      // ignore
    }
  });

  // ─── External Links ───
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // ─── Post-Login Redirect Guard ───
  win.webContents.on('did-navigate', (_event, url) => {
    try {
      const pathname = new URL(url).pathname;
      const adminRoutes = ['admin', 'accounts', 'logs', 'backup', 'security', 'login', 'register', 'forgot-password', 'settings', 'help'];
      const segments = pathname.split('/').filter(Boolean);

      if (segments.length >= 2) {
        const route = segments[1];
        const isAdminRoute = adminRoutes.includes(route);

        if (!isAdminRoute) {
          win.loadURL(WEB_URL + '/' + segments[0] + '/admin');
        }
      }
    } catch {
      // ignore
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  setupMenu(win);
  registerIpcHandlers(win);
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
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
