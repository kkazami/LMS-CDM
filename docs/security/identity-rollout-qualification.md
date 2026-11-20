# Identity rollout qualification

## Password writers

Sprint 5 integrates Argon2id into the ordinary, authenticated self-service password-change route for the synthetic pilot. The server derives role from the admitted session. It validates the candidate against the bounded local digest corpus, verifies the current password and existing PIN if present, and hashes using the centralized native helper. Under the account lock it checks active-session expiry and updates only if the old hash, PIN, role and active state still match. The committed change revokes sessions, writes a fixed metadata-only event and clears both browser cookie names. A disabled pilot cannot rewrite an Argon2id hash as bcrypt through this route.

| Writer family | Current scope |
|---|---|
| Authenticated self-service change | Pilot for Student and Instructor aliases using the existing handler and modal. Legacy behavior is default. The pilot is disabled with `NODE_ENV=production` regardless of opt-in. |
| Registration, roster activation, account recovery/reset | Existing writers and policy remain. Qualification of those paths and rollback artifacts is unresolved. Prior blocked validation remains preserved. |
| Instructor and admin provisioning, Super User/admin credential operations | Existing tooling and protected SQL preserve their current password format requirements. Qualify them and the documented recovery path before any write activation. |
| Seeds, imports and owner scripts | Treat as separate onboarding/operator writers. Identify real entry points and require exact version and rollback qualification before approving shared policy activation. |

For the synthetic pilot set `LMS_SYNTHETIC_PASSWORD_PILOT=1` in an isolated nonproduction application. Supply `LMS_PASSWORD_PILOT_BLOCKLIST_FILE` and `LMS_PASSWORD_PILOT_BLOCKLIST_SHA256` to the process. Use a bounded read-only UTF-8 file with one lowercase SHA-256 digest per line, generated from NFC-normalized complete values. The fixture requires 3,000 unique entries, a matching digest of the file bytes and a size cap of 8 MiB. The fixtures contain generated dummy values. Corpus adoption requires reviewed provenance, coverage within the 15–128-character policy and institutional terms, compromised and common password coverage, version, digest and refresh owner. Runtime keeps comparisons local. Never submit a user's chosen password or its digest to a third party.

After an approved write rollout, preserve dual-reader artifacts throughout rollback. If an incident requires suspending writes, retain existing Argon2id hashes and use a revision with the dual reader and no-downgrade guard. Check producer/consumer compatibility, native Linux binary presence, peak memory and concurrency on isolated hosting. No writer inventory completion is assumed from the self-service fixture. [Password storage design](password-hashing-migration.md)

The final local writer fixture reported a 381 ms mixed verification/write sequence, a 33 MiB RSS increase between samples and 164 MiB peak process RSS including the test harness. The prior two-job native bound remained under regression coverage. Two concurrent app requests in disposable PostgreSQL produced one committed write. These results leave deployed peak and cold-start memory, function concurrency, Neon pool pressure and operational cost unresolved.

## MFA and client admission

Administrator and Super User MFA remain mandatory. Ordinary-role enrollment is still gated by completing the same challenge and proof transition for browser password, Google callback, native handoff and Electron. Enrolling an ordinary-role account before those readers enforce its factor consistently would produce a misleading factor state or lockout. Keep enrollment and production enforcement disabled until these pathways and accessible factor replacement have permitted qualification. Start the institutional pilot with voluntary instructor enrollment followed by optional student enrollment. Document consent, available non-phone alternatives, recovery-codes handling, enrollment support and rollback. [MFA design](system-wide-mfa.md)

## Session and cookie rollout

Fresh admission within five minutes is required for self-service revocation of another session or all sessions. Ordinary sign-out on the current device remains available. The API checks freshness and expiry under the account lock and returns private, non-cacheable responses. A canonical UTC timestamp is required for cutover. Maintain the existing seven-day absolute and thirty-minute idle deadlines.

The exact **rehearsal schedule** is `2026-12-01T09:00:00Z` for the first host-prefixed write, and `2026-12-08T09:00:00Z` for the legacy read deadline. These times are fixture inputs only. For an actual rollout, the owner chooses a future canonical UTC timestamp after the browser, Electron and native matrix passes. Install readers on all hosts before the first write and use the same timestamp across hosts. Keep a compatible rollback revision that reads the host-prefixed cookie and preserves the original cutoff. Leave the production variable unset until release approval. [Session policy](session-security.md)
