# Revised architecture review results and stopping point

**Document-only package complete; fresh design review returned REVIEW_FAIL. No supplementary product tests or implementation may start.**

[Revised architecture](008-revised-super-user-architecture.md), [boundary matrix](008-revised-boundary-matrix.json), [exact future file scope](008-revised-file-allowlist.json), and [original finding-by-finding revisions](008-finding-by-finding-adjudication.json) incorporate the human META-01/header-free/audit/account/public-scope/relationship directions. No source control is claimed implemented.

## Fresh isolated evidence

18 unique new sessions ran through the existing approved microVM/Codex broker, with request/source/output/transcript bindings and no prohibited tools. No normal shared-workspace reviewer or fallback was used.

| Request | Design verdict | New design findings | Real session | Original evidence |
|---|---|---|---|---|
| SU-R2-HTTP-01 | REVIEW_FAIL | 1 | 01a11b82-66fa-7eb0-a622-2871491cb805 | [receipt](009-su-r2-http-01-abee0f97-c450-4779-b1db-12f5bfae0091.receipt.json) / [output](009-su-r2-http-01-abee0f97-c450-4779-b1db-12f5bfae0091.output.json) |
| SU-R2-HTTP-02 | REVIEW_PASS | 0 | 01a11b82-66fa-78d0-a1fa-e6f7c012f3b8 | [receipt](009-su-r2-http-02-f1723d34-da6e-432c-8283-5a42b1ffb6b3.receipt.json) / [output](009-su-r2-http-02-f1723d34-da6e-432c-8283-5a42b1ffb6b3.output.json) |
| SU-R2-HTTP-03 | REVIEW_FAIL | 3 | 01a11b82-66fe-7943-9480-dead2fd69be8 | [receipt](009-su-r2-http-03-d2205b5b-7641-4ebf-a038-b28b596557d4.receipt.json) / [output](009-su-r2-http-03-d2205b5b-7641-4ebf-a038-b28b596557d4.output.json) |
| SU-R2-HTTP-04 | REVIEW_PASS | 0 | 01a11b84-765f-7c21-a618-ae7e56fc097c | [receipt](009-su-r2-http-04-72722373-40a5-4157-959a-fc9f880781c1.receipt.json) / [output](009-su-r2-http-04-72722373-40a5-4157-959a-fc9f880781c1.output.json) |
| SU-R2-HTTP-05 | REVIEW_FAIL | 2 | 01a11b84-99a9-7b31-9219-510b9d1157e2 | [receipt](009-su-r2-http-05-8112d3df-1a22-438f-a434-5dba01255a28.receipt.json) / [output](009-su-r2-http-05-8112d3df-1a22-438f-a434-5dba01255a28.output.json) |
| SU-R2-HTTP-06 | REVIEW_FAIL | 2 | 01a11b84-7662-7f81-9845-2a10158ecaeb | [receipt](009-su-r2-http-06-9bccd58c-7c07-4dbb-92b0-5c6c1eb4e88a.receipt.json) / [output](009-su-r2-http-06-9bccd58c-7c07-4dbb-92b0-5c6c1eb4e88a.output.json) |
| SU-R2-HTTP-07 | REVIEW_PASS | 0 | 01a11c04-dcd8-71f3-a2a5-a322446afac9 | [receipt](009-su-r2-http-07-3cb547f7-03de-4c40-a497-611a74fceafd.receipt.json) / [output](009-su-r2-http-07-3cb547f7-03de-4c40-a497-611a74fceafd.output.json) |
| SU-R2-HTTP-08 | REVIEW_FAIL | 2 | 01a11c04-dcd7-7e93-ab3d-cb10997da02c | [receipt](009-su-r2-http-08-30ebcc84-06fc-48cc-b823-5b8c0ade1f26.receipt.json) / [output](009-su-r2-http-08-30ebcc84-06fc-48cc-b823-5b8c0ade1f26.output.json) |
| SU-R2-HTTP-09 | REVIEW_FAIL | 2 | 01a11c04-dcd7-7dd2-88b6-dda885aa6c54 | [receipt](009-su-r2-http-09-5afaf3e1-d5cb-4067-ae32-b4aeb84b923b.receipt.json) / [output](009-su-r2-http-09-5afaf3e1-d5cb-4067-ae32-b4aeb84b923b.output.json) |
| SU-R2-HTTP-10 | REVIEW_FAIL | 2 | 01a11c06-e62c-73b0-b1b8-5066155fb390 | [receipt](009-su-r2-http-10-0bbe9b67-24aa-4fb9-af4b-8cb58981e801.receipt.json) / [output](009-su-r2-http-10-0bbe9b67-24aa-4fb9-af4b-8cb58981e801.output.json) |
| SU-R2-HTTP-11 | REVIEW_FAIL | 2 | 01a11c06-e8f2-7a10-9790-cc7e73bcf208 | [receipt](009-su-r2-http-11-5584a5ab-ec84-414d-b6d2-6eec71a71b35.receipt.json) / [output](009-su-r2-http-11-5584a5ab-ec84-414d-b6d2-6eec71a71b35.output.json) |
| SU-R2-HTTP-12 | REVIEW_FAIL | 3 | 01a11c06-e62b-79f0-a031-176c5385e57d | [receipt](009-su-r2-http-12-2f02b350-cdda-4a10-95a4-cd609a14ea2c.receipt.json) / [output](009-su-r2-http-12-2f02b350-cdda-4a10-95a4-cd609a14ea2c.output.json) |
| SU-R2-ACTIONS-01 | REVIEW_FAIL | 2 | 01a11c13-792f-7860-9bb6-422a1b8719ca | [receipt](009-su-r2-actions-01-474a1e0d-94a6-4723-8f32-4b45edc089bb.receipt.json) / [output](009-su-r2-actions-01-474a1e0d-94a6-4723-8f32-4b45edc089bb.output.json) |
| SU-R2-ACTIONS-02 | REVIEW_FAIL | 1 | 01a11c13-7933-7091-b37a-4c3ac798bc12 | [receipt](009-su-r2-actions-02-2699ede2-af3b-4a71-ab62-44cfd69c00f6.receipt.json) / [output](009-su-r2-actions-02-2699ede2-af3b-4a71-ab62-44cfd69c00f6.output.json) |
| SU-R2-ACTIONS-03 | REVIEW_FAIL | 1 | 01a11c13-7937-7201-ab99-065e60c7fd4f | [receipt](009-su-r2-actions-03-724e53b3-054f-46a6-82d7-767c9436b752.receipt.json) / [output](009-su-r2-actions-03-724e53b3-054f-46a6-82d7-767c9436b752.output.json) |
| SU-R2-ACTIONS-04 | REVIEW_FAIL | 2 | 01a11c1c-30ea-77c0-b456-f66d28a47c94 | [receipt](009-su-r2-actions-04-c35be094-6291-4291-ba72-bf9b96c99022.receipt.json) / [output](009-su-r2-actions-04-c35be094-6291-4291-ba72-bf9b96c99022.output.json) |
| SU-R2-SHELL | REVIEW_PASS | 0 | 01a11c1c-30e6-7301-9e2b-1bb9247936cd | [receipt](009-su-r2-shell-a0ecb09f-6ed8-4a2a-a478-44e57973bcc1.receipt.json) / [output](009-su-r2-shell-a0ecb09f-6ed8-4a2a-a478-44e57973bcc1.output.json) |
| SU-R2-METADATA-AUDIT | REVIEW_PASS | 0 | 01a11c1c-316a-7420-99d9-944ff3e4ffe5 | [receipt](009-su-r2-metadata-audit-b3e1e2e8-aad5-48e8-8395-32b4505f714d.receipt.json) / [output](009-su-r2-metadata-audit-b3e1e2e8-aad5-48e8-8395-32b4505f714d.output.json) |

