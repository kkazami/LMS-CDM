# CdM LMS

Stack:
- Web: Next.js
- Mobile: Expo React Native
- Desktop: Electron
- Shared packages for config, types, utils, and API client

Institutes:
- ICS
- IBE
- ITE

## Local setup

Use Node.js 24.3+ LTS (or 22.13+) and pnpm 10.32.1. Install dependencies with `pnpm install --frozen-lockfile`, copy
`.env.example` to `apps/web/.env.local`, and fill in your own settings. The database
must be PostgreSQL. Keep credentials and database backups outside Git.

Run `pnpm dev:web` for the web app, `pnpm dev:mobile` for Expo, or
`pnpm dev:desktop` for Electron. `pnpm build:web` builds the web app.

Mobile uses the live backend by default and does not need database credentials.
Run `pnpm check:setup mobile` for startup diagnostics. For local API work, Expo SDK
compatibility, network/tunnel setup, and desktop configuration, follow
[the cross-device setup guide](docs/local-development.md). Mobile starts with Expo,
not `npx prisma start`.

CodeLab needs a configured managed execution provider. For the local JDoodle demo,
set `CODELAB_RUNNER=jdoodle`, `JDOODLE_CLIENT_ID`, and `JDOODLE_CLIENT_SECRET` in the
local environment file. Its free API allowance is shared across users; see
[the runner setup](docs/quality/managed-code-execution.md).

## Repository contents

Application code, public assets, Prisma migrations, tests, and CI configuration
belong here. Personal AI skills, memories, editor settings, temporary database
clusters, uploads, and generated reports are ignored. Shared harness rules and role
templates remain tracked because the verification tools require them.

Run `node scripts/check-repository-files.mjs` before publishing. See
[repository maintenance](docs/repository-maintenance.md) for the cleanup and laptop
transfer rules.
