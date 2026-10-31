# Ohmward

**Every circuit starts a journey.**

## Standing implementation contract

This is an ICS-exclusive, beginner-friendly electronics learning journey inside the existing LMS. Deliver an ungraded primer, 8 Circuitry levels, 8 Sensors levels, 8 Microcontrollers levels, 6 Integration levels, saved attempts, hints, replay, stars, XP, one saved sandbox, instructor analytics and submitted-attempt inspection, and read-only ICS administrator oversight. The loop is Learn → Try → Build → Prove → Review.

All active ICS students satisfying the existing approved/nonarchived enrollment gate qualify. Do not impose a program restriction or Ohmward course-assignment requirement. Instructors see only approved students in their own nonarchived ICS classes. Admins see ICS only and cannot mutate student work. Deny other institutes, unsupported roles and unauthenticated API requests independently of navigation/middleware. Normalize instructor aliases using the existing canonical role helper. Grades stay out of the academic gradebook.

## Repository boundaries

Root: `C:\Users\kirby\Desktop\lms-monorepo-skeleton`. Read applicable AGENTS/rules and verify actual code at every session start. Next.js web is the only backend; dashboard pages nest under `[institute]`; APIs live in web; schema/migrations live at root; use `{ db }` and the pg adapter. Preserve unrelated changes and existing activities. No logic in apps/api, no component migration to packages/ui, no native Expo implementation.

Feature root: `apps/web/src/features/interactive-activities/ohmward`. Separate curriculum, pure evaluation, server services, student components, workbench, and analytics. Prefer existing infrastructure to general frameworks.

## Product decisions

- Pass each level to unlock its successor; stars do not gate progression.
- Primer completion opens Level 1 of Circuitry, Sensors and Microcontrollers.
- Each subject: Basic 1–3, Medium 4–6, Hard 7–8.
- Completing 1–6 of all three subjects opens sequential Integration.
- Published lessons remain readable while challenges are locked. Unimplemented content is clearly Coming soon.
- Curriculum is source-authored/versioned; no instructor editor, course assignments/deadlines, grade sync, separate leaderboard, firmware execution, physical hardware control, or general analog simulator.
- Responsive web and existing desktop wrapper; optional future native mobile work is excluded.
- Server-controlled `OHMWARD_ENABLED=true` enables the feature; default disabled until migration/verification. Disabling preserves learner records.

## Routes and presentation

Student destinations under `/ics/activities/ohmward`: overview, `/primer`, `/modules/[moduleId]`, `/levels/[levelId]`, `/progress`, `/sandbox`. Instructor/admin: `/instructor`, `/instructor/students/[studentId]`. Show Ohmward in desktop sidebar and mobile More; students land on overview, staff on analytics. Use an Ohmward path-prefix title before generic topbar title matching. Exact banner: Ohmward / Every circuit starts a journey.

Keep LMS shell, Manrope, campus actions, light/dark preference, ICS orange accents. Minimalist neumorphic raised/inset surfaces, visible boundaries, readable contrast, explicit focus/selected/error states. No competing design system, nested decorative cards, or oversized marketing hero. Keep useful learning content visible on a laptop.

Every drag has tap/click and keyboard alternatives: select/match, two-terminal connection, labeled connection form, Move Up/Down. Preserve zoom, focus, safe areas and chart table alternatives. Use practical 44px touch targets.

## Skills

Use UI UX Pro Max for product/a11y/chart guidance (its local search/data link files are broken; readable references are the disclosed fallback), Impeccable for surface brief/craft/bounded visual review, applicable Taste banner/spacing/motion principles (installed version excludes dashboards), Ponytail for minimal complete code, Vercel React Best Practices for rendering/client boundaries, Full Output Enforcement for complete content/handoffs, and Ponytail Review for concrete adversarial review. Skills do not override requirements or repository gates. Do not install competing design systems.

