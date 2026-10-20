import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createWebWorkspace } from './web-workspace.mjs';
const requireWeb = createRequire(path.resolve('apps/web/package.json'));
const output = path.resolve('tmp/roster-import/build-' + Date.now()); fs.mkdirSync(output, { recursive: true });
const { appDir, dispose } = createWebWorkspace(output);
const configPath = path.join(appDir, 'next.config.ts');
const config = fs.readFileSync(configPath, 'utf8');
fs.writeFileSync(configPath, config.replace('const nextConfig: NextConfig = {', 'const nextConfig: NextConfig = {\n  webpack: (config) => { config.cache = false; return config; },'));
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
let log = '';
try {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [requireWeb.resolve('next/dist/bin/next'), 'build', '--webpack'], { cwd: appDir, env: { ...safeEnv, NODE_ENV: 'production', DATABASE_URL: 'postgresql://unused@127.0.0.1:1/harness_roster_build', NEXT_TELEMETRY_DISABLED: '1' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const deadline = setTimeout(() => { child.kill(); reject(new Error('Production build exceeded 5 minutes.')); }, 300000);
    child.stdout.on('data', value => log += value); child.stderr.on('data', value => log += value);
    child.on('error', error => { clearTimeout(deadline); reject(error); }); child.on('close', code => { clearTimeout(deadline); resolve(code); });
  });
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ exitCode: code, isolatedSourceCopy: true, liveDatabase: false }));
  if (code !== 0) process.exitCode = 1;
  console.log('Production build exit: ' + code);
} catch (error) { process.exitCode = 1; console.error(error.message); }
finally { fs.writeFileSync(path.join(output, 'build.log'), log); dispose(); console.log('Build log: ' + path.relative(process.cwd(), path.join(output, 'build.log'))); }
