# Engineering Conventions

## Naming
- Components: PascalCase (e.g. `DashboardLayout.tsx`)
- Functions/hooks: camelCase (e.g. `getInstituteTheme()`)
- API routes: kebab-case directories (e.g. `/api/auth/login/`)
- Files: kebab-case for utilities, PascalCase for components

## Imports
- Use `@/` path alias for apps/web/src/
- Import db as `{ db }` from `@/lib/db`
- Import types from `@lms/types` (packages/types)
- Never import from node_modules paths directly for internal packages

## Components
- Use reusable components before creating duplicates
- New shared UI components go in packages/ui (Tailwind + Lucide React)
- Web-specific components stay in apps/web/src/components/
- Use Lucide React for icons exclusively

## Database
- Always run `npx prisma generate` after schema changes
- Use `db.$transaction()` for multi-model updates
- Import db singleton from `@/lib/db`
- Schema lives at repo root: prisma/schema.prisma

## Auth & Security
- Protected routes check session via getSession()
- API routes verify session independently (middleware excludes /api)
- Use RBAC checks from src/lib/rbac.ts
- Never expose .env contents or credentials

## Theming
- Never hardcode institute colors
- Use getInstituteTheme(instituteCode) for dynamic theming
- ICS=orange, IBE=gold/yellow, ITE=blue

## TypeScript
- Strict mode, no `any`
- Use TypeScript interfaces for Prisma models
- Zod for runtime validation

## Git
- Feature branches required
- .env and .env.local are gitignored
