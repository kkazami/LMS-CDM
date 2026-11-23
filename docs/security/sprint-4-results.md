# Sprint 4 results

**19 November 2026 — local release candidate.** Expo SDK 58 closes the high mobile dependency advisory. The candidate adds password-format compatibility, account-owned session revocation, a bounded cookie transition and PostgreSQL limiter improvements. The isolated staging and recovery fixtures passed. The results below apply to the recorded source and fixture scopes. [Roadmap](../../SECURITY-ROADMAP.md) · [Verification data](sprint-4-verification.json) · [Release gates](production-release-gates.md)

## Git and evidence

| Scope | Result |
|---|---|
| Sprint 2 | The owner-approved 55-file snapshot was committed as `0452a5dae2ef5d3026f9e11fb6b2c214c2d36e04`. Its tree is `de0d269b47588082210e470b9b28ce7da0c5e500` and exact reviewed patch SHA-256 is `eb27390b6fed08dafd17f70c6aaa2ad15abc0377086bb916e0f8378af94000c3`. |
| Sprint 3 | A separate 15-file snapshot is frozen in the local `tmp/security-sprint-4/sprint-3-checkpoint` review directory. Tree `83b9d5e8e2e4ba5bb79b9106a888be4eac288c21` and patch SHA-256 `2192af57bef398dae5b84c3c85c2e08293e7d49938493c20abcb3d617817fb2b`. The original branch retains these edits and awaits separate commit review. |
| Sprint 4 | `codex/security-sprint-4` is checked out in the isolated worktree. Expo-only checkpoint `4ddff68f8dd9ae5a7703d3d6a70b978ff1d9f53a` holds 19 mobile files and its own lockfile. The combined candidate in the worktree includes the frozen Sprint 3 source and uncommitted Sprint 4 identity, database pilot and evidence. The local review snapshot contains the Sprint 4-only file list, source hashes and complete diff. |
| Historical audit | The unchanged run2 revision is `5dc0a42963b241ca0bbaa1711ad6318fe0b9f202`. Coverage remains 14 covered, four candidates, eight blocked and 51 deferred. The existing 186-file evidence inventory was checked. Prior blocked units remain excluded. |

### Files

The exact paths and hashes are in [the verification inventory](sprint-4-verification.json). The mobile commit changes the Expo app/package configuration, SDK 58 navigation types, WebView typing, affected React refs/list rendering and workspace lockfile. The remaining runtime changes are under `apps/web/src/lib`, `apps/web/src/app/api/auth`, the privacy page, middleware, Next.js configuration, `apps/desktop/electron/main.ts`, web package/lock and `scripts/security/run-scoped.py`. Permanent fixtures are under `tests/sprint-4`. The new security documents, existing control documents and ASVS register capture evidence and rollout boundaries.

## Sprint 4A — dependency and build

| Verification | Before | Sprint 4 candidate |
|---|---|---|
| Production graph | 1 high and 2 moderate | 2 moderate |
| Full graph | 1 high and 4 moderate | 4 moderate |
| Mobile SDK | Expo 57 and affected Router path | Expo 58.0.26, Router 58.0.32, React Native 0.88.1 and React 19.3.0. Router's path to `decode-uri-component@0.2.2` is absent. |
| Expo checks | Prior Expo 57 results in Sprint 2 | Offline CLI alignment passed with the CLI's offline warning. Doctor 1.21.8 passed 18/20 and exited 1 because the remote schema and React Native Directory services were unavailable. Mobile typecheck and Android/iOS JS bundle exports passed. Native builds, real device interaction and signed distribution are open. |

The remaining matches are two minimatch versions in desktop packaging, uuid in the mobile development tunnel and glob in Sentry's bundler tooling. The new Sentry path accounts for the moderate match introduced with SDK 58. The package contracts require compatible parent changes to use the patched majors. The Next.js service remains the web backend. SDK 58 uses a separate native runtime. The upgrade and new Argon native binary require separate release artifact verification. [Dependency report](sprint-4-dependency-remediation.md) · [SDK rollout and rollback](expo-sdk-58-migration.md)

Earlier Windows-backed runs timed out at compilation or trace collection, including a 15-minute Sprint 3 trace attempt. With the dependency store installed on a Linux-native filesystem inside the pinned Node container, the Expo-only web build completed in 257.05 seconds and the first identity-inclusive candidate in 448.48 seconds. The final rerun exited 0 in **338.30 seconds** with build ID `NuxBqACYWj163nQR8aJZ0`. It verified TypeScript, generated all 40 static pages, collected traces and asserted the build ID, runtime-file manifest and health route trace. The comparison supports filesystem traversal overhead as a contributor. Graph differences and concurrent resource load prevent isolating the effect. The artifact assertions now run in the existing CI compatibility runner. [Build receipts](sprint-4-verification.json)

Local permitted Semgrep and Gitleaks scopes passed with zero findings. The local dependency inventory has zero high or critical matches. GitHub's actual dependency, static, secret detection, compatibility and aggregate jobs are **unverified**. The review branch was held because Vercel and any deployment integrations could not be verified to exclude production and privileged preview side effects.

## Sprint 4B — identity and sessions

