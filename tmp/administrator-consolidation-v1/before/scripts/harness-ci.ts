// Explicitly requested CI validation only. Publishes a harness-only branch/draft PR, never merges.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ensure } from './harness/contracts';
import { safePath, secret } from './harness/repository';

interface Publication { branch: string; head: string; files: string[]; dir: string; reportFile: string; published: boolean; merged: boolean; pr?: string; number?: number }
interface WorkflowRun { id: number; name: string; status: string; conclusion: string | null; html_url: string }

function prepare(root: string, remote: string, environment: NodeJS.ProcessEnv): Publication {
  const branch = 'codex/harness-operational-' + randomUUID().replace(/-/g, '').slice(0, 12);
  const dir = safePath(root, `.orchestra/runs/${branch.replace('/', '-')}/ci-checkout`); fs.mkdirSync(path.dirname(dir), { recursive: true });
  execFileSync('git', ['clone', '-c', 'core.longpaths=true', '--quiet', '--no-hardlinks', root, dir], { env: environment, stdio: 'pipe' });
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env: environment, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  git('remote', 'set-url', 'origin', remote); git('checkout', '-b', branch);
  const changed = execFileSync('git', ['diff', '--name-only', '-z', 'HEAD'], { cwd: root, encoding: 'utf8' }).split('\0');
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0');
  const allowed = /^(\.agents\/(agents|rules)\/|\.orchestra\/|scripts\/harness|tests\/harness\/|docs\/architecture\/(harness-|agentic-skills)|\.github\/workflows\/harness\.yml$)|^(package\.json|AGENTS\.md|\.gitignore)$/;
  const files = [...new Set([...changed, ...untracked].filter(file => file && allowed.test(file) && !secret(file)))].sort();
  ensure(files.length > 0, 'No reviewed harness files to publish');
  for (const file of files) {
    const source = safePath(root, file), target = safePath(dir, file); ensure(fs.existsSync(source) && fs.lstatSync(source).isFile(), 'CI publication expects regular harness files only');
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
    if (file.startsWith('.agents/')) { const alias = safePath(dir, file.replace('.agents/', '.agent/')); fs.mkdirSync(path.dirname(alias), { recursive: true }); fs.copyFileSync(source, alias); }
  }
  git('add', '--', ...files, '.agent'); git('-c', 'user.name=Harness CI Validation', '-c', 'user.email=harness-ci@example.invalid', 'commit', '-m', 'Operationalize engineering harness v2 with real provider and failure validation');
  const head = git('rev-parse', 'HEAD');
  const changes = git('diff', '--name-only', 'HEAD^', 'HEAD').split(/\r?\n/); ensure(changes.every(file => allowed.test(file) || file.startsWith('.agent/')), 'Product source accidentally entered CI branch');
  const reportFile = path.join(path.dirname(dir), 'ci-publication.json');
  const record = { branch, head, files, dir, reportFile, published: false, merged: false }; fs.writeFileSync(reportFile, JSON.stringify(record, null, 2)); return record;
}

