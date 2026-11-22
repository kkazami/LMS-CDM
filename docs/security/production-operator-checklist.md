# Production operator verification checklist

Sprint 1, 19 November 2026. Tracks PROD-01/02/03, DB-01/02, EXEC-01, LOG-01 and DR-01/02 in [the roadmap](../../SECURITY-ROADMAP.md). **No production check, database access, enrollment or deployment was performed by this sprint.** Every checkbox starts open; existing November 15 observations remain historical.

For each item retain date, named operator/reviewer, credential-free environment identity, exact artifact/configuration version and PASS/FAIL/NOT VERIFIED with supporting receipt. Record no connection strings, keys, student information, factor values or exported records. A present environment-variable name or healthy homepage is not proof of enforcement.

## Release identity and prerequisites

- [ ] Match repository commit, build input and artifact digest to the deployment provider's current deployment ID and custom domain. Record preview/staging/production separately and identify all workers/regions. Local HEAD does not identify the deployed revision.
- [ ] Reconcile native/Electron version, distribution status and update channels with the backend API contract. Record whether those clients actually ship; do not infer it from source or a working development app.
- [ ] Confirm the hosting project/account, deployment permissions, subscription/capacity/paused state and rollback capability. No paid upgrade or new service without owner approval.
- [ ] Review [Sprint 1 results](sprint-1-results.md), unresolved dependency risks, baseline-test dispositions and all blocked/deferred audit items. A limited maintenance release needs explicit residual-risk acceptance; ASVS L2 is not currently verified.
- [ ] Approve an actual maintenance window, monitoring/incident owner, administrator notice and rollback candidate before promotion. Preserve the immutable run2 target and original evidence.

## Database identity and effective permissions

- [ ] Identify PostgreSQL project/branch/database using protected operator configuration, then match it to the deployment runtime secret **without displaying either secret**. The previously configured Neon endpoint was not proven to be production.
- [ ] Confirm server version, installed schema/migration receipts/checksums and the expected generated Prisma client. Reconcile any partial/unrecorded schema before DDL. Do not reset the database or blindly replay all migrations.
- [ ] Confirm the runtime role is neither owner nor superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS; inspect inherited memberships, schema CREATE privileges, default grants and effective access. Verify a separate migration principal and protected-writer guards. Do not reuse owner/migration credentials for runtime or backups.
- [ ] Inspect tenant-isolation controls and any current RLS enablement/policies without assuming policies exist. Review object ownership and trigger/function privileges/search paths. RLS changes require architectural review and approval.
- [ ] Confirm remote connections use certificate and hostname verification; no production loopback exception or disabled verification. Match pool/worker totals to provider connection limits and transaction/statement/lock deadlines.
- [ ] Apply and attest MFA prerequisites only through the approved [MFA rollout](admin-mfa-production-rollout.md). Check all three tables, revocation triggers, grants, active protected key and human enrollment.

Read-only catalog queries may be prepared by the DBA after target approval; do not query student records, vaults or secrets to prove these metadata properties. Runtime-role flags alone do not prove tenant isolation.

## Environment and secret custody

- [ ] Confirm production mode, canonical HTTPS application origin, allowed browser/native origins and provider endpoint settings for the actual deployed candidate. Reject dev/demo/local settings on public production paths.
- [ ] Record identifiers/versions/custodians, never values, for runtime DB credential, MFA wrapping key, GitHub token-encryption key and any previous read keys, Google client credentials, webhook/cron/attendance signing secrets, blob/scanner credentials, provider keys and monitoring credentials actually used.
- [ ] Keep server secrets out of `NEXT_PUBLIC_`, mobile/desktop bundles, source maps, logs, artifacts and exported datasets. Separate production, preview, development, backup and migration credentials; confirm protected secret access and approved rotation/recovery procedures.
- [ ] Confirm real MFA enrollment/recovery readiness. Test normal-use flows through owner-controlled accounts; no automated real-device enrollment and no blocked validation attempts.
- [ ] Verify email/provider sender accounts, minimum scopes, redirect URIs and revocation ownership. Do not send real identity/provider tests or incur quota without separate authorization.

