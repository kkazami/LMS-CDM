# LMS security checklist status — 20 October 2026

Read-only source review of the current shared workspace, including uncommitted changes. No application source was changed. No live database, hosting console, production endpoint, vulnerability-advisory service, or organizational process was audited, and no tests were executed. Test files and documentation establish that work exists, not that it currently passes or is deployed.

## Counting and status definitions

Your pasted list contains **89 top-level checklist items**: 54 general/application items and 35 database items. The six security-header subitems are counted together as their original parent item. Repeated requirements, such as password hashing and parameterized queries, remain counted separately to match your list. This is a checklist inventory, not a security score.

| Status | Count | Meaning |
|---|---:|---|
| Present | 12 | Concrete implementation found in reviewed source; deployment and exhaustive correctness are not certified. |
| Partial | 42 | Some implementation exists, but a material part is missing, inconsistent, or unverified. |
| Not found | 9 | No implementation or relevant policy located in the reviewed repository. |
| Unverified | 24 | Requires hosting, database, backup-provider, or organizational evidence. |
| Not applicable | 2 | Optional suggestion or technology not used by this LMS. |

A public login/reset endpoint is intentional. The endpoint-authentication requirement is interpreted as authentication on protected resources, not authentication before signing in. A rotating access/refresh-token design is an absent requested design; opaque database sessions are a valid alternative architecture and its absence alone is not a demonstrated vulnerability.

## Application and operational checklist

