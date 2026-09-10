# Multi-Agent Orchestra Long-Term Memory Ledger

This file persists memory across sessions, subagent lifecycles, and iterative development sprints. Every agent in the orchestra reads this file before starting and appends key takeaways after every sprint.

---

## 1. Project & Architectural Invariants (LMS Monorepo)

- **UI Components:** New UI components MUST go into `packages/ui` following Atomic UI principles.
  - Base components in `packages/ui/src/components/`: `Button`, `Card`, `Input`, `Modal`, `Table`, `Badge`, `MobileBottomNav`.
  - Iconography: Always use `lucide-react` (or `lucide-react-native` for Expo).
  - Sizing: All interactive elements MUST maintain `min-h-[44px]` touch targets.
  - Inputs: Text inputs must use `text-base` (16px) on mobile viewports to prevent iOS auto-zoom on focus.
- **Routing & Theming:**
  - Dashboard routes must be nested under `apps/web/src/app/(dashboard)/[institute]/`.
  - Theme colors must dynamically resolve via `getInstituteTheme(institute)` (supporting ICS, IBE, ITE).
  - Mobile bottom navigation (5-tab: Dashboard, Courses, Grades, Alerts, More) renders on `< lg` viewports with role-based links.
- **1-to-1 Web & Mobile Unified Design:**
  - Zero wireframes or stripped dummy cards on mobile. Hero gradient banners, gamification pills (Streak, EXP, Level), cover image cards, quick action chips, and deadline feeds must match 1-to-1 between Web and Expo Native Mobile.
  - In Expo Router, all non-tab nested screens in `(tabs)/[institute]/_layout.tsx` must have `options={{ href: null }}` to avoid rogue tab buttons.
  - Mobile Course Detail (`[courseId].tsx`) features 4 interactive tabs (Stream, Classwork, People, Grades) backed by Prisma endpoints.
- **Database & Prisma:**
  - Strict TypeScript interfaces for Prisma models (No `any`).
  - Multi-model updates MUST execute inside `prisma.$transaction([...])` blocks.
  - Always run `npx prisma generate --schema=../../prisma/schema.prisma` after schema edits.
- **Security & RBAC:**
  - Protected routes must enforce `middleware.ts` and `rbac.ts`.
  - Strict differentiation between `STUDENT`, `TEACHER`, and `ADMIN` roles.
- **PWA & Offline Resilience:**
  - Service Worker (`public/sw.js`) with stale-while-revalidate caching and offline fallback (`public/offline.html`).
  - Web App Manifest (`public/manifest.json`) for standalone mobile web installation.
  - Resilient API fetcher (`lib/fetcher.ts`) with exponential backoff (3 retries) and 10s abort timeouts.

---

## 2. QA Evaluator Quality Floor (The 4 Pillars)

1. **Design Quality (Weight: 25%):**
   - Must feel like a coherent, unified high-end educational operating system across Web and Native Mobile.
   - Shared color gradients, depth overlays, and typography scales.
2. **Originality (Weight: 25%):**
   - Reject generic templates. Bespoke horizontal quick action chips, command palette search, and card transformations.
3. **Craft (Weight: 25%):**
   - Typography: Proportional line-heights, wide editorial headings, tabular nums for numbers/grades.
   - Touch Targets: Min 44x44px. Zero exceptions.
   - Safe Areas: `env(safe-area-inset-bottom)` and `SafeAreaView` applied across all screens.
   - Contrast: Fully accessible WCAG AA compliance in both dark and light modes.
4. **Functionality (Weight: 25%):**
   - Zero guessing for the user. Explicit loading skeletons, empty states, and validation feedback.
   - 1-to-1 sync with real backend database models.

---

## 3. Accumulated Sprint History & Lessons Learned

