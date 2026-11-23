const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const desktop = createRequire(path.resolve('package.json'));
const builder = createRequire(desktop.resolve('electron-builder/package.json'));
const asar = builder('@electron/asar');
const archive = path.resolve('dist/packages/win-unpacked/resources/app.asar');
const pkg = JSON.parse(asar.extractFile(archive, 'package.json'));
if (pkg.main !== 'dist/electron/main.js') throw Error('Uncompiled packaged entry');
for (const name of [pkg.main, 'dist/electron/preload.js', 'dist/electron/security.js', 'dist/electron/ipc/handlers.js',
  'renderer/index.html', 'renderer/offline.js', 'renderer/offline.css', 'renderer/splash.html', 'renderer/splash.css']) {
  if (!asar.extractFile(archive, name).length) throw Error('Missing package asset ' + name);
}
const entries = asar.listPackage(archive);
if (entries.some(name => /\.env(?:\.|$)|\.ts$|node_modules/.test(name))) throw Error('Unexpected source or credential file in package');
console.log(JSON.stringify({ packaged: true, platform: 'win32-x64', unsigned: true, entry: pkg.main,
  archiveSha256: createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),
  files: entries.length, runtimeLaunched: false, note: 'Archive integrity is not native runtime verification.' }));
