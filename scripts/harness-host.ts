import * as fs from 'node:fs';
import * as path from 'node:path';
import { AgentHost, CodexProvider, identities } from './harness/agent-host';
import { Controller } from './harness/controller';
import { ensure } from './harness/contracts';
import { digest } from './harness/repository';

async function main() {
  const args = process.argv.slice(2), arg = (name: string) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args[i + 1]; };
  const controlRoot = path.resolve(__dirname, '..'), root = path.resolve(arg('root') || controlRoot), runId = arg('run');
  ensure(runId, '--run is required');
  const seedPath = arg('seed-file'); ensure(seedPath, 'Provide an externally protected --seed-file containing at least 32 random bytes');
  const realSeed = fs.realpathSync(seedPath), realRoot = fs.realpathSync(root);
  ensure(realSeed !== realRoot && !realSeed.startsWith(realRoot + path.sep) && !realSeed.startsWith(fs.realpathSync(controlRoot) + path.sep), 'Host seed must be outside task and control repositories');
  const seed = fs.readFileSync(realSeed); ensure(seed.length >= 32, 'Host seed must contain at least 32 random bytes');
  const identity = identities(runId, seed), publicPath = arg('public-key-file');
  const c = new Controller(root, runId, publicPath ? fs.readFileSync(publicPath, 'utf8') : process.env.HARNESS_APPROVAL_PUBLIC_KEY);
  const inputPath = arg('input');
  if (inputPath) c.init({ ...JSON.parse(fs.readFileSync(inputPath, 'utf8')), agentProvider: 'codex', actors: identity.actors, actorCapabilities: identity.actorCapabilities });
  const run = c.read(); ensure(run.input.agentProvider === 'codex', 'Host only dispatches provider-managed runs');
  ensure(digest(run.input.actorCapabilities) === digest(identity.actorCapabilities), 'Wrong host seed for this run');
  const contextPath = arg('context'); ensure(contextPath, 'Provide the reviewed task-specific --context file');
  const host = new AgentHost(c, identity.capabilities, new CodexProvider(), controlRoot, fs.readFileSync(contextPath, 'utf8'));
  if (args.includes('--repair')) await host.adviseRepair();
  // Never automatically approve, resume a crash, clear a failure or create a new run after failure.
  while (c.read().next) { await host.step(); if (args.includes('--one-stage')) break; }
  console.log(JSON.stringify({ runId, state: c.read().state, ready: c.verify().ready }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
