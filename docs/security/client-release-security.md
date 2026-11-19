# Client release security and synthetic staging

See [Sprint 2 results](sprint-2-results.md), [automation](automated-security-checks.md), [MFA rollout](admin-mfa-production-rollout.md), [operator checklist](production-operator-checklist.md) and [backup/DR strategy](backup-disaster-recovery.md). No production endpoint, real record, signing credential or deployment was used.

## Desktop changes and evidence

Electron 42.11.18 and electron-builder 26.18.0 replace the approved older majors. `pnpm --filter desktop compile` emits CommonJS into `dist/electron`; package entry is `dist/electron/main.js`. `build` and `pack` compile first. Packaged root paths resolve correctly from the compiled directory. `electron-builder.json` includes compiled JavaScript, local renderer and static assets; output is separated under `dist/packages`.

Both windows explicitly retain sandboxing, context isolation, disabled renderer Node integration, disabled webviews and disabled insecure mixed content. Main-frame navigation and redirects require the configured exact origin. Only HTTPS links (localhost HTTP during development) can be handed to the system browser. The desktop session no longer overwrites the server CSP with a broad policy. Splash/fallback HTML use strict local CSP with external local scripts/styles. Renderer permission requests/checks default to denial; only sanitized clipboard writes and fullscreen are allowed for the designated main LMS frame, preserving copy/fullscreen features without clipboard reading, device access or filesystem grants. Native notifications, user-selected exports and PDF printing remain available through the existing narrow preload bridge.

All four IPC channels validate the exact designated WebContents and main frame, then its LMS origin. Local fallback pages have no native privileges. Export arguments are checked before a save dialog; native paths remain chosen by the user. No generic filesystem/shell bridge was added. Five new desktop tests cover allowed/denied origins/frames, all IPC siblings, export/PDF/notification positive controls, CSP/configuration and compiled package entry. This work does not retry run2 upload/assets/privacy validation.

An official Electron Windows x64 archive was checksum-verified before offline packaging. The unsigned directory package was created in bounded disposable scratch, `--publish never`, with executable signing/resource editing disabled for this local check only. Archive inspection confirms the compiled entry/preload/security/IPC and renderer files, and excludes `.env`, TypeScript source and `node_modules`. The package was discarded after its checksum/summary was recorded. The builder used manual dependency traversal because pnpm was not installed inside the offline runtime; the desktop has no production Node dependencies. This is archive/build evidence, not proof of native GUI behavior.

An isolated Windows GUI runtime is unavailable here; no native launch, actual OS save/print dialog, persistent-session, sign-out, MFA recovery-device interaction or installer test is claimed. No `--no-sandbox`, certificate bypass, real account or live LMS fallback was used to bypass that limitation.

Before distribution, the owner must:

1. Rebuild the reviewed committed revision, set `LMS_WEB_URL` to an approved HTTPS staging origin and perform ordinary admin MFA login, dashboard/accounts/course navigation, export, PDF printing, notifications, sign-out, outage fallback/retry and invalid-certificate refusal on Windows. Also check supported macOS/Linux targets separately.
2. Confirm OS signing/notarization requirements, custody/revocation of signing keys and installer provenance. Use a restricted signing/release environment after reviewed unprivileged builds. Never make the local unsigned override a production policy.
3. Decide the secure-update architecture before adding one: the existing updater is a placeholder. Use authenticated HTTPS metadata, signed packages, a trusted update origin, explicit rollback policy and key rotation. No update provider or paid service was introduced.
4. Test application functionality on the actual packaged OS; read-only type/config tests cannot prove Electron sandbox/CSP behavior or OS integration.

## Mobile scope

Expo SDK 57 and React Native 0.86.3 are retained, with supported Expo/router/peer patch updates. React and academic behavior are unchanged. The new tests exercise ordinary course/CodeLab/grade navigation, synthetic staging URL selection, a bound Google callback ticket and same-session bearer/API DTO contracts using in-memory fetch only. Existing MFA admission tests remain in the explicit allowlist. These are compatibility checks, not blocked storage/offline/account-switch/upload validations or a real Google flow.

Android/iOS Metro exports pass offline, producing Hermes bundles (iOS 8.2 MB, Android 8.4 MB) with no Sentry credentials or upload. Build receipts distinguish descriptor/snapshot-input failures from source failures and successful exports. Bundles are not signed native applications. Neither Android device/emulator nor macOS/Xcode/iOS distribution was exercised. The pre-existing lucide React peer warning remains documented.

Owner device checks: ordinary Google sign-in through a separately authorized synthetic staging identity; supported course navigation and APIs; permitted student/instructor workflows; grade rendering; accessibility/network loss; platform permission prompts for the existing camera/location features; approved Android/iOS signing, deep-link association and distribution policies. Do not use that checklist to resume blocked security tests. Mobile storage/file candidates remain blocked and are not established as fixed by these updates.

## Synthetic staging and recovery

`tests/sprint-2/staging.test.cjs` is separate from broad discovery. `scripts/security/run-staging.py <unique-label> <DDL-fixture-directory>` accepts no database URL. Prepare public current-schema DDL with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` in an offline tooling fixture, storing the exact companion `schema.prisma` with `schema.sql`. The runner refuses a different schema. The local run reused pre-existing generated DDL only after exact schema-byte comparison.

Prepare dependencies/tools using the automation runbook and pull the pinned `postgresImage`. The runner starts PostgreSQL in an isolated loopback namespace, read-only root, bounded tmpfs and no published ports/durable volume. It provisions three dummy users, one institute/course/enrollment, runtime/operator database roles and the existing database authorization guards. Sessions are synthetic; the administrator has a real user-bound encrypted dummy factor/proof row. No factor/session authorization is stubbed. It checks ordinary student/instructor course reads and a successful administrator user export with its persisted metadata-only event. The existing allowlisted grading tests separately verify server recomputation and normalized points; this does not claim browser end-to-end academic validation.

After those checks, an actual PostgreSQL custom-format dump is restored into a second disposable database. The expected recovered counts are users=3, courses=1, enrollments=1, export events=1. The dump never leaves scratch; all exact owned containers and their tmpfs are removed. This rehearses a synthetic logical backup, not infrastructure/PITR, cross-cluster role/grant restoration, external objects or encryption-key recovery. Those remain the operator's production gates in the Sprint 1 DR strategy. Administrator database summaries remain non-recoverable summaries.

## Release and rollback gate

Record the committed revision, lock hash, build/tool versions and artifact hashes. Run scoped checks and retain their actual results. Verify the deployed build identity and approved environment using the operator checklist only after separate production approval. A green local fixture is insufficient: require the outstanding advisory/build/native-runtime decisions, production database least-privilege grants and guard qualification, MFA migration/key/device enrollment, managed Judge0-compatible provider isolation, backups/keys/object recovery, monitoring and rollback receipts.

Rollback to an approved signed client/web artifact and matching frozen lockfile; preserve MFA schema, encrypted factors, revocation triggers and audit evidence. Never relax authorization or restore legacy password-only admin sessions to make a rollback work. No database schema change was introduced in Sprint 2. A schema-changing release needs its own rehearsed migration/compatibility plan. If no tested recoverable backup exists, halt production changes rather than substituting the administrator summary export.