- **Argon2id.** Updated application readers accept legacy bcrypt and the bounded Argon2id profile. Permanent fixtures cover native verification, random salts, policy decisions and the legacy 72-byte migration boundary. Protected SQL, recovery and other writer/rollback compatibility still prevent enabling writes. The tested policy helper requires a reviewed local blocklist. Production forms and password writers use the existing policy until those gates pass. [Migration](password-hashing-migration.md)
- **MFA.** Existing administrator and Super User assurance is retained and its approved fixture still passes. Instructor/student enrollment and local ordinary-role enforcement were held because the current privileged challenge and the Google/native admission handoff require compatible completion paths before widening policy. The pilot and recovery plan specifies factor protection, accessibility and rollback. [MFA](system-wide-mfa.md)
- **Sessions.** Self-service single and all-device revocation is account-scoped and transactional. All-device requires a session created within five minutes. The privacy view filters expired sessions and sends minimal metadata. Browser cookie migration uses a shared UTC cutover and a seven-day legacy read window; native bearer authentication remains supported. Cutover and real client acceptance are pending. Fresh factor authentication for **individual** revocation and a privileged self-service equivalent remain gaps in full V7.5.2 coverage. [Session policy](session-security.md)

## Sprint 4C — rate limiting and PostgreSQL

- **Rate limiting.** Saturated, atomic UPSERT uses one statement clock for count and expiration. Bounded cleanup uses an advisory lock and skips locked rows. Account-owned revocation gets a persistent budget and CodeLab keeps its existing shared budget. The PostgreSQL pilot processed 100 transactions across four clients and two keys at 0.475 ms average latency, with zero failures. Saturation and window reset passed. Real Neon contention, pool use, authentication ingress and operation coverage remain open. [Rate limiting](distributed-rate-limiting.md)
- **RLS.** A PostgreSQL 17 synthetic course read pilot exercised student enrollment, instructor ownership, administrator institute scope, absent/wiped transaction context and restricted grants. Existing application checks stay authoritative. Prisma/Neon transaction propagation, writes, operational exceptions and reviewable production migrations remain Sprint 5 gates. [RLS](postgresql-rls-implementation.md)

## Sprint 4D — scoped verification and recovery

| Evidence | Observed result |
|---|---|
| Approved regression manifest | 116/116, with zero skips or failures, including seven new tests. The first run detected a legacy MFA-cookie compatibility regression. Restoring the existing cookie-clear behavior fixed it without changing the assertion. |
| Typechecks and artifacts | Web, mobile, desktop and harness typechecks passed. Desktop main/preload compiled. Android and iOS bundle exports passed. The local Next.js production build completed with TypeScript and traces. |
| Prisma staging | One current-schema database/API case passed. Ordinary student and instructor course reads and a metadata-only MFA-admin export audit used dummy identities. The dump restored counts of 3 users, 1 course, 1 enrollment and 1 export audit event. |
| RLS recovery | Three synthetic courses restored with grants and policy checks. Destination creation and restore took 78 ms, and the record fingerprint matched. DB/object/key recovery at production scale remains unverified. |
| Production recovery planning | Owner-approved targets are RPO ≤24 hours, RTO ≤4 hours, daily encrypted independently held copies, 30-day retention, monthly restoration and PITR where available. Scheduling, actual inventory, offsite capacity and exam-period RPO have to be verified. |
| Scope | The normal staging case covers a small set of approved workflows. Broader browser and signed-client journeys, live integrations, real admin enrollment and infrastructure controls remain open. |

[Staging and recovery](sprint-4-staging-verification.md) · [Recovery runbook](backup-disaster-recovery.md)

## ASVS evidence and next owner decisions

The register appends scoped evidence for cookie flags and prefix (V3.3), session timeouts and revocation (V7.3/V7.4/V7.5), password policy and hashing (V6.2/V11.4), durable limiter behavior (V2.4), tenant controls (V8.4) and approved admin export log metadata (V16.2). Instructor/student assurance (V6.3) retains its known gap. Existing requirement classifications and applicability decisions were preserved. No full requirement passes, full coverage or compliance designation were added. [ASVS register](asvs-5.0-level2-register.csv) · [Pinned standard](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv)

The owner needs to verify Vercel/preview isolation before any push, approve the Sprint 3 checkpoint, configure protected-branch requirements after a real hosted receipt, qualify native releases and enroll administrators. Deployments, cookie cutover, a password-writer rollout, ordinary-role MFA mandates, production grants/RLS migrations and retention/recovery operations each need separate release decisions. Confirm actual secret custody, provider configuration and staging/recovery capacity through the operational gates. No production change, separate paid service, published release or historical data change occurred.

For Sprint 5, start with safe hosted CI and actual synthetic client acceptance. Qualify the Argon2id reader/writer and rollback chain and run hosting resource benchmarks before allowing writes. Implement a unified Google/browser/native MFA handoff and test an accessible voluntary cohort. Extend the database pilot through the real Prisma transaction client and synthetic pooled staging, then rehearse full recovery including private objects and key custody. Revisit the four moderate dependencies using supported parent changes. [Release gates](production-release-gates.md)
