# Login outage repair — 21 October 2026

## Cause and outcome

The main LMS returned “Something went wrong during login” after the quality changes were merged. A verified-TLS, read-only inspection found that the deployed Prisma model expected Session.lastSeenAt while the configured database lacked that column. The session-idle migration was absent from migration history. The application principal correctly lacked schema modification privileges.

The first owner repair attempts rolled back completely: the historical migration's UPDATE fired the existing privileged-session admission trigger, which rejects an unqualified owner session updating administrator-session rows. No triggers were disabled, privileges broadened, account passwords reset or academic data edited.

Before its first live application, the unapplied idle migration was corrected to add lastSeenAt with a fixed 1970-01-01 value for existing rows, then set the default to the current time for newly created sessions. This requires all old sessions to sign in again and avoids prohibited row updates. The original fields of all 73 pre-existing session records were preserved. The restricted application role and admission guards remain in place.

The targeted migration committed at 05:20:19 UTC / 13:20:19 Asia/Singapore on 21 October 2026. The canonical LF SQL checksum recorded in migration history is 0a49965f8d25e05df74beefe2f3c96cfeaba93b2df97cf53743ae5c33e38dd6d. The owner connection was accepted through hidden input and was not saved in source or the repair receipts.

## Verification

- Owned local PostgreSQL: reproduced the missing column, applied the revised migration while an UPDATE-denying trigger remained active, preserved old session fields, verified new-session defaults and restricted runtime access, safely repeated the repair and rejected conflicting history. The disposable cluster stopped afterward.
- Main LMS: student login 200 with session cookie and opaque token; authenticated identity 200; student dashboard 200; test-session logout 200. No academic edits were made. Normal login/session/reward side effects can occur.
- The live check establishes this student's server-side login/dashboard path, not every role/browser or an institution-wide capacity result.

Local sanitized receipts are under ignored tmp/web-quality: session-idle-repair-test.json, session-idle-repair-result.json and login-live-smoke-result.json. They contain no connection URL, password or session token and are not automatically distributed with the repository.

## Reproduction and boundaries

- Isolated repair test: `node tests/web-quality/session-idle-repair.mjs` uses the existing verified Windows PostgreSQL fixture and never loads live dotenv files.
- Targeted operator repair: `node scripts/repair-session-idle.mjs --apply --owner-stdin`. Supply the migration-role URL only through its hidden terminal prompt. It verifies the target against the configured runtime database, requires verified TLS, uses bounded transaction/lock timeouts and records migration history after preservation checks.
- The tool refuses conflicting schema/history. Environments that previously applied the old migration checksum require explicit reconciliation; no finished history record is silently overwritten.
- This was not a full historical migration deployment. The inspection also found missing SubmissionRequest and PrivateAsset relations and the related quality migration gaps. Those require a separate reviewed rollout with prerequisites and runtime grants; this repair does not claim submission/upload deployment readiness.
- The next rollout must verify required schema and grants before activating code that depends on them. A successful web build does not apply PostgreSQL migrations or establish schema compatibility.
