const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = process.cwd();
const summary = [];
function files(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file, predicate) : predicate(file) ? [file] : [];
  });
}
function run(name, args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, env: process.env,
    encoding: 'utf8', timeout: 600000, maxBuffer: 8 * 1024 * 1024 });
  console.log(`\nCHECK ${name}\n${result.stdout || ''}\n${result.stderr || ''}`);
  summary.push({ name, exitCode: result.status, signal: result.signal, error: result.error?.message ?? null });
}
const loader = path.join(root, 'tests/security/typescript-register.cjs');
const tests = files(path.join(root, 'tests'), file => /\.test\.(?:ts|cjs|mjs)$/.test(file) &&
  !/audit-regressions\.test|activity-grading\.test/.test(file));
run(`all existing Node test files (${tests.length})`, ['--require', loader, '--test', '--test-concurrency=1', ...tests]);
const webUnits = files(path.join(root, 'apps/web/src/lib'), file => /\.test\.ts$/.test(file));
run(`web unit tests (${webUnits.length})`, ['--require', loader, '--test', '--test-concurrency=1', ...webUnits], path.join(root, 'apps/web'));
const tsc = require.resolve('typescript/lib/tsc.js');
for (const [name, project] of [['web', 'apps/web/tsconfig.json'], ['mobile', 'apps/mobile/tsconfig.json'], ['desktop', 'apps/desktop/tsconfig.json'], ['harness', 'scripts/harness/tsconfig.json']]) {
  run(`${name} typecheck`, ['--max-old-space-size=3072', tsc, '--project', project, '--noEmit', '--incremental', 'false']);
}
const playwright = require.resolve('@playwright/test/cli');
run('existing Playwright E2E suite', [playwright, 'test', '--workers=1', '--retries=0', '--timeout=10000']);
for (const config of files(path.join(root, 'tests'), file => /playwright\.config\.(?:ts|js|mjs)$/.test(file))) {
  run(`Playwright ${path.relative(root, config)}`, [playwright, 'test', '--config', config, '--workers=1', '--retries=0', '--timeout=10000']);
}
for (const script of files(path.join(root, 'tests'), file => /(?:integration|\.browser)\.mjs$/.test(file))) {
  run(`integration ${path.relative(root, script)}`, [script]);
}
console.log('FULL_CHECK_RESULTS ' + JSON.stringify(summary));
process.exitCode = summary.every(check => check.exitCode === 0) ? 0 : 1;
