# Capstone prompt review — Calendar and Organizational Chart

Reviewed 2026-10-16. Advisory only; this is not an implementation instruction or a harness artifact.

## Scope and evidence

The review subject is the complete pasted six-part prompt (Owner decision, Phases 0–4, Operational boundaries), supplemented by the owner's clarification in this chat. Related repository instructions, selected feature source, tests, migration configuration, and the October 16 candidate checkpoint were inspected. Other historical prompts and every historical receipt were not exhaustively audited.

Primary checkout: `C:/Users/kirby/Desktop/lms-monorepo-skeleton`, HEAD `2588732`.

Candidate checkout, called **C** below: `C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/local-worktrees/super-user-v1`, branch `codex/super-user-v1`, HEAD `aac054b`. These are different checkouts. The primary checkout's worktree list does not enumerate the candidate because its Git common directory belongs to the nested controlled-task repository.

No application source was changed, no tests/builds/migrations were executed, and the harness controller was not run. Static findings below do not assert newly reproduced runtime failures. Historical passing counts are historical evidence only. Two read-only review subtasks were used under the improve skill, without Orchestra.

## Owner clarification supersedes the pasted role proposal

Program Head is a designation attached to an Instructor, not a replacement global account role. It provides program-scoped Organizational Chart access/management, access from the chart to instructors' classes in that program, and authority to create events/deadlines displayed on instructor calendars.

The owner confirmed that class oversight is read-only and covers class content, roster, submissions, and grades. The original program boundary remains applicable to class access: BSIT and BSCPE access must be checked separately. The designation does not grant grading, classwork edits, enrollment management, or class deletion in another instructor's classes. A Program Head retains their existing instructor permissions in their own classes.

The owner confirmed instructor broadcasts: same-program instructors by default, with an unchecked-by-default checkbox allowing all instructors in the head's own institute to see that event or deadline. The institute-wide checkbox expands the instructor audience only. This is a specific audience expansion; it does not expand chart management or class oversight beyond the assigned program.

The owner subsequently added student audiences: Program Heads can publish events to all students in their assigned program (for example, BSIT), and instructors can publish events to all students enrolled in their own classes. This supersedes the earlier blanket exclusion of students from Program Head events. Program-wide student publishing is distinct from read-only oversight of another instructor's class; it grants no class editing or grading authority. There is no grant to publish to all students across the institute through the instructor-audience checkbox.

The word "Tag" must not imply client-controlled profile text. A persisted, server-authorized designation/assignment can be shown as a tag while still being an access-control grant.

## Overall judgment

The prompt has a sound safety direction: preserve the candidate, enforce authorization on the server, use disposable local infrastructure, test direct operations, and keep deployment separate. It is not yet a deterministic completion contract. It gives an agent too much discretion over product behavior while leaving several verification prerequisites implicit.

The first changes should clarify the program/class/event contracts and exact execution context. Adding more orchestration prose would not resolve those gaps.

## Prioritized findings

All findings have high confidence as prompt deficiencies or observed source patterns. Effort describes clarifying the prompt (S = small, M = moderate); implementation effort is often higher. Risk describes implementing the resulting change.

