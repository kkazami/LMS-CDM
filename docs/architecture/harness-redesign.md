# Harness architecture and safety redesign

Date: 4 October 2026 (Asia/Singapore). Scope: engineering orchestration only. No LMS feature from
an existing implementation plan was implemented. The working tree already contained application,
Prisma, dependency and feature-test changes; those were left outside this task.

## Current Harness Assessment

Inventory was read before editing. The repository had two competing models: a planner/generator/
evaluator rubric loop and a requirements/executor/test/QA flow. Both relied on agent-written
state and advisory rules. No executable orchestrator controlled state transitions.

| Inventory | Baseline finding |
|---|---|
| .orchestra/agents, prompts, contracts | Older rubric score/signoff model; generator permitted autonomous policy/directive edits and 10–15 iterations |
| .agents/agents | Eight roles; test author separated from runner in prose; no recon/red-team/adjudication roles |
| .agents/rules | Five-repair and high-risk approval rules conflicted with optional review profiles and old package/middleware assumptions |
| .orchestra/harness | Seven profiles, quality levels, advisory permissions and a non-executable state diagram |
| .orchestra/runs | No authoritative active v2 run; legacy validator accepted missing runs and mutable pass declarations |
| .orchestra/memory and logs | Historical COMPLETED/score metrics, shared evaluator log and lessons without source/run provenance |
| scripts/harness-check.ts | Prisma syntax, web types, top-level route-folder check and rule presence; overclaimed deployment safety |
| scripts/harness-verify-run.ts | Read JSON/check lists and artifact existence; no content/provenance/freshness/transition verification |
| scripts/test-harness-runner.ts, apps/web/src/lib/harness | Student-facing AI runtime tests/subsystem, separate from engineering orchestration; unchanged |
| scripts/run-security-tests.ts | Helper/schema/security primitives; does not establish server/API authorization across resources/tenants |
| playwright.config.ts, tests/e2e | Existing Playwright fixtures, auth setup and feature tests; shared outputs, retries/server reuse, some permissive authorization assertions |
| package.json and turbo.json | Existing static/build/E2E commands; no root product type/lint gate and no harness CI workflow |
| .agent | Junction to .agents, not a separate policy tree |
| Skills/manifests | Task capabilities existed but full-output was broadly selected; skills did not provide enforceable orchestration |

Baseline dependency map:

| Agent | Input | Output | Next gate | Evidence | Failure path |
|---|---|---|---|---|---|
| Requirement | User prompt/knowledge | Requirements/criteria | Planner | Agent JSON | No enforced ambiguity block |
| Planner | Requirements | Contract/plan | Executor | Narrative contract | No adjudication |
| Generator/executor | Contract/plan | Code/manifest | Test author/runner | Claimed paths | Competing retry rules |
| Test author | Criteria | Test source | Runner | Source files | Coverage advisory |
| Runner | Commands | Exit/report | QA | Shared command/Playwright output | Not bound to final revision |
| QA | Criteria/results | Verdict | Optional reviews | Agent mappings | Proposed repair |
| Security/code review | Changed source | Findings | Completion | Optional reports | No executable blocker |
| Evaluator | Contract/browser | Score | Pass/retry | Shared log | Unbounded/conflicting rubric loop |
| Repair | Failures | Repair plan | Executor | Narrative | Five-repair ceiling advisory |

## Critical Harness Problems

