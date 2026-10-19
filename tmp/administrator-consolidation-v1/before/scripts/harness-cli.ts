#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Controller } from './harness/controller';
import { ensure } from './harness/contracts';
import { execute } from './harness/runner';
import { Approval, OWNERS, Run, Stage } from './harness/types';

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--'), action = args[0];
  const arg = (name: string) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
  if (!action || action === 'help') {
    console.log('harness init|status|begin|submit|execute|approval-request|approve|fail|repair|interrupt|resume|recover --run run_ID [--file JSON] [--stage STAGE --actor SESSION --token LEASE] [--purpose implementation|architecture|deployment] [--reason TEXT]');
    return;
  }
  const runId = arg('run'); ensure(runId, '--run is required; implicit latest-run mutations are forbidden');
  const c = new Controller(arg('root') ? path.resolve(arg('root')!) : path.resolve(__dirname, '..'), runId);
  const file = () => { const f = arg('file'); ensure(f, '--file is required'); return JSON.parse(fs.readFileSync(f, 'utf8')) as unknown; };
  const stage = () => { const s = arg('stage'); ensure(s, '--stage required'); return s as Stage; };
  const actor = () => { const a = arg('actor'); ensure(a, '--actor required'); return a; };
  const token = () => { const t = arg('token'); ensure(t, '--token required'); return t; };
  let output: unknown;
  switch (action) {
    case 'init': output = c.init(file()); break;
    case 'status': output = c.status(); break;
    case 'begin': { const result = c.begin(stage(), actor()); output = { state: result.run.state, stage: result.run.next, token: result.token, ...(result.run.claim?.diff ? { diff: result.run.claim.diff } : {}) }; break; }
    case 'submit': output = c.submit(stage(), actor(), token(), file()); break;
    case 'execute': await execute(c, stage(), actor(), token()); output = c.read(); break;
    case 'approval-request': { const p = arg('purpose') as Approval['payload']['purpose']; ensure(['implementation', 'architecture', 'deployment'].includes(p), '--purpose required'); output = c.approvalRequest(p, p === 'architecture' ? file() : undefined); break; }
    case 'approve': output = c.approve(file()); break;
    case 'fail': output = c.fail(stage(), [arg('reason') || 'Host reported stage failure']); break;
    case 'repair': output = c.repair(); break;
    case 'interrupt': output = c.interrupt(arg('reason') || 'Host requested interruption'); break;
    case 'resume': output = c.resume(); break;
    case 'recover': c.store.recover(arg('reason') || 'Operator recovered stopped process'); output = c.read(); break;
    default: throw new Error(`Unknown action ${action}`);
  }
  if (output && typeof output === 'object' && 'baseline' in output && 'artifacts' in output) {
    const run = output as Run;
    output = {
      runId: run.runId, state: run.state, next: run.next, nextActor: run.next ? run.input.actors[OWNERS[run.next]] : null,
      attempt: run.attempt, repairCount: run.repairCount, risk: run.risk,
      active: run.claim ? { stage: run.claim.stage, actor: run.claim.actor, expiresAt: run.claim.expiresAt } : null,
      artifacts: Object.fromEntries(Object.entries(run.artifacts).map(([stage, artifact]) => [stage, { path: artifact!.path, hash: artifact!.hash, snapshot: artifact!.envelope.snapshot.digest }])),
      commands: run.commands.map(e => ({ id: e.id, commandId: e.commandId, attempt: e.attempt, status: e.status, exitCode: e.exitCode, output: e.output, result: e.result, snapshot: e.snapshot.digest })),
      failures: run.failures.map(f => ({ attempt: f.attempt, stage: f.stage, reasons: f.reasons, at: f.at })),
      baseline: { head: run.baseline.head, digest: run.baseline.digest }, deploymentUncertain: run.deploymentUncertain,
    };
  }
  console.log(JSON.stringify(output, null, 2));
}
main().catch(e => { console.error(`HARNESS BLOCKED: ${(e as Error).message}`); process.exitCode = 1; });
