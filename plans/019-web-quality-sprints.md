# Plan 019: Improve and verify web LMS quality in three sprints

- **Status:** All three sprints' local implementation/evidence work is complete. Sprint 3's deployment/capacity release gate remains open: isolated staging/provider/human evidence and deployment are pending. See [Sprint 1 results](019-sprint-1-results.md), [Sprint 2 results](019-sprint-2-results.md) and [Sprint 3 results](019-sprint-3-results.md).
- **Planned at:** commit `54befee`, 20 October 2026, plus the current uncommitted workspace. Commit alone does not capture the reviewed baseline.
- **Scope:** CdM LMS web application, its Next.js backend, PostgreSQL integration and deployment evidence.
- **Priority / effort / risk:** P1; multi-day work across three outcome-based sprints; HIGH overall because authorization, academic records and credentials are involved.
- **Order:** Sprint 1 → Sprint 2 → Sprint 3. Collect baseline measurements early; final load claims require the fixes and staging environment.
- **Planning references:** [Quality review](iso25010-quality-review-2026-10-20.md), [security inventory](security-checklist-status-2026-10-20.md). This document supplies the execution context without requiring the conversation.
- **Not a schedule promise:** Sprint boundaries are completion gates; estimates should follow reproduction and environment discovery. Each sprint can contain small reviewable changes without adding more sprints.

## Outcome

Deliver working, safer web workflows and repeatable evidence for functional suitability, compatibility, interaction capability, reliability, security and performance efficiency. Replace the provisional 62/100 source-review estimate with an assessment that clearly distinguishes executed results, user feedback and unverified hosting controls. Do not promise a target score or 1,000-user capacity before measurements.

## Boundaries and repository conventions

- Backend logic belongs in `apps/web/src/app/api`; never add it to the placeholder `apps/api`.
- Dashboard routes belong under `apps/web/src/app/(dashboard)/[institute]`; use existing institute theming and role policies.
- Use `{ db }` from `apps/web/src/lib/db.ts`. Shared schema/migrations live at root `prisma/`.
- Each protected API must verify its session and resource relationship. Middleware checks cookie presence, not authorization.
- Preserve existing Super User / Institute Admin ceilings, institution scoping and intended anonymous public routes. A security fix must not silently grant or remove entire role capabilities.
- Use existing patterns: `lib/super-user-v1/actor.ts` for actor/origin checks, `lib/codelab-completion.ts` for atomic academic operations and `components/layout/MobileMoreSheet.tsx` for focus handling.
- **Excluded:** `apps/mobile/**`, native mobile behavior, Electron packaging, shared client/type redesign, new LMS feature development and wholesale visual redesign. Preserve backend compatibility for the developer working on mobile; document any unavoidable contract impact before changing it.
- Production changes, destructive migrations, credential rotation and high-volume traffic need an identified target and rollback procedure. Develop and verify changes on owned disposable fixtures/staging first.
- Never copy credentials, student data, raw tokens or environment-file contents into reports, commands, screenshots or version control.
- Initial local reproduction/tests need no user login. Browser tests later use dedicated student, instructor and administrator accounts. Hosting verification/load tests require isolated staging resources.

## Baseline and drift check

Before implementation, run:

```powershell
git rev-parse --short HEAD
git diff --stat 54befee..HEAD -- apps/web prisma tests .github
git diff --stat -- apps/web prisma tests .github
pnpm --filter web exec tsc --noEmit --incremental false
node --import tsx --test tests/roster/rules.test.ts tests/program-head/meeting-links.test.ts tests/navigation/active-path.test.ts tests/calendar/student-calendar.test.ts
```

The last executed review baseline passed the web typecheck and **27 focused tests**. Re-run rather than treating that historical result as current. These tests cover selected rules/navigation/calendar behavior, not full workflows or load capacity.

Record current commit, affected uncommitted files and file hashes in the test evidence. Read any changed source before editing; preserve other developers' work. If a finding has already been fixed, verify it and mark it resolved instead of applying another fix.

Use a `codex/` branch or an isolated checkout when implementation begins. Do not commit, push or deploy merely because this plan exists.

## Sprint 1 — Protect access and academic records

**Goal:** Close confirmed high-impact gaps and make important academic writes safe to retry and fail.

