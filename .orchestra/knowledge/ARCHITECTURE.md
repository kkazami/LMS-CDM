# LMS Architecture

## Tech Stack
- **Frontend:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS 4 with institute-specific themes
- **Database:** PostgreSQL with Prisma 7 ORM (driver adapter via @prisma/adapter-pg)
- **Auth:** Custom cookie-based sessions (lumina_session), DB-backed
- **State:** Zustand
- **Validation:** Zod
- **Monorepo:** pnpm workspaces + Turborepo
- **3D/Interactive:** react-three-fiber + Monaco Editor + Judge0

## Application Structure
- `apps/web/` — Main Next.js app (the ONLY real backend). Route handlers in src/app/api/
- `apps/mobile/` — Expo (React Native)
- `apps/desktop/` — Electron
- `apps/api/` — Empty placeholder (do NOT add logic)

## Web App Layout
- `src/app/(dashboard)/[institute]/` — Authenticated dashboard routes (ICS, IBE, ITE)
- `src/app/(public)/` — Public routes (login, register)
- `src/app/api/` — API route handlers
- `src/components/` — Shared UI components
- `src/features/` — Feature modules
- `src/lib/` — Utilities, auth, db, RBAC
- `src/institutes/` — Per-institute theme config

## Key Patterns
- **Database:** Import `{ db }` from `@/lib/db` (wraps pg.Pool + Prisma adapter)
- **Auth:** Session via `getSession()` from `@/lib/auth-session.ts`
- **RBAC:** `src/lib/rbac.ts` (STUDENT, PROFESSOR/TEACHER, ADMIN)
- **Theming:** `getInstituteTheme(code)` from `src/lib/get-institute-theme.ts`
- **Middleware:** `src/middleware.ts` checks cookie presence only. API routes excluded.
- **API Auth:** Each API handler must verify session via `src/lib/api-auth.ts`

## Architectural Invariants
1. All dashboard routes MUST nest under (dashboard)/[institute]/
2. Frontend cannot directly access database (use API routes)
3. All protected operations require authentication
4. API responses use standard error format
5. Multi-model DB writes MUST use db.$transaction()
6. Never hardcode institute theme colors
7. Shared components belong in packages/ui (though web currently keeps its own in src/components/)

## Ports & URLs
- Web dev server: http://localhost:3000
- Judge0 (code execution): http://localhost:2358
