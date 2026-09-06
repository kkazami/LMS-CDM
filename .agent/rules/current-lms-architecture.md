---
trigger: model_decision
description: current lms architecture
---

# Current LMS Project Structure and Architecture

This reflects the **current intended project architecture** based on the work completed so far in the monorepo.

## High-level architecture

- `apps/web` — main Next.js App Router application
  - primary UI
  - route handlers / API
  - auth UI
  - dashboard UI
  - institute-aware theming
- `apps/mobile` — Expo React Native app
- `apps/desktop` — Electron wrapper / desktop app
- `apps/api` — optional future dedicated backend if the web app API grows too large
- `packages/*` — shared code across apps
- `prisma` — shared database schema and migrations
- `docs` — architecture, ERD, API, deployment docs

## Current monorepo tree

```text
lms-monorepo-skeleton/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (public)/
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── register/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   └── [institute]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── assignments/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── grades/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── api/
│   │   │   │   │   ├── institutes/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── login/
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       ├── register/
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       ├── logout/
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       └── me/
│   │   │   │   │           └── route.ts
│   │   │   │   ├── globals.css
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   └── Table.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   └── RegisterForm.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── DashboardLayout.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       └── Topbar.tsx
│   │   │   ├── features/
│   │   │   │   └── (shared LMS feature modules go here later)
│   │   │   ├── institutes/
│   │   │   │   ├── ics/
│   │   │   │   │   └── theme.ts
│   │   │   │   ├── ibe/
│   │   │   │   │   └── theme.ts
│   │   │   │   └── ite/
│   │   │   │       └── theme.ts
│   │   │   └── lib/
│   │   │       ├── auth-guards.ts
│   │   │       ├── auth-schema.ts
│   │   │       ├── auth-session.ts
│   │   │       ├── db.ts
│   │   │       ├── get-institute-theme.ts
│   │   │       ├── rbac.ts
│   │   │       ├── theme.ts
│   │   │       └── utils.ts
│   │   ├── postcss.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mobile/
│   │   ├── app/
│   │   ├── src/
│   │   ├── assets/
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── desktop/
│   │   ├── electron/
│   │   ├── renderer/
│   │   ├── assets/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   ├── utils/
│   ├── api-client/
│   └── eslint-config/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docs/
│   ├── architecture/
│   ├── erd/
│   ├── api/
│   ├── institute-features/
│   └── deployment/
│
├── scripts/
├── .env
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Current web app architecture

### `src/app`
This is the main Next.js App Router area.

- `(public)` — public pages like login and register
- `(dashboard)` — authenticated LMS dashboard routes
- `api` — route handlers acting as the current backend

### `src/components`
Reusable UI building blocks.

- `common` — generic components like Button, Card, Input
- `forms` — auth and LMS forms
- `layout` — sidebar, topbar, dashboard shell

### `src/lib`
App-level helper logic.

- `db.ts` — Prisma singleton
- `auth-session.ts` — session creation and reading
- `auth-schema.ts` — zod validation
- `rbac.ts` — role and permission definitions
- `auth-guards.ts` — route-level permission helpers
- `theme.ts` + `get-institute-theme.ts` — institute-aware theming
- `utils.ts` — generic utilities like `cn()`

### `src/institutes`
Institute-specific configuration.

- `ics/theme.ts`
- `ibe/theme.ts`
- `ite/theme.ts`

Shared components stay shared. Institute customization stays here.

## Current auth/session flow

### Register
- user submits `RegisterForm`
- POST to `/api/auth/register`
- backend validates with zod
- password gets hashed
- user saved with institute + default role

### Login
- user submits `LoginForm`
- POST to `/api/auth/login`
- backend validates
- password checked with bcrypt
- signed session cookie is created

### Session
- cookie name: `lumina_session`
- stored as secure httpOnly cookie
- read through `auth-session.ts`

### Route protection
- `middleware.ts` protects `/ics`, `/ibe`, `/ite`
- unauthenticated users are redirected to `/login?institute=<code>`
- users cannot access another institute's route

## Current RBAC model

Current roles:

- `admin`
- `teacher`
- `student`

Current helpers:

- `hasPermission(role, permission)`
- `requireSession()`
- `requireInstituteAccess(instituteCode)`
- `requirePermission(instituteCode, permission)`

## Current theming model

Institute-aware theme is resolved dynamically from route code.

- `ics` → orange palette
- `ibe` → yellow/gold palette
- `ite` → blue palette

Current theme flow:

1. route param `[institute]`
2. `getInstituteTheme(institute)`
3. theme passed into:
   - `DashboardLayout`
   - `Topbar`
   - `Sidebar`
   - shared themed components like `Button`, `Badge`, `Input`

## Current test URLs

```text
/login?institute=ics
/register?institute=ics
/ics

/login?institute=ibe
/register?institute=ibe
/ibe

/login?institute=ite
/register?institute=ite
/ite
```

## Current development status

### Already implemented
- monorepo base structure
- Prisma setup
- institute API
- shared UI components
- dashboard layout shell
- institute-aware theming
- login/register UI
- auth API routes
- secure session cookie
- institute-aware middleware protection
- basic RBAC helpers

### Still to build next
- role-protected CRUD modules
- real dashboard data from DB
- courses, announcements, assignments, grades, attendance modules
- logout UI polish
- mobile + desktop integration with the live backend
- institute-specific unique features
- full theme/provider refactor later if desired
- optional future dedicated `apps/api` extraction

## Recommended next prompt

```text
Proceed with the next phase by implementing role-protected LMS modules for courses, announcements, assignments, grades, and attendance using the current Prisma, session, middleware, and RBAC setup. Give exact file paths and full code for each file.
```
