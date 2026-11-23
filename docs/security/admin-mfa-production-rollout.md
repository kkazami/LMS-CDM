# Production administrator MFA rollout

Sprint 1, 19 November 2026. Tracks AUTH-04 and PROD-03 in [the roadmap](../../SECURITY-ROADMAP.md). **Prepared, not applied to production.** Keep the earlier [implementation record](../quality/admin-mfa.md) unchanged. This runbook does not rerun the blocked auth_core validation.

## Ownership and prerequisites

The deployment operator owns the release; a separate trusted database migration principal owns DDL; each administrator owns their authenticator and recovery codes. Name a second institutional contact for verified lost-device recovery. Institute ADMIN and SUPER_USER use the LMS authenticator flow; native clients direct privileged sign-in to the web portal. Ordinary student/faculty sign-in rules are unchanged.

Before an approved maintenance window:

1. Record the exact candidate commit, schema checksum, generated Prisma version, environment and credential-free database project/branch identifier. Establish that it is the intended production database; matching local URLs is insufficient.
2. Obtain an approved recoverable backup, key-recovery plan and isolated restore evidence under the [DR strategy](backup-disaster-recovery.md). A database-tool summary/export is insufficient.
3. Review deployed migration receipts and existing table/trigger state. Never run the entire historical migration chain blindly, reset the database, edit old checksums, or mark unknown SQL applied. Stop for reconciliation if any MFA object exists without a matching receipt.
4. Stage the exact release with synthetic accounts and independently held synthetic wrapping keys. Do not copy production students, sessions, factors, hashes or recovery values into staging.
5. Confirm a rollback candidate that preserves MFA enforcement, a way to restrict privileged access during incidents, operator database access outside the LMS, correct clocks, and staffed enrollment support. An older password-only release is not a secure rollback.

## Schema and grants

The reviewed migration is [20261115010000_admin_mfa](../../prisma/migrations/20261115010000_admin_mfa/migration.sql). It creates `AdminMfaFactor`, `AdminMfaChallenge`, `AdminMfaSession`, their indexes/foreign keys, and **both identity-change and factor-reset revocation functions/triggers**. Schema-generated SQL alone does not install these triggers. [revocation.sql](../../prisma/admin-mfa/revocation.sql) is a companion for fixtures, not an additional migration to run blindly after the full migration.

Operator actions require approval for the actual target. Use a protected PostgreSQL service definition with verified TLS, never a credential-bearing command line. Example only, after target and history approval:

```sh
psql 'service=lms_migration' -X -v ON_ERROR_STOP=1 -f prisma/migrations/20261115010000_admin_mfa/migration.sql
```

The file already owns its transaction. The trusted deployment process must retain its exact SQL hash, executor, timestamps, result and migration receipt. Use the deployment's established receipt mechanism; do not improvise `migrate resolve` or rewrite `_prisma_migrations`.

Grant the existing restricted application role only the required SELECT/INSERT/UPDATE/DELETE on these three public-schema tables; verify required trigger-function ownership/privileges using the established protected-writer policy. No PUBLIC table privileges, runtime ownership, superuser, BYPASSRLS, role creation, database creation or migration credentials in application environment variables. Do not grant membership in the migration/owner role. Preserve existing account/academic guards and hierarchy restrictions.

Operator metadata inspection must confirm table/index/FK existence, both triggers enabled on the intended User/factor tables, trusted function owners and fixed search paths, current application-role flags/memberships, and effective grants. Do not select factor secrets, challenge values, recovery hashes or student rows for the receipt. Rebuild the Prisma client from the same schema; restart all workers against the same version before exposing the candidate.

## Wrapping-key management

`ADMIN_MFA_ENCRYPTION_KEY` is canonical Base64 for **32 cryptographically random bytes**, used server-side for authenticated encryption of TOTP seeds. It is distinct from GitHub `TOKEN_ENCRYPTION_KEY`, provider credentials, QR signing keys and passwords.

- Generate it within the operator's approved secrets-management environment, directly into a protected secret entry. Do not print it to a terminal transcript, CI log, shell history, report, QR service or chat. Do not put it in any `NEXT_PUBLIC_` variable or build artifact. Record only secret identifier/version, environment, custodian and date.
- Store an access-controlled encrypted recovery copy under separate custody. Verify the recovery procedure with a synthetic key/seed in an isolated environment, without exposing production key bytes.
- Configure the same active key for every worker in that environment before privileged sign-in. Wrong/missing keys fail closed; they are not reasons to bypass MFA.
- Current encryption format has no operator-selectable key identifier or automatic multi-key rotation. **Do not simply replace the key:** existing encrypted factors would become unreadable. Re-encryption needs a separately reviewed, approved, locked migration with backup, validation, failure rollback and session/challenge revocation. No rotation tool or production reset was introduced in Sprint 1.

## Enrollment and acceptance

After approved schema/grants/key provisioning and candidate promotion:

1. Restrict the initial privileged rollout to designated administrators using normal application workflows. Record account identifiers only in the institution's protected operational roster, not in public evidence.
2. Each administrator enters their password, sees the pending-MFA flow, scans the locally generated QR with their own authenticator, enters a current code and privately saves the ten one-time recovery codes. They must acknowledge recovery-code storage before admission. The operator/agent must not enroll devices for them or store copies of their recovery values.
3. Confirm normal sign-in, normal logout and a subsequent sign-in with that administrator's device; confirm a historical password-only privileged session cannot access administration. Use only dedicated synthetic identities for scripted staging checks. Do not replay codes or probe blocked validation paths on production.
4. Confirm recovery works during the operator's agreed enrollment exercise using one private recovery code, then note consumption without recording the code. Lack of codes requires a reviewed recovery decision, not an invented reset endpoint.
5. Confirm real role-appropriate student/faculty normal-use journeys and native clients still work. Desktop uses the web MFA page. Verify no tokens, enrollment seeds or codes appear in application, analytics or CI logs.
6. Check metadata-only `ADMIN_MFA_ENROLLED`, `ADMIN_MFA_VERIFIED` and, when used, `ADMIN_MFA_RECOVERY_USED` events and alert delivery. Record the tested revision/environment, counts, outcomes and operator sign-off. Enrollment and deployment remain unverified until these steps actually occur.

## Lost device, incidents and rollback

Password plus an unused recovery code is the supported lost-device path. If both authenticator and codes are lost, the institutional recovery owner verifies identity using the approved enrollment-level process and authorizes a separately reviewed factor reset. Preserve audit evidence; revoke related sessions/challenges; never restore an old factor epoch, consumed recovery hash, TOTP counter or prior session proof. The existing legacy PIN is not MFA or an emergency bypass.

For wrong configuration, stop new privileged admission, restore the correct protected configuration/key version, restart workers and validate normal access before reopening. For an application defect, restrict administration while deploying a previously tested **MFA-enforcing** compatible candidate. Keep the additive tables/triggers/grants and protected key; do not drop tables, disable triggers, delete factors or redeploy password-only code to get users back in.

After database point-in-time restore, old sessions/challenges/counters and recovery-code consumption can reappear. Keep the restored environment isolated; follow the DR revocation/re-enrollment decision before exposure. Restoring the wrapping key restores decryptability, not freshness or trust. A suspected seed/key compromise requires incident handling and approved re-enrollment, not silently restoring compromised secrets.

Completion packet: approved target/commit/schema, migration/grant/trigger receipts, protected key version and recovery custodian, enrollment completion counts, normal-use acceptance, audit/alert outcomes, MFA-preserving rollback candidate, owner/date. No secret values belong in the packet.
