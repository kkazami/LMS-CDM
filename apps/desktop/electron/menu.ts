import { Menu, BrowserWindow, app, shell, dialog } from 'electron';
import * as fs from 'fs';

const WEB_URL = process.env.NODE_ENV !== 'production'
  ? 'http://localhost:3000'
  : (process.env.LMS_WEB_URL || 'http://localhost:3000');

export function setupMenu(mainWindow: BrowserWindow) {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),

    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Admin Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/admin'),
        },
        {
          label: 'Course Management',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/admin/courses'),
        },
        {
          label: 'Account Management',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/accounts'),
        },
        {
          label: 'Permission Matrix',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/accounts/permissions'),
        },
        { type: 'separator' },
        {
          label: 'Audit Logs',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/logs'),
        },
        {
          label: 'Backup & Recovery',
          accelerator: 'CmdOrCtrl+6',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/backup'),
        },
        {
          label: 'Security Tools',
          accelerator: 'CmdOrCtrl+7',
          click: () => mainWindow.loadURL(WEB_URL + '/ics/security'),
        },
      ],
    },

    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    {
      label: 'Tools',
      submenu: [
        {
          label: 'Export Audit Log (PDF)',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.printToPDF({}).then((data) => {
              dialog.showSaveDialog(mainWindow, {
                title: 'Export Audit Log',
                defaultPath: 'audit-log-' + new Date().toISOString().slice(0, 10) + '.pdf',
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
              }).then(({ filePath }) => {
                if (filePath) {
                  fs.writeFileSync(filePath, data);
                }
              });
            }).catch((err) => {
              console.error('Failed to print PDF:', err);
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Sign Out',
          accelerator: 'CmdOrCtrl+Shift+Q',
          click: () => {
            mainWindow.webContents.session.clearStorageData({ storages: ['cookies'] }).then(() => {
              mainWindow.loadURL(WEB_URL + '/login?institute=ics&desktop=admin');
            });
          },
        },
      ],
    },

    {
      label: 'Help',
      submenu: [
        {
          label: 'About CdM LMS Admin Console',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'CdM LMS — Administrator Console',
              message: 'CdM LMS Desktop Admin',
              detail: 'Version ' + app.getVersion() + '\n\nThe administrator\'s dedicated desktop console for managing CdM LMS.\n\nFeatures: Course Management, Account Administration, RBAC Permissions, Audit Logs, Backup & Recovery, Security Tools.',
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/your-org/lumina-lms/issues'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
