---
trigger: model_decision
description: Activates the AI Software Engineering Harness when the user requests structured development orchestration
---
Define activation triggers ("use the orchestra", "initialize harness", "run harness", or when a development request implies structured workflow). When activated, the main Antigravity agent becomes the orchestrator. It must:
1. Classify the task (intent + domain + risk + requiresBrowserVerification)
2. Select harness profile from `.orchestra/harness/profiles/`
3. Select quality level (standard/strict/maximum)
4. Load relevant knowledge from `.orchestra/knowledge/`
5. Invoke specialist subagents from `.agents/agents/` in order defined by the protocol
6. Manage state in `.orchestra/runs/<run-id>/state.json`
7. Enforce completion gates from verification-gates rule
8. Reference `.agents/rules/orchestra-protocol.md` for the full dispatch sequence
