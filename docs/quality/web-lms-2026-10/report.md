# CdM LMS web quality evidence — October 2026

Prepared 21 October 2026 (Asia/Singapore). Scope: web, its Next.js backend and PostgreSQL. Native mobile work is excluded. This is an engineering assessment of the six characteristics selected for the study, not an ISO certification or a respondent survey.

## Decision

The local fixes and regression evidence support further staging evaluation. **Deployment readiness and sustained 1,000-user capacity remain NOT VERIFIED.** The user identified `https://lms-cdm.vercel.app/` as the main LMS and authorized only non-destructive functional checks there. No production load, import, submission, grading, upload, invitation, backup restore or deployment was performed.

No final quality grade out of 100 is assigned. A defensible study grade needs an adopted scoring rubric, representative task/user results and operating-environment evidence. A passing-test percentage is not a software-quality grade. The earlier provisional source-review estimate must not be presented as a measured ISO result.

The standard supplies a quality model for specifying and evaluating product properties; it does not make this project's proposed latency/recovery thresholds an ISO pass mark. Reference: [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html).

## Candidate and method

- Product source SHA-256: `f74ae53e25377ffa349fb420402284d90ebdd6547367166abfcb5a177da14a8e`. The fingerprint covers web source/public assets except legacy uploads, web package/Next configuration, shared API client source, Prisma schema and lockfile. It describes the uncommitted candidate; a Git commit alone does not identify it.
- Owned test environment: Windows x64, Node 25.8.0, PostgreSQL 17.11, Ryzen 5 5600X / 12 logical CPUs / approximately 16 GiB RAM. App, database and HTTP injector share the workstation; this is not the unknown Vercel/database hosting plan.
- Dedicated local fixtures create random loopback databases and synthetic accounts. No live dotenv/database credentials are loaded. The actual restricted application principal and installed database guards are exercised. Session provisioning for load uses that qualified principal. Logs/results are under ignored `tmp/web-quality/` and `tmp/roster-import/sprint2-*`.
- The main site's deployed build is not attested to this local fingerprint. Main-site observations and local candidate results are separate evidence.
- Project proposals: ordinary APIs p95 ≤2 s, p99 ≤5 s and failure rate <1%; exact tested academic data; declared separate heavy-operation budgets. These were not lowered to make a failed load pass. Numerical RTO/RPO have not been adopted.

## Six selected characteristics

| Characteristic | Executed evidence | Assessment and remaining gate |
|---|---|---|
| Functional suitability | Real student/instructor/admin local browser journeys; submission/retry/grading/return; protected roster imports and exact 400-student/2,000-enrollment assertions. Main-site student grades, instructor gradebook and admin account views rendered. | **PASS for the named tested tasks. NOT VERIFIED for complete feature coverage.** Real-provider flows and untested features remain outside this result. |
| Compatibility | Chromium, Firefox and Windows WebKit workflows; narrow web viewport; cookie/API/server-action paths, production CSP/Monaco compatibility. Existing shared gradebook API contract retained. | **PASS for the executed web matrix. NOT VERIFIED for every browser/device or external provider.** Windows WebKit is not a physical Safari/macOS test. |
| Interaction capability | Named controls, keyboard focus containment/return, search, grading and error states exercised across that matrix. Main-site role navigation checked without editing records. | **PASS for tested interaction/accessibility behaviors. NOT VERIFIED for the study's human evaluation.** No student/instructor/admin respondent ratings or satisfaction scores were invented. |
| Reliability | Actual PostgreSQL concurrency, idempotency, rollback, revocation and password-change scenarios; separate logical restore with matching hashes for 84 tables, including academic records and private file bytes. | **PASS for those local scenarios. NOT VERIFIED for managed backups/PITR, full outage recovery or long-running availability.** Restore time alone is not RTO. |
| Security | Session/role/institute/resource denials, mutation-origin checks, idle/absolute expiry, upload validation/fail-closed scanner protocol, private-file access, sanitizer/CSP and vault rotation regressions. Web/root production advisory scan reports zero findings after patches. | **PASS for named candidate checks. NOT VERIFIED for deployment-wide security.** Main CSP still permits inline/eval scripts; provider controls, real scanning and legacy public-file migration remain pending. Mobile-only advisories are excluded from the web remediation, not resolved. |
| Performance efficiency | Actual import and storage measurements, bounded gradebook comparison and short mixed HTTP load diagnostics. Pool pressure is sampled in the owned app process. | **PASS through 400 users with the default pool in the final short local read workload; FAIL at 1,000 against proposed latency limits.** Production capacity, sustained resource behavior and heavy-operation capacity remain NOT VERIFIED. |