| Failure class | Severity | Concrete problem | Implemented response |
|---|---|---|---|
| A Planning | CRITICAL | No independent architecture attack/adjudication before execution; orphaned criteria possible | Ordered recon/proposal/red-team/adjudication gates; ac/task/test checks and immutable dependencies |
| B Independence | HIGH | Standard quality skipped security/code review; reviews could trust claims | Distinct actor capabilities, separate mandatory roles and captured named executions |
| C Gates | CRITICAL | Mutable required/completed checks and existence-only artifacts could create a pass | Reducer replay, structural/semantic contracts, output hashes and deterministic release aggregation |
| D Repair | HIGH | Conflicting limits, no hard counter, stale success reusable after repair | Controller-owned five-repair cap, normalized repeated failures, all checks/reviews rerun; invalidations consume budget |
| E Security | CRITICAL | UI/helper tests treated as server access proof; credentials/context overshared | Direct-boundary coverage, independent security role, sanitized evidence and restricted runner environment |
| F Database/deployment | CRITICAL | Generate/build conflated with migration readiness; no rehearsed upgrade/target binding | Dedicated database reports, disposable rehearsal domains, separate target-bound deployment approval/execution/health |
| G Evidence | CRITICAL | No attempt/source/command integrity or provenance | Run/attempt/stage identities, HEAD/index/content and build fingerprints, timestamps, environment digest and immutable reports |
| H State | HIGH | No legal-transition/ownership/recovery controller | Authenticated leases, locked journal, derived state, deterministic replay and explicit interruption |
| I Human approval | CRITICAL | Policies allowed risky auth/migration work without real human authorization | External signed exact-subject approvals; monotonic risk; all deployment intent CRITICAL; expiry rechecked |

## Target Architecture

A local TypeScript controller governs validated artifacts and actual command results. State is
replayed from a fsynced, hash-chained journal. The host is responsible for isolated agent sessions,
capability distribution, filesystem/tool sandboxing, the pinned public key and provider adapters.
The controller cannot protect itself from a principal allowed to rewrite it and its journal.

The implementation uses only existing Node/TypeScript/pnpm tooling. It does not add an agent SDK,
network orchestrator service or product backend. Profiles remain routing guidance; compiled gates
own the non-removable safety floor. The root Prisma/PostgreSQL and apps/web backend remain intact.

## State Machine

DRAFT → REQUIREMENTS_READY → RECON_COMPLETE → RED_TEAM_COMPLETE → ARCHITECTURE_ADJUDICATED
→ PLAN_READY → APPROVED → IMPLEMENTED → TESTS_READY → VALIDATED → QA_VERIFIED
→ SECURITY_VERIFIED → CODE_REVIEWED → RELEASE_READY → DEPLOYED → COMPLETE.

The last two transitions occur only for deployment-intended runs. Code-only work ends RELEASE_READY.
FAILED, REPAIRING, INTERRUPTED and HUMAN_REVIEW_REQUIRED are explicit. Each stage needs a claimed
lease. Illegal jumps, wrong actors, missing predecessors and incomplete command executions fail.

## Agent Responsibilities

Requirements contracts user intent and measurable criteria. Recon verifies real source and creates
the original proposal. Red-team attacks all fourteen architecture domains without implementing.
Adjudication resolves every finding with reason/evidence and obtains human decisions where required.
Planner consumes adjudication and creates the authoritative ac/task/test graph. Executor implements
approved files; test author writes test-only source. Infrastructure runs commands. Independent QA,
security and code review consume current evidence. Release aggregates; deployer and post-deploy
runner own separate target-bound operations. Repair is a read-only proposal capability, not a pass authority.

## Gate Contracts

Every stage specifies required predecessor hashes, owner, validated JSON, source/attempt identity,
pass/fail criteria and downstream dependencies in contracts.ts/gates.ts. The complete contract table
and command examples are in .orchestra/harness/README.md. Planning failures require a new clarified
run. Unresolved human architecture decisions, rejected blocking findings without signed adjudication,
deferred blocking findings, missing task coverage, and missing database/security domains cannot pass.

Criterion trace: requirement → immutable AC → task → named behavioral test → actual captured
result → independent QA evidence. Static compilation cannot satisfy a behavioral criterion. Code
review must cite the captured current diff and inspect every planned path, then resolve accepted
architecture findings. Every level retains security/code review; optional skill guidance cannot waive gates.

## Evidence Model

Envelopes bind version, run, attempt, stage, actor, UTC timestamp, source snapshot and exact dependency
hashes. Snapshots include tracked and untracked non-generated/non-secret files plus HEAD/index identity.
Commands capture exact argv, environment digest, start/finish, exit/signal/error, sanitized logs,
individual named results, and build-output fingerprints. Browser reports are run-local and retries,
focused tests and existing-server reuse are disabled. Lease bearer tokens and raw capabilities are
absent from durable state. Stage data containing recognized secret patterns is rejected.

