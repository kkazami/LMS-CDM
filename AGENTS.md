# AGENTS.md

LMS monorepo. pnpm@10.32.1 workspaces + Turbo. Read `.agents/rules/current-lms-architecture.md` for the intended design, but treat it as partly aspirational — verify against code before relying on it.

## Repo shape
- `apps/web` — Next.js 16 App Router. This is the **only real backend**; route handlers live in `src/app/api`.
- `apps/mobile` — Expo (expo-router) app. `apps/desktop` — Electron. `apps/api` — empty placeholder, do not add logic there.
- `packages/*` — `ui`, `types`, `config`, `utils`, `api-client`, `eslint-config`. `packages/ui` is currently **unused by web**; web keeps its own components in `apps/web/src/components`. The only cross-package import in web is `@lms/types`.
- Shared Prisma schema/migrations live at repo root `prisma/`, not inside an app.

## Commands
- Install: `pnpm install` (postinstall runs `prisma generate`).
- Web dev: `pnpm dev:web` (binds `0.0.0.0`). Web build: `pnpm build:web` (regenerates Prisma first).
- Mobile: `pnpm dev:mobile`; typecheck `pnpm --filter mobile typecheck` (excludes `src/legacy-app`).
- Desktop: `pnpm dev:desktop`; `pnpm build:desktop`.
- No test framework, no test files, no CI, and no root lint/typecheck script. `turbo lint` only runs mobile's `echo`. For web, use `pnpm --filter web exec tsc --noEmit` or `pnpm build:web`.

## Prisma / database
- Provider is **PostgreSQL** only; the `file:./dev.db` line in `.env.example` is stale.
- Prisma 7 uses the `@prisma/adapter-pg` driver adapter. Import the singleton as `{ db }` from `@/lib/db` (`apps/web/src/lib/db.ts`) — it wraps a custom `pg` Pool, not the default client.
- After editing `prisma/schema.prisma` run `pnpm prisma generate`. It also auto-runs on `postinstall`, web build, and every `next.config.ts` load.
- Seed: `prisma/seed.ts` (also `scripts/seed.ts`). `DATABASE_URL` comes from root `.env` / `apps/web/.env.local`.

## Auth, routing, theming
- Session cookie is `lumina_session`; helpers in `apps/web/src/lib/auth-session.ts`.
- Middleware is `apps/web/src/middleware.ts` (**not** repo root). It only checks cookie presence; institute scoping and RBAC are enforced in `app/(dashboard)/[institute]/layout.tsx` and `src/lib/rbac.ts`.
- Dashboard routes MUST nest under `apps/web/src/app/(dashboard)/[institute]/`; public pages under `(public)`.
- Theme via `getInstituteTheme()` (`src/lib/get-institute-theme.ts`); per-institute theme/config in `src/institutes/{ics,ibe,ite}/`. ICS=orange, IBE=yellow/gold, ITE=blue.
- Role values are DB strings: `STUDENT`, `PROFESSOR` (alias `TEACHER`), `ADMIN`.

## Security
- Gated routes MUST be protected. Do not rely on `middleware.ts` alone for authorization — it only checks cookie presence.
- Always enforce RBAC for student vs. professor vs. admin views using `src/lib/rbac.ts` and the `(dashboard)/[institute]/layout.tsx` scoping.
- API route handlers are not covered by middleware (`/api` is excluded). Each handler must verify the session itself (see `src/lib/api-auth.ts`).

## Gotchas
- Interactive activities (`codelab`, `arduino`, `logic-gate`, `pc-build`, `server-rack`) use react-three-fiber + Monaco and depend on an external Judge0 service: `docker compose -f docker/docker-compose.judge0.yml up -d` (localhost:2358).
- Root `.env` and `apps/web/.env.local` contain live credentials and are gitignored. Never print or commit them; use `.env.example` as the template.
- Desktop builds from `electron/` into `dist/electron` (see `electron-builder.json`).
- Repo rules live in `.agents/rules/*.md`; skills in `.agents/skills/`.
