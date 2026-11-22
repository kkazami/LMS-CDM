const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { rendererPreferences, isTrustedNavigation, isSafeExternal, isTrustedIpc, isAllowedRendererPermission } = require('../../apps/desktop/electron/security.ts');
const { resolveDesktopWebUrl } = require('../../apps/desktop/electron/web-url.ts');
const origin = 'https://lms.example.invalid';

test('both desktop renderers retain sandbox, isolation and disabled Node integration', () => {
  assert.deepEqual(rendererPreferences, { nodeIntegration: false, contextIsolation: true, sandbox: true,
    webviewTag: false, allowRunningInsecureContent: false });
  const main = fs.readFileSync('apps/desktop/electron/main.ts', 'utf8');
  assert.equal((main.match(/\.\.\.rendererPreferences/g) || []).length, 2);
  assert.doesNotMatch(main, /onHeadersReceived/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.match(main, /setPermissionCheckHandler/);
  assert.match(main, /on\('will-redirect'/);
});

test('navigation and external URLs keep exact origins, HTTPS and explicit localhost development', () => {
  assert.equal(isTrustedNavigation(origin + '/ics/accounts', origin), true);
  for (const value of ['http://lms.example.invalid', 'https://lms.example.invalid:8443', 'https://other.invalid',
    'javascript:alert(1)', 'file:///tmp/page.html', 'https://dummy@lms.example.invalid']) {
    assert.equal(isTrustedNavigation(value, origin), false, value);
  }
  assert.equal(isSafeExternal('https://docs.example.invalid', false), true);
  assert.equal(isSafeExternal('http://localhost:3000', true), true);
  for (const value of ['http://docs.example.invalid', 'file:///tmp/dummy', 'javascript:void(0)', 'https://dummy@docs.example.invalid']) {
    assert.equal(isSafeExternal(value, false), false, value);
  }
  assert.equal(resolveDesktopWebUrl(origin, false), origin);
  assert.throws(() => resolveDesktopWebUrl('http://localhost:3000', false));
});

test('IPC accepts only the main LMS frame in the designated WebContents', () => {
  for (const permission of ['clipboard-sanitized-write', 'fullscreen']) {
    assert.equal(isAllowedRendererPermission(permission, true, origin + '/ics', origin), true);
    assert.equal(isAllowedRendererPermission(permission, false, origin, origin), false);
    assert.equal(isAllowedRendererPermission(permission, true, 'https://other.invalid', origin), false);
  }
  for (const permission of ['clipboard-read', 'media', 'geolocation', 'notifications', 'fileSystem', 'unknown']) {
    assert.equal(isAllowedRendererPermission(permission, true, origin, origin), false);
  }
  const mainFrame = { url: origin + '/ics' }, contents = { mainFrame };
  assert.equal(isTrustedIpc({ sender: contents, senderFrame: mainFrame }, contents, origin), true);
  assert.equal(isTrustedIpc({ sender: {}, senderFrame: mainFrame }, contents, origin), false);
  assert.equal(isTrustedIpc({ sender: contents, senderFrame: { url: mainFrame.url } }, contents, origin), false);
  for (const url of ['file:///tmp/index.html', 'http://lms.example.invalid', 'https://other.invalid']) {
    mainFrame.url = url;
    assert.equal(isTrustedIpc({ sender: contents, senderFrame: mainFrame }, contents, origin), false);
  }
});

test('all four native IPC operations reject foreign frames; ordinary exports and printing still work', async () => {
  const handlers = {}, listeners = {}, calls = [];
  const target = path.join(process.env.TMPDIR || process.env.TEMP || '/tmp', 'sprint2-dummy-export.txt');
  const mainFrame = { url: origin + '/ics/accounts' };
  const window = { webContents: { mainFrame, printToPDF: async () => { calls.push('print'); return Buffer.from('dummy-pdf'); } } };
  const electron = {
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: (name, fn) => { listeners[name] = fn; } },
    dialog: { showSaveDialog: async () => { calls.push('dialog'); return { filePath: target }; } },
    Notification: class { static isSupported() { return true; } show() { calls.push('notification'); } },
    app: { getVersion: () => '1.0.0' },
  };
  const load = Module._load;
  Module._load = function(name, ...args) { return name === 'electron' ? electron : load.call(this, name, ...args); };
  try {
    require('../../apps/desktop/electron/ipc/handlers.ts').registerIpcHandlers(window, origin);
    const denied = { sender: window.webContents, senderFrame: { url: origin + '/embedded' } };
    assert.equal((await handlers['admin:export-file'](denied, {})).success, false);
    assert.equal((await handlers['admin:print-pdf'](denied)).success, false);
    assert.equal(await handlers['admin:get-app-info'](denied), null);
    listeners['admin:notify'](denied, { title: 'Dummy', body: 'Dummy' });
    assert.deepEqual(calls, []);
    const event = { sender: window.webContents, senderFrame: mainFrame };
    assert.equal((await handlers['admin:export-file'](event, undefined)).error, 'Invalid export arguments');
    assert.equal((await handlers['admin:export-file'](event, { fileName: '../dummy', content: '', fileType: 'csv' })).success, false);
    assert.equal((await handlers['admin:export-file'](event, { fileName: 'dummy.csv', content: 'dummy,1', fileType: 'csv' })).success, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'dummy,1');
    assert.equal((await handlers['admin:print-pdf'](event)).success, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'dummy-pdf');
    assert.equal((await handlers['admin:get-app-info'](event)).version, '1.0.0');
    listeners['admin:notify'](event, { title: 'Dummy', body: 'Dummy' });
    assert.deepEqual(calls, ['dialog', 'print', 'dialog', 'notification']);
  } finally { Module._load = load; if (fs.existsSync(target)) fs.unlinkSync(target); }
});

test('local fallback and splash use CSP without inline code, and package entry is compiled JavaScript', () => {
  for (const name of ['index', 'splash']) {
    const html = fs.readFileSync(`apps/desktop/renderer/${name}.html`, 'utf8');
    assert.match(html, /http-equiv="Content-Security-Policy"/);
    assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|<style>|<script>|\son\w+=/);
  }
  const pkg = JSON.parse(fs.readFileSync('apps/desktop/package.json'));
  assert.equal(pkg.main, 'dist/electron/main.js');
  assert.match(pkg.scripts.pack, /pnpm compile &&/);
});