## Actual 400-student import and space/time results

The test imports CSV through `previewImport`/`commitImport` using real Prisma queries and guards; it does not substitute 400 direct SQL inserts. It stops after the first 50 students, reloads persisted batch state, resumes, repeats completed confirmation and checks exact identities, activation/password state and one active program membership per student. Five courses and 2,000 approved enrollments are imported separately in four 500-row batches. Each student has exactly five relationships. The 501-row cap and invalid email case create no unintended identities. No invitations are sent.

| Operation | Observed result |
|---|---|
| 400 student identities | 7.290 s including preview/commit/replay measurement; nine commit/resume calls; 5,312 Prisma query events |
| Five course offerings | 0.132 s; exact instructor/program/term mapping |
| 2,000 enrollments | Four 500-row batches: 7.680, 6.393, 6.224 and 6.505 s; total 26.803 s |
| Database growth for roster/import/audit/index work | 4,784,128 bytes (approximately 4.56 MiB); database 12,785,331 →17,569,459 bytes |
| Memory/CPU | Import-process before/after RSS and CPU counters retained per batch; this process includes the test compiler/client and is not app-server RAM per user |

Evidence: [actual import/restore report](../../../tmp/web-quality/sprint3-1792505045350/report.json). These are local service measurements, not HTTP response percentiles or a hosting guarantee. Database growth includes import/audit/index records. Large file storage was not represented by this small roster-size measurement.

## Local load and query/payload results

The HTTP dataset has 998 synthetic students, one professor, one administrator, 100 activities and 99,800 returned grades, separate from the 400-student gradebook fixture. All requested clients have distinct opaque sessions; no three-account recycling is used. The test uses a production HTTPS build, two-second ramp, two-second think time and a 20-second total interval per workload. The mix cycles course lists, classwork and notification reads, with professor gradebook and administrator term reads. Sessions are pre-provisioned; login bursts, browser rendering, real scanning and CodeLab are separate workloads.

An earlier completed diagnostic using the production default of two connections passed 50 and 100 users. At 250 it served 2,020/2,020 requests successfully at approximately 100.8 requests/s, but p95 was 2.350 s and p99 2.461 s: **FAIL** against the 2 s p95 proposal. The sampled pool reached 387 waiting requests; app RSS peaked near 680 MiB. This identified pool pressure as a concrete bottleneck candidate, not proof that a Vercel deployment has the same limit.

`DATABASE_POOL_MAX` now accepts an explicit per-process integer from 1 to 20. Production still defaults to two; development defaults to 15. The owned comparison restarts the same candidate/build/database with two then eight connections, after checking the disposable database has sufficient connection headroom. Any production setting must budget all app instances, workers and operator connections against the actual provider/pooler limit. Eight is not a production recommendation. Warm-cache/profile-order effects and the shared workstation limit causal/general capacity conclusions.

The completed final-candidate comparison follows. Each row is a separate 20-second run; results must pass both aggregate and individual endpoint budgets. Every issued request in these rows succeeded, with no timeout, policy 429 or response assertion failure. Latency failures are still failures.

| Pool connections/process | Active HTTP users | Requests/s | p95 (ms) | p99 (ms) | Result |
|---|---:|---:|---:|---:|---|
| 2 (production default) | 50 | 24.8 | 24.6 | 81.9 | PASS |
| 2 | 100 | 49.7 | 44.2 | 72.3 | PASS |
| 2 | 250 | 121.6 | 250.6 | 311.4 | PASS |
| 2 | 400 | 165.2 | 1,412.4 | 1,437.4 | PASS |
| 2 | 1,000 | 199.9 | 5,626.5 | 7,301.4 | **FAIL** |
| 8 (owned experiment only) | 50 | 24.7 | 78.6 | 119.1 | PASS |
| 8 | 100 | 49.6 | 123.9 | 191.6 | PASS |
| 8 | 250 | 121.2 | 307.3 | 362.5 | PASS |
| 8 | 400 | 148.9 | 1,872.8 | 2,216.5 | **FAIL:** course-list endpoint p95 2,188.1 ms |

