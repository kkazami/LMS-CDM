# Sprint 2 permitted verification

This directory implements the owner's dependency/client/CI compatibility scope. It is not a new audit run. `allowed-tests.json` is an explicit 15-file list with 102 expected passing Node tests; no glob discovery. Historical Sprint 1 and run2 test/evidence files remain unchanged.

- `dependency-compatibility.test.cjs`: retained supported APIs and approved Puppeteer internal Zod update, no browser/provider invocation.
- `desktop-security.test.cjs`: five cases covering renderer configuration, exact origins/frames, minimum permissions, all four IPC operations with positive controls, local CSP and compiled packaging entry. Electron/native dialogs are stubbed; actual packaged GUI behavior is unverified.
- `mobile-compatibility.test.cjs`: four ordinary navigation, bound Google callback, synthetic URL and same-session API checks. Fetch is in-memory. No storage/account-switch/offline/privacy/upload validation.
- `tooling_test.py`: six assessment failure/success tests. The scanner runner executes this separately in its offline Python image.
- `semgrep/client.ts`: parse-only rule fixtures, eight expected unsafe matches plus a safe configuration. Never execute this file. It is excluded from application scanning/results.
- `staging.test.cjs`: separate one-test ordinary current-schema PostgreSQL fixture. Only `run-staging.py` provisions its isolated database. It is not in the no-database default test list.

Use the [automation runbook](../../docs/security/automated-security-checks.md) and [client/staging instructions](../../docs/security/client-release-security.md). Runners propagate failures and reject missing/unexpected/failed/skipped test counts. Use a unique label for each execution; retain failed receipts.

Do not run the original broad audit launcher, full test discovery or broad harness commands. Run2 blocked units remain uploads, files/assets, auth_core, mobile_storage (platform safeguard), forms, attendance, host_provider and host_runner (usage limit). Existing evidence for these units is preserved, not re-executed. Ordinary compilation/bundling is compatibility evidence only, never validation of these blocked security hypotheses.
