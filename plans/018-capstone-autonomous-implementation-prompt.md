# Autonomous LMS implementation prompt — Calendar, Program Head designation, and Organizational Chart

Copy or invoke the full prompt below for the implementation task. This file is a prompt artifact; creating it does not begin implementation.

---

## 1. Objective and operating authority

Implement the complete Event Calendar, program-scoped Instructor/Program Head designation, Organizational Chart, and read-only class oversight described below. Deliver a working, polished, tested local capstone candidate, together with a rehearsed database upgrade and an accurate Neon/Vercel deployment handoff.

You are the implementing ChatGPT/Codex agent. Do the work directly. Use the relevant installed agentic skills. Do not stop after investigation, planning, code generation, a partial UI, or a list of tasks for me to finish.

I authorize ordinary reversible local implementation, supporting schema/migration/configuration changes, focused dependency additions when justified, synthetic fixtures, tests, browser inspection, and repairs within this feature scope. Resolve routine implementation and design decisions yourself, record them, and continue. Do not repeatedly ask me to approve plans, migrations for disposable local databases, test runs, UI choices, or defect fixes.

Do not use Orchestra or the custom engineering harness: no controller initialization, host dispatch, stage owners, leases, gate submissions, signer, release state, or harness verification workflow. This task-specific owner instruction takes precedence over repository workflow defaults that would route this work through Orchestra. Preserve the parked harness and its evidence without changing its gates or fabricating acceptance.

Selected standalone application test scripts may be used even when their filesystem path contains `.orchestra`. Reading preserved fixture dependencies is permitted. Neither action authorizes running the controller. Do not confuse the unrelated student-facing AI runtime in `apps/web/src/lib/harness` with the engineering controller, and do not remove or disable it.

Continue implementation, verification, and correction until all achievable completion criteria pass. Routine errors are your responsibility to diagnose and repair. If a tool/runtime fails, try a materially different safe approach supported by evidence. Do not repeat an identical unsuccessful command without a changed hypothesis or input. Do not end a turn just because the task is lengthy; maintain a checkpoint and continue across context compaction.

Stop for human input only when an actual missing credential/access grant, unavailable external prerequisite, unresolved material authority decision, destructive/shared operation, or platform permission boundary prevents further safe progress. Finish independent work first and report the exact blocker, evidence, attempted remedies, and smallest action required. Never invent approval, bypass a platform denial, conceal failures, or claim an untested environment works.

## 2. Exact checkout and preservation requirements

Primary repository:

`C:/Users/kirby/Desktop/lms-monorepo-skeleton`

Implementation candidate — use this as the working directory for application work:

`C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/local-worktrees/super-user-v1`

Expected branch: `codex/super-user-v1`.

Recorded October 16 candidate HEAD: `aac054bfc42171b7de90c049a319f0d34ecf64b5`. This is a historical anchor; verify current state instead of assuming it is unchanged.

Read these candidate-relative inputs:

- `.orchestra/product-development/super-user-v1/implementation-checkpoint-20261016.md`
- `.orchestra/product-development/super-user-v1/verification-checkpoint-20261016.json`
- `.orchestra/product-development/super-user-v1/current-source-manifest.json`
- `.orchestra/product-development/super-user-v1/changed-paths.txt`

Read the primary repository's `plans/017-capstone-prompt-suite-critique.md` for evidence and identified traps. The explicit product decisions in this prompt supersede earlier tentative recommendations in that critique.

Before editing application files:

1. Verify the actual cwd, branch, Git common directory, HEAD, tracked changes, untracked feature files, checkpoint inputs, and referenced frozen evidence. The candidate is part of a nested Git repository; the primary checkout's worktree list alone is insufficient.
2. Investigate mismatches without resetting anything. Explain legitimate newer changes and establish a fresh baseline. If the intended candidate cannot be located, do not silently implement in primary `main` or a fresh checkout missing the uncommitted work.
3. Create a new versioned pre-feature checkpoint outside application source, under a new candidate-local `scratch/capstone-calendar-org/` directory or another verified suitable evidence directory. Do not replace historical checkpoints. Exclude credentials, `.env`, sessions, database data, generated output, and private runtime files from source inventories.
4. Record complete relevant source/test/migration/configuration hashes and changed paths, including new/untracked files. Preserve the previous candidate inventory and frozen artifact/fixture hashes as historical evidence.

Do not reset, clean, discard, stage, commit, push, merge, deploy, or overwrite unrelated work. Incremental edits to already-modified candidate files are authorized when necessary; preserve unrelated hunks and existing security behavior. Avoid whole-file replacement when a precise patch is safer.

The October 16 passing results are baseline evidence only. The parked harness, original canonical fixtures, semantic freezes, earlier failures, and deferred operational limitations remain intact. Create successor feature tests instead of rewriting frozen historical evidence.

## 3. Required skills and how to apply them

