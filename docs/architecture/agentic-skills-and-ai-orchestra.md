# Agentic Skills, AI Orchestra & AI Engineering Guide

This document catalogs all **agentic skills**, the **Multi-Agent AI Orchestra**, and the exact **AI engineering and prompting methodologies** employed in architecting, developing, and auditing the **CdM LMS** monorepo (Web, Native Mobile, Desktop, and Shared Backend Packages).

---

## 1. Catalog of Agentic Skills

The LMS development lifecycle leverages specialized agentic skills across five major domains:

```mermaid
graph TD
    Skills["Agentic Skills Ecosystem"]
    
    Skills --> Design["1. UI/UX & Design Craft"]
    Skills --> Eng["2. Full-Stack & Code Quality"]
    Skills --> Media["3. Asset Generation & Comps"]
    Skills --> Spec["4. Planning & Grilling"]
    Skills --> Server["5. Server-Side LMS Engine Skills"]

    Design --> D1["design-taste-frontend<br/>impeccable<br/>ui-ux-pro-max<br/>high-end-visual-design<br/>web-design-guidelines<br/>minimalist-ui<br/>gpt-taste"]
    Eng --> E1["vercel-react-best-practices<br/>vercel-composition-patterns<br/>full-output-enforcement<br/>improve-codebase-architecture<br/>generative_ui"]
    Media --> M1["brandkit<br/>image-to-code<br/>imagegen-frontend-mobile<br/>imagegen-frontend-web"]
    Spec --> S1["grill-me<br/>agy-customizations<br/>antigravity-guide"]
    Server --> Serv1["generateCourseCode<br/>bulkAssignInstructor<br/>bulkUserIngestion<br/>enrollmentManager<br/>gradebookExporter<br/>groupPermissionResolver<br/>sentimentFlagger"]
```

### 1.1 UI/UX & Aesthetic Design Skills

| Skill Name | Path | Primary Purpose & Capabilities |
| :--- | :--- | :--- |
| **`design-taste-frontend`** | `.agent/skills/design-taste-frontend` | Anti-slop frontend auditor for landing pages and dashboards. Replaces generic templates with intentional design systems, bespoke layouts, and verified micro-interactions. |
| **`impeccable`** | `.agent/skills/impeccable` | Comprehensive design, audit, polish, and optimization skill. Covers visual hierarchy, cognitive load, accessibility (WCAG AA), responsive behavior, safe areas, and design tokens. |
| **`ui-ux-pro-max`** | `.agent/skills/ui-ux-pro-max` | Advanced UI/UX intelligence database covering 50+ active styles, product palettes, font pairings, 119 UX guidelines, and stack-specific React/Next.js/React Native implementations. |
| **`high-end-visual-design`** | `.agent/skills/high-end-visual-design` | Agency-grade visual polish. Eliminates cheap AI defaults (clunky drop-shadows, generic cards, centered bland headers) and enforces subtle gradients, crisp borders, and rhythmic typography. |
| **`web-design-guidelines`** | `.agent/skills/web-design-guidelines` | Audits interfaces for Web Interface Guidelines compliance, accessibility, keyboard focus trapping, screen readers, and touch-target sizing. |
| **`gpt-taste`** | `.agent/skills/gpt-taste` | Advanced UX/UI engineer enforcing wide editorial typography, gapless bento grids, and layout variance. |
| **`minimalist-ui`** | `.agent/skills/minimalist-ui` | Clean editorial style with warm monochrome palettes, typography contrast, and flat bento layouts. |
| **`industrial-brutalist-ui`** | `.agent/skills/industrial-brutalist-ui` | Precision typographic grids, terminal aesthetics, and data-dense dashboards. |
| **`stitch-design-taste`** | `.agent/skills/stitch-design-taste` | Semantic design system generator producing calibrated color schemes, asymmetric layouts, and micro-motion. |
| **`redesign-existing-projects`**| `.agent/skills/redesign-existing-projects`| Audits legacy screens, identifies AI clichés, and upgrades layouts without breaking underlying database bindings. |

### 1.2 Full-Stack Engineering & Code Integrity Skills

