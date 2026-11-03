import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { evidenceRoot, sourceManifest, safeEnvironment } from './evidence.mjs';

const [name, command, ...args] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(name ?? '') || !command) throw Error('Usage: node scripts/ohmward/verify.mjs name command args');
fs.mkdirSync(evidenceRoot, { recursive: true });
const id = `${Date.now()}-${name}`, manifest = sourceManifest();
const receipt = { id, command: [command, ...args], cwd: process.cwd(), startedAt: new Date().toISOString(), fingerprint: manifest.fingerprint };
fs.writeFileSync(path.join(evidenceRoot, `${id}.source.json`), JSON.stringify(manifest, null, 2));
const env = { ...safeEnvironment(), DATABASE_URL: 'postgresql://unused@127.0.0.1:1/harness_ohmward_offline', OHMWARD_ENABLED: 'true', NEXT_TELEMETRY_DISABLED: '1' };
const empty = path.resolve('tmp/ohmward/empty.env'); fs.mkdirSync(path.dirname(empty), { recursive: true }); fs.writeFileSync(empty, ''); env.DOTENV_CONFIG_PATH = empty;
const pnpm = path.join(process.env.APPDATA, 'npm/node_modules/pnpm/bin/pnpm.cjs');
const executable = command === 'pnpm' || command === 'node' ? process.execPath : command;
const actualArgs = command === 'pnpm' ? [pnpm, ...args] : args;
const stdout = fs.createWriteStream(path.join(evidenceRoot, `${id}.stdout.txt`));
const stderr = fs.createWriteStream(path.join(evidenceRoot, `${id}.stderr.txt`));
const child = spawn(executable, actualArgs, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', bytes => { stdout.write(bytes); process.stdout.write(bytes); });
child.stderr.on('data', bytes => { stderr.write(bytes); process.stderr.write(bytes); });
child.on('error', error => { stderr.write(String(error)); });
child.on('close', (code, signal) => {
  stdout.end(); stderr.end();
  fs.writeFileSync(path.join(evidenceRoot, `${id}.command.json`), JSON.stringify({ ...receipt, finishedAt: new Date().toISOString(), exitCode: code, signal }, null, 2));
  process.exitCode = code ?? 1;
});
