import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensure } from './contracts';
import { Controller } from './controller';
import { data, deploymentKey, mandatoryCommands, requireApproval, deploymentSubject } from './gates';
import { object, word } from './contracts';
import { buildOutputs, digest, hash, safePath, snapshot } from './repository';
import { checkResults } from './results';
import { sanitize } from './redaction';
import { CommandEvidence, CommandSpec, Stage } from './types';

export function pnpmEntry(): string {
  const supplied = process.env.HARNESS_PNPM_CLI ?? process.env.npm_execpath;
  if (supplied && /pnpm\.(c?js|mjs)$/.test(supplied) && fs.existsSync(supplied)) return supplied;
  const paths = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', ['pnpm'], { encoding: 'utf8' }).trim().split(/\r?\n/);
  for (const p of paths) for (const candidate of [path.join(path.dirname(p), 'node_modules/pnpm/bin/pnpm.cjs'), path.join(path.dirname(p), 'node_modules/pnpm/bin/pnpm.mjs'), path.join(path.dirname(p), '../../node/node_modules/pnpm/bin/pnpm.mjs')]) if (fs.existsSync(candidate)) return candidate;
  throw new Error('Cannot resolve pnpm CLI. Set HARNESS_PNPM_CLI to the installed pnpm.cjs/mjs; shell execution is disabled.');
}
export function assertCleanTestCheckout(root: string): void {
  for (const directory of [root, path.join(root, 'apps/web')]) {
    if (!fs.existsSync(directory)) continue;
    ensure(!fs.readdirSync(directory).some(file => /^\.env($|\.)/.test(file) && !file.endsWith('.example')), 'Product validation requires a clean checkout without live environment files; inject disposable configuration through the host');
  }
}
function executionEnvironment(spec: CommandSpec, harnessOnly: boolean, root: string): { env: NodeJS.ProcessEnv; identity: string; redact: (text: string) => string } {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PATHEXT', 'PNPM_HOME', 'npm_execpath', 'HARNESS_PNPM_CLI', 'HARNESS_APPROVAL_PUBLIC_KEY']) if (process.env[key]) env[key] = process.env[key];
  env.CI = 'true'; env.HARNESS_ENVIRONMENT = process.env.HARNESS_ENVIRONMENT || 'local-static';
  // Verification must never implicitly install/update dependencies or switch package managers.
  env.pnpm_config_verify_deps_before_run = 'warn'; env.pnpm_config_pm_on_fail = 'error';
  if (harnessOnly && spec.domain === 'browser') {
    const base = new URL(process.env.HARNESS_TEST_BASE_URL || 'http://127.0.0.1:43987');
    ensure(base.protocol === 'http:' && base.hostname === '127.0.0.1' && Number(base.port) >= 1024, 'Harness browser fixture requires an explicit loopback port');
    env.HARNESS_BROWSER_FIXTURE = '1'; env.E2E_BASE_URL = base.origin;
  }
  const sensitive = !harnessOnly && (['runtime', 'browser', 'security', 'database'].includes(spec.domain) || spec.coverage.includes('web-build'));
  if (sensitive) {
    assertCleanTestCheckout(root);
    ensure(process.env.HARNESS_ENVIRONMENT && process.env.HARNESS_TEST_DATABASE_URL, 'Behavioral checks require HARNESS_ENVIRONMENT and a disposable HARNESS_TEST_DATABASE_URL');
    const db = new URL(process.env.HARNESS_TEST_DATABASE_URL);
    ensure(['postgres:', 'postgresql:'].includes(db.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) && /^\/harness_[a-zA-Z0-9_-]+$/.test(db.pathname), 'Tests require a local PostgreSQL database named harness_*');
    env.DATABASE_URL = process.env.HARNESS_TEST_DATABASE_URL;
    env.HARNESS_TEST_DATABASE_URL = env.DATABASE_URL;
    env.DATABASE_URL_UNPOOLED = env.DATABASE_URL;
    const base = new URL(process.env.HARNESS_TEST_BASE_URL || 'http://localhost:3000');
    ensure(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Test server must be local and use the disposable database');
    env.E2E_BASE_URL = base.origin;
    env.HARNESS_TEST_BASE_URL = base.origin;
    if (spec.domain === 'browser') env.E2E_USE_BUILD = '1';
    for (const [key, value] of Object.entries(process.env)) if (/^E2E_(STUDENT|TEACHER|ADMIN|PROFESSOR)_/.test(key)) env[key] = value;
  }
  if (spec.domain === 'deployment' || spec.domain === 'post-deploy') {
    ensure(process.env.HARNESS_DEPLOYMENT_TARGET, 'Deployment adapter requires HARNESS_DEPLOYMENT_TARGET');
    for (const [key, value] of Object.entries(process.env)) if (key.startsWith('HARNESS_DEPLOYMENT_')) env[key] = value;
    if (spec.domain === 'post-deploy') env.HARNESS_VERIFY_ONLY = 'true';
  }
  // Bind all forwarded values without persisting their plaintext in evidence.
  const identity = digest({ node: process.version, platform: process.platform, arch: process.arch, env });
  const secrets = Object.entries(env).filter(([key]) => /PASSWORD|TOKEN|SECRET|DATABASE_URL|EMAIL|KEY/.test(key) && key !== 'HARNESS_APPROVAL_PUBLIC_KEY').map(([, value]) => value!).filter(v => v.length >= 4);
  if (env.DATABASE_URL) { const u = new URL(env.DATABASE_URL); if (u.password) secrets.push(decodeURIComponent(u.password)); }
  return { env, identity, redact: text => sanitize(text, secrets) };
}
export async function execute(controller: Controller, stage: Stage, actor: string, token: string,
  observer?: (checkpoint: 'prepared' | 'executed', command: CommandSpec) => Promise<void>): Promise<void> {
  ensure(['validation', 'deployment', 'post-deploy'].includes(stage), 'This stage cannot execute commands');
  const initial = controller.status();
  ensure(initial.claim?.actor === actor && initial.claim.tokenHash === hash(token) && initial.claim.stage === stage, 'Execution needs matching stage lease');
  for (const spec of mandatoryCommands(initial, stage)) {
    let evidence: CommandEvidence | undefined;
    try {
      const environment = executionEnvironment(spec, initial.input.profile === 'harness', controller.root), id = randomUUID();
      const base = snapshot(controller.root);
      const report = `commands/${initial.attempt}/${id}.result.json`;
      environment.env.HARNESS_RESULT_PATH = safePath(controller.store.dir, report);
      environment.env.HARNESS_RUN_ID = controller.runId;
      environment.env.HARNESS_ENVIRONMENT_ID = environment.identity;
      const deployment = ['deployment', 'post-deploy'].includes(stage) ? { target: word(object(data(initial, 'plan').deployment).target, 'reviewed deployment target'), idempotencyKey: deploymentKey(initial, spec.id) } : undefined;
      if (deployment) ensure(environment.env.HARNESS_DEPLOYMENT_TARGET === deployment.target, 'Actual deployment target differs from approved plan');
      environment.env.HARNESS_IDEMPOTENCY_KEY = deployment?.idempotencyKey ?? digest({ run: controller.runId, command: spec.id, plan: initial.artifacts.plan!.hash });
      environment.env.PLAYWRIGHT_JSON_OUTPUT_NAME = environment.env.HARNESS_RESULT_PATH;
      fs.mkdirSync(path.dirname(environment.env.HARNESS_RESULT_PATH), { recursive: true });
      evidence = { id, commandId: spec.id, runId: initial.runId, attempt: initial.attempt, stage, snapshot: { head: base.head, index: base.index, digest: base.digest }, planHash: initial.artifacts.plan!.hash, startedAt: new Date().toISOString(), environment: environment.identity, argv: [spec.program, ...spec.args], status: 'RUNNING', ...(deployment ? { deployment } : {}) };
      controller.store.locked(() => {
        const run = controller.read(); ensure(run.claim?.tokenHash === hash(token), 'Execution lease lost');
        if (stage === 'deployment') requireApproval(run, 'deployment', deploymentSubject(run), new Date().toISOString(), controller.publicKey);
        controller.store.append({ type: 'COMMAND_STARTED', evidence: evidence! });
      });
      const argv = spec.program === 'pnpm' ? [pnpmEntry(), ...spec.args] : spec.args;
      await observer?.('prepared', spec);
      const result = await new Promise<{ exitCode: number | null; signal: string | null; output: string; error?: string }>(resolve => {
        const child = spawn(process.execPath, argv, { cwd: controller.root, env: environment.env, shell: false, windowsHide: true, detached: process.platform !== 'win32' });
        let output = '', error: string | undefined;
        child.stdout.on('data', b => { if (output.length < 8_000_000) output += b.toString(); else error = 'Output exceeded 8MB capture limit'; });
        child.stderr.on('data', b => { if (output.length < 8_000_000) output += b.toString(); else error = 'Output exceeded 8MB capture limit'; });
        const terminate = () => {
          error = 'Command timed out; command tree terminated';
          if (process.platform === 'win32' && child.pid) spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          else if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
        };
        const timer = setTimeout(terminate, spec.timeoutMs);
        child.on('error', e => { clearTimeout(timer); resolve({ exitCode: null, signal: null, output, error: e.message }); });
        child.on('close', (exitCode, signal) => { clearTimeout(timer); resolve({ exitCode, signal, output, ...(error ? { error } : {}) }); });
      });
      await observer?.('executed', spec);
      if (snapshot(controller.root).digest !== base.digest) result.error = 'Command changed source or source changed during execution';
      const output = controller.store.put(`commands/${initial.attempt}/${id}.log`, environment.redact(result.output));
      const finished: CommandEvidence = { ...evidence, finishedAt: new Date().toISOString(), exitCode: result.exitCode, signal: result.signal, output: output.path, outputHash: output.hash, status: result.exitCode === 0 && !result.error && !result.signal ? 'PASS' : 'FAIL', ...(result.error ? { error: environment.redact(result.error) } : {}) };
      if (finished.status === 'PASS' && (spec.coverage.includes('web-build') || spec.coverage.includes('desktop-build'))) {
        try { finished.outputs = buildOutputs(controller.root, spec.coverage.includes('web-build') ? 'apps/web/.next' : 'apps/desktop/dist'); }
        catch (e) { finished.status = 'FAIL'; finished.error = (e as Error).message; }
      }
      if (spec.domain !== 'static' && spec.domain !== 'deployment') {
        try {
          const raw = JSON.parse(fs.readFileSync(environment.env.HARNESS_RESULT_PATH!, 'utf8'));
          const reportData = spec.domain === 'browser' ? normalizePlaywright(raw, environment.identity) : raw;
          const sanitized = environment.redact(JSON.stringify(reportData)); fs.writeFileSync(environment.env.HARNESS_RESULT_PATH!, sanitized);
          finished.result = report; finished.resultHash = hash(sanitized);
          // Preserve named failed/skipped outcomes as evidence before rejecting the command.
          checkResults(reportData, spec, environment.identity, deployment?.target);
        } catch (e) { finished.status = 'FAIL'; finished.error = [finished.error, environment.redact((e as Error).message)].filter(Boolean).join('; '); }
      }
      controller.store.locked(() => controller.store.append({ type: 'COMMAND_FINISHED', evidence: finished }));
      if (finished.status !== 'PASS') throw new Error(`Command ${spec.id} failed: ${finished.error || `exit ${finished.exitCode}`}`);
    } catch (error) {
      controller.fail(stage, [(error as Error).message]); throw error;
    }
  }
}
function normalizePlaywright(raw: unknown, environment: string): unknown {
  const tests: { id: string; status: string; executed: boolean }[] = [];
  const visit = (value: unknown) => {
    const suite = value as { suites?: unknown[]; specs?: { title: string; tests: { status: string; results: { status: string }[] }[] }[] };
    suite.suites?.forEach(visit);
    suite.specs?.forEach(s => { tests.push({ id: s.title, status: s.tests.length > 0 && s.tests.every(t => t.status === 'expected' && t.results.length === 1 && t.results[0].status === 'passed') ? 'passed' : 'failed', executed: s.tests.length > 0 && s.tests.every(t => t.results.some(r => r.status !== 'skipped')) }); });
  };
  visit(raw); return { environment, tests };
}