Shell and metadata/audit subset PASS verdicts are **design-only**; they do not resolve baseline vulnerabilities, validate runtime transactions, assign production approvers or accept harness stages. Original 006 findings/receipts are unchanged. 109 separately authored baseline implementation risks are retained as NOT_REMEDIATED in this round; they are not silently merged or relabeled resolved.

## Coverage: corrected paths, remaining verb omission

Every one of the **120 routes** now has an actual reviewer/session/path/method coverage record in [the aggregation](010-revised-independent-findings.json). All **171 listed** method/alias rows and **59 assigned** action/service export cases received coverage. However source reinspection confirms **172 source operations**: **PUT /api/gamification/privacy** aliases POST and was missing from the inventory. Therefore full source-verb coverage is **not** established. Its intended policy/case and a fresh independent PUT record are still required. HTTP-01 also requires the reject implementation body as supporting context for its invalidate alias; target review in a different packet is not silently treated as sufficient.

## Each new independent finding and disposition

25 design findings: 22 HIGH, 3 MEDIUM. Every finding retains original severity/evidence/impact/recommendation/confidence/flags and a distinct session-qualified identity.

| Independent finding | Severity | Issue | Documentary disposition |
|---|---|---|---|
| SU-R2-HTTP-01:SU-R2-HTTP-01-F01 | HIGH | Aliased CodeLab invalidation handler is absent from the sanitized packet | ACCEPTED_REVIEW_PACKET_DEPENDENCY_GAP |
| SU-R2-HTTP-03:SU-R2-HTTP-03-DESIGN-001 | HIGH | SUPER_USER recovery denial ordering is internally contradictory | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-03:SU-R2-HTTP-03-DESIGN-002 | HIGH | Multi-role execution contract does not constrain student-only gamification effects | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-03:SU-R2-HTTP-03-DESIGN-003 | MEDIUM | Reject operation claims an alias that is absent from the assigned method contract | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-05:SU-R2-HTTP-05-DESIGN-001 | HIGH | Auto-generation design does not bind the attachment to the claimed course before save, file retrieval, or generation | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-05:SU-R2-HTTP-05-DESIGN-002 | HIGH | Completion rewards rely on unverifiable client-asserted engagement and have no replay-bound study session | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-06:SU-R2-HTTP-06-F01 | HIGH | Declared PUT alias is absent from the assigned operation inventory and verification case set | ACCEPTED_SOURCE_VERB_INVENTORY_DEFECT |
| SU-R2-HTTP-06:SU-R2-HTTP-06-F02 | HIGH | OAuth state is not contractually bound to the initiating actor and session | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-08:SU-R2-HTTP-08-F01 | HIGH | KX_MOD design expands administrator-only moderation and deanonymization authority to instructors | NEEDS_HUMAN_ARCHITECTURE_OR_SCOPE_DECISION |
| SU-R2-HTTP-08:SU-R2-HTTP-08-F02 | MEDIUM | Public health exception preserves disclosure of database topology, population counts, and raw connection errors | NEEDS_HUMAN_ARCHITECTURE_OR_SCOPE_DECISION |
| SU-R2-HTTP-09:SU-R2-HTTP-09-DESIGN-001 | HIGH | The operation matrix omits the resource inputs needed to verify persisted parent and relationship authorization | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-09:SU-R2-HTTP-09-DESIGN-002 | HIGH | Generic KX rules do not define the distinct authority required by accept, verify, and comment-delete operations | NEEDS_HUMAN_ARCHITECTURE_OR_SCOPE_DECISION |
| SU-R2-HTTP-10:SU-R2-HTTP-10-DESIGN-001 | HIGH | The operation matrix does not enumerate the resource identifiers that drive relationship authorization | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-10:SU-R2-HTTP-10-DESIGN-002 | HIGH | Digest authorization is ambiguous between the existing ADMIN-only contract and the revised all-KX-role matrix | NEEDS_HUMAN_ARCHITECTURE_OR_SCOPE_DECISION |
| SU-R2-HTTP-11:SU-R2-HTTP-11-F01 | HIGH | Leaderboard operation matrix contradicts the accepted unchanged-public contract | DISPUTED_ENDPOINT_SCOPE_PENDING_INDEPENDENT_CORRECTION |
| SU-R2-HTTP-11:SU-R2-HTTP-11-F02 | HIGH | Tag creation matrix grants a broader role set than the preserved operation contract | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-12:SU-R2-HTTP-12-DESIGN-01 | HIGH | The proposed actor-owned staging-upload boundary has no enforceable ownership artifact | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-HTTP-12:SU-R2-HTTP-12-DESIGN-02 | HIGH | Workspace event policy does not define authorization for reading shared course events | NEEDS_HUMAN_ARCHITECTURE_OR_SCOPE_DECISION |
| SU-R2-HTTP-12:SU-R2-HTTP-12-DESIGN-03 | HIGH | Course-linked personal tasks lack a persisted course-relationship rule | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-ACTIONS-01:SU-R2-ACTIONS-01-DESIGN-001 | HIGH | adminCreateCourse has contradictory role authority | NEEDS_HUMAN_ARCHITECTURE_OR_SCOPE_DECISION |
| SU-R2-ACTIONS-01:SU-R2-ACTIONS-01-DESIGN-002 | MEDIUM | Coupled saveTemplate writes lack an atomicity contract | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-ACTIONS-02:SU-R2-ACTIONS-02-DESIGN-001 | HIGH | The get-or-create submission design requires ownership of a submission that does not yet exist | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-ACTIONS-03:SU-R2-ACTIONS-03-DESIGN-001 | HIGH | Enrollment-entry actions are assigned an impossible pre-existing APPROVED-enrollment requirement | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-ACTIONS-04:SU-R2-ACTIONS-04-DESIGN-001 | HIGH | The group-permission action has contradictory role-policy definitions | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |
| SU-R2-ACTIONS-04:SU-R2-ACTIONS-04-DESIGN-002 | HIGH | The design does not reconcile mandatory 401/403 action failures with executeSkill swallowing exceptions | NEEDS_CONTRACT_SPECIFICATION_AND_INDEPENDENT_REVIEW |

