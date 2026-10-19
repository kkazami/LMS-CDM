import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensure } from './contracts';
import { buildOutputs, digest, hash, safePath } from './repository';
import { reduce } from './state';
import { planCommands } from './gates';
import { checkResults } from './results';
import { Event, Run } from './types';

interface Entry { sequence: number; previous: string; at: string; event: Event; hash: string }
export class Store {
  readonly dir: string;
  constructor(readonly root: string, readonly runId: string, readonly publicKey?: string) {
    ensure(/^run_[a-zA-Z0-9_-]+$/.test(runId), 'Unsafe run ID');
    this.dir = safePath(root, `.orchestra/runs/${runId}`);
  }
  read(): { run: Run | null; entries: Entry[] } {
    const journal = path.join(this.dir, 'journal.jsonl');
    if (!fs.existsSync(journal)) return { run: null, entries: [] };
    const raw = fs.readFileSync(journal, 'utf8'); if (!raw) return { run: null, entries: [] }; ensure(raw.endsWith('\n'), 'Interrupted journal tail; run recover before resume');
    const entries: Entry[] = []; let run: Run | null = null;
    for (const line of raw.trimEnd().split('\n')) {
      const e = JSON.parse(line) as Entry;
      ensure(e.sequence === entries.length && e.previous === (entries.at(-1)?.hash ?? 'GENESIS'), 'Broken journal sequence');
      const { hash: expected, ...payload } = e; ensure(digest(payload) === expected, 'Journal hash mismatch');
      ensure(Number.isFinite(Date.parse(e.at)) && (!entries.length || e.at >= entries.at(-1)!.at), 'Invalid journal time ordering');
      run = reduce(run, e.event, e.at, this.publicKey); entries.push(e);
      if (run.approvalKeyHash !== undefined) ensure(run.approvalKeyHash === (this.publicKey ? hash(this.publicKey) : null), 'Pinned approval public key changed; refuse run replay');
    }
    return { run, entries };
  }
  locked<T>(fn: () => T, initialize = false): T {
    if (initialize) fs.mkdirSync(this.dir, { recursive: true });
    else ensure(fs.existsSync(path.join(this.dir, 'journal.jsonl')), 'Run not initialized');
    const lock = path.join(this.dir, 'controller.lock');
    let fd: number;
    try { fd = fs.openSync(lock, 'wx'); } catch { throw new Error('Run is locked; inspect owner and use recover if its process has stopped'); }
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() })); fs.fsyncSync(fd);
    try { return fn(); } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  append(event: Event, at = new Date().toISOString()): Run {
    const { run, entries } = this.read(); const next = reduce(run, event, at, this.publicKey);
    ensure(!entries.length || at >= entries.at(-1)!.at, 'Clock moved backwards; journal append refused');
    const payload = { sequence: entries.length, previous: entries.at(-1)?.hash ?? 'GENESIS', at, event };
    const entry = { ...payload, hash: digest(payload) };
    const fd = fs.openSync(path.join(this.dir, 'journal.jsonl'), 'a');
    try { fs.writeSync(fd, JSON.stringify(entry) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    this.project(next); return next;
  }
  project(run: Run): void {
    const temp = path.join(this.dir, `state.${process.pid}.tmp`); fs.writeFileSync(temp, JSON.stringify(run, null, 2));
    fs.renameSync(temp, path.join(this.dir, 'state.json'));
  }
  put(file: string, content: string): { path: string; hash: string } {
    const target = safePath(this.dir, file); fs.mkdirSync(path.dirname(target), { recursive: true });
    const fd = fs.openSync(target, 'wx'); try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return { path: file, hash: hash(content) };
  }
  verifyFiles(run: Run): void {
    for (const a of [...Object.values(run.artifacts), ...run.history]) {
      ensure(a, 'Missing artifact reference');
      const envelope = JSON.parse(fs.readFileSync(safePath(this.dir, a.path), 'utf8'));
      ensure(digest(envelope) === a.hash && digest(envelope) === digest(a.envelope), `Artifact tampered: ${a.path}`);
      if (a.envelope.diff) ensure(hash(fs.readFileSync(safePath(this.dir, a.envelope.diff.path))) === a.envelope.diff.hash, 'Captured review diff was tampered');
      if (a.envelope.session) {
        const reference = a.envelope.session, raw = fs.readFileSync(safePath(this.dir, reference.path), 'utf8');
        ensure(hash(raw) === reference.hash, 'Provider receipt was tampered');
        const receipt = JSON.parse(raw);
        ensure(receipt.session === reference.id && receipt.source === reference.source && receipt.runId === a.envelope.runId && receipt.attempt === a.envelope.attempt && receipt.stage === a.envelope.stage && receipt.actor === a.envelope.actor && digest(receipt.dependencies) === digest(a.envelope.dependencies), 'Provider receipt belongs to a different stage');
      }
    }
    for (const e of run.commands) {
      if (e.outputs && e.attempt === run.attempt && e.status === 'PASS') {
        const directory = Object.keys(e.outputs).some(f => f.startsWith('apps/web/.next/')) ? 'apps/web/.next' : 'apps/desktop/dist';
        ensure(digest(buildOutputs(this.root, directory)) === digest(e.outputs), `Build outputs changed after verification: ${e.id}`);
      }
      if (e.output) ensure(hash(fs.readFileSync(safePath(this.dir, e.output))) === e.outputHash, `Command output tampered: ${e.id}`);
      if (e.result) {
        const raw = fs.readFileSync(safePath(this.dir, e.result), 'utf8');
        ensure(hash(raw) === e.resultHash, `Command report tampered: ${e.id}`);
        if (e.status === 'PASS' && run.artifacts.plan && e.planHash === run.artifacts.plan.hash) {
          const spec = planCommands(run).find(s => s.id === e.commandId); ensure(spec, 'Result belongs to an unknown command');
          checkResults(JSON.parse(raw), spec, e.environment, e.deployment?.target);
        }
      }
    }
  }
  recover(reason: string): void {
    ensure(reason.trim(), 'Recovery reason required'); fs.mkdirSync(this.dir, { recursive: true });
    const lock = path.join(this.dir, 'controller.lock');
    if (fs.existsSync(lock)) {
      const owner = JSON.parse(fs.readFileSync(lock, 'utf8')) as { pid: number };
      let alive = true;
      try { process.kill(owner.pid, 0); } catch (e) { alive = (e as NodeJS.ErrnoException).code !== 'ESRCH'; }
      ensure(!alive, 'Lock owner is still alive or inaccessible; do not steal its lock'); fs.unlinkSync(lock);
    }
    this.locked(() => {
      const journal = path.join(this.dir, 'journal.jsonl');
      if (fs.existsSync(journal)) {
        const raw = fs.readFileSync(journal, 'utf8');
        if (!raw.endsWith('\n')) {
          this.put(`recovery/${Date.now()}.json`, JSON.stringify({ reason, discardedTail: raw.slice(raw.lastIndexOf('\n') + 1) }));
          fs.truncateSync(journal, Buffer.byteLength(raw.slice(0, raw.lastIndexOf('\n') + 1)));
        }
      }
      const { run } = this.read();
      if (run) {
        if (run.claim && run.next && !['FAILED', 'INTERRUPTED', 'HUMAN_REVIEW_REQUIRED'].includes(run.state)) this.append({ type: 'INTERRUPT', reason });
        else this.project(run);
      }
    }, true);
  }
}
