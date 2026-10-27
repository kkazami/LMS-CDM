import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
const home = path.join(root, '.orchestra', 'local-services', 'clamav');
const config = Object.assign({}, ...['.env', '.env.development', '.env.local', '.env.development.local']
  .map(name => { try { return parseEnv(fs.readFileSync(path.join(root, 'apps', 'web', name), 'utf8')); } catch { return {}; } }), process.env);
const optional = process.argv.includes('--if-configured');
const host = config.CLAMAV_HOST;
const port = Number(config.CLAMAV_PORT);

function fail(message) {
  const detail = `Local file scanner: ${message}`;
  if (optional) console.warn(`WARNING: ${detail} Uploads will remain blocked until it is fixed.`);
  else { console.error(`ERROR: ${detail}`); process.exitCode = 1; }
}

function probe() {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 3310 });
    let finished = false;
    const done = value => { if (finished) return; finished = true; socket.destroy(); resolve(value); };
    socket.setTimeout(2000, () => done(false));
    socket.once('error', () => done(false));
    socket.once('connect', () => socket.write(Buffer.concat([Buffer.from('zVERSION'), Buffer.from([0])])));
    socket.once('data', response => done(response.toString('utf8').startsWith('ClamAV ')));
    socket.once('end', () => done(false));
  });
}

function running(name) {
  try {
    const pid = Number(fs.readFileSync(path.join(home, `${name}.pid`), 'utf8').trim());
    if (!Number.isSafeInteger(pid) || pid < 1) return false;
    const result = execFileSync('tasklist.exe', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
    return result.toLowerCase().includes(`"${name}.exe"`);
  } catch { return false; }
}

function start(name, args) {
  const executable = path.join(home, '1.4.6', 'clamav-1.4.6.win.x64', `${name}.exe`);
  if (!fs.existsSync(executable)) throw Error(`${name}.exe is missing from ${home}.`);
  const output = fs.openSync(path.join(home, 'logs', `${name}.stdout.log`), 'a');
  const errors = fs.openSync(path.join(home, 'logs', `${name}.stderr.log`), 'a');
  try {
    const child = spawn(executable, args, { cwd: home, detached: true, windowsHide: true, stdio: ['ignore', output, errors] });
    child.on('error', error => console.error(`Local file scanner: ${name} could not start: ${error.message}`));
    child.unref();
  } finally { fs.closeSync(output); fs.closeSync(errors); }
}

if (!host || !port) {
  if (!optional) fail('Set CLAMAV_HOST and CLAMAV_PORT in apps/web/.env.local.');
} else if (host !== '127.0.0.1' || port !== 3310) {
  if (!optional) fail('This helper only manages the loopback scanner on port 3310.');
} else if (process.platform !== 'win32') {
  if (!optional) fail('This local scanner installation is for Windows.');
} else {
  try {
    if (!fs.existsSync(path.join(home, 'clamd.conf')) || !fs.existsSync(path.join(home, 'freshclam.conf'))) throw Error(`Scanner configuration is missing from ${home}.`);
    let ready = await probe();
    if (!ready && !running('clamd')) {
      start('clamd', [`--config-file=${path.join(home, 'clamd.conf')}`]);
      console.log('Local file scanner: starting ClamAV. Loading signatures can take a few seconds.');
    }
    for (let attempt = 0; !ready && attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      ready = await probe();
    }
    if (!ready) throw Error(`ClamAV did not become ready; see ${path.join(home, 'logs', 'clamd.log')}.`);
    if (!running('freshclam')) start('freshclam', ['--daemon', '--quiet', `--config-file=${path.join(home, 'freshclam.conf')}`]);
    console.log('Local file scanner: ClamAV is ready; file uploads will be scanned.');
  } catch (error) { fail(error.message); }
}
