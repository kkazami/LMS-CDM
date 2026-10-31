import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const evidenceRoot = path.resolve('docs/ohmward/evidence/sprint-1');
export const sha = value => createHash('sha256').update(value).digest('hex');
export function sourceManifest() {
  const listed = execFileSync('git', ['-c', 'core.fsmonitor=false', 'ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
  const files = [...new Set(listed)].filter(file => /^(apps\/web\/src\/|prisma\/|tests\/|scripts\/ohmward\/)/.test(file) || ['.env.example','package.json','pnpm-lock.yaml','playwright.ohmward.config.ts','apps/web/package.json'].includes(file)).filter(file => fs.existsSync(file)).sort();
  const entries = files.map(file => ({ file, sha256: sha(fs.readFileSync(file)) }));
  return { fingerprint: sha(JSON.stringify(entries)), entries };
}
export function safeEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMW6432|NUMBER_OF_PROCESSORS)$/i.test(key)));
}
