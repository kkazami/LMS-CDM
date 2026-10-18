# Harness v2 operational readiness — 2026-10-04

This report supplements harness-redesign.md. It records executable behavior observed during
operationalization; it does not promote that earlier assessment's unit evidence into a real release.
No LMS feature, Prisma schema, product/application source, dependency version or lockfile was edited.

## Operational Readiness Assessment

Current overall classification: **PARTIALLY OPERATIONAL**. Independent real-provider clean and
repair tasks reached RELEASE_READY, and actual GitHub Actions passed. The isolated LOW workflow
is operational locally. Production-gated LMS work still depends on host isolation, protected human
signing, actual disposable PostgreSQL rehearsal and task-specific product/deployment verification.

## Functional Components

| Component | Implemented / executable | Independent verification | Remaining dependency / audit class |
|---|---|---|---|
| Controller, transitions, provenance, scope and freshness | Yes, CLI/API | Local Node tests plus complete real provider lifecycle | Trusted controller/journal access; A/B |
| Requirement, recon, red-team, adjudicator, planner | Real fresh Codex CLI sessions | Actual role/session receipts and accepted artifacts observed | Authenticated provider; source transmission approved by user; A |
| Executor / test author | Separate read-only sessions with host-mediated proposed writes | Real HTML/test files authored in isolated Git repositories | OS-wide read isolation remains host-controlled; A |
| Runner | Real node/pnpm argv with shell:false | Child-process results, timeout/crash and repair tests | Installed pnpm/dependencies and process supervision; A |
| QA, security, code review, release | Independent provider sessions; mandatory gates | Actual distinct role/session receipts and accepted reviews in clean and repair tasks | Semantic judgment cannot be established by schema alone; A |
| Repair adviser | Independent read-only session, no PASS/write/approval authority | Actual failed browser run, independent advice, one repair and complete revalidation/review | Explicit host --repair; five-repair reducer ceiling retained; A |
| Ed25519 signing and pinning | Encrypted disposable provisioning, protected-file signer, journal key pin | Actual restricted test files/signatures/negative checks | Separate production signer principal and human review; A/D |
| Private Playwright adapter | Fresh loopback server, no reuse/retry, run-local reports | Actual clean and repaired browser assertions; real focused/skipped tests refused | Installed browser; application tests still require clean checkout/disposable DB; A |
| PostgreSQL/Prisma rehearsal | Real adapter and temporary Docker service configured | Unsafe URL/env preconditions tested; no database connection made | Docker/PostgreSQL absent on this host; B/D |
| Deployment / post-deploy | Deterministic adapter contract, separate approvals, target binding | Signed local fixture rejects changed target before argv; no deployment performed | Reviewed real provider/idempotency/recovery adapters; B/D |
| CI | Pinned install/type/tests/static sensors/log retention configured | Actual GitHub installation, checks and artifact upload/download passed | GitHub credentials/Actions availability; A/D |
| Legacy flows | Historical aliases; no rubric/state authority | Existing regression tests reject bypasses and edited projection | Host must not execute ungoverned alternate scripts; A |

Audit classes: A = executable, B = local test verification only, C = wiring not actually run,
D = external dependency, E = unsafe/incomplete. Issues found and fixed (E): no agent dispatch;
Playwright server cwd; unbound provider provenance; mutable approval-key selection; redundant repair
source invalidation; stopped-state mutations potentially hidden by a recovery source update; metadata
transcription/provider schema incompatibility; missing provider failure diagnostics; accepted receipt
reverification incorrectly requiring an active lease; missing validated database environment forwarding;
browser argv overrides; failed named outcomes omitted before rejection. A test-only dependency junction
also caused Git enumeration overflow; fixture Git ignores now exclude generated node_modules.

## Real End-to-End Run

Clean task: a standalone HTML fixture with heading `Harness operational smoke`, button
`Check readiness`, status `Waiting` changing to `Ready` on click; independent Playwright assertions.
Only docs/fixtures/smoke.html and tests/harness-fixtures/smoke.spec.ts are writable. No database or
deployment. These files exist only in isolated ignored task repositories, not the LMS application.

