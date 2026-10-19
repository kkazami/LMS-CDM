# Proposed approved-metadata policy for Super User oversight

2026-10-08, Asia/Singapore. **Contract-design proposal only; not approved or implemented.**

Human direction recorded: **“Define an explicit approved-metadata policy.”** This selects a design direction; it does not approve the detailed policy below, close the independent HIGH finding, authorize fixture changes or grant implementation approval.

Addresses **SU-REVIEW-SHELL:SU-AR-004**, supported by the schema's unrestricted title/name strings and the frozen fixture's benign metadata. Original reviewer outputs and the 006 finding/adjudication record remain unchanged. Architecture remains REVIEW_FAIL with other unresolved findings and incomplete HTTP coverage. Controlled run remains HIGH/DRAFT, next requirements, no implementation lease or approval.

## Proposed contract decision META-01

An explicitly allowlisted DTO field is eligible for disclosure only when its **actual persisted value has a current, explicit human approval for non-assessment academic metadata**. A field name, instructor role, institute membership, benign fixture marker, keyword filter or prior approval of a different value is not such an approval.

The approver must inspect the value in its academic context and certify that it contains no student identity, personal contact information, grade, submission/attempt information, assessment question/answer, hidden test, execution information, credential or join code. Instructor professional display names are permitted only as approved instructor metadata, never as an exception allowing student identities. A person who edits a field cannot silently self-classify it for disclosure through the request or ordinary course-edit API.

This is a human-governed classification boundary, not a claim that code can determine semantic privacy from arbitrary text. Human review can err; independent architecture review must assess whether this trust model meets AC-007. Do not weaken AC-007 merely by labeling contaminated text “metadata.”

## Field policy

| Source / DTO field | Proposed disclosure rule |
|---|---|
| Course.title; CalendarEvent.title; MATERIAL SyllabusItem.title | Disclose exact current text only with a current record/field/value approval. No raw fallback, automatic promotion or reuse of another record's approval. |
| Course.code, subject, section, room | Also require approval of exact current text. These are user-editable strings and can carry the same restricted content as titles. Course.code is the catalog label; it must never fall back to courseCode. |
| Institute.name | Approve official institutional display metadata for the supported code. A newly edited name invalidates that field's approval. Institute.code remains the supported server-resolved slug. |
| CalendarEvent.eventType | Require an approved non-assessment event label/value. Do not trust unrestricted database String values as harmless enum values. |
| instructor.id/name | Require an approved professional identity/display-name projection bound to the actual course-instructor relation, selected institute, current user role and active status. Never emit a STUDENT or UNKNOWN user as instructor metadata. |
| Course.courseCode | Always empty string, never selected/read for disclosure. An approval cannot authorize a join code. |
| Course.description; CalendarEvent.description; Announcement.content; SyllabusItem.description | Always empty strings in this v1 policy, including when somebody tries to approve them. Future populated summaries require a separate contract decision. |
| Course.coverImage | Empty string/local placeholder under the current architecture proposal. No approved-metadata entry introduces arbitrary URL fetches or signed-image disclosure. |
| SyllabusItem.type | Constant MATERIAL from the scoped query; no ASSIGNMENT/QUIZ content. |
| IDs, timestamps, dates and relationships | Server-derived, correctly typed and scoped technical metadata only. A valid identifier does not authorize the related entity or its text. Never substitute student IDs, expose unrelated identifiers, or use dates/type fields as channels for unapproved text. |

The existing DTO key allowlists remain unchanged. No extra approval state, hashes, reviewer names or policy diagnostics are added to API/RSC payloads. All success text is rendered escaped as text, without HTML/Markdown execution or automatic links.

## Proposed approval representation and trust boundary

Use a **versioned server-only, human-reviewed approval manifest** delivered as a reviewed source/configuration artifact through the existing repository review process. No database schema migration, content-management UI, new signing service, deployment mechanism or modification of harness trust keys is proposed. The actual manifest file paths, trusted approver/maintainer and production dataset identity must be explicitly selected in the revised architecture/plan before implementation; the existing 002 file allowlist is not silently expanded by this document.

Each approval record must contain:

- Policy version and intended dataset/environment identity, distinguishing production from an explicitly disposable fixture dataset.
- Selected institute ID/code, entity kind, entity ID and field name.
- Exact-value SHA-256 over the UTF-8 bytes of the stored scalar; no trimming, case folding or Unicode normalization that could allow a changed string to reuse approval.
- For instructor projections: actual course ID/instructor ID relationship, permitted current role and active status. SUPER_USER assignment may be summarized only as the already-approved adversarial relationship case; it never grants teaching rights. ADMIN/PROFESSOR/TEACHER/INSTRUCTOR professional summaries require the same disclosure approval. STUDENT/UNKNOWN references are ineligible.
- Human approver identity, approval/review reference, issued timestamp, expiry or explicit review-due timestamp, and revocation status. The record must be attributable to an actual human review, not an agent-generated label or caller payload.

The manifest is neither public data nor an API authorization input. Client query/body/header claims and persisted User.permissions cannot create or select an approval. Do not send its contents/hashes in success/errors/logs or embed it into client bundles. Approval hashes are not encryption and should not be described as anonymization.