Use React Flow for the Sprint 2 editor (only planned new editor dependency), existing dnd-kit for matching/ordering, Recharts for charts, Framer Motion/CSS/SVG for animation, interactive SVG for Uno R3. No GSAP. Lazy-load heavy routes.

## Motion

Student-controlled primer traces sensor → controller → output. Brief lesson crossfades; immediate drag/selection response; valid terminal highlights; signal propagation only while running; readings/environment change together; executed instruction highlighted; result animation only after server success; restrained stars/XP/unlock feedback. Charts enter once. Respect reduced motion, interrupt transitions, clean up timers, never depend on animation completion for correctness.

## Data and evaluation

Persist explicit component IDs, terminal IDs, finite positions, validated properties, endpoint objects, typed instructions/rules and unit-bearing environment data. Do not split hyphenated IDs. Keep domain graph independent of editor state; distinguish undirected electrical connectivity and directed logic.

Pure deterministic evaluators: supported circuit paths/polarity/resistors/opens/bypasses/shorts; combinational AND/OR/NOT/NAND/NOR/XOR/XNOR; documented sensor transfer/rules and bounded virtual traces. Existing Arduino interpreter/solvers are references only: no eval, Function, generated JS, student C++, or Judge0. Unsupported networks produce explanations, not invented physics.

Limits: 32 components, 64 wires, 4 Boolean inputs/outputs, 16 combinations, 32 instructions, nesting ≤2, 1000 instruction steps/test, 10s virtual horizon, 128KiB request bodies. WAIT advances virtual time without real server sleeps.

Every delivered level has stable ID/version, objective/prerequisites, estimated duration, 3–4 lesson cards, guided practice, initial challenge, allowed edits/parts, 3 hints, criterion feedback/misconception tags, technical references/simplifications, ≥2 variants, positive/negative fixtures. Server selects variant; resumption preserves variant/version. Retain old grader definitions for existing attempts. Private grading definitions must not enter client bundles.

Server grades independently. Pass ≥80/100 plus all mandatory safety/correctness criteria. Build points: behavior 80, configuration 20; knowledge uses criterion points. Hints affect stars only. Failed=0 stars; passed <90=1; ≥90 with hints=2; ≥90 without hints=3. First pass earns 50 XP per level (1500 maximum); replay cannot farm. Transactionally finalize attempt, monotonic best score/stars/completion, and existing grantExp with source ohmward + stable student/level key.

Three models: OhmwardLearner (student/institute, primer, last level, sandbox/revision/timestamps); OhmwardAttempt (owner/institute, level/version/variant, state/revision/hint IDs, lifecycle/times/final criterion result); OhmwardProgress (unique student/level, best score/stars, first pass, last submit, count). IN_PROGRESS → SUBMITTED or ABANDONED. Submitted immutable; serialize creation/submission, protect concurrent requests and retries. Autosave ~800ms inactivity and important actions with optimistic revisions. Preserve unsaved work on conflict/network/session error; never falsely say saved.

API namespace `/api/ohmward`: catalog, progress, primer completion, level attempt creation, attempt read/save/hints/submit, sandbox read/save, analytics, student detail, submitted replay. Every boundary checks session/role/institute/ownership/roster and mutation origin. Reuse persistent rate limiting and private/no-store. Client cannot choose identity, variant, hints, score, XP or completion.

## Analytics

Authorized course filter, deduplicated searchable paginated roster including zero-attempt students; started/completion/attempts/recent activity; module comparison, first-pass trend, concept heatmap, misconception chart; student level detail and frozen submitted work. Completion = passed/30; cohort completion includes zeros; average best score labels attempted-level denominator; concept performance uses latest submitted criterion evidence per relevant level; no evidence is No attempts yet. Distinguish lifetime progress and filtered activity. UTC+8 dates; elapsed attempt duration is not active study time.

## Curriculum

Primer (~5min, ungraded): power, closed circuit, components, environmental sensor, controller decision, output; switch and light interaction in a night lamp.