async function main() {
  const root = path.resolve(__dirname, '..'), remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
  const match = remote.match(/^https:\/\/github\.com\/([\w-]+)\/([\w.-]+?)(?:\.git)?$/); ensure(match, 'CI adapter supports only the configured GitHub HTTPS repository');
  const [, owner, repo] = match, endpoint = `https://api.github.com/repos/${owner}/${repo}`;
  const environment = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  if (process.argv.includes('--prepare')) { console.log(JSON.stringify(prepare(root, remote, environment))); return; }
  let credential: string;
  try { credential = execFileSync('git', ['credential', 'fill'], { cwd: root, env: environment, input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch { throw new Error('No noninteractive GitHub credential is available; actual CI execution remains unverified'); }
  const token = credential.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9); ensure(token, 'GitHub credential has no token');
  const request = async <T>(suffix: string, method = 'GET', body?: unknown): Promise<T> => {
    const response = await fetch(endpoint + suffix, { method, redirect: 'error', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    ensure(response.ok, `GitHub ${method} ${suffix} returned ${response.status}`); return response.json() as Promise<T>;
  };
  const metadata = await request<{ default_branch: string }>('');
  const inspectIndex = process.argv.indexOf('--inspect');
  if (inspectIndex >= 0) {
    const id = process.argv[inspectIndex + 1]; ensure(/^\d+$/.test(id), 'Invalid workflow run ID');
    const [run, jobs, artifacts] = await Promise.all([
      request<WorkflowRun>(`/actions/runs/${id}`),
      request<{ jobs: { id: number; name: string; conclusion: string | null; steps: { name: string; conclusion: string | null }[] }[] }>(`/actions/runs/${id}/jobs`),
      request<{ artifacts: { id: number; name: string; size_in_bytes: number; expired: boolean }[] }>(`/actions/runs/${id}/artifacts`),
    ]);
    const record = { run: { id: run.id, status: run.status, conclusion: run.conclusion, url: run.html_url }, jobs: jobs.jobs, artifacts: artifacts.artifacts };
    const dir = safePath(root, `.orchestra/runs/ci-inspections/${id}`); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'inspection.json'), JSON.stringify(record, null, 2));
    if (process.argv.includes('--download-logs')) {
      const artifact = artifacts.artifacts.find(item => item.name === 'harness-verification-logs' && !item.expired);
      ensure(artifact, 'Verification logs artifact missing');
      const response = await fetch(`${endpoint}/actions/artifacts/${artifact.id}/zip`, { redirect: 'manual', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' } });
      ensure(response.status === 302, 'Artifact download redirect missing');
      const location = response.headers.get('location'); ensure(location, 'Artifact download location missing');
      const url = new URL(location);
      ensure(url.protocol === 'https:' && (url.hostname.endsWith('.blob.core.windows.net') || url.hostname.endsWith('.actions.githubusercontent.com')), 'Unexpected artifact storage host');
      const download = await fetch(url, { redirect: 'error' }); ensure(download.ok, 'Artifact storage download failed');
      fs.writeFileSync(path.join(dir, 'verification-logs.zip'), Buffer.from(await download.arrayBuffer()));
    }
    console.log(JSON.stringify(record)); return;
  }
  const watchIndex = process.argv.indexOf('--watch');
  if (watchIndex >= 0) { const head = process.argv[watchIndex + 1]; ensure(/^[a-f0-9]{40}$/.test(head), 'Invalid CI head'); console.log(JSON.stringify((await request<{ workflow_runs: WorkflowRun[] }>(`/actions/runs?head_sha=${head}`)).workflow_runs.map(run => ({ id: run.id, workflow: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url })))); return; }
  if (!process.argv.includes('--publish')) { console.log(JSON.stringify({ repository: `${owner}/${repo}`, defaultBranch: metadata.default_branch, authenticated: true, actionsEnabled: 'not yet verified', published: false })); return; }
  const preparedIndex = process.argv.indexOf('--prepared'); ensure(preparedIndex >= 0, 'Review and supply the local --prepared ci-publication.json before remote publication');
  const record = JSON.parse(fs.readFileSync(process.argv[preparedIndex + 1], 'utf8')) as Publication;
  const { branch, head, dir, reportFile } = record;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env: environment, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  ensure(git('rev-parse', 'HEAD') === head && !git('status', '--porcelain') && git('remote', 'get-url', 'origin') === remote && git('branch', '--show-current') === branch && branch.startsWith('codex/harness-operational-'), 'Prepared CI branch changed after review');
  git('push', '--set-upstream', 'origin', branch);
  const pr = await request<{ html_url: string; number: number }>('/pulls', 'POST', { title: 'Operationalize engineering harness v2', head: branch, base: metadata.default_branch, draft: true,
    body: 'Wires independent read-only Codex provider sessions, host-scoped proposed edits, pinned approval keys, isolated browser fixtures and disposable PostgreSQL rehearsal. Adds actual process crash/repair tests and CI logs/static sensors. Harness-only changes; no LMS functionality or production deployment. CI must verify the pinned dependency installation and Linux controller checks. Host isolation, real database rehearsal, production signing and deployment remain separate readiness requirements.' });
  Object.assign(record, { pr: pr.html_url, number: pr.number, published: true });
  fs.writeFileSync(reportFile, JSON.stringify(record, null, 2)); console.log(JSON.stringify(record));
  // One bounded snapshot; subsequent monitoring is an explicit read-only --watch invocation.
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(JSON.stringify((await request<{ workflow_runs: WorkflowRun[] }>(`/actions/runs?head_sha=${head}`)).workflow_runs.map(run => ({ id: run.id, workflow: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url }))));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
