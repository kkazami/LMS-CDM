# Security regression remediation — 15 November 2026

The six leads were reproduced against `ef23ea19b587768633857ae4d9a3e4b115b470a5` before remediation. The original tests remain in `tests/security/audit-regressions.test.cjs`. The owner subsequently changed the form-score rule: a completed score belongs to its student and is visible to the authorized instructor, including when a historical form has `showScoreAfter=false`. Regression 6 now asserts that explicit policy across serializers rather than preserving the superseded hidden-score behavior.

## Plan and completion

| Requested order | Status | Invariant enforced | Permanent coverage |
|---|---|---|---|
| 1. Database restore | Implemented and verified | Institute administrators may update only authorized existing rows and explicitly writable fields; a mixed unauthorized batch commits nothing. | Original regression 3; `admin-database-cases.cjs` positive restore, foreign target, rollback, credential/role/ownership/nested-field denial, no creation or snapshot restore. |
| 2. Database export | Implemented and verified | Every selectable model, row query and count is institute-scoped; authentication secrets and secret-bearing models are unavailable. | Original regression 4; `admin-database-cases.cjs` table inspection, overview, summary counts, forbidden models and student denials. |
| 3. Activity outcomes | Implemented and verified | Non-CodeLab submissions contain answers only. The server recomputes score/pass and normalizes gradebook points to the linked coursework maximum. | Original regression 1; valid-answer route integration; seven `activity-grading.test.ts` cases. |
| 4. Activity course authority | Implemented and verified | A persisted template must pass `requireCourseAccess`; its locked course and coursework linkage are checked again before saving academic records. | Original regression 2; denied foreign/unenrolled templates; CodeLab linked-course and course-specific persistence checks. |
| 5. CodeLab fixtures | Implemented and verified | Course authority is checked before assessment execution or fixture disclosure, including evaluation and completion siblings. | Original regression 5; `codelab-authorization-cases.cjs`; `tests/codelab/completion.test.cjs`. |
| 6. Score serialization | Implemented and verified under owner policy | Students see their own completed scores; authorized instructors see their course scores. Peers and unrelated courses/instructors retain no access. | Original regression 6; `score-visibility-cases.cjs` API/CSV positives and authorization negatives; updated existing forms integration expectation. |
| Code execution decision | Implemented; hosted isolation remains provider-dependent | Production selectors allow OnlineCompiler or authenticated Judge0, reject JDoodle/unknown providers, and never fall back to host execution. Arduino preview executes typed bounded instructions rather than arbitrary JavaScript. | `tests/codelab/runner.test.cjs`; six `arduino-preview.test.ts` cases. |
| Final checks/report | Verification recorded below | Preserve failing-before evidence, execute disposable fixtures and existing checks, and state remaining failures accurately. | `tests/security/audit-regression-results.md` and ignored run artifacts. |

## Database restore and export

`apps/web/src/lib/admin-database.ts` centralizes model allowlists, institute predicates, secret-field exclusion and restore validation. Restore revalidates the administrator inside its transaction and uses institute-filtered updates rather than an unrestricted delegate or upsert. User targets must be another ordinary student/instructor. Audit logging shares the transaction.

Restore deliberately supports existing `User` profile fields (`name`, `bio`, `phone`, `department`, `yearLevel`), `Course` descriptive fields (`title`, `description`, `subject`, `room`), and `SyllabusItem` title/description. Credentials, roles, ownership, nested writes and arbitrary model creation require their dedicated APIs. The request limit is 1 MiB and 500 records. This retains institute database access without making the import endpoint an account-provisioning or privilege-assignment API.

Export and inspection use the same predicates and secret filtering. Counts and snapshot summaries are scoped too. Backup entries remain metadata summaries, not recoverable database backups: unknown download IDs cannot fall back to another summary, and `snapshotId` is not accepted as a restore operation. UI labels/import validation now describe these actual capabilities.

Files touched:

- `apps/web/src/lib/admin-database.ts` (new).
- `apps/web/src/app/api/admin/database/restore/route.ts`.
- `apps/web/src/app/api/admin/database/export/route.ts`.
- `apps/web/src/app/api/admin/database/tables/[tableName]/route.ts`.
- `apps/web/src/app/api/admin/database/overview/route.ts`.
- `apps/web/src/app/api/admin/database/backup/route.ts`.
- `apps/web/src/app/(dashboard)/[institute]/admin/database/client.tsx`.

## Activity outcomes and course access

The route rejects student outcome claims, reads the trusted template, authorizes its course and locks/reloads its linkage before writing. PC placement, rack connectivity/IP configuration, combinational logic and introductory Arduino circuit answers are graded server-side. Rewards consume the computed outcome. A percentage score of 100 on a ten-point coursework item writes grade 10, not 100.