Circuitry: CIR-01 symbols; CIR-02 functions; CIR-03 closed battery/switch/resistor/LED loop; CIR-04 resistance/current/LED; CIR-05 series/parallel prediction; CIR-06 open/reversed LED/missing or bypassed resistor; CIR-07 LED resistor calculation/selection; CIR-08 truth-table build accepting allowed equivalent circuits.

Sensors: SEN-01 light/temp/ultrasonic/PIR/IR/soil identification; SEN-02 quantities; SEN-03 analog/digital distinctions; SEN-04 six environmental controls; SEN-05 scenario selection; SEN-06 prediction; SEN-07 thresholds/ultrasonic calculation; SEN-08 power/ground/pin/noise faults.

Microcontrollers: MCU-01 Uno R3 board regions; MCU-02 pin capabilities; MCU-03 power/ground; MCU-04 protected LED; MCU-05 ordered pin-mode/on/wait/off/wait loop; MCU-06 button IF/ELSE; MCU-07 analog/PWM mapping; MCU-08 pin mode/wait/pin/condition debugging. Typed instructions, not generated code.

Integration: INT-01 label pipeline; INT-02 night lamp; INT-03 temp alarm; INT-04 safe/warning/stop parking; INT-05 diagnose failed layer; INT-06 soil-moisture plant watering with pump driver abstraction.

Technical checks: I=V/R separate from LED R=(Vs−Vf)/I; 5V, 2V Vf, 10mA → 300Ω ideal; declare current ranges/standard choices. Ultrasonic d=echo×speed/2 with units/constant/tolerance. Continuous measurement differs from communication format; PIR does not measure distance; PWM is switching. Uno R3 documented pins, ADC 0–1023 and PWM 0–255. Test equality at thresholds (night lamp <35% leaves lamp off at 35%). Explain sensor modules and virtual pump/driver; no direct GPIO pump power. No capacitor transient claims.

## Delivery and review

Read SPRINTS.md for exact sprint boundaries and acceptance gates. Do not advance without reviewed user go-ahead. Before completion: frozen candidate, fresh adversarial review, reproducible findings, critical/high fixes, rerun required checks, reviewer confirmation, final evidence packet. No self-certified independent review.

Each REVIEW-PACKET-SPRINT-N.md <~4000 words links unabridged evidence/sprint-N annexes: every verification stdout/stderr including failures/reruns; full evaluator/grader/helper snapshots; deterministic content dump; reviewer findings/fix verdict; schema/API diff; manual script/screenshots; hashed manifest. Checklist statuses exactly tested/implemented/not done, each with proving test/command. Include simplifications/uncertainties, implementation/reviewer session count, exact human click-through. Record timestamps, command/cwd/exit/source fingerprint. Never print/store live credentials. Only explicit secret redactions may alter raw output; mark them.

`pnpm ohmward:dump-content [--sprint N]` is read-only, deterministic, database-free and outputs full lessons/hints/feedback/values/references/variants/private grading cases for review. Default all delivered content; sprint includes modified earlier content too. Documentation annexes are not public assets.

Required applicable checks: test:ohmward, test:ohmward:integration, dedicated Playwright config, prisma validate/generate, web tsc, web build, migration fresh replay/upgrade/preservation/recovery, auth negative cases, browser light/dark/reduced-motion/keyboard/200% zoom at 375/768/1366x768/1440. Disposable local PostgreSQL only; never root live credentials. Preserve failed evidence. Controlled harness runs require genuine stages/identities/signatures; this is not a harness release claim.

Checkpoint after meaningful tasks and before exhaustion. Distinguish implemented/tested/reviewed. Record exact source/worktree, commands, failures, migration status, content coverage, current task, next 3 actions, first file to read, known session count, processes and whether user authorized advancement.

Only after all gates pass, final message exactly: **Sprint N complete. Review packet ready.** Then wait. Deployment is separate. If incomplete, say so and hand off; never emit completion wording.
