# Super User academic oversight: requirements, recon, and proposed architecture

Prepared 2026-10-08 (Asia/Singapore). **Preparation complete; architecture decisions pending. This is not an executable approval or an accepted harness stage.**

Risk stays **HIGH**. Controlled run `run_superuser_20261004` stays **DRAFT**. Human implementation approval, feature implementation, and release readiness remain **NOT GRANTED / NOT STARTED**. Do not execute the implementation outline until the required human decisions and signed approval exist.

## 1. Authority, source identity, and evidence limits

Evidence labels used throughout:

- **R — requirement:** scope and twelve acceptance criteria preserved in the controlled intake. These are existing requirements, not permission to implement.
- **F — frozen verification contract:** independently reviewed fixtures and their proposed interface. Approval of the fixtures establishes their verification suitability; it does not approve the product architecture. The contract explicitly requires later acceptance or revision of endpoint, DTO, UI, and audit choices.
- **V — verified code:** observations from reading and hashing local files. No product behavior was executed in this preparation.
- **P — proposal:** concrete recommended implementation choice, awaiting human architecture adjudication.
- **H — human decision:** unresolved policy or scope decision. None is recorded as approved by this document.

Two source trees must not be confused:

| Tree | Identity and use |
|---|---|
| Primary checkout `C:/Users/kirby/Desktop/lms-monorepo-skeleton` | HEAD `2588732f7c75793679f56ff8fa87082ef4d2c4b2`; contains substantial pre-existing uncommitted work. Consulted for current architecture and drift; not the controlled implementation target. |
| Controlled source `C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/runs/controlled-superuser-20261004/task` | HEAD recorded as `aac054bfc42171b7de90c049a319f0d34ecf64b5`; snapshot digest `9c4cc7834a8615bfad1b11fe243287a49af292a866103dfe7e0de50b3922a1af`. Product recon below uses this tree unless marked primary. All 1,337 files named in the recorded expected snapshot matched their SHA-256 values during this preparation. This is a file-map comparison, not an independent reconstruction of the harness identity or a release verification. |

