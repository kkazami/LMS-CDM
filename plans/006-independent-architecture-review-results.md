# Independent Super User architecture review results

Provider dispatch succeeded through the trusted host using the existing approved microVM/Codex broker. Supported diagnostics reported healthy/authenticated state; the restricted-context login-service refusal did not require a credential refresh, daemon restart or runtime repair. See [availability evidence](005-provider-availability-resolution.json) and [Docker's supported diagnostics](https://docs.docker.com/ai/sandboxes/troubleshooting/).

**Architecture REVIEW_FAIL. Stop before supplementary tests, feature implementation and formal lifecycle acceptance.** All three reviewers were genuinely fresh isolated sessions with zero prohibited tool calls. Their original outputs/receipts are preserved; the documentary AF table is not substituted for these findings.

## Real independent sessions

| Request | Codex session ID | Verdict | Findings | Missing per-path coverage records | Evidence |
|---|---|---|---|---|---|
| SU-REVIEW-HTTP | 01a11b57-7acf-7562-b330-40a611c86f74 | REVIEW_FAIL | 11 | 110 | [receipt](005-su-review-http-9639e96e-6542-4fb4-b619-3b4f5cd7fa34.receipt.json) / [original findings](005-su-review-http-9639e96e-6542-4fb4-b619-3b4f5cd7fa34.output.json) |
| SU-REVIEW-ACTIONS | 01a11b57-7b47-7e91-9771-4e2aebf4df80 | REVIEW_FAIL | 8 | 0 | [receipt](005-su-review-actions-d661b0ac-03b0-4fd7-8263-536a54920725.receipt.json) / [original findings](005-su-review-actions-d661b0ac-03b0-4fd7-8263-536a54920725.output.json) |
| SU-REVIEW-SHELL | 01a11b57-7ac6-7840-a761-8162a1c50035 | REVIEW_FAIL | 9 | 0 | [receipt](005-su-review-shell-468ab450-cc31-4f7e-a80c-25253cc3f9ea.receipt.json) / [original findings](005-su-review-shell-468ab450-cc31-4f7e-a80c-25253cc3f9ea.output.json) |

Receipts retain UTC start/end timestamps, argv/provider/worker provenance, request/source/output/transcript hashes and session IDs. All sessions bind to controlled source digest `9c4cc7834a8615bfad1b11fe243287a49af292a866103dfe7e0de50b3922a1af`. Inputs were the unchanged assigned packets; provider received no credentials, signer keys, stage capabilities or implementation lease. A preparation-review session is not an accepted Red-Team stage.

## Every independently authored finding

There are 28 separate findings: 6 CRITICAL, 21 HIGH, 1 MEDIUM. Duplicate local finding IDs are namespaced by reviewer; similar findings are not erased or relabeled as one author's work. All remain unresolved. Reviewers' severity is retained; the controlled run's risk classification remains HIGH.

| Reviewer/finding | Severity | Independently reported issue | Documentary disposition |
|---|---|---|---|
| SU-REVIEW-HTTP:SU-AR-001 | CRITICAL | The reviewed security architecture is entirely proposed and the supplied baseline still contains exploitable SUPER_USER privilege paths | ACCEPTED_UNRESOLVED |
| SU-REVIEW-HTTP:SU-AR-002 | CRITICAL | Authentication-only mutation and execution boundaries allow SUPER_USER side effects before the proposed ceiling exists | ACCEPTED_UNRESOLVED |
| SU-REVIEW-HTTP:SU-AR-003 | HIGH | Several normal-role handlers lack persisted ownership and institute-scope checks, so the proposed generic role ceiling is insufficient | NEEDS_HUMAN_DECISION |
| SU-REVIEW-HTTP:SU-AR-004 | HIGH | Authenticated GitHub boundaries expose external repositories and accept writes without course, cohort, or ownership authority | ACCEPTED_UNRESOLVED |
| SU-REVIEW-HTTP:SU-AR-005 | HIGH | Knowledge Exchange eligibility inherits the unknown-to-STUDENT alias and grants SUPER_USER the entire ICS feature suite | ACCEPTED_UNRESOLVED |
| SU-REVIEW-HTTP:SU-AR-006 | HIGH | The proposed middleware pathname marker remains an unproven trust boundary for Next RSC, rewrites, and server actions | NEEDS_HUMAN_DECISION |
| SU-REVIEW-HTTP:SU-AR-007 | HIGH | The account-support exception is not consistently reflected in the implementation allowlist and existing endpoints | NEEDS_HUMAN_DECISION |
| SU-REVIEW-HTTP:SU-AR-008 | HIGH | The implementation allowlist creates ambiguity around the human-resolved anonymous public leaderboard exception | ACCEPTED_UNRESOLVED |
| SU-REVIEW-HTTP:SU-AR-009 | HIGH | Audit and error-failure behavior is proposed but lacks a transactional or non-serialization proof | NEEDS_HUMAN_DECISION |
| SU-REVIEW-HTTP:SU-AR-010 | HIGH | Proposed supplementary verification is neither implemented nor independently reviewed, so claimed complete boundary coverage is unsupported | ACCEPTED_UNRESOLVED |
| SU-REVIEW-HTTP:SU-AR-011 | HIGH | The supplied packet does not contain source bodies for every inventoried route and server action, preventing the required independent full-scope review | DISPUTED_EVIDENCE_REVIEW_INCOMPLETE |
| SU-REVIEW-ACTIONS:SU-AR-01 | HIGH | Role normalization and persisted permissions currently grant unintended legacy authority | ACCEPTED_UNRESOLVED |
| SU-REVIEW-ACTIONS:SU-AR-02 | CRITICAL | Direct actions and callable skills do not consistently bind authorization to the authenticated actor, role, institute, and persisted relationship | ACCEPTED_UNRESOLVED |
| SU-REVIEW-ACTIONS:SU-AR-03 | CRITICAL | Multiple teaching, grading, attachment, and group actions authorize unrelated resource IDs or omit course ownership entirely | ACCEPTED_UNRESOLVED |
| SU-REVIEW-ACTIONS:SU-AR-04 | CRITICAL | All six inline activity actions remain authentication-only mutation boundaries | ACCEPTED_UNRESOLVED |
| SU-REVIEW-ACTIONS:SU-AR-05 | HIGH | The proposed pathname-marker shell defense is not yet demonstrated trustworthy for Next RSC and server-action requests | NEEDS_HUMAN_DECISION |
| SU-REVIEW-ACTIONS:SU-AR-06 | HIGH | Sensitive gradebook service has no authenticated service-boundary authorization | ACCEPTED_UNRESOLVED |
| SU-REVIEW-ACTIONS:SU-AR-07 | HIGH | Normal-role preservation cannot be satisfied by the proposed role aliases without systematic ownership hardening | ACCEPTED_UNRESOLVED |
| SU-REVIEW-ACTIONS:SU-AR-08 | HIGH | Required audit behavior and supplementary verification remain proposals with no executable evidence | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-001 | HIGH | Role normalization and persisted permissions still grant unsupported roles legacy authority | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-002 | CRITICAL | Inline server actions authenticate but do not authorize role, institute or course ownership | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-003 | HIGH | Proposed pathname-marker shell gate is not yet proven trustworthy for Next RSC and action traffic | NEEDS_HUMAN_DECISION |
| SU-REVIEW-SHELL:SU-AR-004 | HIGH | Retained title and instructor-name metadata lacks a content-classification boundary | NEEDS_HUMAN_DECISION |
| SU-REVIEW-SHELL:SU-AR-005 | HIGH | Mandatory access-audit failure behavior exists only as a proposal | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-006 | HIGH | Cookie/Bearer actor-selection semantics are not yet verified at protected boundaries | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-007 | HIGH | Boundary inventory is broad, but proposed verification can pass without operation-level completeness | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-008 | HIGH | Current generic shell leaks and mutates out-of-scope account and academic state for SUPER_USER | ACCEPTED_UNRESOLVED |
| SU-REVIEW-SHELL:SU-AR-009 | MEDIUM | Public leaderboard scope is human-resolved and must not be converted into a SUPER_USER-specific denial | NEEDS_HUMAN_DECISION |

[Complete finding and adjudication record](006-independent-architecture-findings.json) includes every original severity, exact reported path/symbol/line evidence, affected AC, impact, recommendation, confidence, human/contract-revision flag, coverage and limitation, plus individual root dispositions and source-verification notes. An ACCEPTED_UNRESOLVED disposition accepts the finding's validity, not its remediation. No proposed future guard or test is marked a resolved fix.

## Blocking architecture and review gaps

- Retained course/event/material titles and instructor names have no content-classification guarantee. **SU-REVIEW-SHELL:SU-AR-004 explicitly requires a human privacy/contract decision.** Any change to DTO, heading expectations, AC or frozen fixtures requires explicit human-approved revision and separate independent fixture review. No revision is applied here.
- The pathname-marker design still lacks exact trusted-header, normalization, rewrite, prefetch, RSC and action semantics. Independent reviewers retain it as HIGH; a proposed overwrite statement is insufficient.
- The 002 command mapping needs operation-level case/evidence completeness, not only group test titles and coverage labels. Ownership/aliases, account support/public exceptions and audit failure semantics need precise dispositions.
- Known baseline authorization, inline/callable actor, gradebook, execution and shell defects remain unimplemented source risks. They must not be described as already fixed or used to authorize implementation. Reviewer recommendations to implement/run tests now do not override the user's pre-implementation stop.
- **HTTP coverage is incomplete:** all 120 assigned route bodies were present in the hash-verified input, but 110 lacked individual output coverage records. Its statement that route bodies were absent is contradicted by the packet. This finding remains disputed/incomplete, not rejected into a PASS. Full HTTP review requires independent correction or explicit hash-bound path partitions with complete coverage. The actions and shell reviewers returned complete assigned-path coverage; their limitations about other reviewers' sources do not establish those other sources were missing.
- Public leaderboard scope remains human-resolved and outside anonymous AC-007 confidentiality. Reviewers flag the plan's modification-eligible public-route entry as an ambiguity. No public DTO/privacy behavior or source is changed; revise the plan to make this boundary unambiguous and independently reassess.
- Some reviewer line ranges are inaccurate. In particular, the actual AuditLog model starts at T/prisma/schema.prisma:428; line 387 starts CalendarEvent. Original findings are preserved and corrections are separately noted; inaccurate ranges are not silently treated as verified proof.

## Required next action

Request explicit human adjudication of the retained-metadata privacy contract and the pathname-marker architecture, then revise only preparation documents/plan specifications as authorized and obtain new independent architecture assessment, including the missing HTTP per-operation coverage. If a contract or frozen fixture must change, stop for approved revision and independent fixture review. Do not author supplementary tests until actual architecture PASS.

The eventual HIGH implementation-approval gate remains closed; the immediate blockers are unresolved independent architecture findings and incomplete review coverage. No formal predecessor was accepted, no implementation approval granted and no implementation lease acquired. Actual run remains DRAFT/HIGH, next requirements.

## Preservation

All 1337 controlled snapshot files, seven frozen fixtures, state/journal and original preparation document remain unchanged. Application source, harness gates, schemas and databases were not modified or executed. No supplementary tests were created/frozen. Docker/Sandbox repair remains closed and Calendar remains outside scope. All authored artifacts are under primary-tree plans/.