The host supplies role-specific sources/artifacts and launches fresh Codex sessions with read-only
sandbox, no approval escalation, no configured MCP/apps/plugins, and constrained output metadata.
Host-held capabilities and leases never enter provider context. Each stage uses its own role ID and
captured provider thread ID. Runner/deployer are deterministic services, not judgment sessions.
The controller validates every actual write, dependency, result and review; file existence is insufficient.

Real run records:

| Run ID | Outcome | Evidence |
|---|---|---|
| run_operational_c39785682d9b4855bb3131ef05873378 | FAILED at requirements | Real agent reported denied required reads; gate rejected unresolved ambiguity |
| run_operational_150aada1a5ef485680724f82dd6f0917 | FAILED at validation | Requirements through TESTS_READY accepted; actual types/control suite passed; browser server cwd failed, zero tests rejected |
| run_operational_b376bce010524439b8423bbefe70e62c | FAILED at plan | Agent transcribed one dependency hash incorrectly; binding rejected |
| run_operational_857ca81e29884a468880803c883bbea7 | FAILED at recon | Provider schema error, not a gate PASS |
| run_operational_77dc58552e36462db2fc36db364d3f79 | FAILED at recon | Durable diagnostics identified unsupported quoted string enum; dependencies changed to structured exact-valued properties |
| run_operational_7443ce8ac6714acba34f38a949fb4212 | RELEASE_READY; original smoke exit 1 | Clean lifecycle; final verifier exposed an accepted-receipt recheck defect. Corrected standalone verifier exits 0 against unchanged retained evidence |
| run_operational_8b78173119e14cdd9184fd2e6bb77e58 | RELEASE_READY; attempt 1, repairs 1; original smoke exit 1 | Actual browser failure retained, independent repair adviser, new executor/test sessions, all three commands rerun, independent QA/security/code-review/release. Corrected standalone verifier exits 0 |
| run_operational_cc25610db1d94e7baf8679188a917b70 | RELEASE_READY; smoke exit 0; attempt 0, repairs 0 | Final clean task, all fourteen journal states and all three commands accepted; standalone verifier exits 0 |

The final clean [summary](C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/runs/run_operational_cc25610db1d94e7baf8679188a917b70/summary.json)
and [repair summary](C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/runs/run_operational_8b78173119e14cdd9184fd2e6bb77e58/summary.json)
contain exact commands, timestamps, source hashes, artifact hashes and failure history. Their isolated
workspace/.orchestra/runs/<runId> directories retain journals, provider receipts, reviews and logs.
The clean task used eleven separate real judgment sessions; runner was an actual deterministic service.

Every run retains its journal/artifacts/receipts/review diffs/command logs/individual results.
No failed run is relabeled or merged into another run's passing evidence. New runs after adapter
protocol corrections are distinct tasks; the within-run five-repair ceiling remains enforced.

The clean code-only journal records:
DRAFT → REQUIREMENTS_READY → RECON_COMPLETE → RED_TEAM_COMPLETE → ARCHITECTURE_ADJUDICATED
→ PLAN_READY → APPROVED → IMPLEMENTED → TESTS_READY → VALIDATED → QA_VERIFIED
→ SECURITY_VERIFIED → CODE_REVIEWED → RELEASE_READY.
APPROVED is an owned implementation claim for LOW risk, not a fabricated human signature.

Mandatory actual commands are `pnpm harness:typecheck`, `pnpm harness:test`, and
`pnpm exec playwright test --config .orchestra/harness/playwright.config.ts` in the isolated repository.
Behavioral evidence records named cases, run/attempt/stage, argv, source/index/HEAD, environment
digest, timestamps, exit/signal/error and report/output hashes. The browser server is fresh and
bound to a reserved loopback port. There are no human approvals for the LOW task and no deployment.

## Failure Injection Results

