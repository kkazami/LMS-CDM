import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensure, relativeFile } from './contracts';
import { Risk, Snapshot } from './types';

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  ensure(value !== undefined, 'Undefined cannot be serialized'); return JSON.stringify(value);
}
export function hash(value: string | Buffer): string { return createHash('sha256').update(value).digest('hex'); }
export function digest(value: unknown): string { return hash(canonical(value)); }
export function failureSignature(stage: string, reasons: string[]): string {
  const normalized = reasons.map(reason => reason
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'EXECUTION_ID')
    .replace(/commands\/\d+\//g, 'commands/ATTEMPT/')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, 'TIMESTAMP')).sort();
  return digest({ stage, reasons: normalized });
}
export function safePath(root: string, file: string): string {
  relativeFile(file); const target = path.resolve(root, file);
  const base = fs.realpathSync(root);
  let parent = target;
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  const real = fs.realpathSync(parent);
  ensure(real === base || real.startsWith(base + path.sep), 'Path escapes root through a link');
  return target;
}
export function secret(file: string): boolean { return /(^|\/)(\.env($|\.)|[^/]*\.(pem|key)$|\.auth\/|credentials)/i.test(file) && !file.endsWith('.example'); }
const generated = /(^|\/)(node_modules|\.pnpm-store|\.git|\.next|\.turbo|dist|build|\.expo)(\/|$)|^\.orchestra\/(runs|logs)\/|^playwright\/(results|report|\.auth)\/|^test-results\/|\.tsbuildinfo$/;
export function snapshot(root: string): Snapshot {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
  const head = git('rev-parse', 'HEAD');
  const files: Record<string, string> = {};
  const names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  for (const name of [...new Set(names)].sort()) {
    if (generated.test(name) || secret(name) || name.startsWith('.agent/')) continue;
    const target = safePath(root, name);
    if (fs.existsSync(target)) { ensure(fs.lstatSync(target).isFile(), `Unsupported source link/directory: ${name}`); files[name] = hash(fs.readFileSync(target)); }
    else files[name] = 'DELETED';
  }
  const index = hash(git('diff', '--cached', '--raw', '--no-abbrev', '--no-renames'));
  return { head, index, files, digest: digest({ head, index, files }) };
}
export function changed(a: Snapshot, b: Snapshot): string[] {
  return [...new Set([...Object.keys(a.files), ...Object.keys(b.files)])].filter(f => a.files[f] !== b.files[f]).sort();
}
export const RISK_ORDER: Risk[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export function maxRisk(...risks: Risk[]): Risk { return RISK_ORDER[Math.max(...risks.map(r => RISK_ORDER.indexOf(r)))]; }
export function classify(files: string[], operations: string[]): Risk {
  let risk: Risk = 'LOW';
  for (const f of files) {
    if (/^(apps|packages)\//.test(f)) risk = maxRisk(risk, 'MEDIUM');
    if (/^prisma\/|^\.agents\/|^\.orchestra\/|^scripts\/harness|^scripts\/migrate|^package\.json$|^pnpm-lock\.yaml$|^\.github\/|(^|\/)(api-auth|auth[^/]*|rbac|db|middleware|cors|security[^/]*|permissions?|actions?)(\.|\/)|\(dashboard\)\/\[institute\]\/layout\.tsx$|\/api\/|webhook|integration|privacy|enroll/i.test(f)) risk = maxRisk(risk, 'HIGH');
    if (secret(f)) risk = 'CRITICAL';
  }
  for (const op of operations) {
    if (/production|destructive|delete.data|secrets|bulk.data/i.test(op)) risk = 'CRITICAL';
    else if (/auth|rbac|database|migration|privacy|external|deploy|security/i.test(op)) risk = maxRisk(risk, 'HIGH');
    else risk = maxRisk(risk, 'MEDIUM');
  }
  return risk;
}
export function destructiveDiff(root: string, before: Snapshot, after: Snapshot): boolean {
  return changed(before, after).some(file => {
    if (!/^prisma\/migrations\/.*\.sql$|^scripts\/migrate/.test(file)) return false;
    if (after.files[file] === 'DELETED' || !after.files[file]) return true;
    return /\b(DROP\s+(TABLE|COLUMN|TYPE|SCHEMA)|TRUNCATE|DELETE\s+FROM)\b/i.test(fs.readFileSync(safePath(root, file), 'utf8'));
  });
}
export function buildOutputs(root: string, directory: string): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (file: string) => {
    const target = safePath(root, file); ensure(fs.existsSync(target), `Missing build output ${file}`);
    const stat = fs.lstatSync(target); ensure(!stat.isSymbolicLink(), `Unsupported build symlink ${file}`);
    if (stat.isDirectory()) {
      for (const item of fs.readdirSync(target).sort()) if (!['cache', 'logs', 'trace', 'trace-build', 'diagnostics'].includes(item)) visit(file + '/' + item);
    } else if (stat.isFile()) result[file] = hash(fs.readFileSync(target));
  };
  visit(directory); ensure(Object.keys(result).length > 0, 'Empty build output'); return result;
}
