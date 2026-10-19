import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { AgentHost, CodexProvider, identities } from './harness/agent-host';
import { Controller } from './harness/controller';
import { ensure } from './harness/contracts';
import { safePath, snapshot } from './harness/repository';
import { pnpmEntry } from './harness/runner';
import { reduce } from './harness/state';
import { Run } from './harness/types';

async function main() {
  const controlRoot = path.resolve(__dirname, '..'), runId = 'run_operational_' + randomUUID().replace(/-/g, '');
  const directory = safePath(controlRoot, `.orchestra/runs/${runId}`), root = path.join(directory, 'workspace'); fs.mkdirSync(root, { recursive: true });
  const write = (file: string, content: string) => { const target = safePath(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); };
  for (const file of Object.keys(snapshot(controlRoot).files)) {
    if (!/^(scripts\/harness|tests\/harness\/|\.orchestra\/harness\/|\.agents\/agents\/|\.agents\/rules\/)|^(package\.json|pnpm-workspace\.yaml|playwright\.config\.ts|apps\/web\/package\.json)$/.test(file)) continue;
    const source = safePath(controlRoot, file); if (!fs.existsSync(source)) continue;
    const target = safePath(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
  }
  write('.gitignore', 'node_modules/\n.orchestra/runs/\nplaywright/results/\nplaywright/report/\n');
  write('README.md', 'Isolated harness operational task. Add docs/fixtures/smoke.html and tests/harness-fixtures/smoke.spec.ts only. No LMS, database, credentials or deployment.');
  write('docs/fixtures/.gitkeep', '');
  for (const relative of ['node_modules', 'apps/web/node_modules']) {
    const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(path.join(controlRoot, relative), target, process.platform === 'win32' ? 'junction' : 'dir');
  }
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q'); git('add', '.'); git('-c', 'user.name=Harness Operational Smoke', '-c', 'user.email=harness-smoke@example.invalid', 'commit', '-qm', 'isolated baseline');
  const identity = identities(runId), c = new Controller(root, runId);
  c.init({ prompt: 'Create a harmless standalone HTML fixture at docs/fixtures/smoke.html with an h1 reading Harness operational smoke and a button named Check readiness. Initially a status element reads Waiting. Clicking the button changes it to Ready. Create an independent Playwright behavioral test for the initial status and click transition. No database, LMS changes or deployment.', profile: 'harness', quality: 'standard', deployment: false, operations: [], agentProvider: 'codex', actors: identity.actors, actorCapabilities: identity.actorCapabilities });
  const port = await new Promise<number>(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); }); });
  process.env.HARNESS_TEST_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.HARNESS_PNPM_CLI = pnpmEntry();
  const instructions = `This is a LOW risk isolated HTML task. Only planned writable files: docs/fixtures/smoke.html and tests/harness-fixtures/smoke.spec.ts.
Use one requirement REQ-SMOKE and acceptance criterion AC-SMOKE, checking initial Waiting status and Ready after click. Tasks must include both authors' paths. Executor writes HTML only, test author writes Playwright only. Read available sources before decisions.
Planner must use browser=true; operations=[]; recovery=delete the two fixture files, no DB or deployment. Commands:
1 {id:types,program:pnpm,args:[harness:typecheck],domain:static,criteria:[],coverage:[harness-typecheck],tests:[],timeoutMs:120000}
2 {id:controls,program:pnpm,args:[harness:test],domain:runtime,criteria:[],coverage:[harness-tests],tests:[planner cannot proceed without architecture adjudication],timeoutMs:180000}
3 {id:browser,program:pnpm,args:[exec,playwright,test,--config,.orchestra/harness/playwright.config.ts],domain:browser,criteria:[AC-SMOKE],coverage:[browser-behavior],tests:[AC-SMOKE: fixture changes from Waiting to Ready],timeoutMs:60000}
Playwright test exact title: AC-SMOKE: fixture changes from Waiting to Ready. It uses @playwright/test, page.goto('/smoke.html'), heading/button/status checks before and after click. The fixture server is preinstalled and trusted, do not change it. Harness check commands are the real copied controller suites, not substitutes.
For changes return beforeHash=ABSENT when creating a file, otherwise the provided source hash. For reviews inspect actual captured outputs and source; cite actual command IDs. Harness-only task changes no server authorization or sensitive data: independently assess all ten boundaries and explain their applicability. Code review must inspect both paths and cite context.diff.hash. Release ready must be based on every accepted gate; never invent outputs. Response.dependencies is an object exactly matching context.dependencies, constrained by the schema. Artifact is JSON string with the contractual stage fields.`;
  const injected = process.argv.includes('--inject-repair'); let injectedOnce = false, repairedOnce = false;
  const host = new AgentHost(c, identity.capabilities, new CodexProvider(), controlRoot, instructions, stage => {
    if (!injected || injectedOnce || stage !== 'implementation') return;
    const target = safePath(root, 'docs/fixtures/smoke.html'), original = fs.readFileSync(target, 'utf8');
    const broken = original.replace(/(['"])Ready\1/g, '$1Fault injected$1'); ensure(broken !== original, 'Cannot inject the selected harmless fixture failure');
    fs.writeFileSync(target, broken); injectedOnce = true;
    c.store.put('fault-injection.json', JSON.stringify({ stage, attempt: c.read().attempt, purpose: 'Deliberately break the Ready transition before validation', path: 'docs/fixtures/smoke.html' }));
  });
  const transitions: string[] = ['DRAFT'];
  try {
    while (c.read().next) {
      try { await host.step(); transitions.push(c.read().state); }
      catch (error) {
        if (!injected || repairedOnce || !injectedOnce || c.read().state !== 'FAILED' || c.read().next !== 'validation') throw error;
        transitions.push('FAILED'); await host.adviseRepair(); repairedOnce = true; transitions.push(c.read().state);
      }
    }
    ensure(c.verify().ready, 'Clean smoke did not reach release readiness');
  } finally {
    const run = c.read();
    let replay: Run | null = null; const journalTransitions: string[] = [];
    for (const entry of c.store.read().entries) { replay = reduce(replay, entry.event, entry.at, c.publicKey); if (journalTransitions.at(-1) !== replay.state) journalTransitions.push(replay.state); }
    fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify({ runId, root, task: run.input.prompt, risk: run.risk, injected, transitions, journalTransitions, finalState: run.state, attempt: run.attempt, repairs: run.repairCount, approvals: run.approvals, commands: run.commands, failures: run.failures, artifacts: Object.fromEntries(Object.entries(run.artifacts).map(([stage, a]) => [stage, { path: a!.path, hash: a!.hash }])) }, null, 2));
    console.log(`SMOKE_SUMMARY ${path.join(directory, 'summary.json')}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
