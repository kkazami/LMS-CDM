# Sprint 1 deployment handoff

Sprint 1 is implemented and verified locally on `codex/sprint-1-web-quality`. No live database migration, credential rotation, deployment or student notification was performed.

## Before deployment

1. Identify the actual target/database runtime principal and take a verified backup. Preserve the existing academic schema/security boundary and migration history. Do not replay the repository's historical migration prefix blindly; this repository has documented baseline-history prerequisites.
2. Rehearse `prisma/migrations/20261020120000_submission_replay/migration.sql` against a restored copy of that target. It adds only:
   - `SubmissionRequest` with its user foreign key/index, for durable request replay;
   - nullable `ExpTransaction.idempotencyKey` and a unique `(userId, idempotencyKey)` index. Existing reward rows stay nullable and are not rewritten.
3. Apply this reviewed additive migration through the selected owner's established migration procedure. Then grant the **qualified existing runtime role** SELECT and INSERT on `public."SubmissionRequest"`. Substitute the reviewed role identifier; do not create a new privileged role or grant PUBLIC access. Existing grants on `ExpTransaction` cover its added column.
4. Run `pnpm prisma generate`, build the web candidate and deploy/restart after the schema is ready. The generated client now expects the added reward column, so deploying the code before the migration can interrupt reward operations.
5. Configure the GitHub secrets below before enabling that integration. Missing secrets now fail closed; no development key/secret is substituted.
6. Verify login, authorized course access, student submission/retry, instructor grading/regrading, CodeLab moderation, flashcards and the minimal health response using dedicated test identities. Keep mobile code untouched; test the retained backend response shapes with the mobile developer.

## Environment settings

- `TOKEN_ENCRYPTION_KEY`: a securely generated 32-byte key represented as 64 hexadecimal characters. Required for GitHub token encryption/decryption.
- `TOKEN_ENCRYPTION_PREVIOUS_KEYS`: optional JSON array of at most three **explicitly supplied** old hexadecimal keys during rotation. New encryption always uses the current key. No previous/default key is built into source.
- `GITHUB_WEBHOOK_SECRET`: a dedicated secret configured identically at GitHub and the application. Missing configuration returns HTTP 503.
- `ATTACHMENT_STORAGE_HOSTS`: comma-separated exact additional HTTPS storage hostnames, without schemes/paths/wildcards. Public Vercel Blob hostnames are recognized; the configured `NEXT_PUBLIC_APP_URL` hostname is also recognized. DNS answers are checked and pinned; redirects/private destinations are rejected.
- `GITHUB_TOKEN_ROTATION_DATABASE_URL`: operator-only explicit database connection for the rotation script. Do not place it in the web runtime or commit its value.

Legacy `/uploads/<filename>` and bounded permitted data URLs remain readable after material authorization. Other external attachment hosts must be configured intentionally. This preserves those references while the separate private-storage/scanner work remains in Sprint 2.

## GitHub key rotation / old fallback usage

Do not simply remove an old configured key while existing ciphertext still depends on it. For existing tokens, configure the new current key and explicitly provide the old key through the protected previous-keys environment. If a shared fallback was ever used, treat the old key as compromised: reconnect/revoke affected GitHub authorizations and rotate the webhook secret at both ends. Reencrypting alone does not invalidate a stolen access token.

The operator script validates the explicit hostname and actual database name, defaults to a dry run, validates all decryptions before writing, and commits atomically. It logs counts only. Use protected environment configuration for keys/connection; do not put values in shell arguments or logs.

```powershell
node --import tsx scripts/rotate-github-token-key.ts --host <reviewed-host> --database <reviewed-database>
node --import tsx scripts/rotate-github-token-key.ts --host <reviewed-host> --database <reviewed-database> --apply
```

Both commands require `GITHUB_TOKEN_ROTATION_DATABASE_URL`, current key and any needed previous keys. Confirm successful rotation/reconnection before removing previous keys. Retain a securely protected rollback key only as required by the rollback procedure.

## Academic behavior and compatibility

- Submission and attachment writes, submission EXP and replay receipts commit together. Identical requests under the same actor/key return the stored response; reusing a key with a different normalized request returns 409.
- Requests without keys also deduplicate identical attachment tuples under an academic-record lock and preserve an already-submitted timestamp. A new key is required for a new logical request.
- Students cannot mutate graded/returned work or change work after its deadline. Instructors/admins cannot submit work as students through this endpoint.
- Grading, feedback, incentives, perfect-score badge and notification writes share a transaction. A failed academic/reward write rolls back the operation.
- Incentives are once per student/submission/rule. Lowering and then raising a grade never awards the same rule twice. A newly met threshold can award a previously unearned rule.
- Legacy returned grades without attributable keys establish zero-EXP eligibility records for already met rules; they do not receive retroactive payouts. Existing historical balances are not recalculated or clawed back.
- CodeLab rejection/restoration updates its activity and linked gradebook together. Repeated rejection preserves the original score; restoration uses the established 60-point pass threshold.
- Role aliases and institute boundaries remain enforced. The separate mobile aggregate-grades placeholder was not changed.
- The health endpoint returns only `{status:"ok"}` or a generic unavailable status, without database hostname/counts or raw errors.

## Rollback

Prefer a forward fix. The migration is additive: retain the new table/column and its data when reverting application code; do not drop replay/reward records during rollback. Reverting to older reward code loses the new concurrency/idempotency guarantees and must be treated as an integrity risk.

Restore an application version only with compatible secret configuration. If ciphertext was rotated, rollback must retain the required current/previous keys or reconnect the integration; never restore a hardcoded fallback. Verify academic record counts and grades after any rollback. A target-specific rollback/backup restore has not been performed in this Sprint 1 local run.

## Verification limits

The local database suite uses an owned loopback PostgreSQL instance, synthetic identities, the actual migration, real Prisma queries, concurrent transactions and injected SQL failures. Session identity selection and framework navigation are injected test boundaries; these results do not certify production login, real browser UX, provider permissions or live infrastructure.

Full browser acceptance, production build verification, 400-person imports, 1,000-user load, sustained-load capacity, malware scanning/private upload rollout and real backup restoration remain in Sprints 2–3.
