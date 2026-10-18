import { verify as verifySignature } from 'node:crypto';
import { ensure, object, records, words, word, commands, validateArtifact } from './contracts';
import { changed, classify, digest, maxRisk, RISK_ORDER } from './repository';
import { Approval, ArtifactRef, CommandEvidence, CommandSpec, Envelope, Run, Snapshot, Stage, STAGES, VERSION } from './types';

export const SECURITY_BOUNDARIES = ['authentication', 'authorization', 'ownership', 'institute-scope', 'program-scope', 'idor', 'privilege-escalation', 'direct-api', 'request-manipulation', 'sensitive-data'];
export const DATABASE_COVERAGE = ['schema-validation', 'migration-review', 'migration-apply', 'fresh-replay', 'existing-upgrade', 'compatibility', 'recovery', 'data-preservation', 'post-schema'];
export const ATTACKS = ['assumptions', 'data-model', 'apis', 'authorization', 'privacy', 'deployment', 'performance', 'ux', 'testing', 'maintainability', 'ambiguity', 'contradictions', 'missing-requirements', 'overengineering'];
export function data(run: Run, stage: Stage): Record<string, unknown> {
  const artifact = run.artifacts[stage]; ensure(artifact, `Missing ${stage} gate`); return object(artifact.envelope.data);
}
export function dependencies(run: Run, stage: Stage): Record<string, string> {
  const result: Record<string, string> = {};
  for (const s of STAGES.slice(0, STAGES.indexOf(stage))) {
    ensure(run.artifacts[s], `Missing prerequisite gate: ${s}`); result[s] = run.artifacts[s]!.hash;
  }
  return result;
}
export function implementationSubject(run: Run): string {
  return digest({ input: run.input, gates: dependencies(run, 'implementation') });
}
export function deploymentSubject(run: Run): string {
  ensure(run.artifacts.release, 'Release gate required for deployment approval');
  return digest({ release: run.artifacts.release.hash, input: run.input });
}
export function deploymentKey(run: Run, commandId?: string): string {
  const target = word(object(data(run, 'plan').deployment, 'deployment plan').target, 'deployment target');
  return digest({ runId: run.runId, plan: run.artifacts.plan!.hash, target, commandId: commandId ?? 'STAGE' });
}
export function architectureSubject(run: Run, decisions: unknown): string {
  return digest({ runId: run.runId, redTeam: run.artifacts['red-team']?.hash, decisions });
}
export function validApproval(approval: Approval, run: Run, purpose: Approval['payload']['purpose'], subject: string, now: string, publicKey?: string): boolean {
  const p = approval.payload;
  if (!publicKey || p.version !== VERSION || p.runId !== run.runId || p.purpose !== purpose || p.subject !== subject || !p.human?.trim()) return false;
  if (!RISK_ORDER.includes(p.risk) || RISK_ORDER.indexOf(p.risk) < RISK_ORDER.indexOf(run.risk)) return false;
  const issued = Date.parse(p.issuedAt), expiry = Date.parse(p.expiresAt), at = Date.parse(now);
  if (!Number.isFinite(issued) || !Number.isFinite(expiry) || issued > at || expiry <= at || issued < Date.parse(run.createdAt)) return false;
  try { return verifySignature(null, Buffer.from(canonicalApproval(p)), publicKey, Buffer.from(approval.signature, 'base64')); } catch { return false; }
}
// Export the exact signing serialization for an external human approval tool.
import { canonical } from './repository';
export const canonicalApproval = canonical;
export function requireApproval(run: Run, purpose: Approval['payload']['purpose'], subject: string, now: string, publicKey?: string): void {
  ensure(run.approvals.some(a => validApproval(a, run, purpose, subject, now, publicKey)), `Missing fresh signed human ${purpose} approval for ${subject}`);
}
export function planCommands(run: Run): CommandSpec[] { return commands(data(run, 'plan').commands); }
export function databaseRequired(run: Run): boolean {
  const p = data(run, 'plan');
  return run.input.profile === 'database' || words(p.files, 'files').some(f => f.startsWith('prisma/')) || [...run.input.operations, ...words(p.operations, 'operations', false)].some(o => /database|migration/i.test(o));
}
export function securityRequired(run: Run): boolean {
  const p = data(run, 'plan');
  return run.input.profile !== 'harness' && (RISK_ORDER.indexOf(run.risk) >= 2 || ['api', 'fullstack'].includes(run.input.profile) || words(p.files, 'files').some(f => /\/api\/|auth|rbac|server|actions\.ts|privacy|integration/.test(f)));
}
export function freshCommand(run: Run, e: CommandEvidence, snap: Snapshot): void {
  ensure(e.runId === run.runId && e.attempt === run.attempt && e.snapshot.digest === snap.digest, `Stale/foreign command evidence: ${e.id}`);
  ensure(e.snapshot.head === snap.head && e.snapshot.index === snap.index, `Foreign commit/index evidence: ${e.id}`);
  ensure(e.planHash === run.artifacts.plan?.hash, `Command ${e.id} belongs to another plan`);
  ensure(e.status === 'PASS' && e.exitCode === 0 && !e.error && !e.signal, `Command ${e.id} did not pass`);
  ensure(e.finishedAt && Date.parse(e.finishedAt) >= Date.parse(e.startedAt) && e.output && e.outputHash, `Incomplete execution evidence: ${e.id}`);
  const spec = planCommands(run).find(c => c.id === e.commandId); ensure(spec, `Unknown command ${e.commandId}`);
  ensure(digest(e.argv) === digest([spec.program, ...spec.args]), `Command arguments differ from plan: ${e.id}`);
  if (spec.coverage.includes('web-build') || spec.coverage.includes('desktop-build')) ensure(e.outputs && Object.keys(e.outputs).length > 0, `Build ${e.id} lacks output fingerprints`);
  if (spec.domain !== 'static' && spec.domain !== 'deployment') ensure(e.result && e.resultHash, `Command ${e.id} lacks individual executed test results`);
}
function evidence(run: Run, ids: string[], snap: Snapshot): CommandEvidence[] {
  return ids.map(id => { const e = run.commands.find(c => c.id === id); ensure(e, `Unknown executed evidence ${id}`); freshCommand(run, e, snap); return e; });
}
export function mandatoryCommands(run: Run, stage: Stage): CommandSpec[] {
  return planCommands(run).filter(c => stage === 'deployment' ? c.domain === 'deployment' : stage === 'post-deploy' ? c.domain === 'post-deploy' : !['deployment', 'post-deploy'].includes(c.domain));
}
export function gate(run: Run, envelope: Envelope, now: string, publicKey?: string): void {
  const stage = envelope.stage, d = validateArtifact(stage, envelope.data);
  ensure(envelope.version === VERSION && envelope.runId === run.runId && envelope.attempt === run.attempt, 'Foreign version/run/attempt artifact');
  ensure(envelope.actor === run.input.actors[owner(stage)], 'Artifact actor does not own stage');
  ensure(digest(envelope.dependencies) === digest(dependencies(run, stage)), 'Artifact dependencies do not match authoritative gates');
  if (run.input.agentProvider && !['validation', 'deployment', 'post-deploy'].includes(stage)) {
    const accepted = run.artifacts[stage], sameAccepted = accepted?.hash === digest(envelope);
    ensure(envelope.session && (run.claim ? envelope.session.source === run.claim.snapshot.digest : sameAccepted && digest(accepted.envelope.session) === digest(envelope.session)), 'Managed agent stage requires a captured provider session receipt');
    ensure(![...Object.values(run.artifacts), ...run.history].some(a => a?.hash !== digest(envelope) && a?.envelope.session?.id === envelope.session!.id), 'Independent agent session cannot be reused');
  }
  const req = stage !== 'requirements' ? data(run, 'requirements') : d;
  const reqs = records(req.requirements, 'requirements'), criteria = records(req.criteria, 'criteria');
  const reqIds = reqs.map(r => String(r.id)), acIds = criteria.map(c => String(c.id));
  criteria.forEach(c => ensure(words(c.requirements, 'criterion.requirements').every(id => reqIds.includes(id)), 'Criterion references missing requirement'));
  reqIds.forEach(id => ensure(criteria.some(c => words(c.requirements, 'requirements').includes(id)), `Orphaned requirement ${id}`));
  if (stage === 'requirements') ensure(words(d.ambiguities, 'ambiguities', false).length === 0, 'Unresolved requirements ambiguity');
  if (stage === 'recon') records(d.facts, 'facts').forEach(f => words(f.evidence, 'fact.evidence').forEach(file => ensure(envelope.snapshot.files[file] && envelope.snapshot.files[file] !== 'DELETED', `Recon lacks actual repository file: ${file}`)));
  if (stage === 'red-team') {
    const attacks = words(d.attacks, 'attacks'); ATTACKS.forEach(a => ensure(attacks.includes(a), `Missing architecture attack: ${a}`));
    records(d.findings, 'findings', false).forEach(f => ensure(reqIds.includes(String(f.requirement)), 'Finding has unknown requirement'));
  }
  if (stage === 'adjudication') {
    const findings = records(data(run, 'red-team').findings, 'findings', false), decisions = records(d.decisions, 'decisions', false);
    ensure(digest(findings.map(f => f.id).sort()) === digest(decisions.map(f => f.id).sort()), 'Every red-team finding needs exactly one adjudication');
    decisions.forEach(decision => {
      const finding = findings.find(f => f.id === decision.id)!;
      ensure(decision.disposition !== 'NEEDS_HUMAN_DECISION', `Unresolved mandatory architecture decision ${decision.id}`);
      ensure(!(decision.disposition === 'DEFERRED' && ['HIGH', 'CRITICAL'].includes(String(finding.severity))), `Cannot defer blocking architecture finding ${decision.id}`);
    });
    if (findings.some(f => f.humanDecision) || decisions.some(dec => dec.disposition === 'REJECTED' && ['HIGH', 'CRITICAL'].includes(String(findings.find(f => f.id === dec.id)!.severity)))) {
      requireApproval(run, 'architecture', architectureSubject(run, d), now, publicKey);
    }
  }
  if (stage === 'plan') {
    const tasks = records(d.tasks, 'tasks'), specs = commands(d.commands), accepted = records(data(run, 'adjudication').decisions, 'decisions', false).filter(f => f.disposition === 'ACCEPTED');
    tasks.forEach(t => {
      ensure(words(t.criteria, 'task.criteria').every(id => acIds.includes(id)), `Orphan implementation task ${t.id}`);
      ensure(words(t.dependsOn, 'dependsOn', false).every(id => tasks.some(x => x.id === id)), 'Unknown task dependency');
    });
    const visited = new Set<string>(), visiting = new Set<string>(), byId = new Map(tasks.map(t => [String(t.id), t]));
    const visit = (id: string) => { if (visited.has(id)) return; ensure(!visiting.has(id), 'Cyclic implementation graph'); visiting.add(id); words(byId.get(id)!.dependsOn, 'dependsOn', false).forEach(visit); visiting.delete(id); visited.add(id); };
    tasks.forEach(t => visit(String(t.id)));
    acIds.forEach(id => {
      ensure(tasks.some(t => words(t.criteria, 'criteria').includes(id)), `Criterion removed from implementation graph: ${id}`);
      ensure(specs.some(c => !['static', 'deployment', 'post-deploy'].includes(c.domain) && c.criteria.includes(id)), `No behavioral test command for ${id}`);
    });
    specs.forEach(c => ensure(c.criteria.every(id => acIds.includes(id)), 'Command references unknown criterion'));
    accepted.forEach(f => ensure(tasks.some(t => words(t.findings ?? [], 'task.findings', false).includes(String(f.id))), `Accepted finding ${f.id} lacks remediation task`));
    const coverage = specs.filter(c => !['deployment', 'post-deploy'].includes(c.domain)).flatMap(c => c.coverage);
    const exact: Record<string, string[][]> = {
      'web-typecheck': [['pnpm', '--filter', 'web', 'exec', 'tsc', '--noEmit']],
      'web-build': [['pnpm', 'build:web']], 'mobile-typecheck': [['pnpm', '--filter', 'mobile', 'typecheck']],
      'harness-typecheck': [['pnpm', 'harness:typecheck']], 'harness-tests': [['pnpm', 'harness:test']],
      'schema-validation': [['pnpm', 'exec', 'prisma', 'validate']],
      'desktop-build': [['pnpm', 'build:desktop']],
      'desktop-typecheck': [['pnpm', '--filter', 'web', 'exec', 'tsc', '--project', '../desktop/tsconfig.json', '--noEmit']],
    };
    for (const [label, allowed] of Object.entries(exact)) {
      if (coverage.includes(label)) ensure(specs.some(c => c.coverage.includes(label) && allowed.some(a => digest(a) === digest([c.program, ...c.args]))), `Coverage ${label} requires its actual repository command`);
    }
    const plannedFiles = words(d.files, 'files');
    const floor = run.input.profile === 'harness' ? ['harness-tests', 'harness-typecheck'] : ['runtime-regression'];
    if (run.input.profile !== 'harness') {
      if (run.input.profile === 'mobile' || plannedFiles.some(f => f.startsWith('apps/mobile/'))) floor.push('mobile-typecheck', 'native-behavior');
      if (run.input.profile === 'desktop' || plannedFiles.some(f => f.startsWith('apps/desktop/'))) floor.push('desktop-typecheck', 'desktop-build', 'desktop-behavior');
      if (['frontend', 'api', 'database', 'fullstack'].includes(run.input.profile) || plannedFiles.some(f => /^(apps\/web|prisma|packages)\//.test(f))) floor.push('web-typecheck', 'web-build');
      ensure(!plannedFiles.some(f => f.startsWith('apps/api/src/')), 'apps/api is an empty placeholder; backend logic belongs in apps/web');
    }
    floor.forEach(c => ensure(coverage.includes(c), `Mandatory validation missing: ${c}`));
    const files = words(d.files, 'files');
    const sensitive = classify(files, [...run.input.operations, ...words(d.operations, 'operations', false)]);
    const preview = { ...run, risk: maxRisk(run.risk, sensitive), artifacts: { ...run.artifacts, plan: { envelope } as ArtifactRef } };
    if (['frontend', 'fullstack'].includes(run.input.profile) || files.some(f => /^apps\/web\/.*\.(tsx|css)$/.test(f))) ensure(d.browser === true, 'Browser-visible changes require browser verification');
    if (d.browser) ensure(specs.some(c => c.domain === 'browser' && c.coverage.includes('browser-behavior')), 'Missing browser behavioral tests');
    if (d.browser && run.input.quality === 'maximum') ['visual-regression', 'performance', 'accessibility', 'broader-browser-coverage'].forEach(c => ensure(coverage.includes(c), `Maximum browser quality requires measured ${c}`));
    if (d.browser) ensure(specs.some(c => c.domain === 'browser' && c.program === 'pnpm' && c.args.includes('playwright') && c.args.includes('test') && c.args.includes('--config') && c.args.includes('.orchestra/harness/playwright.config.ts')), 'Browser verification must use the isolated harness Playwright configuration');
    if (securityRequired(preview)) SECURITY_BOUNDARIES.forEach(b => ensure(specs.some(c => c.domain === 'security' && c.coverage.includes(b)), `Missing direct-boundary security coverage ${b}`));
    if (databaseRequired(preview)) DATABASE_COVERAGE.forEach(b => ensure(specs.some(c => (c.domain === 'database' || (b === 'schema-validation' && c.domain === 'static')) && c.coverage.includes(b)), `Missing database rehearsal coverage ${b}`));
    if (run.input.deployment) {
      const deployment = object(d.deployment, 'deployment plan'); word(deployment.target, 'reviewed deployment target'); word(deployment.idempotencyStrategy, 'idempotency strategy'); word(deployment.recovery, 'deployment recovery');
      ensure(specs.some(c => c.domain === 'deployment'), 'Missing deployment adapter');
      ensure(specs.some(c => c.domain === 'post-deploy' && c.coverage.includes('post-deploy-health')), 'Missing post-deployment verification');
    } else ensure(!specs.some(c => ['deployment', 'post-deploy'].includes(c.domain)), 'Deployment commands require deployment intake');
  }
  if (stage === 'implementation' || stage === 'tests') {
    const files = words(d.files, 'files'), planFiles = words(data(run, 'plan').files, 'plan.files');
    ensure(files.every(f => planFiles.includes(f)), 'Manifest contains unplanned files');
    const actual = changed(run.claim!.snapshot, envelope.snapshot);
    ensure(actual.every(f => files.includes(f)), `Undeclared stage changes: ${actual.filter(f => !files.includes(f)).join(', ')}`);
    if (stage === 'tests') {
      ensure(files.every(f => /^tests\/|^playwright\/|^playwright\.config\.ts$/.test(f)), 'Test author cannot modify product or harness controls');
      const mapping = records(d.mapping, 'mapping'), specs = planCommands(run);
      ensure(digest(mapping.map(m => m.id).sort()) === digest(acIds.slice().sort()), 'Test mapping must cover exactly the contractual criteria');
      mapping.forEach(m => {
        words(m.commands, 'mapped commands').forEach(id => ensure(specs.some(c => c.id === id && c.criteria.includes(String(m.id)) && c.domain !== 'static'), 'Test mapping does not match behavioral command'));
        words(m.tests, 'mapped tests').forEach(f => ensure(envelope.snapshot.files[f] && envelope.snapshot.files[f] !== 'DELETED', `Missing test source ${f}`));
      });
    }
  }
  if (['validation', 'deployment', 'post-deploy'].includes(stage)) {
    const executed = evidence(run, words(d.evidence, 'evidence'), envelope.snapshot);
    const required = mandatoryCommands(run, stage);
    ensure(required.length > 0, 'No mandatory commands');
    required.forEach(c => ensure(executed.some(e => e.commandId === c.id && e.stage === stage), `Missing executed command ${c.id}`));
    if (stage === 'deployment' || stage === 'post-deploy') {
      const target = word(object(data(run, 'plan').deployment).target, 'deployment target');
      executed.forEach(e => ensure(e.deployment?.target === target && e.deployment.idempotencyKey === deploymentKey(run, e.commandId), 'Execution target/idempotency differs from approved deployment'));
      if (stage === 'deployment') ensure(d.target === target && d.idempotencyKey === deploymentKey(run), 'Deployment receipt differs from the approved target/stage key');
    }
    // A failed command remains authoritative until a new repair attempt.
    ensure(!run.commands.some(e => e.attempt === run.attempt && e.stage === stage && e.status !== 'PASS'), 'Unresolved failed/incomplete execution in this attempt');
  }
  if (['qa', 'security', 'code-review'].includes(stage)) {
    ensure(d.diffDigest === envelope.snapshot.digest, 'Reviewer did not inspect the current working-tree identity');
    const executed = evidence(run, words(d.evidence, 'review.evidence'), envelope.snapshot);
    ensure(d.verdict === 'PASS', 'Independent reviewer rejected work');
    records(d.findings, 'findings', false).forEach(f => ensure(f.resolved || !['HIGH', 'CRITICAL'].includes(String(f.severity)), `Unresolved blocking finding ${f.id}`));
    if (stage === 'qa') {
      const mapped = records(d.criteria, 'QA criteria'); ensure(digest(mapped.map(c => c.id).sort()) === digest(acIds.slice().sort()), 'QA omitted criteria');
      mapped.forEach(c => { ensure(c.status === 'PASS', `Criterion ${c.id} failed`); evidence(run, words(c.evidence, 'criterion.evidence'), envelope.snapshot).forEach(e => ensure(planCommands(run).some(s => s.id === e.commandId && s.criteria.includes(String(c.id)) && s.domain !== 'static'), 'Criterion lacks actual behavioral execution')); });
    }
    if (stage === 'security') {
      const boundaries = records(d.boundaries, 'boundaries');
      SECURITY_BOUNDARIES.forEach(id => ensure(boundaries.some(b => b.id === id), `Security reviewer omitted boundary ${id}`));
      boundaries.forEach(b => {
        if (securityRequired(run)) {
          const cited = words(b.evidence, 'boundary.evidence');
          ensure(executed.some(e => cited.includes(e.id) && planCommands(run).some(c => c.id === e.commandId && c.domain === 'security' && c.coverage.includes(String(b.id)))), `Boundary ${b.id} lacks direct execution evidence`);
        }
      });
    }
    if (stage === 'code-review') {
      ensure(envelope.diff && run.claim?.diff && digest(envelope.diff) === digest(run.claim.diff) && envelope.diff.snapshot === envelope.snapshot.digest && d.diffHash === envelope.diff.hash, 'Code review must cite the controller-captured current diff');
      const inspected = words(d.inspectedFiles, 'inspectedFiles'); words(data(run, 'plan').files, 'plan.files').forEach(file => ensure(inspected.includes(file), `Code reviewer omitted file ${file}`));
      const resolutions = records(d.resolutions ?? [], 'architecture resolutions', false);
      records(data(run, 'adjudication').decisions, 'decisions', false).filter(f => f.disposition === 'ACCEPTED').forEach(f => {
        const r = resolutions.find(r => r.id === f.id); ensure(r && r.resolved === true, `Architecture finding ${f.id} remains unresolved`);
        evidence(run, words(r.evidence, 'resolution.evidence'), envelope.snapshot);
      });
    }
  }
  if (['release', 'deployment', 'post-deploy'].includes(stage)) {
    for (const s of STAGES.slice(STAGES.indexOf('tests'), STAGES.indexOf(stage))) ensure(run.artifacts[s]!.envelope.snapshot.digest === envelope.snapshot.digest, `Stale ${s} at release/deployment`);
    ensure(!run.failures.some(f => f.attempt === run.attempt), 'Unresolved failures in release attempt');
    if (RISK_ORDER.indexOf(run.risk) >= 2) requireApproval(run, 'implementation', implementationSubject(run), now, publicKey);
    if (stage === 'deployment' || stage === 'post-deploy') requireApproval(run, 'deployment', deploymentSubject(run), now, publicKey);
  }
}
import { OWNERS } from './types';
function owner(stage: Stage) { return OWNERS[stage]; }
