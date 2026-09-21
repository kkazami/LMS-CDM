---
trigger: model_decision  
description: Defines the agent dispatch sequence and state machine for the AI Software Engineering Harness
---
The full dispatch protocol:

**Task Classification:**
- intent: feature | bug_fix | refactor | testing | documentation | security | deployment
- domain: frontend | backend | api | database | mobile | fullstack | devops
- requiresBrowserVerification: true for ANY task changing browser-visible behavior (UI, routes, forms, navigation, auth UI, responsive layout, accessibility, end-user web workflows)
- risk: low | medium | high

**Agent Dispatch Sequence:**
1. Requirement Agent → structured requirements + acceptance criteria with verification metadata
2. Planner Agent → implementation plan + verification plan + harness profile + skill selection
3. Executor Agent → implements changes, produces artifact manifest (does NOT judge own work)
4. Test Agent → designs/writes tests mapped to acceptance criteria (does NOT run tests)
5. Test Runner (deterministic, not LLM) → executes: pnpm harness:check, pnpm build:web, pnpm test:e2e. Captures exit codes, stdout, stderr, Playwright JSON/HTML results, screenshots, traces. Exit code 0 = pass, non-zero = fail.
6. QA Agent → evidence-based verification: maps test results to acceptance criteria. NO FRESH EVIDENCE = NO PASS.
7. Security Agent (Strict+ only) → independent security review
8. Code Review Agent (Strict+ only) → independent code quality gate

**State Machine:**
States: CREATED → CONTEXT_BUILDING → REQUIREMENTS_GENERATED → PLANNED → EXECUTING → TESTING → QA_REVIEW → [SECURITY_REVIEW] → [CODE_REVIEW] → PASSED | VERIFICATION_FAILED → REPAIR_PLANNING → REPAIR_EXECUTING → REVERIFICATION → [loop max 5] → MAX_ITERATIONS_REACHED → HUMAN_REVIEW_REQUIRED

**Bounded Repair Loop (max 5 iterations):**
When VERIFICATION_FAILED:
1. Repair Agent receives failure evidence
2. Creates targeted repair plan
3. Executor applies fixes
4. ALL mandatory verification re-runs (not just the failed test)
5. QA re-evaluates all criteria

**Run Artifacts:**
Every run creates `.orchestra/runs/<run-id>/` with: input.json, context.json, requirements.json, plan.json, execution.json, changed-files.json, test-results.json, playwright-results.json, qa.json, security.json, code-review.json, state.json, final-report.json, screenshots/, traces/, repairs/
