import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, execFileSync, ChildProcess } from 'node:child_process';
import { sign } from 'node:crypto';
import { fixture } from './helpers';
import { commands } from '../../scripts/harness/contracts';
import { execute, pnpmEntry } from '../../scripts/harness/runner';
import { Controller } from '../../scripts/harness/controller';
import { applyProposals, identities } from '../../scripts/harness/agent-host';
import { disposableDatabase } from '../../scripts/harness/database-rehearsal';
import { disposableSigner, provisionDisposable, signFromProtectedFile } from '../../scripts/harness/signing';
import * as os from 'node:os';
import { verify } from 'node:crypto';
import { canonicalApproval, implementationSubject, deploymentSubject, SECURITY_BOUNDARIES, dependencies } from '../../scripts/harness/gates';
import { digest, snapshot, classify } from '../../scripts/harness/repository';
import { ApprovalPayload } from '../../scripts/harness/types';

const realFiles = {
  'package.json': JSON.stringify({ private: true, scripts: { 'harness:typecheck': 'node tests/probe.cjs', 'harness:test': 'node tests/probe.cjs' } }),
  'tests/probe.cjs': `const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'); assert.equal(process.env.DATABASE_URL,undefined); assert.equal(process.env.HARNESS_ACTOR_CAPABILITY,undefined); assert.equal(process.env.HARNESS_TEST_APPROVAL,undefined); const count=path.join(path.dirname(process.env.HARNESS_RESULT_PATH),'count.txt');fs.writeFileSync(count,String(Number(fs.existsSync(count)?fs.readFileSync(count,'utf8'):0)+1)); if(fs.readFileSync('docs/note.md','utf8').trim()==='broken')process.exit(2); fs.writeFileSync(process.env.HARNESS_RESULT_PATH,JSON.stringify({environment:process.env.HARNESS_ENVIRONMENT_ID,tests:[{id:'sample case',status:'passed',executed:true}]}));`,
};
function worker(f: ReturnType<typeof fixture>, action: string, checkpoint = '', capability = f.capabilities.runner, extra: NodeJS.ProcessEnv = {}): ChildProcess {
  return spawn(process.execPath, ['--import', 'tsx', path.resolve('tests/harness/process-worker.ts'), f.root, 'run_test', action, checkpoint], { cwd: process.cwd(), windowsHide: true, shell: false,
    env: { PATH: process.env.PATH, Path: process.env.Path, SystemRoot: process.env.SystemRoot, USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME, HARNESS_APPROVAL_PUBLIC_KEY: f.c.publicKey, HARNESS_ACTOR_CAPABILITY: capability, HARNESS_PNPM_CLI: pnpmEntry(), ...extra } });
}
async function checkpoint(f: ReturnType<typeof fixture>, child: ChildProcess, name: string) {
  let errors = ''; child.stderr?.on('data', b => errors += b.toString());
  const deadline = Date.now() + 20000;
  while (!fs.existsSync(path.join(f.c.store.dir, name + '.checkpoint'))) {
    assert.equal(child.exitCode, null, 'Worker stopped before checkpoint: ' + errors);
    assert.ok(Date.now() < deadline, 'Worker checkpoint timeout: ' + errors); await new Promise(resolve => setTimeout(resolve, 30));
  }
}
async function kill(child: ChildProcess) {
  const closed = new Promise(resolve => child.once('close', resolve));
  if (process.platform === 'win32') execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else {
    const descendants = (pid: number): number[] => { try { return fs.readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).map(Number).flatMap(id => [...descendants(id), id]); } catch { return []; } };
    for (const pid of descendants(child.pid!)) { try { process.kill(pid, 'SIGKILL'); } catch {} } child.kill('SIGKILL');
  }
  await closed;
}
async function realValidation(f: ReturnType<typeof fixture>) {
  const { token } = f.begin('validation'); await execute(f.c, 'validation', f.input.actors.runner, token);
  const evidence = f.c.read().commands.filter(e => e.attempt === f.c.read().attempt && e.stage === 'validation').map(e => e.id);
  f.c.submit('validation', f.input.actors.runner, token, { evidence }); return evidence;
}
function reviews(f: ReturnType<typeof fixture>, evidence: string[]) {
  const diffDigest = snapshot(f.root).digest;
  f.submit('qa', { verdict: 'PASS', diffDigest, evidence, findings: [], criteria: [{ id: 'AC-1', status: 'PASS', evidence: [evidence[1]] }] });
  f.submit('security', { verdict: 'PASS', diffDigest, evidence, findings: [], boundaries: SECURITY_BOUNDARIES.map(id => ({ id, assessment: 'Isolated local fixture has no product security surface', evidence })) });
  f.submit('code-review', { verdict: 'PASS', diffDigest, evidence, findings: [], resolutions: [] });
}

