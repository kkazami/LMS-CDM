# Sprint 1: Production and Dependency Security

19 November 2026. Central reference: [SECURITY-ROADMAP.md](../../SECURITY-ROADMAP.md). **Approved, unblocked implementation is complete for this sprint; production readiness and ASVS Level 2 remain unverified.** No production data access, deployment, database migration/restore, paid service, real MFA enrollment or blocked validation was performed.

## Reconciliation and preserved evidence

Starting HEAD is `331e25e7a04e0021215206e85c6e6631a7f34386` on `codex/security-remediation-2026-11-15`. The roadmap/register were already uncommitted at sprint start. Changes below are the current working tree, not a newly committed audit target. The existing run2 pin/tag stays at `5dc0a42963b241ca0bbaa1711ad6318fe0b9f202`; its ledger remains **14 covered, 4 candidate, 8 blocked, 51 deferred**. No new audit run, verdict promotion or final-clean claim was made.

All 186 snapshotted existing audit/regression/remediation files have identical hashes after implementation, including run1/run2, original regressions and earlier remediation records. New tests and this dated report are additive. Original source findings and interrupted verifier drafts are not recast as new confirmed results.

Historical evidence remains 36 targeted security passes, 30 CodeLab passes, 69 harness passes and four native typecheck passes at the earlier recorded revision. The historical broad Node inventory was 514: 505 pass / 8 fail / 1 skip, and web library units were 374: 373 pass / 1 fail. Sprint 1 does not rewrite those totals or claim a fresh full-suite pass.

## Implemented improvements

1. Updated compatible dependency versions and lockfile without lifecycle scripts during preparation, global forced major overrides, advisory suppressions, React/Expo SDK migrations or paid services. Parent ranges were checked against registry manifests. Detailed results and remaining upgrade decisions are in [dependency security](sprint-1-dependencies.md) and [machine evidence](sprint-1-dependency-results.json).
2. Added awaited, metadata-only `DATABASE_TABLE_EXPORTED` logging immediately before releasing the existing JSON download. Its fixed payload contains administrator actor IDs, institute ID, validated model, returned-row count, 500-row limit, JSON format and `PREPARED`. No exported records, student IDs/emails/names, credentials, raw request URL, cookie, user-agent, token or arbitrary metadata is logged. Serialization/read failure produces no success event; audit persistence failure returns the existing generic 503 and releases no download. This records preparation, not receipt on a student's/admin's device.
3. Added permanent export audit regression coverage and ordinary patched-dependency API smoke tests, with a durable [13-file allowed scope](../../tests/sprint-1/allowed-tests.json). Existing authorization and row filtering remain untouched; the new audit unit tests use explicit doubles and do not claim real session/tenant/database-grant validation.
4. Prepared [production administrator MFA rollout](admin-mfa-production-rollout.md): exact migration and triggers/grants, protected 32-byte Base64 key custody, human enrollment, recovery, no implicit key rotation and MFA-preserving rollback.
5. Prepared [production operator verification](production-operator-checklist.md): deployed build/database identity, effective grants/configuration, secret custody, ingress/provider facts, backups, incident ownership and explicit release sign-off.
6. Prepared [recoverable backup/DR strategy](backup-disaster-recovery.md): infrastructure/PITR plus independent encrypted logical backups, objects/keys/configuration, proposed RPO/RTO and retention, isolated recovery acceptance and authentication rollback prevention. Administrator database summaries remain unchanged and are explicitly not recovery backups.
7. Repaired four stale baseline fixtures/assertions without changing application/academic rules, removing guards or relaxing success/denial assertions; resolved two alias-related test invocation failures through the correct scoped loader.

## Dependency before and after

| Fresh scan, 19 November | Before | After |
|---|---|---|
| Production graph | **50**: 6 low, 18 moderate, 25 high, 1 critical | **6**: 0 low, 4 moderate, 2 high, **0 critical** |
| All dependencies | **117**: 13 low, 48 moderate, 54 high, 2 critical | **31**: 3 low, 14 moderate, 13 high, **1 critical** |

All-dependency advisory objects are 114→28; reported severity totals count affected-version/path matches as explained in the dependency report. Both final audit commands still exit 1 because matches remain. Lower counts do not establish shipped reachability or production safety. The dated November 17 raw reports remain separate historical evidence.

## Scoped tests and typechecks