Grading is bounded and rejects unsupported configurations rather than trusting a browser result. Logic supports bounded acyclic combinational circuits and a trusted template truth table. Arduino accepts a small documented-in-code sketch subset: integer/byte constants and `pinMode`, `digitalWrite`, `delay` in `setup`/`loop`; general C++ is not supported. Unsupported sequential logic or sketches return a validation error and receive no grade.

The same Arduino parser now drives browser preview. Removing `AsyncFunction` also closes the browser path by which student text could previously name application globals or network APIs. Playback dispatches typed instructions, yields cooperatively and cancels stale runs on stop, restart, navigation or assignment/principal change. Circuit/logic helpers recompute state rather than accepting live signal claims.

Files touched:

- `apps/web/src/app/api/activities/submit/route.ts`.
- `apps/web/src/features/interactive-activities/shared/grade-activity.ts` (new).
- `apps/web/src/features/interactive-activities/shared/schemas.ts`, `types.ts`, `hooks/useActivitySubmission.ts`, `components/SubmitBar.tsx`.
- `apps/web/src/features/interactive-activities/pc-build/components/PCBuilderUI.tsx`.
- `apps/web/src/features/interactive-activities/server-rack/components/TerminalUI.tsx`.
- `apps/web/src/features/interactive-activities/logic-gate/components/TruthTableUI.tsx`, `utils/logic-solver.ts`.
- `apps/web/src/features/interactive-activities/arduino/components/ArduinoUI.tsx`, `utils/circuit-solver.ts`, `utils/interpreter.ts`, `utils/sketch-program.ts` (new).
- Template pages under `apps/web/src/app/(dashboard)/[institute]/activities/`: `arduino/[templateId]/[seed]/page.tsx`, `logic-gate/[templateId]/[seed]/page.tsx`, `pc-build/[templateId]/[seed]/page.tsx`, `server-rack/[templateId]/[seed]/page.tsx`, `codelab/[slug]/[sub]/page.tsx`; the ungraded `sandbox/page.tsx` supplies an empty answer callback.

## CodeLab authority and provider policy

`run-tests` and `evaluate` authorize a persisted template's course before provider work. Completion verifies the authenticated student, current course and same-course coursework linkage. Built-in problem definitions are an existing public practice library; course-owned private assessment fixtures are not shared. Saved built-in attempts now resolve an approved/taught active course, pass `requireCourseAccess`, and use a course-specific template ID. Legacy public-problem progress/reward lookup still recognizes existing IDs without creating new cross-course records.

Production permits OnlineCompiler's fixed HTTPS API and authenticated reviewed Judge0 configurations. JDoodle is development-only because its adapter cannot enforce network-off per request; unknown selectors fail closed. Judge0 sends `enable_network:false`. OnlineCompiler's API rejects that parameter, so its allowed adapter relies on the provider's published no-network sandbox contract. Provider HTTP credentials are not inserted into student source/stdin, and student JSON cannot set environment variables, execution destinations, credentials or sandbox settings. No hosted sandbox or malicious remote execution was tested, and these changes do not certify a provider or configure production secrets. See `managed-code-execution.md` for primary-source contracts and operational limits.

Files touched:

- `apps/web/src/app/api/codelab/run-tests/route.ts` and `evaluate/route.ts`.
- `apps/web/src/lib/codelab-completion.ts`.
- `apps/web/src/features/interactive-activities/codelab/utils/judge0-config.ts`.
- The CodeLab template page listed above.
- `tests/codelab/completion.test.cjs`, `tests/codelab/runner.test.cjs` (portable TypeScript loading and new boundary/contract cases).
- `docs/quality/managed-code-execution.md`.

## Form score visibility

Score visibility now follows the owner decision consistently for submission responses, attempt history/detail, grades and SSR readers, including historical `showScoreAfter=false` forms. New/settings writes advertise scores as visible and the obsolete hide-score UI toggle has been removed. Gradebook synchronization marks the score returned, and grade lists include numerically scored completed forms whose status is `SUBMITTED`. Answer keys and separately hidden correctness/feedback remain restricted. Password hashes are not serialized.

Sibling route tests cover student course/global grades, classwork, own submissions, attempt history/detail; instructor submissions, response list/detail/CSV, gradebook JSON/CSV, manual response-grading results and submission-grading results. They also deny student access to instructor endpoints, unenrolled-course reads, same-course peer attempt selection and foreign instructor reads/writes. SSR readers were reviewed and included in the web typecheck, which remains red for the unrelated diagnostics below; no passing browser journey is claimed.