for (const point of ['prepared', 'executed'] as const) test(`actual process crash ${point} cannot commit execution success or reuse its lease`, async t => {
  const f = fixture(t, [], realFiles); f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement();
  const child = worker(f, 'run', point); t.after(() => { if (child.exitCode === null) child.kill(); }); await checkpoint(f, child, point);
  assert.equal(f.c.read().commands[0].status, 'RUNNING'); await kill(child);
  const c = new Controller(f.root, 'run_test', f.c.publicKey); c.store.recover('actual worker killed');
  assert.equal(c.read().state, 'INTERRUPTED'); assert.equal(c.read().claim, null); assert.equal(c.read().commands[0].status, 'INTERRUPTED');
  assert.throws(() => c.verify(), /attention|Partial/); c.resume(); assert.equal(c.read().repairCount, 1); assert.equal(c.read().next, 'implementation');
  assert.ok(c.read().artifacts.plan); assert.equal(c.read().artifacts.validation, undefined); assert.equal(c.read().commands.filter(e => e.status === 'PASS').length, 0);
});

test('actual process crash during command execution preserves incomplete evidence', async t => {
  const f = fixture(t, [], { ...realFiles, 'tests/probe.cjs': `require('node:fs').writeFileSync(require('node:path').join(require('node:path').dirname(process.env.HARNESS_RESULT_PATH),'during.checkpoint'),'ready');setInterval(()=>{},1000)` });
  f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement();
  const child = worker(f, 'run'); t.after(() => { if (child.exitCode === null) child.kill(); });
  // Runner result is in commands/<attempt>/; the command itself confirms it has started.
  const deadline = Date.now() + 20000;
  while (!fs.existsSync(path.join(f.c.store.dir, 'commands/0/during.checkpoint'))) { assert.equal(child.exitCode, null); assert.ok(Date.now() < deadline); await new Promise(resolve => setTimeout(resolve, 30)); }
  await kill(child); const c = new Controller(f.root, 'run_test', f.c.publicKey); c.store.recover('actual command tree killed');
  assert.equal(c.read().commands[0].status, 'INTERRUPTED'); assert.throws(() => c.verify()); c.resume(); assert.equal(c.read().repairCount, 1);
});

test('actual review process crash resumes accepted validation but revokes the old lease', async t => {
  const f = fixture(t, [], realFiles); f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement(); await realValidation(f);
  const child = worker(f, 'claim', '', f.capabilities.qa); t.after(() => { if (child.exitCode === null) child.kill(); }); await checkpoint(f, child, 'claimed'); await kill(child);
  const c = new Controller(f.root, 'run_test', f.c.publicKey); c.store.recover('review process killed'); c.resume(); assert.equal(c.read().next, 'qa'); assert.ok(c.read().artifacts.validation); assert.equal(c.read().claim, null); assert.equal(c.read().repairCount, 0);
});

