# CdM LMS — provisional review of six ISO/IEC 25010:2023 characteristics
Date: 20 October 2026. Scope: current shared workspace, including uncommitted changes.

## Verdict and scoring limits

**Provisional reviewer assessment: 62/100.** This describes the implementation and verification readiness visible during this review. It is not an ISO-issued grade, measured performance result, survey result, academic experimental finding, certification, or probability of success.

ISO/IEC 25010 supplies a product quality model to help define and evaluate requirements. Acceptance thresholds and this 100-point scoring scheme are project choices. Only the six requested characteristics were assessed, not every characteristic of the standard.

The six category judgments are equally weighted, in five-point increments. Each reflects implemented functionality/controls, confirmed correctness gaps, relevant test coverage and execution, and remaining operational measurement needs. The equal-weight mean is (70 + 65 + 70 + 55 + 50 + 60) / 6 = 61.67, rounded to 62. These are subjective engineering estimates; another evaluator can reasonably differ. Unknown production behavior is recorded as unverified, not as a demonstrated failure.

Suggested interpretation for this review only: 90–100 strong measured readiness; 75–89 generally strong with limited gaps; 60–74 useful implementation with substantial gaps; 40–59 major risks or verification gaps; below 40 severe incompleteness. This is not an ISO or school grading scale. Do not reuse these numbers as respondent evaluation data in a thesis.

| Characteristic | Review score | Current evidence and limits |
|---|---:|---|
| Functional suitability | 70/100 | Real course, enrollment, submission, grading and import flows. Mobile aggregate grades still consume a placeholder API; submission retry/partial-write risks remain. No full requirements acceptance matrix was executed. |
| Compatibility | 65/100 | Shared cookie/bearer backend and mobile/desktop clients; Chrome-focused default verification, incomplete grades API contract and differing mobile server configuration. No full device/interoperability matrix executed. |
| Interaction capability | 70/100 | Role-aware navigation, loading states, labeled controls and keyboard handling in selected components. Global search has accessibility gaps. No representative user task study, assistive-technology session, or comprehensive live UI audit. |
| Reliability | 55/100 | Transactions, locks and resumable imports in newer flows. Some academic writes are not atomic; product backup restore and uptime/recovery targets unverified. |
| Security | 50/100 | bcrypt, opaque database sessions, revocation, rate limits, server guards, security headers and audit infrastructure. Confirmed resource-access, public diagnostics, upload and fallback-secret gaps remain. |
| Performance efficiency | 60/100 | Indexed data, pagination, pool/client reuse, query-count optimization and incremental imports. Heavy full-matrix gradebook reads and buffered uploads; no representative 1,000-user load result. This is a readiness score, not a measured speed score. |

The prior security inventory's 12 present, 42 partial, 9 not found, 24 unverified and 2 inapplicable items are not a percentage score. Items overlap and vary greatly in severity.

## What was actually checked now

- Web typecheck: `pnpm --filter web exec tsc --noEmit --incremental false` — passed, exit 0.
- Focused tests: `node --import tsx --test tests/roster/rules.test.ts tests/program-head/meeting-links.test.ts tests/navigation/active-path.test.ts tests/calendar/student-calendar.test.ts` — **27 passed, 0 failed, 0 skipped**.
- These check CSV/activation/password rules, calendar/date/validation logic, meeting links and navigation. Some are source-structure assertions. They do not prove complete user journeys, live PostgreSQL concurrency or production load capacity.
- Source review of critical APIs, gradebook, imports, database/session setup, navigation, mobile contract and existing performance-test design.
- No production endpoints, live DB, production hosting configuration or secret-bearing environment files were needed. No product source was modified.
- Not run: full E2E suite, browser/device matrix, user evaluation, dependency advisory scan, full production build, live authorization probes, 400-row DB import, 1,000-user load/stress/soak tests or backup restore.

## Does it pass or fail?

It does not make sense to declare an entire product an “ISO 25010 failure” without specified requirements, workloads, measurements and acceptance criteria.

For a supervised demonstration, there is substantial working implementation and the focused checks passed. For a release gate requiring secure student records, consistent academic writes and demonstrated 1,000-active-user capacity, **I would not sign off today**. Some source patterns conflict with secure/correct behavior; capacity, availability and recovery remain untested.