| Skill Name | Path | Primary Purpose & Capabilities |
| :--- | :--- | :--- |
| **`vercel-react-best-practices`** | `.agent/skills/vercel-react-best-practices` | React 19 & Next.js performance guidelines: bundle splitting, hydration error prevention, server/client component boundaries, and memoization. |
| **`vercel-composition-patterns`** | `.agent/skills/vercel-composition-patterns` | Scalable React composition patterns, compound components, render props, and context providers eliminating boolean prop proliferation in `packages/ui`. |
| **`full-output-enforcement`** | `.agent/skills/full-output-enforcement` | Overrides default LLM truncation and laziness. Enforces complete, unabridged code generation with zero placeholder comments (`// TODO`, `/* rest of code */`). |
| **`improve-codebase-architecture`**| `.agent/skills/improve-codebase-architecture`| Audits module coupling, separates concerns, prevents shallow abstractions, and maintains clean monorepo layer boundaries. |
| **`generative_ui`** | Built-in | Renders rich interactive UI widgets, data visualizations, and charts inline. |

### 1.3 Asset Generation & Multi-Modal Skills

| Skill Name | Path | Primary Purpose & Capabilities |
| :--- | :--- | :--- |
| **`brandkit`** | `.agent/skills/brandkit` | Generates high-end brand identity systems, logo variations, institute palette boards, and visual decks. |
| **`image-to-code`** | `.agent/skills/image-to-code` | Analyzes visual mockups or design screenshots and accurately translates them into clean Tailwind CSS / React Native code. |
| **`imagegen-frontend-mobile`** | `.agent/skills/imagegen-frontend-mobile` | Generates native mobile app visual concepts with clean phone mockups and platform-appropriate typography. |
| **`imagegen-frontend-web`** | `.agent/skills/imagegen-frontend-web` | Generates section-by-section web comp references for landing pages and complex dashboards. |

### 1.4 Specification & Interrogation Skills

| Skill Name | Path | Primary Purpose & Capabilities |
| :--- | :--- | :--- |
| **`grill-me`** | `.agent/skills/grill-me` | Interrogates underspecified requirements, stress-tests edge cases, and challenges architectural shortcuts before code is written. |
| **`agy-customizations`** | Built-in | Reference guide for configuring custom skills, rules, hooks, and MCP servers. |
| **`antigravity-guide`** | Built-in | Reference for Antigravity IDE, CLI, subagents, and memory systems. |

### 1.5 Server-Side LMS Engine Skills (`apps/web/src/lib/skills/`)

These are composable, deterministic backend skills baked into the LMS server logic:

| Server Skill | File Path | Functionality |
| :--- | :--- | :--- |
| **`generateCourseCode`** | `src/lib/skills/generate-course-code.ts` | Generates collision-safe, alphanumeric join codes for instant course access. |
| **`bulkAssignInstructor`** | `src/lib/skills/bulk-assign-instructor.ts` | Atomic multi-instructor assignment across department courses with Prisma transactions. |
| **`bulkUserIngestion`** | `src/lib/skills/bulk-user-ingestion.ts` | Parses CSV/JSON rosters, creates student profiles, and assigns initial passwords. |
| **`enrollmentManager`** | `src/lib/skills/enrollment-manager.ts` | Processes student join requests, course capacity checks, and approval queues. |
| **`gradebookExporter`** | `src/lib/skills/gradebook-exporter.ts` | Compiles UTF-8 BOM CSV exports compatible with Excel and institutional registries. |
| **`groupPermissionResolver`** | `src/lib/skills/group-permission-resolver.ts`| Filters classwork and syllabus visibility based on student group membership. |
| **`sentimentFlagger`** | `src/lib/skills/sentiment-flagger.ts` | Automated sentiment analysis on student comments to detect academic distress or disengagement. |

---

## 2. The Dynamic AI Software Engineering Harness

The LMS development pipeline has evolved from a 3-role multi-agent loop into a full **AI Software Engineering Harness**. Governed by modular Antigravity rules (`.agents/rules/orchestra-*.md`), the harness converts natural-language development prompts into machine-readable requirements, dynamically routes them to task-specific harness profiles, executes changes, runs deterministic tests, performs independent QA/security/code review, and enforces bounded repair loops.

