import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function outputPath(file) {
  const target = path.resolve(file), root = path.resolve('tmp/web-quality') + path.sep;
  if (!target.startsWith(root)) throw Error('Evidence must be inside tmp/web-quality.');
  // Refuse junctions/symlinks in every existing parent, including the evidence root.
  for (let p = path.dirname(target); p !== path.dirname(p); p = path.dirname(p)) {
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw Error('Linked evidence directory refused.');
  }
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Error('Linked evidence file refused.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target;
}
export function sourceFingerprint() {
  const hash = createHash('sha256');
  function add(file) {
    if (file.replaceAll('\\', '/').startsWith('apps/web/public/uploads')) return;
    const stat = fs.lstatSync(file);
    if (stat.isDirectory()) for (const name of fs.readdirSync(file).sort()) add(path.join(file, name));
    else if (stat.isFile()) { hash.update(file.replaceAll('\\', '/')); hash.update(fs.readFileSync(file)); }
  }
  for (const file of ['apps/web/src', 'apps/web/public', 'apps/web/package.json', 'apps/web/next.config.ts', 'packages/api-client/src/index.ts', 'prisma/schema.prisma', 'pnpm-lock.yaml']) add(file);
  return hash.digest('hex');
}
export function requiredText(value, label) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(value)) throw Error('Invalid ' + label);
  return value;
}
export function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw Error('Invalid ' + label);
  return value;
}
export function pointer(value, pointer) {
  if (pointer === '') return value;
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) throw Error('Expected JSON pointer.');
  return pointer.slice(1).split('/').reduce((v, k) => v?.[k.replaceAll('~1', '/').replaceAll('~0', '~')], value);
}
export function flags(argv, allowed) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!allowed.includes(argv[i]) || argv[i + 1] === undefined || argv[i + 1].startsWith('--')) throw Error('Invalid arguments.');
    if (result[argv[i]]) throw Error('Duplicate argument.');
    result[argv[i]] = argv[i + 1];
  }
  return result;
}
