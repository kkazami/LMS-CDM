# Attendance implementation and verification — 2 November 2026

## Plan coverage

| Phase | Implementation | Remaining rollout evidence |
| --- | --- | --- |
| 1 — Core | Web/native tabs, three modes, configurable live/async capacity, rotating QR/live codes, manual marking/corrections, personal history, timezone/eligibility rules, audit events, CSV, retention job and institute flags; migration applied to configured database | Configure signing/cron secrets and the school-approved policy |
| 2 — Requests/location | Optional request notes, individual decisions, guarded Accept All, neutral standing arrangements, durable notifications/deep links, foreground location and individual exceptions | Physical camera/permission checks and indoor campus location pilot; school privacy approval |
| 3 — Helpers/summaries | Attendance-only grants, isolated web/native entry, historical access/revocation rules, totals and configurable consecutive flags | Deployed role/navigation smoke tests after institute pilot enablement |

All 52 previous class route files remain under the URL-preserving learning route group. Attendance helpers do not gain general course membership. Existing class routes retain their own authorization.

## Executed checks

- 14 attendance rule/boundary tests passed, plus four existing academic/stream regression tests.
- 20 Playwright component-flow checks passed across desktop/mobile widths and light/dark themes. They cover direct check-in, request notes, individual async cutoffs, session creation, bulk confirmation, navigation order, keyboard focus, contrast, QR expiry and disclosed settings. Fixtures are explicitly synthetic and do not prove a deployed full-stack session or native camera behavior.
- 19 native PostgreSQL integration checks passed, including existing upgrade, fresh replay, atomic failed-migration recovery, data preservation, runtime grants, real route-handler privacy checks with synthetic sessions, concurrent retries, helper authority/revocation, enrollment changes, expiry, cancellation and retention holds.
- A 100-student burst completed in 750 ms (p95 718 ms); a 200-student burst completed in 1,529 ms (p95 1,464 ms), using a two-connection pool. Both produced zero duplicate records and zero incorrect statuses. These are local synthetic service measurements, not campus network capacity guarantees. Delay/retry and simultaneous-closure cases also passed; real Wi-Fi loss remains a pilot check.
- Web/mobile TypeScript checks and harness typecheck passed. All 69 harness safety tests passed outside the Windows filesystem sandbox after its temporary-git restrictions prevented the first attempt.
- Production web build passed with a dummy loopback database URL. Android and iOS Metro/Hermes exports passed with dotenv loading and telemetry disabled. These exports are not signed APK/IPA builds or physical-device tests.
- Prisma validation and diff whitespace checks passed. The Impeccable detector reported no findings. The finish reviewer marked its three material UI findings resolved, scoped to supplied synthetic web captures and inspected source.

Database evidence: `tmp/attendance/integration-1793550634663/report.json`. Build/export logs and screenshots are under ignored `tmp/attendance/`. Tests used portable PostgreSQL 17.11 from EDB's official distribution, without Docker; every owned test cluster was stopped. During those initial feature checks, the configured LMS database was not migrated, seeded or used for testing. The later database repair is recorded below.

## Login repair — 2 November 2026

The regenerated Prisma client expected `Institute.timezone`, but the configured database had not received the attendance migration. Login includes the full institute in its account lookup, so this schema mismatch caused its generic error. A read-only check confirmed the missing attendance columns; the runtime connection was deliberately unable to migrate.

After a separate owner connection was supplied, `scripts/attendance-database.mjs --apply` created an ACL-protected custom-format backup and applied only `20261101000100_attendance`, recording its checksum in the same transaction. Runtime permissions and the existing application security boundary remained qualified, and attendance rollout remained disabled. The temporary owner setting was removed afterward; the runtime connection was unchanged. No accounts or passwords were changed.

Read-only verification through the actual runtime Prisma adapter passed the login account-plus-institute lookup, a full institute read, and schema readiness with zero missing columns. A complete interactive sign-in was not performed because it requires the user's credentials. Private backup and receipt: `tmp/attendance/private-upgrade-1793551665070/`.