```mermaid
sequenceDiagram
    autonumber
    participant U as User / Product Owner
    participant Main as Antigravity Orchestrator
    participant Req as Requirement Agent
    participant Plan as Planner Agent
    participant Exec as Executor Agent
    participant Test as Test Agent
    participant Runner as Test Runner (Deterministic)
    participant QA as QA Agent
    participant Sec as Security / Code Review
    participant Rep as Repair Agent

    U->>Main: Natural-Language Development Prompt
    Main->>Req: Ingest & Classify (Intent, Domain, Browser Verification, Risk)
    Req->>Req: Generate Requirements & Measurable Acceptance Criteria (AC)
    Req-->>Main: Classified Task & AC with Verification Metadata
    Main->>Plan: Create Implementation & Verification Plan
    Plan-->>Main: Plan + Harness Profile + Selected Skills
    Main->>Test: Design Acceptance-Oriented Tests (Playwright / Unit)
    Test-->>Main: Test Specs created (tests/e2e/)
    Main->>Exec: Implement Code Changes (Monorepo Invariants)
    Exec-->>Main: Changed Files Manifest
    
    loop Bounded Verification & Repair Loop (Max 5 Iterations)
        Main->>Runner: Execute Tests (pnpm test:e2e, harness:check, build:web)
        Runner-->>Main: Exit Codes, Traces, Screenshots, JSON Results
        Main->>QA: Evidence-Based Verification (Criterion -> Test -> Evidence)
        alt Quality Level >= STRICT
            Main->>Sec: Independent Security & Code Review Gates
        end
        alt Verification FAILED or Blocking Findings
            Main->>Rep: Root-Cause Diagnosis & Targeted Repair Plan
            Rep-->>Main: Actionable Fix Instructions
            Main->>Exec: Apply Targeted Fixes
            Note over Main,Runner: ALL mandatory verification re-runs after repair!
        else All Criteria PASSED & Fresh Evidence Verified
            Note over Main,QA: Gate Passed: NO FRESH EVIDENCE = NO PASS
        end
    end

    Main->>U: Deliver Verified Feature with Run Artifacts (.orchestra/runs/)
```

### 2.1 The 8 Specialist Agent Roles (`.agents/agents/`)

The harness separates concerns across dedicated, tool-scoped Antigravity subagents:

1. **Requirement Agent (`.agents/agents/requirement/agent.md`)**:
   - Analyzes raw requests against project knowledge (`.orchestra/knowledge/`).
   - Produces structured requirements (`REQ-xxx`) and measurable acceptance criteria (`AC-xxx`) with explicit verification metadata (`playwright`, `command`, test paths).
   - Determines `requiresBrowserVerification` and risk rating.

2. **Planner Agent (`.agents/agents/planner/agent.md`)**:
   - Formulates dual-track `implementation_tasks[]` and `verification_tasks[]`.
   - Selects domain harness profiles (`frontend.json`, `api.json`, `fullstack.json`, etc.) and activates relevant skills.
   - The AI knows exactly how it will be judged before writing any implementation.

3. **Executor Agent (`.agents/agents/executor/agent.md`)**:
   - Fullstack implementation engine adhering to LMS invariants (Atomic UI, dynamic theming, Prisma transactions, strict TypeScript).
   - Produces artifact manifests (`filesCreated`, `filesModified`, `filesDeleted`).
   - **Critical principle:** The Executor does NOT judge its own work.

4. **Test Agent (`.agents/agents/test/agent.md`)**:
   - Designs verification strategy and authoritatively writes acceptance-oriented tests (`tests/e2e/`, unit, integration).
   - Derives tests from user requirements and expected behavior, not implementation details.
   - Follows resilient selector hierarchy: `getByRole` > `getByLabel` > `getByText` > `getByPlaceholder` > `getByTestId`.
   - **Critical principle:** Does NOT execute tests or decide pass/fail.

5. **Test Runner (Deterministic Infrastructure)**:
   - Non-LLM execution engine (`playwright test`, `pnpm harness:check`, `pnpm build:web`).
   - Evaluates purely on exit codes, stdout/stderr, and machine-readable JSON reports.
   - Captures screenshots, traces, and browser errors on failure.

6. **QA Agent (`.agents/agents/qa/agent.md`)**:
   - Evidence-based verifier. Never accepts claims without empirical proof.
   - Traces each Acceptance Criterion $\to$ Executed Test $\to$ Raw Result $\to$ Preserved Evidence.
   - Enforces the strict rule: **NO FRESH EVIDENCE = NO PASS**.

7. **Security & Code Review Agents (`.agents/agents/{security,code-review}/agent.md`)**:
   - Independent verification lanes activated for `STRICT` and `MAXIMUM` quality levels.
   - Scrutinizes route gating, RBAC checks, session token isolation, zero-`any` TypeScript strictness, and monorepo conventions.

