# Sprint 3 — local implementation and evidence

Updated 21 October 2026 (Asia/Singapore). **Local work completed; the deployment/capacity release gate remains open.** The main LMS was explicitly limited by the user to non-destructive functional checks. No deployment, production load/import/restore or native mobile implementation was performed.

Full assessment: [six-characteristic quality report](../docs/quality/web-lms-2026-10/report.md). Operator handoff: [staging/load/recovery/deployment procedure](../docs/quality/sprint-3-operations.md).

## What changed

- Added guarded `load.mjs`, `load-report.mjs`, `restore-check.mjs`, synthetic staging scenario contracts, source/evidence helpers and safety regressions under `tests/web-quality/`.
- Added a real 400-student CSV import/resume/replay test, five course offerings, four 500-row enrollment batches and a logical backup/restore into a separate empty owned database. Compared row hashes/counts for 84 public/security tables, including representative academic records and private file bytes.
- Added production HTTPS load diagnostics on distinct synthetic sessions and 99,800 historical grades, with app CPU/RSS/pool sampling. Compared two/eight connections on the same build/database; no production pool increase was made.
- Remote database connections now require certificate/hostname verification, including missing `sslmode` and misleading localhost text. Optional `DATABASE_POOL_MAX` accepts only 1..20 connections per process; production stays at two unless an operator sets a provider-budgeted override.
- Patched web and root Prisma-toolchain dependency advisories. Added real DOCX/PDF extraction and offline email smoke tests. Added product regression/build/advisory/container-scan CI. CI files are prepared, not a claimed passing Actions run.
- Added recovery/incident/rollback instructions and excluded disposable quality artifacts/synthetic session fixtures from Git.

## Executed results

| Check | Result |
|---|---|
| Product Node regressions | **88 passed**, no failures/skips; actual JUnit under `tmp/web-quality/product-tests.xml` |
| Web and shared API-client typechecks | **PASS** |
| Academic/security PostgreSQL scenarios | **17 passed**; `tmp/web-quality/integration-1792516830885/report.json` |
| Actual import/restore scenario groups | **4 passed**; `tmp/web-quality/sprint3-1792505045350/report.json` |
| Production build and browser matrix | **PASS; 24 checks** on Chrome, Firefox, Windows WebKit and 390px Chrome; `tmp/roster-import/sprint2-1792516549920/report.json` |
| Harness safety/typecheck | **69 passed** and typecheck; safety checks do not constitute independent product release approval |
| Recorded web/root production advisory scan | **Zero findings** after patches; mobile-only findings remain outside this remediation |
| Main LMS functional reads | Student dashboard/grades, instructor dashboard/gradebook and admin dashboard/account management rendered; signed out afterward |

Final product fingerprint: `f74ae53e25377ffa349fb420402284d90ebdd6547367166abfcb5a177da14a8e`. It matches the completed import/restore and final production/browser run. Owned servers/clusters report stopped. An interrupted earlier comparison has no completed result and was excluded.

The actual student import took **7.29 seconds**, and all 2,000 enrollments took **26.80 seconds** across four batches on local PostgreSQL 17.11. Roster/import/audit/index database growth was approximately **4.56 MiB**. The logical backup was 499,328 bytes; the restore command took approximately **1.60 seconds**, with all 84 table comparisons matching. These are local measurements; full RTO/RPO and provider backups remain unverified.

## Capacity finding

The final short read-heavy diagnostic **passed through 400 active HTTP users with the default two-connection pool** (p95 1.41 s, approximately 165 requests/s). At 1,000 users, all 4,072 requests succeeded but p95 reached **5.63 s** and p99 **7.30 s**, failing the proposed 2 s/5 s limits. No academic data loss was observed in the post-load count/grade-sum checks.

Eight connections did not demonstrate improvement: its 400-user course-list p95 exceeded 2 seconds, so that profile stopped and did not run 1,000. The default remains two. The report includes every passing/failing row and resource measurements; a previous 250-user failure followed by a later pass also demonstrates workstation variability. No threshold was lowered, and no failed/missed load is counted as passing.

These are **20-second closed-loop HTTP runs with pre-provisioned sessions**, not 30–60 minute sustained load, concurrent browser rendering, a campus-NAT login burst or production capacity. The database, injector and app share a workstation with unknown competing activity. More connections are not a proven capacity fix. Provider limits and a controlled sustained workload are necessary before production tuning.

## Remaining Sprint 3 release gates

- An isolated production-like staging environment with resource/pooler limits and synthetic per-user identities; long target/spike/recovery and deadline/upload/CodeLab scenarios.
- Verified real scanner/signatures, hosting body/storage limits, Judge0 queues, provider TLS/grants/network/encryption/backup controls, numerical RTO/RPO and a provider recovery drill.
- Representative student/instructor/admin task feedback and an adopted study scoring rubric. No final ISO score/certification was fabricated.
- Candidate deployment approval and actual post-deploy verification. The observed main-site CSP still permits inline/eval scripts; local candidate security changes are not claimed as deployed. Legacy public files and campus-login burst behavior remain documented concerns.

These are open gates within Sprint 3, not an additional sprint. Mobile source/behavior was not evaluated or implemented. Existing unrelated workspace changes remain preserved and uncommitted.
