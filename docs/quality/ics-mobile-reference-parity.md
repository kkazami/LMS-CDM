# ICS mobile dashboard parity

The October 30, 2026 screenshot brief supersedes the earlier ICS Home / Courses /
Agenda / Community / Profile tab arrangement. ICS now follows the web mobile
navigation: Dashboard, Courses, Grades, Alerts, More for students; Dashboard,
Classes, Analytics, Alerts, More for professors. IBE and ITE retain their screens.

## Implemented

- Native welcome panels, two-column shortcuts, course cover cards, and a fixed
  bottom bar with safe-area and enlarged-text clearance.
- A native More sheet with account editing, theme switching, role-specific tools,
  and sign-out. Existing native coursework, flashcards, tasks, grades and alerts
  remain connected to the authenticated API client.
- Month, week and day calendar views, event details, GMT+8 dates and recurring
  classes limited to each course's inclusive semester dates. The SDK also keeps
  schedules in agenda responses instead of discarding them.
- Native class-code entry, pending assignment lists, grading/enrollment course
  selectors, and server-persisted ordering with rollback on save failure.
- The Next.js `/api/mobile/dashboard` endpoint supplies the authenticated ICS
  account's approved enrollments or taught classes, accurate approved student
  counts, pending grading/enrollment counts, calendar and unsubmitted deadlines.
  PATCH validates every course against the same scope and saves in a transaction.
- Add Class, archived classes, organization and leaderboard management use the
  existing authenticated in-app web workspace. Add Class opens the actual web
  creation form. CodeLab, Knowledge Exchange and Practical Labs preserve their
  existing native workspace integration.

## Verification

Run from the repository root:

```powershell
pnpm --filter mobile typecheck
pnpm --filter web exec tsc --noEmit
node --import tsx --test tests/mobile/*.test.ts
New-Item -ItemType Directory -Force tmp/expo-runtime | Out-Null
$env:TEMP = (Resolve-Path tmp/expo-runtime).Path
$env:TMP = $env:TEMP
pnpm --filter mobile exec expo export --platform all --output-dir ../../tmp/mobile-ics-release
node tests/mobile/preview-smoke.cjs
```

The workspace-local temporary directory avoids Windows sandbox write failures
from the Hermes subprocess. The preview test uses synthetic student and professor
accounts, intercepts API traffic and blocks external requests. It checks 320,
390 and 768 pixel layouts, light/dark appearance, five reachable tabs, recurring
classes, calendar views/details, More, profile cancel, class-code submission,
pending assignments, saved order, grading/request selectors, Add Class routing
and the existing paginated course-to-assessment journey. Screenshots are written
to `tmp/mobile-ics-review/`; they are Expo Web previews, not native-device proof.

## Release requirements

Deploy the included Next.js API and session-bootstrap allowlist changes with the
mobile update. No schema migration or new environment variable is required. An
older deployed backend does not provide `/api/mobile/dashboard` or authorize the
new instructor workspace destinations.

Android and iOS Hermes exports pass. No Android device was connected during this
change, and iOS device execution was unavailable on the Windows host. Native
gesture, keyboard, screen reader, large-text, WebView cookie/session and real
account mutation checks remain device acceptance work. No production data was
modified and no deployment was performed.