| # | Finding | Impact | Prompt effort | Implementation risk | Evidence |
|---|---|---|---|---|---|
| 1 | The starting checkout and checkpoint are under-specified | Editing main could omit or overwrite the actual candidate | S | High if wrong checkout | C/.orchestra/product-development/super-user-v1/implementation-checkpoint-20261016.md:4; root plans/README.md:24 |
| 2 | The pasted Program Head global-role proposal is superseded | A new role could break instructor admission, reset, and ordinary class access | S | High | C/apps/web/src/lib/super-user-v1/capabilities.ts:2; C/tests/server/super-user-v1/policy.test.mjs:12 |
| 3 | There is no authoritative Program/assignment model | An agent could derive privilege from department text or chart position | M | High | C/prisma/schema.prisma:29,47,118 |
| 4 | Existing calendar entry points must be in scope | A secure new page could leave the old broad CRUD API exposed | S | High | C/apps/web/src/app/api/workspace/events/route.ts:45,80,109,152; C/apps/web/src/lib/super-user-v1/legacy-entry-guard.ts:12 |
| 5 | New class oversight lacks a resource/action contract | Chart navigation might grant grading, export, private comments, or enrollment powers unintentionally | M | High | Owner clarification; C/apps/web/src/lib/super-user-v1/legacy-entry-guard.ts:43,88 |
| 6 | Calendar aggregation has visibility and source ambiguities | Group-restricted deadlines can leak; source deadlines can be duplicated or incorrectly edited | S | Medium | C/apps/web/src/app/(dashboard)/[institute]/tasks/page.tsx:49,60,79,99; C/apps/web/src/lib/skills/group-permission-resolver.ts:68 |
| 7 | Calendar completeness is undefined | Agents can ship incompatible date, cancellation, audience, and navigation behavior | M | Medium | Pasted Phase 1; C/prisma/schema.prisma:393 |
| 8 | Test commands do not automatically discover new features | Old successful tests could be presented as new-feature verification | S | Medium | C/.orchestra/product-development/super-user-v1/integration-driver.mjs:95,113; C/tests/e2e/super-user-v1/fixtures.ts:11 |
| 9 | Local target identity must precede test/migration commands | Ordinary commands can use ambient database settings or attach to an unrelated server | S | High | C/playwright.config.ts:38,98,99; C/prisma.config.ts:1,11; C/prisma/super-user-v1-successor/prisma.config.ts:2 |
| 10 | Both schema projections and the actual upgrade path matter | A generated client may compile while the intended database upgrade omits new fields | S | High | C/prisma/schema.prisma:393; C/prisma/super-user-v1-successor/schema.prisma:394; C/tests/server/super-user-v1/fixtures.mjs:79 |
| 11 | Stale/concurrent operation behavior has no observable contract | An agent may silently accept last-write-wins or stale program authority | S | High | Pasted Phases 1–2; C/apps/web/src/app/api/workspace/events/route.ts:109,120 |
| 12 | Readiness language is broader than the baseline | The agent could restart parked operational work or overstate security assurance | S | Medium | C/.orchestra/product-development/super-user-v1/implementation-checkpoint-20261016.md:24,26 |

### 1. Make the preservation gate executable

Name the candidate root and these files under `C/.orchestra/product-development/super-user-v1/`: `implementation-checkpoint-20261016.md`, `verification-checkpoint-20261016.json`, `current-source-manifest.json`, and `changed-paths.txt`. The checkpoint records 298 changed product paths; this review did not independently recompute the entire inventory.

Record a new immutable pre-feature snapshot before implementation. A mismatch should cause investigation and a documented explanation, not an automatic reset or blind overwrite. Permit incremental edits to already modified candidate files while preserving unrelated hunks. "Do not overwrite existing work" otherwise conflicts with the need to extend existing auth, UI, and schema files.

### 2. Keep the instructor role and add scoped assignments

The clarification removes the need to recognize `PROGRAM_HEAD` as a global role string. The current unknown-role test can continue rejecting that fabricated role string. Add separate tests proving that an authorized instructor designation grants exactly the new capabilities, while an ordinary instructor remains unchanged. Do not relax unknown-role admission wholesale.

Define who can assign/revoke the designation, whether one instructor can head several programs, whether a program can have several heads, and whether assignments expire. The implementation task needs synthetic local assignments; it does not inherently authorize a real account-administration UI or production provisioning.

A display tag, `User.department`, an arbitrary permission string, or a chart node must not be the authority source. Program and assignment records need stable IDs and institute ownership. Chart reordering must not appoint a head, move a class between programs, or change account privileges.

### 3. Specify class ownership before implementing chart links

An instructor may teach BSIT and BSCPE classes. A BSIT head must not inherit access to every class that instructor teaches merely because the instructor appears in the BSIT chart. Define a program-to-class relationship and the treatment of shared/cross-listed classes, archived classes, unassigned instructors, and pending memberships.

