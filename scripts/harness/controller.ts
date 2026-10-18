import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { ensure, validateArtifact, validateInput, words, object } from './contracts';
import { architectureSubject, data, dependencies, deploymentSubject, implementationSubject, gate, validApproval } from './gates';
import { changed, classify, destructiveDiff, digest, failureSignature, hash, maxRisk, safePath, secret, snapshot } from './repository';
import { Store } from './store';
import { sanitize } from './redaction';
import { Approval, ArtifactRef, Envelope, Input, OWNERS, Run, Snapshot, Stage, STAGES, VERSION } from './types';
import { requireExternalPreflight } from './external-preflight';

export class Controller {
  readonly store: Store;
  constructor(readonly root: string, readonly runId: string, readonly publicKey = process.env.HARNESS_APPROVAL_PUBLIC_KEY, readonly preflightPublicKey = process.env.HARNESS_PREFLIGHT_PUBLIC_KEY) { this.store = new Store(root, runId, publicKey); }
  init(value: unknown): Run {
    const input = validateInput(value), base = snapshot(this.root), now = new Date().toISOString();
    const run: Run = { version: VERSION, runId: this.runId, input, createdAt: now, baseline: base, state: 'DRAFT', next: 'requirements', attempt: 0, repairCount: 0, risk: maxRisk(classify([], input.operations), input.deployment ? 'CRITICAL' : 'LOW'), artifacts: {}, commands: [], approvals: [], failures: [], history: [], claim: null, resumeNext: null, deploymentUncertain: false };
    run.approvalKeyHash = this.publicKey ? hash(this.publicKey) : null;
    run.preflightKeyHash = this.preflightPublicKey ? hash(this.preflightPublicKey) : null;
    run.expectedSnapshot = base;
    return this.store.locked(() => this.store.append({ type: 'INIT', run }), true);
  }
  read(): Run { const { run } = this.store.read(); ensure(run, 'Run not initialized'); this.store.verifyFiles(run); return run; }
  private synchronize(run: Run, current: Snapshot): Run {
    if (run.state === 'INTERRUPTED' || run.state === 'HUMAN_REVIEW_REQUIRED' || run.state === 'FAILED') return run;
    if (run.claim && ['implementation', 'tests'].includes(run.claim.stage)) return run;
    const latest = [...STAGES].reverse().map(s => run.artifacts[s]).find(Boolean);
    const expected = run.expectedSnapshot ?? latest?.envelope.snapshot ?? run.baseline;
    if (expected.digest === current.digest) return run;
    const files = run.artifacts.plan ? words(data(run, 'plan').files, 'plan.files') : [];
    const delta = changed(expected, current);
    const risk = classify(delta, []);
    const material = !run.artifacts.plan || expected.head !== current.head || delta.some(f => !files.includes(f)) || maxRisk(run.risk, risk) !== run.risk || (!run.artifacts.implementation && delta.length > 0);
    return this.store.append({ type: 'INVALIDATE', next: !run.artifacts.requirements ? 'requirements' : material ? 'recon' : 'implementation', reason: 'Repository identity changed; previous evidence is stale', snapshot: current });
  }
  status(): Run { return this.store.locked(() => this.synchronize(this.read(), snapshot(this.root))); }
  begin(stage: Stage, actor: string, capability = process.env.HARNESS_ACTOR_CAPABILITY): { run: Run; token: string } {
    ensure(STAGES.includes(stage), 'Unknown stage');
    return this.store.locked(() => {
      const current = snapshot(this.root); let run = this.synchronize(this.read(), current);
      requireExternalPreflight(run, this.root, this.preflightPublicKey);
      ensure(capability && hash(capability) === run.input.actorCapabilities[OWNERS[stage]], 'Missing or wrong host-issued role capability');
      const token = randomUUID(), startedAt = new Date().toISOString();
      let diff: { path: string; hash: string; snapshot: string } | undefined;
      if (stage === 'code-review') {
        const files = words(data(run, 'plan').files, 'plan.files');
        let output = execFileSync('git', ['diff', '--no-ext-diff', '--no-textconv', 'HEAD', '--', ...files], { cwd: this.root, encoding: 'utf8', maxBuffer: 8_000_000 });
        for (const file of files) {
          const target = safePath(this.root, file);
          if (fs.existsSync(target) && current.files[file] && !run.baseline.files[file]) output += `\nNEW FILE ${file}\n` + fs.readFileSync(target, 'utf8');
        }
        // Diff files are restricted to reviewed non-secret scope. Host redaction remains necessary for hardcoded credentials.
        const saved = this.store.put(`reviews/${randomUUID()}.diff`, sanitize(output)); diff = { ...saved, snapshot: current.digest };
      }
      run = this.store.append({ type: 'CLAIM', claim: { stage, actor, tokenHash: hash(token), startedAt, expiresAt: new Date(Date.now() + 3_600_000).toISOString(), snapshot: current, ...(diff ? { diff } : {}) } });
      return { run, token };
    });
  }
  submit(stage: Stage, actor: string, token: string, value: unknown, session?: Envelope['session']): Run {
    return this.store.locked(() => {
      const current = snapshot(this.root); let run = this.synchronize(this.read(), current);
      ensure(run.claim?.tokenHash === hash(token) && run.claim.actor === actor && run.claim.stage === stage, 'Wrong or invalidated stage lease');
      const stageSnapshot = run.claim.snapshot;
      try {
        const d = validateArtifact(stage, value);
        const serialized = JSON.stringify(d); ensure(sanitize(serialized) === serialized, 'Artifact contains a recognized secret; remove it before submission');
        let risk = run.risk;
        if (stage === 'plan') {
          const files = words(d.files, 'files');
          ensure(files.every(f => !secret(f)), 'Secret files may not enter agent file scope');
          if (run.input.profile === 'harness') ensure(files.every(f => /^(\.agents|\.orchestra|\.github|docs|tests)\/|^scripts\/harness|^(package\.json|AGENTS\.md|\.gitignore)$/.test(f)), 'Harness-only scope cannot modify product code or Prisma');
          if (run.input.profile !== 'harness') ensure(files.every(f => !/^\.agents\/|^\.orchestra\/|^scripts\/harness/.test(f)), 'Product runs cannot alter harness controls');
          risk = maxRisk(run.risk, classify(files, [...run.input.operations, ...words(d.operations, 'operations', false)]));
          const proposed = { ...current, files: Object.fromEntries(files.filter(f => current.files[f]).map(f => [f, current.files[f]])) };
          if (destructiveDiff(this.root, { ...current, files: {} }, proposed)) risk = 'CRITICAL';
        }
        if (stage === 'implementation' || stage === 'tests') {
          const delta = changed(run.claim.snapshot, current), approved = words(data(run, 'plan').files, 'plan.files');
          ensure(delta.every(f => approved.includes(f)), 'Actual changes exceed approved file scope');
          ensure(maxRisk(run.risk, classify(delta, [])) === run.risk, 'Actual change risk increased; new plan/approval required');
          ensure(!destructiveDiff(this.root, run.claim.snapshot, current) || run.risk === 'CRITICAL', 'Destructive migration detected; CRITICAL plan and new human approval required');
          if (stage === 'implementation') ensure(!delta.some(f => /^tests\/|^playwright\//.test(f)), 'Executor cannot edit tests owned by the independent test author');
        }
        const envelope: Envelope = { version: VERSION, runId: run.runId, stage, attempt: run.attempt, actor, createdAt: new Date().toISOString(), snapshot: current, dependencies: dependencies(run, stage), data: d, ...(run.claim.diff ? { diff: run.claim.diff } : {}), ...(session ? { session } : {}) };
        const file = `artifacts/${run.attempt}/${stage}-${randomUUID()}.json`;
        const artifact: ArtifactRef = { path: file, hash: digest(envelope), envelope };
        // Validate before publishing a blob, then validate again when appending/replaying.
        gate(run, envelope, envelope.createdAt, this.publicKey);
        this.store.put(file, JSON.stringify(envelope, null, 2));
        run = this.store.append({ type: 'SUBMIT', artifact, risk }); return run;
      } catch (error) {
        const reason = (error as Error).message;
        const actualRisk = maxRisk(run.risk, classify(changed(stageSnapshot, current), []), destructiveDiff(this.root, stageSnapshot, current) ? 'CRITICAL' : 'LOW');
        this.store.append({ type: 'FAIL', failure: { attempt: run.attempt, stage, signature: failureSignature(stage, [reason]), reasons: [reason], at: new Date().toISOString(), risk: actualRisk, snapshot: current } });
        throw error;
      }
    });
  }
  approvalRequest(purpose: Approval['payload']['purpose'], adjudication?: unknown): { subject: string; risk: Run['risk']; runId: string; purpose: string } {
    const run = this.status();
    const subject = purpose === 'implementation' ? implementationSubject(run) : purpose === 'deployment' ? deploymentSubject(run) : architectureSubject(run, validateArtifact('adjudication', adjudication));
    return { subject, risk: run.risk, runId: run.runId, purpose };
  }
  approve(value: unknown): Run {
    return this.store.locked(() => {
      const run = this.synchronize(this.read(), snapshot(this.root)); const a = object(value, 'approval') as unknown as Approval;
      ensure(a.payload && ['architecture', 'implementation', 'deployment'].includes(a.payload.purpose), 'Invalid approval purpose');
      ensure(validApproval(a, run, a.payload.purpose, a.payload.subject, new Date().toISOString(), this.publicKey), 'Approval signature, run, risk or validity is invalid');
      if (a.payload.purpose === 'implementation') ensure(a.payload.subject === implementationSubject(run), 'Approval belongs to a different plan');
      if (a.payload.purpose === 'deployment') ensure(a.payload.subject === deploymentSubject(run), 'Approval belongs to a different release');
      return this.store.append({ type: 'APPROVE', approval: a });
    });
  }
  private recoverySnapshot(run: Run): Snapshot {
    const current = snapshot(this.root), expected = run.expectedSnapshot ?? run.baseline, delta = changed(expected, current);
    const risk = maxRisk(run.risk, classify(delta, []), destructiveDiff(this.root, expected, current) ? 'CRITICAL' : 'LOW');
    const allowed = run.artifacts.plan ? words(data(run, 'plan').files, 'plan.files') : [];
    if (expected.head !== current.head || delta.some(file => !allowed.includes(file)) || risk !== run.risk) {
      this.store.append({ type: 'ESCALATE', reason: 'Source changed outside approved recovery scope or increased risk while stopped', snapshot: current, risk });
      throw new Error('Recovery requires new human-reviewed architecture/scope/risk');
    }
    return current;
  }
  repair(): Run { return this.store.locked(() => { const run = this.read(); ensure(run.state === 'FAILED', 'Repair requires a failed run; ceiling or human review cannot be bypassed'); return this.store.append({ type: 'REPAIR', snapshot: this.recoverySnapshot(run) }); }); }
  interrupt(reason: string): Run { ensure(reason.trim(), 'Interruption reason required'); return this.store.locked(() => this.store.append({ type: 'INTERRUPT', reason })); }
  resume(): Run { return this.store.locked(() => { const previous = this.read(); ensure(previous.state === 'INTERRUPTED', 'Resume requires an interrupted run'); const run = this.store.append({ type: 'RESUME', snapshot: this.recoverySnapshot(previous), deploymentReconciled: false }); return this.synchronize(run, snapshot(this.root)); }); }
  fail(stage: Stage, reasons: string[]): Run {
    return this.store.locked(() => { const run = this.read(); return this.store.append({ type: 'FAIL', failure: { attempt: run.attempt, stage, reasons, signature: failureSignature(stage, reasons), at: new Date().toISOString() } }); });
  }
  verify(): { run: Run; ready: boolean } {
    const run = this.read(), current = snapshot(this.root);
    const latest = [...STAGES].reverse().map(s => run.artifacts[s]).find(Boolean);
    ensure((latest?.envelope.snapshot ?? run.baseline).digest === current.digest, 'Current source differs from journal evidence; status will invalidate affected gates');
    ensure(!run.claim && !run.commands.some(c => c.status === 'RUNNING'), 'Partial/in-progress run is not verified');
    ensure(!['FAILED', 'INTERRUPTED', 'HUMAN_REVIEW_REQUIRED'].includes(run.state), `Run requires attention: ${run.state}`);
    const ready = run.state === 'RELEASE_READY' || run.state === 'COMPLETE';
    if (ready) {
      requireExternalPreflight(run, this.root, this.preflightPublicKey);
      ensure(run.artifacts.release, 'Missing release gate');
      // Re-evaluate current approval validity rather than historical event time.
      const release = run.artifacts.release.envelope;
      gate(run, release, new Date().toISOString(), this.publicKey);
      if (run.state === 'COMPLETE') { ensure(run.input.deployment && run.artifacts['post-deploy'], 'Completion requires deployment and post-deployment gates'); gate(run, run.artifacts['post-deploy']!.envelope, new Date().toISOString(), this.publicKey); }
    }
    return { run, ready };
  }
}
