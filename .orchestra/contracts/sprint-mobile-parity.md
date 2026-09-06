# Sprint Contract: SPRINT-MOBILE-PARITY — Full Visual & Functional Parity

> **Status:** COMPLETED  
> **Iteration Target:** 5 to 15 Loops  
> **Quality Gate Threshold:** >= 90 / 100 on Evaluator Rubric (MIN across all viewports)  
> **Created At:** 2026-08-28T23:35:00+08:00  
> **Agents:** Planner (Author), Generator (Signee), Evaluator (Auditor)

---

## 1. High-Level Specification (Intent)

- **User Story:** As a student or teacher using a mobile device (320px–430px), I want the LMS interface to look and feel just as rich, immersive, and capable as the desktop version — with the same gradient depth hero, live gamification pills, quick action shortcuts, full-fidelity course cards, and urgent deadline feeds — so that the mobile web feels like a first-class native LMS rather than a stripped-down wireframe.
- **Target Route(s):** `apps/web/src/app/(dashboard)/[institute]/*` (Dashboard, Courses, Assignments, Navigation Shell)
- **Institute Theme Compatibility:** ICS (Orange #FF7517), IBE (Emerald/Green), ITE (Amber/Orange).

---

## 2. Testable Acceptance Behaviors (18 Acceptance Criteria)

### Global Header & Navigation Shell
1. **[x] Mobile Institute Branding in Topbar:** On mobile viewports (< 768px), topbar displays a bold institute badge (ICS, IBE, ITE) and the active route title rather than hiding branding.
2. **[x] Mobile Search Button:** Dedicated search button (`min-h-[44px] min-w-[44px]`) on mobile triggers the `SearchModal`.
3. **[x] Global Command Palette SearchModal:** Opens on mobile button tap or desktop `Cmd+K`/`Ctrl+K`. Features 16px text input, quick navigation items, dynamic course filtering, and safe-area padding.
4. **[x] Mobile Bottom Navigation:** 5-tab fixed bottom bar with active indicator dynamically themed with institute `primary` color and `env(safe-area-inset-bottom)` padding.
5. **[x] Sidebar Drawer:** Mobile hamburger drawer opens smoothly with backdrop dismiss and explicit close button.

### Student Dashboard (/students)
6. **[x] Compact Gradient Hero Banner:** Features institute portal pill (`{name} • Student Portal`), sparkles icon, dynamic personalized greeting (`Welcome back, {name}! 👋`), and subtext.
7. **[x] Gamification Live Pills:** Streak counter (`🔥 {streak} Days Streak`), EXP points (`⚡ {exp} EXP`), and Level badge (`🏆 Lvl {level}`) embedded directly in the hero banner on all viewports.
8. **[x] Multi-Layered Radial Blur Depth:** Radial background blur overlays preserved on mobile for visual depth.
9. **[x] Mobile Quick Action Bar:** Horizontal-scrolling chip bar below the banner for 1-tap access to Join Class, To-do, Flashcards, Tasks, CodeLab, and Leaderboards.
10. **[x] Full-Fidelity Course Cards:** 1-column mobile stack preserving cover image headers, course code chips, section badges, instructor avatars, room info, 3-dots action menu, and "Classwork" / "Go to Course" footers.
11. **[x] Due Soon Deadlines Feed:** Urgent mobile deadline list with status pills (Overdue rose, Due Today amber, Due Tomorrow yellow, Upcoming slate).
12. **[x] Drag & Drop Reordering:** Mobile-friendly course card reordering with automatic persistent server sync.

### Assignments Route (/assignments)
13. **[x] 1-Tap Class Filter Chips:** Horizontal scrolling class pills in addition to the `<select>` dropdown for rapid 1-tap course filtering on phones.
14. **[x] Touch-Safe Row Heights:** All assignment item links maintain `>= 48px` touch target heights with subtle tactile press animations.
15. **[x] Accordion Headers:** Collapsible section headers maintain `>= 48px` tap targets.
16. **[x] Empty State Centering:** `min-h-[50vh]` centered empty state with theme-colored success illustrations.

### Responsive Quality & Build Floor
17. **[x] Zero Horizontal Overflow:** No horizontal scrollbar blowout across all viewports (320px, 360px, 375px, 393px, 430px, 768px, 1440px).
18. **[x] Production Build Verification:** TypeScript compiler and Next.js Turbopack production build pass with 0 errors.

---

## 3. Evaluation Rubric & Quality Gates

| Pillar | Minimum Bar (0-25) | Score Achieved | Verification Method |
| :--- | :--- | :--- | :--- |
| **1. Design Quality** | 24/25 | **25/25** | Visual parity audit across 360px, 390px, 768px, 1440px |
| **2. Originality** | 24/25 | **25/25** | Bespoke gradient banner, gamification pills, quick action chips |
| **3. Craft** | 24/25 | **25/25** | 100% >= 44px touch targets, safe-area insets, text-base inputs |
| **4. Functionality** | 24/25 | **25/25** | Next.js build exit 0, search modal navigation, course routing |

**Total Score: 100 / 100 (PASSED >= 90)**
