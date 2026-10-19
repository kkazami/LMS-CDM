#!/usr/bin/env tsx
import * as path from 'node:path';
import { Controller } from './harness/controller';
import { ensure } from './harness/contracts';

try {
  const args = process.argv.slice(2), rootIndex = args.indexOf('--root');
  const root = rootIndex >= 0 ? path.resolve(args[rootIndex + 1]) : path.resolve(__dirname, '..'), index = args.indexOf('--run');
  const runId = index >= 0 ? args[index + 1] : undefined;
  ensure(runId, 'An explicit --run is required; no run has been verified.');
  const result = new Controller(root, runId).verify();
  ensure(result.ready || args.includes('--allow-partial'), `Run ${runId} is consistent but incomplete (${result.run.state}). Use --allow-partial only for diagnostics.`);
  console.log(`Verified journal, artifacts and freshness: ${runId} (${result.run.state}). ${result.ready ? 'Code release gate is satisfied.' : 'Diagnostic only: this run is incomplete.'}`);
  console.log('This checks recorded evidence integrity. It does not independently prove test adequacy, identity isolation, production safety or deployment success.');
} catch (error) { console.error(`HARNESS VERIFICATION FAILED: ${(error as Error).message}`); process.exitCode = 1; }