| # | Requested control | Status | What is in the LMS / what remains |
|---|---|---|---|
| 1 | Strong password hashing | Present | bcrypt: activation cost 12; password reset/change cost 10. [A,B] |
| 2 | Password policy and breached-password checks | Partial | Minimum 8 and complexity rules; no breached-password lookup found; change-password has a weaker policy. [B,C] |
| 3 | MFA / TOTP / passkeys / hardware keys | Not found | No implementation found. |
| 4 | Brute-force protection | Present | Login has persistent PostgreSQL IP/account limits plus in-memory limits. Proxy/IP trust still needs deployment review. [D] |
| 5 | Secure password reset | Partial | Has hashed, single-attempt, 15-minute codes and session revocation. Existing-account rate-limit/delivery responses can differ from nonexistent accounts. [B] |
| 6 | Generic login credential errors | Present | Unknown account and wrong password use the same credential error; authenticated status/portal failures differ. [D] |
| 7 | Server-side logout invalidation | Present | Deletes the selected session in PostgreSQL and clears cookie. [E] |
| 8 | Idle and absolute session timeouts | Partial | 7-day expiry exists; no idle timeout found; refresh extends expiry 30 days without a fixed lifetime ceiling. [E,F] |
| 9 | Fresh session identifier after login | Present | New cryptographically random 256-bit token created per login. [E] |
| 10 | HttpOnly / Secure / SameSite cookies | Present | HttpOnly, SameSite=Lax; Secure in production. [E] |
| 11 | Short access tokens and rotating refresh tokens | Not found | Refresh extends the existing session; it does not rotate the token. [F] |
| 12 | Revoke sessions | Present | Authenticated DELETE checks session ownership. An all-devices action was not established. [G] |
| 13 | No-store on authenticated responses | Partial | Some APIs set no-store; assignments/announcements explicitly allow private caching. No universal policy. [H,I] |
| 14 | Server permissions on every request | Partial | Server guards exist, but resource checks are inconsistent. Assignments accepts a course ID without student enrollment checking. [I,J] |
| 15 | Least privilege / RBAC / ABAC | Partial | RBAC and dedicated role guards exist; legacy resource gaps prevent a complete rating. [I,J] |
| 16 | IDOR protection | Partial | Many scoped checks exist; assignments course-ID branch lacks enrollment/tenant relationship checking for students/instructors. [I,J] |
| 17 | Deny by default | Partial | New role allowlists deny unknown roles; legacy resource access still has gaps. [I,J] |
| 18 | Separate, stricter admin interfaces | Present | Dedicated admin and privileged-role areas with server role checks and selected reauthentication controls. MFA is separately absent. [J,K] |
| 19 | Server input validation | Partial | Zod used in newer flows, but not all legacy handlers validate complete type/size contracts. [B,C,J] |
| 20 | ORM / parameterized SQL | Present | Prisma queries and tagged SQL used in reviewed runtime paths; no request-built SQL injection confirmed. Not a proof of every possible query. [D,L] |
| 21 | Output encoding and CSP | Partial | React encoding and CSP exist, but CSP permits unsafe-inline/unsafe-eval; raw HTML sinks also exist. [M,N] |
| 22 | Command / path traversal / SSRF protection | Partial | Filename sanitation and remote execution controls exist; attachment URL fetching lacks a network destination allowlist. [O,P] |
| 23 | Safe file uploads | Partial | MIME/25MB checks and sanitized names; general upload stores public blobs or public/uploads, with no malware scan found. [O] |
| 24 | Safe deserialization | Partial | Ordinary JSON parsing, with schemas in some paths; validation and parser resource limits are not consistent. No unsafe executable-object deserializer identified. |
| 25 | CSRF protection | Partial | SameSite=Lax and origin checks in newer/admin flows; no universal token/origin enforcement on legacy mutations. [E,J] |
| 26 | Narrow CORS | Present | Exact configured origins receive credentialed CORS; wildcard is not reflected. Live origin configuration unverified. [Q] |
| 27 | Security headers (six subitems) | Partial | HSTS in production, nosniff, anti-framing, Referrer-Policy, Permissions-Policy are present. CSP present but permissive. [M] |
| 28 | HTTPS everywhere / modern TLS only | Unverified | Requires live hosting, proxy, service and TLS configuration; headers do not establish TLS versions. |
| 29 | Encryption at rest | Unverified | Provider/disk/database storage encryption cannot be established from source. Field encryption is assessed separately. |
| 30 | Secrets management | Partial | Environment variables used, but GitHub token vault and webhook include hardcoded fallback secrets. Values intentionally omitted. [R,S] |
| 31 | Data minimization / retention | Partial | Some field selection and 30-day import cleanup; no comprehensive sensitive-data retention policy. [T] |
| 32 | Sensitive-data masking in logs/responses | Partial | Sanitized errors exist in newer paths, but public health diagnostics and raw error responses remain. [U,V] |
| 33 | Secure backups | Unverified | No operational backup implementation verified. Backup page is a placeholder; provider backups require verification. [W] |
| 34 | Authentication on protected endpoints | Partial | Session guards widely used; diagnostic health endpoint is public and exposes internals. Intentional login/reset/public endpoints do not themselves require auth. [J,U] |
| 35 | Rate limiting / throttling | Partial | Persistent login and selected feature limits exist; not applied uniformly to APIs. [D] |
| 36 | Request schema validation | Partial | Strong schemas in newer flows; several legacy handlers use manual checks/type assertions. [B,C] |
| 37 | Avoid excessive data exposure | Partial | Many explicit selects, but public health reveals infrastructure/counts and same-institute profile responses expose broad contact/identity fields. [U,X] |
| 38 | Safe HTTP errors | Partial | Generic handlers exist; health and legacy admin status responses can expose internal error messages. [U,V] |
| 39 | Patched dependencies plus vulnerability scanning | Partial | Lockfile exists; no automated dependency scanner found. Current vulnerability/patch state was not checked against advisory services. [Y] |
| 40 | Disable debug/default accounts/directory listing in production | Unverified | Public diagnostics exist; live account and production server configuration were not inspected. [U] |
| 41 | WAF / DDoS protection | Unverified | Requires provider settings. |
| 42 | Network segmentation / firewalls | Unverified | Requires infrastructure settings. |
| 43 | Least-privilege DB/service accounts | Partial | Restricted runtime/operator role scripts exist, but runtime CRUD grants cover all public tables; actual deployed roles unverified. [Z] |
| 44 | Secure CI/CD / supply chain | Partial | Read-only CI permissions and frozen lockfile; workflow covers harness, not full product security or signed product releases. [Y] |
| 45 | Security logging | Partial | Application audit trails cover selected admin/account operations; full successful/failed login coverage not established. [AA] |
| 46 | Tamper-resistant centralized logs and alerts | Partial | Audit-table modification guard exists; external centralization and suspicious-activity alerting unverified. [AA] |
| 47 | Incident response plan | Not found | No product incident response plan located. |
| 48 | Audit trails for sensitive operations | Partial | Implemented for selected privileged/roster workflows; comprehensive coverage not established. [AA] |
| 49 | Threat modeling during design | Not found | Security design/review documents exist, but no explicit maintained product threat model located. |
| 50 | Code reviews and SAST | Partial | Harness review/static checks exist; no product SAST workflow found. [Y] |
| 51 | DAST and periodic penetration testing | Partial | API/browser security test sources exist; no periodic penetration-test program or DAST scanner established. Tests were not executed in this audit. [AB] |
| 52 | Dependency and container scanning | Not found | No automated dependency/container vulnerability-scanning workflow found. [Y] |
| 53 | Developer security training | Unverified | Organizational practice cannot be established from source. |
| 54 | Vulnerability disclosure policy | Not found | No policy located. |

## Database checklist

