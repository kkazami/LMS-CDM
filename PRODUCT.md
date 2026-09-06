# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
- **Students**: Enrolled in courses across institutes (ICS, IBE, ITE), viewing course streams, syllabus items, announcements, assignments, participating in interactive 3D simulations (CodeLab, PC building, IoT), submitting classwork, flashcard reviews, study sessions, and tracking grades.
- **Instructors / Professors**: Creating and managing courses, syllabus items, announcements, assignments, student groups, grading submissions, and broadcasting notifications.
- **Admins**: Managing institute-wide configurations, users, courses, roles, permissions, and monitoring audit logs.

## Product Purpose
A multi-tenant, institute-aware Learning Management System (LMS) designed for rich interactive learning, streamlined course and classwork management, real-time academic communication, and specialized institute tooling (including 3D hardware labs, gamification, and automated code grading).

## Positioning
An institute-differentiated learning platform that couples robust academic LMS workflows (grading policies, syllabus structure, assignments, submissions, announcements) with immersive interactive simulations and dynamic institute-specific theming (ICS orange, IBE gold, ITE blue).

## Operating Context
- Monorepo containing Next.js App Router web app (`apps/web`), mobile client (`apps/mobile`), and desktop client (`apps/desktop`).
- Dynamic institute routing under `/(dashboard)/[institute]/` with route protection, session cookies (`lumina_session`), and RBAC enforcement.
- PostgreSQL database managed with Prisma ORM.

## Capabilities and Constraints
- **Multi-tenancy & Theming**: Dynamic route-based theming resolved via `getInstituteTheme` for each institute (`ics`, `ibe`, `ite`).
- **RBAC**: Strict role enforcement (`STUDENT`, `PROFESSOR`/`INSTRUCTOR`, `ADMIN`) via `middleware.ts` and route-level authorization guards.
- **Database & Typing**: Strict TypeScript interfaces derived from Prisma models; transaction blocks for multi-model updates.
- **Atomic UI**: Shared UI components in `packages/ui` following the atomic component pattern with Tailwind CSS and Lucide React.
- **Interactive Labs**: 3D interactive hardware simulations, flashcard decks with spaced repetition, and CodeLab auto-grading engines.

## Brand Commitments
- Dynamic institute identity palettes:
  - **ICS**: High-energy orange palette
  - **IBE**: Business/executive gold & amber palette
  - **ITE**: Modern technology blue palette
- Clean, responsive dashboard layout with atomic component reuse.

## Evidence on Hand
- Complete Prisma schema covering institutes, users, courses, syllabus, submissions, interactive activities, and gamification in `prisma/schema.prisma`.
- Working Next.js dashboard shell, auth flow, and institute theming in `apps/web`.
- Shared monorepo packages (`packages/ui`, `packages/types`, `packages/config`, `packages/utils`, `packages/api-client`).

## Product Principles
- **Institute Identity First**: The interface dynamically adapts to the user's institute context while keeping underlying architecture unified.
- **Role-Appropriate Workflows**: Clean, purposeful interfaces tailored specifically to Students, Professors, and Administrators.
- **Interactive & Immersive Learning**: Enhance coursework with interactive 3D simulations, flashcards, and gamified progress tracking.
- **Atomic & Consistent UI**: Strict component isolation and reusable design primitives across all surfaces.
