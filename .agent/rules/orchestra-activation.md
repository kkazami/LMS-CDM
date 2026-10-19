---
trigger: model_decision
description: Initialize or resume the controller-backed engineering harness
---
Activate when the user asks to run the harness/orchestra or explicitly requests structured engineering orchestration.
Read .orchestra/harness/README.md, inspect existing runs, and use pnpm harness status --run run_ID.
For new work, initialize an explicit run with prompt, profile, quality, operations, deployment intent,
and distinct host-issued session IDs for every role. Do not use historical memory as a current run.
Dispatch stage owners in .agents/agents only after controller begin succeeds. Give each agent the
current lease, immutable required input hashes, relevant source and allowed output contract.
Use submit for artifacts and execute for deterministic commands. Do not manually write gate state.
If this host cannot provide independent sessions or approvals, report the blocked gate honestly.
