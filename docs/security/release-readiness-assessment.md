# Sprint 5 release-readiness assessment

**Decision: retain as a local qualification candidate.** The reviewed checkpoint, scoped test, restore and build evidence applies to the recorded local revision. Hosted, device and operational gates remain open. [Sprint results](sprint-5-results.md) · [Machine-readable evidence](sprint-5-verification.json)

| Gate | Exact owner action and release evidence |
|---|---|
| Deploy isolation and hosted checks | Confirm each Vercel, GitHub and other deployment integration excludes the exact review branch and gives it no production variables. Authorize its push separately. Provide the GitHub workflow URL and commit showing all required jobs completed. Configure branch protection from the observed aggregate check. |
| Dependency treatment | Approve or remediate the four remaining moderate graph matches. Record supported parent versions, packaging relevance and treatment deadline. Keep high/critical failures release-blocking. |
| Identity | Qualify enrollment, reset, provisioning/SQL and all other writers, the reviewed breached/common password corpus and reader-compatible rollback target. Measure the native hashing package and concurrency on isolated hosting. Approve a credential-writing rollout separately. Require consistent ordinary-role MFA completion before enrollment and enforcement. |
| Session | Verify actual browser/Electron/mobile behavior against the approved synthetic endpoint with the exact UTC rehearsal. Approve a future shared UTC cutover and record the seven-day deadline and compatible rollback artifact. |
| Database | Provide a credential-free identifier for a separately approved synthetic Neon environment. Verify real pool and restricted-role compatibility, review operation/grant migrations and test recovery before authorizing any production database change. |
| Recovery | Identify backup operator, DB and object stores, independent encrypted destination and key custodian. Confirm daily/30-day schedule, PITR, monthly rehearsal, RPO ≤24 hours and RTO ≤4 hours. Record an actual complete recovery receipt and review exam-period RPO needs. |
| Clients and operations | Execute the real-client acceptance matrix, qualify runtime-aware signed rollback, confirm existing administrator enrollment, provider isolation, secrets and alert ownership, and record the intended production build ID. Release or publish only on separate approval. |

Production-wide RLS and MFA, actual cookie cutover, hosted CI and real infrastructure recovery have no passing Sprint 5 receipt. Maintain the old audit coverage ledger and any explicitly blocked work as independent release risks.
