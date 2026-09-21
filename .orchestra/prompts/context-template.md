# Agent Context Assembly Template

When assembling context for a specialist agent, use this structure:

## 1. System Rules
[Agent-specific role and constraints from .agents/agents/<name>/agent.md]

## 2. Project Knowledge
[Relevant files from .orchestra/knowledge/ based on harness profile]
- PRODUCT.md — product overview, target users, core problems
- ARCHITECTURE.md — tech stack, app structure, key patterns, invariants
- DOMAIN.md — entities, relationships, business rules
- CONVENTIONS.md — naming, imports, component patterns, auth, theming
- DESIGN.md — visual design system, colors, typography

## 3. Task Context
- Current user request (from raw-task-request)
- Classified task metadata (intent, domain, risk, profile)
- Acceptance criteria with verification metadata
- Implementation plan (if post-planning)
- Changed files (if post-execution)
- Previous failure evidence (if in repair loop)

## 4. Selected Skills
[Loaded from .agents/skills/ based on manifests in .orchestra/manifests/]
Only load skills relevant to the current task domain and type.

## 5. Repository Context
[Relevant source files identified by the planner]
Do NOT send the entire repository. Send only:
- Files being created/modified
- Adjacent files for context
- Relevant configuration files

## 6. Acceptance Criteria
[Full list with verification metadata]

## 7. Available Tools
[Per tool-permissions.json for this agent role]

## 8. Output Contract
[Expected output format for this agent role]

---

## Context Budget Guidelines

For a frontend task, typical context includes:
- PRODUCT.md, DESIGN.md, CONVENTIONS.md
- Relevant src/components/, src/app/ files
- package.json
- Selected frontend skills

For an API task, typical context includes:
- PRODUCT.md, ARCHITECTURE.md, DOMAIN.md, CONVENTIONS.md
- Relevant src/app/api/ files
- prisma/schema.prisma (relevant models)
- Selected backend skills

A frontend agent should NOT need the entire database schema for a purely visual task.
A backend agent should NOT need design skills for a purely API task.
