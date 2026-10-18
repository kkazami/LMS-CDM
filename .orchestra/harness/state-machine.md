# Executable state machine

Source of truth: scripts/harness/state.ts. Contracts: scripts/harness/gates.ts.

```mermaid
flowchart TD
  DRAFT --> REQUIREMENTS_READY --> RECON_COMPLETE --> RED_TEAM_COMPLETE --> ARCHITECTURE_ADJUDICATED --> PLAN_READY
  PLAN_READY -->|signed approval if high or critical| APPROVED
  APPROVED --> IMPLEMENTED --> TESTS_READY --> VALIDATED --> QA_VERIFIED --> SECURITY_VERIFIED --> CODE_REVIEWED --> RELEASE_READY
  RELEASE_READY -->|separate signed deployment approval| DEPLOYED -->|post-deploy execution| COMPLETE
  IMPLEMENTED --> FAILED
  VALIDATED --> FAILED
  QA_VERIFIED --> FAILED
  SECURITY_VERIFIED --> FAILED
  CODE_REVIEWED --> FAILED
  FAILED -->|budget available| REPAIRING --> APPROVED
  FAILED -->|five repairs or three repeated failures| HUMAN_REVIEW_REQUIRED
  APPROVED --> INTERRUPTED
  INTERRUPTED -->|source and budget checked| REPAIRING
```

Every stage is claimed before work and submitted after evidence validation. Intermediate running
ownership is a lease, not a pass. Planning failures need a new run. Any material source/scope/risk
change invalidates recon onward and approval; in-scope source changes invalidate implementation onward.
Recovery preserves accepted history and interrupts unfinished ownership. Uncertain deployments require
external human reconciliation and a new run; no automatic replay. Code-only runs end RELEASE_READY.