Read skill files directly; no Orchestra manifests or controller are needed. The primary repository's skill root is:

`C:/Users/kirby/Desktop/lms-monorepo-skeleton/.agents/skills`

Use these skills:

- **`ponytail`** — `ponytail/SKILL.md`: apply throughout implementation. Reuse suitable existing components/services/dependencies, trace affected callers, and choose the smallest complete design. Required validation, security, accessibility, error handling, tests, and features are never optional reductions.
- **`ui-ux-pro-max`** — `ui-ux-pro-max/SKILL.md`: apply during interface design, interaction decisions, accessibility, responsive behavior, and final UX verification. Run targeted searches with its actual absolute `scripts/search.py` path. Use relevant UX and Next.js/React guidance. Validate recommendation fit before applying it. Preserve existing design conventions instead of importing a random new visual style.
- **`vercel-react-best-practices`** — `vercel-react-best-practices/SKILL.md`: apply to React/Next.js implementation, data fetching, client/server boundaries, bundle cost, and avoidable waterfalls.
- **`ponytail-review`** — `ponytail-review/SKILL.md`: review the completed feature delta and its connected callers, tests, data flow, and migration behavior; repair confirmed defects and verify the repairs.

Use `impeccable` in Operate mode if its existing-interface design/hardening guidance helps, and `vercel-composition-patterns` only where real component composition warrants it. Do not load every design skill. Do not invoke image-first workflows, landing-page structures, elaborate animation requirements, or broad refactors for this academic application.

Do not use `improve` as the implementation persona; its contract is read-only. Do not rely on wrapper skills that call missing companion skills. If a required skill file is absent from the candidate, read it from the primary skill root above; do not reinstall plugins or enable lifecycle hooks as an implementation prerequisite.

Skill advice cannot weaken this feature contract or impose an unnecessary human-approval loop. Resolve aesthetic conflicts in favor of task usability, accessibility, existing institute identity, and complete functionality.

## 4. Repository architecture to verify and preserve

Read applicable `AGENTS.md` files and `.agents/rules/current-lms-architecture.md`, but verify aspirational architecture against source. Inspect current requirements, `PRODUCT.md`, `DESIGN.md`, representative dashboard pages, tokens/themes, and security helpers.

- pnpm workspaces with the repository's pinned pnpm version; do not introduce another package manager or casually upgrade major dependencies.
- `apps/web` is the Next.js App Router frontend and the actual backend. APIs belong in `apps/web/src/app/api`; `apps/api` is an empty placeholder.
- Authenticated UI belongs under `apps/web/src/app/(dashboard)/[institute]/`.
- Web uses components under `apps/web/src/components`; do not assume `packages/ui` is the web component system.
- Shared Prisma files live at repository root `prisma/`.
- PostgreSQL is the database. Do not use SQLite as a substitute for migration/authorization tests.
- Preserve the Prisma 7 `@prisma/adapter-pg` and custom `pg` pool architecture; use `{ db }` from `@/lib/db`. Do not replace the adapter merely because a generic Neon guide uses a different adapter.
- Session cookie is `lumina_session`; inspect current session, API auth, role ceilings, institute guards, and persisted actor revalidation.
- Middleware cookie presence is not authorization. Protect each page data path, API, server action, attachment route, and mutation using real current relationships.
- Preserve ICS orange, IBE gold/yellow, and ITE blue themes through established theme utilities.
- Preserve ordinary student/instructor workflows and Super User/Institute Admin privilege ceilings. Do not expand generic administration or public account recovery.

## 5. Confirmed role and authority contract

Program Head is an **Instructor designation tied to assigned program(s)**. It is not a replacement global account role, a blanket `ADMIN` alias, or an arbitrary user-editable string.

Keep instructors' existing canonical role and account lifecycle behavior. Add an authoritative, persisted, revocable program-head assignment/capability. Display it as a clear "Program Head" tag in the appropriate UI. A profile field, request payload, client flag, permission string, chart position, or editable label must never grant this authority.

| Actor | Calendar authority | Chart authority | Other instructors' classes |
|---|---|---|---|
| Student | View authorized events/deadlines; no shared-event publishing or mutation | No new chart permission granted | No new access |
| Instructor | Create/manage events for students enrolled in their own authorized classes; view instructor broadcasts addressed to them | View/navigate assigned-program charts and permitted details; no persistent chart mutations | No new access |
| Instructor designated Program Head | Retains own-class authority; can publish program-student events and instructor broadcasts described below | Create/update/reorganize chart structure within assigned program(s) | Read-only oversight of class content, roster, submissions, and grades within assigned program(s) |

A Program Head retains normal instructor management rights in classes they actually teach. Oversight of another instructor's class does not permit grading, grade changes, classwork edits, enrollment management, class deletion, or impersonation.

Do not implicitly grant bulk exports, private messaging/comment access, account details, role assignment, password/credential administration, or general institute management. Normal authorized viewing of class content/submission attachments is included; its download paths must enforce the same oversight boundary.