The eight-connection profile stopped at its first failed workload, so 1,000 users with eight connections were **not run**. Eight connections did not demonstrate an improvement; the production default remains two. The earlier 250-user failure and this repetition's pass also show why a workstation diagnostic cannot supply a sustained capacity guarantee.

At 400/default-pool users, app RSS peaked at approximately 785 MiB and sampled DB-pool waiting count at 278. At 1,000, peak RSS was approximately 975 MiB, waiting count 1,639 and app CPU consumption 21.594 CPU-seconds across the sampled interval. These are app-process/queue observations; DB CPU and injector CPU were not captured, and they do not isolate a complete bottleneck. The eight-connection 400-user run peaked near 662 MiB with 327 waiting. The 20-second intervals cannot establish a memory leak, long-term stability or spare provider headroom.

The final post-load assertion retained all 99,800 returned submissions and their expected grade sum. This read workload does not prove deadline-write/upload/CodeLab integrity under load. Evidence: [raw production/browser/comparison report](../../../tmp/roster-import/sprint2-1792516549920/report.json), [per-run latency/resource summary](../../../tmp/web-quality/final-load-summary.json), [raw process samples](../../../tmp/roster-import/sprint2-1792516549920/server-metrics.jsonl). The wrapper's overall PASS records functional/fixture completion; individual load-run results above determine latency outcomes. Failed child load commands returned nonzero. The earlier interrupted run produced no completed result and is excluded.

The gradebook service separately demonstrates retained totals and whole-roster coverage using eight 50-student pages for 400 students ×100 activities. The final-candidate first-page payload is 734,083 bytes versus 7,464,706 bytes for the old whole-roster shape (approximately 90% smaller). Three service/serialization samples have median 82.7 ms versus 769.5 ms, with six versus five query events. This timing is not a browser or HTTP load percentile; samples are retained in the production-fixture report.

## Complexity and storage limits

These are source-derived properties, separate from the measured timings:

- A gradebook page constructs O(P×A) grade cells, where P is bounded to 50 students and A to 200 activities. Oversized histories return an explicit limit error; the full CSV/export path has its own cost. The shared SDK currently combines pages to preserve its whole-roster contract, so client-side memory can still grow with the full roster.
- Import work performs repeated guarded row transactions and lookups. The CSV batch is capped at 500 rows and confirmation processes at most 50 rows/approximately 20 seconds per call. Array classification/lookups can grow faster than linearly with batch/context size; many database round trips also make geographic DB latency material. Safe resumability does not imply every host imports 400 students within the local time.
- File inspection/storage uses memory proportional to accepted file size, capped at 25 MiB plus multipart overhead, with two active uploads per warm process. Additional copies/driver overhead can exceed the file-byte total. The 250 MiB owner quota is not a global database/storage budget; hundreds of owners can consume roughly 100 GiB including future growth. Private bytes in PostgreSQL affect backups and recovery time.
- Per-process app pools and four CodeLab admissions do not supply a distributed/global quota. Instance count, background polling, provider connection limits and external queue capacity determine deployment behavior. Raising connections without those limits can make reliability worse.

## Recovery evidence

A real `pg_dump` custom-format backup restored with `pg_restore` into a separate, empty owned database. Source remained frozen while all public/security table counts and canonical-row hashes were compared. The fixture includes the imported roster, one returned submission/grade, an attachment and private binary asset. Matching data was observed for all 84 tables.

Observed backup: 340.7 ms, 499,328 bytes. Observed restore command: 1,596.9 ms. Backup age at comparison: 2.446 s; no source writes were made in that interval. These do not establish a worst-case RPO or end-to-end RTO. Owner/grant restoration, managed backup availability, external files, detection, app cutover and post-cutover task recovery require a provider drill.

Evidence: [restore comparison](../../../tmp/web-quality/sprint3-1792505045350/restore-comparison.json). The standalone comparator is read-only, verifies the actual separate database and ownership marker, requires verified remote TLS and uses bounded query timeouts/cursors. It never restores over a live database.

## Main LMS observations