Actual command, test-file scope, resource bounds, safe environment, output/receipt hashes and final tested source hashes are retained in [sprint-1-verification.json](sprint-1-verification.json). Detailed original stdout/receipts remain in ignored `tmp/security-sprint-1/`, not in the old audit output.

| Check | Observed result |
|---|---|
| Original six selected baseline files, committed fixtures, updated dependency tree | 29 tests: **25 pass, 4 fail, 0 skips**; exact old calendar/leaderboard/risk/navigation failures reproduced. |
| New export-audit suite against the old committed route | **0/3 pass**: no event, no awaited audit call and absent empty-export audit entry. The latter absent-entry access is recorded in the original output; it is not a database setup failure. |
| Final 13-file permitted scope | **92 tests pass, 0 fail, 0 skips**. Includes all four repaired baseline cases, both alias controls, three export-audit cases, patched dependency API smoke and existing CodeLab/grading/Arduino/MFA units. |
| Prisma generation | Fresh Prisma 7.9.1 client generated from current schema in scratch; no database connection/migration. |
| Next type generation | Pass with updated Next 16.4.6. |
| Web typecheck | **Pass**, exit 0; explicit 3 GiB Node heap in bounded 4 GiB container. |
| Mobile typecheck | **Pass**, exit 0, existing legacy-app exclusion preserved. |
| Desktop typecheck | **Pass**, exit 0. No Electron binary launch, packaging or signing claim. |
| Harness typecheck | **Pass**, exit 0; static compilation only, no blocked harness tests. |
| Full discovery / original broad security launcher / production build / E2E / provider checks | **Not run**: broad commands can include blocked validation, and a full build can invoke configured database setup. No complete-suite or deployed behavior claim. |

Execution uses cached Node **22.23.3** containers, no external network, no dotenv/credentials, read-only source/tool inputs, bounded writable scratch and per-command limits. Explicit in-memory doubles prevent real persistence/provider operations. Linux tool binaries were integrity-checked and prepared before offline execution. All owned target containers stopped and were removed. Compatibility uses the new disposable frozen install; main-workspace `node_modules` was not silently replaced or used as proof of new versions.

Initial fixture/tool failures are retained and listed in the verification record: missing Linux SWC, default web heap limit, executable mount, generated-client dependency links, a duplicate pnpm peer-context assumption, fixture-only TypeScript 6 baseUrl, and an omitted Playwright parent config. These were corrected in the **disposable execution setup**, without suppressing type diagnostics or modifying product code. Warnings about absent OpenSSL detection in the slim image did not prevent Prisma generation; no native database engine/provider runtime is certified by these checks.

## Baseline failure dispositions

| Historical failure | Sprint 1 disposition |
|---|---|
| Calendar DB mock lacks lab-readiness `$queryRaw` | Fixture now explicitly models the legacy optional-lab catalog. Existing course/enrollment/institute and personal-event assertions retained; passes. |
| Leaderboard mock lacks transaction/lock interface | Models the existing transaction and catalog/item lookup interfaces; adds exact transaction-count/no-write-transaction-on-denial assertions. Existing reward and authorization assertions retained; passes. |
| Risk mock expects obsolete three independent reads | Tests actual paginated enrollment/count concurrency followed by scoped course/activity/student ID reads, page bounds, response and student denial. No query/authorization weakening; passes. |
| `Tasks` versus current `Tasks & Calendar` | Exact expected label updated to the current product label; list remains exact and title corrected to eleven destinations. Product text/routing unchanged; passes. |
| Lab authoring / roster activation-email root alias failures | Both pass with the explicit web alias loader/configuration in the permitted scope. No application or email assertion changed. Generic root discovery remains the wrong entrypoint. |
| Runtime-schema-permission manifest prerequisite | Not rerun. Historical isolated control passed, but the generic clean checkout lacks its retained reviewed PostgreSQL manifest. A future **unblocked, explicitly scoped** fixture must supply it; do not report a new pass. |
| Financial CRUD against intentionally unreachable URL | Not rerun. Requires a separately owned synthetic database/IBE fixture; previous isolated baseline control passed. No production URL or real records substituted. |
| Protected signer integration without provisioned service | Not rerun. It requires an independently protected signer/runtime; engineering provider/runner validation remains blocked. No signer service, approval or identity was fabricated. |
| Standalone forms, attendance and gradebook migration-receipt errors | Preserved. Forms/attendance are blocked; no retry or schema reset. This sprint makes no new standalone integration claim. |