Do not change the old test that treats a fabricated global role string `PROGRAM_HEAD` as unknown merely to support this feature: the supported mechanism is an instructor designation. Add tests for that designation while preserving malformed-role and privileged-role denials.

## 6. Authoritative program relationships

Inspect actual entities first. Reuse suitable authoritative models if they exist. Otherwise implement the minimum explicit model required for:

- Program ownership by an institute, with stable program IDs/codes and institute-scoped uniqueness.
- Instructor membership in programs, including legitimate multi-program instructors.
- Student membership in programs, independent of elective class enrollment.
- Class/course membership in a program, with explicit handling if existing approved requirements support cross-listed classes.
- Program Head assignments to active instructors with program/institute consistency and revocation.
- Chart structure that references authorized members without becoming the authority source itself.

Do not infer program access from `User.department` text, titles, email domains, subject names, selected UI program, or a chart edge. Do not infer a student's home program from every class they attend.

Default when requirements are silent: allow multiple instructor program memberships and multiple explicit head assignments, unique per user/program; a class has one authoritative program unless established cross-listing exists; a student has one current home program unless existing requirements support several. Adapt cardinality to verified requirements and document the choice. BSIT and BSCPE are required synthetic demonstration cases, not permission to guess real institutional mappings.

For an instructor teaching both BSIT and BSCPE, a BSIT head can oversee only the classes assigned to BSIT. Instructor membership alone never grants access to all of that instructor's classes. Archived or ambiguous legacy records do not acquire new visibility through guessed mappings.

Use staged nullable fields and explicit validated backfills for existing records. Unmapped data must remain intact and fail closed for new program-wide access, with helpful setup states. Do not break existing instructor ownership or approved student enrollment merely because a program mapping has not yet been established.

Use an existing authorized assignment mechanism where it fits. Otherwise provide a narrow, validated local synthetic setup/import mechanism and document the future authorized assignment process; do not invent a broad admin role editor. Ordinary instructors and Program Heads cannot self-appoint or change authorization memberships by chart editing. Do not create real privileged accounts.

## 7. Calendar publishing audiences

Support these explicit recipient scopes:

1. **Class students:** an instructor can publish to all eligible enrolled students in a class they are authorized to teach. Reuse the existing approved-enrollment policy. For several classes, validate every selected class; reject unauthorized mixed selections atomically. Do not implement a hidden all-course bypass.
2. **Program students:** a Program Head can publish to all eligible students assigned to their program, including students in other instructors' classes within that program.
3. **Program instructors:** the default audience for Program Head instructor broadcasts is instructors assigned to the selected authorized program.
4. **Institute instructors:** an unchecked-by-default checkbox labelled **"Visible to all instructors in this institute"** expands an instructor broadcast to all instructors in the head's own institute.

The checkbox expands **only the instructor audience**. It does not broadcast to all institute students, change student program/class targets, grant class access outside the head's program, or expand chart-management authority.

Make student and instructor audiences explicit in create/edit forms. Permit a Program Head to target program students, eligible instructors, or both without making the checkbox silently change student visibility. Default the instructor scope to the selected program; do not preselect student recipients simply because the instructor scope is broadened. Show saved audience badges and a readable summary before publishing and in event details.

Resolve institute and authorized program/class relationships on the server. Do not trust supplied creator IDs, audience flags, institute IDs, membership lists, or role claims. An audience label is not proof of permission.

Use one authoritative event plus validated audience relationships, or an equally small normalized equivalent. Avoid copying independently editable events into each user's calendar. Resolve eligibility from current authoritative membership/enrollment at read time so transfers, revoked enrollment, suspension, and reassignment take effect. A recipient cannot edit or delete the publisher's shared record.

Creators may manage their own authorized published records while they retain the required scope. If a head loses the designation, revoke new program publishing and management immediately; preserve already published events for still-eligible recipients until cancellation/expiry under policy. Do not grant an arbitrary successor ownership of another head's records without an existing approved management rule; record any additional stewardship workflow as a separate decision. Avoid deleting shared events when an account is merely suspended.

## 8. Complete calendar behavior

Extend the existing `CalendarEvent`, `/api/workspace/events`, tasks/calendar page, serialization, and workspace UI where appropriate. Inventory every existing caller and entry point. Do not create a parallel secure calendar while leaving the old broad API or server-rendered institute-wide queries exposed.

Required interface and behavior:

- A usable month view and agenda/list view, today/previous/next controls, clear current period, direct event detail links, and filters for relevant class/program/source/audience.
- An agenda presentation on narrow screens; no unusably compressed seven-column form of the desktop design.
- Event/deadline creation, details, edit, cancellation, and appropriate deletion behavior. Creator controls must match server permissions.
- Required title; bounded description; event versus deadline distinction; all-day/date-only or timed value; optional location if already conventional; audience; source/creator; status and version.
- Timed events have start/end with end after start. A deadline is a due instant or due date and does not require artificial duration. All-day values remain date-only rather than UTC-midnight instants that shift dates.
- Use the existing institutional timezone if defined; otherwise use `Asia/Manila` as the documented Philippine institutional default, not the server/machine timezone. Display the timezone clearly where entering or interpreting timed values. Preserve instants consistently; reject invalid/ambiguous local input rather than silently changing it if additional timezones are supported.
- Test midnight/month/year boundaries, leap days, multi-day intervals, all-day values, different viewer timezone settings, and DST cases for any supported DST zone.
- Handle visible-range overlap, not just events whose start lies inside the selected range. Bound date-range queries and add indexes justified by actual access patterns.
- Cancellation retains a visible cancelled state and prevents the entry appearing active. Hard deletion is limited to an authorized creator and an explicit destructive UI confirmation; do not cascade-delete academic data or source assignments.
- Preserve and correctly interpret legacy event data through migration; do not guess a program audience for old null-course records. Contain ambiguous records to a safe existing owner-only view until explicitly mapped.
- Optimistic concurrency/version checks for edits, cancellation, deletion, and audience changes; return a clear conflict and offer refresh without discarding unsaved text silently.
- Loading, empty, unavailable, permission-denied, validation, conflict, save-success, retry, and cancelled states. Prevent accidental duplicate submission and handle network failure without false success.

Existing syllabus/classwork due dates must appear once as read-only source-derived entries. Reuse approved enrollment and target-group visibility; do not leak assignment titles, descriptions, points, or details to another group. Editing a source deadline navigates to its authorized source workflow instead of generic event CRUD. Changed/deleted assignments must not leave duplicate/stale calendar copies. Preserve appropriate instructor deadline visibility in their taught classes, rather than relying on student-enrollment queries for instructors.

Unless existing approved requirements require them, defer recurrence, RSVP, email/push reminders, external calendar sync, attachments on new calendar records, public subscription URLs, and deadline submission/completion workflows. Required calendar features above remain complete without these extras.

## 9. Organizational Chart and class oversight

Implement a program-scoped organizational chart using the actual academic structure. Prefer a simple program root with optional organizational/group nodes and linked instructor nodes, including a clear Program Head badge. Use existing approved organizational semantics if present; do not build a generic organization-management product.

Ordinary instructors can select their authorized programs, view the chart, inspect permitted names/designations and public academic details, search instructors, and navigate the structure. Do not expose credentials, private profile fields, permission blobs, internal audit metadata, or unrelated student data in chart payloads.

Program Heads can add/edit/reorder/reparent structural nodes and linked instructor placement within their assigned program. Selecting an instructor for placement must be limited to existing eligible program members. Chart edits do not change actual membership, role, institute, teaching assignment, or head designation. Keep an accessible roster/list for eligible instructors who are not yet placed, so a visual removal does not make an authorized instructor/class inaccessible.

Define and enforce one root per program, allowed node types, one structural parent per node, no self-parenting/cycles, no foreign-program edges, stable order, bounded input/depth, and transactional writes. Protect the root. When removing a non-root structural group, reparent its children safely to the parent with an explicit UI explanation; never cascade-delete users, classes, memberships, submissions, or grades. Confirm destructive structural actions and use version checks for competing edits/reparenting.

Provide a readable list/tree alternative, keyboard management controls, search, expand/collapse, fit/reset view if a canvas is used, and clear read-only versus management mode. Drag and drop may be offered only with an accessible alternative; it is not a prerequisite to a complete chart.

Through a chart instructor node, Program Heads can open a scoped class list and read-only views of class content, roster, submissions, grades, and permitted content/submission attachments. Use actual server-verified program-to-class relationships. Protect nested routes, server components, APIs, server actions, RSC payloads, and downloads against direct access as well as UI navigation.

Default to a reusable scoped oversight view when changing normal class pages would accidentally introduce broad editing permissions. On oversight pages hide/disable mutation affordances clearly and reject every equivalent direct mutation. Preserve full normal permissions in the head's own classes. Unassigned, archived, removed, or foreign resources need honest empty/denied/not-found behavior without leaking their details.

## 10. Security, consistency, and audit requirements

Implement one coherent set of feature access policies shared by all applicable read and write entry points. Reuse suitable guards; do not reuse an insufficient guard simply because it exists.

