# Sprint Contract: [SPRINT_ID] — [FEATURE_NAME]

> **Status:** [DRAFT | NEGOTIATING | APPROVED | COMPLETED]  
> **Harness Profile:** [frontend | api | fullstack | ...]  
> **Quality Level:** [standard | strict | maximum]  
> **Browser Verification Required:** [YES | NO]  
> **Risk:** [low | medium | high]  
> **Created At:** [TIMESTAMP]  
> **Run ID:** [run_YYYYMMDD_NNN]

---

## 1. Task Classification

```json
{
  "intent": "feature",
  "domain": "frontend",
  "risk": "low",
  "requiresBrowserVerification": true,
  "harnessProfile": "frontend",
  "qualityLevel": "standard"
}
```

## 2. Requirements

| ID | Requirement |
|---|---|
| REQ-001 | [description] |
| REQ-002 | [description] |

## 3. Acceptance Criteria (with Verification Metadata)

```json
[
  {
    "id": "AC-001",
    "description": "[description]",
    "verification": {
      "type": "playwright",
      "tests": ["tests/e2e/[feature]/[test].spec.ts"],
      "assertions": ["[what the test checks]"]
    }
  }
]
```

## 4. Implementation Plan

### Implementation Tasks
1. [task]
2. [task]

### Verification Tasks
1. [mapped to AC-001]
2. [mapped to AC-002]

## 5. File Impact Manifest

| Action | File |
|---|---|
| [NEW] | [path] |
| [MODIFY] | [path] |
| [DELETE] | [path] |

## 6. Quality Gates

| Check | Required | Status |
|---|---|---|
| TypeScript typecheck | YES | ○ |
| Build | YES | ○ |
| Playwright E2E | [YES/NO] | ○ |
| Security Review | [YES/NO based on quality level] | ○ |
| Code Review | [YES/NO based on quality level] | ○ |

## 7. Sign-Off

- **Requirement Agent:** [status]
- **Planner Agent:** [status]
- **Consensus:** [YES | NO]
