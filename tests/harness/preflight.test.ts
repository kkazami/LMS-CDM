import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Controller } from '../../scripts/harness/controller';
import { canonical, digest, hash } from '../../scripts/harness/repository';
import { ExternalReceipt, ExternalReceiptPayload, ISOLATION_PROBES, validateExternalReceipt } from '../../scripts/harness/external-preflight';
import { fixture } from './helpers';

test('managed HIGH LMS begin fails closed before a lease without external prerequisites', t => {
  const f = fixture(t); const c = new Controller(f.root, 'run_preflight_blocked');
  const input = { ...f.input, agentProvider: 'codex' as const, profile: 'api', operations: ['authorization'] };
  c.init(input); assert.throws(() => c.begin('requirements', input.actors.requirement, f.capabilities.requirement), /external preflight/);
  assert.equal(c.read().risk, 'HIGH'); assert.equal(c.read().claim, null); assert.equal(c.read().state, 'DRAFT');
});

test('unowned source change after human approval before implementation invalidates the reviewed plan and approval', t => {
  const f = fixture(t, ['authorization']); f.prepare(); f.approve();
  f.write('docs/note.md', 'Changed after the signed source review, before the implementation lease');
  const run = f.c.status(); assert.equal(run.next, 'recon'); assert.equal(run.artifacts.plan, undefined); assert.equal(run.approvals.length, 0);
  assert.throws(() => f.begin('implementation'), /cannot be claimed/);
});

test('signed preflight rejects missing isolation signer human test and database prerequisites (unit receipts)', t => {
  const f = fixture(t); const pair = generateKeyPairSync('ed25519'); const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const run = f.c.read(); run.input.agentProvider = 'codex'; run.input.profile = 'database'; run.risk = 'HIGH'; run.approvalKeyHash = hash(publicKey); run.preflightKeyHash = hash(publicKey);
  const now = Date.now(); const p: ExternalReceiptPayload = { version: 1, kind: 'controlled-environment', runId: run.runId, baseline: run.baseline.digest, input: digest(run.input), issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 60000).toISOString(), approvalKeyHash: hash(publicKey),
    checks: Object.fromEntries(['provider-session', 'host-isolation', 'protected-signer', 'reviewed-lms-tests', 'human-approver', 'postgresql-rehearsal'].map(name => [name, { status: 'PASS' as const, evidenceHash: hash(name) }])),
    isolation: { backend: 'microvm', provider: 'codex', probes: Object.fromEntries(ISOLATION_PROBES.map(name => [name, 'DENIED' as const])) },
    reviewedTests: { files: { 'tests/behavior.ts': run.baseline.files['tests/behavior.ts'] }, coverage: ['authentication', 'authorization', 'ownership', 'institute-scope', 'program-scope', 'idor', 'privilege-escalation', 'direct-api', 'request-manipulation', 'sensitive-data'] } };
  const receipt = (payload: ExternalReceiptPayload): ExternalReceipt => ({ payload, signature: sign(null, Buffer.from(canonical(payload)), pair.privateKey).toString('base64') });
  assert.doesNotThrow(() => validateExternalReceipt(run, receipt(p), publicKey));
  const missingTest = structuredClone(p); missingTest.reviewedTests.files = { 'tests/absent.ts': hash('absent') }; assert.throws(() => validateExternalReceipt(run, receipt(missingTest), publicKey), /changed or missing/);
  for (const name of Object.keys(p.checks)) { const changed = structuredClone(p); changed.checks[name].status = 'FAIL'; assert.throws(() => validateExternalReceipt(run, receipt(changed), publicKey), /prerequisite/); }
  for (const name of ISOLATION_PROBES) { const changed = structuredClone(p); delete changed.isolation.probes[name]; assert.throws(() => validateExternalReceipt(run, receipt(changed), publicKey), /probe missing/); }
  for (const [key, value] of [['runId', 'foreign'], ['baseline', hash('foreign')], ['input', hash('foreign')], ['approvalKeyHash', hash('foreign')], ['expiresAt', new Date(now - 1).toISOString()]] as const) { const changed = { ...p, [key]: value }; assert.throws(() => validateExternalReceipt(run, receipt(changed), publicKey)); }
  const tampered = receipt(p); tampered.signature = Buffer.alloc(64).toString('base64'); assert.throws(() => validateExternalReceipt(run, tampered, publicKey), /signature invalid/);
  run.input.deployment = true; const deployment = { ...p, input: digest(run.input) }; assert.throws(() => validateExternalReceipt(run, receipt(deployment), publicKey), /deployment-adapter/);
});
