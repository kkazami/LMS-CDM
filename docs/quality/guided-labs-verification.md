# Guided practical labs: local verification

Date: 25 October 2026 (Asia/Singapore). Baseline:
`1a231cd0a10cb3c2bf733c04de17c01058ee300c`.
Feature branch: `codex/ics-guided-practical-labs`.

## 26 October: main localhost database upgrade

The user requested the feature in the main checkout and authorized upgrading its
configured database. The original runtime account had no schema CREATE or table
ownership. A separately supplied owner connection was verified against that same
endpoint/database and used only for migration, without replacing runtime secrets.

A private full backup was restored into an isolated localhost PostgreSQL cluster.
The exact targeted migration runner passed against that restored copy before it
applied the single additive migration to the configured database. Its checksum
and completed Prisma receipt committed with the schema change. Existing academic
record counts were preserved and historical provenance remains UNKNOWN. Runtime
verification confirmed ten lab tables, the original failing Prisma Classwork
query, template queries, existing authorization qualification and no schema CREATE.

Fresh checks passed: 9 schema tests, 11 transport/readiness tests, 23 PostgreSQL
integration checks (including legacy-schema compatibility and migration replay),
24 academic/private-file/security regressions, web TypeScript, production build,
and the complete real-cookie browser pilot using synthetic localhost accounts.
An independent source/security review found no blocking issues. The private
backup and upgrade receipt remain under ignored `tmp/labs/private-upgrade-*`.

The app now handles an entirely legacy database without losing ordinary
Classwork; partial upgrades fail closed. A shared form helper was split so
browser components never import database readiness code. No missing-schema
result is cached for academic/file authorization.

Actual antivirus service/signature verification and staging remain open. The
checked localhost environment has no scanner connection configured, so evidence
uploads fail closed. This database upgrade is not a production release claim.

## 26 October: authoring UX and student sign-in repair

Replaced lab browser prompts with accessible LMS dialogs and added per-instructor
first-use guidance, replay, persistent progress, highlighted next actions,
field-level repair links and start-before-due scheduling. Saved drafts lead to
publication; publication selects the new version for assignment. Busy controls
prevent lost edits, and successful assignment creation blocks repeat writes while
the destination opens. Linked scheduling validates the persisted due date; started
attempts still allow legitimate due-date extensions.

Fresh owned browser evidence:
`tmp/roster-import/labs-browser-1792991719086/report.json` — complete pilot PASS,
including tutorial persistence/replay, Tab/Escape/focus restoration, cancel,
invalid drafts, held save requests, invalid date ranges without API writes,
deadline extension after an attempt starts, missing student steps, corrections,
two-round history, gradebook/student grades, and zero native browser dialogs.
Six desktop/390px screenshots were visually reviewed without clipping findings.

Other fresh checks: 16 schema/authoring tests, 15 transport/readiness/auth tests,
24 PostgreSQL lab integration checks, 36 academic/resource/session/TLS/security
regressions. Independent source review identified and verified repairs for busy
draft controls and unchanged-start schedule updates.

The reported student login failure was a captured P2028 during session creation.
An explicit bounded transaction budget and retryable busy response preserve live
locked credential/admission checks. A single locked admission query removes a
round trip, enrollment overlaps session creation, and web requests use the
existing dashboard reward path instead of waiting for an immediate receipt.
Default API/mobile reward receipts remain intact. Five auth/security tests and
18 disposable PostgreSQL authentication checks passed, including real account
lock contention. The user confirmed that login succeeds after the timeout fix.
No live password was used by automated tests.

Post-optimization live login timing was not measured. Current read-only diagnostics
found warm SQL queries at 138–495 ms and warm public app health at 167–204 ms;
those snapshots do not explain earlier 22–40 second authenticated requests.
`Server-Timing` now distinguishes sign-in stages for a fresh authenticated retry.
The stream endpoint also received a missing course-access check, covered by direct
foreign-course/unenrolled/instructor/administrator negative tests.

## Implemented candidate

The Stage 1 ICS web pilot connects instructor authoring/publication to course
Classwork, persisted student progress, scanned private evidence, immutable
submission rounds, corrections/reopening, instructor grading and the existing
gradebook. The assignment category remains independent of the lab task format.