The owner-approved oversight actions are viewing class content, roster, submissions, and grades. Implement a field/action allowlist for those reads. Grade export, private comments, bulk downloads, and other capabilities are not implicitly authorized by opening a class; document any additional product decisions before including them. Read access is still sensitive access. Download URLs used for permitted content/submission viewing and nested APIs need the same program checks. Deny mutations even when the same class page exposes them to its owning instructor.

The chart is navigation, not an authorization boundary. Direct course URLs, APIs, server actions, and downloads must enforce current program assignment. Revoke access when the head designation, instructor membership, class program, or account status changes. Do not add a blanket bypass to every instructor/course guard.

### 4. Secure existing calendar paths as part of completion

Calendar storage and UI already exist. The old `/api/workspace/events` route authenticates and uses institute-level filters but does not enforce instructor-only management, event ownership, or enrollment-based reads. Its legacy guard permits instructors and students through for this operation. This is an existing authorization gap observed statically, not merely a hypothetical prompt risk.

Require a shared event policy across old/new APIs and server-rendered calendar data. Cover all existing HTTP methods. Define whether co-instructors may edit each other's course events. Personal events, class-student events, program-student events, and instructor broadcasts need explicit scopes; null course IDs must not silently mean institute-wide visibility. Instructors may publish class events only to students enrolled in classes they are authorized to teach. Program Heads may additionally publish to the students of their assigned program, including students in other instructors' classes within that program.

The existing tasks page also derives deadlines from syllabus items. Apply the same group visibility as classwork, keep derived deadlines linked to their authoritative source, and prevent generic event CRUD from mutating a synthetic syllabus ID. Moving an assignment due date must update one derived calendar entry, not leave an old duplicate.

### 5. Define broadcasts and deadlines as a product contract

The confirmed instructor recipient choices are same-program instructors by default and all instructors in the institute when the Program Head explicitly checks a checkbox labelled "Visible to all instructors in this institute." Keep the checkbox unchecked for new records and show the saved audience on details and edit forms. The institute comes from the authenticated actor's authorized assignment, not an arbitrary client-supplied institute ID. Persist the chosen audience on the authoritative event/deadline record and validate it on reads and mutations.

Student publishing adds two authorized audiences: students in the head's assigned program, and enrolled students in an instructor's own class. Make the student target explicit in the create/edit interface and show the saved target in event details. The instructor-wide checkbox must not silently add or widen the student audience. If an event targets both instructors and students, evaluate the two recipient sets independently; broadening instructor visibility leaves students restricted to the selected authorized program/class.

| Publisher/action | Authorized recipients | Authority source |
|---|---|---|
| Ordinary instructor publishes a class event | Enrolled students of their own selected class | Current teaching authorization and enrollment |
| Program Head publishes a program student event | Students assigned to their program | Current head assignment and authoritative student-program membership |
| Program Head publishes an instructor broadcast, default | Instructors assigned to their program | Current head assignment and instructor-program membership |
| Program Head enables institute-wide instructor checkbox | All instructors in their own institute | Current head assignment and institute membership |

Use authoritative student-program membership for program-wide audiences. A student taking a cross-program elective must not automatically become a member of every program represented by their enrolled classes. Document this relationship in the new program model alongside instructor and class relationships.

An institute-wide instructor broadcast does not authorize selecting another institute, modifying other programs' charts, or opening other programs' classes. Test the default audience, explicit instructor expansion, audience edits in both directions, foreign-institute exclusion, forged scope values, and revoked head assignments. Test positive visibility for eligible program/class students, denial for unrelated students and programs, exclusion of students from instructor-only broadcasts, and that the instructor checkbox never widens student visibility. When an event's audience is narrowed, calendar/detail reads and caches must stop exposing it to removed recipients. Use a shared event record so recipients cannot independently alter the published content. The original instructor-only-own-course rule needs explicit exceptions for authorized Program Head program broadcasts, not a general course-management bypass.

