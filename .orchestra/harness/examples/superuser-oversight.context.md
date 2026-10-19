# Controlled first LMS feature — HIGH, no deployment or schema change

The human selected Super User Academic Oversight and Read-Only Course Supervision.
Keep unrelated application changes in the primary checkout out of this isolated task.
SUPER_USER starts from ICS but may explicitly select ICS, IBE or ITE. The selected institute
in the route/request is the server authorization scope; never silently substitute home institute.
ADMIN, assigned INSTRUCTOR (including the existing PROFESSOR/TEACHER DB aliases), STUDENT,
inactive user and foreign-institute instructor are supporting authorization test identities.

Acceptance criteria, preserved from the human's request:
- AC-001: SUPER_USER academic operations only; no generic Admin, teaching, grading or submission privileges.
- AC-002: authorize against the explicitly selected supported institute.
- AC-003: each selection returns only that institute's academic information.
- AC-004: dedicated read-only supervision for a course in the selected institute.
- AC-005: foreign course ID denied/not found, with no foreign-course data.
- AC-006: no course/schedule edits, grading, work submission, assessment execution or teaching mutation.
- AC-007: no student identity, grade, submission, attempt, assessment answer or execution data in direct responses.
- AC-008: preserve Admin administration, assigned instructor teaching, and existing student access.
- AC-009: inactive users and foreign/non-SUPER_USER roles cannot obtain oversight via manipulated parameters.
- AC-010: direct server/API/action authorization tests, not navigation visibility alone.
- AC-011: oversight accesses and applicable authorization-sensitive mutation denials have reviewed audit evidence.
- AC-012: fresh exact-source/run evidence, complete independent reviews and actual HIGH human approvals before RELEASE_READY.

Out of scope: scheduling/revision/exception changes; calendar redesign; note/event snapshots;
faculty/head/Dean management; broader academic-operations migrations; Google Calendar; task
conversion; production deployment. A separate harmless PostgreSQL fixture rehearsal is infrastructure
evidence, not validation of a product migration. No Prisma schema change is required merely to store
SUPER_USER because the existing role column is a String.

Proposed test interface, for recon/adjudication to accept or explicitly revise before implementation:
- GET /api/academic-oversight/<institute>/courses
- GET /api/academic-oversight/<institute>/courses/<courseId>
- /<institute>/academic-operations/courses/<courseId>/supervision
The review must resolve schedules/material summary availability against actual schema and establish
an explicit response allowlist. Existing generic endpoints/actions must not become a bypass.

Baseline observation: generic GET /api/courses/[courseId] currently verifies a session but does not
enforce institute/ownership before returning course information. Do not assume middleware, a sidebar,
or the new supervision page protects that direct API. Review every relevant SUPER_USER direct path.

The host supplies only disposable fixture identities/tokens to isolated verification workers.
Provider roles receive source and acceptance criteria; no tokens, production env files, host seed,
signer passphrase/private key or other run workspaces. Infrastructure preflight is a distinct signed
host attestation and never substitutes for a human architecture/implementation/deployment approval.