With the user-supplied accounts, student dashboard/grades, instructor dashboard/course gradebook and administrator dashboard/account-management views rendered. The initial student login used an incorrect supplied password; it passed after the user corrected it. No password is retained in these reports. The sessions were signed out and the temporary tab closed. Normal login/session/automatic activity side effects can occur; no academic edits, imports, uploads or messages were initiated.

A public HTTPS GET returned 200 with certificate verification enabled, HSTS, `nosniff`, `DENY` framing and a referrer policy. The **deployed CSP still contains `unsafe-inline` and `unsafe-eval`**. This differs from the local production nonce policy, so the candidate's security changes cannot be claimed as deployed. The public helpdesk address remains an unconfigured placeholder. Provider DB TLS/grants/network/encryption/backups and deployed dependency versions were not inferred from these page observations.

Evidence: [sanitized functional observations](../../../tmp/web-quality/main-lms-functional.json), [public response headers](../../../tmp/web-quality/main-lms-public-headers.json).

## Verification and release gates

| Check | Result |
|---|---|
| Final Node product suite | **PASS —88 tests**, no failures/skips; includes synthetic DOCX/PDF extraction and offline mail-library smoke checks; [JUnit](../../../tmp/web-quality/product-tests.xml) |
| Web TypeScript check | **PASS**, `pnpm --filter web exec tsc --noEmit --incremental false` |
| Academic/security PostgreSQL scenarios | **PASS —17 scenarios**; [receipt](../../../tmp/web-quality/integration-1792516830885/report.json). This runner injects synthetic HTTP session identity; resource guards, SQL and transactions are real. Browser tests independently exercise actual login/cookies |
| Actual import/restore fixture | **PASS —4 scenario groups**, cluster stopped; linked above |
| Harness safety regressions/typecheck | **PASS —69 tests** and typecheck; these are not independent product release approval |
| Web/root production dependency advisories | **PASS —zero findings** in the recorded scan; [assessment](../../../tmp/web-quality/sprint3-dependency-assessment.json) |
| Final production build/browser matrix | **PASS —24 browser checks**, production build and source fingerprint match; server and cluster stopped. Chrome, Firefox, Windows WebKit and 390px Chrome all executed |
| Short local pool comparison | **Completed —7 passing workload rows, 2 latency failures**, no HTTP/data-assertion failures. Highest passing final default-pool workload: 400 active HTTP users for 20 seconds; sustained/production target remains NOT VERIFIED |
| GitHub Actions/container scans | **NOT VERIFIED**: workflow added; no Actions success claimed. Local Docker Linux engine unavailable |
| Production deployment, managed restore and sustained/heavy load | **NOT VERIFIED** |

Patches include Next.js 16.3.8, Nodemailer 10.0.9, AdmZip 0.6.1, Sharp 0.35.5, PostCSS 8.5.23 and parent-scoped document/storage/Prisma toolchain dependency fixes. The advisory scan still contains mobile-only findings; native mobile remediation is owned by the other developer. Package advisories are exposure candidates, not evidence that every listed CVE was exploitable in this app. Maintainer references: [Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), [Nodemailer advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-v53p-9fqp-m79j).

Prepared tooling: guarded load/report/restore runners, mixed/deadline/upload/CodeLab configuration contracts, product regression/advisory/image-scan CI, source/evidence fingerprints and [operator deployment/rollback/incident procedure](../sprint-3-operations.md). No workflow success, controlled harness release, human approval, push or deployment is implied by those files.

The [machine-readable evidence index](../../../tmp/web-quality/sprint3-summary.json) checks matching source fingerprints, actual JUnit/Playwright counts, raw artifact hashes and owned-service cleanup flags. It records the release gate as NOT VERIFIED; it does not turn the latency failures into passes or supply independent release approval.

Remaining dependencies to close Sprint 3's release gate: isolated production-like staging and per-user synthetic identities; actual Vercel/database/storage/scanner/Judge0 limits; 30–60 minute target/spike/recovery and write/heavy scenarios; verified provider controls/restore and adopted RTO/RPO; representative human task feedback; final candidate deployment and post-deploy checks. Legacy public uploads/data URLs need an explicit binding/scan/migration plan. The campus-NAT login limit and hosting body limits need real-environment calibration. Keep the three sprint boundaries; these are outstanding gates within Sprint 3.