| Scenario | Expected / observed local result | Level / status |
|---|---|---|
| Missing adjudication, critical deferred finding, unresolved mandatory decision | Planning blocked | Controller regression PASS |
| Required stage or security/code review omitted | Illegal owner/order/release rejected | Controller regression PASS |
| Missing/expired/forged/wrong-run/wrong-subject/wrong-risk approval | No approval or implementation acceptance | Actual signatures/controller integration PASS |
| Signing key replaced | Journal replay refused | Controller integration PASS |
| Contract scope changed after approval | Subject mismatch/source invalidation requires fresh reviewed planning | Controller regression PASS |
| Mutable projection risk lowered | Journal retains HIGH; unsigned implementation refused | Controller integration PASS |
| Auth/RBAC/schema/migrations/harness controls | HIGH floor; secret/destructive/production operations CRITICAL | Classifier/controller regressions PASS |
| Validation passed, source/HEAD changed | Release evidence rejected; HEAD change invalidates recon | Real captured command integration PASS |
| Security passed, sensitive control changed | Validation/security evidence removed; full verification required | Real command/controller integration PASS; review JSON supplied by test fixture |
| Schema changed after migration evidence | Database gate evidence invalidates | Reducer fixture PASS; database report simulated, not a PostgreSQL rehearsal |
| Actual target differs from signed plan/release | Reject before executing deployment argv | Signed real-runner fixture PASS; no deployment |
| Crash before command, during command, after child exit before evidence commit | No PASS; recover interrupts old lease; resume consumes budget and reruns required set | Actual killed worker/process-tree integration PASS |
| Crash during approval or repair commit | Uncommitted mutation absent; history/budget retained | Actual process exit inside exclusive lock integration PASS |
| Crash during review | Accepted validation retained when source unchanged; old lease revoked | Actual killed worker integration PASS |
| Risk/unapproved scope changed while failed/interrupted | HUMAN_REVIEW_REQUIRED; cannot hide mutation with fresh recovery snapshot | Controller integration PASS |
| Failed real command → repair → full validation → QA/security/code review → release | All commands rerun, failure retained, one repair | Actual runner/controller fixture PASS; judgment artifacts supplied by test harness |
| Sixth repair / third normalized identical failure | Escalate; five is hard ceiling | Controller regressions PASS |
| Foreign/stale/tampered artifact or edited state projection | Verification rejected; projection cannot override journal | Controller regressions PASS |
| Empty/missing/skipped/todo/flaky named results or zero-exit missing report | FAIL | Actual runner and report regressions PASS |
| Real provider authored HTML behavior deliberately broken | Browser failed; independent adviser supplied advice only; executor/tests, full validation and all reviews repeated | Real provider variant PASS, RELEASE_READY after one repair |
| Playwright test.only / test.skip | Focused test exits nonzero; skipped test exits zero but named outcome is not executed; both commands retained as FAIL and release refused | Actual Playwright process integrations PASS |
| Unsafe production/remote DB URL or loadable env files | Reject before connection/credential use | Real adapter precondition and URL tests PASS |

The real provider lifecycle and actual process integrations are distinguished from reducer fixtures.
No simulated database metadata, test-authored review JSON, or unexecuted CI is counted as proof of
independent orchestration, actual migration safety or actual deployment.

## Files Changed

These are operationalization changes; the earlier redesign's full inventory is in harness-redesign.md.
`.agent` aliases the same physical `.agents` files in the primary checkout. No agent role/rule file
was changed in this follow-up. Generated ignored run directories are evidence, not source edits.

