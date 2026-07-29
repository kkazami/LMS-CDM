import { app, BrowserWindow, shell, nativeTheme } from 'electron';
import * as path from 'path';
import { setupMenu } from './menu';

const IS_DEV = process.env.NODE_ENV !== 'production';
const WEB_URL = IS_DEV ? 'http://localhost:3000' : (process.env.LMS_WEB_URL || 'http://localhost:3000');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Lumina LMS',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#F6F4F4',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Show splash screen while loading
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#2C2727',
  });
  splashWindow.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'));

  // Load the web app
  mainWindow.loadURL(WEB_URL).catch(() => {
    // If the web server isn't running, show fallback page
    mainWindow?.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  });

  // When main window is ready, show it and close splash
  mainWindow.once('ready-to-show', () => {
    splashWindow.destroy();
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Handle external links — open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup native menus
  setupMenu(mainWindow);
}

// App lifecycle
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

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