- Authenticate every API and server operation. Revalidate active account, designation, membership, teaching/enrollment relationships, and real persisted target.
- Check same-institute **and** program/class/resource scope. Institute membership alone is insufficient.
- Check authorization again within the transactional mutation boundary or use a design that proves equivalent atomicity. Prevent permission revocation between check and write from authorizing stale operations.
- Validate payloads and allowlist persisted fields; never mass-assign creator, ownership, membership, or privileged attributes.
- Enforce existing origin/CSRF protections on cookie-authenticated mutations; validate links, render text safely, and handle invalid JSON without unhandled server errors.
- Use database constraints where appropriate for same-program relationships and valid references. A graph cycle check must remain safe under competing transactions; a client-side check is insufficient.
- Use versions/conditional updates and bounded transaction retry only where safe. Do not retry uncertain non-idempotent writes blindly.
- Invalidate/refetch relevant views after updates, cancellations, audience narrowing, membership changes, and revocation. Never cache one user's sensitive results under a shared unscoped key or serialize unauthorized payloads into the page.
- Follow established audit conventions for structural changes, broadcast publishing/audience changes/cancellation, and assignment changes in the scoped setup mechanism. Use safe metadata; no credentials, raw sessions, or unnecessary student data.
- Bound queries, payload sizes, search, and graph depth. Avoid per-node/per-event query loops and fetching entire institute histories.
- Do not regress Super User, Institute Admin, legacy-role containment, public recovery, or independent ordinary instructor/student access.

## 11. PostgreSQL schema and migration design — mandatory

Treat schema consistency and existing-data safety as implementation requirements, not documentation cleanup after the UI works.

Inspect at least:

- `prisma/schema.prisma` and its actual runtime client generation.
- `prisma.config.ts` and root historical `prisma/migrations`.
- `prisma/super-user-v1-successor/schema.prisma`, its `prisma.config.ts`, and its migrations.
- Current SQL security objects, grants, constraints, triggers, qualification checks, and local fixture schema construction.
- Existing data inventory/provenance artifacts and migration qualification receipts, without reading live credentials or copying sensitive records.

There are two known traps to verify:

1. The default root configuration can load ambient database variables and selects historical initialization migrations.
2. The successor local configuration explicitly permits only a named loopback disposable target. Its observed baseline checks local principals such as `bqual_test_migrator` / `bqual_schema_owner`; existing guard migrations include privileged-account containment. They are not automatically a Neon deployment migration chain.

Do not remove local target guards or change protected historical SQL to make deployment easier. Do not replay root initialization or the observed baseline against a populated database. Do not reapply containment migrations merely to add calendar/program tables, and do not silently drop existing security objects or grants.

Produce an explicit schema ownership/projection decision: the generated runtime client, tested schema, successor schema, and deployable migration end state must agree on all feature tables, columns, enums, foreign keys, defaults, and indexes. Preserve intentional non-Prisma SQL objects. Verify agreement using actual local database inspection/diff plus runtime queries; `prisma validate` alone is insufficient.

Use additive successor migrations for the features. Stage required new columns and relationships, perform only validated backfills, preserve legacy IDs/events/users/academic data, and validate constraints after compatible data exists. Unknown program mappings must remain unmapped rather than being guessed. Do not run destructive `db push`, `--accept-data-loss`, `migrate reset`, or blanket drop/recreate as a solution.

Create a separate explicit deployable migration configuration/entrypoint if needed. It must use a deliberately supplied migration connection and a verified precondition/target contract, not weaken the loopback-only fixture config. Establish how the actual existing migration history would be adopted or advanced without executing already-present initialization SQL. Baselining/resolution must be justified by observed schema/history equivalence; never mark a migration applied just to suppress an error.

Rehearse locally on owned disposable PostgreSQL:

- A fresh database built through the documented baseline and complete migration path.
- A populated pre-feature candidate upgraded only through the intended new migrations, with representative existing users, events, courses, assignments, audit records, and security objects preserved.
- The deployable configuration/path under a separate non-superuser migration/application-role setup representative of the intended hosting constraints; do not satisfy portability tests by reusing only the hard-coded local fixture principal names.
- Constraint violations, legacy unmapped records, failed/partial upgrade recovery, rerunning the deployment command with no pending migrations, and deployed schema versus runtime client compatibility.
- Both permitted ORM reads/writes and denied unauthorized operations through the actual custom adapter.

If the real Neon schema, privileges, or migration history cannot be observed within existing authorization, deliver a precise pre-deployment comparison/adoption procedure and identify that boundary. Do not invent that live state or claim local tests have qualified it.

## 12. Neon and Vercel compatibility

Keep the application on PostgreSQL and the installed Prisma major/version family. Confirm the actual installed/locked versions and current official documentation before choosing version-sensitive CLI options or connection behavior. Do not upgrade Prisma/Next.js as part of this feature merely to match a newer tutorial.

Prepare these requirements in source/configuration and the deployment handoff:

- Runtime uses the appropriate Neon pooled application URL with a least-privilege app principal. Migration tooling uses an explicitly supplied migration/direct URL and distinct necessary privileges. Use a single documented variable contract and precedence; do not silently choose among several conflicting configured targets.
- Keep secrets server-side, out of `NEXT_PUBLIC_*`, source, reports, screenshots, URLs in logs, and build output. Update examples with placeholders only. Never print `.env` contents.
- Preserve/reuse the custom `pg` pool and Prisma adapter. Configure limits/timeouts at the actual driver level for the installed Prisma 7 adapter, accounting for many serverless instances; do not assume old Prisma URL pool parameters configure `pg`.
- Use a compatible Node.js runtime for TCP `pg` operations; do not move these routes to an incompatible Edge runtime. Avoid per-request client/pool creation or disconnection and long-held request transactions.
- Review SSL behavior against actual installed `pg` and Neon guidance. Do not fix connectivity by disabling certificate validation or adding another permissive TLS override. Record and address any existing relevant TLS issue without exposing credentials.
- Keep program/event/assignment data in PostgreSQL. Serverless memory, local filesystem, and background work after response cannot be the durable source of truth.
- Verify monorepo root, install/build commands, generated-client location, production dependencies, Prisma generation, Next output tracing, and environment variable availability at build/runtime. A successful local dev server does not prove a Vercel build works.
- Prisma client generation is required after schema changes; it does not apply migrations. Migrations must be an explicit ordered deployment step before incompatible application code receives traffic. Do not hide production DDL in request handling, `next.config`, `postinstall`, or every preview build.
- Keep Development, Preview, and Production database targets separate. Preview deployments must not mutate production through a shared URL. Document isolated preview database/branch provisioning and its data sensitivity; no real database/branch creation is authorized here.
- Keep schema changes backward compatible with the prior application during rolling deployment where practical. Specify migration, backfill, verification, code promotion, smoke test, and recovery order. Application rollback alone does not reverse a database migration.
- For later authorized staging/production use the verified committed-migration deployment process, normally `prisma migrate deploy` with the correct explicit config, not `migrate dev`, resets, auto-seeding, or `db push`. Because deploy does not itself prove drift absence or generate the client, include separate schema/history checks and generation.
- Plan for connection failures/cold-start latency with bounded waits and safe user feedback; never blindly retry uncertain writes. Avoid claiming live pooler, latency, role, or TLS behavior was tested without actual evidence.

Consult official sources and record relevant versions/decisions. Starting references, to recheck at implementation time:

- [Neon Prisma setup](https://neon.com/docs/guides/prisma)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Prisma 7 driver connection pools](https://docs.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Prisma 7 migration development/production workflows](https://docs.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)

Apply guidance to this repository rather than copying a quickstart that changes its adapter, generation imports, migration lineage, or security model.

## 13. UI/UX quality contract

Deliver a polished extension of the existing LMS, with coherent typography, spacing, hierarchy, iconography, forms, and states. "Pristine" means the following observable outcomes, not an unsupported aesthetic claim:

- Reuse the incumbent dashboard shell, components, font system, semantic tokens, and institute palettes. Do not redesign unrelated screens or replace facts/branding.
- Clear navigation entries and role-appropriate dashboard links for Calendar and Organizational Chart. No dead buttons or fake data presented as live.
- Understandable program/class selectors, Program Head badge, read-only oversight labels, audience controls, event status, and localized human-readable dates.
- Forms have visible labels, contextual validation, clear required fields, sensible defaults, pending/disabled states, retained input on recoverable error, and clear success feedback.
- Keyboard access, visible focus, correct semantics, labelled icon buttons, dialog focus trap/return, Escape handling, and screen-reader announcements for relevant state changes.
- Readable contrast, status distinctions beyond color, reduced-motion support, and usable text zoom. Use the skill's web guidance; do not mechanically copy native mobile sizing rules.
- Verify at approximately 375px, 768px, 1366px, and 1920px. No accidental page-level horizontal overflow, clipped dialogs, overlapping controls, illegible calendar cells, or hidden primary actions. A deliberate chart viewport may pan while its accessible list remains usable.
- Long names, empty program/course lists, large event counts, long descriptions, no assigned program, permission loss, cancelled events, failed requests, and stale edits remain usable.
- Avoid heavy animation/dependencies, unnecessary canvases, giant client bundles, unstable layouts, N+1 reads, and expensive per-render calendar recomputation.

Use the actual running application for visual inspection and interaction checks. Inspect representative screenshots and exercise the controls; do not substitute source inspection or screenshot creation alone for inspection. Cover each role/mode and representative institute theme variants. Check browser console/network errors and correct relevant failures.

Use bounded, defect-driven visual passes: implement the complete interface, inspect desktop/mobile together, fix the observed defects in a batch, and confirm. Further passes require concrete remaining/new defects, not subjective endless restyling. Passing checks should not be rerun repeatedly without a relevant change or unresolved concern.

## 14. Test environment and command discovery

Use owned disposable local PostgreSQL and synthetic accounts/data only. Before any test or migration command, verify the actual target, ownership, cwd, port, process identity, fixture provenance, and teardown behavior. Loopback alone is not proof of ownership. Never fall back to a configured Neon/shared database when local setup fails.

Inspect package scripts/configuration before invoking them. The known baseline commands below are real repository commands, but must be revalidated from the candidate:

```powershell
pnpm --filter web exec tsc --noEmit
pnpm build:web
pnpm exec prisma validate --config prisma/super-user-v1-successor/prisma.config.ts
$env:SUPER_USER_BROWSER_CHECKS = '1'
node .orchestra/product-development/super-user-v1/integration-driver.mjs
node .orchestra/product-development/super-user-v1/migration-qualification.mjs
```

The successor validator requires a deliberately supplied disposable `SUPER_USER_MIGRATION_DATABASE_URL`; do not invent a real URL. Runtime/build verification must receive the controlled test environment without printing it. The standalone fixture currently references retained PostgreSQL binaries in the sibling `trusted-local-harness` checkpoint; disclose and validate that read-only dependency. If unavailable, provision an equivalent owned local fixture without starting the controller or changing frozen evidence.

The existing integration driver names particular test files and migrations; its old source-snapshot scope can miss new files. Extend a successor standalone runner/configuration or add focused documented commands so every new feature test/migration is actually discovered and executed. A small direct test runner is allowed; do not build another orchestration framework.

Do not run default Playwright against an arbitrary `E2E_BASE_URL` or silently reuse an existing port-3000 server. Own the tested Next process and database; verify the URL and build. Use synthetic authentication states, safe evidence capture, and reliable teardown. Do not terminate unrelated processes.

Create a requirement-to-test-command matrix with named tests and expected/executed/failed/skipped counts. Record commands, exit codes, source/build identity, timestamps, and environment limitations. Added files that were not executed are not coverage.

## 15. Mandatory feature and regression coverage

Write meaningful tests at the appropriate layer and use real PostgreSQL and actual HTTP/server-action/browser paths for critical authorization and migration behavior. Pure permission unit tests alone are insufficient.

Calendar coverage:

- Authorized instructor create/read/edit/cancel/delete for their own class-student events.
- Program Head program-student publishing, default program-instructor publishing, and checkbox-enabled institute-instructor publishing.
- Explicit combined audiences without unintended student broadening; edits that narrow audience remove access and stale cache exposure.
- Student read visibility by enrollment/program/group and denial of shared-event mutations.
- Same-institute foreign-program/class denial; cross-institute denial; mixed unauthorized targets; forged creator, audience, course/program, and role claims.
- Existing `/api/workspace/events` methods, server-rendered task/calendar reads, and all new routes.
- Source-derived assignment deadlines with group targeting, changed/deleted source, read-only source identity, and duplicate-free aggregation.
- Invalid JSON/fields/dates, range limits, all-day/timed semantics, timezone boundaries, cancellation, stale versions, concurrent edits, retry/double-submit behavior, and inaccessible/deleted events.
- Program transfer, enrollment revocation, instructor reassignment, suspension, and head-designation revocation.

Chart and oversight coverage:

- Ordinary instructor chart view and direct mutation denial.
- Authorized head structural changes and direct foreign-program/institute mutation denial.
- Root protection, cycle/self-edge rejection, cross-program edges, invalid linked users, duplicate/invalid placement, deletion/reparent preservation, and concurrent reparent conflict.
- Chart edits cannot grant head status, change memberships/teaching ownership, or delete academic/user records.
- Read-only class content, roster, submissions, grades, and allowed attachments for the correct head/program.
- A mixed-program instructor: BSIT head can read BSIT classes and is denied BSCPE classes, including direct URLs/API/RSC/download access.
- Head cannot mutate another instructor's class through any existing exposed action; ordinary instructor permissions in their own classes remain functional.
- Revocation and reassignment remove oversight without relying on logout or a hidden button.

Cross-cutting coverage:

- Missing session, suspended account, ordinary student/instructor, designated head, unassigned head/instructor, same-institute unrelated program, foreign institute, malformed role, Super User, and Institute Admin cases as relevant.
- Existing Super User ceilings, dedicated administrative operations, authentication/recovery behavior, and ordinary instructor/student routes and workflows.
- Schema generation/validation, actual deployable migration fresh replay and populated upgrade, data/security-object preservation, failure recovery, schema/client consistency, and runtime adapter behavior.
- End-to-end browser journeys through create/view/edit/cancel, audience selection, instructor read-only chart, head management, oversight, permission-denied states, and responsive layouts.

Tests may be updated only for explicitly changed approved behavior, with replacement positive/negative coverage and the reason recorded. Never weaken unchanged requirements, delete failing tests to pass, replace real integration with mocks, fake receipts, or hide skips.

## 16. Autonomous work sequence and repair loop

1. **Preserve and inspect:** verify candidate/checkpoints, read relevant requirements/skills/code, record the exact baseline and known failures.
2. **Specify internally:** create a concise acceptance/action/audience matrix, model sketch, migration lineage, direct verification matrix, and UI plan. Use this prompt's defaults for unspecified routine details; document them and proceed without awaiting approval.
3. **Implement foundations:** authoritative program relationships/designations, additive migration path, shared authorization, synthetic setup, and tests. These shared prerequisites may precede the calendar UI.
4. **Complete Calendar first:** repair existing entry points, implement event/audience/date behavior, source deadlines, navigation, forms, and focused verification.
5. **Complete Chart and oversight:** implement scoped structure, read-only instructor view, head management, program-filtered class navigation and protected read-only class resources.
6. **Verify progressively:** generate client, typecheck, migration rehearsal, focused tests, final production build, owned-server browser tests, and relevant regression tests. Keep required new test discovery explicit.
7. **Repair:** identify each failure's actual cause; fix implementation/configuration/fixture defects within scope; rerun affected checks. Rebuild before browser verification after relevant source changes. Retain failed attempts and their resolution without dumping secrets.
8. **Review and polish:** apply `ponytail-review`, inspect the actual UI across required roles/sizes/themes, and fix confirmed functional/security/accessibility/visual defects. Run the affected validation after each meaningful fix batch.
9. **Close:** verify final source-to-build-to-test freshness, complete documentation and demo steps, leave a clean resumable record, and report exact results and limitations.

A known unrelated baseline failure does not authorize an unlimited whole-repo rewrite. Fix introduced and touched-feature defects and any existing defect directly preventing this workflow. Record unrelated failures separately. Do not require parked operational activation or formal harness acceptance for local capstone demonstration.

Do not turn a failed environment probe into a false product failure or a passing result. After repeated failure with no new safe remedy, preserve evidence, finish other work, and report the genuine external blocker. Continue on resolvable defects without asking me to debug them.

## 17. Completion criteria and deliverables

The work is ready for local demonstration only when:

- All specified features are implemented and connected to the real application/database; no stub actions, mock-only UI, unimplemented controls, or manually faked calendar records.
- Program Head designation and all four audience scopes behave according to this prompt, with independent student/instructor targeting and server enforcement.
- Ordinary instructor chart access is read-only, head chart management is program-scoped, and oversight is read-only for other instructors' classes with working authorized content/submission access.
- Critical direct negative authorization tests pass, and there are no unresolved introduced security/data-loss/high-severity feature defects.
- Runtime and successor/deployable schema projections agree; new migrations have passed real local fresh/upgrade/recovery checks and preserved representative existing data/security behavior.
- The current production build and TypeScript checks pass. Required executed feature/regression checks pass or are accurately classified as a genuine external blocker; blocked checks prevent an unqualified ready claim.
- The built UI has been inspected and exercised, with the stated responsive/accessibility/error-state criteria satisfied and no known material UI defect in these features.
- A synthetic demonstration is repeatable for student, ordinary instructor, BSIT head, BSCPE head, mixed-program instructor, and foreign-scope actor.
- The deployment handoff is complete enough for a later authorized Neon/Vercel rollout, and explicitly distinguishes local evidence from untested real-environment requirements.

Provide these durable artifacts outside application source, with appropriate sanitized developer documentation in the candidate:

1. Final implementation summary and requirement/action/audience decisions.
2. Pre-feature and final complete relevant source manifests, changed paths, and current checkpoint.
3. Requirement-to-test-command matrix and actual results, including previous failed attempts, fixes, skips, and known baseline exclusions.
4. Migration/schema report: precise configurations/paths, fresh and populated upgrade procedure/results, safe mapping/backfill rules, privileges, preserved objects/data, and failure recovery.
5. Neon/Vercel runbook: environment-variable contract without values; verified build/generation commands; explicit future migration configuration/commands; existing-schema/history preconditions; preview isolation; rollout/rollback/forward-repair order; post-deployment smoke checks; external steps not executed.
6. UI verification evidence and a concise list of covered roles, routes, viewport sizes, themes, and accessibility interactions.
7. Safe local demonstration instructions and synthetic setup/teardown commands that you have actually verified.

In the final response lead with what works, then summarize tests, migration status, UI verification, remaining limitations, and links to artifacts. Do not substitute "all done," "production ready," "pristine," or "Neon compatible" for evidence.

## 18. Operational boundaries

This task authorizes source preparation and disposable local execution. It does not authorize accessing shared Neon databases, creating cloud branches/resources, provisioning real privileged accounts, changing shared environment variables, applying shared migrations, pushing/merging, deploying, or promoting Vercel deployments. Those require a separately explicit target-specific authorization.

Do all preparation and local rehearsal autonomously. Do not turn future deployment authorization into a prerequisite for local feature work. Preserve existing Super User operational protections and report real live-schema/privilege/history verification as a remaining deployment prerequisite if it cannot be safely established here.

**Begin with the exact candidate and preservation checkpoint, then implement and secure Calendar, complete Organizational Chart and scoped oversight, and continue through self-directed fixes, migration rehearsal, UI inspection, and final verification until the completion criteria are met or a demonstrated external blocker remains.**