### Work

1. **Authorization and validation:** Reproduce the assignments course-ID access gap, then verify institute and enrollment/teaching relationships before returning data. Trace connected attachment/flashcard reads and writes; bind submitted IDs to the authorized course and actor. Add complete runtime validation on the touched handlers.
2. **Secrets and diagnostics:** Minimize public health output, sanitize touched API errors/logs, remove hardcoded GitHub encryption/webhook fallback secrets and fail closed when configuration is absent. Prepare a migration/rotation path for existing encrypted tokens; do not strand stored tokens by simply changing the key.
3. **Atomic academic writes:** Write submission state and intended attachments in one transaction. Honor request retries without duplicate attachments. Make instructor activity reject/restore and corresponding gradebook updates atomic. Make grade incentive rewards idempotent using a database-enforced identity/transaction rule; define regrading behavior explicitly.
4. **Regression evidence:** Add positive and negative tests for every changed boundary: anonymous, wrong role, wrong institute, unenrolled student, unrelated instructor, valid actor, duplicate request, simultaneous retry and failure of the second write. Test database-sensitive races/rollback against real isolated PostgreSQL, not just mocks.

### Starting evidence and intended edit scope

| Source | Current behavior / change boundary |
|---|---|
| `apps/web/src/app/api/assignments/route.ts:30` | Course-ID branch starts with `const whereCondition = { courseId }`; relationship check must precede the query. |
| `apps/web/src/lib/super-user-v1/legacy-entry-guard.ts`, `actor.ts` | Reuse existing role ceilings and relationship/origin helpers; inspect their caller effects before changing shared behavior. |
| `apps/web/src/app/api/health/route.ts` | Detailed database diagnostics and raw failure text are public; retain only minimal public readiness. |
| `apps/web/src/lib/github/token-vault.ts:4`, `app/api/github/webhooks/route.ts:11` | Fallback-key/secret locations; values must never be reproduced. |
| `apps/web/src/app/api/courses/[courseId]/submissions/route.ts:137` | `db.studentSubmission.upsert(...)` followed by separate attachment writes. |
| `apps/web/src/app/api/codelab/instructor/reject/route.ts:94` | Separate activity/gradebook writes; catches gradebook failure and can still report success. |
| `apps/web/src/app/api/courses/[courseId]/submissions/grade/route.ts`, `lib/gamification/grant-exp.ts` | Regrading/retry must not repeatedly grant the same incentive. |
| `apps/web/src/app/api/flashcards/{file-info,auto-generate}/route.ts` and directly connected classwork attachment handlers | Trace resource authorization and external fetch destinations. |

Additional allowed edits: narrowly necessary helpers, `prisma/schema.prisma` and additive migrations for replay/reward identities, plus `tests/web-quality/**`. No broad rewrite of authorization or gamification.

### Verification and exit gate

Create `tests/web-quality/security.test.cjs` and `academic.test.cjs`; follow the Node test style in `tests/codelab/completion.test.cjs` and direct-handler fixtures in `tests/calendar/events-api.test.cjs`. Add `tests/web-quality/integration.mjs` using the owned PostgreSQL fixture pattern from `tests/program-head/postgres-fixture.mjs`; refuse non-owned database targets.

```powershell
node --import tsx --test tests/web-quality/security.test.cjs tests/web-quality/academic.test.cjs
node --import tsx tests/web-quality/integration.mjs
pnpm --filter web exec tsc --noEmit --incremental false
```

Expected: all checks pass, no skips for required coverage, real rollback/concurrency assertions pass, no unintended data/credential exposure. The new files/commands above are planned deliverables, not existing passing tests.

If schema changes, run `pnpm prisma generate` and rehearse the real additive migration on a disposable existing-data fixture. Do not use `db push` on a shared/live database.

**Done:** Named access gaps are closed; failed academic writes roll back; repeated/concurrent equivalent requests produce one intended effect; existing permitted workflows still work. Record any remaining critical/high findings explicitly. Sprint 1 does not end with unresolved critical access or academic-integrity defects in its changed flows.

## Sprint 2 — Improve web workflows, sessions and expensive operations

**Goal:** Make normal web tasks accessible and predictable, and reduce concrete sources of resource growth.

### Work