In this document, **T/** means the absolute controlled-source directory above; **R/** means the absolute primary-checkout directory above. Source references include repository-relative paths and symbols so a future executor can resolve them without this conversation.

The actual run files are **T/.orchestra/runs/run_superuser_20261004/state.json** and **journal.jsonl**, not R/.orchestra/runs/run_superuser_20261004. State projection observed: DRAFT, HIGH, attempt 1, repairCount 0, no lease, next requirements, empty artifacts and approvals. Journal contains INIT and INVALIDATE; the recorded attempt-0 requirements failure says repository identity changed. Do not erase that history or use the October 4 final manifest's older attempt-0 summary as current state. No accepted requirements, recon, red-team, adjudication, or plan artifact is present in the current projection. This preparation does not submit any of them.

Relevant retained evidence:

| Evidence | Location and interpretation |
|---|---|
| Intake | R/.orchestra/runs/controlled-superuser-20261004/controlled-input.json and T/.orchestra/harness/examples/superuser-oversight.context.md. Establish R scope and AC-001–012. |
| Frozen fixture review | R/.orchestra/runs/isolation-runtime-repair-20261005/frozen-fixtures.json and reviewed-tests-prerequisite-pass.json. Review session `01a10cd5-6693-7233-a499-73c177ef77de`, review hash `2a62cc5f59780490b6dc6531929504fff93f55197cdc725cb3a725b8d9d55e60`. Seven approved paths; no application/gate edits or human implementation approval. |
| Source/run capture | R/.orchestra/runs/isolation-runtime-repair-20261005/source-and-run.json, captured 2026-10-08 18:31:11.627 Singapore time. Same snapshot; DRAFT/HIGH; empty artifacts/approvals. |
| Preflight record | R/.orchestra/runs/isolation-runtime-repair-20261005/real-external-preflight-pass.json: recorded PASS, exit 0, signatureVerified true, featureApprovalGranted false. Captured receipt window: **2026-10-08 18:29:31.961–18:44:31.961 Singapore time**. This preparation reads that record; it neither verifies the external signature anew nor extends its validity. Receipt hash recorded as `6da7d01aa8dad2cf31d9ae22a3fad15523a8566a4cf0c8471fbb4f86f1b6caba`. |
| Historical readiness | R/.orchestra/runs/controlled-superuser-20261004/baseline-manifest.json and final-manifest.json. Historical infrastructure context only; their older missing-runtime/fixture-review descriptions are superseded by the human's supplied verification context. |

The human supplied real isolated microVM worker PASS, six fresh denial probes PASS, isolated Codex provider session PASS, frozen independent fixture review, and unchanged signed external preflight PASS for the captured window. These are accepted as supplied context. Docker/Sandbox repair remains closed. No runtime command, provider dispatch, probe, seed, database request, harness state transition, or message to another chat was performed here.

## 2. Frozen artifacts inspected and preserved

All seven files were located in T/, read, and matched the frozen manifest:

| T/ path | Frozen SHA-256 |
|---|---|
| tests/e2e/controlled/fixture.ts | `07ca56d76f370d82cbeca62e82611d4f5ff22c700c7da7d4ec0810b3a36f2155` |
| tests/e2e/controlled/seed-fixture.cjs | `8dd4a47a2fdf99bbacbe500fc86082d5f03ad5e45392ca8805249a837873eff8` |
| tests/e2e/controlled/superuser-oversight.spec.ts | `683a330a1fab4023348381226e4a41e5c9e3a906b23d9497c7c7843823849a3d` |
| tests/e2e/controlled/CONTRACT.md | `d4e0e501912f440b9afe5840907e0f7824940adad00c7796cdbb4c59ee7bdbb5` |
| tests/e2e/fixtures/test-accounts.ts | `238390c87d27b047c5453a1f523663bc0895397b1d3ecf1c0549f76251d76b81` |
| tests/server/controlled/bootstrap.mjs | `aba346b2686656110b6af03ca01d681a8664e188d718ff52d2afb3a052974852` |
| tests/server/controlled/superuser-actions.test.mjs | `a182ac934937b0a73ebe8856b962224ec6b8cb2aee55629b42165466ac2f04fe` |

The primary checkout does not have the frozen CONTRACT.md at tests/e2e/controlled/CONTRACT.md; its similarly named oversight spec is an older draft. Use T/ for the frozen contract. Candidate copies in the repair directory are not the source of authority. No artifact is missing from the seven-file set.

## 3. Architecture adjudication against actual code

AGENTS.md and .agents/rules/current-lms-architecture.md were read. The latter is aspirational in several material places:

| Verified observation | Evidence | Consequence / proposed disposition |
|---|---|---|
| Next.js web is the backend; apps/api has only a console-log placeholder. | T/apps/web/src/app/api; apps/api/src/main.ts; root/app package.json | Keep new routes and policy in apps/web. No dedicated backend extraction. |
| PostgreSQL schema is at root; db uses PrismaPg and pg Pool. User.role is String. | T/prisma/schema.prisma:31; apps/web/src/lib/db.ts | SUPER_USER needs no schema migration. No role provisioning operation is authorized. |
| Sessions are opaque DB-backed tokens, not a stateless signed-cookie payload. Cookie or Bearer authentication is supported; transitional session-id lookup exists. Inactive/expired sessions are deleted by existing auth helpers. | T/apps/web/src/lib/auth-session.ts:getSession; api-auth.ts:getSessionFromRequest | Preserve canonical real authentication. Treat inactive as unauthenticated for the frozen HTTP contract. Session cleanup is an existing lifecycle write, distinct from academic mutation. |
| Middleware checks page cookie presence and applies API headers; it never authorizes API resources. | T/apps/web/src/middleware.ts:middleware | Every API and direct action needs server policy. Navigation hiding is insufficient. |
| Institute layout permits cross-institute ADMIN only. | T/apps/web/src/app/(dashboard)/[institute]/layout.tsx:42 | A separate SUPER_USER scoped path policy is required; making SUPER_USER an Admin would violate R. |
| RBAC helpers differ from the architecture prose: hasPermission takes a permissions array; requirePermission takes one permission, with no institute argument. auth-guards.ts is absent. | T/apps/web/src/lib/rbac.ts; missing lib/auth-guards.ts | Do not call aspirational helper signatures. Proposed new institute/course policy must perform scope checks itself. |
| normalizeRole returns STUDENT for every unrecognized role, including SUPER_USER. | T/apps/web/src/lib/admin-types.ts:16–20 | Explicit SUPER_USER recognition and fail-closed unknown-role handling are needed. Never inherit student rights through normalization. |
| requirePermission trusts persisted permissions for non-Admins. | T/apps/web/src/lib/rbac.ts:116 | A SUPER_USER hard ceiling must override a forged/stale permission array; an empty default permission set alone is insufficient. |
| Generic course list's final else branch is the Admin view; detail GET authorizes only authentication. | T/apps/web/src/app/api/courses/route.ts:GET; courses/[courseId]/route.ts:GET | SUPER_USER must receive 403 on these legacy paths. Generic detail also needs role/institute/ownership policy adjudication; it currently returns instructor email and broader syllabus data. |
| People/classwork/grades GETs query student/private state after authentication only. Gradebook/enrollments/grading API already have explicit instructor/Admin gates. | T/apps/web/src/app/api/courses/[courseId]/{people,classwork,grades,gradebook,enrollments,submissions/grade}/route.ts | Do not reuse these DTOs for oversight. Preserve existing strict gates; close permissive paths before exposing the new role. |
| Workspace shared guard verifies session only. Events mutations use home institute and can run for any authenticated role. | T/apps/web/src/app/api/workspace/_shared.ts; workspace/events/route.ts | Deny SUPER_USER before payload validation or writes. No Calendar redesign is involved. |
| Activity eligibility tests ICS membership only; CodeLab run calls the executor after that test. | T/apps/web/src/lib/activity-eligibility.ts:52; api/{activities/submit,codelab/run}/route.ts | ICS Super User is currently eligible. Add explicit role ceilings before execution/submission, independent of institute/program claims. |
| Classwork/people action helpers permit matching instructorId without an instructor role; getStudentSession checks authentication only. | T/apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/actions.ts:ensureCourseInstructor; people/actions.ts:ensureCourseAccess; classwork/[itemId]/actions.ts:9 | Forged instructor assignment/enrollment/own submission must not grant rights. Require role plus ownership plus actual related-course scope. |
| Login locks non-Admin accounts to home portal; institute landing renders Unknown role for SUPER_USER; sidebar defaults unknown roles to student links; switcher is Admin-only. | T/apps/web/src/app/api/auth/login/route.ts; (dashboard)/[institute]/page.tsx; components/layout/{Sidebar,Topbar}.tsx | Proposed login at ICS, then explicit institute selection in the oversight shell. New landing/nav branches, no Admin fallback. |
| Course, CalendarEvent, Announcement, SyllabusItem, and AuditLog exist; no Program or dedicated timetable model exists. | T/prisma/schema.prisma:112,166,225,387,428 | Schedule means course-linked CalendarEvent summaries. No program tables or timetable migration. |

Primary-tree differences are real: auth-session adds React request caching; layout changes how institute/activity flags and data fetching are resolved; schema/classwork include a Forms suite absent from T/. Primary admin-types, rbac, and activity-eligibility match T/ after line-ending normalization, although byte hashes differ. Do not cherry-pick unrelated primary changes into the captured run. If the human chooses the primary tree as the implementation target, repeat recon, boundary enumeration, fixture review and source-bound preflight there; the controlled findings are not sufficient for its new Forms/Question Bank paths.

## 4. Supported roles and institute scope

**R:** Active `SUPER_USER` starts from ICS and explicitly selects `ics`, `ibe`, or `ite`. Selection is request/route state, not a mutation of User.instituteId or Session. No Faculty/Head/Dean hierarchy or additional Super User tier is in scope.

**P:** Use a discriminated server role resolver: SUPER_USER, ADMIN, INSTRUCTOR (DB aliases PROFESSOR/TEACHER/INSTRUCTOR), STUDENT, and an unauthorized UNKNOWN result. Only exact supported role strings after consistent case normalization count; caller headers/body claims never participate. SUPER_USER receives only `academic-oversight:read` / `course-supervision:read` capabilities. These capabilities do not feed the legacy administration permission matrix. requireAdmin remains ADMIN-only. requirePermission must refuse SUPER_USER legacy permissions regardless of persisted JSON.

| Actor | Dedicated oversight APIs/pages | Existing feature rights |
|---|---|---|
| Active SUPER_USER | List/detail in explicitly selected ICS/IBE/ITE | Deny administration, teaching, grading, enrollment, submission, assessment and execution privileges even if assigned/enrolled/owner. |
| ADMIN | 403 from dedicated APIs (F); page denied (P) | Preserve administration and existing authorized course reads/actions. |
| Assigned instructor and aliases | 403 from dedicated APIs (F) | Preserve authorized teaching in actual institute/course scope. |
| Unassigned or foreign instructor | 403 from dedicated APIs (F) | Deny course edits/grading outside authority; no header/program override. |
| Enrolled STUDENT | 403 from dedicated APIs (F) | Preserve approved-enrollment course access and owned work. |
| Other student / unknown role | 403 dedicated APIs (unknown role additional P coverage) | No rights gained from default role fallback. |
| Missing/invalid/expired/inactive session | 401 dedicated APIs (inactive/missing explicitly F) | No protected data; existing inactive-session cleanup may occur. |

**P scope resolution:** validate the route slug against the three supported lower-case values; resolve Institute by that code; query Course using **both id and instituteId** in one predicate. Resolve related records from the authorized course, never independently from request IDs. Return the same safe 404 for missing and foreign course IDs. Ignore `institute`, `instituteId`, `ownerId`, `program`, `programId`, duplicate query keys, and X-Institute/X-Program/X-Role/X-User-Id as authority; F expects successful IBE requests despite forged ICS claims. Unsupported/encoded slugs must fail before home-institute fallback. Recommended invalid-scope status is 400; routing may return 404 for unmatched malformed paths. Supported institute absent in DB returns 404.

**H:** The fixtures seed only an ICS-home Super User. Recommend any active SUPER_USER may select the same three institutes, with ICS as initial UI selection; home institute does not limit read authority. Decide whether product policy instead restricts which accounts may be provisioned as SUPER_USER. Do not enforce an invented home-ICS-only policy without a requirement decision.

## 5. Operations, API boundaries, and direct actions

**F proposed interface to accept or explicitly revise:**

| Boundary | Request | Success | Failure |
|---|---|---|---|
| GET /api/academic-oversight/[institute]/courses | institute route slug; no body | 200 list DTO below; access audit | 401 auth, 403 wrong role, 400 invalid slug, 404 absent institute, 500 safe server/audit failure (500 is P) |
| GET /api/academic-oversight/[institute]/courses/[courseId] | institute and opaque courseId route parameters | 200 detail DTO; access audit | Same, plus 404 missing/foreign course |
| /[institute]/academic-operations/courses/[courseId]/supervision | server page route | Read-only course region and same safe DTO | Login redirect if unauthenticated; safe forbidden/not-found page otherwise (P) |

**P:** Add a server-only policy/query module at apps/web/src/lib/academic-oversight.ts and DTO declarations at src/types/academic-oversight.ts. Route handlers authenticate using getSessionFromRequest(request); server components use getSession(). Both invoke the same role/scope/projection service. New server actions are unnecessary: the feature has no user-requested mutations. Existing server actions still require direct guards and cannot rely on the page layout. Do not internally fetch a generic course API or mount the instructor/student course component with controls disabled.

**P:** New API success/error responses use private no-store caching; render pages dynamically, avoid shared cached session/DTO data, and do not cache successful audit bypasses. Authentication and capability denial precede resource loading, body validation, executor calls, notifications, revalidation side effects and writes. Parameter parsing must not turn a role denial into a 400 or 404. No server-client object serialization beyond the DTO.

**F legacy read deny set, all 403 for active SUPER_USER:** /api/admin/users, /api/admin/permissions, /api/admin/audit-logs, /api/courses, /api/workspace/events, and /api/courses/[courseId] with suffixes empty, people, grades, gradebook, submissions, enrollments, classwork, stream. Fixtures cover normal and foreign courses plus a course assigned to SUPER_USER.

**F HTTP mutation deny set, all genuine 403 with safe JSON:** POST/PATCH/DELETE /api/workspace/events; POST /api/courses/[courseId]/submissions/grade; PATCH /api/courses/[courseId]/enrollments; POST /api/activities/submit; PATCH /api/admin/users/[userId]/status and /role. The escalation probe supplies real dummy reauthentication input; missing input cannot count as a denial.

**F direct action deny set:** instructorCreateCourse, instructorUpdateCourse, archiveCourse, unarchiveCourse, deleteCourse; create/update/deleteSyllabusItem; create/update/deleteAnnouncement; getOrCreateSubmission, submitWork, unsubmitWork, addSubmissionLink; returnGrade and updateGrade. These are called on ICS, IBE and the SUPER_USER-owned/assigned course. Real session lookup, Prisma, role and ownership checks remain in use. Genuine authorization exception/result required; generic failure, validation failure, missing function or lack of writes is insufficient.

**F direct execution:** api/codelab/run POST returns 403 for SUPER_USER and foreign instructor before executeJudge0Submission is called. The frozen suite intercepts only that external execution export with a fail-closed spy; invocation is itself failure. Do not invoke public Judge0 or local fallback while validating denials.

**P:** Treat the frozen deny set as a minimum, not an exhaustive privilege model. Complete the server entry-point inventory before the authoritative plan, covering sibling CodeLab run-tests/evaluate/progress/share/tutor/instructor endpoints, activity APIs, course broadcast/gradebook export, people/private-message/group actions, grading policy actions, workspace notes/tasks, Knowledge Exchange, uploads, and any server exports reachable without a page. SUPER_USER gets no implied legacy academic privilege. Preserve public content and minimum own-account authentication/logout as explicitly enumerated support exceptions; broader own-profile/settings/notification behavior requires H decision. Do not add a blanket denial inside getSession (that would break dedicated APIs and produce the wrong status). Enforce reusable domain capabilities at the actual handler/action/service boundaries, with explicit legacy role allowlists and SUPER_USER denials.

The exact final mutation/read boundary list and file manifest are a **remaining planning prerequisite**, not an already accepted scope. This document identifies the architecture rule and confirmed bypasses; it does not claim every legacy export has been audited.

## 6. Request and response DTOs

The following are **F exact shapes** from fixture.ts:106–139, proposed for architecture acceptance. No additional keys are permitted. Code below specifies the interface only; it is not application implementation.

```ts
type InstituteCode = 'ics' | 'ibe' | 'ite';
type InstituteDTO = { id: string; code: InstituteCode; name: string };
type InstructorSummaryDTO = { id: string; name: string };
type CourseSummaryDTO = {
  id: string; code: string; courseCode: string; title: string;
  section: string; subject: string; room: string;
  description: string; coverImage: string;
  instructor: InstructorSummaryDTO | null;
};
type ScheduleSummaryDTO = {
  id: string; title: string; eventDate: string;
  eventType: string; description: string;
};
type AnnouncementSummaryDTO = { id: string; content: string; createdAt: string };
type MaterialSummaryDTO = {
  id: string; title: string; type: string;
  description: string; dueDate: string | null;
};
type CourseSupervisionDTO = CourseSummaryDTO & {
  schedule: ScheduleSummaryDTO[];
  announcements: AnnouncementSummaryDTO[];
  materials: MaterialSummaryDTO[];
};
type CourseListResponse = { institute: InstituteDTO; courses: CourseSummaryDTO[] };
type CourseDetailResponse = { institute: InstituteDTO; course: CourseSupervisionDTO };
// F permits a nonempty object using only these optional string keys.
type ErrorResponse = { error?: string; message?: string; code?: string };
```

**P mapping:** explicit Prisma selects and explicit object construction, no spreading Course/User/SyllabusItem. Course scalar strings retain their existing values; normalize empty courseCode to course.code only if H accepts that semantic. Instructor projection is id/name only, no email/avatar/role. Dates serialize to ISO 8601; nullable dueDate stays null. Institute envelope comes from the explicitly selected record. New endpoints do not accept actorId/role/instituteId/permissions from the client.

**P schedule:** CalendarEvent rows where both courseId and instituteId match. Exclude personal/unlinked events, creator data, professorName, maxPoints and deepLink. CalendarEvent is a dated course event, not a recurring timetable; UI should label it "Course events" or accurately qualify the summary. Empty array means no recorded events, not proof there are no classes.

**P announcements:** authorized course's Announcement rows, projected to id/content/createdAt, no author record. **P materials:** only SyllabusItem type MATERIAL, projected to id/title/type/description/dueDate, with no attachments, target groups, submission state, maxPoints, interactive templates, hidden tests or answers. Include the seeded material. F does not adjudicate whether ASSIGNMENT/QUIZ summaries belong in materials; recommend exclude them initially. Deterministic ordering: courses by code/id, events by eventDate/id, announcements by createdAt/id, materials by orderIndex/id.

**H privacy conflicts needing resolution before accepting this DTO:**

1. `courseCode` is used by joinWithCode in courses/actions.ts:313 to create PENDING enrollment requests. It is not merely a catalog identifier. Decide explicitly whether Super User oversight may receive this join code. Recommended privacy choice: omit or redact it, which requires a reviewed revision to the exact frozen shape/semantics and fresh preflight. Alternatively explicitly accept its disclosure and retain the fixture shape. Do not silently label it harmless.
2. Course/event descriptions, announcement content and material descriptions are free text with no public/private classification. An allowlisted field can contain student names, grades or answer content. F markers prove only seeded absence, not production content safety. Recommend initially exclude assessment descriptions and render plain text only; humans must approve the content-publication policy or adopt redacted summaries with a reviewed fixture revision. Never claim string filtering alone proves semantic privacy.
3. F requires instructor id/name even when the assigned instructor is SUPER_USER. The fixture uses that adversarial assignment. Recommend retain this limited instructor relationship summary; do not interpret it as a grant of teaching privileges.
4. Course coverImage is a stored string. Recommend render only approved image URLs or a local placeholder; do not fetch arbitrary server-side URLs, expose credentials in signed URLs, or allow user-provided HTML. No material/download links are part of the DTO.

**H completeness:** F list has no pagination/total/cursor fields and asserts the exact seeded course set. Decide whether to list archived courses and whether all course summaries are returned in one response. Recommend active courses only for v1, all rows without silent truncation; archived oversight and pagination are separate contract changes. The fixture has no archived-course case, so this choice is not established by its PASS. Query limits for summaries must not silently change promised completeness; choose complete arrays for v1 or explicitly approve/review a bounded-summary contract.

## 7. Authorization, ownership, and database mutation boundaries

**P ordered boundary checks:** real session → active status → recognized capability → supported selected institute → scoped course → scoped child records → allowlisted projection → successful audit append → response. Preserve 401 versus 403 semantics. For actions, validate role before child-resource or payload operations; errors must identify unauthorized/forbidden/instructors/students-only as appropriate to the existing action contract.

Normal-role authorization is conjunctive: instructor role plus assigned instructorId plus institute scope; student role plus actual course enrollment and ownership of the related submission; Admin retains existing administration policy. Request courseId/itemId/submissionId/attachmentId/groupId must be checked through their actual persisted relationships. A navigation/revalidate instituteCode parameter is not authority. An instructorId match or enrollment does not grant a SUPER_USER capability.

**R/F:** no product schema change, role conversion, account provisioning, schedule edit, teaching write, enrollment edit, submission write, assessment execution, or gamification side effect for SUPER_USER. Its new feature queries read Course, Institute, instructor id/name, CalendarEvent, Announcement and selected SyllabusItem metadata. It must not retrieve StudentSubmission, student/enrollment identities, ActivitySubmission, ActivitySession, answers, hidden test cases, private comments, grade matrices or execution logs for projection.

**P authorized write exception:** append oversight access evidence to existing AuditLog. Read-only academic supervision means academic records are unchanged; it does not mean zero database writes when auditing access. Existing auth lifecycle cleanup of invalid/inactive sessions is another separate behavior. Denied active SUPER_USER mutations must leave every non-audit public base table unchanged, including Session, User, attachments, notifications, gamification and assessment state. Do not "repair" fixture ownership data or silently auto-enroll/synthesize templates.

**P multi-model safety:** no new multi-model feature writes. Existing legitimate teaching paths should keep their behavior; any ownership hardening must guard before side effects. Do not opportunistically refactor their transactions without adding scope to the human-reviewed plan. No schema generation, migration, seed or database connection is part of this preparation.

## 8. Audit policy

**F successful access events:**

| Operation | AuditLog.action | actor / target | JSON-encoded metadata |
|---|---|---|---|
| Course list | SUPER_USER_ACADEMIC_OVERSIGHT_READ | adminId = authenticated Super User id; targetId = same id | `{institute: selectedCode, outcome: 'ALLOWED'}` |
| Course detail | SUPER_USER_COURSE_SUPERVISION_READ | Same self target | `{institute: selectedCode, courseId: scopedCourseId, outcome: 'ALLOWED'}` |

V: AuditLog.metadata is String; both adminId and targetId reference User. The self target fits those foreign keys without a migration. Existing createAuditLog in rbac.ts:170 JSON-encodes metadata and inserts a row; its "immutable" comment is not database immutability enforcement. Existing rows must remain byte-equivalent/preserved under fixture checks. Do not delete or modify them. No password/token, student/grade/answer data, arbitrary request payload, or raw sensitive text in logs. IP addresses, if stored, require trusted proxy handling; getClientIp currently accepts caller-supplied forwarding headers and is not evidence of reliable identity.

**P:** Append one list/detail access event at the shared authorized service boundary, including server-page access if it loads the same data. Fail closed with a safe error if audit append fails; never deliver data while silently dropping the required audit. Avoid duplicate audit writes caused by a page both fetching internally and loading directly. Existing schema timestamp supplies server time. Application writes are append-only by policy; independent retention/DB immutability is not claimed.

**F denials:** controller-fixture evidence records actor, institute, target, operation, status/result, timestamp, run/environment and before/after hashes. The frozen contract does **not** impose a new application AuditLog row for every legacy 403. Admin status changes must still create ACCOUNT_SUSPENSION / ACCOUNT_REACTIVATION entries.

**H:** Accept this minimum denial-evidence policy, or explicitly require application denial auditing for defined operations. Recommended add dedicated oversight authentication/authorization-denial operational logs without secrets if needed; do not invent a user FK for unauthenticated callers or echo foreign-course metadata. Additional application-denial requirements require reviewed test changes and exact-source preflight. Audit retention, access reviewers, and incident ownership need a named human owner; none is established by the supplied artifacts.

## 9. UI behavior and route integration

**P:** Add /[institute]/academic-operations and /[institute]/academic-operations/courses as the Super User landing/list. Existing institute root dispatches SUPER_USER there, starting ICS after normal home-portal login. Keep these routes within the mandated dashboard institute tree and reuse web's existing theme/layout components, not unused packages/ui.

The institute selector offers ICS/IBE/ITE, clearly displays selected scope and updates the route. Switching from a detail page goes to the new institute's course list; do not retain a foreign courseId by replacing only the first pathname segment (Topbar's current Admin switching behavior does that). Do not mutate User.instituteId or Session, default every API to home institute, or change Admin's existing switcher behavior. Direct navigation to IBE supervision with an ICS Super User must preserve the IBE URL.

The common dashboard layout must admit SUPER_USER selected-institute oversight without opening student/teacher/Admin subtrees. Proposed defense: explicit server guards at legacy subtree boundaries plus direct action/API policies. If a path-aware parent gate is used, its request path must be server-derived; a client header cannot supply a trusted route. The authoritative plan must enumerate how every legacy subtree is protected rather than merely expanding `isAdmin`.

Use a separate SUPER_USER navigation branch with Academic operations and course supervision only. Suppress course editing, people, grades, classwork execution, enrollments, Calendar/notes/tasks management, student shortcuts, Admin links, Knowledge Exchange and grade/submission notification widgets. Preserve approved account logout; own-profile/settings behavior is H scope. A nested page using the old shell must not leak grade notifications outside its read-only course region. Existing NotificationBell loads own-user notification messages; adversarial enrollments can make these academic notifications relevant even without student role.

**F detail region:** `data-testid="course-supervision-readonly"`, exact course-title heading, visible and containing only course metadata/instructor/course-event/announcement/material summaries. No form/input/textarea/select/contenteditable, mutation/execution control, button, role=button, or role=menuitem inside this region. Place institute selector and shell controls outside. Region links, if any, stay same origin under the selected institute's academic-operations paths; no grade/submit/edit/classwork/activity/assessment links. Never render assessment launch/download widgets or student profiles.

**P additional UX acceptance:** selected scope persists on reload via URL; loading and empty states name that institute; missing/foreign course gets the same safe page; errors offer read-only recovery outside the protected course region. Mobile selector is keyboard-accessible with meaningful labels/focus. Text renders escaped, not via unsafe HTML. Themes follow selected institute (ICS orange, IBE gold, ITE blue). No design overhaul or Calendar work.

## 10. Acceptance matrix and frozen negative coverage

All rows remain product validation **not executed** in this preparation. F coverage is a test assertion set, not proof of implemented behavior.

| Criterion | Required outcome | Existing frozen verification / gap |
|---|---|---|
| AC-001 | SUPER_USER academic oversight only, no generic Admin/teaching/grading/student privileges | Prohibited identities on list/detail; legacy read denials; typed HTTP mutation and direct-action denials including own assignment/enrollment. Unknown-role and persisted-permission injection need additional reviewed cases. |
| AC-002 | Explicit selected supported institute is server scope | All three institute positive cases, foreign pairs, unsupported/encoded slugs, query/header claims. Case policy and absent-institute behavior need explicit decision/cases. |
| AC-003 | Only selected institute academic information returned | Exact list sets and detail institute envelope; manipulated IBE route must remain IBE. Archived/large-list completeness not covered. |
| AC-004 | Dedicated read-only course supervision | Exact detail DTO; schedule/material/announcement IDs present; IBE page URL, heading, read-only region. UI institute switching/empty states are proposed additional acceptance. |
| AC-005 | Foreign course denied/not found, no foreign data | Every distinct selected/foreign institute pair must return 404, safe error, no foreign title. Missing-course indistinguishability is proposed additional case. |
| AC-006 | No edits/grading/submission/assessment execution | Eight typed HTTP mutation probes per institute; 17 direct action probes across three course fixtures; real CodeLab handler with zero executor calls. Sibling services/actions remain supplementary scope. |
| AC-007 | No student identities, grades, submissions, attempts, answers or execution data | Exact recursive DTO allowlist; sensitive markers in success/error/body/DOM; legacy reads forbidden. Free-text production classification and shell notification leakage are unresolved. |
| AC-008 | Existing Admin/assigned instructor/student access preserved | Generic detail GET 200 for three normal roles; Admin status false/true persisted with audits; assigned instructor HTTP grade; direct owned course edit and student submit; unassigned/foreign teaching and other-student ownership denials. TEACHER/INSTRUCTOR alias behavior is not separately executed by the frozen identities (assigned instructor is PROFESSOR). |
| AC-009 | Inactive and other roles cannot forge oversight | Missing/inactive 401; Admin/instructor/student/foreign/unassigned 403; forged owner/query/headers/program deny. Expired, revoked, conflicting Cookie/Bearer and unknown role cases need additional reviewed coverage. |
| AC-010 | Real direct server/API/action authorization | HTTP routes and direct imported real actions; seven active-role session preconditions; real DB ownership/roles and Next storage; only external executor adapted. No tests executed here. |
| AC-011 | Reviewed access and sensitive denial evidence | Required access audit action/actor/target/scope/outcome; all public tables except AuditLog/migrations fingerprinted around active Super User denials; prior audit rows preserved; controller evidence. No universal application-403 audit policy inferred. |
| AC-012 | Fresh exact-source evidence, independent reviews and actual HIGH approvals before RELEASE_READY | Lifecycle requirement, not proved by product tests or the fixture review. Current accepted stages/approvals are empty. Captured preflight cannot establish future freshness. |

Frozen browser spec expands to **14 named tests** (three identity checks, three positive scope checks, three mutation checks, plus IDOR, manipulation, generic reads, normal-role preservation, and DOM). The direct suite has **three named tests**. Counts are derived from source, not a new discovery run. All ten named security boundaries are retained: authentication, authorization, ownership, institute-scope, program-scope, IDOR, privilege-escalation, direct-api, request-manipulation, sensitive-data. Program coverage means the existing ICS eligibility boundary; no Program model was invented.

Verification-fixture limits must accompany eventual reports: all seeded fields are benign summaries; frozen tests are not exhaustive over all endpoint variants, rendered RSC payloads, audit failure, every alias, concurrent revocation, or primary-tree Forms. Supplementary acceptance cases must be independently authored/reviewed in separately approved files, preserving frozen files. If the accepted contract changes, stop for human adjudication, new fixture review/freeze and exact-source preflight; do not quietly change assertions to make implementation pass.

## 11. Findings and proposed dispositions for human adjudication

All findings are pre-existing relative to the controlled baseline. These are advisory dispositions, **not accepted independent red-team/adjudication artifacts**.

| ID | Finding / impact / evidence | Proposed disposition | Effort / fix risk / confidence |
|---|---|---|---|
| AF-01 | Unknown→STUDENT and generic list else→Admin can give new role unintended access. admin-types.ts:16; api/courses/route.ts | Resolve with explicit SUPER_USER/unknown handling and hard legacy permission ceiling before rollout. | M / HIGH / high |
| AF-02 | Auth-only course/private APIs and workspace guard admit Super User reads/writes. courses detail/people/classwork/grades; workspace/_shared.ts | Resolve every scoped bypass at handler/service boundaries; keep normal authorized behavior. | L / HIGH / high |
| AF-03 | Assignment-only helpers and authentication-only student helper grant forged ownership rights. classwork/actions.ts, people/actions.ts, classwork/[itemId]/actions.ts | Resolve role plus relation/ownership checks before writes. Add supplementary uncovered-export cases. | M / HIGH / high |
| AF-04 | Home-ICS eligibility permits executor and activity submission. activity-eligibility.ts; codelab/run | Resolve explicit role ceiling before parsing/execution/template creation; retain actual normal-role policy. | M / HIGH / high |
| AF-05 | Cross-institute layout and generic shell incompatible with oversight-only Super User. layout.tsx:42; Sidebar/Topbar | Resolve dedicated route access/nav without Admin alias; guard legacy subtrees. | M / HIGH / high |
| AF-06 | Proposed allowed join code/free text can exceed intended privacy meaning. fixture.ts:106; courses/actions.ts:313; schema strings | Human policy decision required; approve exact disclosure semantics or reviewed contract revision. Cannot mark resolved from benign fixtures. | M / HIGH / high |
| AF-07 | Audit is application append-only, not schema-enforced immutable; denial policy not universal. schema AuditLog; rbac.ts:170; CONTRACT.md | Accept minimal policy or define extra controls; fail closed on mandatory access audit failure. | M / HIGH / high |
| AF-08 | Primary tree differs from captured controlled source, including Forms. root schema/auth/layout versus T/ | Bind authoritative implementation plan to T/; primary integration requires separate recon/fresh evidence. | M / HIGH / high |
| AF-09 | Frozen minimum does not exhaust alternate endpoints, aliases, role provisioning or permission injection. spec/action suite versus entry-point inventory | Supplement independently reviewed cases and exact file inventory before implementation approval. Never weaken frozen tests. | L / HIGH / high |

No HIGH finding is deferred into an approved implementation by this document. The risk remains HIGH; no claim of secure runtime behavior is made from source reads.

## 12. Exact decisions the human must approve

Every row is **PENDING**. Approving architecture choices does not grant implementation permission.

| Decision | Concrete recommended choice | Alternative / required consequence |
|---|---|---|
| H-01 Source and scope | Use T/ captured controlled source, read-only academic oversight, no schema/deployment/Calendar changes. | Primary target requires new recon including Forms and refreshed source-bound contracts/evidence. |
| H-02 Role authority | Explicit SUPER_USER read capabilities; UNKNOWN unauthorized; legacy permission ceiling; teacher aliases canonicalized; no Admin/student inheritance. | Any richer rights or hierarchy require new requirements and risk review. |
| H-03 Institutes and entry | Active Super User can explicitly select ICS/IBE/ITE; ICS initial selection; no persistent home-institute mutation; normal home-portal login remains. | Home-ICS-only provisioning or login-from-any-institute needs explicit policy and additional tests. |
| H-04 Interfaces and failures | Accept F endpoint/page paths, exact DTO envelopes, active wrong-role 403, inactive/missing 401, foreign/missing course 404, unsupported slug 400/unmatched 404. | Any revised interface requires independent fixture revision and new exact-source preflight. |
| H-05 Sensitive summary semantics | Explicitly decide join-code disclosure, allowed free text, instructor id/name, safe cover images. Recommend redact join code and keep only approved public summaries. | Recommended redaction changes F and requires review; retaining exact F fields requires explicit disclosure-policy acceptance. This is unresolved, not silently approved. |
| H-06 Schedule/material meaning | Course-and-institute-linked CalendarEvent summaries; MATERIAL-only syllabus summaries; no assessment content, attachments, groups or deep links. | Broader assignment/quiz summaries must define safe description policy and reviewed coverage. |
| H-07 Completeness | Active courses, no silent list truncation; deterministic complete summary arrays for v1. | Archived oversight, pagination, count/cursor/bounded summaries need contract decisions and tests. |
| H-08 Legacy boundary scope | SUPER_USER denied every legacy academic/admin/student operation, minimum explicit deny set plus inventoried sibling paths; auth/logout support exceptions only. | Profile/settings/notifications/personal workspace rights require an explicit allowlist; unknown residual endpoints block complete planning. |
| H-09 Normal-role rules | Preserve legitimate Admin, assigned same-institute instructor aliases, enrolled student ownership; role plus actual relation checks. | Clarify exceptional cross-institute instructor/Admin behavior before hardening affected APIs; do not assume it from assignment alone. |
| H-10 Auditing | Accept F action names/self target/JSON-string metadata; append-only application behavior; fail-closed access audit; minimum controller denial evidence. Name retention/security owner. | Additional application denial audits or database-enforced immutability need requirements, reviewed fixtures, and possibly schema scope change. |
| H-11 UI | Dedicated Super User landing/list/supervision shell; URL scope; switch detail→target list; no legacy learning/Admin widgets or notification leakage. | Any broader navigation or academic mutation is new scope. |
| H-12 Verification gaps | Independent supplementary tests for aliases, unknown roles, persisted permissions, sibling bypasses, page/RSC/shell privacy, audit failure, archive/empty behavior, bearer/cookie negatives. Preserve seven frozen files. | Accept explicit reduced coverage only via human requirement/architecture adjudication, never an agent-authored PASS. |

Implementation start also requires the full HIGH-risk lifecycle prerequisites: accepted requirements, recon, independent architecture red-team, all findings adjudicated with no unresolved human items/high deferrals, exact-file plan and test-command mapping, and genuine signed human implementation approval bound to those artifacts/source/risk. Obtain architecture-purpose approval where the unchanged harness requires it. This prose is not a signature, lease, controller submission, or proof those gates passed.

## 13. Future implementation outline (conditional; not authorization)

After H decisions and before implementation approval, the planner must resolve each path below against T/ and produce the final exact allowlist. A directory description here is not authorization to edit all its descendants.

1. **Resolve contract decisions and boundary inventory.** Map every sensitive handler/action caller; specify support exceptions; decide privacy text/join-code policy, schedules/materials, archive behavior and audit failures. Preserve AF findings for independent red-team. If F changes, arrange fresh independent fixture review/freeze and source-bound preflight without touching the closed runtime repair work.
2. **Define role/policy/DTO modules.** Proposed new src/lib/academic-oversight.ts and src/types/academic-oversight.ts; targeted changes to src/lib/admin-types.ts and rbac.ts. Inventory normalizeRole consumers (including bulk ingestion and eligibility); no automatic addition of SUPER_USER to public registration or Admin role-management choices. Existing role endpoint currently has VALID_ROLES ADMIN/INSTRUCTOR/STUDENT; provisioning is a separate human operational decision.
3. **Close bypasses first.** Explicit guards for confirmed generic reads, workspace event methods, activity/execution and direct ownership helpers; actual-course relation checks. Include exact relevant files in the approved plan, including any additionally inventoried sibling paths. Do not modify source merely to satisfy a frozen probe or rely on superficial deny patches while leaving aliases open.
4. **Add oversight service and routes.** New api/academic-oversight/[institute]/courses/route.ts and courses/[courseId]/route.ts, explicit select/DTO mapping, selected scope, safe statuses, access audits and no-store. Reuse real db/session helpers without schemas/migrations.
5. **Integrate dedicated pages/shell.** New (dashboard)/[institute]/academic-operations/page.tsx, courses/page.tsx and courses/[courseId]/supervision/page.tsx (and a scoped layout if needed); targeted existing institute layout/landing, Sidebar, Topbar, DashboardLayout changes. Guard legacy subtrees with server policy; suppress sensitive widgets for Super User without breaking other users. All routing remains beneath [institute].
6. **Independently verify exact approved source in disposable infrastructure.** Test author adds only separately approved supplementary tests; frozen fixtures remain fixed. Execute mandatory build/static/product commands through the unchanged controlled runner; then independent QA/security/code-review/release reviews. No production deployment is in this task. A failed product test calls for a truthful source fix within approved scope or human contract adjudication, never gate/fixture weakening.

Candidate existing files needing explicit final scope consideration: apps/web/src/lib/{admin-types,rbac,activity-eligibility,kx-eligibility}.ts; api/courses/route.ts; api/courses/[courseId]/{route,people/route,classwork/route,grades/route,stream/route,submissions/route,gradebook/route,enrollments/route,submissions/grade/route}.ts; api/workspace/_shared.ts and events/route.ts; api/activities/submit/route.ts; api/codelab/run/route.ts; (dashboard)/[institute]/courses/actions.ts; courses/[courseId]/{classwork/actions,stream/actions,people/actions,classwork/[itemId]/actions}.ts; institute layout.tsx/page.tsx; components/layout/{Sidebar,Topbar,DashboardLayout}.tsx. Existing already-strict handlers may require review/regression evidence rather than edits. No source file is authorized by being listed here.

The final planner must supply recovery as rollback of code exposure/feature access, preserving AuditLog history; no Git revert is represented as database recovery. A schema need, broadened role rights, uncontrolled endpoint, unavailable safe content classification, or stale source identity is a STOP condition for human adjudication.

## 14. Future verification commands and completion criteria

Commands read from T/package.json and the frozen CONTRACT.md; **none run in this preparation**:

| Purpose | Command | Required result after approval/implementation |
|---|---|---|
| Web types | pnpm --filter web exec tsc --noEmit | Exit 0 on controlled source. Command is a developer check; planner must map the permitted harness static command. |
| Web build | pnpm build:web | Exit 0 with explicit disposable configuration and clean isolated checkout. Runs Prisma generation; not a migration or security proof. |
| Frozen browser/direct HTTP | pnpm exec playwright test tests/e2e/controlled/superuser-oversight.spec.ts --config .orchestra/harness/playwright.config.ts | All 14 source-derived named tests executed/passed, no skips/retries/only; fresh runner evidence and build source identity. |
| Frozen direct actions/handler | node --import ./tests/server/controlled/bootstrap.mjs --test --test-concurrency=1 --test-reporter ./scripts/harness/test-reporter.cjs tests/server/controlled/superuser-actions.test.mjs | All three named tests executed/passed; real seven-role session preconditions; zero executor calls. |
| Harness controller checks | pnpm harness:typecheck; pnpm harness:test; pnpm harness:check (separate commands) | Applicable unchanged mandatory checks pass; never substitutes for product authorization behavior. |
| Release evidence | pnpm harness:verify -- --run run_superuser_20261004, from approved controlled task root | Exit 0 only after all mandatory independent gates and valid approvals exist; current DRAFT cannot pass release. |

The unchanged runner requires explicit loopback disposable PostgreSQL harness_* configuration, no loadable live .env files in the task, reviewed host-private dummy fixtures and correct locator/run/source binding. Do not read host-private fixture JSON into agent context or forward live environment files. Seed/setup mutates a disposable DB and is not authorized by this preparation; future operators must use the approved procedure. No install, build, test discovery, seed or product assertion was executed here.

Future done criteria: exact approved DTO and privacy semantics; selected-institute scope and foreign-ID denial; explicit role ceiling on every inventoried academic path; no forbidden side effects; access audits and preserved audit history; normal-role regression positives/negatives; safe dedicated UI/RSC/shell; frozen and supplementary independently reviewed tests; fresh mandatory exact-source evidence; independent reviews; valid genuine HIGH human approval; unchanged harness gates/isolation; only approved source paths changed. Release readiness remains a separate result of those gates.

## 15. Missing evidence and preparation completion

Located: controlled intake/state/journal, seven frozen files and manifest/review receipt, captured source/run and external-preflight record, actual supporting schema/API/action/UI code. No frozen artifact contents were invented. Missing for implementation start: accepted stage artifacts, independent feature architecture red-team and formal adjudication, H-01–12 human resolutions, authoritative exact-file plan, supplementary review evidence, and signed human implementation approval. Missing for release: implementation plus all fresh product validation and independent downstream reviews.

This was a targeted Super User preparation, not a whole-monorepo security certification. All relevant frozen tests were read; confirmed supporting security boundaries were inspected. Every legacy route/export, mobile/desktop behavior, live data classification, signer/runtime state and infrastructure signature were not independently re-audited. Existing primary changes, controlled source, harness, frozen fixtures, database and runtime repair artifacts were left untouched. The only outputs authored are this preparation document and plans/README.md in the primary checkout.
