import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import { fixture } from './helpers';
import { execute } from '../../scripts/harness/runner';

for (const mode of ['only', 'skip']) test(`real private Playwright adapter rejects ${mode} and records failed execution`, async t => {
  const initial = {
    'package.json': JSON.stringify({ private: true, scripts: { 'harness:typecheck': 'node tests/probe.cjs', 'harness:test': 'node tests/probe.cjs' } }),
    'tests/probe.cjs': `require('node:fs').writeFileSync(process.env.HARNESS_RESULT_PATH,JSON.stringify({environment:process.env.HARNESS_ENVIRONMENT_ID,tests:[{id:'sample case',status:'passed',executed:true}]}))`,
    'playwright.config.ts': `export default { use:{baseURL:process.env.E2E_BASE_URL} };`,
    '.orchestra/harness/playwright.config.ts': fs.readFileSync('.orchestra/harness/playwright.config.ts', 'utf8'),
    '.orchestra/harness/fixture-server.cjs': fs.readFileSync('.orchestra/harness/fixture-server.cjs', 'utf8'),
    'tests/harness-fixtures/blocked.spec.ts': `import {test,expect} from '@playwright/test';test.${mode}('blocked browser case',async()=>{expect(1).toBe(1)});`,
  };
  const f = fixture(t, [], initial); fs.symlinkSync(path.resolve('node_modules'), path.join(f.root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  f.plan.browser = true; f.plan.commands.forEach(command => command.timeoutMs = 15000);
  f.plan.commands.push({ id: 'browser', program: 'pnpm', args: ['exec', 'playwright', 'test', '--config', '.orchestra/harness/playwright.config.ts'], domain: 'browser', criteria: ['AC-1'], coverage: ['browser-behavior'], tests: ['blocked browser case'], timeoutMs: 30000 });
  f.prepare(); f.implement();
  const port = await new Promise<number>(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); }); });
  const previous = process.env.HARNESS_TEST_BASE_URL; process.env.HARNESS_TEST_BASE_URL = `http://127.0.0.1:${port}`;
  const lease = f.begin('validation');
  try { await assert.rejects(execute(f.c, 'validation', f.input.actors.runner, lease.token), /failed/); }
  finally { if (previous === undefined) delete process.env.HARNESS_TEST_BASE_URL; else process.env.HARNESS_TEST_BASE_URL = previous; }
  const evidence = f.c.read().commands.find(command => command.commandId === 'browser')!;
  assert.equal(evidence.status, 'FAIL'); assert.ok(evidence.outputHash);
  if (mode === 'only') assert.notEqual(evidence.exitCode, 0);
  else { assert.equal(evidence.exitCode, 0); assert.ok(evidence.resultHash); const report = JSON.parse(fs.readFileSync(path.join(f.c.store.dir, evidence.result!), 'utf8')); assert.equal(report.tests[0].executed, false); }
  assert.equal(f.c.read().state, 'FAILED'); assert.throws(() => f.c.verify());
});
