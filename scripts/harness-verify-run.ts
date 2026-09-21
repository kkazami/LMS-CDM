#!/usr/bin/env tsx
/**
 * scripts/harness-verify-run.ts
 *
 * Deterministic validation script for AI Software Engineering Harness runs.
 * Validates that a run's state.json and evidence artifacts are consistent.
 *
 * Usage:
 *   pnpm harness:verify                    # validates the latest run
 *   pnpm harness:verify -- --run run_id    # validates a specific run
 *
 * Exit codes:
 *   0 = valid run state
 *   1 = inconsistent or incomplete run state
 */

import * as fs from 'fs';
import * as path from 'path';

const RUNS_DIR = path.resolve(process.cwd(), '.orchestra/runs');

interface AcceptanceCriterion {
  id: string;
  status: string;
  verification?: {
    type: string;
    tests?: string[];
  };
  evidence?: unknown;
}

interface RunState {
  runId: string;
  currentState: string;
  iteration: number;
  maxIterations: number;
  harnessProfile: string;
  qualityLevel: string;
  taskClassification: {
    intent: string;
    domain: string;
    requiresBrowserVerification: boolean;
    risk: string;
  };
  requiredChecks: string[];
  completedChecks: string[];
  failedChecks: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  evidencePaths: Record<string, string>;
  repairCount: number;
}

function findLatestRun(): string | null {
  if (!fs.existsSync(RUNS_DIR)) return null;
  const entries = fs.readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('run_'))
    .sort((a, b) => b.name.localeCompare(a.name));
  return entries[0]?.name || null;
}

function validate(runId: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const runDir = path.join(RUNS_DIR, runId);

  // 1. Check run directory exists
  if (!fs.existsSync(runDir)) {
    return { valid: false, errors: [`Run directory not found: ${runDir}`], warnings };
  }

  // 2. Check state.json exists and is valid JSON
  const statePath = path.join(runDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    return { valid: false, errors: ['state.json not found'], warnings };
  }

  let state: RunState;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (e) {
    return { valid: false, errors: [`state.json is invalid JSON: ${e}`], warnings };
  }

  // 3. Validate required fields
  const requiredFields = ['runId', 'currentState', 'harnessProfile', 'qualityLevel', 'taskClassification'];
  for (const field of requiredFields) {
    if (!(field in state)) {
      errors.push(`Missing required field in state.json: ${field}`);
    }
  }

  // 4. Validate state transitions
  const validStates = [
    'CREATED', 'CONTEXT_BUILDING', 'REQUIREMENTS_GENERATED', 'PLANNED',
    'EXECUTING', 'TESTING', 'QA_REVIEW', 'SECURITY_REVIEW', 'CODE_REVIEW',
    'PASSED', 'VERIFICATION_FAILED', 'REPAIR_PLANNING', 'REPAIR_EXECUTING',
    'REVERIFICATION', 'MAX_ITERATIONS_REACHED', 'HUMAN_REVIEW_REQUIRED',
  ];
  if (!validStates.includes(state.currentState)) {
    errors.push(`Invalid state: ${state.currentState}. Valid states: ${validStates.join(', ')}`);
  }

  // 5. If PASSED, verify all required checks completed
  if (state.currentState === 'PASSED') {
    const missingChecks = (state.requiredChecks || []).filter(
      (check) => !(state.completedChecks || []).includes(check)
    );
    if (missingChecks.length > 0) {
      errors.push(`PASSED state but missing required checks: ${missingChecks.join(', ')}`);
    }

    if ((state.failedChecks || []).length > 0) {
      errors.push(`PASSED state but has failed checks: ${state.failedChecks.join(', ')}`);
    }

    // All acceptance criteria must be PASS
    for (const ac of state.acceptanceCriteria || []) {
      if (ac.status !== 'PASS') {
        errors.push(`PASSED state but AC ${ac.id} has status: ${ac.status}`);
      }
      if (!ac.verification) {
        errors.push(`AC ${ac.id} has no verification mapping`);
      }
      if (!ac.evidence) {
        errors.push(`AC ${ac.id} has no evidence (NO FRESH EVIDENCE = NO PASS)`);
      }
    }

    // If requiresBrowserVerification, playwright-results must exist
    if (state.taskClassification?.requiresBrowserVerification) {
      const pwResults = path.join(runDir, 'playwright-results.json');
      if (!fs.existsSync(pwResults)) {
        errors.push('Browser verification required but playwright-results.json not found');
      }
    }
  }

  // 6. Verify expected evidence artifacts exist
  const expectedArtifacts = ['input.json', 'state.json'];
  if (state.currentState === 'PASSED' || state.currentState === 'VERIFICATION_FAILED') {
    expectedArtifacts.push('requirements.json', 'test-results.json', 'qa.json', 'final-report.json');
  }

  for (const artifact of expectedArtifacts) {
    const artifactPath = path.join(runDir, artifact);
    if (!fs.existsSync(artifactPath)) {
      if (state.currentState === 'PASSED') {
        errors.push(`Missing required artifact: ${artifact}`);
      } else {
        warnings.push(`Missing artifact: ${artifact} (acceptable in state: ${state.currentState})`);
      }
    }
  }

  // 7. Validate repair count
  if (state.repairCount > state.maxIterations) {
    errors.push(`Repair count (${state.repairCount}) exceeds max iterations (${state.maxIterations})`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// --- Main ---
const args = process.argv.slice(2);
let runId: string | null = null;

const runArgIdx = args.indexOf('--run');
if (runArgIdx !== -1 && args[runArgIdx + 1]) {
  runId = args[runArgIdx + 1];
} else {
  runId = findLatestRun();
}

if (!runId) {
  console.log('⚠ No runs found in .orchestra/runs/');
  console.log('  Run the harness first to create a run.');
  process.exit(0);
}

console.log(`\n🔍 Validating run: ${runId}\n`);

const result = validate(runId);

if (result.warnings.length > 0) {
  console.log('⚠ Warnings:');
  for (const w of result.warnings) {
    console.log(`  - ${w}`);
  }
  console.log('');
}

if (result.errors.length > 0) {
  console.log('❌ Validation FAILED:');
  for (const e of result.errors) {
    console.log(`  - ${e}`);
  }
  process.exit(1);
} else {
  console.log('✅ Run state is consistent and valid.');
  process.exit(0);
}