Do not confuse:
- **Passed**: a specific executed check met its criterion.
- **Confirmed code gap**: an inspected implementation has a missing/incorrect control; no live exploit/load failure is claimed.
- **Unverified**: no relevant measured result was established. This is not the same as failing a test.

## 400 people and 1,000 users

| Scenario | Assessment |
|---|---|
| Store 400 user accounts | No reviewed source establishes a storage limit near 400. Ordinary account rows should be a modest dataset, but deployment limits and accumulated attachments/history still matter. This is an engineering expectation, not an executed storage test. |
| Import 400 students | Within the explicit maximum of 500 rows and 2 MB CSV. Validity, identities, schema and program setup still must satisfy import rules. It processes incrementally: at most 50 rows per request, with an elapsed-time loop check around 20 seconds. At least eight processing requests are needed, potentially more plus a completion check. No import duration was measured. |
| Enroll 400 students into five courses | This produces 2,000 enrollment relationships. The automatic matching preview limits output to 500 pairs, so that particular batch must be divided. It does not establish a 500-enrollment database limit. |
| 1,000 sessions existing in the DB | Different from active concurrency. Dormant sessions do not generate the same workload as 1,000 open browser tabs. |
| 1,000 dashboards open and visible | Polling and study heartbeats create background requests. With one student tab each, arithmetic gives roughly 1,000/30 + 1,000/60 = 50 requests/second before clicks, saves or uploads. Timers can produce bursts and browsers can throttle them; this is not measured throughput. |
| 1,000 people actively using the LMS | **Unverified.** Slowdown is a credible risk, especially for expensive endpoints; exact latency/maximum capacity cannot be predicted from account count. |
| 1,000 simultaneous submissions or CodeLab executions | Must be separate tests. Database writes, attachments, reward logic and Judge0 worker capacity differ from browsing. A browsing test cannot certify them. |

The pool maximum of 2 is per application process/pool, not a global two-user maximum. A long-lived process queues work after its available connections are busy; many serverless instances can instead multiply total connections. Hosting topology, database/pooler limits, query duration and workload determine the result.

## Space, time, capacity and complexity

For performance efficiency, assess time/throughput, resource use and capacity. Algorithmic time/space complexity helps explain potential growth, but is not a substitute for measurements. In the 2023 model, the scalability subcharacteristic is under flexibility; concurrent-user capacity remains relevant to the selected performance-efficiency characteristic.

| Aspect | What to measure | Source-based example |
|---|---|---|
| Time | p50/p95/p99 latency, page interaction/loading time, import duration, submissions per second | Existing performance suite has seven sequential warm samples. It does not measure loaded production latency. |
| Space/resources | Peak RAM, CPU, DB tables/indexes, attachment storage, network bytes, connection use | Upload buffers and base64 fallbacks grow with file size and simultaneous uploads. |
| Capacity | Largest data/workload/concurrency meeting agreed response and correctness targets | 500-row import batch limit exists; maximum active-user capacity is not established. |
| Algorithmic complexity | Work/memory growth with students, assignments, submissions and files | Gradebook builds every student × assignment cell. |

Gradebook definitions: S = enrolled students, A = assignments, R = returned submissions; attachment payload is additional. Application matrix construction/filling takes **O(S × A + R)** time, and the matrix itself takes **O(S × A)** space/output. This excludes DB execution complexity and attachment bytes.

For 400 students × 100 assignments, the handler constructs **40,000 cell objects per request**. That is arithmetic from the nested loop, not a timing result or a claim that it crashes.

For K concurrent buffered uploads of B bytes each, raw buffers alone scale as **O(K × B)**, with parser/copy/string overhead additional. Base64 expands binary content to about 4/3 before JSON overhead. The per-file limit does not bound total concurrent memory.

## Strongest evidence