Files touched:

- `apps/web/src/app/api/courses/[courseId]/forms/route.ts` and `forms/[formId]/route.ts`.
- `apps/web/src/app/api/courses/[courseId]/forms/[formId]/attempts/route.ts`, `attempts/[attemptId]/route.ts`, `attempts/[attemptId]/submit/route.ts`.
- `apps/web/src/app/api/courses/[courseId]/grades/route.ts`, `apps/web/src/app/api/grades/route.ts`.
- `apps/web/src/app/(dashboard)/[institute]/grades/page.tsx`.
- `apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/(learning)/classwork/[itemId]/page.tsx` and `classwork/forms/[formId]/respond/page.tsx`.
- `apps/web/src/lib/forms/settings.ts`, `availability.ts`, `gradebook-sync.ts`.
- `apps/web/src/components/forms/builder/FormSettingsPanel.tsx`.
- `tests/forms/assessment.integration.mjs` (owner-policy expectation updated; its original standalone integration runner remains blocked in the Linux sandbox).

The existing classwork, submissions, responses and gradebook serializers already exposed authorized scores; they receive permanent sibling tests rather than redundant code changes.

## Verification

Final targeted fixture: `tmp/security-regressions/audit-cbac44bd7fd740a69fc250854c0eda04/`. Full-check fixture: `tmp/security-regressions/audit-9876e0a8149f43678ec1491f1c060f5e/`. All 1,243 web source files matched both fixture snapshots after the final targeted run; subsequent changes were regression coverage and documentation only.

The final targeted run passed **22 tests, zero failures and zero skips**: six original lead regressions, sibling integration cases, raw-answer point normalization, seven grader tests and six Arduino preview tests. The score helper recorded 27 sibling observations, including 14 positive serializer responses and authorization/peer-isolation controls. Per-lead exact results are recorded in `tests/security/audit-regression-results.md` and the run's `results.json`.

The full existing check inventory completed with aggregate exit code 1. These are recorded attempts, not a green full suite:

| Check | Final result |
|---|---|
| Root Node tests, 82 discovered files | 474 tests: 351 passed, 122 failed, one skipped. This includes the portable CodeLab contract/completion tests and the new preview tests. |
| Web library unit tests, 18 files | 322 tests: 321 passed, one failed. The unchanged ITE navigation test expects `Tasks` while the implementation produces `Tasks & Calendar`. |
| Web typecheck | Exit 2: generated Prisma client lacks `practicumLessonPlanFile` in the unchanged practicum lesson-plan routes; installed CodeMirror modules/types are missing, including the resulting implicit-any editor callback. No diagnostics pointed into modified application files. |
| Mobile / desktop / harness typechecks | Each exited 0. |
| Root Playwright plus nine additional Playwright configs | Each attempted and exited 1 on setup/tooling prerequisites; no passing browser journey is claimed. |
| Fourteen standalone integration/browser modules | Attempted; twelve exited 1 on prerequisites. Two browser helper modules exited 0 without independently proving a browser journey. |
| Diff whitespace | `git diff --check` passed. |

The broad tests use the installed Windows dependency tree in an offline Linux sandbox. Failures include unavailable Linux esbuild/LightningCSS/Prisma binaries, missing `pnpm`, TypeScript ESM-loader limitations, missing isolated harness signer configuration and standalone runners that require a reviewed Windows PostgreSQL runtime or repository metadata. The root suite also records an unchanged-area mobile error-message assertion; module identity through duplicate workspace mount paths limits what this custom loader can establish about that failure. These results should not be presented as 122 newly established application defects or as successful integration coverage. No dependencies or browsers were downloaded to conceal these limits.

The complete output and machine-readable stage exits are in the full fixture's `full-checks-output.txt` and `full-check-summary.json`. The separate targeted test output contains the real PostgreSQL authorization/scoring evidence. Both fixture snapshots have identical final application source, and no fixture containers remained after cleanup.

Execution uses cached images, external networking disabled, an empty allowlisted environment, read-only source/dependencies and bounded disposable scratch space. PostgreSQL starts empty with the current schema, synthetic identities and the real application-writer boundary installed. No production data, dotenv files, real credentials, external provider requests, production migrations or deployments were used.

The launcher and loaders are permanent support files: `tests/security/run-audit-regressions.ps1`, `audit-loader.cjs`, `typescript-register.cjs`, `full-checks.cjs`, `stage-full-checks.py`. The original audit report and its before-fix evidence remain unchanged. Production row policies, proxy/headers, shipped mobile/Electron artifacts and dependency operations were not established by these local route tests.
