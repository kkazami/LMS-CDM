import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildOutputs, digest } from '../../scripts/harness/repository';
import { fixture } from './helpers';
import { assertCleanTestCheckout } from '../../scripts/harness/runner';

test('every quality/profile preserves the mandatory security and review roles', () => {
  const root = path.resolve(__dirname, '../..');
  const quality = JSON.parse(fs.readFileSync(path.join(root, '.orchestra/harness/quality-levels.json'), 'utf8'));
  for (const level of ['standard', 'strict', 'maximum']) { assert.equal(quality[level].securityRequired, true); assert.equal(quality[level].codeReviewRequired, true); }
  for (const file of fs.readdirSync(path.join(root, '.orchestra/harness/profiles'))) {
    const profile = JSON.parse(fs.readFileSync(path.join(root, '.orchestra/harness/profiles', file), 'utf8'));
    for (const role of ['architecture-red-team', 'architecture-adjudicator', 'security', 'code-review', 'release']) assert.ok(profile.agents.includes(role), `${file} omits ${role}`);
    assert.equal(profile.version, 2);
  }
});
test('generated build artifact changes have a separate fingerprint', t => {
  const f = fixture(t); f.write('apps/web/.next/server/app.js', 'built-v1'); const before = digest(buildOutputs(f.root, 'apps/web/.next'));
  f.write('apps/web/.next/server/app.js', 'built-v2'); assert.notEqual(digest(buildOutputs(f.root, 'apps/web/.next')), before);
});
test('a mobile task cannot hide in a bugfix profile without native verification', t => {
  const f = fixture(t, [], {}, 'bugfix'); f.plan.files.push('apps/mobile/app/index.tsx'); f.prepare('adjudication'); assert.throws(() => f.submit('plan', f.plan), /mobile-typecheck/);
});
test('a large shared-dependency execution graph validates without exponential traversal', { timeout: 15000 }, t => {
  const f = fixture(t); f.prepare('adjudication');
  for (let i = 2; i <= 65; i++) f.plan.tasks.push({ id: `TASK-${i}`, description: 'Shared prerequisite graph', criteria: ['AC-1'], dependsOn: i > 2 ? [`TASK-${i - 1}`, `TASK-${i - 2}`] : ['TASK-1'], findings: [] });
  f.submit('plan', f.plan); assert.equal(f.c.read().state, 'PLAN_READY');
});
test('product checks cannot load live dotenv files even when the parent environment is scrubbed', t => {
  const f = fixture(t, [], { '.env': 'LIVE_CONFIG_PRESENT=true' }); assert.throws(() => assertCleanTestCheckout(f.root), /clean checkout/);
});