## Ingress, browser and cache delivery

- [ ] Have the ingress owner attest the original-client-address chain, overwritten versus client-supplied forwarding headers and effective auth limiter configuration. Do not trust `X-Forwarded-For` merely because it is present. The dedicated validation remains deferred, not implicitly completed here.
- [ ] Capture effective HTTPS/TLS and security headers for normal HTML/API, redirects/errors and configured exceptions, with no private response body retained. Include HSTS, CSP/nonces/frame policy, nosniff, referrer policy, CORS and authentication response caching. Record known ASVS policy gaps rather than marking compliance from source settings.
- [ ] Verify CDN/reverse-proxy caches do not retain authenticated/student-specific responses; distinguish internal application caches from HTTP caches. No blocked GitHub/mobile/file candidate is being retested by this checklist.
- [ ] Check Electron's effective CSP alongside the server policy if desktop ships. Preserve required editor/embed/runtime behavior while preparing any separate approved policy change.

## Code execution and integrations

- [ ] Set `CODELAB_RUNNER` explicitly to the approved `onlinecompiler` or reviewed authenticated `judge0` configuration; production JDoodle and unknown selectors are rejected by source. No public-demo, host-execution or retired self-hosted fallback.
- [ ] For OnlineCompiler, verify the server-only `ONLINECOMPILER_API_KEY` entry, account/region/terms, source-code retention, sandbox/network isolation evidence and quotas. The application omits unsupported network flags and depends on the provider's isolation contract.
- [ ] For official managed Judge0 use the server-only RapidAPI key configuration; for another reviewed compatible provider require HTTPS origin plus `JUDGE0_AUTH_TOKEN`. Verify the provider enforces `enable_network:false`; a request flag does not prove isolation. Never add LMS/database credentials to student execution environment/source/stdin.
- [ ] Confirm allowed languages, request/global quotas, time/output/memory limits, no redirect/credential forwarding, outage handling and no academic completion on provider failure. Local contract tests are not hosted isolation evidence. Any synthetic paid/quota-consuming smoke check needs approval; no hostile provider test is scheduled.
- [ ] Record integration scope/processor/access ownership and metadata-only webhook/cron configuration evidence. Leave blocked storage/auth validation untouched.

## Audit, alerts and recovery

- [ ] Confirm migration/runtime grants allow `AuditLog` INSERT and the release's `DATABASE_TABLE_EXPORTED` event reaches the intended store. It records actor/tenant/model/count/limit/format and `PREPARED`; no exported content, raw URL, credentials or request metadata. `PREPARED` is not confirmation the browser saved the file.
- [ ] Confirm export audit failure produces a generic unavailable response and no download; preserve existing transactional restore/MFA logging. Check controlled access, retention, redaction, time synchronization and alert routing.
- [ ] Triage the historical over-maximum quiz grade using the authorized academic owner. Preserve history; no correction or exploitation conclusion from a numeric anomaly alone. Prior missing export events cannot prove exports were unused.
- [ ] Approve [backup/DR objectives and strategy](backup-disaster-recovery.md), identify provider restore windows and independent encrypted copies, and name key custodians. Retain a completed isolated recovery receipt before treating recovery as effective.
- [ ] Confirm incident contacts, credential/session revocation authority, monitoring thresholds and MFA-preserving rollback. Keep retained evidence access-controlled and record release sign-off with unresolved risks.

## Release decision receipt

| Field | Operator entry |
|---|---|
| Candidate commit / artifact / deployment ID | Pending |
| Database environment / schema receipt | Pending |
| MFA prerequisites / human enrollment counts | Pending |
| Provider / isolation evidence / quota owner | Pending |
| Backup location IDs / last restore receipt / RPO/RTO | Pending |
| Current advisories / accepted exceptions and expiry | Pending |
| Unresolved baseline, blocked and deferred items | Pending |
| Monitoring / incident owner / secure rollback | Pending |
| Reviewer / explicit production authorization / date | Pending |
