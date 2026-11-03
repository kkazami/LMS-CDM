# Class attendance

Attendance is available by default on the shared web backend and on web/native class screens. Instructors can use all three feature phases without an institute administrator activating them. Location verification remains off by default. No academic history is backfilled from meeting-link joins.

## Phases and settings

1. Core: in-person rotating QR, live-remote direct check-in (optional live code), async check-in, separate live/async concurrency limits, manual marks/corrections, personal history and CSV exports.
2. Requests: single/bulk decisions, neutral approved arrangements, durable decision notifications and optional foreground location.
3. Helpers: class-scoped attendance-only access, a separate attendance route layout, class totals and consecutive absence/tardy labels.

Class instructors start sessions and configure concurrency, follow-up thresholds, approved arrangements and helper access directly. Optional record-retention/timezone/location settings remain institute-scoped; they are not an attendance activation step. Legacy explicit rollout overrides are still honored, but no override is required for a class to use attendance. Default live/async limits are one each and can be adjusted independently from 1–10. Session policy and timezone are snapshots; changing settings does not rewrite earlier sessions.

UTC timestamps are displayed in the session's institute timezone (Asia/Manila by default). A session date is its local opening date; date-filtered exports use that date even when an async window spans several days. Async joiners are required only if at least min(24 hours, original duration) remains. Their Present cutoff shifts by the original allowance, capped by the shared deadline. Unmarked async leavers are exempt; rejoining never resets a cutoff.

QR tokens rotate every 15 seconds. Transmission grace defaults to 30 seconds and is configurable from 3–60 seconds when starting a session. A larger grace tolerates longer delivery delays and also gives shared tokens a longer usable window. It never extends the session deadline, changes server-receipt classification, or permits offline/backdated check-ins. Existing sessions retain their original grace. Apply `20261102000100_attendance_qr_grace` for the expanded database constraint; the targeted attendance upgrade command includes it.

## Permissions

Students see only their own records and requests. Primary instructors/admins manage settings, corrections, exports, arrangements and helper grants. Active same-institute instructor accounts may receive helper access. Helpers can read history, run/end sessions, mark unmarked students while open and decide pending requests (including after closure and eligible Accept All). They cannot edit completed marks, cancel sessions, export, manage arrangements, change policy or delegate access. Requests that conflict with an explicit mark require a primary-instructor correction.

Instructor session rosters on web/native start with a search field instead of rendering the entire class. Name/student-ID searches show five matches per page, including previous/next controls, without changing server-side attendance records or marking permissions. Students still see their own results immediately. The web QR preview is compact; fullscreen expands it for classroom display.

Responsive web class tabs have a borderless chevron toggle between icons and labels only below 768px when the full labels would overflow the available row. Fitting mobile rows and all desktop/laptop views show labels without a toggle. Overflowing mobile rows default to icons, while a saved browser preference takes precedence. Both modes stay on one vertically centered row. Compact icons share the available width; labeled tabs retain the original horizontal scrolling with the active tab brought into view and a fixed chevron. Icon links retain accessible names, titles, active-state indicators and pending badges. Attendance-only helpers still receive only their authorized tab.

Helpers receive only an Approved arrangement label. No diagnosis or medical evidence is collected. Remote attendance and approvals without location are explicitly labelled; QR/device location are deterrents, not proof against relaying, account sharing or spoofed coordinates.

## Database and server configuration

