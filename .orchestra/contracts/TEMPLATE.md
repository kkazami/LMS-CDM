# Sprint Contract: [SPRINT_ID] — [FEATURE_NAME]

> **Status:** [DRAFT | NEGOTIATING | APPROVED | COMPLETED]  
> **Iteration Target:** 5 to 15 Loops  
> **Quality Gate Threshold:** >= 90 / 100 on Evaluator Rubric  
> **Created At:** [TIMESTAMP]  
> **Agents:** Planner (Author), Generator (Signee), Evaluator (Auditor)

---

## 1. High-Level Specification (Intent)

- **User Story:** As a `[STUDENT | TEACHER | ADMIN]`, I want to `[GOAL]`, so that `[BENEFIT]`.
- **Target Route(s):** `/apps/web/src/app/(dashboard)/[institute]/[PATH]`
- **Institute Theme Compatibility:** ICS (Cyan/Blue), IBE (Emerald/Green), ITE (Amber/Orange).

---

## 2. Testable Acceptance Behaviors (Generator <-> Evaluator Agreement)

*These are concrete, measurable conditions. Evaluator grades against THIS list, not vague specifications.*

1. **[ ] Behavior 1 (DOM & State):** [e.g., When the user navigates to the route, an initial skeleton loader displays while fetching data from `/api/...`.]
2. **[ ] Behavior 2 (Interaction):** [e.g., Clicking 'Submit Assignment' opens an Atomic UI Modal with file dropzone and validation.]
3. **[ ] Behavior 3 (Error Handling):** [e.g., If the payload fails validation, precise inline error messages display below the invalid input.]
4. **[ ] Behavior 4 (RBAC Gate):** [e.g., If a STUDENT tries to access teacher grading actions, the controls are not rendered or redirect with 403.]
5. **[ ] Behavior 5 (Multi-Model Transaction):** [e.g., Submission creation and audit notification log occur inside a single Prisma transaction.]

---

## 3. Evaluation Rubric & Quality Gates

| Pillar | Focus Area | Minimum Bar (0-25) | Evaluator Check Method |
| :--- | :--- | :--- | :--- |
| **1. Design Quality** | Visual hierarchy, spacing scale, institute brand harmony | 22/25 | Visual snapshot & theme token inspection |
| **2. Originality** | Non-generic components, bespoke micro-interactions | 22/25 | Layout audit vs default Tailwind templates |
| **3. Craft** | Typography, contrast, zero layout shifts, focus rings | 23/25 | Playwright accessibility tree & computed styles |
| **4. Functionality** | Zero guesswork, resilient forms, empty states | 23/25 | Playwright end-to-end interactive test run |

---

## 4. Negotiation & Sign-Off Log

- **Planner:** High-level user story and testable behaviors proposed.
- **Generator Response:** [Confirmed feasible within monorepo architecture. Requested clarification on X.]
- **Evaluator Response:** [Demanded addition of empty state criterion and WCAG AA contrast check on badge tokens.]
- **Consensus Reached:** [YES / NO] (Code generation begins ONLY when YES).
