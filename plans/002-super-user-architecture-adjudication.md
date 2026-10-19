# Super User architecture adjudication — review artifact

**2026-10-08, Asia/Singapore. Documentary architecture adjudication only.**

Run `run_superuser_20261004` remains **HIGH / DRAFT**, with no lease, no implementation approval and no release readiness. No application source, database, harness gate or frozen fixture was changed. Docker/Sandbox runtime repair remains closed. No Calendar work or deployment is authorized.

This artifact resolves H-01–H-12 from the human's current architecture directions and two subsequent explicit clarifications. It does not manufacture an architecture signature, accepted controlled stage, independent red-team verdict or implementation permission. “Accepted” below means a design decision selected for this documentary adjudication, not a passed harness gate or a completed fix.

## Evidence and review bundle

Authoritative preparation: [001-super-user-preparation.md](001-super-user-preparation.md), preserved unchanged. Its requirements, code facts, AF-01–AF-09 findings and AC-001–AC-012 remain the basis of this artifact; decisions here supersede its pending proposals only where stated explicitly.

**T/** is `C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/runs/controlled-superuser-20261004/task`. All future source/test paths in the manifests are relative to T/, never the primary tree. Recorded controlled HEAD: `aac054bfc42171b7de90c049a319f0d34ecf64b5`; digest: `9c4cc7834a8615bfad1b11fe243287a49af292a866103dfe7e0de50b3922a1af`.

Companion artifacts, which do not authorize edits or execution:

- [Exact implementation-file allowlist](002-super-user-implementation-allowlist.json): every existing file has its captured SHA-256; new product/test paths are explicit. No globs authorize source changes.
- [Exact test-command mapping](002-super-user-test-command-mapping.json): program, argv, domain, criteria, coverage, exact expected test names and timeout for nine future commands. All executions are NOT_EXECUTED.
- [Server-boundary inventory](002-super-user-boundary-inventory.json): 120 existing route files, 20 files containing server actions, exported names and declared HTTP methods. The aliased activity invalidate POST is resolved to the real instructor reject handler. This inventory is source evidence, not runtime coverage.

Additional source evidence inspected for this adjudication: T/scripts/harness/{contracts,gates,runner,repository}.ts; T/.orchestra/harness/playwright.config.ts; T/playwright.config.ts; T/tests/e2e/auth/auth.setup.ts; all route-file method/auth declarations and server-action declarations; inline activity action bodies; lib/skills/{index,bulk-user-ingestion,bulk-assign-instructor,enrollment-manager,generate-course-code,group-permission-resolver,gradebook-exporter,sentiment-flagger}.ts; api/judge0/submit, api/github/auth/callback, api/public/leaderboard; components/layout/{DashboardLayout,Topbar,MobileBottomNav}; components/admin/PermissionsMatrixClient; forms/LoginForm. No secrets or private host fixture data are included.

The run still has no accepted predecessor stage artifacts. A formal adjudication submission requires controller-issued provenance, predecessor hashes, an actual independent red-team artifact and, where applicable, a genuine human architecture signature under the unchanged gates. This bundle intentionally has no invented envelope, actor receipt or lease.

## Accepted H-01–H-12 architecture decisions

| Decision | Exact accepted policy | Authority and resolution |
|---|---|---|
| H-01 | Target T/ only. Read-only academic oversight. No schema migration, deployment change, Calendar feature or unrelated source integration. | Human current direction. Resolved. Primary-tree Forms/Question Bank work is excluded. |
| H-02 | Explicit SUPER_USER role has academic-oversight and course-supervision reads only. It never inherits Admin, instructor, student, grading, enrollment, submission, assessment or execution permissions. Unknown roles fail closed. | Human current direction. Resolved. Persisted permissions cannot lift this ceiling. |
| H-03 | Active SUPER_USER may select ICS/IBE/ITE explicitly; initial entry is ICS. Selection lives in URL/request scope; User.instituteId and Session are not changed. | Human current direction. Resolved. No home-institute authorization fallback and no restriction invented from the ICS-home fixture. |
| H-04 | Accept the two GET oversight endpoints and supervision page from preparation. Missing/inactive authentication→401; authenticated unauthorized role→403; invalid supported-scope input→400 where routed; absent institute or missing/foreign course→404. Explicit DTO allowlists only. | Human current direction. Resolved. Unmatched malformed routing may yield 404. Error envelopes contain only safe string error/message/code fields. |
| H-05 | Keep required courseCode key but always set it to the empty string. Do not select, serialize, display, log or embed the actual join code. Unapproved description/content summaries are empty strings; no raw assessment content. | **Explicit human clarification:** “Empty courseCode; redact unapproved summaries.” Resolved for v1. Seven frozen fixture files remain unchanged. New supplementary tests enforce the stricter semantic contract; independent review and fresh exact-source preflight are still required. |
| H-06 | Schedule is only CalendarEvent rows tied to the authorized course and selected institute. Materials are only SyllabusItem type MATERIAL. Exclude assessment answers, hidden tests, attachments, student submission state, grades and execution data. | Human current direction. Resolved. This is existing event-summary data, not recurring timetable creation or Calendar management. |
| H-07 | Active courses only; complete deterministic arrays, no silent truncation, pagination or archive browsing. Detail for archived course returns the same safe 404 as unavailable course. | Human current direction plus adjudicator selection of matching detail semantics. Resolved for review. No course/schedule count or cursor additions. |
| H-08 | Deny SUPER_USER all inventoried legacy academic, teaching, grading, enrollment, submission, assessment, execution, workspace-management and administrative operations. Basic account support is only existing login, logout and own identity /api/auth/me. | **Explicit human clarification:** “Login, logout, and own identity only.” Resolved. Profile/settings/password/session/notification/OAuth management is not an exception. Anonymous public workflows remain separate from role-granted rights; see unresolved U-01. |
| H-09 | Preserve legitimate normal-role behavior. Actual role AND persisted relationship/ownership AND institute scope determine access. Assignment, enrollment, actorId or headers alone never suffice. | Human current direction. Resolved. PROFESSOR/TEACHER/INSTRUCTOR share instructor semantics where teaching is permitted. Admin authority remains Admin-specific. |
| H-10 | Accept successful access AuditLog actions, actor/self target, JSON-string metadata and append-only application writes. Required audit failure denies the response. Existing history is preserved. No schema changes. | Human current direction. Resolved. Controller denial evidence remains the frozen minimum; no universal new application-denial audit requirement. No database immutability claim. |
| H-11 | Dedicated scoped academic-operations shell. No student/instructor/Admin/Calendar-management/Knowledge Exchange/grade/submission/mutation widgets, including inherited mobile and global shell widgets. | Human current direction. Resolved. Switching institutes from detail lands on the new institute's list. |
| H-12 | Preserve all identified coverage and seven frozen hashes. Supplement independently reviewed alias, unknown-role, permission injection, sibling bypass, page/RSC/shell privacy, audit failure, archive/empty and Cookie/Bearer cases. | Human current direction. Resolved. Supplementary tests do not exist yet; review/execution is future work, not a current PASS. |

All twelve original decision IDs now have a documentary resolution. There is no remaining choice about join-code redaction or the account-support exception list. U-01 was subsequently resolved by the human: AC-007 applies to authenticated SUPER_USER academic-oversight responses only; anonymous public leaderboard behavior is explicitly outside this feature. Independent-review/gate prerequisites remain pending.

## Exact v1 read contract

Endpoints:

1. GET `/api/academic-oversight/[institute]/courses`.
2. GET `/api/academic-oversight/[institute]/courses/[courseId]`.
3. Page `/[institute]/academic-operations/courses/[courseId]/supervision`.

The existing frozen shape stays intact:

- Institute: id, code, name only.
- Course list item: id, code, courseCode, title, section, subject, room, description, coverImage, instructor.
- Instructor: null or id/name only. SUPER_USER assignment is metadata, never a capability grant.
- Detail adds schedule, announcements and materials arrays only.
- Schedule element: id, title, eventDate, eventType, description.
- Announcement element: id, content, createdAt.
- Material element: id, title, type, description, dueDate.
- List envelope: institute/courses only. Detail envelope: institute/course only.

**Semantic amendment SU-DTO-01:** courseCode is the empty string on every list/detail item, even when the database code is populated. The DTO mapper must not read Course.courseCode; Course.code is the distinct course catalog label. Do not fall back from code to courseCode, put a join code into a title, return a masked suffix, expose it in RSC props or log it.

**Semantic amendment SU-TEXT-01:** Course.description, CalendarEvent.description, Announcement.content and SyllabusItem.description are empty strings in v1. No runtime content-approval mechanism, curated content store, new schema or management UI is introduced. Course/event/material titles and ordinary institutional/catalog/instructor metadata remain the explicitly allowlisted non-assessment summary metadata. No ASSIGNMENT/QUIZ rows enter materials. A future policy allowing populated descriptive content requires separate human approval, assertion review and source-bound preflight. The current decision does not presume that a free-text field is safe merely because its key is allowed. Independent review must assess whether the retained title/name metadata is an adequate disclosure policy; source tests must include adversarial marker contamination of projected descriptive fields.

**Image behavior:** keep coverImage in the string shape but return an empty string and use a local placeholder for v1. This avoids turning an arbitrary stored URL into a tracking, credential or server-fetch channel. A later approved origin policy can be separately reviewed. No arbitrary HTML/Markdown or automatic URL linking is rendered from summaries.

**Queries:** resolve the validated route institute; require Course.id + Course.instituteId + isArchived=false together. Scope child rows through that authorized course; CalendarEvent additionally matches instituteId. Select only DTO source fields, never submissions/enrollments/student identities/templates/answers or whole related records. Dates are ISO strings; nullable dueDate remains null. Sort courses by code/id, events by eventDate/id, announcements by createdAt/id and materials by orderIndex/id. Return complete arrays with no take/skip limits. Empty arrays are ordinary results; unknown/foreign/archived detail is a safe 404.

Both successful and failed oversight APIs use private no-store; server pages render dynamically. No shared authenticated DTO cache, response spread or internal call to generic course APIs. A canonical server-only service handles real authentication, role/scope, allowlisted projection and audit. No new mutation server action is introduced.

## Boundary architecture selected for independent review

### Shared policies and role ceiling

New `src/lib/academic-authorization.ts` centralizes role recognition, hard legacy ceiling, course/child ownership and trusted page-scope validation. `src/lib/academic-oversight.ts` performs the authorized reads/audits; `src/types/academic-oversight.ts` defines the allowlist. These new modules belong to apps/web only.

Normalize explicit known roles and aliases, with an explicit unauthorized result for unknown values. Preserve a separate legacy managed-role set ADMIN/INSTRUCTOR/STUDENT for administration forms/role changes/bulk ingestion; adding SUPER_USER recognition must not add a selectable role to public registration or the Admin permission matrix. Unknown role inputs are rejected rather than silently turned into STUDENT. Empty defaults for SUPER_USER/unknown do not replace the hard ceiling in requirePermission.

Authenticate first at every real HTTP/action entry. Capability denial precedes body parsing, lookups of protected resource data, deadline validation, rate-limit writes, executor/template creation, external network calls, notifications, revalidation and mutation. Wrong-role responses must be real 403 with safe JSON; wrong-role direct actions must return/throw a genuine authorization failure in their existing contract. A missing function, generic 500, invalid payload, redirect, skipped operation or unchanged state alone does not prove authorization.

Use real getSession/getSessionFromRequest behavior. Do not make getSession return null for SUPER_USER or blanket-throw inside api-auth, which would break dedicated reads or yield legacy catch→500 errors. Existing Cookie-first authentication and Bearer fallback behavior remains; edge-case tests assert the real helper resolves one actor and never combines permissions/ownership from another token or request claim. No transitional session-id or credential-policy migration is smuggled into this task.

### Handler and server-action inventory

Every guarded HTTP verb is enumerated in the inventory. OPTIONS/CORS and genuine public/service routes must not acquire data privileges from a preflight or caller role claim. Add or reuse a real entry guard at the handler, including callbacks, streaming handlers and the separate Judge0 submit route. Already strict Admin/instructor handlers need no cosmetic rewrite, but are included in the bounded allowlist for necessary role/scope integration. Preserve their domain behavior.

The `activities/codelab/invalidate` route exports POST as the instructor reject handler; guard/test the real implementation and verify its alias does not bypass it. The 20 server-action files include six inline actions that cannot be protected by exported-action tests alone. Inline activity create/save actions must repeat real session role/course/scope checks when invoked, irrespective of the page render guard. Their supplementary browser tests replay real compiled action requests with SUPER_USER credentials and valid bound resource input; a Next protocol/CSRF/validation rejection is not counted as the role denial.

Exported lib/skills functions with `use server` are real action entry points. Bulk ingestion/enrollment input.actorId must agree with the authenticated actor, never choose an Admin supplied in the payload. Bulk assignment, generated join codes, group resolution and private grade exports need explicit authenticated capability/relationship checks at the callable boundary. The non-action gradebook-exporter is also in scope because it directly reads sensitive data and is re-exported to workflows. No unauthenticated “trusted system” bypass or new background identity is introduced; an actual external caller requiring one is a STOP condition for scope review.

### Pages and full shell

The institute root branches SUPER_USER to ICS academic operations at initial entry. A requested IBE/ITE oversight URL retains that route scope. Shell selection is by explicit resolved role before mounting any legacy child/wrapper: SUPER_USER gets AcademicOperationsShell, others retain the current DashboardLayout path. Student rewards, gamification fetches/toasts, notifications, mobile More menus, profile/settings links and default Admin/student nav must not run/mount for SUPER_USER.

To prevent arbitrary legacy dashboard pages rendering for SUPER_USER while preserving the mandatory [institute] tree, the selected implementation supplies a **server-derived pathname request marker** in middleware, overwriting/discarding any client value on every forwarded request. The institute layout reads that marker and applies an exact route allowlist before invoking/serializing legacy children. Allow only institute root redirect and academic-operations/list/detail paths with matching selected supported institute. Missing/invalid/spoofed context fails closed for SUPER_USER; static-extension shortcuts must not forward an untrusted marker. This does not turn middleware into authorization: layout verifies the real session/role/path; every handler/action retains its own guards. Independent review must examine header propagation, normalization, rewrites and Next RSC/action requests. If the marker cannot be proven server-derived, stop and replace this design through a revised exact-file plan rather than trusting a caller header.

CourseInteriorLayout also requires role plus course/institute/enrollment authority before reading pending submission counts or showing course controls. Parent page protection cannot authorize direct actions. New oversight pages bypass this legacy course layout entirely.

Keep the frozen `course-supervision-readonly` region and exact title heading; no buttons/form/editable fields/mutation/execution menu items in that region. Scope selector and logout are outside it. Region links remain same-origin selected-institute academic-operations only. Keyboard/mobile shell behavior gets separate reviewed browser cases. Switching institute from detail drops the courseId and enters the target institute list, avoiding Topbar's legacy first-segment replacement behavior.

### Audit and mutation rules

Successful list: action SUPER_USER_ACADEMIC_OVERSIGHT_READ, adminId/targetId equal real Super User id, metadata JSON string containing selected institute and ALLOWED. Successful detail: SUPER_USER_COURSE_SUPERVISION_READ, same actor/self target, metadata also contains actual scoped courseId. Do not include join codes, content bodies, student data, tokens or arbitrary request fields.

Append through the shared authorized service before delivering data, including server-rendered reads. A failed append returns a safe server error with no DTO or RSC data; never silently continue. Use the existing schema and db adapter; no migration, retention rewrite or deletion. Do not describe the schema as immutable storage. Preserve all old audit rows and existing ACCOUNT_SUSPENSION/ACCOUNT_REACTIVATION behavior.

The access audit append is the sole new feature write. Existing auth login/logout/invalid-session cleanup remain lifecycle writes, not academic operations. Denied **active** SUPER_USER mutations preserve all non-audit public tables. Existing legitimate normal-role writes are regression targets; no opportunistic transaction/domain redesign. Supplemental logout/login tests use separate dummy sessions and clean them up; they must not revoke the frozen Super User session needed by later suites. Alias/archived/empty fixture changes occur only in disposable validation, serially with restoration, never by editing the frozen seeder.

## Finding dispositions

These dispositions reference preparation findings, not an invented independent red-team predecessor. ACCEPTED means the finding is valid and its remediation is included; it does not mean remediated or tested.

| Finding | Disposition | Reason, evidence and exact resolution |
|---|---|---|
| AF-01 unknown-role/student and generic-list/Admin fallback | ACCEPTED | admin-types.normalizeRole and api/courses final else confirm the issue. H-02 explicit roles/unknown rejection plus hard legacy ceiling; permission-injection supplementary case. |
| AF-02 auth-only course/workspace APIs | ACCEPTED | course detail/people/classwork/grades and workspace/_shared permit source-level bypasses. Guard every inventoried verb and scope actual related resources; deny Super User legacy paths. |
| AF-03 assignment/enrollment-only action rights | ACCEPTED | classwork/people/getStudentSession checks omit appropriate roles. H-09 role AND relationship AND institute, including child IDs and callable skills. |
| AF-04 institute-only activity execution | ACCEPTED | activity-eligibility, CodeLab run and separate Judge0 submit confirm the issue. Deny before any executor/template/rate side effect on all siblings. |
| AF-05 layout/home institute and inherited navigation | ACCEPTED | institute layout, Sidebar/Topbar, CourseInteriorLayout and MobileBottomNav Admin fallback confirm the issue. Dedicated shell and server-verified path guard with direct API/action enforcement. |
| AF-06 join-code/free-text privacy | ACCEPTED | frozen DTO plus joinWithCode establish sensitive join-code semantics. Human approved empty courseCode and redacted summaries; no select/log/embedding of original values; supplementary contaminated-content cases. |
| AF-07 audit scope/immutability | ACCEPTED | AuditLog String metadata/self User FK and createAuditLog establish actual storage. H-10 fail-closed access append and preserved history; no claimed DB immutability or universal legacy-denial requirement. |
| AF-08 primary/control source mismatch | ACCEPTED | preparation records differing schema/auth/layout and primary Forms. Human selected T/; all manifests bind to captured T/ hashes. |
| AF-09 frozen coverage minimum | ACCEPTED | 120 route files and 20 action files exceed frozen probes. Supplement complete inventory loops, aliases, own account, marker/RSC/shell, audit failure, archived/empty and token edges. No frozen assertion weakening. |
| AF-10 public student-data visibility | REJECTED AS FEATURE-SCOPE BLOCKER by explicit human U-01 decision; existing public behavior remains | T/api/public/leaderboard GET remains an existing public boundary. Human limits AC-007 to authenticated SUPER_USER academic-oversight responses and excludes anonymous leaderboard behavior. Preserve its public DTO/privacy semantics; this is a scope adjudication, not a security remediation or proof of privacy for public data. Independent review must challenge adherence to that boundary. |
| AF-11 claimed actor and inline-action bypass | ACCEPTED, HIGH | bulk-user-ingestion chooses actor from input.actorId; inline template actions only authenticate before writes. Bind to real session actor and require teaching role, actual course ownership and institute at invocation. Expand direct-action/real compiled-action tests. |

AF-10 has an explicit human scope adjudication, rather than an implemented fix. No independent red-team findings exist yet. This document is not a passing formal adjudication gate. Independent architecture/red-team review may add findings; each needs its own evidenced disposition, and a proposed fix alone never proves resolution.

## Remaining unresolved decisions and prerequisites

**U-01 — RESOLVED by human direction.** AC-007 applies to authenticated SUPER_USER academic-oversight responses only. Preserve existing anonymous public leaderboard behavior and its DTO/privacy semantics; anonymous public data is explicitly outside this feature's confidentiality guarantee. The bounded allowlist includes that route only for the previously proposed authenticated legacy role ceiling, not public response redesign. Do not remove/anonymize public fields or count existing anonymous behavior as an unresolved Super User feature finding. This does not resolve any new independent finding about authenticated oversight leakage or improperly expanded scope.

**U-02 — independent architecture/red-team applicability review, required.** No actual independent feature red-team predecessor exists yet. The reviewer must assess the middleware/path marker, full verb/action coverage, callable skills, residual title/name metadata, support exceptions, auth token resolution and test assertions. Documentary human directions do not replace a signed architecture subject where the unchanged harness requires one.

**U-03 — fresh reviewed exact-source preflight and test-artifact review, required.** SU-DTO-01/SU-TEXT-01 are human-approved stricter semantics but have not received the requested independent review or a new captured-source preflight. Seven frozen files remain unchanged. Supplementary suites, exact serialized action probes, audit failure adapter and fixture restoration require independent assertion-adequacy review before being treated as verification artifacts. A narrow audit-writer failure injection may simulate database insertion failure while real auth/scope/reads remain; it must be labeled as injection, not claimed as proof of PostgreSQL permissions/failure configuration. Positive access uses real AuditLog inserts.

**U-04 — authoritative plan and controller provenance, required.** The file/command manifests are exact review inputs, not a submitted plan DAG. Requirements/recon/red-team/adjudication/plan must be accepted through the unchanged lifecycle with actual hashes/provider receipts. Obtain genuine HIGH implementation approval afterwards. Do not change state/journal, bypass predecessors or acquire an implementation lease now.

**Role provisioning and future content approval are excluded**, not unresolved v1 permissions: no public/Admin UI grant of SUPER_USER, account conversion, description publication workflow or cross-institute login extension is included. Human operators must separately authorize any actual role provisioning. Audit retention/incident ownership remains an operational assignment, with no schema/policy mutation in this architecture.

## Exact implementation-file allowlist

The machine-readable manifest is the authoritative exact list for this architecture review. It contains **153 existing modification-eligible paths**, **10 new product paths**, and **5 new supplementary test paths**, all relative to T/. Each existing path exists and has a recorded baseline hash. Being eligible does not require an edit: already correct boundaries stay unchanged. Scope includes all 116 route files other than the unchanged health/institutes/service-webhook/logout routes, all 20 server-action files, and explicitly named supporting policy/layout/component/service files (duplicates removed).

For existing routes/actions, permitted changes are only capability/role/actual-actor/ownership/institute enforcement and safe authorization errors. No source is changed merely to make a test pass. UI changes only implement the approved dedicated role shell and normal-role alias compatibility. Middleware changes only provide trustworthy route context; no new resource authorization reliance on middleware.

Exact new product files:

```text
apps/web/src/lib/academic-authorization.ts
apps/web/src/lib/academic-oversight.ts
apps/web/src/types/academic-oversight.ts
apps/web/src/app/api/academic-oversight/[institute]/courses/route.ts
apps/web/src/app/api/academic-oversight/[institute]/courses/[courseId]/route.ts
apps/web/src/app/(dashboard)/[institute]/academic-operations/layout.tsx
apps/web/src/app/(dashboard)/[institute]/academic-operations/page.tsx
apps/web/src/app/(dashboard)/[institute]/academic-operations/courses/page.tsx
apps/web/src/app/(dashboard)/[institute]/academic-operations/courses/[courseId]/supervision/page.tsx
apps/web/src/components/academic-oversight/AcademicOperationsShell.tsx
```

No existing application file outside the JSON modify list may change without revised architecture/plan review. Schema/migrations, packages, apps/api/mobile/desktop, dependency files, source harness modules, scripts/harness, harness policies/configs, frozen tests, runtime repair artifacts and environment files are explicitly forbidden. Four unchanged supporting routes are reviewed as exceptions, not edit permission. Public auth/reset/register workflows retain existing anonymous behavior; active Super User cannot use them as role-granted account management.

## Exact test-command mapping

All commands are future-only, from T/ with trusted disposable configuration and unchanged runner. Their complete exact argv/test names/AC mappings are in the companion JSON. No shell commands, credentials, inline eval, custom loader flags or harness changes are proposed.

| ID | Program / exact arguments | Domain and required purpose |
|---|---|---|
| SU-TYPES | pnpm --filter web exec tsc --noEmit | static; unchanged web-typecheck floor |
| SU-BUILD | pnpm build:web | static; unchanged web-build floor; Prisma generation is not migration proof |
| SU-FROZEN-HTTP | pnpm exec playwright test tests/e2e/controlled/superuser-oversight.spec.ts --config .orchestra/harness/playwright.config.ts --project chromium | browser; all 14 frozen feature cases plus three auth-setup dependency names |
| SU-FROZEN-ACTIONS | node --import ./tests/server/controlled/bootstrap.mjs --test --test-concurrency=1 --test-reporter ./scripts/harness/test-reporter.cjs tests/server/controlled/superuser-actions.test.mjs | security; three frozen real-action/handler cases; supported boundary coverage only |
| SU-BOUNDARIES | Same node prefix, tests/server/controlled/superuser-architecture-security.test.mjs | security; seven exact new cases cover all ten boundary names, every inventoried verb/export, actor spoofing, unknown/permission injection and token edges |
| SU-ALIASES-AUDIT | Same node prefix, tests/server/controlled/superuser-aliases-and-audit.test.mjs | security; three new alias/ownership, audit failure, and account-support cases |
| SU-RUNTIME | Same node prefix, tests/server/controlled/superuser-runtime-regression.test.mjs | runtime; normal-role/Super User side-effect regression plus real unchanged control-gate rejection case |
| SU-PRIVACY-DESKTOP | pnpm exec playwright test tests/e2e/controlled/superuser-architecture-privacy.spec.ts --config .orchestra/harness/playwright.config.ts --project chromium | browser; four new cases including page/RSC/full-shell privacy, switching, active/empty/archive behavior and six inline-action replays |
| SU-PRIVACY-MOBILE | pnpm exec playwright test tests/e2e/controlled/superuser-shell-mobile.responsive.spec.ts --config .orchestra/harness/playwright.config.ts --project mobile-chrome | browser; distinct mobile-shell case; avoids duplicate normalized titles across projects |

Every browser invocation preserves three auth-setup dependencies named exactly `authenticate as student`, `authenticate as instructor`, `authenticate as admin`. No --no-deps/config override/retries or substitute server is permitted. The unchanged configuration selects the built server under E2E_USE_BUILD supplied by the runner; exact source/build/environment/run identity and run-local evidence must be captured. Serial tests use real opaque dummy tokens and Prisma/Next contexts. No broad auth/role/ownership mocking.

The criterion JSON maps AC-001–AC-012 to nonstatic commands and actual suite paths. Test titles are mandatory specs for future authors, not assertions already written or reviewed. Looped handler/action cases must assert each concrete candidate and preserve per-operation evidence; one group test cannot skip unresolved exports and claim inventory coverage. The inline replay test must exercise all six compiled action boundaries with genuine valid request payload/context and assert role denial before side effects. External calls are fail-closed intercepted at their dependency boundary, never run publicly to prove denial.

Audit-failure tests preserve the real authentication/scope/read/projection path, force only the audit append dependency to fail, assert a safe failure and no serialized DTO/private body, and separately verify real successful AuditLog inserts and preserved history. Disclose injection limits in results. Archive/empty/alias cases mutate only approved disposable fixtures during future execution and restore them; none modifies the frozen files or production state.

**AC-012 limit:** the runtime control-gate case probes genuine missing-approval/stale-source rejection against disposable control fixtures using unchanged validators. It does not prove this real run has approvals, current evidence or release readiness. Actual AC-012 completion still requires all fresh validation/review gates and valid real signatures; `pnpm harness:verify -- --run run_superuser_20261004` is a later release check, not a command to run or force to pass now. No migration/deployment command is mapped because that work is excluded. Applicable unchanged harness checks remain lifecycle requirements; no modifications are made to their floor.

## Frozen hashes and final review conditions

The allowlist and command mapping both embed the exact seven SHA-256 values from the preparation/frozen manifest. No fixture revision is requested by this adjudication: an empty courseCode and empty descriptive strings satisfy the original exact key/string shapes. The stricter semantics are enforced by separate supplementary assertions. If independent review requires removing the key, altering shapes or populating content, stop for human-approved contract revision, independent fixture review/freeze and fresh preflight. Never rewrite the old fixture contract silently.

The review artifact is ready for independent architecture/red-team inspection, **not a PASS submission**. U-01 is resolved. Before any implementation: independently assess AF dispositions and chosen boundary mechanics, review supplementary test contracts/adapters, obtain required fresh source-bound preflight/provenance and accepted predecessor stages, produce the authoritative scoped plan, and obtain real HIGH implementation approval. No approval or implementation lease is created here.

Preparation document, recorded source files, seven frozen hashes and run state/journal are checked for preservation after creating this bundle. Current source-level reads do not extend the historical external preflight window or re-open Docker/Sandbox repair. All authored output lives in primary-tree plans/ only.

Recorded preservation check for this preparation:

- All 1,337 files in the controlled expected snapshot matched; all seven frozen hashes matched.
- Preparation SHA-256 remained `54958ce3b8807730b2f5cbc90db0eb9bf76f2b51036c6fbea2427d8be7104485`.
- Controlled state.json SHA-256 remained `84cdd3d81d77a35fc6553d6794cf4839dcaf3f36a88c028150eb803263bbea4c`.
- Controlled journal.jsonl SHA-256 remained `840daff481602965173a75d374b587327defa3fb2b0359fd471581f336ba3aa8`.
- JSON manifests parsed successfully; zero duplicate allowlist paths or per-command test names; no unmapped AC IDs. These are document integrity checks, not executed product tests or passing architecture gates.