Specify whether recipient membership is evaluated when reading or snapshotted when publishing. Recommended for a capstone: one authoritative broadcast record queried through current eligible program membership or class enrollment, avoiding independently editable per-recipient copies. If delivery/read receipts are required, separate delivery state from event identity. Include student transfers, enrollment changes, and instructor reassignment in visibility tests.

Program Head events can target program students under the owner's latest clarification. Still define whether recipients can dismiss them locally, who can edit/cancel them after a head transfer, and what happens to already published events on revocation. A calendar deadline does not automatically imply a submission workflow, completion tracking, email, or push notification. Viewing an event does not authorize a student or recipient instructor to edit the publisher's record.

## Missing acceptance criteria and useful feature boundaries

These are decisions to add to the prompt, not a mandate to build every possible feature.

### Calendar essentials

- Required views: define month plus agenda/list, today/previous/next navigation, and course/program filters. Week/day views are optional unless required by the rubric.
- Fields: title, description, source, audience, start/due value, optional end, all-day versus timed meaning, creator, and status. Put reasonable server-side length and date-range limits on inputs.
- Time: choose an IANA institutional default (confirm `Asia/Manila` for this institution rather than using the agent machine's timezone), store timed instants consistently, and keep date-only values date-only. Specify invalid/ambiguous local-time behavior if arbitrary zones are supported.
- Lifecycle: distinguish cancel from delete; define whether recipients see cancellation and who owns a head-created event after reassignment. Preserve existing events through migration.
- UX: loading/empty/error states, retry, accessible detail/edit dialogs, keyboard navigation, readable narrow-screen agenda, clear audience labels, and save-conflict feedback.
- Query behavior: fetch a bounded visible interval; account for events overlapping the interval, not only ones starting inside it. Avoid fetching every institute event indefinitely.
- Security: reject student mutations, same-institute unrelated courses, forged creator/audience fields, unsafe links, and unauthorized direct requests. Revalidate assignment/enrollment on server operations and avoid stale private caches.

### Organizational Chart essentials

- Define whether it is a personnel chart or an academic unit hierarchy, the allowed node types, number of parents, roots, and whether instructors can belong to multiple programs.
- Reject cycles, self-parenting, foreign-program edges, duplicate membership as appropriate, invalid roots, and dangling relationships. Specify delete/reparent effects before adding drag and drop.
- Ordinary instructors need a defined readable scope; Program Heads manage only their assigned program. A graphical view needs an accessible list/tree alternative and keyboard controls.
- Specify which profile details are visible. Phone, credentials, internal permissions, private comments, and administrative metadata must not appear merely because they exist on a User record.
- Show classes through explicit scoped links. Persist structural edits atomically with version checks; return a conflict rather than silently losing another head's update.
- Record who made structural or broadcast changes using the established audit convention, with minimal payloads and no secrets.

### Optional improvements after essentials

1. Search by instructor and course, with filters for program, term, and active/archived classes. This helps demonstration and real navigation without expanding permissions.
2. Calendar export or reminders only if the capstone rubric needs them. Private subscription URLs introduce revocation and leakage concerns; external Google Calendar integration is a separate feature.
3. Printable chart and agenda for demonstrations. This is lower risk than advanced chart animation or a generic workflow builder.
4. A short seeded demonstration scenario covering BSIT and BSCPE, a mixed-program instructor, an ordinary instructor, and a student. Use synthetic data and show both success and denied access.

Recurrence, RSVP, attachments, external calendar sync, deadline submissions, broad class editing, and native mobile feature parity should be explicitly included or deferred. Silence should not be interpreted as permission to invent them.

## Missing verification gates

1. **Context gate:** assert candidate cwd/branch and record the pre-feature inventory. Exclude secrets and runtime data from source hashes; include every new/untracked product, test, and migration file.
2. **Contract gate:** document the instructor designation, program/class relationship, class action matrix, broadcast audience, and chosen calendar semantics before changing auth/schema. Routine choices can proceed; unresolved material access grants need owner input.
3. **Target gate:** verify owned loopback PostgreSQL, synthetic fixture provenance, owned application process/port, explicit migration configuration, and teardown. Never fall back to ambient `.env` targets when the fixture is unavailable.
4. **Migration gate:** extend the successor migration path and keep the runtime/successor schema projections consistent. Rehearse a fresh local database and a pre-feature upgrade with representative existing users/events. Prove data preservation and recoverable failure, without claiming production migration qualification.
5. **Discovery gate:** map each requirement to exact tests and commands. Confirm expected, executed, skipped, and failed counts. The existing driver names particular files; adding tests elsewhere does not make that driver execute them.
6. **Authorization gate:** execute real server/API and browser paths for ordinary instructor, designated head, student, suspended/revoked actors, unrelated same-institute program, and foreign institute. Include nested class data and source-derived deadlines.
7. **Build gate:** build after the final relevant edit, then browser-test that build. Expand the source inventory: the old driver snapshots only its old scope reference and can miss new files.
8. **Completion gate:** no introduced authorization defects or feature regressions; accurately list unchanged baseline failures, deferred operational checks, unexecuted tests, and environment blockers. Do not restart parked activation work to satisfy a vague "regression suite" phrase.

Existing standalone commands evidenced by the checkpoint (not executed in this review), run from C with the required owned fixtures/configuration:

```powershell
pnpm --filter web exec tsc --noEmit
pnpm build:web
pnpm exec prisma validate --config prisma/super-user-v1-successor/prisma.config.ts
$env:SUPER_USER_BROWSER_CHECKS = '1'
node .orchestra/product-development/super-user-v1/integration-driver.mjs
node .orchestra/product-development/super-user-v1/migration-qualification.mjs
```

These commands are a baseline, not the complete new-feature matrix. The schema validator requires an explicit disposable `SUPER_USER_MIGRATION_DATABASE_URL`; the integration fixture imports retained PostgreSQL binaries from the sibling `trusted-local-harness` checkout. Reading those preserved binaries and running the standalone application driver do not invoke the harness controller, but the dependency must be disclosed. New successor migrations and feature tests must be added to the actual executed test path.

## Redundancy, contradictions, and likely agent failures

- Combine repeated server-authorization/cross-scope instructions into one permission matrix referenced by each phase. Keep the negative tests alongside that matrix so the repetition becomes verifiable coverage.
- Merge Phases 3 and 4 into implementation checks plus one final verification pass. Their current overlap can trigger repeated builds/full regressions without new evidence.
- Keep one operational-boundaries section instead of restating production restrictions in several phases. Preserve the substantive boundaries.
- Replace "never relax a test" with "never weaken unchanged requirements merely to pass; update tests only for an explicit approved behavior change, preserving the historical test and adding replacement coverage." With the designation design, the global `PROGRAM_HEAD` rejection can remain valid.
- Replace "fix confirmed security defects" with a scope rule: fix introduced or touched-feature security defects; record unrelated existing defects and escalate only if they prevent safe local demonstration. Otherwise an agent can turn this capstone task into a whole-LMS security rewrite.
- Define a bounded repair/escalation rule based on repeated failure or missing prerequisites. "Continue until complete" without evidence-based stopping can cause repeated environment repair, fixture edits, or hidden test weakening.
- Clarify that calendar-first refers to feature implementation order. Shared program/audience design needed by head broadcasts can be investigated before the chart UI. Otherwise the calendar may need a second schema redesign immediately afterward.
- Treat skill instructions as phase-specific advice. Loading every design and review skill creates conflicts about minimal diffs, ambitious restructuring, mandatory image generation, animation, and output length.

## Direct skill use without Orchestra

The owner explicitly selected direct ChatGPT/Codex work and excluded the custom harness. This task choice overrides the root document's statement that the harness is the authoritative workflow; it does not require editing that document or manufacturing controller approvals.

| Phase | Suitable skill | Boundary |
|---|---|---|
| Critique and planning | `improve` | Read-only advice; do not carry its no-implementation persona into an implementation task |
| Implementation | `ponytail` | Smallest complete solution; security and required behavior remain mandatory |
| Existing application UI | `impeccable` in Operate mode | Preserve institute themes and working dashboard conventions |
| React/Next.js implementation | `vercel-react-best-practices` | Apply relevant rules, not a wholesale performance rewrite |
| Component API work | `vercel-composition-patterns` | Only when actual composition complexity warrants it |
| Final scoped review | `ponytail-review` | Review only the named feature delta against its pre-feature snapshot |

Use `ponytail-audit` for a separately scoped broad audit. Avoid running it as a second whole-repo audit after every edit. The local `grill-me` skill calls an unavailable `grilling` skill; `improve-codebase-architecture` also refers to absent companion skills and a Skill tool contract. Do not assume those wrappers are usable without resolving their dependencies. Do not run their workflows merely because they are installed.

## Suggested opening replacement for a future implementation prompt

> Work directly in the existing Super User candidate using the absolute checkout and October 16 checkpoint paths specified above. Do not run the Orchestra controller, host, gates, leases, signer, or release workflow. Read selected skills directly; use standalone application tests only with owned disposable targets. Preserve historical harness evidence and unrelated work.
>
> Program Head remains an Instructor with a persisted program-scoped designation. It grants chart management and read-only oversight of class content, roster, submissions, and grades within the assigned program. Preserve ordinary instructor permissions in the head's own classes. Program Heads can publish events to all students in their assigned program. Instructors can publish events to enrolled students in their own classes. Program Head instructor broadcasts target same-program instructors by default; an unchecked-by-default "Visible to all instructors in this institute" checkbox expands only the instructor audience. Make student targeting explicit and retain its program/class restriction independently of that checkbox. These calendar permissions do not expand chart management or class oversight. Chart edits and profile tags cannot grant permissions.
>
> First record the exact pre-feature snapshot and acceptance matrix. Extend and secure the existing calendar/API and deadline aggregation before building the chart. Implement shared program/audience foundations when needed. Add successor migrations and tests that the actual commands discover. Verify direct server authorization, current assignments, conflict handling, upgrade preservation, and the final built UI. Report feature readiness and limitations without claiming harness acceptance or production readiness.

The owner resolved the class access and broadcast audience decisions on 2026-10-16. Other decisions listed in this review still need to be resolved from existing requirements or explicitly documented before their implementation. This document remains advisory; these clarifications do not start feature implementation.

## Ponytail installation receipt

At the owner's explicit selection, instruction-only skills were installed in the primary checkout's `.agents/skills/`: `ponytail`, `ponytail-review`, and `ponytail-audit`. No global plugin, marketplace registration, hooks, or application code was installed/edited.

Source: `https://github.com/DietrichGebert/ponytail`, pinned commit `6f1c2bfff0c837d268929a7c4e490918eb4fab29` (upstream manifest inspected as 5.3.1). Installer completed successfully. Files were read back and SHA256 verified:

| Skill | SKILL.md SHA256 |
|---|---|
| ponytail | 9badd22a32e19cb884e46dfa8d3aae82bb81dfa5484105b8b4f0262df823a509 |
| ponytail-review | 33fe4ebe22a460924e5d4a261e223df22e409cc94ab76182bee9fb91a3ef022e |
| ponytail-audit | 2b3223a02c386d1263e1b08343cb8eb3a53e444cdafb1d79e26c8ec2a8fcad28 |

The preexisting `skills-lock.json` was not rewritten with an invented hash format. This receipt records provenance separately. The skill files declare MIT; a follow-up attempt to copy the upstream LICENSE into the installed folders was blocked before execution because automatic approval review hit a usage limit. That license-copy step remains pending, and must be completed before redistributing the vendored skills. No attempt was made to bypass the failed review.

## Review limits

This was a prompt review with targeted source verification, not a full runtime security audit, dependency audit, accessibility assessment, or capstone rubric compliance certification. No complete rubric was supplied. Historical evidence hashes and every test receipt were not independently revalidated. No recommendation here is proof that a feature is implemented, safe, or tested.
