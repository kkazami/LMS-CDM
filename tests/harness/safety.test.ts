import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Controller } from '../../scripts/harness/controller';
import { gate, SECURITY_BOUNDARIES, DATABASE_COVERAGE } from '../../scripts/harness/gates';
import { classify, digest, failureSignature, snapshot } from '../../scripts/harness/repository';
import { checkResults } from '../../scripts/harness/results';
import { reduce } from '../../scripts/harness/state';
import { MAX_REPAIRS } from '../../scripts/harness/types';
import { fixture } from './helpers';
import { sanitize } from '../../scripts/harness/redaction';

test('planner cannot proceed without architecture adjudication', t => {
  const f = fixture(t); f.prepare('red-team'); assert.throws(() => f.begin('plan'), /cannot be claimed/);
});
test('critical architecture issue cannot be deferred', t => {
  const f = fixture(t); f.findings.push({ id: 'F-1', severity: 'CRITICAL', requirement: 'REQ-1', evidence: ['README.md'], impact: 'Data loss', recommendation: 'Resolve design', confidence: 1, humanDecision: false }); f.prepare('red-team');
  assert.throws(() => f.submit('adjudication', { decisions: [{ id: 'F-1', disposition: 'DEFERRED', reason: 'Later', evidence: ['README.md'], resolution: 'Later' }], architecture: 'proposal' }), /Cannot defer/);
});
test('unresolved adjudication blocks the planner', t => {
  const f = fixture(t); f.findings.push({ id: 'F-1', severity: 'HIGH', requirement: 'REQ-1', evidence: ['README.md'], impact: 'Ambiguous ownership', recommendation: 'Human decision', confidence: 1, humanDecision: true }); f.prepare('red-team');
  assert.throws(() => f.submit('adjudication', { decisions: [{ id: 'F-1', disposition: 'NEEDS_HUMAN_DECISION', reason: 'Ambiguous', evidence: ['README.md'], resolution: 'Pending' }], architecture: 'proposal' }), /Unresolved mandatory/);
  assert.throws(() => f.begin('plan'));
});
test('high risk implementation requires an externally signed approval', t => {
  const f = fixture(t); f.plan.operations.push('security-control-change');
  f.plan.commands.push({ id: 'negative', program: 'node', args: ['tests/behavior.ts'], domain: 'security', criteria: ['AC-1'], coverage: SECURITY_BOUNDARIES, tests: ['sample case'], timeoutMs: 1000 }); f.prepare();
  assert.equal(f.c.read().risk, 'HIGH'); assert.throws(() => f.begin('implementation'), /signed human/);
  f.approve(); assert.doesNotThrow(() => f.begin('implementation'));
});
test('test evidence becomes stale after a source change including untracked files', t => {
  const f = fixture(t); f.prepare(); f.implement(); f.validate(); f.write('docs/note.md', 'changed');
  assert.throws(() => f.c.verify(), /source differs/); const r = f.c.status(); assert.equal(r.next, 'implementation'); assert.equal(r.artifacts.validation, undefined); assert.ok(r.history.length >= 3);
});
test('security-sensitive code change invalidates security review and planning', t => {
  const f = fixture(t); f.prepare(); f.implement(); const ids = f.validate();
  f.submit('qa', { verdict: 'PASS', diffDigest: snapshot(f.root).digest, evidence: ids, findings: [], criteria: [{ id: 'AC-1', status: 'PASS', evidence: ['behavior-0'] }] });
  f.submit('security', { verdict: 'PASS', diffDigest: snapshot(f.root).digest, evidence: ids, findings: [], boundaries: SECURITY_BOUNDARIES.map(id => ({ id, assessment: 'No security change in fixture', evidence: ids })) });
  f.write('apps/web/src/lib/api-auth.ts', 'changed authorization'); assert.equal(f.c.status().next, 'recon'); assert.equal(f.c.read().artifacts.security, undefined);
});
test('schema change invalidates previous validation and requires new migration planning', t => {
  const f = fixture(t); f.prepare(); f.implement(); f.validate(); f.write('prisma/schema.prisma', 'changed schema'); assert.equal(f.c.status().next, 'recon'); assert.equal(f.c.read().artifacts.validation, undefined);
});
test('repair loop enforces the hard maximum', t => {
  const f = fixture(t); f.prepare();
  for (let i = 0; i <= MAX_REPAIRS; i++) { f.c.fail('implementation', [`failure-${i}`]); if (i < MAX_REPAIRS) f.c.repair(); }
  assert.equal(f.c.read().state, 'HUMAN_REVIEW_REQUIRED'); assert.throws(() => f.c.repair(), /ceiling/); assert.equal(f.c.read().repairCount, MAX_REPAIRS);
});
test('three identical failures escalate and preserve all history', t => {
  const f = fixture(t); f.prepare(); for (let i = 0; i < 3; i++) { f.c.fail('implementation', ['same failure']); if (i < 2) f.c.repair(); }
  assert.equal(f.c.read().state, 'HUMAN_REVIEW_REQUIRED'); assert.equal(f.c.read().failures.length, 3);
});
test('crashed agent lease prevents completion and requires explicit recovery', t => {
  const f = fixture(t); f.prepare(); f.begin('implementation');
  const restarted = new Controller(f.root, 'run_test', f.c.publicKey); assert.throws(() => restarted.verify(), /in-progress/);
  assert.throws(() => restarted.begin('implementation', f.input.actors.executor, f.capabilities.executor), /cannot be claimed/); restarted.store.recover('agent crashed'); assert.equal(restarted.read().state, 'INTERRUPTED');
});
test('partial run resumes deterministically without replaying accepted stages', t => {
  const f = fixture(t); f.prepare('recon'); const before = f.c.read().artifacts.recon!.hash;
  f.begin('red-team'); f.c.interrupt('pause'); f.c.resume(); assert.equal(f.c.read().next, 'red-team'); assert.equal(f.c.read().artifacts.recon!.hash, before);
});
test('illegal implementation to complete transition is rejected', t => {
  const f = fixture(t); f.prepare(); assert.throws(() => f.begin('release'), /cannot be claimed/);
});
test('passing evidence from a different run or revision is rejected', t => {
  const f = fixture(t); f.prepare('requirements'); const a = f.c.read().artifacts.requirements!.envelope;
  assert.throws(() => gate(f.c.read(), { ...a, runId: 'run_other' }, new Date().toISOString()), /Foreign/);
  f.write('untracked.ts', 'new source'); assert.notEqual(snapshot(f.root).digest, a.snapshot.digest);
});
test('standard quality cannot bypass mandatory independent security and code review', t => {
  const f = fixture(t); f.prepare(); f.implement(); const ids = f.validate(); f.submit('qa', { verdict: 'PASS', diffDigest: snapshot(f.root).digest, evidence: ids, findings: [], criteria: [{ id: 'AC-1', status: 'PASS', evidence: ['behavior-0'] }] });
  assert.throws(() => f.begin('release'), /cannot be claimed/); assert.equal(f.c.read().next, 'security');
});
test('unresolved high code review finding blocks final release', t => {
  const f = fixture(t); f.prepare(); f.implement(); const ids = f.validate(), diffDigest = snapshot(f.root).digest;
  f.submit('qa', { verdict: 'PASS', diffDigest, evidence: ids, findings: [], criteria: [{ id: 'AC-1', status: 'PASS', evidence: ['behavior-0'] }] });
  f.submit('security', { verdict: 'PASS', diffDigest, evidence: ids, findings: [], boundaries: SECURITY_BOUNDARIES.map(id => ({ id, assessment: 'No sensitive change', evidence: ids })) });
  assert.throws(() => f.submit('code-review', { verdict: 'PASS', diffDigest, evidence: ids, findings: [{ id: 'BLOCK', severity: 'HIGH', resolved: false, issue: 'Broken invariant', evidence: ['README.md'] }], resolutions: [] }), /Unresolved blocking/);
  assert.throws(() => f.begin('release'));
});
test('successful code-only lifecycle ends at release readiness without claiming deployment', t => {
  const f = fixture(t); f.prepare(); f.implement(); const ids = f.validate(), diffDigest = snapshot(f.root).digest;
  f.submit('qa', { verdict: 'PASS', diffDigest, evidence: ids, findings: [], criteria: [{ id: 'AC-1', status: 'PASS', evidence: ['behavior-0'] }] });
  f.submit('security', { verdict: 'PASS', diffDigest, evidence: ids, findings: [], boundaries: SECURITY_BOUNDARIES.map(id => ({ id, assessment: 'No sensitive change', evidence: ids })) });
  f.submit('code-review', { verdict: 'PASS', diffDigest, evidence: ids, findings: [], resolutions: [] });
  f.submit('release', { ready: true, recovery: 'Revert fixture' }); assert.equal(f.c.verify().ready, true); assert.equal(f.c.read().state, 'RELEASE_READY'); assert.equal(f.c.read().next, null);
});
test('requirement and task orphans are rejected', t => {
  const f = fixture(t); f.prepare('adjudication'); f.plan.tasks[0].criteria = ['AC-REMOVED']; assert.throws(() => f.submit('plan', f.plan), /Orphan/);
});
test('schema work cannot use a build as migration evidence', t => {
  const f = fixture(t); f.plan.files.push('prisma/schema.prisma'); f.prepare('adjudication'); assert.throws(() => f.submit('plan', f.plan), /Harness-only scope/);
  assert.equal(DATABASE_COVERAGE.includes('migration-apply'), true);
});
test('review identities must differ from creators and other reviewers', t => {
  const f = fixture(t); assert.throws(() => new Controller(f.root, 'run_duplicate').init({ ...f.input, actors: { ...f.input.actors, security: f.input.actors.executor } }), /distinct actor/);
});
test('failed command cannot be overwritten by later success in the same attempt', t => {
  const f = fixture(t); f.prepare(); f.implement(); f.begin('validation'); f.capture('behavior', 'FAIL'); assert.throws(() => f.capture('behavior'), /Duplicate execution|EEXIST/);
});
test('tampered artifacts and mutable state projections cannot forge a pass', t => {
  const f = fixture(t); f.prepare('requirements'); fs.writeFileSync(path.join(f.c.store.dir, 'state.json'), '{"state":"COMPLETE"}'); assert.equal(f.c.read().state, 'REQUIREMENTS_READY');
  fs.writeFileSync(path.join(f.c.store.dir, f.c.read().artifacts.requirements!.path), '{}'); assert.throws(() => f.c.read(), /tampered/);
});
test('wrong run ID path and traversal are rejected', t => {
  const f = fixture(t); assert.throws(() => new Controller(f.root, '../escape'), /Unsafe run ID/); assert.throws(() => f.c.store.put('../escape', 'x'), /Unsafe file path/);
});
test('expired or forged human approval is rejected', t => {
  const f = fixture(t); f.prepare(); assert.throws(() => f.approve('implementation', undefined, Date.now() - 1000), /invalid/);
  assert.throws(() => f.c.approve({ payload: { version: 2, runId: 'run_test', purpose: 'implementation', subject: 'fake', risk: 'HIGH', human: 'agent', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10000).toISOString() }, signature: 'fake' }), /invalid/);
});
test('empty, skipped and foreign-environment test reports cannot pass', () => {
  const spec = { id: 'test', program: 'node' as const, args: ['test.js'], domain: 'runtime' as const, criteria: ['AC'], coverage: ['behavior'], tests: ['expected'], timeoutMs: 1000 };
  assert.throws(() => checkResults({ environment: 'env', tests: [] }, spec, 'env'), /empty/);
  assert.throws(() => checkResults({ environment: 'env', tests: [{ id: 'expected', status: 'skipped', executed: false }] }, spec, 'env'), /skipped/);
  assert.throws(() => checkResults({ environment: 'old', tests: [{ id: 'expected', status: 'passed', executed: true }] }, spec, 'env'), /environment mismatch/);
});
test('interrupted deployment cannot resume or replay side effects', t => {
  const f = fixture(t); const r = { ...f.c.read(), state: 'RELEASE_READY', next: 'deployment' as const, input: { ...f.input, deployment: true } };
  const interrupted = reduce(r, { type: 'INTERRUPT', reason: 'machine restart' }, new Date().toISOString());
  assert.equal(interrupted.deploymentUncertain, true); assert.throws(() => reduce(interrupted, { type: 'RESUME', snapshot: r.baseline, deploymentReconciled: false }, new Date().toISOString()), /uncertain/);
});
test('risk classification is conservative for repository security boundaries', () => {
  assert.equal(classify(['apps/web/src/app/api/items/route.ts'], []), 'HIGH'); assert.equal(classify(['prisma/schema.prisma'], []), 'HIGH'); assert.equal(classify(['.orchestra/harness/policies.json'], []), 'HIGH'); assert.equal(classify([], ['production-deployment']), 'CRITICAL');
});
test('journal rejects truncated tails and recovers only the incomplete record', t => {
  const f = fixture(t); f.prepare('requirements'); fs.appendFileSync(path.join(f.c.store.dir, 'journal.jsonl'), '{broken'); assert.throws(() => f.c.read(), /journal tail/); f.c.store.recover('recover interrupted append'); assert.equal(f.c.read().state, 'REQUIREMENTS_READY');
});
test('knowing another actor ID cannot claim its stage without its capability', t => {
  const f = fixture(t); assert.throws(() => f.c.begin('requirements', f.input.actors.requirement, f.capabilities.executor), /role capability/); assert.throws(() => f.c.begin('requirements', f.input.actors.requirement, ''), /role capability/);
});
test('lease bearer token is absent from durable state and journal', t => {
  const f = fixture(t); const { token } = f.begin('requirements'); assert.ok(!JSON.stringify(f.c.read()).includes(token)); assert.ok(!fs.readFileSync(path.join(f.c.store.dir, 'journal.jsonl'), 'utf8').includes(token));
});
test('evidence redacts known credentials, database URLs and private keys', () => {
  const raw = 'password="live-secret" postgresql://user:secret@host/database -----BEGIN PRIVATE KEY-----\nprivate material\n-----END PRIVATE KEY-----';
  const result = sanitize(raw); assert.ok(!result.includes('live-secret')); assert.ok(!result.includes('user:secret')); assert.ok(!result.includes('private material'));
});
test('schema changes after migration rehearsal evidence invalidate the database gate', t => {
  const f = fixture(t, [], {}, 'database'); f.plan.files.push('prisma/schema.prisma');
  f.plan.commands.push(
    { id: 'web-types', program: 'pnpm', args: ['--filter', 'web', 'exec', 'tsc', '--noEmit'], domain: 'static', criteria: [], coverage: ['web-typecheck'], tests: [], timeoutMs: 1000 },
    { id: 'build', program: 'pnpm', args: ['build:web'], domain: 'static', criteria: [], coverage: ['web-build'], tests: [], timeoutMs: 1000 },
    { id: 'schema', program: 'pnpm', args: ['exec', 'prisma', 'validate'], domain: 'static', criteria: [], coverage: ['schema-validation'], tests: [], timeoutMs: 1000 },
    { id: 'boundaries', program: 'node', args: ['tests/behavior.ts'], domain: 'security', criteria: ['AC-1'], coverage: SECURITY_BOUNDARIES, tests: ['sample case'], timeoutMs: 1000 },
    { id: 'migration', program: 'node', args: ['tests/behavior.ts'], domain: 'database', criteria: ['AC-1'], coverage: DATABASE_COVERAGE.filter(c => c !== 'schema-validation'), tests: ['sample case'], timeoutMs: 1000 },
  );
  f.prepare(); f.approve(); f.implement(); f.validate(); assert.ok(f.c.read().commands.some(c => c.commandId === 'migration' && c.status === 'PASS'));
  f.write('prisma/schema.prisma', 'changed after rehearsal'); assert.equal(f.c.status().artifacts.validation, undefined); assert.equal(f.c.read().next, 'implementation');
});
test('schema profile cannot waive database application and upgrade checks', t => {
  const f = fixture(t, [], {}, 'database'); f.plan.files.push('prisma/schema.prisma'); f.prepare('adjudication'); assert.throws(() => f.submit('plan', f.plan), /Mandatory validation missing/);
});
test('controller refuses inline eval command adapters', t => {
  const f = fixture(t); f.prepare('adjudication'); f.plan.commands[1].args = ['-e', 'process.exit(0)']; assert.throws(() => f.submit('plan', f.plan), /Inline evaluation/);
});
test('unexpected higher-risk changes escalate instead of entering ordinary repair', t => {
  const f = fixture(t); f.prepare(); const { token } = f.begin('implementation'); f.write('apps/web/src/lib/api-auth.ts', 'unexpected security change');
  assert.throws(() => f.c.submit('implementation', f.input.actors.executor, token, { files: ['docs/note.md'], summary: 'claimed safe' }), /approved file scope/);
  assert.equal(f.c.read().state, 'HUMAN_REVIEW_REQUIRED'); assert.equal(f.c.read().risk, 'HIGH'); assert.throws(() => f.c.repair(), /ceiling|reconciliation/);
});
test('volatile execution IDs do not hide repeated failure patterns', () => {
  const first = failureSignature('validation', ['missing commands/1/12345678-1234-1234-1234-123456789abc.result.json at 2026-10-03T00:00:00Z']);
  const next = failureSignature('validation', ['missing commands/2/abcdefab-1234-1234-1234-123456789abc.result.json at 2026-10-04T00:00:00Z']); assert.equal(first, next);
});
test('post-deployment evidence for a different target cannot pass', () => {
  const spec = { id: 'health', program: 'node' as const, args: ['health.js'], domain: 'post-deploy' as const, criteria: [], coverage: ['post-deploy-health'], tests: ['health'], timeoutMs: 1000 };
  assert.throws(() => checkResults({ environment: 'env', target: 'localhost', tests: [{ id: 'health', status: 'passed', executed: true }] }, spec, 'env', 'reviewed-production'), /approved actual target/);
});
test('source invalidation cannot bypass the repair ceiling', t => {
  const f = fixture(t); f.prepare(); f.implement(); const run = { ...f.c.read(), repairCount: MAX_REPAIRS };
  const result = reduce(run, { type: 'INVALIDATE', next: 'implementation', reason: 'source changed again', snapshot: run.baseline }, new Date().toISOString());
  assert.equal(result.state, 'HUMAN_REVIEW_REQUIRED'); assert.equal(result.next, null); assert.equal(result.repairCount, MAX_REPAIRS);
});
