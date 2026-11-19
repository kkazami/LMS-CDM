# Sprint 3 identity, authorization and dependency security

19 November 2026. Start with the [central roadmap](../../SECURITY-ROADMAP.md) and [machine verification](sprint-3-verification.json). This sprint applies narrow server authorization changes and prepares the identity and database designs for owner decisions.

## Changes and evidence

- **AZ-05 and API-01.** The administrator account detail GET checks the admitted request session, institute and existing subordinate rules. The final query filters the account ID, institute and eligible role, and selects the existing profile projection. Successful responses use `private, no-store`. Unexpected failures use a generic message.
- **AZ-01, AZ-02 and API-01.** Gradebook CSV export carries the route's request through the existing server checks. Assigned instructor aliases and same-institute Administrator exports follow the same role policy as the exporter. Roster and submission queries restrict students by institute. Course relationship denials return authorization statuses and the download keeps its CSV format. The dashboard action and academic calculations retain their existing contracts.
- **CI.** The existing bounded runner adds a second explicit test manifest for six new authorization tests and one existing CSV grade regression. The unchanged workflow invokes the expanded runner and requires all 109 tests with zero failures, skips, cancellations or todos. The aggregate, dependency, secret and static checks retain their Sprint 2 scope. [Authorization matrix](authorization-matrix.md) · [Automation](automated-security-checks.md)
- **IAM.** The proposal covers authentication pathways, dual bcrypt/Argon2id verification, password manager compatibility, instructor and student MFA, recovery, cookie migration, session lifecycle and distributed rate limiting. Owner approval is required for implementation of the proposed policies. [IAM proposal](identity-access-management.md)
- **Database architecture.** Keep resource-level application authorization and restricted principals now. Consider a small transaction-scoped RLS pilot only after a grants inventory, policy and recovery rehearsal. [Database proposal](database-security-architecture.md)

ASVS v5.0.0 requirements `8.1.1`, `8.1.2`, `8.2.1`, `8.2.2`, `8.2.3`, `8.3.1` and `8.4.1` receive documentation and regression evidence scoped to these operations. Requirement classifications stay open to broader verification. MASVS device and distribution evidence remains pending. [ASVS register](asvs-5.0-level2-register.csv)

## Sprint 3 file inventory

| Area | Modified or added |
|---|---|
| Account management | Modified `apps/web/src/app/api/admin/users/[userId]/route.ts`. |
| Gradebook | Modified `apps/web/src/app/api/courses/[courseId]/gradebook/export/route.ts`, `apps/web/src/lib/skills/gradebook-exporter.ts` and `apps/web/src/lib/super-user-v1/legacy-entry-guard.ts`. |
| Tests and CI | Modified `scripts/security/run-scoped.py`. Added `tests/sprint-3/allowed-tests.json` and `tests/sprint-3/authorization.test.cjs`. |
| Security records | Modified `SECURITY-ROADMAP.md` and `docs/security/asvs-5.0-level2-register.csv`. Added this report, `sprint-3-verification.json`, `identity-access-management.md`, `authorization-matrix.md`, `database-security-architecture.md` and `remaining-dependency-remediation.md` under `docs/security/`. |

## Checkpoint and verification

The requested Sprint 2 checkpoint is frozen at tree `de0d269b47588082210e470b9b28ce7da0c5e500` on base `b8f5d4b7da704f76d2abeae8748d012d0115a7ba`. Its complete patch and 55-file inventory are in [the local review directory](../../tmp/security-sprint-3/sprint-2-checkpoint/REVIEW.md). The snapshot matches all 47 recorded Sprint 2 source hashes and all 186 protected historical evidence files. The proposed commit awaits approval. Later Sprint 3 edits are outside the frozen tree.

- The offline scoped suite passed 109 tests with zero failures and skips. It includes the six new cases, the existing period-grade CSV test and all 102 Sprint 2 tests.
- Prisma generation, Next route type generation and the web TypeScript check passed. Mobile, desktop and harness typecheck results remain recorded in the Sprint 2 evidence. Sprint 3 did not change their source or dependency versions.
- The first offline Next.js production build compiled successfully, then reached its 600-second limit during build-time TypeScript checking and exited 124. The retry used a 900-second limit with the same dependency snapshot, command, offline sandbox, memory and CPU bounds. It compiled, passed build-time TypeScript and generated all 40 static pages. It exited 124 while collecting build traces. The complete build remains unverified. Both attempts retained the existing Prisma and webpack warnings.
- Semgrep scanned the existing ten-file scope with zero findings. Six policy fixture tests and the static rule expectations passed. The existing redacted Gitleaks scope returned zero findings. This evidence covers the recorded explicit scan scopes.
- See [verification receipts](sprint-3-verification.json) for build/typecheck exit codes, timings and tested source hashes. Signed clients and hosted GitHub enforcement require owner evidence.

