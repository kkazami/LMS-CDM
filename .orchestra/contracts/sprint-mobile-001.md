# Sprint Contract: SPRINT-MOBILE-001 — Mobile-First Responsive Overhaul

> **Status:** APPROVED  
> **Iteration Target:** 5 to 15 Loops  
> **Quality Gate Threshold:** >= 90 / 100 on Evaluator Rubric (MIN across all viewports)  
> **Created At:** 2026-08-28T22:36:00+08:00  
> **Agents:** Planner (Author), Generator (Signee), Evaluator (Auditor)

---

## 1. High-Level Specification (Intent)

- **User Story:** As a STUDENT on a phone, I want the LMS web dashboard to feel like a native mobile app — with a bottom navigation bar, touch-friendly cards, and responsive layouts — so that I can complete assignments, check grades, and navigate my courses without pinching, zooming, or fighting tiny buttons.
- **Target Route(s):** `apps/web/src/app/(dashboard)/[institute]/*` (entire dashboard shell + assignments route)
- **Institute Theme Compatibility:** ICS (Orange #FF7517), IBE (Emerald/Green), ITE (Amber/Orange).

---

## 2. Testable Acceptance Behaviors (Generator <-> Evaluator Agreement)

### Layout & Navigation
1. **[x] Mobile Bottom Nav:** A 5-tab fixed bottom navigation bar appears on screens < 1024px. Tabs: Dashboard, Courses, Grades, Announcements, More. Active tab uses institute `primary` color. Safe-area-inset-bottom padding applied on notched devices.
2. **[x] Bottom Nav Hidden on Desktop:** Bottom nav is `hidden` on lg: (>= 1024px) screens where the sidebar is visible.
3. **[x] Sidebar Drawer Enhancement:** Mobile sidebar drawer (< 1024px) has an explicit close button in the header and touch backdrop dismiss.
4. **[x] Main Content Padding:** `<main>` content area has responsive padding (`px-4 py-4 lg:px-8 lg:py-8`) and extra bottom padding on mobile to clear the bottom nav (72px + safe-area).
5. **[x] Floating Widget Repositioning:** FloatingStudyTimer and ChatbotWidget reposition above the bottom nav on mobile (bottom offset = nav height + safe-area + 8px buffer).

### Atomic UI Components (packages/ui)
6. **[x] Button Touch Target:** All Button variants have `min-h-[44px]` on all screen sizes. `@media (pointer: coarse)` further enlarges padding.
7. **[x] Card Responsive Padding:** Card uses `p-4 sm:p-5 lg:p-6`. Supports `variant="flush"` for edge-to-edge mobile cards.
8. **[x] Input Touch Safety:** All Input fields have `min-h-[44px]`, `text-base` (16px) to prevent iOS auto-zoom. Password toggle icon has `min-w-[44px] min-h-[44px]` hit area.
9. **[x] Modal Bottom Sheet:** On screens < 640px, Modal renders as a bottom sheet (`rounded-t-2xl`, slides from bottom, `max-h-[85dvh]`). On >= 640px, centered modal.
10. **[x] Table Stacked Layout:** Below 768px, Table transforms to stacked card rows with `data-label` attributes. Above 768px, standard horizontal table.
11. **[x] Badge Responsive:** Badge uses `text-[11px] sm:text-xs` with appropriate padding.

### Assignments Route
12. **[x] Responsive Container:** Assignments page uses `w-full max-w-4xl mx-auto` with `px-0 sm:px-4` — no side gutters on mobile.
13. **[x] Mobile Assignment Cards:** On < 640px, assignment items render as full-width edge-to-edge cards with icon, title, course code, and right-aligned due badge. Min row height 44px.
14. **[x] Accordion Touch Targets:** Section header touch targets are >= 48px tall.
15. **[x] Responsive Skeleton:** loading.tsx skeleton cards match the responsive layout at each breakpoint (edge-to-edge on mobile, padded cards on desktop).

### Global Responsive Infrastructure
16. **[x] Viewport Meta:** `viewport-fit=cover` in root layout.
17. **[x] CSS Tokens:** `--space-page-x`, `--space-page-y`, `--touch-target-min`, `--radius-card` respond to breakpoints.
18. **[x] Safe Area CSS:** `env(safe-area-inset-*)` utilities applied to bottom nav and full-bleed elements.
19. **[x] No Horizontal Overflow:** Zero horizontal scroll on ANY page at ANY viewport from 320px to 2560px.
20. **[x] Pointer Media Queries:** `@media (pointer: coarse)` rules enlarge interactive element padding.

---

## 3. Evaluation Rubric & Quality Gates

| Pillar | Focus Area | Minimum Bar (0-25) | Evaluator Check Method |
| :--- | :--- | :--- | :--- |
| **1. Design Quality** | Coherent mobile feel, native-like bottom nav, spacing rhythm | 22/25 | Visual snapshot at 375px, 393px, 768px, 1920px |
| **2. Originality** | Edge-to-edge cards, chip filters, bottom sheet modals — not desktop shrunk | 22/25 | Layout audit: reject shrunken desktop patterns |
| **3. Craft** | Touch targets >= 44px, text-base inputs, safe-area, no h-scroll, focus rings | 23/25 | Playwright computed style inspection at all 9 viewports |
| **4. Functionality** | Bottom nav routes, drawer open/close, skeletons match layout, tables transform | 23/25 | Playwright interaction tests at mobile + desktop |

**Final Score = MINIMUM across all 9 viewports.** Not the average.

---

## 4. Negotiation & Sign-Off Log

- **Planner:** Drafted based on full responsive audit. All 20 acceptance behaviors defined.
- **Generator:** Confirmed feasible within current monorepo architecture.
- **Evaluator:** Quality floor accepted. Will test at all 9 viewport configurations.
- **Consensus Reached:** YES — Code generation begins.