[Full independent finding and adjudication data](010-revised-independent-findings.json) also retains original evidence, exact proposed resolution, human/contract decisions, verification requirements and current unresolved status. No source fix or product test is represented as complete.

## Concrete remaining decisions and corrections

1. Correct the hash-bound alias/verb packet inventory: include reject body with invalidate alias, provide the declared gamification privacy PUT case, supply the real AC-001–012 catalog and line-addressable design evidence. Preserve original R2 outputs and source hashes.
2. Preserve existing operation-specific roles: adminCreateCourse, KX admin/deanonymization/digest and tag creation must not inherit a broader family role set. Human decisions are required where an actual privilege-model expansion or endpoint-contract change is proposed; preserving existing roles is the default. Resolve group-visibility read versus TEACH policy-name contradictions.
3. Specify create-versus-existing branches for getOrCreateSubmission and enrollment-entry actions; a not-yet-created record cannot require existing ownership or APPROVED enrollment. Preserve actor/institute binding and only legitimate PENDING enrollment transitions.
4. Clarify public recovery target/actor denial ordering and minimal proof-bound lookup; separate instructor/Admin execution preview from STUDENT-only reward/grade/progression effects.
5. Define attachment-to-course resolution before generation, actor-owned staging-upload handoff, OAuth actor/session-bound single-use state, reward-bearing flashcard session/replay proof, and per-resource KX/comment/accept/verify rules. Some recommendations may need scope/contract/infrastructure changes; none are silently authorized or implemented.
6. Specify shared-event GET visibility and course-linked task relationships, coupled template write atomicity, and genuine action-authorization failures outside or preserved through executeSkill.
7. **Dispute endpoint conflation:** SU-R2-HTTP-11-F01 cites authenticated /api/leaderboard but applies U-01 for anonymous /api/public/leaderboard. Those are distinct source files/authority boundaries. Do not make the protected endpoint public or change anonymous DTO semantics. Retain the finding pending an endpoint-disambiguated independent correction.
8. Treat public-health privacy/topology hardening as a human scope question; no public health or unrelated DTO is rewritten to force this feature review to pass. Production approver/maintainer/dataset/expiry/revocation assignments remain mandatory and unknown; default remains no production metadata disclosure.

## Stop and preservation

Actual run remains DRAFT/HIGH, next requirements, no lease, no accepted new stage and no implementation approval. All 1337 captured source files, seven frozen fixtures, original preparation and state/journal remain unchanged. No application/harness/schema/database operation, supplementary test authorship, fixture rewrite, Calendar work or closed runtime repair was performed. Source-level adapter evidence remains inspection only.

Next: obtain the necessary explicit scope/contract decisions, make only authorized document/packet corrections, and repeat affected fresh independent design reviews. Stop on unresolved HIGH/blocking findings; supplementary tests wait for an actual complete architecture PASS. Do not seek HIGH implementation approval now.
