import fs from 'node:fs';
import path from 'node:path';

export function createWebWorkspace(output) {
  if (!path.resolve(output).startsWith(path.resolve('tmp/roster-import') + path.sep)) throw new Error('Test output must stay inside tmp/roster-import.');
  const workspace = fs.mkdtempSync(path.join(output, 'web-workspace-'));
  const appDir = path.join(workspace, 'apps/web');
  fs.mkdirSync(appDir, { recursive: true });
  for (const dir of ['src', 'public']) fs.cpSync(path.resolve('apps/web', dir), path.join(appDir, dir), { recursive: true, filter: source => !source.replaceAll('\\', '/').includes('/public/uploads') });
  for (const file of ['package.json', 'tsconfig.json', 'postcss.config.js', 'postcss.config.mjs', 'next.config.ts']) if (fs.existsSync(path.resolve('apps/web', file))) fs.copyFileSync(path.resolve('apps/web', file), path.join(appDir, file));
  for (const file of ['package.json', 'tsconfig.base.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) fs.copyFileSync(path.resolve(file), path.join(workspace, file));
  const links = [[path.resolve('apps/web/node_modules'), path.join(appDir, 'node_modules')], [path.resolve('node_modules'), path.join(workspace, 'node_modules')], [path.resolve('packages'), path.join(workspace, 'packages')]];
  for (const [target, link] of links) fs.symlinkSync(target, link, 'junction');
  return { appDir, dispose() {
    if (!path.resolve(workspace).startsWith(path.resolve(output) + path.sep) || fs.lstatSync(workspace).isSymbolicLink()) throw new Error('Test workspace cleanup boundary mismatch.');
    for (const [, link] of links) if (fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link);
    fs.rmSync(workspace, { recursive: true, force: true });
  } };
}