| File | Purpose / important change / why |
|---|---|
| scripts/harness/agent-host.ts | Real independent Codex adapter and coordinator; safe exported context, exact output binding, scoped proposals, receipts, deterministic services and advisory repair; closes documented-only host launch gap |
| scripts/harness-host.ts | Operational CLI with external reproducible seed, pinned public key, explicit one-stage/repair options; supports new runs and safe host restart without automatic approvals |
| scripts/harness-smoke.ts | Real isolated HTML task and deliberate failure variant; retains source, full lifecycle, receipts, actual command outputs and summary |
| scripts/harness/types.ts | Optional managed provider/session receipts, pinned key and expected source, explicit recovery escalation; keeps trust/provenance state formal |
| scripts/harness/contracts.ts | Rejects unknown providers and browser config/retry/report/output overrides; managed binding and private adapter policy remain controller-owned |
| scripts/harness/controller.ts | Receipt-bound submission, initialization key pin, expected source and recovery-scope escalation; avoids accepting unapproved stopped-state changes |
| scripts/harness/gates.ts | Managed judgment stages require a source-bound unique session receipt; allows immutable accepted receipts to be reverified without an active lease; preserves mandatory gates |
| scripts/harness/state.ts | Maintains current expected source separately from immutable artifacts, validates recovery scope, invalidates paused-source changes, records escalation without resetting budgets |
| scripts/harness/store.ts | Verifies journal key pin and receipt hashes/run/attempt/stage/actor/dependencies; preserves durable provenance |
| scripts/harness/runner.ts | Trusted harness-only browser fixture environment, validated database environment forwarding, persisted failed named outcomes and process checkpoints for actual crash tests; no shell or result substitution |
| scripts/harness/signing.ts | Encrypted disposable Ed25519 provisioning, restrictive permissions/ACL and protected external signer; no production material or private keys enter agent context |
| scripts/harness-key.ts | Host-only disposable key generation and exact reviewed-subject signing with expiry; makes the approval path usable |
| scripts/harness/database-rehearsal.ts | Actual local PostgreSQL/Prisma fresh/upgrade/recovery adapter with introspection/preservation/compatibility and owned-target cleanup; no synthetic migration PASS |
| .orchestra/harness/database.compose.yml | Optional disposable loopback PostgreSQL infrastructure with temporary data storage; requires host Docker |
| .orchestra/harness/fixture-server.cjs | Harmless HTML-only server with no application/data/credential layer; supports a real LOW browser task |
| .orchestra/harness/playwright.config.ts | Separate harness fixture mode and explicit repository server cwd while retaining zero retries/focused-test refusal/no reuse/run-local reports; fixes observed real startup failure |
| scripts/harness-cli.ts | Explicit --root selection for isolated status/approval/recovery operations |
| scripts/harness-verify-run.ts | Explicit --root release verification against isolated current source and evidence |
| scripts/harness/tsconfig.json | Includes new host/smoke/key/CI adapters and actual process tests in strict compile checks |
| tests/harness/process-worker.ts | Real process interruption points before/after execution, during approval/repair and review lease ownership; no fake completion |
| tests/harness/operational.test.ts | Real command/crash/repair, key provisioning, scope/risk/target/freshness and managed-provider rejection regressions; keeps simulated judgments explicit |
| tests/harness/helpers.ts | Supports deployment-intended disposable fixtures and explicit unit-only managed receipts; ignores generated dependencies in fixture Git snapshots |
| tests/harness/browser.test.ts | Actually executes the private adapter against focused/skipped Playwright tests and verifies retained FAIL evidence/release refusal |
| .github/workflows/harness.yml | Refuses implicit installs, checks pinned pnpm/type/tests/static sensors, retains logs with failure propagation; actual GitHub outcome required separately |
| scripts/harness-ci.ts | Builds an isolated harness-only manifest; approved remote publication opens a draft PR without merge/deploy; read-only monitoring inspects jobs/artifacts and downloads logs without forwarding GitHub credentials to storage |
| package.json | Adds host/smoke/key entry points; no dependencies or lockfile changes |
| .orchestra/harness/README.md | Documents only changed executable behavior and four trust boundaries, actual host/signing/DB/CI prerequisites |
| docs/architecture/harness-operational-readiness.md | Complete operational audit, real run/failure/command evidence and external readiness limits |

## Verification Commands

PowerShell package checks on this host use `$env:pnpm_config_verify_deps_before_run = 'warn'` to
avoid an unrelated implicit reinstall. The actual installed runtime reports Node 25.8.0 and pnpm
11.25.0; this is not proof of CI's pinned Node 22/pnpm 10.32.1 installation. No dependency reinstall
or production credentials were used by isolated smoke/behavioral checks.

