# ICS guided practical labs

Guided practical labs are a web-only Classwork task format for ICS. They use the
existing course, approved enrollment, targeting, sessions, private uploads and
gradebook. Students perform commands in their own instructor-approved environment;
the LMS never executes their commands or connects to their databases.

## First release and demonstration

The first delivery is the MySQL pilot. It supports instructions, display-only
commands, checklists, short answers and evidence. Knowledge checks, template
sharing/duplication, additional examples, configurable retakes, structured rubrics,
native clients and proctored exams remain behind the pilot release gate.

1. An ICS instructor opens a course's **Classwork → Guided practical labs**.
2. Choose **Start with MySQL**, inspect/edit the instructions, save changes, and
   close the editor. Choose **Publish** to freeze the instruction version.
3. Choose the published instructions, Classwork title/category, maximum points,
   deadline and optional target groups. Choose **Assign practical lab**.
4. Inspect the draft assignment and choose **Publish classwork**. Drafts and
   assignments whose availability date is in the future are hidden from students.
5. An approved, targeted ICS student opens the ordinary Classwork card, follows
   the steps locally, and saves an explanation and screenshot. Refresh restores
   saved responses and the last saved step.
6. The student submits. The instructor opens the lab's review queue, selects the
   student's work, and returns a correction request with feedback.
7. The student replaces the evidence, resubmits, and receives an instructor grade.
   The current grade appears in the existing course gradebook and student Grades.
   Both submitted rounds and their evidence remain available in history.

The category is independent of the task format: Activity, Quiz, Midterm Exam,
Final Exam and other non-Material categories retain their existing grading weights.
An exam category does not enable proctoring, computer lockdown or outside-help
prevention. MySQL must already be installed; do not submit database credentials.

## Existing Classwork and provenance

The flask action on an ordinary ICS Classwork item opens the linking flow. Linking
requires item-level `UNTOUCHED` provenance, any placeholders also `UNTOUCHED`, no
contradictory work/history, and no Form, interactive activity or existing lab.

Historical/default items and submissions have `UNKNOWN` provenance. New ordinary
Classwork and empty placeholders explicitly use `UNTOUCHED`. Meaningful mutations
permanently mark the item and submission `STARTED`, including attachment removal,
unsubmission and grade clearing. Database triggers prevent provenance from being
reset. Grade clearing retains meaningful submission records.

Historical empty work is intentionally not inferred safe from timestamps, status,
null grades or missing attachments. If history cannot be established, create new
Classwork. Never relabel, delete or recreate old records to make linking succeed.

## Academic ownership and concurrency

Lab templates have immutable published versions. An assignment binds one exact
version to one syllabus item. Attempts, responses, snapshots, evidence and reviews
belong to the lab workflow; `StudentSubmission` is an academic projection:

| Lab status | Academic projection |
| --- | --- |
| IN_PROGRESS | DRAFT, no grade |
| SUBMITTED | SUBMITTED, no grade |
| NEEDS_REVISION | DRAFT, no grade |
| GRADED | RETURNED, returned flag set, awarded grade |

There is one numbered attempt per student/assignment. Corrections are submission
rounds within it. Snapshots, their evidence bindings and reviews are immutable;
replacing evidence never removes an earlier submitted file.

Submission/review/reopening requests require stable idempotency keys. Namespaced
receipts reuse `SubmissionRequest`, hash the validated request and targets, and
commit with the academic mutation. A matching retry returns the saved result,
including when the original response was lost. Different payloads using the same
key return 409. Replays revalidate the caller's current access.

Acquire receipt locks first, then sorted syllabus row locks (`FOR UPDATE`), sorted
student/item locks, attempt locks and reward locks as needed. The complete generic
writer inventory is in `docs/quality/guided-labs-writers.md`. Generic academic
writes reject lab-linked items rather than bypassing required steps and history.

Review decisions, grade projection and database notifications commit together.
Deterministic notification primary keys deduplicate each event/recipient. There
is no external delivery in this release. Future delivery needs an outbox record
in that transaction and a retryable after-commit worker.

## Corrections, archival and access

Correction requests default to seven days after review and may specify another
future deadline. That deadline overrides the original due date during revision.
At expiry, responses/evidence/history remain readable but saves, uploads and
resubmission stop. An authorized instructor can reopen the correction window with
a future deadline and a reason. Reopening appends a review and notification.

Archiving blocks new work and writes while preserving authorized submitted-history
reads. Unarchive before reopening corrections. New attempts are blocked for
archived courses. Course/syllabus deletion cannot cascade away referenced labs.

Authorization checks the current user, actual ICS membership, canonical role,
course authority or approved enrollment, targeting and object ownership. IBE, ITE
and dedicated privileged roles do not acquire access through a URL or permission
string. Both generic and lab-specific private-file routes apply lab authorization.
Lab-bound assets cannot be attached as ordinary submissions, Form answers, avatars
or course content; upload a separate file rather than creating an alternate access
path to lab evidence.

## Uploads and deployment prerequisites

Evidence uses the existing PostgreSQL `PrivateAsset` bytes, content verification
and mandatory scanner. Files are private; client URLs are not access grants.