Check record identity, supported institute, dataset binding, field allowlist, current value digest, relationship/role/active binding, policy version, time and revocation at disclosure time. Unknown/inactive users, edited values, moved records, changed instructor relations, expired/revoked entries or absent approvals fail closed. Approval of metadata does not authorize reading a foreign course or a legacy operation: normal real session/role/course/institute checks always precede this policy.

An institution's designated academic/privacy approver may review harmless catalog/event/material labels and faculty professional names. The owner must be named by the human; this document does not assign a person, grant a role or approve actual data. No real production values or approval records are authored here.

## Proposed failure and completeness semantics

If a required retained field lacks current approval, return a safe **500** error envelope with a fixed string code such as METADATA_REVIEW_REQUIRED. Do not return the raw value, a partially assembled DTO, approval details, an affected instructor name, a course title or a list of rejected record IDs. The page renders a safe unavailable state outside the course region, with no leaked RSC/HTML data. This uses the existing safe error-key shape and server-error category; the new deliberate approval-required behavior still needs explicit contract approval.

Do not silently omit an active course, event or material, and do not truncate arrays to avoid unapproved records. H-07 promises complete deterministic arrays. A successful list/detail contains the entire scoped active set with approved retained values; otherwise the whole read fails without projection data. No placeholder becomes a purported approved course title, and no redacted identifier substitutes for an exact heading silently.

A missing instructor relation may remain null as the existing DTO permits. A relation to STUDENT/UNKNOWN must never serialize identity; handle it as unavailable approved metadata and fail closed unless the human separately approves null-summary semantics for that invalid relation. The latter must be decided explicitly, not inferred from the nullable shape.

Authorize and load scoped server-local values, validate all required approvals, construct the explicit DTO, and successfully append the required access audit **before** any response, stream, cache, RSC prop or render containing the DTO. Approval failure must not create a misleading ALLOWED access event. Existing AuditLog history remains unchanged. No new universal denial-audit requirement is added.

## Frozen fixtures and verification consequences

The seven frozen verification files remain unchanged. Their exact benign titles/instructor IDs and heading expectations can continue to pass **if those exact generated fixture values receive separate, independently reviewed fixture approval records**. Possessing a dummy identity or HARNESS environment flag is not an automatic metadata approval. The fixture policy may approve the exact harmless seed templates after independent review and issue dataset-bound records for their generated IDs/current values; those records must never authorize production data.

Do not revise the frozen seeder, fixture.ts or its exact heading assertions to conceal missing approvals. Proposed supplementary fixture support would be a separate, specifically allowed test artifact, authored only after actual architecture PASS and independently reviewed before freezing. No support artifact or supplementary test is created now.

Required future independently reviewed cases, without implementation or execution here:

1. Current approval permits the exact benign catalog/title/professional-name values on all three institutes; existing exact DTO/heading contracts remain satisfied.
2. Missing, expired, revoked, wrong-dataset, foreign-institute, wrong-record or wrong-field approvals withhold the complete response.
3. Editing text after approval, changing role/active state or replacing instructor/course relationships invalidates approval without changing stored approval records.
4. Injected student markers, grades, answers, hidden-test/execution text and join codes into every retained field are unapproved and absent from API, error, DOM, full shell, RSC and logs.
5. Forged approval claims in request headers/body/query, persisted permissions, and use of an approval for another role/value confer no disclosure or legacy capability.
6. No hidden omission/truncation of active courses/events/materials; any approval gap causes a safe whole-read failure.
7. Real successful access audit preserves actor/scope/outcome; mandatory audit failure and approval failure never deliver or stream DTO data.
8. Seven original fixture hashes remain exact. Additional approved dummy records cannot be loaded as production approvals. Anonymous public leaderboard behavior remains outside this policy and unchanged under U-01.

These cases are requirements for a future plan/test review, not independently approved tests or product validation. Current independent architecture verdict remains REVIEW_FAIL.

## Concrete decisions still required

This proposed amendment needs explicit human acceptance/revision of:

- META-01 per-record/field/exact-value approval, including the additional catalog/type fields rather than only titles/names.
- The trusted academic/privacy approver and manifest maintainership; actual dataset binding; approved manifest location/version/expiry and revocation procedure using existing infrastructure.
- Whole-read failure with safe 500/METADATA_REVIEW_REQUIRED and unchanged success/heading shapes, rather than raw text, silent omission or automatic metadata labeling.
- Handling of an instructor relation to a STUDENT/UNKNOWN/inactive user; proposed default is safe whole-read failure, never identity disclosure.
- Separate independently reviewed fixture-approval support without changing the original seven files, and revised exact future file/command mapping where necessary.

After the human accepts concrete semantics, obtain a fresh independent architecture/contract review through the existing isolated provider. Do not mark SU-REVIEW-SHELL:SU-AR-004 resolved solely because this document exists. If the reviewer requires any frozen-fixture or accepted-contract revision, obtain the required separate approval and independent fixture review before editing it. Other HIGH/CRITICAL findings and HTTP coverage deficiencies still block progression independently of this policy.

No app source, harness gates, schema, seven frozen files, provider settings or run state is changed by this proposal. No implementation approval/lease, supplementary tests, product/database operation or Calendar work is authorized.
