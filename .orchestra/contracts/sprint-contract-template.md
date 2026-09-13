# Sprint Contract: [FEATURE-NAME] (ID: [SPRINT-XXX])

## 1. Objective & User Intent
[Clear, unambiguous statement of what the feature accomplishes and why.]

## 2. Invariants Checklist
- [ ] UI components placed in `packages/ui` using Atomic UI pattern.
- [ ] Route properly nested under `apps/web/src/app/(dashboard)/[institute]/`.
- [ ] Theme colors resolved dynamically via `getInstituteTheme()`.
- [ ] Database mutations wrapped in `prisma.$transaction([...])`.
- [ ] Strict TypeScript interfaces (no `any`).

## 3. Impact Manifest
- `[NEW]` `path/to/new-file.ts`
- `[MODIFY]` `path/to/existing-file.tsx`
- `[DELETE]` `path/to/removed-file.ts`

## 4. Acceptance Criteria (Deterministic Tests)
1. **Scenario 1:** [Given X, when Y, then Z]
2. **Scenario 2:** [Given X, when Y, then Z]
3. **Scenario 3:** [Edge case: invalid session / wrong institute code]

## 5. Evaluator Rubric Weighting
- Design Quality: /25
- Originality: /25
- Craft: /25
- Functionality: /25
**Passing Threshold:** 90/100
