# Sprint 2 implementation results — 19 November 2026

**Local implementation completed; production release gates remain open.** Sprint 1 was checkpointed as `b8f5d4b7da704f76d2abeae8748d012d0115a7ba` on `codex/security-remediation-2026-11-15`, after the owner approved the frozen 22-file inventory and complete diff. No push/deployment occurred. Sprint 2 remains an uncommitted working tree on that base. Its exact changed-source hashes, lock hash, commands, counts, failures and limits are in [sprint-2-verification.json](sprint-2-verification.json); the base commit alone does not identify these uncommitted fixes.

The central [roadmap](../../SECURITY-ROADMAP.md) and 253-entry [ASVS v5.0.0 L2 register](asvs-5.0-level2-register.csv) are updated with scoped evidence. All requirement classifications and prior applicability/Sprint 1 evidence remain unchanged: 246 unverified, 7 partially implemented, zero new requirement passes. No complete-security, full-audit or compliance claim.

## 1. Implemented improvements

- Updated approved Electron/build majors and compatible Expo SDK-57 peers/tooling; approved Puppeteer internal Zod 3→4 update. Removed all current critical advisory matches and most high matches without forced incompatible overrides, deleting functionality or suppressing reports. Every old/remaining advisory version/path/patched range is in [the dependency report](sprint-2-dependencies.md) and its [machine inventory](sprint-2-dependency-results.json).
- Made desktop packaging compile JavaScript first; fixed packaged paths; hardened both renderers, exact-origin navigation/redirects, all IPC siblings, local/server CSP handling and minimum permissions. Trusted copy/fullscreen and export/printing/notifications remain supported. Five desktop boundary/positive-control tests added. [Client evidence and limits](client-release-security.md).
- Implemented pinned, free scoped Semgrep/Gitleaks, rule fixtures, Dependabot, advisory scans/base-head review, CycloneDX lock SBOM, frozen no-lifecycle installs, explicit compatibility/types/builds and fail-closed aggregate GitHub Actions. Disabled automatic broad legacy workflows that would include blocked validations. [Operations/settings](automated-security-checks.md).
- Added ordinary mobile navigation/Google callback/API contract tests and a separate current-schema synthetic PostgreSQL staging fixture with genuinely MFA-qualified admin export and persisted audit metadata. Added real synthetic PostgreSQL dump/restore count verification, without exporting a dump or reading real data.
- Removed the existing web build's Google Fonts download requirement with owner-approved, unchanged Manrope/DM Serif Display fonts, preserving families, styles and CSS variables. Licenses, official source URLs and SHA-256 hashes are bundled in `apps/web/src/fonts/`.

No academic rules, database schema, auth/tenant/server-grading fixes, managed execution architecture or backend application routes changed. No paid service or external account configuration was introduced. Existing functionality was retained in source and scoped checks; full native/browser feature parity remains unverified.

## 2. Modified and added files

Sprint 1's frozen 22-file inventory/diff remains under `tmp/security-sprint-2/sprint-1-checkpoint/` with its commit recorded. The Sprint 2 inventory below includes all current tracked changes/new deliverables; generated bundles, packages, dumps, caches and raw registry reports are excluded from Git.

### Modified

