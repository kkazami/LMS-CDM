# Automated security engineering

Sprint 6 adds five local regression cases and two independently selectable PostgreSQL staging profiles. The hosted compatibility job now expects 126 scoped cases. The preserved review-branch push trigger awaits owner confirmation. [Hosted qualification](hosted-ci-verification.md)

Central policy: [SECURITY-ROADMAP.md](../../SECURITY-ROADMAP.md). These checks implement a deliberately partial, approved scope. They do not resume run2, validate its blocked units, or establish ASVS compliance.

## Repository implementation

`.github/workflows/security.yml` runs for pull requests, main/master pushes, weekly schedules and manual dispatch. It has read-only contents permission, no production secrets, no deployment, no `pull_request_target`, no credential persistence and no untrusted shell interpolation of PR text. External Actions are pinned to official reviewed commit SHAs. Scanner/Node/PostgreSQL images and downloaded tool checksums are pinned in `scripts/security/tools.json`; review and refresh them regularly.

| Required job | Work and failure behavior |
|---|---|
| `dependencies` | Manifest-only, frozen pnpm 10.32.1 install with lifecycle scripts disabled. Public registry inventories cover production and all dependencies across every workspace. High/critical findings, malformed/missing inventories, muted results or scanner errors fail. A CycloneDX 1.6 lockfile SBOM includes workspace/optional/platform/build edges and available integrity hashes. PR review compares advisory paths at base/head without executing base code; schedules/pushes explicitly report inventory-only mode. |
| `static` | Free, pinned Semgrep CLI/image with committed rules. Explicit client files in `scan-scope.json`: desktop sandbox/isolation/Node settings, dynamic-code calls and certificate-bypass switches. Eight parse-only unsafe-pattern expectations and a safe negative fixture verify the rules. Six assessment self-tests exercise malformed inventories and missing/failed/skipped/cancelled aggregate jobs. This is a small AST rule set, not comprehensive application SAST or CodeQL coverage. |
| `secrets` | Free Gitleaks CLI 8.30.1, official release checksum verified. Scans only the explicit client/automation snapshot, no dotenv files or Git history. Full redaction; retained summaries include rule/path/line only, never matched values. Missing reports or scanner errors fail. No suppression file was added. |
| `compatibility` | Explicit 20-file entry allowlist, expected 126 passing Node tests with zero failures/skips/cancellations/todos. Runs web/mobile/desktop/harness typechecks, desktop compilation and mobile Android/iOS bundle export. The Next.js build asserts the build ID, required runtime-file manifest and a server route trace. No broad discovery, original audit launcher, full harness runtime, blocked tests, signing or publishing. |
| `aggregate-security` | Runs with `always()`, requires all four jobs to return `success`; absent, additional, failed, cancelled or skipped required jobs fail. Artifact uploads use `if-no-files-found: error`. |

Sprint 4 cleared the mobile-router high advisory in the public registry graph. The high/critical dependency gate remains mandatory. Build or scanner failures fail their jobs. The local build succeeded with Linux-native dependency files, and its receipt keeps TypeScript and trace collection. Actual GitHub-hosted execution remains unverified. Verify Vercel and any other hosting integration in the control plane before a review-branch push. [Sprint 4 results](sprint-4-results.md) · [Release gates](production-release-gates.md)

The previous `web-quality.yml` and `harness.yml` broad jobs contained blocked validations. They are manual-only notices that exit unsuccessfully, with historical implementations retained in Git. Do not re-enable those suites under a different name. Individual approved regressions are retained in the new allowlist. Review of the blocked-unit policy is required before expanding automation; no mechanism here grants permission to retry those tasks.

## Reproduction

Start Docker yourself if it stopped between sessions. Use Node 22.23.3, pnpm 10.32.1, Python 3 and Docker. No ambient dotenv is needed.

1. `python scripts/security/prepare.py workspace` copies public manifests, lockfile and workspace configuration into `tmp/security-sprint-2/dependency-workspace`.
2. In that directory, run `pnpm install --frozen-lockfile --ignore-scripts` with `NPM_CONFIG_USERCONFIG` and `NPM_CONFIG_GLOBALCONFIG` pointing to the generated `tmp/security-sprint-2/config/empty.npmrc`. Use an empty environment with only system/tool paths, scratch-local home/temp/cache and those configuration paths. Do not copy a developer npm token or dotenv. Registry fetching is a preparation step; application execution has no external network.
3. `python scripts/security/prepare.py tools` fetches checksum-verified public Linux esbuild, Next SWC and Gitleaks. Pull the immutable `nodeImage` and `semgrepImage` in `tools.json` before offline execution.
4. Run `python scripts/security/run-scoped.py <unique-label> tests`; modes also include `web-types`, `mobile-types`, `desktop-types`, `harness-types`, `desktop-compile`, `mobile-export`, `web-build`, `sbom` and the separately prepared unsigned `desktop-package`. A label cannot be reused.
5. Run `python scripts/security/run-scanners.py static` and `python scripts/security/run-scanners.py secrets`. They create unique evidence directories automatically.

The runners mount source/dependencies/tools read-only, copy source into bounded disposable scratch, start from an explicit empty environment, disable external network, drop capabilities and set CPU/RAM/process/file-size/disk/time limits. Fresh Prisma generation changes only fixture output location and fixture type-resolution paths. No application migration/bootstrap runs during web compilation. Only the ordinary staging runner can share the isolated PostgreSQL loopback namespace. Receipts record exact commands, limits, lock and source hashes. Failed setup attempts remain visible. Target-created packages/builds/dumps are discarded; the parent retains bounded summaries and the public SBOM only.

Tool preparation and dependency installation are authorized public downloads with package lifecycle scripts disabled. This does not authorize network access from builds, tests, target code or student programs.

## Manual GitHub settings

- Review the candidate and confirm deployment isolation before approving a push on `codex/security-*`. The workflow also accepts eligible PRs and manual dispatch.
- Make `Security engineering / aggregate-security` a required status check for protected branches; require review, disallow direct/force pushes and remove superseded broad-job requirements. Confirm actual check names in the first hosted run. Do not accept a missing or skipped check as a pass.
- Require owner review for `.github/workflows/`, `.github/dependabot.yml`, `scripts/security/`, the test allowlist and lockfile. Configure actual CODEOWNERS identities and bypass restrictions yourself.
- Keep default workflow token permissions read-only, restrict allowed Actions, disallow write tokens/secrets for fork PRs, and avoid executing untrusted PR code on privileged persistent self-hosted runners. No environments with production secrets should be attached to these jobs.
- Enable Dependabot alerts/security updates and review the weekly npm/Actions PRs. No automerge is configured. Expo SDK/Zod/architecture changes still require approval. Validate checksums/digests when reviewing tool updates; Dependabot does not automatically refresh `tools.json`.
- Where the repository plan supports them without a paid upgrade, enable native secret detection/push protection and repository dependency graph/SBOM features. Decide separately whether to extend secret scans to all unblocked tracked sources/history. Do not silently include blocked validation work.
- Review alert ownership, retention and weekly triage. Rotate any real exposed credential through its issuing service; never paste it into an issue or scanner artifact.

CodeQL/Advanced Security and hosted dependency-review entitlements were not assumed. Free local Semgrep/Gitleaks plus registry base/head comparison work without purchasing services. Manual settings and hosted enforcement are still open; adding YAML alone does not prove a release gate is enforced.