for (const action of ['repair-crash', 'approval-crash']) test(`actual process crash during ${action} preserves committed budget and approvals`, async t => {
  const f = fixture(t); f.prepare();
  if (action === 'repair-crash') f.c.fail('implementation', ['repair required']);
  const payload: ApprovalPayload = { version: 2, runId: 'run_test', purpose: 'implementation', subject: implementationSubject(f.c.read()), risk: f.c.read().risk, human: 'disposable signer', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30000).toISOString() };
  const approval = { payload, signature: sign(null, Buffer.from(canonicalApproval(payload)), f.privateKey).toString('base64') };
  const child = worker(f, action, '', f.capabilities.executor, { HARNESS_TEST_APPROVAL: JSON.stringify(approval) });
  const code = await new Promise(resolve => child.once('close', resolve)); assert.equal(code, 77);
  const c = new Controller(f.root, 'run_test', f.c.publicKey); c.store.recover('mutation process killed'); assert.equal(c.read().repairCount, 0); assert.equal(c.read().approvals.length, 0);
  if (action === 'repair-crash') { assert.equal(c.read().failures.length, 1); c.repair(); assert.equal(c.read().repairCount, 1); }
});

test('real failure repair validation review lifecycle executes the full command set again', async t => {
  const repaired = fixture(t, [], realFiles); repaired.plan.commands.forEach(c => c.timeoutMs = 15000); repaired.prepare();
  const claim = repaired.begin('implementation'); repaired.write('docs/note.md', 'broken'); repaired.c.submit('implementation', repaired.input.actors.executor, claim.token, { files: ['docs/note.md'], summary: 'intentionally broken fixture' });
  repaired.submit('tests', { files: ['tests/behavior.ts'], summary: 'independent fixture tests', mapping: [{ id: 'AC-1', commands: ['behavior'], tests: ['tests/behavior.ts'] }] });
  await assert.rejects(realValidation(repaired), /failed/); assert.equal(repaired.c.read().state, 'FAILED'); repaired.c.repair();
  const lease = repaired.begin('implementation'); repaired.write('docs/note.md', 'fixed'); repaired.c.submit('implementation', repaired.input.actors.executor, lease.token, { files: ['docs/note.md'], summary: 'repair' });
  repaired.submit('tests', { files: ['tests/behavior.ts'], summary: 'fresh mapping', mapping: [{ id: 'AC-1', commands: ['behavior'], tests: ['tests/behavior.ts'] }] });
  const evidence = await realValidation(repaired); assert.equal(evidence.length, 2); reviews(repaired, evidence); repaired.submit('release', { ready: true, recovery: 'Delete local fixture' });
  assert.equal(repaired.c.verify().ready, true); assert.equal(repaired.c.read().repairCount, 1); assert.equal(repaired.c.read().failures.length, 1); assert.ok(repaired.c.read().commands.some(e => e.status === 'FAIL'));
});

test('real captured release evidence becomes unusable after source or HEAD changes', async t => {
  const f = fixture(t, [], realFiles); f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement(); const evidence = await realValidation(f); reviews(f, evidence); f.submit('release', { ready: true, recovery: 'local delete' });
  assert.equal(f.c.verify().ready, true); f.write('docs/note.md', 'modified'); assert.throws(() => f.c.verify(), /source differs/); f.write('docs/note.md', 'before');
  execFileSync('git', ['-c', 'user.name=Smoke', '-c', 'user.email=smoke@example.invalid', 'commit', '--allow-empty', '-qm', 'new HEAD'], { cwd: f.root, stdio: 'pipe' });
  assert.throws(() => f.c.verify(), /source differs/); assert.equal(f.c.status().next, 'recon');
});