| Finding / strength | Evidence |
|---|---|
| 500-row CSV bound | [CSV parser](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/roster/csv.ts:87>) |
| Incremental import, transactions and resumability | [Import commit loop](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/roster/imports.ts:416>); [Client continuation](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/components/admin/ImportWizard.tsx:101>) |
| Automatic enrollment output cap | [Enrollment matching](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/roster/imports.ts:625>) |
| Full student × assignment matrix | [Gradebook loop](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/courses/[courseId]/gradebook/route.ts:126>) |
| Pool settings and reuse | [Database pool](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/db.ts:39>) |
| Notification polling | [Notification refresh](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/components/layout/NotificationBell.tsx:100>) |
| Student heartbeat | [Study timer](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/components/common/FloatingStudyTimer.tsx:34>) |
| Existing performance tests are small warm fixtures | [Performance checks](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/tests/program-head/performance-checks.mjs:20>); [Measurement limitations](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/docs/performance-2026-10.md:34>) |
| General grades API is placeholder, consumed by active mobile grades tab | [Grades API](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/grades/route.ts:17>); [Mobile grades](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/mobile/app/(student)/student/(tabs)/grades.tsx:31>) |
| Web grades page has real data logic | [Web grades page](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/(dashboard)/[institute]/grades/page.tsx:40>) |
| Submission record and attachments written separately | [Submission handler](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/courses/[courseId]/submissions/route.ts:137>) |
| Activity restore can report success after gradebook write fails | [Instructor restore](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/codelab/instructor/reject/route.ts:94>) |
| Newer CodeLab completion uses transaction and advisory lock | [CodeLab completion](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/codelab-completion.ts:28>) |
| Good focus management in mobile navigation sheet | [Mobile sheet](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/components/layout/MobileMoreSheet.tsx:85>) |
| Global search lacks complete dialog/input labeling and focus containment/restoration | [Search modal](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/components/layout/SearchModal.tsx:405>) |
| Default E2E config is Chrome based; mobile project targets a filename pattern with no matching files in default test directory | [Playwright projects](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/playwright.config.ts:64>) |
| Backup page is descriptive only | [Backup page](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/(dashboard)/[institute]/backup/page.tsx:2>) |
| Security evidence and checklist | [Security inventory](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/plans/security-checklist-status-2026-10-20.md>) |

## How to get a defensible measured grade

1. Define supported tasks, roles, institutes, devices and integrations. Trace each to acceptance tests; functional completeness cannot be scored against an unstated feature list.
2. For interaction capability, evaluate representative students, instructors and administrators on actual tasks. Record completion, time, mistakes, need for assistance and feedback; perform keyboard/screen-reader/zoom checks. Keep respondent scores separate from technical performance results.
3. Fix and verify known resource-authorization, fallback-secret, upload and academic-write consistency gaps. A high average cannot compensate for a failed essential privacy/data-integrity requirement.
4. Use an isolated production-like staging deployment with synthetic users/data and a production build, known resource quotas and no production student data.
5. Test 400-row import: exact expected results, no unintended identity changes, retry/resume, correct tenant/program/enrollments, elapsed time and DB/resource measurements.
6. Ramp a realistic mixed workload through 50, 100, 250, 400 and 1,000 active users; include polling, study heartbeat, navigation, submissions, teacher gradebook and expected think time. Preauthenticate most users; test login surges separately with representative distinct accounts and shared-campus network conditions. Distinguish expected policy 429s from unexpected failures.
7. Sustain the target for 30–60 minutes and test spikes, interrupted submissions and service recovery. Test CodeLab, deadline submission bursts and large-file traffic separately and together with normal use.
8. Suggested starting acceptance targets, **not ISO-mandated**: ordinary interactive API p95 ≤2 seconds, p99 ≤5 seconds; unexpected request failures <1%; zero lost/duplicate/corrupt academic submissions; bounded queues/connections and no unexplained continuing memory growth. Set workload-specific limits for imports, uploads and CodeLab before testing.
9. Measure p50/p95/p99, request/transaction throughput, timeout/429/5xx counts, query latency, DB connections/pool wait, CPU/RAM/network, external-worker queue and final data integrity. Record exact build, environment, dataset and scripts.
10. Verify a real backup restoration to an isolated target and compare restored academic data to the agreed recovery point. Establish and measure recovery-time/recovery-point targets.
11. Re-score using the agreed instrument and collected evidence. For a thesis, report actual evaluator responses and technical measurements; identify this report only as an expert source review.

## Standards sources

- [ISO/IEC 25010:2023 official product-quality-model description](https://www.iso.org/standard/78176.html).
- [GSO official adoption preview, including performance efficiency and capacity definitions](https://gso-sims-preview-doc-aws.s3-eu-west-1.amazonaws.com/gso-iso-iec-25010-2025-en.html).

Scope exclusions: exhaustive all-route audit, full UI usability study, all mobile/Electron behaviors, real infrastructure hardening, production uptime, load capacity, live security testing and certification. No existing historical harness score is treated as a current LMS product pass.
