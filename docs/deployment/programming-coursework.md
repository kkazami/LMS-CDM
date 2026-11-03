# Programming coursework deployment

Instructor Classwork now has separate **Programming coursework** and **Require GitHub repository** settings. GitHub-only coursework accepts exactly one HTTPS GitHub repository root URL through the existing coursework submission and grading flow. Existing coursework defaults both settings to false.

This release validates URL structure. It does not contact GitHub, verify repository existence, ownership or permissions, connect an account, or freeze a commit. Instructors must be able to open the repository. Form assessments, interactive activities and guided labs retain their own submission flows; create ordinary coursework for a repository submission.

## Database upgrade before Vercel deployment

Migration: `prisma/migrations/20261031000100_programming_coursework/migration.sql`. It adds two non-null boolean columns with false defaults and a consistency check. It does not delete or rewrite submissions, grades, attachments, or existing GitHub integration records. The existing runtime table grants cover the new columns.

The normal Vercel build runs a read-only readiness check after generating Prisma. It refuses to deploy if the migration is missing or Prisma expects missing database columns. Local builds skip this deployment check. A custom Vercel build command must use `pnpm build:web` or the web package's `build` script to retain the check.

The web build explicitly uses Next.js's supported `--webpack` option. The default Turbopack build failed to start its CSS worker on this Windows workspace; the Webpack production build completed. Development keeps its existing bundler configuration.

1. In an operator terminal at the repository root, make `PROGRAMMING_COURSEWORK_DATABASE_URL` available as an environment variable containing the owner/migrator connection to the **same database** used by the web runtime. Keep the restricted application connection in `DATABASE_URL`; an owner credential is used only for migration.
2. Run `node scripts/programming-coursework-database.mjs --apply`. This applies only the reviewed additive migration in a bounded transaction and records its checksum in Prisma migration history. Repeat runs verify the existing receipt and schema. It refuses partial schema, checksum mismatches, unfinished migrations, and a different database target.
3. Run `node scripts/programming-coursework-database.mjs --check`. Expect `ready: true`, `runtimeAccess: true`, and `missingPrismaColumns: []`. The command prints no connection strings or application records.
4. Deploy to Vercel with the same verified runtime database. Check one instructor creation/edit flow and one enrolled student's repository submission and grading flow after deployment.

Use the targeted command on this established database rather than replaying all historical pending migrations. On a clean database managed entirely through Prisma migrations, the normal owner-run `prisma migrate deploy` pipeline can apply the migration instead. Never use `prisma db push` or reset a live database for this feature.

The migration is compatible with the previous application version: both fields default off. Rolling application code back does not require dropping the columns.

## Verification

- `pnpm prisma validate`
- `pnpm --filter web exec tsc --noEmit`
- `node --import tsx --test tests/programming-coursework/submission.test.ts`
- `node --test tests/web-quality/academic.test.cjs`
- `node tests/programming-coursework/integration.mjs` with `LAB_TEST_PG_RUNTIME_ROOT` pointing to the retained test PostgreSQL distribution (owned loopback fixture only).
- `pnpm exec playwright test --config tests/programming-coursework/playwright.config.ts` (desktop and mobile, real UI with synthetic server-action responses).
- `pnpm build:web`

The feature tests cover repository URL spoofing, GitHub profiles and nested pages, file/multiple-link bypasses, empty final submissions, saving and replacing a repository, instructor settings, unchanged historical work, access guards, deadlines, grading, and database constraints. Repository access/authorship and authenticated production behavior require separate live verification.

## Applied database verification — 31 October 2026

The additive migration was applied to the configured LMS database with a session-only owner connection. A separate read-only inspection through the unchanged restricted runtime connection confirmed `ready: true`, `runtimeAccess: true`, `canMigrate: false`, and `missingPrismaColumns: []`. No owner credential was saved to the repository or application configuration.

The existing public Vercel `/api/health` returned HTTP 200 with `status: ok`, and the ICS login page returned HTTP 200. These checks describe the current release; this feature's application code has not been deployed by this task.

Final local results: Prisma schema validation and web TypeScript passed; `pnpm build:web` passed with `VERCEL=1`, including the live database readiness gate. Feature verification passed 3 unit tests, 8 PostgreSQL integration scenarios, and 4 desktop/mobile browser tests. Adjacent guided-lab tests passed 18 tests; the web quality suite passed 38 with one optional real-antivirus test skipped. The scanner protocol fixture passed outside the sandbox. Existing middleware deprecation and `file-type` bundling warnings remain; there were no production-build errors.
