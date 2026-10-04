import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { TestContext } from 'node:test';
import { Controller } from '../../scripts/harness/controller';
import { ATTACKS, canonicalApproval, dependencies, implementationSubject } from '../../scripts/harness/gates';
import { buildOutputs, digest, hash, snapshot } from '../../scripts/harness/repository';
import { Approval, CommandEvidence, Input, OWNERS, ROLES, Stage } from '../../scripts/harness/types';

export function fixture(t: TestContext, operations: string[] = [], initialFiles: Record<string, string> = {}, profile: Input['profile'] = 'harness', deployment = false, managed = false) {
  const parent = fs.realpathSync(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, 'lms-harness-test-'));
  t.after(() => { if (!root.startsWith(parent + path.sep + 'lms-harness-test-')) throw new Error('Unsafe cleanup'); fs.rmSync(root, { recursive: true, force: true }); });
  const write = (file: string, content: string) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), content); };
  write('README.md', 'fixture'); write('.gitignore', '.orchestra/runs/\nnode_modules/\n'); write('docs/note.md', 'before');
  write('tests/behavior.ts', 'export const behavior = true;');
  write('apps/web/src/lib/api-auth.ts', 'export const auth = true;'); write('prisma/schema.prisma', 'fixture schema');
  Object.entries(initialFiles).forEach(([file, content]) => write(file, content));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q'); git('add', '.'); git('-c', 'user.name=Harness Test', '-c', 'user.email=harness@example.invalid', 'commit', '-qm', 'fixture');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const key = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const c = new Controller(root, 'run_test', key);
  const capabilities = Object.fromEntries(ROLES.map(r => [r, randomUUID()])) as Record<typeof ROLES[number], string>;
  const input: Input = { prompt: 'Test the harness', profile, quality: 'standard', deployment, operations, actors: Object.fromEntries(ROLES.map(r => [r, 'session-' + r])) as Input['actors'], actorCapabilities: Object.fromEntries(ROLES.map(r => [r, hash(capabilities[r])])) as Input['actorCapabilities'] };
  if (managed) input.agentProvider = 'codex'; c.init(input);
  const begin = (stage: Stage) => c.begin(stage, input.actors[OWNERS[stage]], capabilities[OWNERS[stage]]);
  const submit = (stage: Stage, value: unknown) => {
    const actor = input.actors[OWNERS[stage]], { token, run } = begin(stage);
    const payload = stage === 'code-review' ? { ...(value as Record<string, unknown>), inspectedFiles: plan.files, diffHash: run.claim!.diff!.hash } : value;
    // Synthetic provider receipt only for control regressions. Never used as operational session proof.
    const sessionId = 'simulated-' + randomUUID();
    const receipt = managed ? c.store.put(`simulated-receipts/${sessionId}.json`, JSON.stringify({ runId: run.runId, attempt: run.attempt, stage, actor, source: run.claim!.snapshot.digest, dependencies: dependencies(run, stage), session: sessionId })) : undefined;
    return c.submit(stage, actor, token, payload, receipt ? { ...receipt, id: sessionId, source: run.claim!.snapshot.digest } : undefined);
  };
  const requirements = { requirements: [{ id: 'REQ-1', description: 'Behavior works' }], criteria: [{ id: 'AC-1', description: 'Expected outcome', requirements: ['REQ-1'], assertions: ['Outcome matches requirement'] }], ambiguities: [] };
  const findings: Record<string, unknown>[] = [];
  const plan = {
    files: ['docs/note.md', 'tests/behavior.ts'], tasks: [{ id: 'TASK-1', description: 'Implement behavior', criteria: ['AC-1'], dependsOn: [] as string[], findings: [] as string[] }], operations: [] as string[], browser: false, recovery: 'Revert code; no database changes',
    commands: [
      { id: 'types', program: 'pnpm', args: ['harness:typecheck'], domain: 'static', criteria: [], coverage: ['harness-typecheck'], tests: [], timeoutMs: 1000 },
      { id: 'behavior', program: 'pnpm', args: ['harness:test'], domain: 'runtime', criteria: ['AC-1'], coverage: ['harness-tests', 'runtime-regression'], tests: ['sample case'], timeoutMs: 1000 },
    ],
  };
  const prepare = (through: Stage = 'plan') => {
    submit('requirements', requirements); if (through === 'requirements') return;
    submit('recon', { facts: [{ id: 'FACT-1', claim: 'Fixture repository exists', evidence: ['README.md'] }], proposal: 'Change the note', assumptions: [] }); if (through === 'recon') return;
    submit('red-team', { attacks: ATTACKS, findings }); if (through === 'red-team') return;
    submit('adjudication', { decisions: findings.map(f => ({ id: f.id, disposition: 'ACCEPTED', reason: 'Fix in plan', evidence: ['README.md'], resolution: 'Add corrective task' })), architecture: 'Repository-compatible change' }); if (through === 'adjudication') return;
    submit('plan', plan);
  };
  const approve = (purpose: Approval['payload']['purpose'] = 'implementation', subject = implementationSubject(c.read()), expiry = Date.now() + 3600000) => {
    const run = c.read();
    const payload: Approval['payload'] = { version: 2, runId: run.runId, purpose, subject, risk: run.risk, human: 'human-test', issuedAt: new Date().toISOString(), expiresAt: new Date(expiry).toISOString() };
    const approval: Approval = { payload, signature: sign(null, Buffer.from(canonicalApproval(payload)), privateKey).toString('base64') };
    c.approve(approval); return approval;
  };
  const implement = () => { submit('implementation', { files: plan.files, summary: 'Fixture implementation' }); submit('tests', { files: ['tests/behavior.ts'], summary: 'Behavior tests', mapping: [{ id: 'AC-1', commands: ['behavior'], tests: ['tests/behavior.ts'] }] }); };
  // Simulates infrastructure events for reducer tests; runner integration is tested separately.
  const capture = (commandId: string, status: 'PASS' | 'FAIL' = 'PASS') => {
    const run = c.read(), spec = plan.commands.find(s => s.id === commandId)!;
    const id = `${commandId}-${run.attempt}`, output = c.store.put(`commands/${id}.log`, 'fixture execution');
    const source = snapshot(root);
    const e: CommandEvidence = { id, commandId, runId: run.runId, attempt: run.attempt, stage: 'validation', snapshot: { head: source.head, index: source.index, digest: source.digest }, planHash: run.artifacts.plan!.hash, startedAt: new Date().toISOString(), environment: 'fixture', argv: [spec.program, ...spec.args], status: 'RUNNING' };
    c.store.locked(() => c.store.append({ type: 'COMMAND_STARTED', evidence: e }));
    const result = spec.domain === 'static' ? undefined : c.store.put(`commands/${id}.json`, JSON.stringify({ environment: 'fixture', tests: [{ id: 'sample case', status: 'passed', executed: true }], ...(spec.domain === 'database' ? { database: { targetFingerprint: 'fixture-local-db-1234', beforeSchemaHash: 'before', afterSchemaHash: 'after', coverage: spec.coverage, disposable: true } } : {}) }));
    if (spec.coverage.includes('web-build')) write('apps/web/.next/BUILD_ID', 'fixture-build');
    c.store.locked(() => c.store.append({ type: 'COMMAND_FINISHED', evidence: { ...e, finishedAt: new Date().toISOString(), exitCode: status === 'PASS' ? 0 : 1, signal: null, status, output: output.path, outputHash: output.hash, ...(result ? { result: result.path, resultHash: result.hash } : {}), ...(spec.coverage.includes('web-build') ? { outputs: buildOutputs(root, 'apps/web/.next') } : {}) } }));
    return id;
  };
  const validate = () => { const actor = input.actors.runner, { token } = begin('validation'); const ids = plan.commands.filter(c => !['deployment', 'post-deploy'].includes(c.domain)).map(c => capture(c.id)); c.submit('validation', actor, token, { evidence: ids }); return ids; };
  return { c, root, input, capabilities, begin, write, submit, prepare, plan, requirements, findings, approve, implement, capture, validate, privateKey };
}
