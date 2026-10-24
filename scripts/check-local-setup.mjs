import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export function checkLocalSetup(target, root = process.cwd(), env = process.env, nodeVersion = process.versions.node) {
  const messages = [];
  let ok = true;
  const fail = text => { ok = false; messages.push('ERROR: ' + text); };
  const [major,minor] = nodeVersion.split('.').map(Number);
  if (!(major === 22 && minor >= 13 || major === 24 && minor >= 3 || major >= 25)) fail('Use Node.js 24.3+ LTS or Node.js 22.13+.');
  const agent = env.npm_config_user_agent?.match(/^pnpm\/([^ ]+)/)?.[1];
  if (agent && agent !== '10.32.1') fail('Use the pinned pnpm 10.32.1 version and run pnpm install --frozen-lockfile.');
  if (!['web','mobile','desktop','all'].includes(target)) return {ok:false,messages:['Choose web, mobile, desktop, or all.']};
  const readEnv = name => {
    try { return parseEnv(fs.readFileSync(path.join(root,name),'utf8')); }
    catch { return {}; }
  };
  if (target === 'web' || target === 'all') {
    const config = Object.assign({},...['.env','.env.development','.env.local','.env.development.local'].map(f=>readEnv('apps/web/'+f)),env);
    const url = config.DATABASE_URL || config.POSTGRES_PRISMA_URL || config.POSTGRES_URL;
    try {
      if (!url || !['postgres:','postgresql:'].includes(new URL(url).protocol)) throw Error();
      messages.push('Web: PostgreSQL is configured (value hidden). Database access is checked by the server, not this script.');
    } catch { fail('Web needs a PostgreSQL connection in apps/web/.env.local or the process environment. Copy .env.example and configure a restricted runtime account.'); }
  }
  if (target === 'mobile' || target === 'all') {
    try {
      const installed = JSON.parse(fs.readFileSync(path.join(root,'apps/mobile/node_modules/expo/package.json'),'utf8'));
      const expected = JSON.parse(fs.readFileSync(path.join(root,'apps/mobile/package.json'),'utf8')).dependencies.expo.match(/\d+/)[0];
      if (installed.version.split('.')[0] !== expected) fail('Installed Expo SDK differs from package.json. Run pnpm install --frozen-lockfile at the repository root.');
      messages.push(`Mobile: Expo SDK ${expected}; install a matching Expo Go runtime or development build on the phone.`);
    } catch { fail('Mobile dependencies are missing. Run pnpm install --frozen-lockfile at the repository root.'); }
    const config = {...readEnv('apps/mobile/.env'),...readEnv('apps/mobile/.env.local'),...env};
    const value = config.EXPO_PUBLIC_API_URL?.trim();
    if (value === 'auto') messages.push('Mobile: local API discovery. Start pnpm dev:web and use the same network; a Metro tunnel does not expose the local API.');
    else {
      try {
        const url = new URL(value || 'https://lms-cdm.vercel.app');
        if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['','/','/api','/api/'].includes(url.pathname)) throw Error();
        messages.push(`Mobile backend: ${url.origin}. Mobile does not need database or SMTP credentials.`);
      } catch { fail('EXPO_PUBLIC_API_URL must be a server origin or auto, without credentials or a page path.'); }
    }
  }
  if (target === 'desktop' || target === 'all') {
    try {
      const requireDesktop = createRequire(path.join(root,'apps/desktop/package.json'));
      if (!fs.existsSync(requireDesktop('electron'))) throw Error();
      messages.push('Desktop: Electron is installed. Development needs pnpm dev:web, or set LMS_WEB_URL to a reachable HTTPS backend.');
    } catch { fail('Electron is missing. Run pnpm install --frozen-lockfile, then pnpm --filter desktop rebuild electron if its download was interrupted.'); }
  }
  return {ok,messages};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkLocalSetup(process.argv[2] || 'all');
  for (const line of result.messages) console.log(line);
  if (!result.ok) process.exitCode = 1;
}