test('managed sessions require receipt and read-only roles cannot propose writes', t => {
  const f = fixture(t), id = identities('run_managed');
  const c = new Controller(f.root, 'run_managed', f.c.publicKey); c.init({ ...f.input, ...{ actors: id.actors, actorCapabilities: id.actorCapabilities }, agentProvider: 'codex' });
  const { token } = c.begin('requirements', id.actors.requirement, id.capabilities.requirement);
  assert.throws(() => c.submit('requirements', id.actors.requirement, token, f.requirements), /session receipt/);
  const response = { runId: 'run_test', attempt: 0, stage: 'requirements' as const, dependencies: dependencies(f.c.read(), 'requirements'), artifact: JSON.stringify(f.requirements), changes: [{ path: 'docs/note.md', beforeHash: snapshot(f.root).files['docs/note.md'], content: 'forged' }] };
  assert.throws(() => applyProposals(f.c, 'requirements', response), /cannot write/); assert.equal(fs.readFileSync(path.join(f.root, 'docs/note.md'), 'utf8'), 'before');
});

test('public-key substitution and wrong scope run risk expiry or forged signatures are rejected', t => {
  const f = fixture(t, ['security-control-change']); f.prepare();
  assert.throws(() => new Controller(f.root, 'run_test', disposableSigner().publicKey).read(), /Pinned/);
  const payload: ApprovalPayload = { version: 2, runId: 'run_test', purpose: 'implementation', subject: implementationSubject(f.c.read()), risk: 'HIGH', human: 'test-human', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30000).toISOString() };
  const signed = (value: ApprovalPayload) => ({ payload: value, signature: sign(null, Buffer.from(canonicalApproval(value)), f.privateKey).toString('base64') });
  for (const bad of [{ ...payload, runId: 'run_other' }, { ...payload, subject: digest({ files: ['wrong-scope'] }) }, { ...payload, risk: 'LOW' as const }, { ...payload, expiresAt: new Date(Date.now() - 1).toISOString() }]) assert.throws(() => f.c.approve(signed(bad)));
  assert.throws(() => f.c.approve(disposableSigner().sign(payload)), /invalid/); assert.equal(f.c.read().approvals.length, 0); f.c.approve(signed(payload)); assert.doesNotThrow(() => f.begin('implementation'));
});

test('risk downgrades secret production auth migration and control scope cannot bypass floors', t => {
  for (const file of ['apps/web/src/lib/auth-session.ts', 'apps/web/src/lib/rbac.ts', 'prisma/migrations/new/migration.sql', 'scripts/harness/controller.ts']) assert.equal(classify([file], []), 'HIGH');
  assert.equal(classify(['.env.local'], []), 'CRITICAL'); assert.equal(classify([], ['destructive-operation']), 'CRITICAL'); assert.equal(classify([], ['production-deployment']), 'CRITICAL');
  const f = fixture(t, ['security-control-change']); f.prepare(); fs.writeFileSync(path.join(f.c.store.dir, 'state.json'), JSON.stringify({ ...f.c.read(), risk: 'LOW' })); assert.equal(f.c.read().risk, 'HIGH'); assert.throws(() => f.begin('implementation'), /signed human/);
});

test('disposable database adapter rejects remote targets and proxy options before connection', () => {
  assert.throws(() => disposableDatabase('postgresql://test:test@db.neon.tech/harness_test'), /local/);
  assert.throws(() => disposableDatabase('postgresql://test:test@127.0.0.1/production'), /harness/);
  assert.throws(() => disposableDatabase('postgresql://test:test@127.0.0.1/harness_test?host=remote'), /options/);
  assert.equal(disposableDatabase('postgresql://test:test@127.0.0.1:55432/harness_test').hostname, '127.0.0.1');
});

