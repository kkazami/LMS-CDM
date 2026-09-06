---
trigger: model_decision
description: Multi-agent orchestra workflow enforcing Planner, Generator, and Harsh Evaluator loops
---

# Multi-Agent Orchestra Workflow Rule

When tasked with executing or initializing the **Multi-Agent Orchestra**, the agent MUST enforce the following orchestration protocol:

## 1. Role Division & Topology
- **Planner (`planner.md`):** Uses `grill-me` and `improve-codebase-architecture` to interrogate requirements and formulate a strict Sprint Contract in `.orchestra/contracts/sprint-contract-[ID].md`.
- **Generator (`generator.md`):** Builds fullstack Next.js/Monorepo LMS features adhering strictly to `packages/ui` Atomic UI, Next.js `(dashboard)/[institute]`, Prisma transactions, and dynamic theming.
- **Evaluator (`evaluator.md`):** Harsh QA Auditor. Uses `impeccable`, `design-taste-frontend`, `high-end-visual-design`, `ui-ux-pro-max`, `web-design-guidelines` and Playwright MCP / browser navigation. Grades strictly on the 4 pillars (Design Quality, Originality, Craft, Functionality).

## 2. Iteration Contract & The Debugging Loop (5 to 15 Loops)
1. **Contract Before Code:** Generator and Evaluator must negotiate acceptance criteria in `.orchestra/contracts/` before writing code.
2. **Evaluator Audit:** Evaluator grades against the contract, writes scores & brutal critique to `.orchestra/logs/evaluator.log`.
3. **Generator Self-Update Loop:** Generator reads `.orchestra/logs/evaluator.log`, diagnoses root cause, self-updates `.orchestra/prompts/generator-directive.md`, and refactors code.
4. **Gate Passage:** Loop repeats 5-15 times until total score >= 90/100 and all contract requirements pass.
5. **Memory Ledger:** Update `.orchestra/memory/MEMORY.md` and `.orchestra/memory/orchestra-state.json` to persist lessons learned.
