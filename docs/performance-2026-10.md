# Shared LMS performance changes

The web application is the backend for web, mobile, and desktop. These changes reduce shared backend work and dashboard loading; they do not establish a latency guarantee for every feature.

## Changes

- Enable Prisma's `relationJoins` query strategy for PostgreSQL, so nested relations load in the database instead of separate application round trips. This is a Prisma preview feature and changes the default relation loading strategy across the backend. It changes no database tables.
- Use the selecting caller's freshly validated session once. Subsequent calls still query current session/account state and compare the pinned identity, role, institute, and token hash. No authorization TTL cache was added.
- Combine runtime-principal qualification and boundary qualification into one database call, retaining both checks on every privileged validation.
- Reuse the session's institute in the three main dashboards and Knowledge Exchange eligibility. The KX feed always scopes its query to that institute ID.
- Fetch independent instructor dashboard data concurrently. Exclude submitted student deadlines in SQL instead of loading a separate submission list. Fetch student profile data alongside enrollment data.
- Load student widgets in separate client chunks and request badge toasts only for students. Badge reads query the badge table directly; acknowledgements also enforce badge ownership.
- Pause automatic notification refreshes in hidden/offline tabs, refresh on return/reconnection, prevent overlapping requests, and abort on unmount.

## Measurement

`tests/program-head/performance-checks.mjs` uses the owned loopback PostgreSQL fixture, seven warm samples per operation, and counts actual `pg` driver calls. The baseline used the same synthetic accounts, schema, and one ICS/one foreign KX post. It did not connect to the configured live database.

| Operation | Baseline database calls | Updated database calls |
| --- | ---: | ---: |
| Student session | 6 | 1 |
| Administrator session | 10 | 2 |
| Notification list | 11 | 4 |
| New badges | 10 | 3 |
| KX feed | 24 | 4 |

Baseline receipt: `tmp/program-head-integration/feature-1792347283064/report.json`. Updated receipt: `tmp/program-head-integration/feature-1792347718289/report.json` (40 checks passed, fixture stopped). Reproduce updated measurements with:

```powershell
$env:TSX_TSCONFIG_PATH='apps/web/tsconfig.json'
node --import tsx tests/program-head/main-integration.mjs
```

The report includes local median milliseconds. Loopback timings exclude Neon/network latency, cold starts, production load, and development compilation. Query counts are the more reproducible comparison. Other data shapes may need different numbers of queries.

The regression suite tests Cookie/Bearer precedence, concurrent session reads, deletion, expiry, deactivation, role/institute/token changes, live database qualification, badge ownership, student deadlines, notification polling, and existing administrator/program workflows.

## Running the updated code

Prisma Client has been regenerated locally. Restart an existing development server with `pnpm dev:web` so it uses the new client. Production deployments should run `pnpm build:web` and restart/redeploy normally. This performance change requires no live SQL migration.

Representative production traffic and large-data load tests remain necessary to quantify real request latency and database CPU impact from the changed relation strategy.