| Exact command | Exit / result | Proves | Does not prove |
|---|---|---|---|
| codex login status | 0, authenticated ChatGPT login | Existing provider login available | OS isolation, signer or task quality |
| codex --no-daemon -a never exec --ignore-user-config --ephemeral --sandbox read-only --skip-git-repo-check --json --color never <connectivity prompt> | 0, real thread/turn completed | Actual provider execution | End-to-end lifecycle |
| node apps/web/node_modules/typescript/bin/tsc --project scripts/harness/tsconfig.json | 0 | Current harness/adapter/tests compile | Runtime/product/CI behavior |
| pnpm harness:test | 0, all 66 cases PASS, none skipped/todo | Actual local control, process, signing, freshness, target and command/browser integrations | External independent review, actual database migration or CI installation |
| node --import tsx --test tests/harness/browser.test.ts | 0, both actual focused/skipped cases PASS | Private Playwright rejection and durable failed outcomes | Successful application browser behavior |
| node --import tsx scripts/harness-smoke.ts | 0, final clean cc25610db1d94e7baf8679188a917b70 RELEASE_READY | Real independent stage/session/command lifecycle | LMS behavior, schema migration, production approval or deployment |
| node --import tsx scripts/harness-smoke.ts --inject-repair | Original exit 1 at final receipt verifier; actual 8b78173119e14cdd9184fd2e6bb77e58 reached RELEASE_READY, one repair; corrected separate verifier 0 | Real failed browser → independent advice → full repair/revalidation/review; original exit remains recorded | Arbitrary task repair completeness |
| node --import tsx scripts/harness-verify-run.ts --root .orchestra/runs/run_operational_cc25610db1d94e7baf8679188a917b70/workspace --run run_operational_cc25610db1d94e7baf8679188a917b70 | 0, RELEASE_READY verified | Current source, journal/artifact/command integrity and gate satisfaction | Assertion adequacy, OS isolation or deployment |
| node --import tsx scripts/harness-verify-run.ts --root .orchestra/runs/run_operational_8b78173119e14cdd9184fd2e6bb77e58/workspace --run run_operational_8b78173119e14cdd9184fd2e6bb77e58 | 0, repaired RELEASE_READY verified | Current unchanged repaired source and preserved failure/repair evidence | Original smoke process exit 0 |
| node --import tsx scripts/harness-verify-run.ts --root .orchestra/runs/run_operational_7443ce8ac6714acba34f38a949fb4212/workspace --run run_operational_7443ce8ac6714acba34f38a949fb4212 | 0, RELEASE_READY verified | Corrected aggregate receipt verification against original clean evidence | Original smoke process exit 0 |
| pnpm harness:check | 0, four sensors PASS; DATABASE_URL explicitly set to postgresql://harness:harness@127.0.0.1:55432/harness_static | Static schema/web types/folders/rule checks; no database connection | Runtime/server authorization/database deployment |
| node --import tsx scripts/harness/database-rehearsal.ts --spec reviewed-rehearsal.json | 1, expected clean-env precondition rejection | Current live-env checkout cannot become a rehearsal target | Actual PostgreSQL creation/migration/recovery |
| git ls-remote --exit-code origin HEAD | 0, configured remote HEAD 2588732f7c75793679f56ff8fa87082ef4d2c4b2 | Read-only GitHub remote access | REST permissions or actual CI execution |
| node --import tsx scripts/harness-ci.ts --prepare | 0; isolated harness-only branch, reviewed manifest and commit 785f9fae44ecbd0d76c29348caa6d7ebd2ea5bc7 | Concrete local publication scope; original product checkout/HEAD unchanged | Remote publication or CI |
| node --import tsx scripts/harness-ci.ts --publish --prepared .orchestra/runs/codex-harness-operational-0dea7d0ab390/ci-publication.json | 0; pushed reviewed branch, draft PR 50 | Actual approved remote publication | Merge, deployment or a successful workflow by itself |
| node --import tsx scripts/harness-ci.ts --watch 785f9fae44ecbd0d76c29348caa6d7ebd2ea5bc7 | 0; workflow 37177615126 completed success | Actual GitHub Actions conclusion for this commit | Checks for a later commit |
| node --import tsx scripts/harness-ci.ts --inspect 37177615126 --download-logs | 0; actual jobs/steps success; 3035-byte verification log artifact downloaded | Actual pinned pnpm 10.32.1 log, frozen install, typecheck, 64 tests at that commit, four static sensors, artifact retention/upload/download | Database, deployment, full product security or later commit results |
| git push origin codex/harness-operational-0dea7d0ab390 | 0; final operational code commit 0573dbcfb0de392414239f565484af5bdc7224c2 published from isolated CI checkout | Approved five-file harness-only follow-up, primary checkout/HEAD untouched | Merge or deployment |
| node --import tsx scripts/harness-ci.ts --watch 0573dbcfb0de392414239f565484af5bdc7224c2 | 0; actual workflow 37178014169 observed | Actual per-commit CI execution | Local/provider/database safety |
| node --import tsx scripts/harness-ci.ts --inspect 37178014169 --download-logs | 0; completed success, all job steps successful, 3069-byte log artifact downloaded | Final operational code: pnpm 10.32.1, frozen install, typecheck, all 66 tests including actual Playwright rejection, four sensors, log retention/upload/download | PostgreSQL rehearsal, provider OS isolation, product authorization, deployment |