test('disposable encrypted Ed25519 provisioning uses restricted files and verifies exact payload', t => {
  const parent = fs.realpathSync(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent, 'harness-signing-test-'));
  t.after(() => { assert.ok(directory.startsWith(parent + path.sep + 'harness-signing-test-')); fs.rmSync(directory, { recursive: true, force: true }); });
  const passphrase = 'disposable-test-passphrase-only'; const files = provisionDisposable(directory, passphrase, [process.cwd()]);
  const payload: ApprovalPayload = { version: 2, runId: 'run_disposable', purpose: 'implementation', subject: digest({ exact: 'scope' }), risk: 'HIGH', human: 'fixture signer', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30000).toISOString() };
  const approval = signFromProtectedFile(files.privateKeyFile, passphrase, payload, [process.cwd()]);
  assert.ok(verify(null, Buffer.from(canonicalApproval(payload)), fs.readFileSync(files.publicKeyFile), Buffer.from(approval.signature, 'base64')));
  assert.ok(!verify(null, Buffer.from(canonicalApproval({ ...payload, subject: 'wrong' })), fs.readFileSync(files.publicKeyFile), Buffer.from(approval.signature, 'base64')));
  assert.throws(() => signFromProtectedFile(files.privateKeyFile, 'wrong-password-123456', payload, [process.cwd()]));
});

test('recovery cannot hide unapproved source or increased risk introduced while stopped', t => {
  const f = fixture(t); f.prepare(); f.c.fail('implementation', ['initial failure']); f.write('apps/web/src/lib/api-auth.ts', 'unapproved change');
  assert.throws(() => f.c.repair(), /human-reviewed/); assert.equal(f.c.read().state, 'HUMAN_REVIEW_REQUIRED'); assert.equal(f.c.read().risk, 'HIGH'); assert.equal(f.c.read().failures.length, 2);
  const paused = fixture(t); paused.prepare(); paused.c.interrupt('pause before implementation'); paused.write('prisma/schema.prisma', 'unapproved schema');
  assert.throws(() => paused.c.resume(), /human-reviewed/); assert.equal(paused.c.read().state, 'HUMAN_REVIEW_REQUIRED'); assert.equal(paused.c.read().risk, 'HIGH');
});

test('real validation and security evidence invalidate after an approved control source changes', async t => {
  const f = fixture(t, ['security-control-change'], { ...realFiles, '.orchestra/harness/security-fixture.ts': 'export const allowed = true;' });
  f.plan.files.push('.orchestra/harness/security-fixture.ts'); f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.approve(); f.implement(); const evidence = await realValidation(f);
  const diffDigest = snapshot(f.root).digest;
  f.submit('qa', { verdict: 'PASS', diffDigest, evidence, findings: [], criteria: [{ id: 'AC-1', status: 'PASS', evidence: [evidence[1]] }] });
  f.submit('security', { verdict: 'PASS', diffDigest, evidence, findings: [], boundaries: SECURITY_BOUNDARIES.map(id => ({ id, assessment: 'Local control fixture; no product boundary', evidence })) });
  f.write('.orchestra/harness/security-fixture.ts', 'export const allowed = false;'); assert.throws(() => f.c.verify(), /source differs/);
  assert.equal(f.c.status().next, 'implementation'); assert.equal(f.c.read().artifacts.security, undefined); assert.equal(f.c.read().artifacts.validation, undefined); assert.equal(f.c.read().repairCount, 1);
});

test('changed actual deployment target fails before argv execution under a signed release', async t => {
  const f = fixture(t, [], { ...realFiles, 'tests/deployment.cjs': 'throw new Error("must not execute with wrong target")' }, 'harness', true);
  Object.assign(f.plan, { deployment: { target: 'local-fixture-approved', idempotencyStrategy: 'fixture nonce only', recovery: 'delete disposable fixture output' } });
  f.plan.commands.forEach(c => c.timeoutMs = 15000);
  f.plan.commands.push({ id: 'deploy', program: 'node', args: ['tests/deployment.cjs'], domain: 'deployment', criteria: [], coverage: ['deployment'], tests: [], timeoutMs: 1000 }, { id: 'health', program: 'node', args: ['tests/deployment.cjs'], domain: 'post-deploy', criteria: [], coverage: ['post-deploy-health'], tests: ['fixture health'], timeoutMs: 1000 });
  f.prepare(); f.approve(); f.implement(); reviews(f, await realValidation(f)); f.submit('release', { ready: true, recovery: 'delete disposable fixture output' });
  f.approve('deployment', deploymentSubject(f.c.read())); const lease = f.begin('deployment');
  const previous = process.env.HARNESS_DEPLOYMENT_TARGET; process.env.HARNESS_DEPLOYMENT_TARGET = 'different-fixture-target';
  try { await assert.rejects(execute(f.c, 'deployment', f.input.actors.deployer, lease.token), /differs from approved/); } finally { if (previous === undefined) delete process.env.HARNESS_DEPLOYMENT_TARGET; else process.env.HARNESS_DEPLOYMENT_TARGET = previous; }
  assert.equal(f.c.read().commands.filter(c => c.stage === 'deployment').length, 0); assert.equal(f.c.read().state, 'HUMAN_REVIEW_REQUIRED'); assert.throws(() => f.c.resume());
});

