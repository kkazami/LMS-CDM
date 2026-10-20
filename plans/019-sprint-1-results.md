# Sprint 1 results — web access and academic integrity

**Status:** Implementation and local verification complete. Deployment pending.
**Branch:** `codex/sprint-1-web-quality` (uncommitted changes; no push).
**Baseline:** `54befee`, plus the pre-existing uncommitted workspace.
**Date:** 20 October 2026.

## Delivered

- Shared course/role/institute/enrollment checks for the touched assignments, classwork, submission, grading and material flows; student-only submission identity.
- Attachment → item → authorized course binding before flashcard save or preview. Safe bounded attachment fetching with host allowlisting, public-address validation, pinned DNS and redirect rejection.
- Minimal public health status; configured GitHub secrets required instead of fallback keys; generic failures on touched diagnostic/error paths.
- Transactional submission/attachment writes and durable request receipts. New additive migration includes replay records and a unique per-user reward identity.
- Shared grading service used by API and web grade actions; course-specific incentive rules, once-only rewards and atomic grade/feedback/incentive/badge/notification writes.
- Transactional CodeLab rejection/restoration/delete synchronization, preserved original score across retries and explicit instructor/student scoping.
- Serialized EXP daily caps/profile updates, database uniqueness and atomic badge/reward issuance.
- Explicit key-rotation operator script with dry-run/default, target verification, atomic apply and synthetic integration coverage.
- Regression tests and [deployment/key-rotation handoff](../docs/quality/sprint-1-deployment.md).

## Executed verification

| Check | Result |
|---|---|
| Web TypeScript: `pnpm --filter web exec tsc --noEmit --incremental false` | PASS, exit 0 |
| Baseline plus targeted Node regression suite | PASS: **58 tests, 0 failed, 0 skipped** |
| `node --import tsx tests/web-quality/integration.mjs` | PASS: **16 PostgreSQL scenarios**, cluster stopped |
| Operator script TypeScript using web's compiler | PASS, exit 0 |
| `pnpm prisma generate` | PASS |
| Scoped whitespace/diff check | PASS |

Final database receipt: [report.json](../tmp/web-quality/integration-1792496744410/report.json). This is ignored local evidence, not a committed secret or a production result.

The 16 scenarios cover migration preservation and restricted runtime access; valid and forbidden role/resource reads; concurrent submission replay and unkeyed deduplication; attachment/course flashcard binding; classwork publication rollback; submission rollback/retry; concurrent web/API grading; legacy grade baselines; grade/reward rollback; database uniqueness/daily caps; perfect-score badge rollback and retry; concurrent badge issuance; key-rotation dry-run/apply; and CodeLab rollback/rejection/restoration/delete.

The existing SSL tests initially failed because their mock no longer supplied the unchanged database module's crypto/schema-fingerprint dependencies. Their fixture was updated without weakening TLS assertions; both pass in the final suite. Existing CodeLab reward mocks were extended for the new explicit idempotency field.

## Reproduce

```powershell
node --import tsx --test tests/roster/rules.test.ts tests/program-head/meeting-links.test.ts tests/navigation/active-path.test.ts tests/calendar/student-calendar.test.ts tests/codelab/completion.test.cjs tests/codelab/runner.test.cjs tests/security/mutation-origin.test.cjs tests/auth/login-diagnostics.test.cjs tests/database/ssl-config.test.cjs tests/calendar/events-api.test.cjs tests/web-quality/security.test.cjs tests/web-quality/academic.test.cjs
node --import tsx tests/web-quality/integration.mjs
pnpm --filter web exec tsc --noEmit --incremental false
pnpm --filter web exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck ../../scripts/rotate-github-token-key.ts
```

The PostgreSQL fixture verifies retained binaries, creates ACL-protected temporary credentials and a new loopback database, and refuses the configured live LMS database. Its existing Windows ACL workflow requires execution outside the restricted app sandbox; that authorized execution was used for the successful runs. Early sandbox-only setup failures created no live database connection.

## Scope and remaining work

- Existing unrelated dashboard, activation/roster and UI modifications were left in place. No `apps/mobile` or shared-client implementation was changed.
- No live database migration, real credential rotation, production deployment or student messaging occurred. Deploy only after the additive schema, qualified runtime grants, GitHub keys and attachment-host configuration are ready.
- No full browser suite, production build, actual auth-session admission/revocation integration, load/capacity test or production restore drill was run. Test identity is injected; role/resource guards and PostgreSQL operations are real.
- Private general-upload storage/malware scanning, broader CSRF/CSP/session lifecycle work and other untouched security inventory items remain in Sprint 2 or the operational Sprint 3 scope.
- These changes do not establish a new ISO score or a 1,000-concurrent-user capacity claim.