| # | Requested control | Status | What is in the LMS / what remains |
|---|---|---|---|
| 55 | Separate, minimally privileged DB accounts per service | Partial | Runtime/operator split scripted; broad table grants and deployment state remain limitations. [Z] |
| 56 | Do not use DB superuser for application | Partial | NOSUPERUSER/NOBYPASSRLS role setup and privileged-workflow checks exist; actual live application principal not inspected. [Z] |
| 57 | Remove default DB accounts/sample databases | Unverified | Requires live database inventory. |
| 58 | Strong unique DB passwords in a secret manager | Unverified | Secrets intentionally not read; strength, uniqueness and storage platform not verified. |
| 59 | Restrict direct DB administration via VPN/bastion/MFA | Unverified | Requires infrastructure/account settings. |
| 60 | Tenant row-level security | Not found | No PostgreSQL ENABLE ROW LEVEL SECURITY / CREATE POLICY found. Application scoping and workflow triggers are different controls. |
| 61 | No public internet DB exposure | Unverified | Requires provider/network configuration. |
| 62 | Private database subnet | Unverified | Requires provider/network configuration. |
| 63 | DB IP/port firewall allowlists | Unverified | Requires provider/network configuration. |
| 64 | Change default DB port if appropriate | Not applicable | Optional checklist suggestion; not counted as a missing security feature. |
| 65 | TLS on every application-to-DB connection | Partial | Remote SSL configured and some sslmodes upgraded to verify-full; fallback sets rejectUnauthorized:false. Effective certificate validation depends on URL options. [L] |
| 66 | Database disk/TDE encryption at rest | Unverified | Requires storage/provider evidence. |
| 67 | Field/column encryption for sensitive values | Partial | GitHub tokens use AES-256-GCM; does not establish encryption of every sensitive field. Fallback key weakens key management. [R] |
| 68 | Separate keys and regular rotation | Partial | Environment-supplied encryption key supported, but fallback key exists and no rotation implementation/procedure found. [R] |
| 69 | Hash passwords stored in DB | Present | bcrypt; duplicate of item 1. [A,B] |
| 70 | Minimize and delete sensitive DB data | Partial | Some minimization and import retention; no full retention/deletion policy. [T] |
| 71 | Tokenize/mask sensitive DB values | Partial | Sessions/activation tokens are hashed; broader masking and response minimization remain incomplete. [A,E,U] |
| 72 | Synthetic/anonymized dev and test data | Partial | Synthetic test/seed fixtures exist; actual local/development data provenance not inspected. |
| 73 | Parameterized/prepared queries everywhere | Present | Prisma and tagged queries in reviewed runtime paths; duplicate of item 20, with the same review limitation. [D,L] |
| 74 | Safe stored procedures with dynamic SQL | Partial | Privileged SQL uses controlled functions/guards and quoted identifiers; not a comprehensive review of every procedure. [Z,AA] |
| 75 | NoSQL operator-injection protection | Not applicable | Current backend uses PostgreSQL, not a NoSQL database. |
| 76 | Automated regular DB backups | Unverified | No repository automation establishes provider backups. Placeholder UI is not backup functionality. [W] |
| 77 | Encrypted backups in separate location/account | Unverified | Requires backup-provider evidence. |
| 78 | Periodic backup restore tests | Unverified | No actual LMS backup restore evidence verified. Disposable harness migration recovery is a different test. [Y,W] |
| 79 | Immutable/offline ransomware-resistant backups | Unverified | Requires backup-provider evidence. |
| 80 | Documented RTO/RPO recovery targets | Not found | No product recovery-time/recovery-point targets located. |
| 81 | Patched DB engine | Unverified | Production engine version/advisories not inspected. |
| 82 | Disable unused DB extensions/features/admin interfaces | Unverified | Requires live database inventory/configuration. |
| 83 | Hide database/schema errors | Partial | Generic errors in newer handlers; health returns raw database error text and schema hints. [U,V] |
| 84 | CIS or equivalent DB hardening benchmark | Not found | No product benchmark/check evidence located. |
| 85 | DB connection limits and timeouts | Partial | Pool maximum, idle and connect timeouts exist; no general statement/query timeout found. [L] |
| 86 | Database login/privilege/schema/sensitive-table auditing | Unverified | Application AuditLog is present, but does not establish PostgreSQL server audit configuration. [AA] |
| 87 | Alerts for unusual database activity | Unverified | No production monitoring configuration verified. |
| 88 | Send DB logs to separate system | Unverified | No external database log sink verified. |
| 89 | Database activity monitoring | Unverified | No production DAM configuration verified. |

## Security header detail (item 27)

