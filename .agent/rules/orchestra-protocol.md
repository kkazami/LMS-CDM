---
trigger: model_decision
description: Controller-enforced software engineering lifecycle
---
# Engineering Harness v2
Authoritative code: scripts/harness/{controller,state,gates,store,runner}.ts.
Operations: pnpm harness <action> --run run_ID. Never edit state.json or journal.jsonl.
Read .orchestra/harness/README.md and docs/architecture/harness-redesign.md.

Dispatch requirement → recon/proposal → architecture-red-team → architecture-adjudicator
→ planner → human implementation approval when HIGH/CRITICAL → executor → test author
→ deterministic runner → independent QA → independent security → independent code review
→ deterministic release gate → separate human deployment approval → deployer → post-deploy runner.
Code-only work ends RELEASE_READY; COMPLETE requires deployment and post-deployment verification.
Quality levels only add verification. Security and code review are always required.
Planning failures require a new run; unresolved decisions never become planner assumptions.
Skills provide specialist capabilities, never authority to change gates or requirements.
Legacy sprint documents, rubric scores, shared logs and memory are historical context only.
