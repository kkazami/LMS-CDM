# Program Head / ICS chart integration

This directory retains the exact previously approved program/chart-only target update as a reference. It is **not** a new Prisma migration and must not be replayed against a target where it was already applied. Its original proposal header is retained unchanged.

`approved-existing-target-update.sql` SHA256:
`0b24b1000719f9ca4976741ac2781deea75f96b58da94c7d5b8be13f3a34abc6`

The integration preserves main's existing Calendar UI, workspace API, course schedules, and CalendarEvent timestamps. It does not import the candidate Calendar implementation or create another Calendar route.

The organizational chart is available at `/ics/organization` for active instructors with persisted program membership. Current Program Heads can open faculty class lists and the scoped, read-only class Stream. A designation is not a global role. Existing courses without a program relation are not silently assigned.

The shared target's earlier program/chart update created structural tables only. Actual program records, instructor membership, head designations, course mappings, and the protected root need separately authorized setup. This integration performs none of those operations. Faculty management also retains the existing qualified-writer prerequisite and explicit INSTITUTE_ADMIN role requirement; legacy ADMIN is not automatically mapped. Protected attachment delivery has additional storage/binding prerequisites and is not qualified by these integration checks.

Migration-history reconciliation, deployment, database principal qualification, and broader Super User activation remain separate work. Do not use this reference as authorization to run `prisma migrate deploy`, `db push`, or a shared-target setup.

## Local verification

- `pnpm build:web` — use a disconnected or owned local database environment; Next loads local environment files otherwise.
- `pnpm exec tsx --test tests/calendar/student-calendar.test.ts tests/calendar/events-api.test.cjs tests/calendar/dashboard-calendar-data.test.cjs` — no database connections.
- `node tests/program-head/main-integration.mjs` — creates an owned disposable loopback PostgreSQL instance from the retained, hash-verified runtime. Generates current-schema DDL offline, tests actual scoped handlers and audit rollback, then checks the chart/modal/Stream and existing Calendar in installed Chrome. Blocks external browser requests. Does not inspect or mutate shared Neon.

Local integration evidence is under `tmp/program-head-integration/`. These results establish local checks only, not production readiness or OS isolation.