| Sprint ID | Goal / Feature | Iterations | Final Score | Key Post-Mortem & Fix Applied |
| :--- | :--- | :--- | :--- | :--- |
| `INIT` | Orchestra Setup | 1 | 100/100 | Initialized file-based multi-agent orchestration architecture. |
| `SPRINT-MOBILE-001` | Mobile-First Responsive Overhaul | 2 | 98/100 | Built 7 mobile-first Atomic UI components in `packages/ui`, added `MobileBottomNav`, added safe-area insets, configured `tsconfig.json` JSX paths. |
| `SPRINT-MOBILE-PARITY` | Full Web-to-Mobile Visual & Functional Parity | 3 | 100/100 | Brought full visual parity to mobile web: Compact gradient hero with live EXP/Streak/Level pills, horizontal quick action chips, full-fidelity course cards, SearchModal command palette. |
| `SPRINT-1TO1-PARITY` | Unified Web & Mobile LMS Design Overhaul | 4 | 100/100 | Unified Web and Native Expo mobile app 1-to-1: Eliminated rogue tabs in Expo Router, replaced all dummy cards with real live database-backed course stacks, synced 5-tab bottom navigation (Dashboard, Courses, Grades, Alerts, More). |
| `SPRINT-FULL-MOBILE-TRANSFORMATION` | System-Wide Mobile & PWA Full-Stack Overhaul | 5 | 100/100 | Completed full-stack mobile conversion: Built PWA manifest & Service Worker offline mode, enforced 44px touch targets & 16px iOS auto-zoom defense, added paginated/cached API endpoints (`/api/courses`, `/api/announcements`, `/api/assignments`, `/api/leaderboard`), push notification subscription infrastructure, resilient retry fetcher, and image compression pipeline. |
| `SPRINT-COURSE-PARITY` | Course View 1-to-1 Feature Transfer & Placeholder Elimination | 6 | 100/100 | Rebuilt Native Mobile Course Detail screen (`[courseId].tsx`) with 4 interactive tabs (Stream, Classwork, People, Grades), LinearGradient header banner, interactive submission modal, and built 5 dedicated backend API endpoints (`/api/courses/[courseId]/{stream,classwork,people,grades,submissions}`) backed by Prisma. |
| `SPRINT-MOBILE-V2` | 100/100 Deployment-Ready Full-Stack Native Mobile & Gamification App | 7 | 100/100 | Completed end-to-end mobile architecture: strictly typed API client (zero \`any\`), full Dark/Light multi-institute theming, NetInfo offline status banner, shimmer skeleton loaders, 48dp touch targets, complete 4-tab course workspace with teacher classwork creation & submission turn-in, full feature screens (Flashcards 3D flip, Personal Workspace with Notes/Kanban Tasks/Calendar, Achievements with 5 categories, Learning Materials downloads, Profile with live stats, Settings), background study heartbeat timer, daily login reward modal, and backend \`POST /api/auth/refresh\` & \`POST /api/notifications/push-token\` endpoints. Verified with 100% clean TypeScript build across monorepo. |
| `SPRINT-DESKTOP-ADMIN` | Initialize Electron Desktop App — Admin-Only Portal | 8 | 100/100 | Configured Electron desktop shell as an Administrator-Only console: exposed `isDesktopAdmin` and typed IPC bridges (`exportFile`, `printPdf`, `notify`, `getAppInfo`), configured persistent session partition (`persist:lumina-admin`) with admin entry point (`/login?institute=ics&desktop=admin`), navigation guard to prevent external URLs from hijacking shell, did-navigate redirect guard to keep admins on admin routes, admin-only login gate that immediately logs out non-admins, admin-only sidebar navigation (Dashboard, Course Management, Account Management, Permissions, Audit Logs, Backup & Recovery, Security Tools, Settings, Help), native admin menu bar with keyboard shortcuts (CmdOrCtrl+1 to 7, print-to-pdf, sign out), rebranded splash screen and connection error fallback page with server status check. |

---



## 4. Known Edge Cases & Common Pitfalls to Avoid

- *Avoid:* iOS Safari auto-zoom on focus. Always set input font-size to `text-base` (16px) on mobile viewports.
- *Avoid:* Rogue tabs in Expo Router. Structure `(tabs)/[institute]/_layout.tsx` with `<Tabs>` and mark child routes with `options={{ href: null }}`.
- *Avoid:* Static wireframe placeholders in mobile views. Build real segmented tab architectures backed by dedicated API routes.
- *Avoid:* Heavy unpaginated API feeds on mobile. Always enforce `page` and `limit` defaults (10–15 items) and selective Prisma queries.
- *Avoid:* Fixed `p-6` padding on cards. Use responsive `p-4 sm:p-5 lg:p-6` or `variant="flush"` on narrow mobile viewports.
- *Avoid:* Unhandled idle PG pool disconnections. Always attach `pool.on("error", ...)` when using serverless connection poolers.
