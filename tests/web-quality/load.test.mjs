import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { validate, runLoad } from './load.mjs';
import { summarize } from './load-report.mjs';
import { validateRestore } from './restore-check.mjs';
import { outputPath } from './evidence.mjs';

function fixture(origin = 'http://127.0.0.1:1') {
  return { environment: { kind: 'staging', id: 'owned-test', origin, syntheticOnly: true, productionOrigins: ['https://production.example.invalid'] }, candidateId: 'test-candidate', datasetId: 'test-dataset', output: 'tmp/web-quality/load-tool-self-test.json', maxFailureRate: .01,
    // Allow cold loopback requests while other test files compile; the timeout case stays at 100 ms.
    limits: { maxUsers: 2, maxDurationSeconds: 10, requestTimeoutMs: 1000, maxRequests: 100, maxResponseBytes: 10000, thinkTimeMs: 100, rampSeconds: 1 },
    accounts: [1, 2].map(i => ({ id: 'user-' + i, role: 'STUDENT', sessionEnv: 'LMS_LOAD_SESSION_' + i, bindings: {} })),
    scenarios: { mixed: [{ name: 'courses', role: 'STUDENT', method: 'GET', path: '/api/courses', status: 200, budget: { p95Ms: 2000, p99Ms: 5000 }, assertions: [{ pointer: '/courses', type: 'array' }] }] },
    integrity: [{ name: 'identity', accountId: 'user-1', path: '/api/auth/me', assertions: [{ pointer: '/user/id', equals: 'user-1' }] }] };
}
const env = origin => ({ LMS_LOAD_REVIEWED_ORIGIN: origin, LMS_LOAD_ENVIRONMENT_ID: 'owned-test', LMS_LOAD_SESSION_1: 'a'.repeat(32), LMS_LOAD_SESSION_2: 'b'.repeat(32) });
const options = { scenario: 'mixed', users: 2, duration: 3 };
test('load refuses implicit/production targets, absent identity approval and duplicate users/sessions', () => {
  for (const change of [c => c.environment.kind = 'production', c => c.environment.syntheticOnly = false, c => c.environment.productionOrigins.push(c.environment.origin), c => c.accounts[1].id = c.accounts[0].id, c => c.accounts[1].sessionEnv = c.accounts[0].sessionEnv]) {
    const c = fixture(); change(c); assert.throws(() => validate(c, options, env(c.environment.origin)));
  }
  assert.throws(() => validate(fixture(), options, {}));
  assert.throws(() => validate(fixture(), { ...options, users: 3 }, env(fixture().environment.origin)));
});
test('load refuses cross-origin paths, unapproved mutations, absent assertions and unbounded work', () => {
  for (const change of [c => c.scenarios.mixed[0].path = '//evil.invalid/api', c => c.scenarios.mixed[0].method = 'POST', c => c.scenarios.mixed[0].assertions = [], c => c.integrity = [], c => c.limits.maxRequests = Infinity]) {
    const c = fixture(); change(c); assert.throws(() => validate(c, options, env(c.environment.origin)));
  }
  assert.throws(() => outputPath('docs/should-not-be-written.json'));
});
test('percentiles and failures include policy 429, timeouts and data assertion failures', () => {
  const samples = Array.from({ length: 100 }, (_, i) => ({ ms: i + 1, bytes: 10, status: i === 0 ? 429 : 200, ok: i !== 0 }));
  const result = summarize(samples, { p95Ms: 95, p99Ms: 99, maxFailureRate: .01 });
  assert.equal(result.p95Ms, 95); assert.equal(result.p99Ms, 99); assert.equal(result.policy429, 1); assert.equal(result.result, 'FAIL');
  assert.equal(summarize([], { p95Ms: 1, p99Ms: 1, maxFailureRate: .01 }).result, 'FAIL');
});
test('real HTTP self-test proves successful work, incomplete responses, timeouts, caps and identity refusal', async () => {
  let mode = 'ok';
  const server = http.createServer((req, res) => {
    if (req.url === '/api/auth/me') return res.end(JSON.stringify({ user: { id: mode === 'identity' ? 'wrong-user' : req.headers.cookie.endsWith('a'.repeat(32)) ? 'user-1' : 'user-2' } }));
    if (mode === 'timeout') return; // Server sockets are explicitly closed below.
    if (mode === 'redirect') { res.writeHead(302, { Location: 'https://example.invalid' }); return res.end(); }
    if (mode === '429') { res.statusCode = 429; return res.end('{}'); }
    res.end(JSON.stringify(mode === 'incomplete' ? {} : { courses: [] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const m of ['ok', 'incomplete', 'timeout', 'redirect', '429', 'cap', 'identity']) {
      mode = m; const c = fixture(origin); if (m === 'cap') c.limits.maxRequests = 1;
      if (m === 'timeout') c.limits.requestTimeoutMs = 100;
      const report = await runLoad(c, options, env(origin));
      assert.equal(report.result, m === 'ok' ? 'PASS' : 'FAIL', m);
      if (m === 'ok') assert.equal(report.achieved.usersWithSuccessfulSteadyRequest, 2);
      if (m === 'timeout') assert.ok(report.summary.timeouts > 0);
      assert.ok(!JSON.stringify(report).includes('a'.repeat(32)), 'No credentials in evidence');
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('restore comparison refuses same database, missing ownership, inherited credentials and remote weak TLS', () => {
  const config = { syntheticOnly: true, environmentKind: 'staging', environmentId: 'test', ownershipNonce: 'test-nonce', allowedHosts: ['127.0.0.1', 'db.example.invalid'], sourceUrlEnv: 'LMS_QUALITY_SOURCE', restoredUrlEnv: 'LMS_QUALITY_RESTORED', backupCapturedAt: new Date().toISOString() };
  const e = { LMS_QUALITY_SOURCE: 'postgresql://synthetic@127.0.0.1/source', LMS_QUALITY_RESTORED: 'postgresql://synthetic@127.0.0.1/harness_restore_test' };
  assert.equal(validateRestore(config, e).length, 2);
  assert.throws(() => validateRestore(config, { ...e, LMS_QUALITY_RESTORED: e.LMS_QUALITY_SOURCE }));
  assert.throws(() => validateRestore({ ...config, sourceUrlEnv: 'DATABASE_URL' }, { DATABASE_URL: e.LMS_QUALITY_SOURCE }));
  assert.throws(() => validateRestore(config, { ...e, LMS_QUALITY_RESTORED: 'postgresql://synthetic@db.example.invalid/harness_restore_test?sslmode=require' }));
});
