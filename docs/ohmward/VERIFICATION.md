# Ohmward verification

Every actual verification command is recorded with full stdout/stderr, exit status, times and candidate fingerprint under evidence/sprint-1. Failed invocations remain evidence; command generation is not execution. See evidence/sprint-1/COMMANDS.md for 56 command receipts and nested PostgreSQL-control receipts.

Required: dedicated unit/integration/browser suites; schema validation/generation; web typecheck/build; migration replay/upgrade/preservation; direct API negatives; role-scoped roster; retry/concurrency/recovery; light/dark/keyboard/reduced-motion/zoom/responsive inspection; independent review and fix confirmation.

Use only disposable local PostgreSQL. Never import live dotenv values into test targets. A passing unit suite is not a migration/browser/release claim.

## Sprint 1 result

Frozen candidate `074bfb529cb40355c26262282e3de7c35f6cb80aabff316f1028c9823dce5c63` independently reviewed. Passing results: 13 Ohmward unit cases; ten real-session integration checks; six browser scenarios; ten business-plan regressions (including CRC validation); 69 harness regressions; harness/web TypeScript checks; Prisma schema validation/generation; exact pnpm build:web in a scrubbed owned source copy followed by the full browser suite; diff whitespace check.

Migration evidence uses a fresh PostgreSQL cluster, HEAD baseline schema plus the additive migration, a seeded upgrade, preservation check, fresh replay, foreign-key and immutable-row checks, and failed-DDL rollback. This does not assert the historical migration chain or live schema has been repaired/applied.

Source snapshots, command fingerprints, final reviewer disposition and captured images are indexed in REVIEW-PACKET-SPRINT-1.md. Earlier sandbox ACL failures, test-loader failure, compile issue, and failed browser assertions remain visible. These are not rewritten as successful runs.

No production release/deployment claim. Human review is the gate before Sprint 2.