test('aggregate managed release verification validates the accepted receipt without an active lease', async t => {
  const f = fixture(t, [], realFiles, 'harness', false, true); f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement(); reviews(f, await realValidation(f)); f.submit('release', { ready: true, recovery: 'local fixture deletion' });
  assert.equal(f.c.read().claim, null); assert.equal(f.c.verify().ready, true); assert.equal(new Controller(f.root, 'run_test', f.c.publicKey).verify().ready, true);
});

test('product adapter receives the validated disposable database and server variables', async t => {
  const f = fixture(t, [], { 'package.json': JSON.stringify({ private: true, scripts: { 'harness:typecheck': 'node tests/environment.cjs static', 'harness:test': 'node tests/environment.cjs behavior' } }),
    'tests/environment.cjs': `const fs=require('node:fs'),assert=require('node:assert/strict');if(process.argv[2]==='behavior'){assert.equal(new URL(process.env.HARNESS_TEST_DATABASE_URL).pathname,'/harness_environment');assert.equal(process.env.HARNESS_TEST_DATABASE_URL,process.env.DATABASE_URL);assert.equal(process.env.HARNESS_TEST_BASE_URL,process.env.E2E_BASE_URL);fs.writeFileSync(process.env.HARNESS_RESULT_PATH,JSON.stringify({environment:process.env.HARNESS_ENVIRONMENT_ID,tests:[{id:'sample case',status:'passed',executed:true}]}))}` }, 'bugfix');
  f.plan.commands.forEach(c => c.timeoutMs = 15000); f.prepare(); f.implement();
  const previous = { environment: process.env.HARNESS_ENVIRONMENT, database: process.env.HARNESS_TEST_DATABASE_URL, server: process.env.HARNESS_TEST_BASE_URL };
  process.env.HARNESS_ENVIRONMENT = 'disposable-variable-contract'; process.env.HARNESS_TEST_DATABASE_URL = 'postgresql://harness:disposable@127.0.0.1:55432/harness_environment'; process.env.HARNESS_TEST_BASE_URL = 'http://127.0.0.1:43989';
  try { assert.equal((await realValidation(f)).length, 2); } finally {
    for (const [key, value] of [['HARNESS_ENVIRONMENT', previous.environment], ['HARNESS_TEST_DATABASE_URL', previous.database], ['HARNESS_TEST_BASE_URL', previous.server]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
  }
});

test('browser argv cannot substitute config retry policy or run-local reporters', () => {
  const spec = { id: 'browser', program: 'pnpm', args: ['exec', 'playwright', 'test', '--config', '.orchestra/harness/playwright.config.ts'], domain: 'browser', criteria: [], coverage: ['browser-behavior'], tests: ['case'], timeoutMs: 1000 };
  assert.equal(commands([spec]).length, 1);
  for (const extra of [['--config', 'playwright.config.ts'], ['--config=playwright.config.ts'], ['--retries=2'], ['--reporter=list'], ['--output', 'shared-reports']]) assert.throws(() => commands([{ ...spec, args: [...spec.args, ...extra] }]), /private|override/);
});
