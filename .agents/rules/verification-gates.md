---
trigger: model_decision
description: Defines strict completion gates for the AI Software Engineering Harness — NO FRESH EVIDENCE = NO PASS
---
The completion gate rules:

A run may enter PASSED only when ALL of:
- Every required acceptance criterion has a verification mapping (type + tests[])
- Every mandatory check ran during the current run
- Every mandatory check returned success (exit code 0)
- Playwright E2E passed when requiresBrowserVerification is true
- typecheck/build passed
- Security checks passed (if Strict+ quality level)
- Code review checks passed (if Strict+ quality level)
- All required evidence artifacts exist in .orchestra/runs/<run-id>/
- No blocking findings remain

The Executor may propose completion. The harness decides completion.

Every acceptance criterion must support:
```json
{
  "id": "AC-001",
  "description": "...",
  "verification": {
    "type": "playwright" | "command" | "manual",
    "tests": ["tests/e2e/..."],
    "assertions": ["..."]
  }
}
```

QA must trace: Acceptance Criterion → Test → Actual Result → Evidence

Tests must verify user behavior, not implementation details.
Preferred selector order: getByRole > getByLabel > getByText > getByPlaceholder > getByTestId > CSS/XPath