- `.github/workflows/harness.yml`
- `.github/workflows/web-quality.yml`
- `SECURITY-ROADMAP.md`
- `apps/desktop/electron-builder.json`
- `apps/desktop/electron/ipc/handlers.ts`
- `apps/desktop/electron/main.ts`
- `apps/desktop/package.json`
- `apps/desktop/renderer/index.html`
- `apps/desktop/renderer/splash.html`
- `apps/mobile/package.json`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/lib/public-fonts.ts`
- `docs/security/asvs-5.0-level2-register.csv`
- `package.json`
- `pnpm-lock.yaml`

### Added

- `.github/dependabot.yml`
- `.github/workflows/security.yml`
- `apps/desktop/electron/security.ts`
- `apps/desktop/renderer/offline.css`
- `apps/desktop/renderer/offline.js`
- `apps/desktop/renderer/splash.css`
- `apps/desktop/tsconfig.build.json`
- `apps/web/src/fonts/DMSerifDisplay-Italic.ttf`
- `apps/web/src/fonts/DMSerifDisplay-OFL.txt`
- `apps/web/src/fonts/DMSerifDisplay-Regular.ttf`
- `apps/web/src/fonts/Manrope-OFL.txt`
- `apps/web/src/fonts/Manrope.ttf`
- `apps/web/src/fonts/SOURCES.json`
- `docs/security/automated-security-checks.md`
- `docs/security/client-release-security.md`
- `docs/security/sprint-2-dependencies.md`
- `docs/security/sprint-2-dependency-results.json`
- `docs/security/sprint-2-results.md`
- `docs/security/sprint-2-verification.json`
- `scripts/security/.gitignore`
- `scripts/security/assess.py`
- `scripts/security/dependency-review.py`
- `scripts/security/inspect-package.cjs`
- `scripts/security/prepare.py`
- `scripts/security/run-scanners.py`
- `scripts/security/run-scoped.py`
- `scripts/security/run-staging.py`
- `scripts/security/sbom.cjs`
- `scripts/security/scan-scope.json`
- `scripts/security/scanner-entry.py`
- `scripts/security/semgrep.yml`
- `scripts/security/tools.json`
- `tests/sprint-2/README.md`
- `tests/sprint-2/allowed-tests.json`
- `tests/sprint-2/dependency-compatibility.test.cjs`
- `tests/sprint-2/desktop-security.test.cjs`
- `tests/sprint-2/mobile-compatibility.test.cjs`
- `tests/sprint-2/semgrep/client.ts`
- `tests/sprint-2/staging.test.cjs`
- `tests/sprint-2/tooling_test.py`

## 3–4. Dependency advisory results and remaining critical/high

| Graph | Before | After | Critical before → after | High before → after |
|---|---:|---:|---:|---:|
| Production dependency graph | 6 | 3 | 0 → 0 | 2 → 1 |
| All dependencies/workspaces | 31 | 5 | 1 → 0 | 13 → 1 |

Fresh before/after reports use pnpm 10.32.1/public registry and matched frozen lock hashes. Counts are advisory matches, not unique exploitable vulnerabilities; all-dependency advisory objects decrease 28→4. Final lock SHA-256 is `df21d4eeac438ada020416c7a60f534578ceb5c69f6f3926f3c4c1dfe96f4894`. Both actual advisory gates exit **1**, as intended. Base/head review reports no newly introduced advisory paths, exit 0; this does not waive existing findings.

No remaining critical match. One high remains at `mobile > expo-router > query-string > decode-uri-component@0.2.2` (patched decoder >=0.5.1). Supported SDK-57 router still constrains the older parser. It also has a moderate advisory; remaining moderate paths are ngrok/uuid 3 and desktop minimatch 9/10 (two matches). This is an unresolved shipped mobile dependency, not disproven exposure. A supported upstream fix or separately approved migration is required; no blind major override was applied.

## 5. Automated checks

Four required jobs feed `aggregate-security`; missing/failed/skipped/cancelled jobs fail. There are no production secrets, deploy steps or write tokens. External Actions use reviewed SHA pins; runtime/scanner images and downloadable tools use immutable digest/integrity pins. Secret reports retain only rule/path/line, not matches. Dependency scans are all-workspace; Semgrep/secret scans are deliberately partial explicit scopes. Eight unsafe static expectations plus a safe negative fixture and six assessment self-tests pass. Oversized secret inputs and missing/unexpected static files fail.

Workflow YAML, SHA pins, job dependencies, read-only permissions and no `pull_request_target` were checked locally. Actual hosted execution/branch protection is **not verified**. The remaining high keeps the gate red. Legacy broad suites remain manual-only failing notices; this does not erase their historical source/evidence.

## 6–7. Client, test, build and typecheck results

| Check | Exact observed result |
|---|---|
| Explicit 15-file Node test list | **102 tests passed; 0 failures, cancellations, skips or todos.** New suites: five desktop, four mobile, five dependency/API compatibility tests; other tests are explicitly retained permitted regressions. |
| Assessment and static-rule fixtures | Six Python tests pass; exact eight unsafe rule/line matches and safe negative configuration pass; actual ten-file scoped Semgrep scan has zero findings/errors/missing files. |
| Redacted Gitleaks scope | Exit 0, zero findings in the explicit client/automation snapshot. No dotenv/Git-history/full-repository claim. |
| Web | Prisma 7.9.1 generation, Next typegen/typecheck and offline Next 16.4.6 webpack build pass, including build TypeScript phase. Direct safe fixture build was used; production database/bootstrap wrapper was not executed. Existing CodeLab browser runtimes are separately prepared successfully from pinned local packages. |
| Mobile | Typecheck passes; offline iOS/Android Hermes export passes: iOS 8.2 MB/3,933 modules; Android 8.4 MB/4,020 modules; 46 assets. These are bundles, not signed native builds or device validation. |
| Desktop | Typecheck/compilation pass. Final Electron 42.11.18/builder 26.18.0 unsigned Windows x64 directory packaging and archive inspection pass (20 archive entries). Final archive SHA-256 `f97c9e1d2c3c7f5d7e320012486e40c9169dcbc2910afc76e81940bcd4c81221`. Artifact discarded; no native GUI launch/signing/publishing. Final compilation also checks the last permission-policy changes. |
| Harness | Static typecheck passes; no blocked harness/provider/runner execution. |
| Current-schema PostgreSQL | Separate **1 test passes**, zero skips: ordinary dummy student/instructor course reads and MFA-admin user export return 200; exactly one persisted metadata-only export event reports 3 records. No auth/resource/DB authorization stubs. |
| Synthetic logical recovery | Real `pg_dump -Fc`/`pg_restore` into a second disposable database yields `3|1|1|1` (users/courses/enrollments/export events). No real backup, persistent volume or dump retained. Cross-cluster grants/objects/keys/PITR not established. |
| SBOM | CycloneDX 1.6 lockfile inventory generated: 1,476 components, 1,477 dependency nodes, graph reference/integrity assertions pass. Formal schema validation, license completeness, OS/native/shipped-artifact completeness remain open. |
| Preservation | All **186** historical evidence files unchanged; ASVS 253 IDs/classifications/applicability/Sprint 1 evidence unchanged. Run2 remains 14 covered/4 candidate/8 blocked/51 deferred. |

No full suite, broad security launcher, browser E2E, blocked unit, real OAuth/provider call, real student data or production endpoint was executed. Builds ran in offline OS-enforced Docker isolation with read-only inputs, empty allowlisted environment and bounded writable scratch/resources/time. Public dependency/tool/font downloading occurred only in authorized preparation, with lifecycle scripts disabled. The host root `node_modules` was not replaced; testing used the disposable frozen dependency workspace.

## 8. Baseline failures and setup reconciliation

Failures are retained, not silently turned into passes:

- First compatibility run: 99/101 pass. Two new fixtures used a removed socks dependency path and a wrong CodeLab route; corrected to current supported APIs/routes without changing historical fixtures or weakening product assertions. Added one ordinary API-contract case; final 102/102.
- Initial scanner setup failed on BusyBox timeout syntax and a verified binary exceeding the 16 MiB file cap. Corrected syntax/cap. Semgrep's built-in fixture command hit a path-handling error; explicit JSON rule/line comparison verifies the same parse-only fixture and all expected matches. Final checks pass; failed receipts remain.
- Mobile export initially hit the 512-descriptor fixture cap; raised to bounded 4,096. Next attempt lacked five existing course-banner build inputs; corrected the snapshot. Complete-input Android/iOS exports pass. No source feature was removed or blocked asset hypothesis tested.
- Initial web build failed offline Google-font downloads and 1 GiB scratch. Owner approved local copies of the same open fonts; bounded 6 GiB RAM/4 GiB scratch build passes. No certificate/network bypass or font mock.
- Remaining non-failing warnings: pre-existing lucide React peer range; Next middleware convention deprecation; file-type dynamic-import webpack warning; bounded webpack cache file-size warning; Prisma OpenSSL-detection warning; absent Sentry project credentials during offline export. No blocked upload/assets investigation was attempted. Desktop's offline builder used supported manual dependency traversal because pnpm was absent in the runtime container.
- Older broad DB/signer/full-suite prerequisites and blocked validations are preserved as unverified. No failures remain in final executed scoped checks; that does not assert the entire existing suite passes.

## 9. Unresolved security risks

The remaining high dependency, incomplete run2/candidates/blocks, limited static/secret scope, actual native sandbox/IPC/OS integration, signing/updates, production database/identity/key/proxy/provider enforcement and recoverable infrastructure backups remain open. Passing source tests, bundle compilation or a logical dummy restore is not production security proof. Existing MFA and server grading protections were preserved; real enrollment and deployed control effectiveness remain unverified.

## 10. Personal owner/production actions

Review and commit the Sprint 2 diff; push only when ready and observe the first hosted checks. Configure required aggregate checks/reviews, workflow ownership/token restrictions, Dependabot/alert ownership and available free push protection yourself. Do not waive the high finding to obtain green status.

Perform the [production operator checklist](production-operator-checklist.md) under separate approval: deployed revision/configuration and environment identity, runtime DB role/grants/guard qualification, managed code-execution isolation/provider configuration, secret custody, audit delivery/retention/alerts, actual infrastructure/object/key backups and isolated restoration. Complete the [MFA migration/key/enrollment/recovery/rollback rollout](admin-mfa-production-rollout.md) using administrators' own authenticator devices. Run ordinary synthetic staged native GUI/device/Google workflows and verify signing/distribution. Do not use real students for staging.

## 11. Further approval decisions

Owner decisions remain necessary for a supported Expo SDK/major routing migration if upstream cannot patch SDK 57; any maintained replacement/fork; signing/update service/architecture and associated costs; production access/deployment; and final RPO/RTO/retention/backup costs. No new paid service, major academic/backend architecture or schema decision was made here. Already approved: Electron42/builder26, Puppeteer-internal Zod update, same-font self-hosting and frozen Sprint 1 commit.

## 12. Sprint 3 recommendations

Prioritize the remaining shipped mobile high advisory and owner-observed production/native release gates. Establish the first real hosted fail-closed CI run and protected checks; extend only explicitly approved unblocked changed-code static/secret coverage. Validate application/OS SBOM/license completeness and signed update/recovery procedures. Maintain the existing blocked-unit policy; no recommendation here authorizes restarting or indirectly validating a blocked task.

Final reconciliation: all 47 recorded changed-source hashes still match; all 55 changed/added files are inventoried; local document links, workflow SHA/permission/aggregate assertions and `git diff --check` pass. The diff was self-reviewed, all Sprint 2-owned containers are removed, and the only new commit is the approved Sprint 1 checkpoint. Sprint 2 remains uncommitted for review.