The approved draft [PR 50](https://github.com/kkazami/LMS-CDM/pull/50) includes the prior redesign
and this follow-up because the redesign was not committed in the primary checkout. The initial
[actual Actions run](https://github.com/kkazami/LMS-CDM/actions/runs/37177615126) passed on Ubuntu
with configured Node 22. Downloaded pnpm-version.log reports exactly 10.32.1. The checked-in
workflow sets dependency verification/pm-on-fail to error and pipefail preserves command failures.
This positive run does not experimentally prove every possible GitHub outage/failure mode.
The [final operational code Actions run](https://github.com/kkazami/LMS-CDM/actions/runs/37178014169)
passed all 66 cases, including the actual focused/skipped Playwright rejection checks. It also passed
typecheck, frozen installation and all four static sensors; its retained logs were downloaded and read.
Per-commit metadata/logs are retained in
.orchestra/runs/ci-inspections and GitHub, rather than treating the earlier 64-case run as final-source evidence.

The provider rejected quoted JSON string enums for dependencies; exact-valued object properties
now preserve binding without asking the model to transcribe hashes. Earlier Windows-sandbox tsx
checks also failed with uv_os_get_passwd ENOMEM; actual runtime checks used approved escalation.
Failures remain recorded; source fixes never turn the same failed execution into PASS. Automatic
approval review initially rejected provider source transmission and CI credential/publication use.
The user explicitly authorized the non-secret harness/fixture payload and then the prepared
harness-only branch, draft PR and actual Actions inspection. Both actions subsequently executed;
there is no outstanding approval request. No merge or deployment is included.

## Remaining External Dependencies

- **Host sandboxing:** exported read-only views and path-checked proposals limit provided context and
  brokered writes. They do not isolate same-user ambient file/process access or survive every OS
  failure. Actual crash tests use external process-tree termination; production needs supervised
  child containment. Exactly-once side effects cannot be inferred from local journal integrity.
- **Signing-key protection:** disposable encrypted keys/ACL/signatures are tested. Production needs
  a separate signer principal/service, protected passphrase, pinned public key and actual human approval.
- **Agent provider adapters:** Codex CLI is wired and real sessions captured; login/network/provider
  availability and authorized source transmission remain host duties. Other providers are not wired.
- **Database infrastructure:** Docker/PostgreSQL is absent. The executable rehearsal adapter requires
  a clean checkout, local admin rights to create/drop uniquely named harness DBs, reviewed baseline/
  seed/assertion SQL, and a task-specific real recovery assessment. Current repository has one initial
  migration; an existing-schema upgrade rehearsal requires an actual reviewed pending migration.
- **Deployment provider:** no production provider credentials/adapter/deployment was introduced.
  Idempotency, reconciliation and real post-deploy verification remain explicit external requirements.
- **CI-only behavior:** actual pinned installation, Linux control tests, static sensors and artifact
  upload/download passed. GitHub availability and checks on each later revision remain external;
  CI does not run authenticated provider tasks, disposable PostgreSQL rehearsals or deployments.
- **Human review:** requirements, accepted architecture, meaningful assertion coverage, negative
  authorization scenarios, data preservation/compatibility/recovery and release applicability cannot
  be mechanically guaranteed. LOW fixture applicability is not an LMS authorization/security proof.

## Final Next Step

Before any real LMS feature run: review the retained clean/repair smoke and draft PR; require its
latest actual CI checks to pass; provision isolated provider and signer principals with protected
seed/key; install disposable PostgreSQL and execute/review migration
rehearsal on a clean checkout; supply reviewed product server/API negative tests and, if deployment
is intended, provider/idempotency/recovery/post-deploy adapters. Initialize a managed run with the
public key pinned and obtain real human HIGH/CRITICAL approvals at the exact bound subjects.

Nothing in this report authorizes an LMS feature implementation or production deployment.