| Header | Source status |
|---|---|
| Strict-Transport-Security | Present in production mode |
| Content-Security-Policy | Present, partial protection: unsafe-inline and unsafe-eval remain enabled |
| X-Content-Type-Options: nosniff | Present |
| X-Frame-Options / frame-ancestors | Present: DENY / none |
| Referrer-Policy | Present |
| Permissions-Policy | Present |

## Highest-priority confirmed gaps

1. Course-resource authorization: the assignments course-ID branch does not check enrollment/teaching relationship for students/instructors. Add relationship checks and cross-institute/unenrolled access tests. Confidence high; effort small; change risk low. [I,J]
2. Public diagnostics/internal errors: health exposes infrastructure and database diagnostics; some legacy catches return raw error messages. Minimize public health output and standardize safe errors. Confidence high; effort small; change risk low. [U,V]
3. Hardcoded fallback secrets: remove the GitHub encryption-key and webhook-secret fallbacks, require configured secrets, and rotate any affected deployment. No values are reproduced here. Confidence high; effort small; change risk medium because existing encrypted tokens may need migration. [R,S]
4. Attachment isolation: general uploads are public and server-side fetches accept stored URLs without a network destination allowlist. Use authorized storage access and constrained fetches; add file inspection/scanning. Confidence high; effort medium; change risk medium for existing attachments. [O,P]
5. Session lifetime and database TLS: refresh extends the same token; there is no idle or fixed maximum lifetime. Remote database SSL has a certificate-verification fallback. Establish lifetime rules and require verified database TLS. Confidence high for code behavior; deployment impact needs verification; effort medium; change risk medium. [E,F,L]

Before claiming production readiness, obtain independent evidence for backup schedules/encryption/restores, database exposure/firewalls, actual application DB roles, storage encryption, TLS settings and monitoring. A Backup & Recovery page does not establish a backup system. [W]

## Source references

- **A** — [Activation password hashing](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/roster/activation.ts:47>)
- **B** — [Password reset issuance and redemption](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/auth/reset-password/route.ts:13>)
- **C** — [Password policy](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/auth-schema.ts:17>)
- **D** — [Login and persistent rate limits](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/auth/login/route.ts:35>)
- **E** — [Database-backed sessions and cookie flags](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/auth-session.ts:31>)
- **F** — [Session refresh](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/auth/refresh/route.ts:21>)
- **G** — [Session revocation](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/auth/sessions/route.ts:28>)
- **H** — [No-store on current-user endpoint](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/auth/me/route.ts:13>)
- **I** — [Assignments course-ID access and caching](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/assignments/route.ts:30>)
- **J** — [Legacy role and administrator boundary](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/super-user-v1/legacy-entry-guard.ts:12>)
- **K** — [Admin RBAC and reauthentication](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/rbac.ts:94>)
- **L** — [Database TLS and pool configuration](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/db.ts:25>)
- **M** — [Security headers and permissive CSP](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/security-headers.ts:9>)
- **N** — [Raw notes HTML rendering](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/components/workspace/NotesModule.tsx:323>)
- **O** — [General upload checks and public storage](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/upload/route.ts:60>)
- **P** — [Server-side attachment URL fetching](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/flashcards/file-info/route.ts:54>)
- **Q** — [CORS allowlist](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/cors.ts:28>)
- **R** — [GitHub token encryption and fallback-key location (value omitted)](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/github/token-vault.ts:4>)
- **S** — [Webhook fallback-secret location (value omitted)](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/github/webhooks/route.ts:11>)
- **T** — [Import retention cleanup](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/lib/roster/invitations.ts:339>)
- **U** — [Public health diagnostics and raw errors](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/health/route.ts:60>)
- **V** — [Legacy error-message exposure](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/admin/users/[userId]/status/route.ts:107>)
- **W** — [Placeholder backup page](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/(dashboard)/[institute]/backup/page.tsx:5>)
- **X** — [Same-institute public profile fields](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/apps/web/src/app/api/users/[userId]/public/route.ts:26>)
- **Y** — [Harness CI scope and frozen dependencies](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/.github/workflows/harness.yml:1>)
- **Z** — [Restricted database role installer](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/scripts/install-super-user-boundary.mjs:22>)
- **AA** — [Database audit mutation protection](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/prisma/super-user-v1/current-target-security.sql:91>)
- **AB** — [API/browser security tests](<C:/Users/kirby/Desktop/lms-monorepo-skeleton/tests/e2e/github/github-security.spec.ts:1>)

## Review limits

Focused on the supplied checklist and security-critical source paths. This was not a penetration test, a complete line-by-line audit of every route/query, an assessment of mobile/Electron device storage, a dependency advisory scan, a production database audit, or a verification of historical harness release claims. Absence of repository evidence does not prove a hosting/provider feature is disabled. No live environment files or credential values were needed for this review.