The targeted operator was first verified on disposable local PostgreSQL, including rollback if receipt insertion fails, repeat-run idempotency, and rejection of a changed checksum. All 21 integration checks and the 100/200-student bursts passed (`tmp/attendance/integration-1793551629510/report.json`). Docker was not used.

## Default availability update — 2 November 2026

The user's later instruction supersedes the original disabled-by-default rollout plan. Classes now receive all three attendance phases by default, without a stored institute policy or administrator activation. The web activation controls were removed; web and native use the same backend defaults. Optional explicit institute overrides remain supported for existing installations. The configured database has zero overrides. A local random server-only QR signing secret was configured without exposing it.

The new production-mode integration case exercises instructor settings, session creation, QR issuance/scanning, camera-free requests with notes, Accept All and arrangements with no institute policy and no admin action. All 21 PostgreSQL checks and 14 unit checks passed (`tmp/attendance/integration-1793552266872/report.json`).

## Remaining operational evidence

Latest toggle visibility update: the chevron border is removed, and it is offered only below 768px when measured full-label content exceeds the available row width. ResizeObserver and font-ready measurement keep this independent of the selected icon/label preference. Desktop/laptop and fitting mobile rows always use labels without the button. Eight focused browser checks passed in both themes, covering the border, resize transitions, desktop suppression despite saved compact preference, and a fitting four-tab mobile row. Web typecheck passed; physical-device checks were not run.

Class-tab alignment correction: the latest user instruction restores horizontal scrolling for labeled tabs. Compact icons now share one row, the chevron and links have matching vertical centers, and the active underline no longer changes content alignment. Eight focused browser checks passed across both themes and viewport projects, including seven links fitting at 320px, center alignment within one pixel, labeled overflow without wrapping, scrolling to the final link, and the fixed toggle remaining visible. Physical-device testing remains outstanding.

Responsive web class-tab update: a persistent chevron toggles icons versus labels, with icons the default below 640px. Both modes wrap without horizontal scrolling. All 32 browser checks passed, followed by eight focused navigation/contrast checks after the final wrapping adjustment. The new case verifies all seven instructor links at 320px, accessible names, keyboard toggling and saved preferences across remounts in both themes. Web typecheck passed. This change targets the responsive web class header; native tab components were not changed or device-tested.

Compact roster update: instructor web/native session lists now require a name/student-ID search and show at most five matching rows per page. The web QR preview is smaller with fullscreen retained. All 28 synthetic browser flows passed across desktop/mobile widths and both themes, including blank/no-match states, pagination, case-insensitive ID search and marking the correct record with its revision. Web/mobile typechecks passed. Native physical-device interaction was not exercised for this UI change.

QR grace update on 2 November 2026: web/native/API defaults now use 30 seconds with a 3–60-second range. The separately backed-up migration `20261102000100_attendance_qr_grace` was applied to the configured database; schema readiness, runtime permissions and the application boundary passed. No existing session grace was changed. Private backup: `tmp/attendance/private-upgrade-1793553016620/`. The temporary owner setting was removed afterward. All 22 disposable PostgreSQL checks, 14 unit checks, four new browser checks (both sizes/themes), and web/mobile typechecks passed. Boundary tests confirm 60-second grace does not extend token acceptance past session closure. Evidence: `tmp/attendance/integration-1793552972969/report.json`. No physical weak-network device test was performed for this change.

The school retention schedule, lawful-basis/privacy review, scheduler deployment/heartbeat monitoring and missed-run alert drill remain external production requirements. Location must remain off until its indoor/device pilot passes. Native permission changes require rebuilding the application and testing on physical Android/iOS devices and mobile browsers over HTTPS.

Ordinary attendance is available without an activation gate. Optional location still requires its review/retention settings and a recent healthy retention heartbeat in production. This gate cannot certify the actual school review or external monitor configuration. No deployment or production-readiness certification is claimed.
