# Guided lab academic writer inventory

This inventory describes the Stage 1 write boundary. It is not a release or migration-verification claim.

## Lock and provenance protocol

`apps/web/src/lib/academic-task.ts` provides the shared boundary:

- `lockSyllabusItem` uses a parameterized PostgreSQL `SELECT ... FOR UPDATE` on the actual syllabus row. A missing row returns 404.
- `assertOrdinaryClasswork` acquires that lock, rereads the current lab relation, and rejects lab-linked generic writes with 409.
- `markAcademicWorkStarted` changes the item and an optional existing student projection to `STARTED`. New projection creation must also explicitly set `STARTED`.

For operations needing all of them, acquire receipt locks first, then syllabus rows sorted by ID, student/item academic locks, attempt locks, and reward locks. An operation resolving an item from another object must reread the linkage after locking. The existing CodeLab completion lock remains after its linked syllabus/student locks. Single-item writers below do not acquire a batch of syllabus rows.

Historical/default provenance is `UNKNOWN`. Only instrumented new classwork and empty student placeholder creation use `UNTOUCHED`. Meaningful changes never reset provenance. Grade clearing retains the record, including unknown historical records; it cannot erase the fact that work started.

## Generic academic writers

| Writer | Boundary |
| --- | --- |
| `lib/academic-records.ts`: saveSubmission | Receipt lock, ordinary-item check/row lock, academic lock, then STARTED item and projection in the submission transaction. |
| `lib/academic-records.ts`: gradeSubmission / gradeStudent | Ordinary-item check before academic/reward locks; mark the item and projection STARTED. Lab grading uses its own service instead. |
| `app/(dashboard)/[institute]/courses/[courseId]/classwork/[itemId]/actions.ts`: getOrCreateSubmission | Ordinary-item check and row lock before academic lock. Only newly created empty projections are UNTOUCHED. |
| Same file: attachments, removal, unsubmission | Shared mutable transaction locks and rejects labs, then marks STARTED before modification. submitWork delegates to saveSubmission; returnGrade/updateGrade delegate to gradeSubmission. |
| `app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions.ts`: clearGrade | Ordinary-item check, academic lock, STARTED provenance, and retained submission. Other grade actions delegate to guarded academic services. |
| `app/(dashboard)/[institute]/courses/[courseId]/classwork/actions.ts`: create | New item is UNTOUCHED. Creation, targets, and attachments are in one transaction, preventing a partially created item from being linked. |
| Same file: update/delete | Ordinary-item check and all related writes occur inside one item-locked transaction. |
| `app/api/courses/[courseId]/classwork/route.ts`: POST | New item explicitly UNTOUCHED; item and attachments already share a transaction. |
| `app/api/analytics/supplementary-import/route.ts` | Resolve/create the import item, lock/reject labs, mark item STARTED, then write STARTED projections in the same transaction. |
| `app/api/leaderboard/manage/route.ts` | Ordinary-item lock/check and settings/rewards update share a transaction. |

## Existing assessment/task writers

| Writer | Boundary |
| --- | --- |
| `lib/forms/gradebook-sync.ts` | Backing-item ordinary check and score/provenance/attempt-sync writes share a transaction. The existing Forms notification policy remains unchanged. |
| `app/api/courses/[courseId]/forms/route.ts`: create | Creates its new backing item and Form atomically; backing item starts UNTOUCHED. A Form relation excludes lab linking regardless of provenance. |
| `app/api/courses/[courseId]/forms/[formId]/route.ts`: update/delete | Locks/checks the backing item before synchronizing or deleting it. |
| Form `publish/route.ts` | Locks/checks backing item before publishing and updating points. |
| Form `attempts/route.ts`, attempt `answers/route.ts`, and attempt `submit/route.ts` | Backing-item lock/check and STARTED marker precede the existing form-attempt lock and writes. |
| Form question, section, close and metadata-only attempt routes | They require an existing Form relation. Lab linking rejects that relation, so these cannot become alternate writers for a lab. They do not create or update academic projections. |
| `lib/codelab-completion.ts` | Resolve backing item, ordinary-item and academic locks before the completion lock; reread linkage, mark STARTED, and project STARTED grade records. Static tracks without a backing syllabus item have no academic item to link. |
| `lib/codelab-moderation.ts` | Ordinary-item check before academic lock; reread linkage and mark STARTED before modifying activity/projection records. |
| `app/api/activities/submit/route.ts` | Ordinary-item check and linkage reread before activity/session/projection writes in one transaction. Gamification follows commit. |
| Activity instructor `templates/[templateId]/page.tsx` | Creation of backing item/template is atomic. Existing updates verify teaching authority and course, then lock/check backing item before editing template/title. |

## Lab-only writes and parent resources

Lab services deliberately call `lockSyllabusItem`, not the ordinary-task assertion. Their authorization, receipt deduplication, version/snapshot rules, review/projection/notification transactions, evidence rules and deadlines are tested separately.

`LabAssignment` uses restrictive academic relations. Parent course/syllabus deletion must not cascade away lab history. Archived course/assignment reads and writes are governed by the lab service; the existing generic course archive UI is not a lab writer.

## Verification obligations

Repeat the repository-wide search for Prisma writes to `SyllabusItem`, `StudentSubmission`, and `SubmissionAttachment` before review. Exercise direct generic APIs/actions against lab-linked IDs, concurrent linking/submission, edited-and-cleared drafts, grade clearing, receipt retries, and persisted provenance. A syntax check or inventory alone does not establish these behaviors.
