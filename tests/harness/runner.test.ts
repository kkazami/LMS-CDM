import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execute } from '../../scripts/harness/runner';
import { fixture } from './helpers';

test('runner captures real commands and named results at the final source state', async t => {
  const f = fixture(t, [], {
    'package.json': JSON.stringify({ private: true, scripts: { 'harness:typecheck': 'node tests/probe.cjs static', 'harness:test': 'node tests/probe.cjs behavior' } }),
    'tests/probe.cjs': `const fs = require('node:fs'); const assert = require('node:assert/strict'); assert.equal(process.env.CI, 'true'); assert.equal(process.env.DATABASE_URL, undefined); if (process.argv[2] === 'behavior') fs.writeFileSync(process.env.HARNESS_RESULT_PATH, JSON.stringify({environment:process.env.HARNESS_ENVIRONMENT_ID,tests:[{id:'sample case',status:'passed',executed:true}]})); console.log('real fixture command');`,
  });
  f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement();
  const { token } = f.begin('validation');
  await execute(f.c, 'validation', f.input.actors.runner, token);
  const evidence = f.c.read().commands; assert.equal(evidence.length, 2); assert.ok(evidence.every(e => e.exitCode === 0 && e.status === 'PASS' && e.outputHash)); assert.ok(evidence[1].resultHash);
  f.c.submit('validation', f.input.actors.runner, token, { evidence: evidence.map(e => e.id) }); assert.equal(f.c.read().state, 'VALIDATED');
});
test('runner fails on a zero-exit command that omits mapped results', async t => {
  const f = fixture(t, [], { 'package.json': JSON.stringify({ private: true, scripts: { 'harness:typecheck': 'node --version', 'harness:test': 'node --version' } }) }); f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement();
  const { token } = f.begin('validation');
  await assert.rejects(execute(f.c, 'validation', f.input.actors.runner, token), /failed/); assert.equal(f.c.read().state, 'FAILED'); assert.equal(f.c.read().commands[1].exitCode, 0); assert.equal(f.c.read().commands[1].status, 'FAIL');
});
test('runner times out a command and preserves the failure', async t => {
  const f = fixture(t, [], { 'package.json': JSON.stringify({ private: true, scripts: { 'harness:typecheck': 'node tests/hang.cjs', 'harness:test': 'node --version' } }), 'tests/hang.cjs': 'setTimeout(() => {}, 30000)' }); f.plan.commands[0].timeoutMs = 500; f.prepare(); f.implement();
  const { token } = f.begin('validation');
  await assert.rejects(execute(f.c, 'validation', f.input.actors.runner, token), /timed out/); assert.equal(f.c.read().state, 'FAILED'); assert.equal(f.c.read().commands[0].status, 'FAIL');
});