Current source changes make prior evidence stale. In-scope changes restart implementation and all
validation/reviews; material scope/HEAD/risk changes restart recon and revoke plan approval. Historical
artifacts/results remain retained but cannot satisfy the current attempt. Build output drift is checked
separately from source. Deployment/post-deploy evidence must match the exact target in the signed plan.

## Repair Loop

Failure → preserve history → controller repair → approved-scope implementation/test work → ALL
mandatory validation → QA → security → code review → release, or escalation. Five repairs is a
hard maximum; three identical normalized failures escalate earlier. Invalidation after accepted
implementation consumes repair budget, so source edits cannot evade the ceiling. Interrupted
mutation/command work also consumes budget. Higher-risk unexpected edits escalate rather than
entering routine repair. Planning/material/release/deployment failures need human attention and a
new reviewed run as documented; no previous gate is silently overwritten.

## Risk Classification

LOW/MEDIUM/HIGH/CRITICAL is a monotonic floor. Paths, operations and observed changes contribute.
API/auth/api-auth/RBAC/session/middleware/dashboard layout/server actions, schema/migrations,
integrations/privacy and harness controls are HIGH. Secrets/destructive/bulk/production operations
and every deployment-intended run are CRITICAL. Common destructive migration SQL is detected;
this heuristic is not a full semantic migration analyzer. Actual mobile/desktop/web targets drive
validation even under generic profiles. Harness-profile plans cannot modify product or Prisma files.

## Human Approval Model

External Ed25519 signatures bind a named human, expiry, risk, run and exact subject. Implementation
approval binds immutable input and reviewed planning gates; architecture approval binds findings and
full adjudication; deployment approval binds the fresh release whose dependencies include the exact
reviewed target/recovery plan. Public keys are pinned outside agent-controlled files. Agents do not
receive signing keys. A signature is evidence of trusted-key possession, not proof of comprehension.

## Failure / Resume Model

Exclusive locks prevent controller mutations racing. Journal replay owns state; state.json is a
replaceable projection. Fsync and content hashes preserve completed records. Recovery refuses a live
lock, quarantines only an incomplete final record, and interrupts unfinished ownership. Clock rollback
refuses journal append. Restart preserves attempts/failures and accepted stages. Crashed commands
cannot become passes or be silently retried in the same attempt. Unknown deployment outcomes require
external reconciliation; automatic replay is forbidden. Provider idempotency is reviewed but remains external.

## Skill Review

| Skill | Decision | Reason |
|---|---|---|
| impeccable | KEEP | UI/UX-specific capability; not an orchestration stage |
| vercel-composition-patterns | KEEP | Relevant to React component API/architecture work |
| vercel-react-best-practices | KEEP | Relevant to React/Next.js performance and server rendering |
| full-output-enforcement | MODIFY harness selection | Optional for exhaustive deliverables; no mandatory full-file rewriting or gate authority |
| brandkit | OPTIONAL | Brand identity/image generation, unrelated to backend/harness safety |
| high-end-visual-design | OPTIONAL | Task-specific art direction; incumbent product requirements prevail |

Skill source files were audited but not rewritten. No new mandatory skill stages were introduced.

## Implementation Changes / Files Changed

The table lists all 80 changed harness source/configuration/documentation files. `.agent` is a
filesystem junction to `.agents`; Git also displays those aliases, but they refer to the same files
documented under the canonical `.agents` paths. Existing application/schema/lockfile changes belong
to prior work and were not modified by this task. Run-local evidence is generated output.

Each row records purpose, important change and necessity. Product changes already present in the
working tree are excluded from this list. No dependency version or product build command was changed.