1. **Web journey and interaction fixes:** Test login → dashboard → course → submission → grading/return → student grades, plus administrator roster/import/invitations. Fix confirmed web defects, incomplete input/error/loading states and navigation issues. Complete global search naming, keyboard containment and focus restoration using the existing accessible mobile web sheet pattern. Test responsive web layouts, keyboard-only navigation and supported browsers.
2. **Browser/session hardening:** Define and enforce idle and maximum absolute session lifetime, revocation behavior and password-policy consistency; prevent refresh extending sessions indefinitely. Apply mutation-origin/CSRF defenses and sensitive-response cache rules consistently on changed flows. Sanitize rich notes HTML and tighten production CSP incrementally while preserving Monaco, document viewers and required embeds. Retain cookie/bearer compatibility; a new JWT architecture is not required.
3. **Files:** Use authorized durable storage/serving, generated object identities, content/type/size inspection and malware scanning/quarantine appropriate to accepted files. Constrain attachment fetch destinations, redirects, size and timeout. Remove whole-file base64 fallbacks from scalable paths. Plan compatibility for existing public attachments and document which files genuinely remain intentionally public.
4. **Measured query/payload work:** Measure first, then bound gradebook student/assignment ranges, submission attachment payloads and relevant analytics. Preserve grade results. Review notification/study heartbeat behavior, code-execution admission and pool waiting. Tune pool/concurrency only with deployment/database limits; do not simply increase connections.

### Starting evidence and intended edit scope

- `apps/web/src/components/layout/SearchModal.tsx:405`: `role="dialog"` / `aria-modal="true"` without a complete accessible name/focus contract; exemplar `MobileMoreSheet.tsx:85`.
- `apps/web/src/lib/auth-session.ts`, `auth-schema.ts`, `app/api/auth/{refresh,change-password}/route.ts`: expiry/refresh/policy boundaries.
- `apps/web/src/lib/security-headers.ts:12`: production script policy includes inline/eval allowances. Test realistic production rendering before enforcement.
- `apps/web/src/components/workspace/{NotesModule,WorkspaceDashboard}.tsx` and workspace notes API: preserve intended rich text with a maintained sanitizer.
- `apps/web/src/app/api/upload/route.ts`: public storage and full-buffer/base64 fallbacks; related private asset serving patterns exist in `lib/academic-structure/assets.ts`.
- `apps/web/src/app/api/courses/[courseId]/gradebook/route.ts:126`: initializes every student × assignment cell; matrix cost is O(S×A) before submission/attachment payload.
- `apps/web/src/app/api/analytics/at-risk/route.ts`, `lib/db.ts`, `components/layout/NotificationBell.tsx`, `components/common/FloatingStudyTimer.tsx` and relevant web gradebook consumers.
- `apps/web/src/lib/roster/{imports,invitations}.ts` and onboarding web components: preserve 500-row import cap, resumability, invitation pacing and user-visible estimates.
- Keep `apps/web/src/app/api/grades/route.ts` mobile aggregate implementation out of this sprint; mobile developer owns that problem. Existing web grades logic is real and must remain working.

Additional allowed edits: directly connected web consumers, narrow storage/fetch/session helpers, additive schema changes if needed, `tests/web-quality/**` and browser configuration. Expand scope only when a traced dependency makes it necessary; document the reason first.

### Verification and exit gate

Create `tests/web-quality/workflows.spec.ts`, `accessibility.spec.ts`, `sessions.test.cjs`, `resources.test.cjs` and a dedicated `playwright.config.ts`. Match existing Playwright fixtures but require an explicit owned local/staging target and dedicated test accounts; never silently reuse a real shared development server.

```powershell
node --import tsx --test tests/web-quality/security.test.cjs tests/web-quality/academic.test.cjs tests/web-quality/sessions.test.cjs tests/web-quality/resources.test.cjs
pnpm exec playwright test --config tests/web-quality/playwright.config.ts
pnpm --filter web exec tsc --noEmit --incremental false
pnpm build:web
```

Expected: production build/typecheck pass; student/instructor/admin web journeys pass; configured Chrome, Firefox and WebKit projects execute actual tests, including narrow viewports; keyboard tests prove modal naming/traversal/focus return. Install missing browser test runtimes as needed; do not count an unavailable project as a pass.

