# Sprint 5 integration and qualification results

**19 November 2026.** Sprint 5 advances the reviewed local candidate with an actual synthetic Argon2id writer, tighter session management, current-schema Prisma RLS and measured recovery. Release approval remains open. The [verification record](sprint-5-verification.json) identifies the tested base revision, changes, snapshot hashes, results, limits and remaining prerequisites.

## 5A — checkpoints, hosting and dependencies

| Checkpoint | Commit and result |
|---|---|
| Sprint 2 | `0452a5dae2ef5d3026f9e11fb6b2c214c2d36e04`, retained. |
| Sprint 3 | `9e4b6b14ac670b499c3fa1772176c1d6fb54fa1b`, exactly the reviewed 15-file tree `83b9d5e8e2e4ba5bb79b9106a888be4eac288c21`. |
| Expo SDK 58 | `4ddff68f8dd9ae5a7703d3d6a70b978ff1d9f53a`, retained as a parent of Sprint 4. |
| Sprint 4 | `4986f1dbbcae0f08a781fe4a8c56a9206bfe81d5`, combining the Sprint 3 and Expo parents and reproducing the reviewed 68-file patch tree `f64860fd6ba9f1ea510b2032f0a55eccb995f016`. |
| Sprint 5 | Local `codex/security-review-sprint-5` branch on the verified Sprint 4 commit. The isolated worktree has the new working candidate. The original worktree retains the owner's two separate Vercel/workflow edits byte for byte. |

Both checkpoint patch hashes, all 186 historical evidence hashes and the immutable run2 target `5dc0a42963b241ca0bbaa1711ad6318fe0b9f202` matched. The blocked audit scope was preserved.

Vercel deployment is disabled in both Vercel source configurations for `codex/security-*` and the existing Security engineering CI workflow accepts pushes there. The owner requested keeping the branch local. All GitHub-hosted job outcomes remain pending. The local scanners and severity gate passed their explicit scopes. [Hosted CI and owner checklist](hosted-ci-verification.md)

Fresh public pnpm inventories agree with Sprint 4. Production has two moderate matches and the full graph has four. Both have zero high and critical matches. The lockfile stayed unchanged.

| Open moderate match | Compatible update assessment |
|---|---|
| Sentry bundling `glob@13.0.7` | Expo SDK 58 remains on its supported Sentry line. Latest published React Native Sentry 8.36.0 still uses bundler 10.78.0, which requests glob 13. Bundler 11.14.0 admits patched glob 14, so wait for a supported native parent that adopts it. The path appears in the production dependency graph through build tooling. Signed-binary inclusion is unverified. [Advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) |
| Electron packaging `minimatch@10.2.6` and `9.0.9` | Latest stable electron-builder and app-builder-lib 26.18.0 request minimatch 10 and pin Universal 2.0.3. Patched minimatch is 11.0.1 or later. Universal 3.0.6 removes the affected edge but requires a supported parent and native packaging verification. The affected edges are in packaging tooling, including macOS universal packaging. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| Expo development tunnel `uuid@3.4.0` | Latest `@expo/ngrok@4.1.3` still requires uuid 3. Keep supported developer tunnel functionality while qualifying a future compatible parent or replacement in a separate environment. The match is development-only. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

## 5B — identity and sessions

The ordinary synthetic password changer accepts long Unicode/space values and uses a local checksummed blocklist. The real current-schema case wrote one Argon2id password from two concurrent changes, revoked all sessions and created one fixed metadata event. Rollback guards prevent rewriting an Argon2id hash as bcrypt through this route. Release still requires a reviewed compromised/common-password corpus, qualification of all writers and dual-reader rollback artifacts, plus representative hosting benchmarks. Production-mode Argon2id writes remain disabled.

Privileged MFA remains intact. Ordinary-role enrollment and factor management remain pending compatible implementation across all admission paths, including Google and native completion. The session operation now demands recent admission for revoking another device, preserves current-device logout, bounds and validates selectors, and sends private no-store responses. Cookie cutover timestamp validation and a concrete rehearsal schedule are ready. Actual cross-client qualification and production cutoff remain open. [Identity rollout](identity-rollout-qualification.md)

## 5C — application, limiter, Prisma and incident monitoring

Authenticated password change now uses a PostgreSQL-backed account budget of six attempts per five minutes, with tested 429 exhaustion and generic 503 outage responses. Session expiry and credential state are rechecked around the compare-and-set update. The fixed `SELF_PASSWORD_CHANGED` audit metadata is written within the same transaction. Existing scoped scanner and advisory policies remain.

The real Prisma course fixture qualified transaction-local actor scope on a reused pooled connection, approved-course reads, authorized instructor/admin updates, rollback behavior, field-restricted grants and a minimal separate job principal. The same-cluster restore recovered all three policies and verified grants. Actual Neon and wider operations remain release prerequisites. [Prisma and RLS](prisma-rls-qualification.md) · [Incident response and audit operations](incident-response.md)

## 5D — results and release decision

| Evidence | Observed outcome |
|---|---|
| 121 allowlisted tests | Passed with zero skips or failures. The password/limiter/security metadata, session, timestamp and independent dummy recovery cases are permanent. |
| Three explicit database profiles | Current-schema writer, Prisma RLS and ordinary course/admin export passed. The initial writer fixture received 401 because its dummy student lacked approved enrollment. The corrected fixture passed with existing admission checks. |
| Build and typechecks | Next.js production build exited 0 in 292.16 seconds with build ID `D2S910KNszCqPT8T1N5vL`. The build verified TypeScript and completed file tracing. Mobile, desktop and harness typechecks passed. Sprint 4 bundle and unsigned desktop build evidence is retained for the unchanged client sources and dependency graph. |
| Static and secrets gates | Local scoped Semgrep and Gitleaks passed with zero findings. Hosted status is unverified. |
| Synthetic recovery | Current-schema RLS dump/restore took 1.058 seconds, credential writer recovery 1.281 seconds, ordinary staging restore 1.53 seconds and dummy AES-GCM config/object/key recovery 6 ms. Production backups, physical custody, PITR and measured service RTO remain operator-dependent. |
| ASVS | 17 exact requirements received scoped assessments, each with expected behavior, observed result, tested source base/snapshot, environment and limitations. All 253 existing classifications remain. Zero new full requirements are claimed. |

The [verification inventory](sprint-5-verification.json) lists the modified and added files. Implementation changes are confined to Vercel and CI configuration, password/session routes and their settings UI, the pilot policy/limiter helpers, qualified runner modes and scoped tests. The original evidence records remain at their committed revisions.

Complete real-client synthetic acceptance, qualify a reviewed password corpus and all credential writers, obtain hosted evidence after isolation confirmation, and rehearse actual Prisma/Neon and infrastructure recovery before considering Sprint 6 deployment. Owner action and separate release approvals are consolidated in the [readiness assessment](release-readiness-assessment.md).
