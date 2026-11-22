import { execFileSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPackage = new URL('../package.json', import.meta.url);
const root = dirname(fileURLToPath(rootPackage));
const rootRequire = createRequire(rootPackage);
const webRequire = createRequire(new URL('../apps/web/package.json', import.meta.url));

execFileSync(process.execPath, [rootRequire.resolve('prisma'), 'generate'], {
  cwd: root,
  stdio: 'inherit',
});

function generatedClientDirectory(load) {
  return resolve(dirname(load.resolve('@prisma/client/package.json')), '../../.prisma/client');
}

// Prisma generates next to the root schema's client. pnpm can give web a different peer context.
const generated = generatedClientDirectory(rootRequire);
const webGenerated = generatedClientDirectory(webRequire);
if (generated !== webGenerated) cpSync(generated, webGenerated, { recursive: true });
