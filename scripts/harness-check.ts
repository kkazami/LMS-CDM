/**
 * scripts/harness-check.ts
 *
 * Deterministic Sensor for the Lumina LMS Monorepo Developer Harness.
 * Automatically verifies:
 *  1. Prisma Schema validity & consistency
 *  2. TypeScript compile-time checks across apps/web
 *  3. Monorepo Architectural Invariants (routing, institute isolation, agent rules)
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { sanitize } from './harness/redaction';

interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const ROOT_DIR = path.resolve(__dirname, "..");
const results: CheckResult[] = [];

function runSensor(name: string, fn: () => void) {
  const start = Date.now();
  process.stdout.write(`🔍 Running [${name}]... `);
  try {
    fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs });
    console.log(`✅ PASSED (${durationMs}ms)`);
  } catch (caught: unknown) {
    const error = caught as Error & { stderr?: Buffer; stdout?: Buffer };
    const durationMs = Date.now() - start;
    results.push({
      name,
      passed: false,
      message: sanitize(error.stderr?.toString() || error.stdout?.toString() || error.message),
      durationMs,
    });
    console.log(`❌ FAILED (${durationMs}ms)`);
  }
}

console.log("\n=======================================================");
console.log("🛡️  LUMINA LMS — HARNESS ENGINEERING SENSOR SUITE");
console.log("=======================================================\n");

// 1. Prisma Schema Sensor
runSensor("Prisma Schema Sensor", () => {
  execSync("pnpm exec prisma validate", {
    cwd: ROOT_DIR,
    stdio: "pipe",
    timeout: 120000,
  });
});

// 2. TypeScript Compilation Sensor (apps/web)
runSensor("Web TypeScript Sensor", () => {
  execSync("pnpm --filter web exec tsc --noEmit", {
    cwd: ROOT_DIR,
    stdio: "pipe",
    timeout: 180000,
  });
});

// 3. Architectural Invariant Sensor: Route Scoping
runSensor("Architecture Sensor: Institute Route Scoping", () => {
  const dashboardDir = path.join(ROOT_DIR, "apps", "web", "src", "app", "(dashboard)");
  if (fs.existsSync(dashboardDir)) {
    const entries = fs.readdirSync(dashboardDir);
    // Any top-level directory in (dashboard) must either be [institute], layout.tsx, loading.tsx, page.tsx, etc.
    const forbidden = entries.filter((e) => fs.statSync(path.join(dashboardDir, e)).isDirectory() && e !== '[institute]' && !e.startsWith('_'));
    if (!entries.includes('[institute]')) throw new Error('Missing required institute dashboard directory');
    if (entries.some(e => /^(page|route)\.[cm]?[jt]sx?$/.test(e))) throw new Error('Unscoped dashboard page/route at dashboard root');
    if (forbidden.length > 0) {
      throw new Error(
        `Architectural Invariant Violation: All dashboard routes must be nested under [institute]/. Found unscoped folders: ${forbidden.join(", ")}`
      );
    }
  } else throw new Error('Dashboard directory is missing');
});

// 4. Invariant Sensor: Agentic Rules Integrity
runSensor("Architecture Sensor: Agent Rules & Invariants", () => {
  const agentsMd = path.join(ROOT_DIR, "AGENTS.md");
  if (!fs.existsSync(agentsMd)) {
    throw new Error("AGENTS.md is missing from repository root!");
  }

  const requiredRules = ['atomic-ui', 'database', 'routing', 'security', 'engineering-safety', 'orchestra-protocol', 'verification-gates'].map(name => path.join(ROOT_DIR, '.agents', 'rules', name + '.md'));

  for (const rulePath of requiredRules) {
    if (!fs.existsSync(rulePath)) {
      throw new Error(`Missing required agent rule: ${path.relative(ROOT_DIR, rulePath)}`);
    }
  }
});

// Report Summary
console.log("\n-------------------------------------------------------");
console.log("📊 SENSOR AUDIT SUMMARY");
console.log("-------------------------------------------------------");

let allPassed = true;
for (const res of results) {
  const badge = res.passed ? "✅ [PASS]" : "❌ [FAIL]";
  console.log(`${badge} ${res.name.padEnd(45)} ${res.durationMs}ms`);
  if (!res.passed) allPassed = false;
  if (!res.passed && res.message) {
    console.log(`\n   Error Details:\n   ${res.message.trim().split("\n").join("\n   ")}\n`);
    allPassed = false;
  }
}

console.log("-------------------------------------------------------");
if (allPassed) {
  console.log("Static sensors passed: schema syntax, web types, route-folder placement and rule presence. Runtime correctness, authorization, migration compatibility and deployment readiness remain unverified.\n");
  process.exit(0);
} else {
  console.error("🚨 SENSOR FAILURE DETECTED. Gate rejection triggered.\n");
  process.exit(1);
}