## Dependencies and remaining gaps

Fresh frozen-lockfile scans report **3 production matches and 5 overall**, with **0 critical and 1 high** in each graph. No supported compatible patch resolves any of the five paths on this dependency graph. Router 58 drops the flagged mobile decoder path and requires coordinated SDK and native changes. The supported migration proposal was presented for approval. The advisory gate still fails. [Advisory and migration decision](remaining-dependency-remediation.md)

Run2 contains 77 units with 14 covered, four candidates, eight blocked and 51 deferred. Historical checks and prerequisite limitations remain in their original evidence. Scoped authorization tests exercise route/service code with admitted-session and database doubles. Production permissions, deployed cache/ingress behavior, database availability controls, real factor enrollment, native signing and updates, and broader authorization coverage remain open. Existing blocked security validation is outside this sprint.

## Owner verification instructions

1. **Hosted CI and branches.** After approving a commit and separately authorizing a push, open a review PR and inspect the `Security engineering` workflow on the actual commit/test merge SHA. Check that dependencies, static, secrets and compatibility each report a real result. In **Settings → Rules → Rulesets** or branch protection, require PR reviews, stale approval dismissal where appropriate, and the actual `aggregate-security` check from GitHub Actions. Restrict bypass and force pushes. Require owner review of workflows, test manifests and security tooling. Confirm the known advisory failure blocks merge before declaring the policy effective. Keep workflows read-only and production credentials in restricted deployment environments. [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
2. **Dependency and secret ownership.** In the repository security settings, enable Dependabot alerts and security updates where available. Assign a maintainer to triage each weekly security update and record ownership and due dates. Enable native secret scanning and push protection if available under the current plan. Confirm integrations and reviewers using a harmless non-secret workflow fixture or the provider's own status screen. The repository's redacted Gitleaks scope remains active. [Automation runbook](automated-security-checks.md)
3. **Staging.** Use a separately authorized environment with synthetic accounts, isolated database/restore target, staging OAuth credentials and provider isolation. Record commit SHA, lockfile SHA-256, build artifact ID or hash, deployment ID, time, schema revision and synthetic ordinary role/workflow results. Match displayed build identity to the approved artifact before any acceptance. Avoid public staging previews with production data or credentials. [Client and staging checklist](client-release-security.md)
4. **MFA and database.** Enroll real administrators on their own devices during the approved rollout, verify the intended role gates and record only enrollment status. Retain recovery-code custody and rehearse the MFA-preserving rollback. Have the database operator attest runtime and migration role separation, effective privileges, remote TLS, pool settings and protected guard qualification using catalog metadata. [MFA rollout](admin-mfa-production-rollout.md) · [Production checklist](production-operator-checklist.md)
5. **Recovery and clients.** Set backup retention and RPO/RTO, rehearse an isolated restore with schema, grants, keys and object dependencies, then retain an operator receipt. For signed Android/iOS and desktop releases, record package ID, runtime/channel, version, signing identity and artifact hash. Verify ordinary sign-in, navigation, session and permission behavior on supported devices using synthetic staging and keep a reviewed signed fallback. Keep private signing keys out of PR jobs. [Backup and recovery](backup-disaster-recovery.md) · [Client release gates](client-release-security.md)

## Decisions and Sprint 4

Approve the coordinated SDK 58 migration or choose to await a supported SDK 57 backport. For IAM, decide enrollment cohorts, accessible factors and recovery ownership, password and Argon2id cost policy, session and cookie migration, and persisted limiter policy. For the database, approve any roles/grants or RLS changes independently. Production access, push, deployment, migration, signing and paid infrastructure require separate authorization.

Sprint 4 should start with the approved mobile remediation and a real hosted CI receipt. Next ship dual hash readers before changing password writes, pilot instructor MFA with recovery and accessibility checks, and rehearse restricted-role and backup verification in staging. Retain individual authorization and identity evidence in the ASVS register as acceptance tests pass.
