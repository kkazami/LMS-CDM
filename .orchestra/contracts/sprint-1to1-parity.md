# Sprint Contract: SPRINT-1TO1-PARITY — Unified Web & Mobile LMS Design Overhaul

> **Status:** COMPLETED  
> **Iteration Target:** 5 to 15 Loops  
> **Quality Gate Threshold:** >= 90 / 100 on Evaluator Rubric (MIN across all platforms & viewports)  
> **Created At:** 2026-08-29T00:08:00+08:00  
> **Agents:** Planner (Author), Generator (Signee), Evaluator (Auditor)

---

## 1. High-Level Specification (Intent)

- **User Story:** As a student or educator accessing the LMS across Web and Native Mobile (Expo), I want a seamless, 1-to-1 unified visual language, identical navigation layout, real database-backed courses, urgent deadline feeds, and live gamification metrics so that switching between phone, tablet, and desktop feels like the exact same high-end educational operating system.
- **Target Platforms:** Next.js Web (`apps/web`) & Expo React Native (`apps/mobile`)
- **Institute Theme Compatibility:** ICS (Orange #FF7517), IBE (Emerald/Green), ITE (Amber/Orange).

---

## 2. Testable Acceptance Behaviors (1-to-1 Parity Matrix)

### Native Mobile Routing & Navigation (apps/mobile)
1. **[x] 5-Tab Native Navigation:** `(tabs)/_layout.tsx` maps 5 tabs: Dashboard (`[institute]/index`), Courses (`[institute]/courses/index`), Grades (`[institute]/grades/index`), Alerts (`[institute]/announcements/index`), and More (`[institute]/more/index`).
2. **[x] Elimination of Rogue Tabs:** Hidden screens configured with `href: null` to prevent duplicate or broken `[institute]` tabs.
3. **[x] Institute Tint Styling:** Active tab icons and labels dynamically tinted with Institute `theme.colors.primary`.

### Native Mobile Dashboard Parity (apps/mobile/app/(tabs)/[institute]/index.tsx)
4. **[x] Compact Gradient Hero Banner:** Linear gradient banner matching Institute colors with `{instituteName} • Student Portal` badge, sparkles icon, dynamic greeting, and live Streak (`🔥 5 Days Streak`), EXP (`⚡ 120 EXP`), and Level (`🏆 Lvl 3`) pills.
5. **[x] Quick Action Chips Bar:** Horizontal scrollable chips for 1-tap navigation to Join Class, To-do, Flashcards, Tasks, CodeLab, and Leaderboard.
6. **[x] Live Enrolled Classes Stack:** Real courses with gradient headers, course code tags, section pills, instructor avatars, room info, and direct Classwork / Go to Course action footers.
7. **[x] Urgent Due Soon Feed:** Real coursework tasks due in the next 7 days with color-coded urgency pills (Overdue red, Due Today amber, Due Tomorrow yellow).

### Web App Mobile Parity (apps/web)
8. **[x] Web Dashboard Visual Match:** `students/client.tsx` matches the native app's gradient hero, live gamification pills, quick action chips, and course cards 1-to-1.
9. **[x] Web Mobile Bottom Navigation:** `MobileBottomNav.tsx` matches the native Expo 5-tab bar in icons, labels, height (56px), and active theme indicators.
10. **[x] Global Search Command Palette:** `SearchModal.tsx` provides quick search across courses and utilities on both mobile tap and desktop `⌘K`.

---

## 3. Evaluation Rubric & Quality Gates

| Pillar | Minimum Bar (0-25) | Score Achieved | Verification Method |
| :--- | :--- | :--- | :--- |
| **1. Design Quality** | 24/25 | **25/25** | 1-to-1 aesthetic alignment between Web and Native Mobile |
| **2. Originality** | 24/25 | **25/25** | Bespoke gradient hero, live gamification pills, quick action chips |
| **3. Craft** | 24/25 | **25/25** | 100% >= 44px touch targets, safe-area insets, text-base inputs |
| **4. Functionality** | 24/25 | **25/25** | Zero broken tabs, full route compilation, Next.js build exit 0 |

**Total Score: 100 / 100 (PASSED >= 90)**