Schema additions include item/submission provenance, exact-version relations,
restricted history deletion, immutable published instructions and submitted
history, monotonic provenance triggers, and grants for the existing restricted
runtime principal. Generic academic writers use syllabus row locks and reject
lab-linked mutations. Existing-classwork linking fails closed on unknown history.

## Executed verification

| Check | Result |
| --- | --- |
| Prisma validation and generation | Passed |
| Whole-web TypeScript | Passed |
| `pnpm build:web` | Passed on frozen pilot source |
| `pnpm test:labs` | 13 unit/transport tests passed |
| `node tests/labs/integration.mjs` | 22 checks passed with real owned PostgreSQL |
| `node tests/labs/browser.mjs` | One complete real-cookie Chromium workflow passed |
| Existing web unit test files | 330 tests passed, using an offline placeholder database URL and no dotenv file |
| `node tests/web-quality/test.mjs` | 128 regression tests passed |
| `pnpm harness:test` | 69 safety tests passed |
| `pnpm harness:typecheck` | Passed |
| Standard `git diff --check` | Passed |

The browser used a production build, real login/session cookies, synthetic users,
an owned HTTPS application and an owned loopback PostgreSQL database. It proved
authoring, publication, assignment, save/reload, evidence upload, submission,
correction, replacement/resubmission, instructor grading, student Grades and
gradebook rendering. It also tested delayed reviewer-response isolation, updated
pending-work counts and the 390px layout.

The integration suite covers fresh baseline-plus-migration replay, existing-data
upgrade preservation, restricted runtime grants without schema CREATE, institute
and object authorization, unknown/untouched/started provenance, concurrent
linking/submission, revision conflicts, immutable snapshots and evidence,
lost-response receipt replay, notification rollback/deduplication, correction
expiry/reopening, paginated queues and discovery across Classwork/Todo/calendar.
Lab assets cannot be repurposed through ordinary uploads or read through the
generic asset owner shortcut after enrollment revocation.

## Evidence locations

Verification ran in the preserved checkout under the main repository:

- `.orchestra/local-worktrees/ics-guided-practical-labs/tmp/labs/integration-1792942522563/report.json`
- `.orchestra/local-worktrees/ics-guided-practical-labs/tmp/roster-import/labs-browser-1792942639327/report.json`
- That browser directory contains `pilot-review.png`, `pilot-gradebook.png`,
  `pilot-student-grade.png` and `pilot-narrow-lab.png`.
- `tmp/labs/existing-unit.log`, `tmp/web-quality/product-tests.xml` and
  `tmp/labs/build-final.log` in that checkout retain the corresponding results.

The reviewed source/tests/docs were copied by an explicit bounded manifest into
the app-attached checkout. Every delivered file was checked by SHA-256. The
verification copy was preserved; the original main workspace and its unrelated
changes were not modified. Local evidence directories remain ignored by Git.

## Resolved failures and review findings

Earlier sandbox runs could not create temporary Git repositories or reliably
reach loopback fixtures. The actual safety/regression suites subsequently passed
with the permissions needed for their isolated fixtures. The existing non-lab
private-asset mock was extended to represent the new lab relation; checks were not
weakened.

Browser test adaptations accounted for the existing sign-in policy-consent box,
wrapped-select accessible names and repeated grade titles. Source review found
and resolved missing historical-evidence links, stale reviewer-selection races,
silent review-queue truncation and unsaved editor replacement. Visual inspection
also found a stale pending-work badge; refreshing shared server state after lab
decisions resolved it and the final browser test asserts that behavior.

## Release blockers and limits

This is a verified local candidate, not production release evidence.

- Scanner tests use a bounded wire-protocol fixture, not an antivirus engine.
- Presence-only inspection found no configured scanner host/port in the checked
  local settings. No credential values were printed. Production settings were
  not inspected.
- Real scanner signature/detection verification and staging upload/download and
  full-workflow checks remain required.
- The selected database used by localhost was upgraded on 26 October as described
  above. No application deployment, purchase, external execution service or actual
  external MySQL execution was performed.
- No controller `RELEASE_READY` or `COMPLETE` status is claimed from unit tests or
  static checks.
- Stage 2 sharing/duplication/knowledge checks and Stage 3 additional example
  templates remain gated on the pilot release requirements.

See `docs/institute-features/ics-guided-practical-labs.md` for rollout, migration,
demonstration and compatible rollback instructions, and
`docs/quality/guided-labs-writers.md` for the academic writer inventory.
