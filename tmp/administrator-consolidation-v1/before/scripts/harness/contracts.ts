import { CommandSpec, Input, ROLES, STAGES, Stage } from './types';

export function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function object(value: unknown, label = 'object'): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  return value as Record<string, unknown>;
}
export function list(value: unknown, label: string): unknown[] {
  ensure(Array.isArray(value), `${label} must be an array`); return value;
}
export function words(value: unknown, label: string, nonempty = true): string[] {
  const values = list(value, label);
  ensure(values.every(v => typeof v === 'string' && v.trim()), `${label} must contain nonempty strings`);
  ensure(!nonempty || values.length > 0, `${label} must not be empty`);
  ensure(new Set(values).size === values.length, `${label} contains duplicates`);
  return values as string[];
}
export function word(value: unknown, label: string): string {
  ensure(typeof value === 'string' && value.trim(), `${label} must be a nonempty string`); return value;
}
export function records(value: unknown, label: string, nonempty = true): Record<string, unknown>[] {
  const values = list(value, label).map(v => object(v, label));
  ensure(!nonempty || values.length > 0, `${label} must not be empty`);
  const ids = values.map(v => word(v.id, `${label}.id`));
  ensure(new Set(ids).size === ids.length, `${label} contains duplicate IDs`);
  return values;
}
export function relativeFile(value: unknown): string {
  const file = word(value, 'file path');
  ensure(!file.includes('\\') && !file.startsWith('/') && !file.includes(':') && !file.split('/').some(p => p === '..' || p === '.' || !p), `Unsafe file path: ${file}`);
  return file;
}
export function validateInput(value: unknown): Input {
  const d = object(value, 'input'); word(d.prompt, 'prompt');
  ensure(['frontend', 'api', 'database', 'fullstack', 'mobile', 'desktop', 'bugfix', 'refactor', 'harness'].includes(String(d.profile)), 'Unknown profile');
  ensure(['standard', 'strict', 'maximum'].includes(String(d.quality)), 'Unknown quality');
  ensure(typeof d.deployment === 'boolean', 'deployment must be boolean');
  ensure(d.agentProvider === undefined || d.agentProvider === 'codex', 'Unknown agent provider');
  words(d.operations, 'operations', false);
  const actors = object(d.actors, 'actors');
  ROLES.forEach(role => word(actors[role], `actors.${role}`));
  const capabilities = object(d.actorCapabilities, 'actorCapabilities');
  ROLES.forEach(role => ensure(typeof capabilities[role] === 'string' && /^[a-f0-9]{64}$/.test(String(capabilities[role])), `actorCapabilities.${role} must be a SHA-256 capability digest`));
  ensure(new Set(ROLES.map(r => capabilities[r])).size === ROLES.length, 'Role capabilities must be distinct');
  // A human-controlled host must bind these identifiers to real isolated sessions.
  ensure(new Set(ROLES.map(r => actors[r])).size === ROLES.length, 'Every role needs a distinct actor/session ID');
  return d as unknown as Input;
}
export function commands(value: unknown): CommandSpec[] {
  return records(value, 'commands').map(d => {
    ensure(/^[a-zA-Z0-9_-]+$/.test(word(d.id, 'command.id')), 'Unsafe command ID');
    ensure(['node', 'pnpm'].includes(String(d.program)), 'Only node and pnpm command adapters are supported');
    const args = list(d.args, 'command.args');
    ensure(args.length > 0 && args.every(a => typeof a === 'string' && a.trim()), 'Command args must be nonempty strings');
    ensure(!args.some(a => ['-e', '--eval', '-p', '--print', '--input-type', '--experimental-loader', '--loader'].includes(String(a)) || String(a).startsWith('--eval=')), 'Inline evaluation and arbitrary loaders are forbidden');
    ensure(!args.some(a => /^--?(password|token|secret|api-key|database-url|connection-string)(=|$)/i.test(String(a))), 'Secrets must be injected by the host, not placed in command arguments');
    ensure(['static', 'runtime', 'browser', 'security', 'database', 'deployment', 'post-deploy'].includes(String(d.domain)), 'Unknown command domain');
    if (d.domain === 'browser') {
      ensure(d.program === 'pnpm' && JSON.stringify(args.slice(0, 3)) === JSON.stringify(['exec', 'playwright', 'test']), 'Browser evidence must execute the actual Playwright CLI');
      const configFlags = args.map(String).filter(arg => arg === '--config' || arg.startsWith('--config='));
      const configIndex = args.indexOf('--config');
      ensure(configFlags.length === 1 && configIndex >= 3 && args[configIndex + 1] === '.orchestra/harness/playwright.config.ts', 'Browser must use exactly one private harness configuration');
      ensure(!args.some(arg => /^--(retries|repeat-each|reporter|output)(=|$)/.test(String(arg))), 'Browser argv cannot override retry or run-local evidence settings');
    }
    words(d.criteria, 'command.criteria', false); words(d.coverage, 'command.coverage'); words(d.tests, 'command.tests', d.domain !== 'static' && d.domain !== 'deployment');
    ensure(Number.isInteger(d.timeoutMs) && Number(d.timeoutMs) >= 100 && Number(d.timeoutMs) <= 1_800_000, 'Command timeout must be 100..1800000ms');
    return d as unknown as CommandSpec;
  });
}
export function validateArtifact(stage: Stage, value: unknown): Record<string, unknown> {
  ensure(STAGES.includes(stage), 'Unknown stage');
  const d = object(value, `${stage} artifact`);
  if (stage === 'requirements') {
    const reqs = records(d.requirements, 'requirements'); reqs.forEach(r => word(r.description, 'requirement.description'));
    const criteria = records(d.criteria, 'criteria');
    criteria.forEach(c => { word(c.description, 'criterion.description'); words(c.requirements, 'criterion.requirements'); words(c.assertions, 'criterion.assertions'); });
    words(d.ambiguities, 'ambiguities', false);
  } else if (stage === 'recon') {
    records(d.facts, 'facts').forEach(f => { word(f.claim, 'fact.claim'); words(f.evidence, 'fact.evidence').forEach(relativeFile); });
    word(d.proposal, 'proposal'); words(d.assumptions, 'assumptions', false);
  } else if (stage === 'red-team') {
    records(d.findings, 'findings', false).forEach(f => {
      ensure(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(f.severity)), 'Unknown severity');
      word(f.requirement, 'finding.requirement'); words(f.evidence, 'finding.evidence');
      word(f.impact, 'finding.impact'); word(f.recommendation, 'finding.recommendation');
      ensure(typeof f.confidence === 'number' && f.confidence >= 0 && f.confidence <= 1, 'Confidence must be 0..1');
      ensure(typeof f.humanDecision === 'boolean', 'humanDecision must be boolean');
    });
    words(d.attacks, 'attacks');
  } else if (stage === 'adjudication') {
    records(d.decisions, 'decisions', false).forEach(f => {
      ensure(['ACCEPTED', 'REJECTED', 'DEFERRED', 'NEEDS_HUMAN_DECISION'].includes(String(f.disposition)), 'Unknown disposition');
      word(f.reason, 'decision.reason'); words(f.evidence, 'decision.evidence'); word(f.resolution, 'decision.resolution');
    }); word(d.architecture, 'architecture');
  } else if (stage === 'plan') {
    words(d.files, 'files').forEach(relativeFile);
    records(d.tasks, 'tasks').forEach(t => { words(t.criteria, 'task.criteria'); word(t.description, 'task.description'); words(t.dependsOn, 'task.dependsOn', false); });
    commands(d.commands); words(d.operations, 'plan.operations', false); word(d.recovery, 'recovery assessment');
    ensure(typeof d.browser === 'boolean', 'browser must be boolean');
    if (d.deployment !== undefined) { const deployment = object(d.deployment, 'deployment plan'); word(deployment.target, 'deployment.target'); word(deployment.idempotencyStrategy, 'deployment.idempotencyStrategy'); word(deployment.recovery, 'deployment.recovery'); }
  } else if (stage === 'implementation' || stage === 'tests') {
    words(d.files, 'files').forEach(relativeFile); word(d.summary, 'summary');
    if (stage === 'tests') records(d.mapping, 'test mapping').forEach(m => { words(m.commands, 'mapping.commands'); words(m.tests, 'mapping.tests').forEach(relativeFile); });
  } else if (stage === 'validation' || stage === 'post-deploy' || stage === 'deployment') {
    words(d.evidence, 'command evidence');
    if (stage === 'deployment') { word(d.target, 'deployment target'); word(d.idempotencyKey, 'idempotency key'); }
  } else if (stage === 'qa' || stage === 'security' || stage === 'code-review') {
    words(d.evidence, 'review evidence'); word(d.diffDigest, 'reviewed diff digest');
    ensure(d.verdict === 'PASS' || d.verdict === 'FAIL', 'review verdict must be PASS or FAIL');
    records(d.findings, 'review findings', false).forEach(f => {
      ensure(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(f.severity)), 'Unknown review severity');
      ensure(typeof f.resolved === 'boolean', 'resolved must be boolean'); word(f.issue, 'finding.issue'); words(f.evidence, 'finding.evidence');
    });
    if (stage === 'qa') records(d.criteria, 'QA criteria').forEach(c => { ensure(c.status === 'PASS' || c.status === 'FAIL', 'criterion status invalid'); words(c.evidence, 'criterion.evidence'); });
    if (stage === 'security') records(d.boundaries, 'boundaries').forEach(b => { word(b.assessment, 'boundary assessment'); words(b.evidence, 'boundary evidence'); });
  } else if (stage === 'release') {
    ensure(d.ready === true, 'release readiness must be explicitly requested'); word(d.recovery, 'release recovery strategy');
  }
  return d;
}
