# Multi-Agent Orchestra Sprint Contract

## 1. Metadata
- **Sprint ID:** `SPRINT-COURSE-PARITY`
- **Feature Name:** Course View 1-to-1 Full-Stack Feature Transfer & Placeholder Elimination
- **Topology:** Planner (Spec Architect) -> Generator (Fullstack Monorepo Engineer) <-> Evaluator (Harsh QA Critic)
- **Target Screens:** `apps/mobile/app/(tabs)/[institute]/courses/[courseId].tsx` & `apps/web/src/app/api/courses/[courseId]/...`
- **Quality Gate:** Minimum 90/100 across the 4 pillars (Design Quality, Originality, Craft, Functionality).

---

## 2. Testable Acceptance Criteria

### Backend & API Routes
- [x] **Criterion 1 (Course Stream API):** `GET /api/courses/[courseId]/stream` returns real announcements and broadcasts with author details. `POST /api/courses/[courseId]/stream` permits creating class announcements.
- [x] **Criterion 2 (Classwork Syllabus API):** `GET /api/courses/[courseId]/classwork` returns structured syllabus items grouped into categories (`ASSIGNMENT`, `QUIZ`, `MATERIAL`), with attachment metadata and student submission status.
- [x] **Criterion 3 (Course People API):** `GET /api/courses/[courseId]/people` returns course instructor info and approved enrolled classmates list.
- [x] **Criterion 4 (Student Grades API):** `GET /api/courses/[courseId]/grades` computes course average percentage, letter grade, and returns itemized score history with teacher feedback comments.
- [x] **Criterion 5 (Submissions API):** `POST /api/courses/[courseId]/submissions` supports toggling submission status (`SUBMITTED` / `DRAFT`) with attachment URLs.
- [x] **Criterion 6 (Type-Safe SDK):** `packages/api-client/src/index.ts` exports `getStream`, `postStream`, `getClasswork`, `getPeople`, `getGrades`, and `submitAssignment`.

### Native Mobile UI Re-Architecture
- [x] **Criterion 7 (Hero LinearGradient):** Header renders institute gradient (`theme.colors.sidebar` to `theme.colors.primary`), code pill, section badge, instructor avatar, and room tag.
- [x] **Criterion 8 (4 Segmented Tabs):** Tab bar seamlessly toggles between `Stream`, `Classwork`, `People`, and `Grades`.
- [x] **Criterion 9 (Interactive Stream):** Real announcement feed with author avatars, date chips, and discussion comment box with optimistic update.
- [x] **Criterion 10 (Interactive Classwork Accordion):** Collapsible module cards with relative urgency badges (Overdue, Due Today, Due Soon) and interactive submission modal.
- [x] **Criterion 11 (Classmates Directory):** Instructor card with email action and student list with enrollment count badge.
- [x] **Criterion 12 (Grade Standing Breakdown):** Overall score percentage, letter grade, completion counters, and score cards.

### Strict Non-Negotiables
- [x] **Criterion 13 (Zero Placeholders):** Absolute ban on `"will be displayed here"`, `"coming soon"`, `"dummy"`, `"placeholder"`, or incomplete stubs.
- [x] **Criterion 14 (Touch Ergonomics & Safety):** All interactive elements maintain `min-h-[44px]` touch targets. Inputs maintain 16px font size on mobile.