Execution note: `node --import tsx tests/web-quality/sprint2.mjs` now supplies the guarded Playwright target, builds an isolated production source copy and runs that browser command with owned HTTPS/database state. A direct Playwright invocation without the runner's state/token is intentionally refused. Connected scope additions and the exact measured results are recorded in the Sprint 2 results and deployment handoff.

Session tests must cover expiry/idle/revocation and cookie/bearer precedence. Resource tests must cover allowed/blocked file requests, HTML sanitation, CSP-compatible critical pages, paged gradebook totals and unchanged grading results. Capture before/after query count, payload bytes and latency for the same fixture; do not substitute tiny-fixture improvements for a load claim.

**Done:** Critical web journeys work across the supported matrix; touched security behaviors have regressions; the identified large-payload paths are bounded; no regression in permitted academic results. A verified staging storage/scanner dependency may remain pending until Sprint 3, but the feature cannot be called production-ready without it.

## Sprint 3 — Prove capacity, recovery and release readiness

**Goal:** Establish actual operating limits and a defensible six-characteristic quality report.

### Inputs needed at this stage

- An isolated staging URL/database/storage and Judge0 target with production-like resource limits; synthetic data only.
- Dedicated student, instructor and administrator test identities, plus synthetic per-user identities for load scenarios.
- App/database hosting plan and topology, pooler/connection limits, storage/scanning service and email-provider test configuration.
- Access to relevant provider configuration for TLS, DB permissions/network restrictions, encryption, backups, monitoring and alerts. Read-only access is enough for initial verification.
- An intended peak workload and proposed latency/recovery objectives. Use the defaults below as a draft until the project adopts its acceptance criteria.
- A confirmed deployment/rollback target before any real deployment or provider change. Do not send invitations or mass email to real students during tests.

### Work

1. **Data and capacity tests:** Import 400 valid students; assert exact expected identities/relationships and retry/resume outcomes. Test separate enrollment batches because 400 students × five courses produces 2,000 relationships. Ramp normal mixed usage through 50 → 100 → 250 → 400 → 1,000 active users, with realistic think time, background polling/heartbeats and representative histories. Run deadline submission bursts, uploads and CodeLab separately and in mixed traffic.
2. **Space/time/complexity evidence:** Record import duration, p50/p95/p99, throughput, error/timeout/policy-429 counts, payload bytes, CPU/RAM, DB/storage/index growth, DB connections/pool wait and external worker queues. Sustain the target for 30–60 minutes, add a spike/recovery phase and repeat on the final build. Explain source-derived complexity separately from measurements.
3. **Operational controls:** Verify actual TLS/certificate checks, runtime DB grants, public exposure/firewalls, storage encryption and backups. Restore a real test backup to a separate isolated target; compare academic records and measure RTO/RPO. Establish safe security logging/alerts and a concise incident/recovery runbook. Add appropriate product dependency/container scans and product regression CI; existing harness-only checks are insufficient.
4. **Release evidence:** Fix/retest confirmed failures within these scopes. Prepare the migration/deployment/rollback procedure and a six-characteristic report containing measured results, remaining limitations and a release decision. Gather representative student/instructor/admin task feedback for interaction capability; do not invent respondent results or call a source-review estimate an ISO measurement.

### Draft acceptance criteria

These are project proposals, not ISO requirements. Set them before final runs and record changes rather than quietly lowering them after a failure.

| Test | Draft success criterion |
|---|---|
| 400-row import | Exactly the expected records/relations, correct row errors, no duplicate identities, safe retry/resume; duration and resource use recorded. |
| Ordinary mixed traffic at target load | API p95 ≤2 seconds, p99 ≤5 seconds; unexpected failures <1%; workload and achieved requests/second disclosed. |
| Academic records | Zero lost, duplicate or corrupt submissions/attachments/grade effects in the tested scenarios; data assertions after load. |
| Heavy operations | Separate declared budgets for imports, large uploads, gradebooks and CodeLab; ordinary API budget is not silently applied to asynchronous work. |
| Sustained load | No unexplained continuing RAM/connection growth or unbounded queue; observed peak usage and remaining headroom documented. |
| Recovery | Agreed RTO/RPO adopted and met in an isolated restore drill; outage behavior and recovery verified. |
| Security | No unresolved critical/high confirmed defects in tested release scope, with regression evidence; unverified provider controls are listed explicitly. |
| Interaction/compatibility | Required tasks complete in the supported web/browser matrix; observed accessibility and user-evaluation results recorded. |