- One file per multipart request; maximum file 3 MiB.
- Complete body maximum 3 MiB + 64 KiB, measured from actual streamed bytes.
- PNG, JPEG, WebP, PDF or validated UTF-8 text; at most three active files per step.
- Existing 250 MiB owner storage allowance includes retained earlier evidence.
- Missing/unavailable scanning fails closed. No storage/scanner bypass exists.

The upload concurrency slot covers multipart parsing through persistence. Scanning
runs outside the database transaction; authorization, revision, writability and
file-count limits are checked again when the clean bytes are attached.

Verify the actual hosting request/response limits and scanner reachability with a
3 MiB file and multipart overhead. A local protocol fixture is not antivirus proof.
Database-backed files require appropriate capacity, backup and restore procedures.

## Instructor guidance

The ICS authoring page shows a four-step path: write and save instructions,
publish instructions, assign to the class, then publish Classwork. A tutorial opens
on the instructor's first visit in that browser and can be replayed with **How to
create a lab**. Its seen preference is scoped to the instructor, not shared across
accounts. The next control has an orange focus ring and the guide can scroll to it.

Saving closes the editor and leads to instruction publication. Publishing selects
that version automatically in the assignment form. **Start date** precedes **Due
date**; invalid ranges show a modal and return focus to the date field. A linked
item retains its existing due date, which the server checks under the item lock.
Existing-attempt schedules permit deadline extensions without resending an
unchanged start date. Forms freeze during writes, and assignment creation remains
locked until navigation so repeated clicks cannot create duplicate drafts.

Confirmations and validation use portal-mounted LMS dialogs with focus trapping,
Escape/cancel, scroll locking and focus return. Errors remain beside the affected
form as well. Missing draft fields and required student steps can be opened from
the error dialog. Native browser confirm/alert/prompt calls are not used.

## Migration and rollout

The additive migration is
`prisma/migrations/20261025140000_guided_practical_labs/migration.sql`.
It adds the provenance enum/columns, lab tables, indexes, restrictive/composite
relations, immutability/provenance triggers, and grants for the existing qualified
`lms_web_runtime_v1` principal when present. It does not reset data or backfill
historical work as untouched.

1. Identify the exact staging database, migration baseline and runtime principal.
   Preserve existing baseline-history/security prerequisites; do not blindly replay
   the historical migration chain against an existing deployment.
2. Take and verify a backup; rehearse the additive upgrade against a restored copy.
3. Apply the reviewed migration with the owner/migrator, never the runtime role.
   Verify the real runtime table privileges without granting schema CREATE or
   placing owner credentials in the application.
   For an existing installation, `scripts/upgrade-guided-practical-labs.mjs --apply`
   uses the process-only `LAB_MIGRATION_DATABASE_URL` connection and checks that it
   targets the configured runtime database. It applies only this migration and
   records its checksum in `_prisma_migrations` in the same transaction. It refuses
   partial schema, conflicting receipts and unfinished migrations. Do not place the
   owner URL in the web application's runtime environment.
4. Run `pnpm prisma generate` and deploy matching application code after schema
   readiness. Preserve the ordinary-write guards together with the lab routes.
5. Verify real scanner behavior/signatures, uploads/downloads, negative API access,
   and the complete instructor/student/correction/gradebook workflow on staging.

Before migration, ordinary Classwork remains available and the ICS lab entry
explains the required upgrade. Partial schemas fail closed. Schema absence is
never cached for academic or file authorization. Ordinary work created before
the upgrade retains `UNKNOWN` provenance after migration and cannot be linked to
a lab by guessing its history. Create new Classwork for the pilot instead.

Rollback must preserve schema/history and the academic lab guards. Do not deploy
older generic academic writers against active lab records: they do not understand
the projection ownership. Disable lab mutation routes and new entry points at the
deployment boundary while retaining authorized GET/history routes, then deploy a
reviewed compatible repair. Do not drop lab tables or student work as rollback.

## Verification commands and truthful release status

Run from the feature checkout:

```powershell
pnpm prisma validate
pnpm prisma generate
pnpm --filter web exec tsc --noEmit
pnpm test:labs
pnpm test:labs:integration
pnpm harness:test
pnpm harness:typecheck
pnpm build:web
```

`test:labs:integration` requires `LAB_TEST_PG_RUNTIME_ROOT` pointing to the explicitly
selected, hash-verified retained PostgreSQL test distribution described in
`tests/labs/postgres-fixture.mjs`. It creates only a new owned loopback
`harness_labs_*` database. It never loads live dotenv credentials.

After building, `node tests/labs/browser.mjs` uses that same fixture prerequisite
to run real cookie login and the complete browser pilot against an owned HTTPS
app, synthetic users and a scanner protocol fixture. Reports/screenshots stay in
ignored `tmp/` directories. `LAB_E2E_BUILD=1` requests its optional rebuild.

Local static checks, unit/integration tests and a successful browser pilot do not
establish deployment readiness. The release gate still requires reviewed final
source, migration recovery evidence, actual antivirus verification and staging
workflow/upload checks. No production migration or deployment is performed by
these test commands. Do not expand Stage 2/3 until the pilot release gate is met.