8. **Repair Agent (`.agents/agents/repair/agent.md`)**:
   - Ingests failure evidence from QA, Security, or Code Review.
   - Formulates targeted root-cause repairs without re-discovering bugs.
   - Bounded to a maximum of 5 iterations before triggering `HUMAN_REVIEW_REQUIRED`.

### 2.2 Playwright as a Core Verification Layer

Browser-visible features are subject to mandatory Playwright E2E verification:
- **Zero-Manual-Intervention:** Configured with `webServer` in `playwright.config.ts` to automatically launch `pnpm dev:web` and wait for health checks.
- **Headless Browser Execution:** Runs headless Chrome (`channel: 'chrome'`) testing desktop and mobile (`Pixel 7`) viewports.
- **Multi-Role Authentication:** Pre-authenticates Student, Instructor, and Admin personas using seeded test accounts (`tests/e2e/fixtures/test-accounts.ts`) into reusable `playwright/.auth/` states.
- **Evidence Pipeline:** Preserves video/trace/screenshots and full JSON output in `playwright/results/` and per-run directories (`.orchestra/runs/<run-id>/`).

---

### 2.2 The 4-Pillar Evaluation Rubric (100 Points Total)

Every feature must score **$\ge 90/100$** to pass the evaluation gate:

| Pillar | Max Points | Evaluation Criteria |
| :--- | :---: | :--- |
| **1. Design Quality** | **25** | Visual coherence, balanced hierarchy, purposeful spacing rhythm, natural institute theme integration (`ics`, `ibe`, `ite`) without crude color washes. |
| **2. Originality** | **25** | Anti-slop enforcement, bespoke editorial layouts, custom quick-action pills, domain-specific LMS tables, zero generic templates. |
| **3. Craft** | **25** | Wide editorial typography, proper tabular numbers (`font-mono` on grades/dates), smooth transition states, min 44x44px touch targets, WCAG AA contrast. |
| **4. Functionality** | **25** | Zero ambiguity for users, shimmering loading skeletons, rich empty states, error recovery, 100% contract compliance, live database integration. |

---

## 3. AI Engineering & Prompting Protocols

To guarantee deterministic, production-grade output from LLMs across a complex monorepo, the following prompt engineering methodologies are strictly enforced:

### 3.1 Strict Invariant Prompting

All system prompts and agent directives embed non-negotiable monorepo rules:

```markdown
1. UI Components: ALL shared components MUST go into `packages/ui` following Atomic UI patterns. Use Lucide React icons exclusively.
2. Theming: Never hardcode institute colors. Always resolve via `getInstituteTheme(instituteCode)`.
3. Database: Always run `npx prisma generate` after schema changes. Multi-model updates MUST use `prisma.$transaction([...])`.
4. Typing: Strict TypeScript interfaces for all Prisma models. Zero use of `any`.
5. Mobile Viewport Defense: Set text input sizes to `text-base` (16px) on mobile viewports to prevent iOS Safari auto-zoom. Interactive touch targets must be $\ge 44\text{px}$.
```

### 3.2 Autonomous Self-Updating Directives

Instead of requiring continuous human re-prompting during debugging, the Generator uses a **self-reflective prompt file** (`.orchestra/prompts/generator-directive.md`):

```markdown
# Structure of Generator Directive:
1. Current Sprint Objective & Contract Link
2. Latest Evaluator Log Parsing & Root Cause Analysis
3. Targeted Refactoring Plan
4. Invariant Checklist (Types, Mobile Touch Targets, Prisma Transactions)
5. Execution Steps
```

### 3.3 Negative Constraint Prompting (Anti-Slop)

Prompt directives explicitly ban common generative AI failure modes:
- **Banned:** Placeholder code (`// TODO: implement later`, `/* rest of your code */`).
- **Banned:** Fake or wireframe UI on mobile (all mobile cards and tabs must connect 1-to-1 to real Prisma database endpoints).
- **Banned:** Generic centered cards with heavy black drop-shadows.
- **Banned:** Unpaginated API requests that overload mobile memory.
- **Banned:** Rogue tabs in Expo Router (all non-tab child screens must declare `options={{ href: null }}`).

### 3.4 Multi-Turn Memory Persistence (`.orchestra/memory/MEMORY.md`)

At the conclusion of every sprint, the orchestra appends lessons learned to long-term memory. Future subagents load this ledger at initialization to ensure past regressions are never repeated across conversation boundaries.