### Test tooling, scope and verification

Create `tests/web-quality/load.mjs`, `staging.example.json`, `load-report.mjs` and `restore-check.mjs`. Reuse existing Node/HTTP tooling unless a measured need justifies a dependency. Load runner must:
- require an explicit reviewed staging origin, named environment and maximum concurrency/duration;
- refuse absent/production/unknown targets; never default to production or inherited live DB URLs;
- use bounded request timeouts, distinct synthetic accounts, rate-limited ramp-up and secret-redacted results;
- provide separate browser/session, HTTP arrival/concurrency and CodeLab workload definitions;
- write timestamps, build/dataset/environment identifiers, achieved load and data assertions in machine-readable output;
- return nonzero on failed thresholds or data integrity and never count missed target load as success.

Proposed command contract (scripts/configs are created in this sprint):

```powershell
node tests/web-quality/load.mjs --config tmp/web-quality/staging-load.json --scenario mixed --users 1000 --duration-seconds 1800
node tests/web-quality/load-report.mjs --input tmp/web-quality/load-results.json
node tests/web-quality/restore-check.mjs --config tmp/web-quality/restore.json
```

Validate smaller ramps before the 1,000-user command. Keep actual credentials in protected environment variables; config examples contain references/placeholders only. The restore script may operate solely on a verified owned restore destination.

Scope: `tests/web-quality/**`, product CI under `.github/**`, scoped web instrumentation/limits and operator docs/scripts with an explicit target. No unrelated feature work or assumed cloud-provider configuration.

Re-run Sprint 1/2 gates against the final candidate. Produce `docs/quality/web-lms-2026-10/report.md` plus machine-readable results in ignored `tmp/web-quality/`; include commands, exit codes, source identifiers, environment, dataset, test counts and limits. Report each criterion as PASS, FAIL or NOT VERIFIED. If the deployment cannot meet 1,000 active users, state the highest measured passing workload and the actual bottleneck.

**Done:** Reproducible measured capacity and recovery evidence, explicit remaining risks, a reviewed deployment/rollback procedure, and an evidence-based assessment of all six selected characteristics. A release is not approved by an average score alone.

## Deferred decisions and completion rules

- MFA/passkeys, blanket tenant RLS, replacing opaque sessions with access/refresh JWTs, signed product binaries and major architecture changes are **not automatic additions**. Assess their need after concrete gaps and risk requirements are established; capture any required follow-up without adding new sprints now.
- Provider controls and human feedback can be prepared while code work proceeds; waiting for one must not prevent independent local work.
- If production secrets/real student data appear in a test target, stop that operation, preserve sanitized evidence and choose an isolated fixture.
- If a change would conflict with the mobile developer's shared API contract, preserve compatibility or document the specific contract decision before implementation.
- If source assumptions have drifted, reproduce against current code and revise this document. Do not revert another developer's work to match old excerpts.
- No sprint is complete based on screenshots, existing test filenames, manually assigned scores, static sensors or historical harness state alone.
- Maintain per-sprint status below and link the actual results. Keep these three sprint boundaries; use small tasks inside them instead of multiplying phases.

| Sprint | Status | Evidence / remaining dependency |
|---|---|---|
| 1 — Access and academic integrity | DONE locally; deployment pending | [58 tests + 16 database scenarios](019-sprint-1-results.md); migration/configuration handoff prepared. |
| 2 — Web workflows and efficiency | DONE locally; deployment/scanner verification pending | [77 Node tests, 17 database scenarios, 24 browser checks and measured paging](019-sprint-2-results.md); production build/typechecks pass. |
| 3 — Capacity, recovery and evidence | LOCAL WORK COMPLETE; release gate open | [88 product tests, 24 browser checks, actual 400-student import/2,000 enrollments, 84-table restore and measured load limits](019-sprint-3-results.md). Default-pool short local read workload passes 400 users and fails latency at 1,000; sustained staging/provider/human/deployment evidence remains pending. |
