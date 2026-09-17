# Sprint Contract: SPRINT-RESP-001 — Landing Page Top Bar & Global Viewport Responsiveness

> **Status:** APPROVED  
> **Iteration Target:** 5 to 15 Loops  
> **Quality Gate Threshold:** >= 90 / 100 on Evaluator Rubric  
> **Created At:** 2026-09-17T22:50:00+08:00  
> **Agents:** Planner (Author), Generator (Signee), Evaluator (Auditor)

---

## 1. High-Level Specification (Intent)

- **User Story:** As any user visiting the CdM LMS landing page on mobile phones (320px, 360px, 375px, 390px, 414px), tablets (768px, 800px, 820px, 1024px), or desktops (1280px+), I want the top navigation bar and all page sections to be completely responsive with zero horizontal overflow, zero element cutoffs, and seamless access to navigation links and Sign In actions.
- **Target Route:** `apps/web/src/app/page.tsx`
- **Scope:**
  1. Fix mobile cutoffs: Burger button, Sign In pill, brand logo/text across 320px - 480px.
  2. Fix tablet cutoffs: Sign In button and nav links across 768px - 1024px.
  3. Ensure page-level `overflow-x: hidden` / zero horizontal document scroll so fixed bars are never displaced or clipped.
  4. Both unscrolled and scrolled floating capsule states must fit within viewport with comfortable safe padding on all devices.

---

## 2. Testable Acceptance Behaviors

1. **[ ] Behavior 1 (Mobile Small 320px - 360px):**
   - On 320px (iPhone SE 1) and 360px (Galaxy S8/A-series), the brand logo, title, Sign In button, and Hamburger button must all have bounding box `right <= viewportWidth - 8px` and `left >= 8px`.
   - Burger button must be fully visible and clickable without horizontal scrolling.
2. **[ ] Behavior 2 (Mobile Standard 375px - 414px):**
   - On 375px (iPhone SE 2/3), 390px (iPhone 12/13/14/15), and 414px (iPhone Plus/Max), the top bar displays cleanly with balanced margins.
   - Mobile menu drawer opens and fits within viewport margins with all section links and CTA buttons visible.
3. **[ ] Behavior 3 (Tablet 768px - 1024px):**
   - On 768px (iPad portrait), 800px, 820px (iPad Air), and 1024px:
   - The breakpoint for full desktop links must be calibrated to `lg:` (1024px) instead of `md:` (768px), or compact tablet navigation applied so that "Sign In" is NEVER clipped or wrapped.
   - At 768px-1023px, navigation adapts gracefully without overflowing or pushing Sign In off-screen.
4. **[ ] Behavior 4 (Desktop 1280px+):**
   - Full desktop links ("Institutes", "Preview", "FAQs", "Mission & Vision", "About") + "Sign In" button are displayed with comfortable spacing and no crowding.
   - Scrolled floating capsule animates smoothly with backdrop blur and border.
5. **[ ] Behavior 5 (Zero Horizontal Overflow):**
   - `document.documentElement.scrollWidth === document.documentElement.clientWidth` across all viewports.
   - No section, video, particle canvas, or coverflow slider causes page horizontal scroll.

---

## 3. Evaluation Rubric & Quality Gates

| Pillar | Focus Area | Minimum Bar (0-25) | Evaluator Check Method |
| :--- | :--- | :--- | :--- |
| **1. Design Quality** | Spacing balance, typography scale across breakpoints | 23/25 | Playwright viewport screenshots (320, 360, 375, 768, 820, 1024, 1280) |
| **2. Originality** | Fluid responsive adaptation, refined micro-animations | 22/25 | Evaluator audit of floating capsule transitions |
| **3. Craft** | Bounding box math, touch targets (>=44px), focus rings | 24/25 | Playwright bounding box assertion script |
| **4. Functionality** | Zero cutoffs, responsive drawer opening, link scrolling | 24/25 | Automated Playwright test run across all devices |

---

## 4. Negotiation & Sign-Off Log

- **Planner:** Identified primary issues: (1) `md:` breakpoint (768px) displays ~515px of nav links + 194px of brand = 709px + padding, which overflows tablet viewports; (2) small mobile screens (< 375px) have fixed pixel paddings and year badge/gap combinations causing the hamburger button to overflow; (3) document horizontal scroll risk on mobile.
- **Generator:** Proposes: (1) Switch desktop links to `lg:flex` (1024px+), while 768px-1023px tablet uses responsive compact tablet navigation or clean mobile drawer; (2) In mobile header, refine padding to `px-2 sm:px-4`, compact brand gap, ensure `shrink-0` on controls and `min-w-0` on text with truncate if needed; (3) Ensure `overflow-x: clip / hidden` on the page container so viewport never scales out.
- **Evaluator:** Requires automated multi-viewport Playwright audit checking exact bounding box coordinates `box.x + box.width <= viewport.width` for every interactive control across 320px, 360px, 375px, 390px, 768px, 820px, 1024px, 1280px.
- **Consensus Reached:** YES. Sprint begins.
