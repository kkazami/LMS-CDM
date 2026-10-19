# V1 Super User scope correction

2026-10-09, Asia/Singapore. **Document-only product/scope adjudication. Stop after this package.**

Primary objective: secure SUPER_USER academic oversight for the human-approved V1 hierarchy, not repository-wide LMS remediation. The new hierarchy is an explicit human product decision, **not implementation authorization**. No application source, schema/database, seven frozen fixtures, supplementary product tests, harness gates, lease or approval is changed/created. No further provider review is launched in this turn. Calendar and the closed Docker/Sandbox repair remain outside scope.

Target T/ remains `C:/Users/kirby/Desktop/lms-monorepo-skeleton/.orchestra/runs/controlled-superuser-20261004/task`. Captured source digest remains `9c4cc7834a8615bfad1b11fe243287a49af292a866103dfe7e0de50b3922a1af`. Actual controlled run `run_superuser_20261004` remains DRAFT/HIGH, next requirements, no lease and no implementation approval. Original 006/009/010 findings, receipts and inputs remain historical evidence, not rewritten PASS records.

## Bounded objective and package

V1 feature work is limited to explicit Super User identity/capabilities, selected-institute authority, cross-institute academic oversight, dedicated read-only course supervision, Institute Admin account management explicitly needed by the hierarchy, and minimum authorization/normal-regression corrections supporting those boundaries.

Reporting hierarchy: **SUPER_USER → INSTITUTE_ADMIN → PROGRAM_HEAD designation → INSTRUCTOR**, with regular STUDENT users beneath teaching. This hierarchy does not give SUPER_USER ordinary Admin, instructor, grading, submission, assessment/execution or general permission-management powers. New targeted Institute Admin management is a distinct capability, not an Admin alias or universal users API bypass.

Package:

- [Corrected source inventory](011-corrected-172-operation-inventory.json): 120 exact route files, **172 actual exported/aliased operations**, implementation targets/source hashes, actual/proposed actors/roles/relationships, source-level Super User reachability and minimum boundary mechanism.
- [Every R2 finding's scope classification](011-r2-scope-classification.json): 25 design findings and 109 independently reported baseline risks, separately retained under session-qualified identities. Categories A/B/C classify scope, not remediation or severity.
- [Out-of-scope LMS security backlog](011-lms-security-backlog.json): preserves 94 C-classified records/evidence. Their severity remains; they are not Super User implementation blockers.
- [Bounded future file allowlist](011-bounded-file-allowlist.json): exact paths and hashes, allowed feature-only hunks, shared-helper cases, review-only exceptions and pending hierarchy/contract decisions. It is not a approved implementation plan or file-write permission.

For the **25 R2 design findings**, classification is **6 A / 8 B / 11 C**. For all **134 retained R2 records**, classification is **29 A / 11 B / 94 C**. Mixed findings retain any extra password/OAuth/replay/telemetry issues as C slices; classifying a record A never authorizes fixing all collateral defects in its source file.

## Scope test and finding semantics

**A — Super User boundary blocker:** demonstrated reach/inheritance, a possible ceiling bypass, or an authorization boundary directly required by V1 oversight/Institute Admin management. Required change is the minimum ceiling, actual actor, scoped query/target, or dedicated capability. A speculative role-family label is not proof of reach; unresolved evidence requires narrow review before final planning.

**B — Required normal-role regression:** actual behavior/alias/creation/ownership case explicitly accepted for this feature would otherwise be broken by the shared role/hierarchy changes. Preserve legitimate operation-specific roles and create branches. Do not treat every normal-role vulnerability as B.

**C — Separate LMS security debt:** after the actual Super User entry/shared ceiling, a defect affecting only ordinary actors and not an accepted regression is separate. Retain it with original severity/evidence and future backlog ownership; omit its remediation from the feature allowlist and do not block Super User on it. No claim that C is safe or fixed.

The intended boundary inventory remains complete even for C: documenting a method does not authorize rewriting it. A file containing C may still need a small A ceiling or V1 Institute Admin scope hunk; its reward/OAuth/upload/storage/KX/calendar internals remain outside that hunk. Conversely, an already effective raw Student/instructor/Admin role check can require only verification, not another guard or cleanup edit.

## Human hierarchy compared with older contracts

| Earlier requirement/code | Human V1 decision | Exact affected contract / disposition |
|---|---|---|
| AC-001/Super User context: academic reads only; no generic Admin/teaching/student privileges | Academic reads plus explicit Institute Admin creation/suspension/management | AC-001 needs a targeted account-management exception. Generic Admin/teaching/student privileges remain denied. Do not modify the frozen requirement file now. |
| AC-006: Super User has no account/admin mutation; frozen probes deny generic account status/role changes | Super User can manage Institute Admin accounts only through dedicated authority | Amend mutation expectations to distinguish dedicated IA targets from generic users, students/instructors and role escalation. Existing frozen probes target STUDENT ADMIN_TARGET via generic /api/admin paths and must continue to deny; new IA cases require separate reviewed contract/tests later. |
| AC-008: preserve existing ADMIN administration; code/layout treats ADMIN as globally authoritative | INSTITUTE_ADMIN is exactly one institute | Global cross-institute ADMIN behavior is explicitly superseded by this product decision, but legacy account/role transition is unresolved. Frozen same-ICS Admin positives may remain compatible if an approved ADMIN→IA alias is selected; do not assume that mapping. |
| Scope H-01/intake excludes faculty/head/Dean management and broad migrations | Program Head is a program-scoped instructor designation within V1 reporting | Report designation/assignment gap; no generic PROGRAM_HEAD system role, program catalog or fabricated program IDs. Exact head powers/representation need human decision before any delegation. |
| H-02 and generic requireAdmin/permission matrix expose roles ADMIN/INSTRUCTOR/STUDENT | Explicit SUPER_USER and INSTITUTE_ADMIN; no inherited generic privilege or new permission-management system | New resolver/fixed capabilities and actual IA institute scope; do not add Super User to legacy permission matrix or role grant APIs. Legacy ADMIN semantic transition must be decided. |
| H-03 intake only ICS/IBE/ITE; institute selection changes route only | Whole-LMS/cross-institute academic oversight | Route/request selection remains server-validated; decide whether whole V1 is the existing three institutes or every actual institute record. No institute creation/catalog/integration privilege inferred. |
| H-08 support exactly login/logout/me; 008 creates only read-only academic shell | Targeted IA management has required mutation UI | Preserve basic support exception and read-only course-supervision region; put IA management in a separate dedicated section/capability, never inside `course-supervision-readonly`. No general profile/password/session/OAuth management granted by convenience. |
| AC-011 only oversight-read audits and frozen sensitive-denial evidence | Privileged IA creation/suspension/approved management must be audited | Add targeted mutation audit/transaction/revocation requirements after contract review. Existing AuditLog User FK/String action supports source-level feasibility without a new table; no actual insert or schema change now. |
| Seven reviewed frozen fixtures, original immutable intake/preflight bind old read-only scope | Material feature-contract expansion | Preserve all seven hashes, original run history and evidence. Independent requirements/contract/fixture applicability review is required; old review/preflight cannot authorize new management scope. No new run/input/state is initialized or silently edited. |

**Continuing approved privacy:** META-01 still governs authenticated academic-oversight metadata, including exact-value approval, blanks/no join-code disclosure, safe whole-read failure and committed access audits. New administrative account identity/credential DTOs are separate necessary management data, not an automatic broad metadata or student-PII exception. Define their minimum target-only fields and secret handling explicitly before planning. No student roster, grades, submissions, attempts, answers, execution detail or environment/signing credential data is added to oversight by the phrase “whole LMS.”

## Verified current architecture and hierarchy gaps

T/prisma/schema.prisma: User.role is String, User.instituteId is a single non-null FK to Institute, and AuditLog references actual Users with String action/JSON-string metadata. **No INSTITUTE_ADMIN, Program model, ProgramHead designation, program assignment or course-program relation exists in T/.** T/src/lib/admin-types.ts normalizes known Admin/instructor aliases and otherwise STUDENT; this is unsafe for the new roles and unknown values.

User.department is ordinary String display metadata and `api/profile/PUT` permits the user to edit it. It is not a trusted Program Head designation or membership/curriculum boundary. Course.subject/code/section and client program headers are also not authoritative program assignment. Do not implement or infer a program catalog from these labels.

Role strings allow a future INSTITUTE_ADMIN value without changing schema, and instituteId can represent exactly one institute. This does **not** prove role-transition, delegated program authority, credential setup or account-management behavior exists. The current ADMIN layout/API allows cross-institute access and optional institute filtering; new IA enforcement must make actual actor.instituteId mandatory in relevant queries/targets, irrespective of request filters.

## Exact minimal V1 architecture changes

1. **Canonical role and fixed capabilities.** Recognize SUPER_USER and INSTITUTE_ADMIN explicitly, keep instructor aliases PROFESSOR/TEACHER/INSTRUCTOR and STUDENT, unknown fail closed. Persisted permissions and request claims cannot lift the Super User ceiling. PROGRAM_HEAD is a verified designation of an instructor; it is not a generic role value or automatic authority. No global permission framework rewrite.
2. **Super User academic read boundary.** Real session + selected supported actual Institute + scoped active Course and approved metadata + required access audit. Dedicated APIs/pages never reuse generic course/gradebook/student/integration responses. Existing header-free leaf protection and tx-only audited projection design remain proposal obligations, not implemented fixes.
3. **Dedicated Institute Admin management boundary.** Proposed future routes are scoped under `/api/super-user/[institute]/institute-admins`, with list/detail, create, approved-field management and suspension. `requireSuperUser` alone does not call/skip `requireAdmin`. Each target must be an actual IA account belonging to the selected real institute. Create has no existing target: authenticate Super User, resolve existing institute, validate narrow approved new-account fields, fix role server-side to IA and bind exactly one institute. Suspension resolves an existing IA, changes active status and purges target sessions with audit in one transaction. Wrong-target-role/student/instructor/SUPER_USER/generic Admin impersonation fails before mutation. No institute creation, arbitrary role promotion, password-reset/delete/reactivate/transfer privilege is silently inferred from “manage.” Exact operation/credential semantics remain decisions below.
4. **Institute Admin scope.** For operations actually assigned to IA, actor.instituteId is mandatory server authority. Lists/counts and resource/target queries include it; selected filters cannot expand it. IA cannot touch another institute, SUPER_USER or peer IA account-management domain absent explicit approval; intended lower-level user/course operations retain their existing operation-specific role contracts. A global role-default matrix is not an institute-scoped operation. Its V1 availability/scoped behavior requires a human decision; never silently grant global permission administration.
5. **Legacy Super User ceiling.** Deny at reachable protected HTTP/page/action entries before private reads or effects, using shared eligibility where it demonstrably runs first. Preserve already effective strict role guards rather than adding redundant whole-module fixes. Reauthenticate callable use-server skills; input.actorId never chooses another principal. No route/action can inherit student rights merely from forged assignment/enrollment or default normalization. Ordinary gradebook query/service internals are not new Super User features; guard actual callable paths, not every private function indiscriminately.
6. **Accepted regression-only preservation.** Maintain distinct Admin-only `adminCreateCourse`, instructor creation entry, role aliases and the original fixed normal-role positives/negatives. Preserve exact KX admin/moderation/deanonymization/digest/tag method roles. Do not broaden grading/group/GitHub rights. The old broader 008 family rules are superseded by this scope correction.
7. **No C work in this feature.** OAuth protocol redesign, flashcard engagement/replay proof, upload staging ownership/capability infrastructure, public-health DTO cleanup, normal-role KX/calendar/task security fixes and broad template transaction refactors are security debt. A minimal Super User denial may still be required at their entry; that denial does not authorize implementing the rest of the finding.

## Create, get-or-create, update and enrollment contracts

These correct draft impossibilities while preserving accepted behavior; they are not new broad capability grants:

| Operation kind | Preconditions | Relationship / state effect |
|---|---|---|
| New IA account create | Actual SUPER_USER; existing approved selected Institute; explicit permitted new-account/credential contract | Target does not exist. Server fixes role=INSTITUTE_ADMIN and one institute, enforces uniqueness, hashes credentials and audits; never requires existing IA ownership or auto-promotes a Student. |
| adminCreateCourse | Actual Admin/IA per approved legacy mapping; actual institute authority | Remains Admin-only (IA within its institute), not a union with instructors. Source T/admin/courses/actions.ts ensureAdmin is evidence. Instructor creation is its distinct documented entry. |
| instructorCreateCourse | Recognized actual instructor, actual home-institute creation authority | No existing course ownership required. New instructor association uses real actor; existing legitimate self-assignment helper call chain is preserved. No broader bulk-assignment authority. |
| getOrCreateSubmission | Actual STUDENT; legitimate persisted SyllabusItem→Course and accepted enrollment access | If existing, return only actor's submission. If absent, create studentId fixed to actor and that actual item. No requirement to own a submission before creation. Do not refactor unrelated grading/attachment security. |
| requestEnrollment / joinWithCode | Actual STUDENT; actual course/valid code in actor's institute | No APPROVED enrollment prerequisite for entry. Existing enrollment must be actor+same course; preserve only documented PENDING/request transitions and idempotent approved state. Do not self-approve enrollment. SUPER_USER/UNKNOWN denied before course-code lookup. |
| Existing-resource update/delete | Actual appropriate actor/role; persisted target and authorized parent/institute | Existing ownership applies here, not at nonexistent-target creation. Only A/B-required relationship changes are included; unrelated vulnerabilities stay C. |

## Corrected 172-operation inventory and exceptions

Inventory rebuild reads every actual `export function METHOD` and `export const METHOD` in the 120 source route files. It adds **PUT /api/gamification/privacy → POST in the same file** and preserves **POST /api/activities/codelab/invalidate → POST /api/codelab/instructor/reject** with both implementation/source hashes. No source operation is omitted.

Each record includes exact path/method/target, source hash, actor/role/scope/relationship, structural Super User reachability, whether required by the feature and minimum implementation mechanism. Reachability is descriptive source analysis, not runtime proof: POSSIBLE records remain subject to narrow guard-order review; an existing explicit raw-role denial is not treated as a test PASS. The source inventory is corrected, but the extra PUT and alias-dependent supporting-body review still require fresh independent coverage in the eventual next packet. Historical 171-method review outputs remain unchanged.

**Anonymous `/api/public/leaderboard` is unchanged and outside authenticated Super User AC-007.** It has no optional Super User role denial or new public privacy DTO. **Authenticated `/api/leaderboard` is distinct**, already requires a session, and may need its legacy ceiling. The R2 conflation finding is preserved/disputed, not implemented into a public endpoint. Public health/institutes and GitHub webhook are unchanged anonymous/service protocols, not role-granted Super User authority; related operational-security defects remain backlog C.

## Finding-by-finding scope adjudication

[011-r2-scope-classification.json](011-r2-scope-classification.json) classifies **every** one of the 25 new design findings and 109 baseline records independently, preserving their original evidence/severity/recommendations/sessions. It does not deduplicate similar reports or relabel source defects resolved. All C records are also copied as evidence to the separate backlog. For mixed A records, only the identified boundary/hierarchy slice is eligible; credential randomness, replay or other collateral weaknesses remain separate unless directly used by new IA creation.

The human scope rule supersedes the earlier 010 interpretation that every unrelated HIGH issue blocked this feature. C severity stays HIGH/CRITICAL where reported but **does not block Super User implementation planning**. A/B issues, new hierarchy contracts and required unknown operational choices still block progression. Classification is not evidence that the ceiling, IA mapping or a proposed fix has been implemented.

## Bounded exact file allowlist and its limits

[011-bounded-file-allowlist.json](011-bounded-file-allowlist.json) replaces the broader R2 eligibility list for this proposed V1 scope: **194 existing paths**, compared with 220 previously, and **19 proposed future product paths**, including six dedicated IA-management paths. These are conditional feature-only hunk bounds, not a final executable task DAG or permission to edit whole files. The hierarchy expansion adds genuine new product paths; file count alone is not proof of semantic narrowing.

Existing-file changes are limited to canonical roles/selected scope/dedicated shell; reachable legacy entry ceiling; actual one-institute IA queries/targets; and the specific accepted alias/create/normal regression dependencies. Already strict unreachable boundaries may be verified unchanged. Shared KX/activity eligibility should protect their callers without per-endpoint business rewrites; the manifest records shared-ceiling-only candidates. Generic private gradebook-exporter, middleware, anonymous leaderboard, public health/institutes and webhook remain review-only unchanged. Source evidence may later prove a smaller leaf/route subset sufficient; removing a candidate requires explicit coverage proof, not omission.

New management route names are concrete review proposals, not accepted DTO/operation authority. Proposed create/list/detail/status paths do not grant delete/reactivate/role-convert/institute-transfer/password-reset actions without decision. No program catalog/role/assignment schema or extra program-management implementation path is added. No schema/package/dependency/harness files are allowed. Seven frozen files remain immutable. The final implementation plan cannot be signed until hierarchy/contract/role-transition choices and path applicability are resolved.

## Exact remaining human and architecture decisions

| ID | Required decision / conflict | Safe bounded position until decided |
|---|---|---|
| V1-D01 | What is legacy stored ADMIN in the new hierarchy: alias to institute-scoped IA using its existing instituteId, or explicit human-selected account transition? Which existing accounts are bootstrap SUPER_USER? | No automatic role/data migration or assumption that old ADMIN stays a fourth global admin family. Unknown transition blocks formal hierarchy planning. Super User must not inherit Admin. |
| V1-D02 | Exact meaning of IA “manage”: permitted professional fields, reactivation, password/credential reset, deletion, institute reassignment, promotion of existing accounts, number of IAs per institute, emergency/self/last-admin handling | Minimum target-only new account create, list/detail and suspension proposal. All other actions pending; per-account exactly one institute does not imply exactly one administrator account per institute. |
| V1-D03 | Credential provisioning and sensitive-action proof for new IA: chosen setup workflow, existing password reauthentication, CSRF/origin/Bearer handling and rate/replay behavior | Do not invent MFA/SSO or send credentials/keys in reports. Reuse existing suitable primitives only after explicit contract review; audit and immediate suspension session purge are required design items. |
| V1-D04 | Program Head authoritative designation/program assignment/resource mapping, assigner and exact head acting powers | Keep instructor base role/assigned-course rights. No self-editable department/header/subject as authority, no new generic system role or invented program catalog. Head-wide privileges remain disabled until real authoritative representation and capability scope are approved. |
| V1-D05 | Does whole-LMS V1 selection mean current ICS/IBE/ITE or every actual supported Institute record? Any institute-management power? | Initial ICS and explicit selection retained. No institute provisioning or unvalidated code authority; no additional power inferred. |
| V1-D06 | IA ordinary operations versus protected higher-tier accounts and existing global permission-default mutation | IA cannot gain whole-LMS generic permissions or manage SUPER_USER/IA peers by convenience. Global `/api/admin/permissions` PUT cannot be granted as a single-institute operation without an explicit bounded policy. No new generic permission system. |
| V1-D07 | Revised AC-001/006/008/011/intake, dedicated account-management API/UI DTO/status/audit contracts and applicability of frozen fixtures | Human hierarchy direction is accepted but old immutable verification contracts remain unchanged. Independent contract/fixture review is required before any assertion revision or new product tests. |
| V1-D08 | Material scope change against the original controlled run's immutable read-only input/source/preflight binding | Retain DRAFT/HIGH/input/history/approvals unchanged. Trusted lifecycle must decide reviewed re-intake/new controlled run requirement; do not invent a new run ID, reset failures or reuse old preflight as new authorization. |
| V1-D09 | Existing META-01 production approver/maintainer/dataset/expiry/revocation assignments and IA-management disclosure boundary | Academic metadata defaults to no disclosure until actually assigned/approved. Do not invent production people; don't automatically apply raw academic approval records as account-management permissions. |

These are not requests to implement. The current task stops with the scope-correction package.

## Updated verification requirements

Required eventual architecture/contract review must prove:

1. Canonical SUPER_USER/IA/instructor/student identity, unknown fail-closed and no permissions/assignment/enrollment inheritance; no generic-role family added for Program Head.
2. Selected actual institute protects cross-institute academic reads; Course DTO remains safe/read-only with META-01 and committed audit behavior. No grade/submission/answer/execution data.
3. Dedicated IA management positive/negative matrix: only actual SUPER_USER may exercise explicitly accepted management operations on actual IA targets in exactly one institute; wrong target role, foreign mismatch, self/higher-role escalation and generic Admin bypass fail; no ordinary grading/course operation is acquired by Super User.
4. IA local user/course operations reject cross-institute direct API/action/ID manipulation and cannot alter higher-tier identities or global permissions by convenience. Existing legitimate method-specific roles stay unchanged unless explicitly superseded.
5. Program Head representation/acting scope is authoritative and program-bound, or remains a non-privileged designation until decided; client/department labels cannot grant it.
6. All 172 actual method/alias records have attributable coverage, including PUT and both invalidate/reject bodies. Use operation-level evidence only for the A/B boundary promises, not tests/remediation for C domains.
7. Create/get-or-create/PENDING entry branches authorize actual parent/context before creating; they do not require nonexistent target ownership. Existing-resource branches preserve actual ownership.
8. Same-source original frozen hashes/denials continue where compatible; human-approved hierarchy exceptions require independent revised contract coverage, not silent weakening. No product tests authored now.
9. Original fixed normal-role regressions remain meaningful (same-institute Admin/teacher/student positives and actual unassigned/foreign/other-owner negatives). Do not turn every independent LMS weakness into a release prerequisite for this feature.
10. Fresh provider/session/source/contract/fixture/plan/preflight binding before formal lifecycle acceptance, with genuine HIGH human implementation approval as a later separate gate. No lease or readiness claim now.

C backlog receives a separate future security plan only if the human authorizes it; no loss of evidence or priority is implied. Optional whole-LMS security testing must not become a substitute for complete Super User security verification.

## Minimum recommended next independent review packet

Do **not** rerun all general LMS remediation recommendations. First resolve V1-D01/02/04/05/06/07 sufficiently to state the actual contracts. Then provide one small, source-bound **scope/hierarchy/contract adjudication** packet containing:

- Human V1 hierarchy and this scope rule; old/new contract comparison, remaining decisions and all A/B/C dispositions/backlog links.
- Exact role resolver/RBAC/session/db/schema evidence: User single institute/String role, missing program assignment, self-editable department; Admin create/status/role/permissions and layout code relevant to changed authority; existing AuditLog/transaction source feasibility.
- Proposed dedicated IA-management capability/operation/DTO boundaries; actual legacy ADMIN transition decision, actor/target/session/audit cases; no generic Admin alias for Super User.
- New academic read/meta/shell guard contract and the small A/B regression/create cases. Include actual frozen contract/test applicability as evidence, preserving all seven hashes.
- The corrected 172-operation metadata inventory, plus **only supporting bodies needed to prove the Super User ceiling/shared helper/IA scope**. Both actual leaderboard source files and both invalidate/reject bodies; PUT alias plus POST body. Do not omit a method; no need to include C remediation implementations as prerequisites.

Ask a genuinely fresh approved isolated reviewer to challenge scope creep, hierarchy contradictions, authoritative program representation, cap/tenant separation, target-only account management, material contract/frozen-test conflicts and A/B completeness. If payload limits require subsets, bind explicit paths/methods/source hashes and preserve the full required union. Retain C evidence but explicitly disallow promoting unrelated debt into feature blockers without one of the four human scope tests.

No review is dispatched now, because the human instructed stop after this package. Source verification is read-only, and there is no architecture PASS, formal predecessor acceptance, implementation approval/lease or RELEASE_READY claim.
