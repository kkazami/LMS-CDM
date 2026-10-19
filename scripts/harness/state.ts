import { ensure, validateInput, words } from './contracts';
import { data, deploymentKey, gate, requireApproval, implementationSubject, deploymentSubject, mandatoryCommands } from './gates';
import { object } from './contracts';
import { changed, classify, digest, maxRisk, RISK_ORDER } from './repository';
import { Event, MAX_REPAIRS, OWNERS, Run, STAGES, STATES, VERSION } from './types';

function clearFrom(run: Run, stage: typeof STAGES[number]): void {
  for (const s of STAGES.slice(STAGES.indexOf(stage))) {
    const old = run.artifacts[s]; if (old) run.history.push(old); delete run.artifacts[s];
  }
  run.claim = null; run.next = stage;
}
/** The same reducer is used on writes and journal replay. No arbitrary state setter. */
export function reduce(previous: Run | null, event: Event, at: string, publicKey?: string): Run {
  ensure(['INIT', 'CLAIM', 'SUBMIT', 'COMMAND_STARTED', 'COMMAND_FINISHED', 'APPROVE', 'FAIL', 'REPAIR', 'INTERRUPT', 'RESUME', 'INVALIDATE', 'ESCALATE'].includes(event.type), 'Unknown journal event');
  if (event.type === 'INIT') {
    ensure(previous === null, 'Run already initialized'); const r = event.run;
    validateInput(r.input);
    ensure(r.version === VERSION && /^run_[a-zA-Z0-9_-]+$/.test(r.runId), 'Invalid run version/ID');
    ensure(r.state === 'DRAFT' && r.next === 'requirements' && r.attempt === 0 && r.repairCount === 0 && r.commands.length === 0 && r.approvals.length === 0 && r.failures.length === 0 && Object.keys(r.artifacts).length === 0 && r.history.length === 0 && r.claim === null && !r.deploymentUncertain, 'Invalid initial state');
    ensure(r.baseline.digest === digest({ head: r.baseline.head, index: r.baseline.index, files: r.baseline.files }), 'Invalid baseline snapshot');
    ensure(!r.expectedSnapshot || digest(r.expectedSnapshot) === digest(r.baseline), 'Invalid initial expected source');
    ensure(r.risk === maxRisk(classify([], r.input.operations), r.input.deployment ? 'CRITICAL' : 'LOW'), 'Initial risk floor mismatch');
    return structuredClone(r);
  }
  ensure(previous, 'Run not initialized'); const run = structuredClone(previous);
  if (event.type === 'CLAIM') {
    const c = event.claim;
    ensure(!run.claim && run.next === c.stage && !['FAILED', 'INTERRUPTED', 'HUMAN_REVIEW_REQUIRED'].includes(run.state), 'Stage cannot be claimed in this state');
    ensure(run.input.actors[OWNERS[c.stage]] === c.actor, 'Wrong stage owner');
    ensure(Date.parse(c.expiresAt) > Date.parse(at) && /^[a-f0-9]{64}$/.test(c.tokenHash), 'Invalid stage lease');
    if (c.stage === 'implementation' && RISK_ORDER.indexOf(run.risk) >= 2) requireApproval(run, 'implementation', implementationSubject(run), at, publicKey);
    if (c.stage === 'deployment') requireApproval(run, 'deployment', deploymentSubject(run), at, publicKey);
    run.claim = c;
    if (c.stage === 'implementation') run.state = 'APPROVED';
  } else if (event.type === 'SUBMIT') {
    const a = event.artifact, c = run.claim;
    ensure(c && c.stage === a.envelope.stage && c.actor === a.envelope.actor && run.next === c.stage, 'Unclaimed or illegal stage transition');
    ensure(Date.parse(c.expiresAt) >= Date.parse(at), 'Stage lease expired; interrupt and resume');
    ensure(a.hash === digest(a.envelope), 'Artifact hash mismatch');
    gate(run, a.envelope, at, publicKey);
    ensure(RISK_ORDER.includes(event.risk), 'Unknown event risk');
    const derivedRisk = c.stage === 'plan' ? classify(words((a.envelope.data as Record<string, unknown>).files, 'plan.files'), [...run.input.operations, ...words((a.envelope.data as Record<string, unknown>).operations, 'operations', false)]) : classify(changed(c.snapshot, a.envelope.snapshot), []);
    run.risk = maxRisk(run.risk, event.risk, derivedRisk); run.artifacts[c.stage] = a;
    run.expectedSnapshot = a.envelope.snapshot;
    run.state = STATES[c.stage];
    const next = STAGES[STAGES.indexOf(c.stage) + 1];
    run.next = c.stage === 'release' && !run.input.deployment ? null : next ?? null;
    run.claim = null;
  } else if (event.type === 'COMMAND_STARTED') {
    const e = event.evidence, c = run.claim;
    ensure(c && c.stage === e.stage && ['validation', 'deployment', 'post-deploy'].includes(c.stage), 'Execution requires an owned execution-stage lease');
    ensure(Date.parse(c.expiresAt) >= Date.parse(at), 'Execution lease expired');
    ensure(e.status === 'RUNNING' && e.runId === run.runId && e.attempt === run.attempt && e.planHash === run.artifacts.plan?.hash, 'Invalid execution identity');
    ensure(e.snapshot.digest === c.snapshot.digest && e.snapshot.head === c.snapshot.head && e.snapshot.index === c.snapshot.index, 'Source changed after execution-stage lease');
    const spec = mandatoryCommands(run, e.stage).find(s => s.id === e.commandId); ensure(spec, 'Command is not approved for this stage');
    ensure(digest(e.argv) === digest([spec.program, ...spec.args]), 'Command differs from plan');
    if (['deployment', 'post-deploy'].includes(e.stage)) ensure(e.deployment?.target === object(data(run, 'plan').deployment).target && e.deployment?.idempotencyKey === deploymentKey(run, e.commandId), 'Execution is not bound to the approved deployment target');
    ensure(!run.commands.some(x => x.id === e.id || (x.attempt === run.attempt && x.commandId === e.commandId)), 'Duplicate execution; repair/resume required');
    run.commands.push(e);
  } else if (event.type === 'COMMAND_FINISHED') {
    const e = event.evidence, i = run.commands.findIndex(c => c.id === e.id), old = run.commands[i];
    ensure(old && old.status === 'RUNNING', 'No active command');
    const { status: ignoredStatus, finishedAt: ignoredFinish, exitCode: ignoredExit, signal: ignoredSignal, error: ignoredError, output: ignoredOutput, outputHash: ignoredHash, result: ignoredResult, resultHash: ignoredResultHash, outputs: ignoredOutputs, ...identity } = e;
    const { status: oldStatus, ...oldIdentity } = old;
    ensure(digest(identity) === digest(oldIdentity), 'Execution identity changed');
    ensure(['PASS', 'FAIL'].includes(e.status) && e.finishedAt && e.output && e.outputHash, 'Missing captured execution result');
    ensure(e.status !== 'PASS' || (e.exitCode === 0 && !e.error && !e.signal), 'Cannot pass failed command');
    run.commands[i] = e;
  } else if (event.type === 'APPROVE') {
    ensure(!run.approvals.some(a => a.signature === event.approval.signature), 'Duplicate approval');
    run.approvals.push(event.approval);
  } else if (event.type === 'FAIL') {
    const f = event.failure;
    ensure(run.next === f.stage && f.attempt === run.attempt && f.reasons.length > 0, 'Failure does not belong to active stage');
    run.failures.push(f); run.resumeNext = f.stage; run.claim = null; run.state = 'FAILED';
    run.commands.forEach(c => { if (c.attempt === run.attempt && c.status === 'RUNNING') { c.status = 'INTERRUPTED'; c.error = f.reasons.join('; '); } });
    if (f.risk && maxRisk(run.risk, f.risk) !== run.risk) { run.risk = maxRisk(run.risk, f.risk); run.state = 'HUMAN_REVIEW_REQUIRED'; }
    if (run.repairCount >= MAX_REPAIRS || run.failures.filter(x => x.signature === f.signature).length >= 3) run.state = 'HUMAN_REVIEW_REQUIRED';
    if (f.stage === 'deployment') { run.deploymentUncertain = true; run.state = 'HUMAN_REVIEW_REQUIRED'; }
  } else if (event.type === 'REPAIR') {
    ensure(run.state === 'FAILED' && run.repairCount < MAX_REPAIRS && !run.deploymentUncertain, 'Repair ceiling reached or human reconciliation required');
    ensure(run.resumeNext && STAGES.indexOf(run.resumeNext) >= STAGES.indexOf('implementation') && STAGES.indexOf(run.resumeNext) <= STAGES.indexOf('code-review'), 'Planning failures require a new run; release/deploy failures require human review');
    const expected = run.expectedSnapshot ?? run.baseline, delta = changed(expected, event.snapshot), files = words(data(run, 'plan').files, 'plan.files');
    ensure(expected.head === event.snapshot.head && delta.every(file => files.includes(file)) && maxRisk(run.risk, classify(delta, [])) === run.risk, 'Recovery source exceeds approved scope/risk');
    run.repairCount++; run.attempt++; clearFrom(run, 'implementation'); run.state = 'REPAIRING'; run.resumeNext = null;
    run.expectedSnapshot = event.snapshot;
  } else if (event.type === 'INVALIDATE') {
    ensure(['requirements', 'recon', 'implementation'].includes(event.next), 'Invalid freshness restart');
    ensure(run.state !== 'HUMAN_REVIEW_REQUIRED' && !run.deploymentUncertain, 'Human intervention remains required');
    const implemented = Boolean(run.artifacts.implementation);
    const latest = [...STAGES].reverse().map(s => run.artifacts[s]).find(Boolean);
    run.risk = maxRisk(run.risk, classify(changed(latest?.envelope.snapshot ?? run.baseline, event.snapshot), []));
    clearFrom(run, event.next); run.attempt++;
    if (implemented) run.repairCount++;
    run.state = event.next === 'requirements' ? 'DRAFT' : event.next === 'recon' ? 'REQUIREMENTS_READY' : 'PLAN_READY';
    if (event.next === 'requirements') run.baseline = event.snapshot;
    run.expectedSnapshot = event.snapshot;
    run.failures.push({ attempt: run.attempt - 1, stage: event.next, signature: digest(['stale', event.reason]), reasons: [event.reason], at });
    if (event.next === 'recon') run.approvals = [];
    if (run.repairCount > MAX_REPAIRS) { run.repairCount = MAX_REPAIRS; run.state = 'HUMAN_REVIEW_REQUIRED'; run.next = null; }
  } else if (event.type === 'INTERRUPT') {
    ensure(run.next && !['FAILED', 'INTERRUPTED', 'HUMAN_REVIEW_REQUIRED'].includes(run.state), 'Run cannot be interrupted in this state');
    run.resumeNext = run.next;
    if (run.next === 'deployment') run.deploymentUncertain = true;
    run.commands.forEach(c => { if (c.status === 'RUNNING') { c.status = 'INTERRUPTED'; c.error = event.reason; } });
    run.claim = null; run.next = null; run.state = 'INTERRUPTED';
  } else if (event.type === 'RESUME') {
    ensure(run.state === 'INTERRUPTED' && run.resumeNext, 'Not an interrupted run');
    ensure(!run.deploymentUncertain, 'Deployment outcome uncertain: reconcile externally; automatic replay is forbidden');
    const resume = run.resumeNext;
    const expected = run.expectedSnapshot ?? run.baseline, delta = changed(expected, event.snapshot);
    ensure(expected.head === event.snapshot.head && (!delta.length || (run.artifacts.plan && delta.every(file => words(data(run, 'plan').files, 'plan.files').includes(file)))) && maxRisk(run.risk, classify(delta, [])) === run.risk, 'Resume source exceeds approved scope/risk');
    if (delta.length || ['implementation', 'tests', 'validation'].includes(resume) || run.commands.some(c => c.attempt === run.attempt && c.status === 'INTERRUPTED')) {
      ensure(run.repairCount < MAX_REPAIRS, 'Interrupted execution exhausted repair budget');
      run.repairCount++; run.attempt++; clearFrom(run, 'implementation'); run.state = 'REPAIRING';
    } else { run.next = resume; run.state = resume === 'requirements' ? 'DRAFT' : STATES[STAGES[STAGES.indexOf(resume) - 1]]; }
    run.resumeNext = null;
    run.expectedSnapshot = event.snapshot;
  } else if (event.type === 'ESCALATE') {
    ensure(event.reason.trim() && ['FAILED', 'INTERRUPTED'].includes(run.state), 'Escalation requires a failed/interrupted run');
    run.risk = maxRisk(run.risk, event.risk, classify(changed(run.expectedSnapshot ?? run.baseline, event.snapshot), []));
    run.failures.push({ attempt: run.attempt, stage: run.resumeNext ?? run.next ?? 'implementation', signature: digest(['escalation', event.reason]), reasons: [event.reason], at, risk: run.risk, snapshot: event.snapshot });
    run.state = 'HUMAN_REVIEW_REQUIRED'; run.claim = null; run.next = null;
  }
  return run;
}
