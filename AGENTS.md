# AI Agent Instructions for LMS Monorepo

Welcome, AI Agents! When working in this codebase, please adhere to the following strict architectural and stylistic guidelines.

## 1. UI Components (Atomic UI)
- New UI components MUST go into `packages/ui` (or `apps/web/src/components` depending on scope, but follow atomic principles).
- Use **Tailwind CSS** and **Lucide React** for styling and icons.
- Follow the existing `Button` component pattern.

## 2. Database and Prisma
- ALWAYS run `npx prisma generate` after modifying `prisma/schema.prisma`.
- Use **transaction blocks** for multi-model updates (e.g., enrolling a student in a course).
- Reference the existing database schema in `prisma/schema.prisma` using strict TypeScript interfaces. Do not use `any`.

## 3. Routing and Theming
- ALL dashboard routes must be nested under `(dashboard)/[institute]/`.
- Use the `getInstituteTheme` helper to dynamically resolve styles based on the current institute in the route parameter.

## 4. Security
- Gated routes MUST be protected. Ensure you use existing middleware protection (`middleware.ts`).
- Always implement **Role-Based Access Control (RBAC)** checks for differentiating Student vs. Teacher vs. Admin views. 

## Architecture Reference

Review `.agents/rules/current-lms-architecture.md` for a complete breakdown of the monorepo design, Next.js routing patterns, authentication flow, and theming mechanisms.