| File | Purpose | Important change | Why necessary |
|---|---|---|---|
| `.agents/agents/architecture-adjudicator/agent.md` | architecture-adjudicator role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/architecture-red-team/agent.md` | architecture-red-team role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/code-review/agent.md` | code-review role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/deployer/agent.md` | deployer role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/executor/agent.md` | executor role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/planner/agent.md` | planner role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/qa/agent.md` | qa role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/recon/agent.md` | recon role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/release/agent.md` | release role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/repair/agent.md` | repair role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/requirement/agent.md` | requirement role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/runner/agent.md` | runner role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/security/agent.md` | security role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/agents/test/agent.md` | test role contract | Defines owned input/output, current evidence requirements and scoped tool metadata | Separates creators and reviewers and removes self-approval authority |
| `.agents/rules/atomic-ui.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/database.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/engineering-safety.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/orchestra-activation.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/orchestra-protocol.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/orchestra-workflow.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/security.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/strict-typing.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.agents/rules/verification-gates.md` | Engineering rule alignment | Corrects repository facts and binds workflow/safety/verification to the executable controller | Removes conflicting advisory rules and misleading middleware/package assumptions |
| `.github/workflows/harness.yml` | CI integration | Adds controller type and safety/runner test checks with pinned pnpm and no deployment | Makes harness regressions reviewable in CI without claiming product release verification |
| `.gitignore` | Private/generated files | Keeps run artifacts private and ignores local pnpm cache metadata | Prevents cache output from becoming source/evidence or accidental commits |
| `.orchestra/agents/evaluator.md` | Legacy role compatibility | Redirects the old role to independent v2 responsibilities; retires rubric authority | Prevents an alternate score-based pass/retry path |
| `.orchestra/agents/generator.md` | Legacy role compatibility | Redirects the old role to independent v2 responsibilities; retires rubric authority | Prevents an alternate score-based pass/retry path |
| `.orchestra/agents/planner.md` | Legacy role compatibility | Redirects the old role to independent v2 responsibilities; retires rubric authority | Prevents an alternate score-based pass/retry path |
| `.orchestra/contracts/TEMPLATE.md` | Contract format | Uses v2 risk/traceability or retires the legacy sprint score template | Stops old approvals/fields from being treated as current verified contracts |
| `.orchestra/contracts/classified-task.schema.json` | Contract format | Uses v2 risk/traceability or retires the legacy sprint score template | Stops old approvals/fields from being treated as current verified contracts |
| `.orchestra/contracts/sprint-contract-template.md` | Contract format | Uses v2 risk/traceability or retires the legacy sprint score template | Stops old approvals/fields from being treated as current verified contracts |
| `.orchestra/harness/README.md` | Operating guide | Documents contracts, capability/key provisioning, commands, adapters, failure handling and trust limits | Makes the implemented control system usable and honest about host responsibilities |
| `.orchestra/harness/examples/input.example.json` | Concrete contract example | Provides task-specific input, requirements or command/criterion structure; sample capabilities are unusable | Makes initialization/planning understandable without fabricating evidence |
| `.orchestra/harness/examples/plan.example.json` | Concrete contract example | Provides task-specific input, requirements or command/criterion structure; sample capabilities are unusable | Makes initialization/planning understandable without fabricating evidence |
| `.orchestra/harness/examples/requirements.example.json` | Concrete contract example | Provides task-specific input, requirements or command/criterion structure; sample capabilities are unusable | Makes initialization/planning understandable without fabricating evidence |
| `.orchestra/harness/playwright.config.ts` | Private browser adapter | Starts a fresh built server, disables retry/focused tests and isolates JSON/attachments | Avoids stale shared browser reports or an unrelated existing dev server |
| `.orchestra/harness/policies/approval-gates.json` | Host policy contract | Defines signed approvals, exact file scope or restricted tool/environment duties | Clarifies enforced controller checks and the external sandbox boundary |
| `.orchestra/harness/policies/file-policies.json` | Host policy contract | Defines signed approvals, exact file scope or restricted tool/environment duties | Clarifies enforced controller checks and the external sandbox boundary |
| `.orchestra/harness/policies/tool-permissions.json` | Host policy contract | Defines signed approvals, exact file scope or restricted tool/environment duties | Clarifies enforced controller checks and the external sandbox boundary |
| `.orchestra/harness/profiles/api.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/bugfix.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/database.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/desktop.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/frontend.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/fullstack.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/harness.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/mobile.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/profiles/refactor.json` | Task routing profile | Preserves specialist routing with mandatory architecture/security/review roles and target-specific suggestions | Quality/profile preference cannot waive compiled gates |
| `.orchestra/harness/quality-levels.json` | Additive quality levels | Requires security/code review at every level; maximum adds measured browser domains | Eliminates standard-level review bypass |
| `.orchestra/harness/state-machine.md` | State diagram | Matches executable stage order and explicit failure/resume paths | Eliminates diagram-authorized shortcuts to completion |
| `.orchestra/knowledge/ARCHITECTURE.md` | Verified repository knowledge | Corrects web component ownership and middleware facts | Keeps recon grounded in actual architecture rather than stale extraction assumptions |
| `.orchestra/knowledge/CONVENTIONS.md` | Verified repository knowledge | Corrects web component ownership and middleware facts | Keeps recon grounded in actual architecture rather than stale extraction assumptions |
| `.orchestra/manifests/full-output-enforcement.json` | Skill routing correction | Makes exhaustive-output guidance optional and subordinate to safe edits/controller gates | Prevents a writing skill from driving every task or changing orchestration authority |
| `.orchestra/memory/MEMORY.md` | Historical memory boundary | Marks legacy metrics/context as non-authoritative and corrects UI ownership | Old scores and lessons cannot satisfy fresh gates |
| `.orchestra/memory/orchestra-state.json` | Historical memory boundary | Marks legacy metrics/context as non-authoritative and corrects UI ownership | Old scores and lessons cannot satisfy fresh gates |
| `.orchestra/prompts/context-template.md` | Stage/repair context contract | Uses immutable run/attempt dependencies and minimal role-specific context | Prevents shared-log repair loops, secret exposure and policy self-modification |
| `.orchestra/prompts/generator-directive.md` | Stage/repair context contract | Uses immutable run/attempt dependencies and minimal role-specific context | Prevents shared-log repair loops, secret exposure and policy self-modification |
| `AGENTS.md` | Repository instructions | Corrects test infrastructure/backend protection facts and links the controller | Prevents future agents from assuming tests are absent or middleware grants API authorization |
| `docs/architecture/agentic-skills-and-ai-orchestra.md` | Legacy guide alignment | Replaces superseded score-loop guidance with v2 workflow and task-specific skill decisions | Avoids contradictory dispatch/completion advice |
| `docs/architecture/harness-redesign.md` | Assessment and delivery report | Records inventory, red-team findings, target design, every changed-file rationale and verification limits | Provides the requested reviewable engineering record |
| `package.json` | Workspace commands | Adds harness CLI, native test runner and dedicated typecheck scripts; dependency declarations unchanged | Exposes reliable repository-compatible validation commands without lockfile churn |
| `scripts/harness-check.ts` | Static sensor correction | Uses installed Prisma, timeouts, strict folder checks, canonical rules and accurately scoped output | Stops static success from being presented as authorization or deployment safety |
| `scripts/harness-cli.ts` | Host/agent interface | Adds explicit-run lifecycle, approval, execution and recovery operations | Provides a usable controller rather than manually edited state files |
| `scripts/harness-verify-run.ts` | Fail-closed verifier | Requires explicit run, replays/validates evidence and freshness, rejects partial releases and verifies current approvals | Removes artifact-existence/self-declared-pass and implicit-old-run loopholes |
| `scripts/harness/contracts.ts` | Runtime contract validation | Validates role capabilities, artifacts, DAG/test structures, paths and command adapters | Rejects malformed/missing gate data before it can advance state |
| `scripts/harness/controller.ts` | Governed stage API | Authenticates capability possession, hashes leases, captures review diffs, owns artifacts, approvals and freshness restarts | Prevents actors from advancing by self-report or impersonating a stage owner |
| `scripts/harness/gates.ts` | Semantic gates | Enforces adjudication, complete traceability, measured domains, independent reports, signed approvals and release/target binding | Turns narrative workflow rules into executable rejection conditions |
| `scripts/harness/redaction.ts` | Evidence privacy | Redacts known credentials/URLs/keys/tokens and rejects recognized secrets in submitted artifacts | Limits unnecessary credential exposure to reviewers |
| `scripts/harness/repository.ts` | Source/risk identity | Hashes tracked/untracked source and index, detects security/destructive paths, normalizes failures and fingerprints build outputs | Invalidates stale evidence and prevents path/profile-based risk downgrades |
| `scripts/harness/results.ts` | Individual test validation | Rejects empty/skipped/missing/foreign-environment tests and wrong deployment/database reports | Exit zero alone cannot prove mapped behavior or migration rehearsal |
| `scripts/harness/runner.ts` | Deterministic command capture | Executes reviewed argv without shell, sanitizes environment/output, enforces timeout, parses named results and binds deployment target | Requires real executed evidence and prevents default use of live test credentials |
| `scripts/harness/state.ts` | Formal transition reducer | Replays legal events, owns attempt/repair counters, invalidation, interruption and escalation | Prevents skipped gates and limits repair/restart cycles |
| `scripts/harness/store.ts` | Durable evidence store | Exclusive locks, fsynced hash-chain journal, derived projection, immutable blobs, artifact/output validation and recovery | Preserves history, rejects tampering and handles partial writes without replaying accepted work |
| `scripts/harness/test-reporter.cjs` | Node test adapter | Exports named execution outcomes and failure diagnostics to run-local reports | Separates test authoring from actual deterministic execution |
| `scripts/harness/tsconfig.json` | Isolated compile check | Checks controller, CLI, tests, sensor and dedicated Playwright config with repository compiler | Adds a meaningful harness typecheck without changing product configuration |
| `scripts/harness/types.ts` | Shared contracts | Defines stages/owners, evidence, authenticated inputs, approval payloads and hard repair limit | Makes control state explicit and independent of agent-configured iteration counts |
| `tests/harness/config.test.ts` | Configuration/target regression | Checks mandatory roles, generated-output identities, native target floors, shared-DAG validation and dotenv isolation | Keeps profiles consistent and prevents target masking or live credential loading |
| `tests/harness/helpers.ts` | Isolated fixtures | Creates temporary Git repositories, distinct capabilities, signing keys and simulated infrastructure records | Tests control contracts without touching LMS data or root live credentials |
| `tests/harness/runner.test.ts` | Real infrastructure integration | Runs actual child commands, missing-report rejection and timeout termination | Checks command execution separately from mocked gate metadata |
| `tests/harness/safety.test.ts` | Failure scenario regression | Exercises architecture, approvals, freshness, scope, repairs, interruption, tampering, target binding and impersonation | Covers the requested safety failure scenarios and discovered bypasses |

## New Workflow

Intake and scope → contractual requirements → repository facts/original proposal → architecture
red-team → adjudicated decisions → traceable plan → signed high/critical implementation approval
→ controlled executor → independent test author → deterministic full validation → QA → security
→ code/architecture review → bounded full repair/revalidation if required → release aggregation
→ separate signed deployment approval → actual target-bound deployment → actual target-bound post-deploy.

Run operation and artifact examples: .orchestra/harness/README.md and examples/. Legacy score loops,
shared evaluator logs, memory statuses and v1 run JSON are historical context only. Start a fresh v2
run; do not promote them into passing evidence.

## Verification

Final controller suite: 45 tests passed, no failed/skipped/todo cases. The following checks were run
using the existing dependency tree. On this host the exact package commands were prefixed in PowerShell
with `$env:pnpm_config_verify_deps_before_run = 'warn'` to prevent an unrelated implicit install.

| Exact command | Result / exit | Proves | Does not prove |
|---|---|---|---|
| `pnpm harness:typecheck` | PASS / 0 | Controller, CLI, tests, static sensor and isolated Playwright config typecheck | Runtime/LMS behavior, test adequacy, authorization or deployment safety |
| `pnpm harness:test` | PASS, 45 cases / 0 | Requested failure scenarios, ownership/capabilities, freshness, repair/resume, target/output binding, large shared-dependency DAG, dotenv isolation and real fixture command capture/timeout | Live LMS authorization, real migration application, native build behavior or a product release |
| `pnpm harness:check` | PASS, all four sensors / 0 | Prisma schema validity, web compilation, institute folder placement and required rule presence | Server-boundary security, DB preservation/upgrade compatibility or deployment readiness |
| `pnpm harness:verify` | Expected rejection / 1 | Unspecified runs cannot be implicitly promoted or an older run silently selected | A passing real run |
| `node apps/web/node_modules/typescript/bin/tsc --project scripts/harness/tsconfig.json` | PASS / 0 | Direct installed-compiler cross-check of harness types | Runtime or product correctness |
| `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check -- .agents .orchestra scripts/harness-check.ts scripts/harness-verify-run.ts package.json AGENTS.md .gitignore docs/architecture/agentic-skills-and-ai-orchestra.md` | PASS / 0 | Scoped tracked harness diff whitespace consistency | Behavior or safety |
    
Root-repository CLI smoke checks use `run_harness_v2_smoke_20261004`. The run remains DRAFT with
no claimed/completed stage, command or approval. These checks exercise the actual repository snapshot
and durable journal, not a simulated release. The explicit partial flag is diagnostic only.

| Exact command (same PowerShell prefix) | Result / exit | Proves | Does not prove |
|---|---|---|---|
| `pnpm harness init --run run_harness_v2_smoke_20261004 --file .orchestra/harness/examples/input.example.json` | PASS, HIGH-risk DRAFT / 0 | Contract parsing, actual repository snapshot and journal initialization | Independent actors, approval or passing stage evidence |
| `pnpm harness status --run run_harness_v2_smoke_20261004` | PASS, DRAFT / 0 | Source freshness synchronization with finalized files without dispatching agents | Release readiness |
| `pnpm harness:verify -- --run run_harness_v2_smoke_20261004 --allow-partial` | PASS, diagnostic DRAFT / 0 | Fresh partial journal/artifact consistency in this repository | Completed gates, product correctness or release readiness |
| `pnpm harness:verify -- --run run_harness_v2_smoke_20261004` | Expected rejection, incomplete DRAFT / 1 | An initialized partial run cannot satisfy the release verifier | A passing real release |

Intermediate history: earlier 27-, 33- and 36-case suites passed. The first 41-case run returned
exit 1 because api-auth.ts was MEDIUM rather than HIGH; the risk matcher was corrected, including
dashboard layout and server-action paths. Later suites add target binding, repair-invalidation,
shared-DAG and dotenv-isolation coverage. Transient TypeScript errors were corrected before final validation. No application fix
was made to satisfy a harness check.

Environment history: the installed tsx runtime failed inside the Windows sandbox while querying
user information (uv_os_get_passwd ENOMEM), so execution checks used approved escalation. pnpm's
fallback runtime initially attempted an implicit install and aborted; subsequent local checks set
pnpm_config_verify_deps_before_run=warn to use the existing dependency tree. The runner itself
forbids implicit install/version switching. One exploratory whole-tree diff check with autocrlf
forced off treated existing CRLF/application changes as whitespace failures; the scoped CRLF-aware
harness check passed. These failures are not product/security/migration verification results.

## Remaining Risks

- The host must bind distinct capabilities to genuinely separate agent sessions, protect controller/
  journal/public-key configuration, and enforce OS/tool restrictions. This CLI is not a process sandbox.
- Independent reviewers/humans must judge requirements, architecture evidence, semantic risk and test
  adequacy. Passing named tests or truthful-looking database reports cannot mechanically establish
  meaningful assertions. This redesign was verified by controls/tests/static sensors, not an external
  independent review or a signed product release run.
- Common secret redaction and path/SQL heuristics are incomplete. Unrecognized credentials/PII, browser
  traces, screenshots and custom command side effects need host access controls and reviewer scrutiny.
- Repository-specific DB rehearsal, migration compatibility/data-preservation checks, valid recovery,
  production deployment and real post-deploy adapters must be supplied/reviewed for each applicable run.
  No real database migration, remote deployment, native app build or LMS behavioral E2E suite was run here.
  Product runtime/build checks require an isolated checkout with no loadable `.env` files and injected
  disposable local PostgreSQL `harness_*` credentials; this repository's existing live env files remain untouched.
- Environment hashes record forwarded configuration at execution time. Mutable databases/services,
  OS tooling, uncontrolled subprocess access and later external changes still need operational verification.
- Exactly-once deployment cannot be guaranteed locally. Providers must implement idempotency; uncertain
  side effects require operator reconciliation. Full journal/controller rewrite or deletion by a privileged
  principal is outside the local integrity model; use protected CI/remote evidence retention when needed.
- CI configuration was added but not run on GitHub. Dependency verification reported existing workspace
  metadata drift; dependency declarations/lockfile were not repaired or reinstalled in this task.