## Modified and added files

The roadmap/register existed from planning and are now updated. Earlier audit/remediation files are unchanged.

| Files | Change |
|---|---|
| [apps/web/package.json](../../apps/web/package.json), [apps/desktop/package.json](../../apps/desktop/package.json) | Compatible Next/Electron minimums. |
| [pnpm-workspace.yaml](../../pnpm-workspace.yaml), [pnpm-lock.yaml](../../pnpm-lock.yaml) | Version-scoped compatible security pins and resolved graph. |
| [export route](../../apps/web/src/app/api/admin/database/export/route.ts) | Metadata-only awaited export event. |
| [export audit tests](../../tests/security/admin-database-export-audit.test.cjs) | Three permanent audit-contract cases. |
| [dependency compatibility tests](../../tests/sprint-1/dependency-compatibility.test.cjs), [allowed tests](../../tests/sprint-1/allowed-tests.json), [test README](../../tests/sprint-1/README.md) | Four ordinary API smoke cases and explicit permitted scope. |
| [calendar fixture](../../tests/calendar/dashboard-calendar-data.test.cjs), [leaderboard fixture](../../tests/leaderboard/activity.test.cjs), [risk/navigation fixture](../../tests/navigation/data.test.cjs), [navigation labels](../../apps/web/src/lib/ite/focus/__tests__/route-context.test.ts) | Baseline mock/expectation repair, no academic/product rule changes. |
| [MFA runbook](admin-mfa-production-rollout.md), [operator checklist](production-operator-checklist.md), [backup/DR strategy](backup-disaster-recovery.md) | Operator preparation only; none executed on production. |
| [Dependency report](sprint-1-dependencies.md), [advisory evidence](sprint-1-dependency-results.json), [verification evidence](sprint-1-verification.json), this results report | Dated Sprint 1 evidence and unresolved risks. |
| [SECURITY-ROADMAP.md](../../SECURITY-ROADMAP.md), [ASVS register](asvs-5.0-level2-register.csv) | Current progress/evidence links; no unsupported ASVS pass. |

## Remaining risks and personal production actions

Remaining 6 production-graph and 31 all-dependency matches include a critical desktop build-chain tar advisory, shipped-Electron risks and mobile routing/tooling issues. Native signed artifacts, real provider isolation, tenant/database effective permissions, ingress and production configuration remain unverified. Run2 candidates, eight blocked units and deferred work remain intact. The historical over-maximum grade still needs authorized institutional triage, not an automatic grade correction.

The owner/operator must personally approve and perform production actions:

1. Review the local diff and commit the intended candidate; install/generate from the new lockfile for local use. Identify the actual deployment/database environment and review current CI/build/native compatibility evidence. No push/deployment was performed here.
2. Approve and execute the MFA migration/grants/key setup, secure key recovery custody, and real administrator enrollment using their own devices. Adopt and exercise a lost-device process; keep rollback MFA-enforcing.
3. Complete the operator checklist, including actual permissions/TLS/secret custody/provider configuration and safe metadata-only logging/monitoring receipts.
4. Approve RPO/RTO/retention/destination/costs, create real encrypted infrastructure backups under controlled custody, and obtain a successful isolated restore receipt. Admin summaries/exports are not sufficient.
5. Authorize any actual production promotion/cutover and historical-data incident/correction actions separately; do not redeploy an old vulnerable/password-only candidate as a shortcut.

## Decisions and Sprint 2 recommendations

Approval is needed before the coherent **Electron >=42.11.16 / builder >=26.15.0** upgrade and native packaging/signing validation, any supported Expo/router/toolchain major or Zod 3→4 consumer migration, and any paid backup/scanning/execution service. Proposed backup objectives and retention need institutional adoption; no service was purchased or policy changed. Existing broader MFA/password/cookie/RLS decisions in the central roadmap remain pending.

Sprint 2 should prioritize those remaining high/critical dependency paths and packaged-client compatibility, a reviewed GitHub Actions job that selects only the permitted unblocked scope, dependency-update/secret-scanning ownership, and operator-led staging/MFA/recovery evidence. Then address unblocked API/authorization/ingress gaps under their original coverage IDs. **Do not restart previously blocked units, rename their hypotheses, run broad discovery or promote source candidates as a shortcut to full coverage.**