- Additive migration: `20261101000100_attendance`. Generate Prisma before building. Apply the reviewed migration through an authorized owner/migrator workflow; do not use db push or reset on an existing LMS database.
- Run `node scripts/attendance-database.mjs --check` to detect missing attendance schema. For an existing database, set `ATTENDANCE_MIGRATION_DATABASE_URL` to a separate owner connection in the local gitignored web environment and `ATTENDANCE_PG_BIN` to a trusted PostgreSQL client directory, then run `node scripts/attendance-database.mjs --apply`. It verifies database identity and the restricted application boundary, creates a private custom-format backup, and commits only this migration and its checksum receipt in one transaction. Repeated runs verify the receipt; partial schemas and unrelated drift stop the upgrade. It does not create institute policy overrides; attendance uses the application defaults. Remove the temporary owner connection afterward.
- The existing Vercel build readiness check compares every Prisma column, including attendance tables and Institute.timezone, and blocks deployment if this migration is absent. Attendance transactions explicitly use UTC so a PostgreSQL server's local timezone cannot shift expiry calculations.
- Enabling location in production requires a successful retention-job heartbeat within 30 hours and no recorded cleanup backlog. Ordinary QR/direct attendance does not require this activation check.
- Set server-only ATTENDANCE_QR_SECRET to at least 32 random characters. Missing configuration disables QR/live-code issuance, never substituting a public code.
- CRON_SECRET must be at least 32 characters for the retention endpoint. Both Vercel configurations schedule `/api/cron/attendance-retention` at 03:00 UTC daily.
- Session expiry is finalized by the shared service on all dependent reads/writes, including exports and summaries. It does not depend on cron, a browser or a background mobile app.
- Native camera/location plugins require rebuilding the application. No microphone recording or background location is requested. Web camera/location require HTTPS (localhost is permitted for development).

## Retention and operations

Operational defaults are 30 days for request text and verification details and 90 days for approved arrangements; these are application defaults, not statutory periods or evidence of school approval. Academic records and audit events have no automatic deletion deadline until a school schedule is configured, to avoid deleting academic history arbitrarily. Lifetimes are measured from session close for academic records, event creation for events, request submission for request text, verification creation for verification details and arrangement creation/renewal for arrangements. Changing policy applies to subsequently created expiration timestamps; an existing-data rescheduling decision must be reviewed separately.

Audit events contain only status/source/category, actors, timestamps and correction reasons. Raw coordinates, distance, accuracy and QR tokens never enter audit events. Detailed verification data has a separate disposable table. Audit events cannot be updated by the restricted runtime role. Exports exclude explanations and arrangements and are not persisted on the server; native temporary export files are removed after sharing.

The daily purge uses a lease, bounded batches and persisted progress/backlog. A privileged monitor must poll `/api/cron/attendance-retention?health=1` with the cron bearer secret and alert on a non-200 result. Health becomes unhealthy after 30 hours without a successful run or with an overdue backlog. Do not expose the secret in URLs or public monitors. Configure and demonstrate this monitor before production rollout; repository configuration does not prove a deployed scheduler exists.

Institute admins can place/release session retention holds with a reason. Purge rechecks holds under session locks. Coordinate backup expiration and reapplication of deletions after restoration with the school's retention process.

## Verification and rollout evidence

See [the implementation and verification record](attendance-verification.md) for completed phases, executed checks and outstanding production work.

- `pnpm test:attendance` — rule, validation, token and negative-boundary tests.
- `pnpm test:attendance:integration` — disposable native PostgreSQL migration, service authorization and class-size bursts. Set ATTENDANCE_TEST_PG_BIN to a complete portable PostgreSQL bin directory; never point it at an existing data directory or pass live credentials. Creates only a new ignored tmp cluster and stops it on exit; Docker is not used.
- `pnpm test:attendance:browser` — synthetic, labelled web UI fixtures at desktop/mobile sizes and light/dark themes. These do not replace real backend or physical-device verification.
- Run web/mobile typechecks, a production web build, and repository harness safety tests/typecheck.

Before enabling: review migration replay/upgrade and recovery evidence; verify scheduler invocations plus a missed-run alert; complete school privacy review and retention configuration; test camera permissions/scanning on physical Android/iOS and mobile Safari/Chrome over HTTPS. Location stays off until indoor campus readings are reliable. Record weak-network burst results and limits; do not claim synthetic browser tests prove campus performance or legal compliance.
