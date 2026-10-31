# Ohmward — Sprint 1 review packet

**Every circuit starts a journey.**

Candidate: source snapshots and fingerprint in [final-source-manifest.json](evidence/sprint-1/final-source-manifest.json). This packet is an index; the linked annexes contain complete output and source without a word limit. No deployment or controlled-harness release is claimed. Sprint 2 has not started.

## A. Acceptance gates

`tested` means implemented with passing evidence; `implemented` means not yet proven; `not done` means absent, partial, or failing. The command index retains every earlier failure as well as later passes.

| Criterion | Status | Proof |
|---|---|---|
| S1-01 qualifying ICS learner completes primer and CIR-01–03 | tested | Playwright `beginner completes primer and CIR-01–03; hints, restored draft and server feedback work`; integration `student completes CIR-02 and CIR-03; academic records remain byte-for-byte unchanged`. |
| S1-02 incorrect work receives useful feedback | tested | Six variant unit tests, five-of-six scoring boundary, reversed LED/short/open/duplicate terminal negatives; grading output includes criterion feedback. |
| S1-03 unfinished work resumes with its variant/hints | tested | Integration `draft survives read; stale saves conflict; hints are monotonic; foreign owners cannot read/save/reveal/submit`; browser restored-draft, search-navigation, reload, and genuine missing-cookie recovery cases. |
| S1-04 replay preserves best results and never repeats XP | tested | Integration `replay improves stars without XP; later failed replay preserves bests and completion`. |
| S1-05 concurrent opens/submissions serialize; stale saves conflict | tested | Integration concurrent open/submission tests, stale-save 409, one progress count and one 50-XP grant, database immutability trigger. |
| S1-06 direct authorization/origin boundaries hold | tested | Real-session API integration and real-cookie browser tests: absent credential, foreign institute/admin, student/staff role, ownership, enrollment, expiry/deactivation, origin and course tampering. |
| S1-07 scoped deduplicated roster includes zero-attempt learners | tested | Integration instructor/admin roster assertions; browser instructor view includes Zero Attempt Learner and excludes unrelated class. |
| S1-08 responsive/theme/keyboard/reduced-motion flows work | tested | Browser mobile/navigation/keyboard/theme test at 375/768/1366/1440px and 200% zoom; accessible symbol descriptions and native input alternatives; captured screenshots. |
| S1-09 migration applies fresh/upgrades, preserves academic data and rolls back failed DDL | tested | Disposable PostgreSQL integration: HEAD schema plus additive migration, fresh empty replay, seeded upgrade, ownership FK, immutable attempts, rollback probe, unchanged academic JSON. |
| S1-10 complete content/annexes and adversarial review | tested | Full dump/source annexes; independent reviewer confirmed all 52 snapshots and the frozen fingerprint, passing final build/browser evidence, unchanged passing evaluator/integration inputs, and resolution of all eight findings. Final verdict in ADVERSARIAL-REVIEW.md. |

Automated results: 13 Ohmward unit tests; 10 integration checks; 6 browser scenarios; 10 business-plan regressions including independent DOCX checksum checks; 69 harness regressions. Schema validation, generation, web typecheck and isolated production build have passed. Final exact receipts are in the index below; do not infer a current pass from a historical row.

## B. Raw verification output

Read [every command and raw stdout/stderr](evidence/sprint-1/COMMANDS.md). Each row links the receipt containing the exact command, working directory, UTC timestamps, exit status and execution fingerprint.

Commands include:

- `pnpm test:ohmward`
- `pnpm test:ohmward:integration`
- Dedicated `playwright test --config playwright.ohmward.config.ts`, launched by the owned fixture.
- `pnpm prisma validate` and `pnpm prisma generate`.
- `pnpm --filter web exec tsc --noEmit`.
- Exact `pnpm build:web` in a source copy with copied Prisma configuration and an owned database. Its default Turbopack build and subsequent browser tests are captured separately from earlier webpack builds.
- Existing business-plan regression suite; `pnpm harness:test`; `pnpm harness:typecheck`; `git diff --check`.
- Database-free `pnpm ohmward:dump-content --sprint 1`.

Earlier failures remain: restricted temporary-folder ACLs; test runner missing TypeScript registration; an initial type assertion; the pre-existing browser import of `node:zlib`; and browser selector/recovery assertions. These were investigated and corrected, not removed from the record.

Build-only copy settings: one build worker and a Turbopack root that includes existing dependency junctions. No production auth or product feature was mocked to make browser verification pass. Integration substitutes only the database singleton; real session validation and authorization execute.

## C. Full evaluator and grading source

See [complete source index](evidence/sprint-1/SOURCE.md). It includes pure circuit evaluation, grading/fixtures/hints, public curriculum/types, validation, authorization, transactions/XP, HTTP dispatch, client recovery, connected existing helpers and tests. Files are copied in full and hashed. [Tracked changes](evidence/sprint-1/tracked-changes.patch) accompany the snapshots; new files are represented by the source index and manifest.

## D. Full content dump

The `content` rows in [COMMANDS.md](evidence/sprint-1/COMMANDS.md) link the complete output of `pnpm ohmward:dump-content --sprint 1`: primer, all lesson cards, three hints per level, variant instructions, neutral symbol geometry/descriptions, feedback, fixed numerical values, references, simplifications, expected cases and incorrect fixtures.

Delivered: primer plus CIR-01, CIR-02 and CIR-03, two variants each. Twenty-seven other level titles are deliberately Coming soon. No broken challenge links pretend they are delivered.

## E. Schema and API changes

- Added `OhmwardLearner`, `OhmwardAttempt`, `OhmwardProgress`, with composite owner/institute relations. The SQL migration adds one-active-attempt uniqueness, lifecycle checks, immutable finalized attempts and grants to an existing restricted runtime role if present.
- Added private/no-store `/api/ohmward` dispatch: catalog, personal progress, primer completion, level attempt creation/resumption, owned attempt read/save, hints, submission and scoped roster analytics.
- Workspace mutations use a strict `{ revision, state }` contract. Hint revelation accepts `{ index }`; hints are recorded independently of draft revision. Owner, variant, score, stars and rewards come from the server.
- Revalidate account/session/enrollment under transaction locks; serialize per-student writes; commit result/progress/XP together. Duplicate final submissions return the recorded result without another reward.
- `OHMWARD_ENABLED` defaults false. Navigation and routes require it. No primary/live database was migrated or seeded.
- Necessary compatibility fix: replace the pre-existing Node-only CRC32 import in the business-plan exporter with a portable implementation. Existing export APIs remain synchronous; generated ZIP checksums are checked independently against Node.

## F. Simplifications, omissions and uncertainty

- Sprint 1 supports fixed four-part series wiring only. No movable components, arbitrary networks, general analog physics, capacitor transients or firmware execution. Wire movement is an energized-state cue, not physical timing.
- The LED model fixes forward drop at 2V. Variants use 3V/220Ω (about 4.55mA) and 5V/330Ω (about 9.09mA), with a lesson-specific 20mA maximum.
- Sandbox, remaining levels, charts, student detail and staff attempt replay belong to later sprints. Current staff access is a read-only scoped roster.
- Recovery uses browser memory keyed by authenticated user; it survives SPA navigation/login redirects. It is not disk/offline storage. Hard refresh/tab closure warns while work is unsaved; accepting that departure can discard unsaved memory. Signing in in another tab preserves the original tab’s draft for retry.
- Migration replay means the current pre-feature HEAD schema followed by this additive migration, plus seeded upgrade and rollback checks. It does not certify the entire historical migrations directory or an uninspected deployed database.
- Tests use synthetic records in owned loopback PostgreSQL and an isolated application copy. They do not establish staging performance, external provider readiness, or a human beginner pilot.
- Content was independently reviewed by an AI reviewer, not signed off by a human electronics instructor.
- UI UX Pro Max’s local script/data links are broken; readable references were used. No skill upgrades or global CLI installs were performed.
- Controlled harness infrastructure regressions passed; no controlled feature-run approval or release state is fabricated.

## G. Agent windows

Observed Sprint 1 implementation windows: **1**. Separate reviewer windows: **1**. Total: **2**. Follow-up review turns reused that reviewer window. Earlier planning conversations are excluded.

## H. Human click-through

Use the disposable fixture, not live accounts. From the repository root:

```powershell
node tests/ohmward/browser.mjs --manual --actor student
```

This prepares an isolated app/database and opens Chrome with a synthetic student session. Close that browser or press Ctrl+C to stop the fixture. A verified retained PostgreSQL runtime is required; set `LAB_TEST_PG_RUNTIME_ROOT` if its repository-local retained location is unavailable. A later `--reuse-app ABSOLUTE_OWNED_APP_PATH --skip-build` invocation can reuse an unchanged verified build.

1. Open `/ics/activities/ohmward`. Check the exact name/tagline, sidebar destination, topbar title and Continue/Introduction action.
2. Open `/ics/activities/ohmward/primer`. Set light to 20%, close the switch: lamp ON. Open switch: OFF. Set exactly 35%: OFF. Complete the four introduction steps.
3. Open `/ics/activities/ohmward/modules/circuitry`. CIR-01 is ready; later challenges require predecessors, while their delivered lessons remain readable. Future levels say Coming soon.
4. Open `/ics/activities/ohmward/levels/CIR-01`. Read, explore, then Build. Choose incorrect answers and submit: inspect useful feedback and failure. Replay, reveal a hint, answer correctly: score is unaffected by hints, stars are reduced. Replay without hints: improve stars, receive no repeat XP.
5. Edit an active answer and leave immediately using Journey or shell search. Return: the draft survives. Refresh only after Saved: the server restores it. Test a failed save by using browser offline mode; the visible unsaved-work notice must persist. Restore connectivity and retry.
6. Complete CIR-02. In CIR-03 Try, use the prewired protected loop. Open/close the switch and run it; there is no unrelated ambient-light condition.
7. In CIR-03 Build, use terminal selections or the labeled connection form: battery + → switch 1; switch 2 → resistor 1; resistor 2 → LED anode; LED cathode → battery −. Run: LED ON and the variant’s estimated current. Open switch: OFF. Remove a wire or reverse the LED: explicit failure. Repair and submit.
8. Open `/ics/activities/ohmward/progress`. Confirm best scores/stars and 3/30 completion after passing all delivered levels. Academic grades must remain unchanged.
9. Restart the manual fixture with `--actor teacher`; open `/ics/activities/ohmward/instructor`. Zero Attempt Learner is included, Other Class Learner is excluded, class filtering works. Preview lessons without creating learner rewards. Staff mutations must return 403.
10. Restart with `--actor admin` for ICS-wide read-only scope, or `--actor foreign` to verify denial. Direct unauthorized API cases have raw automated proof in the integration/browser output.
11. At 375px use More → Ohmward. Check keyboard focus, labeled controls, dark mode, reduced motion, zoom, and visible error/save feedback.

Visual captures and failure contexts are indexed in [VISUALS.md](evidence/sprint-1/VISUALS.md). Review findings and dispositions are in [ADVERSARIAL-REVIEW.md](evidence/sprint-1/ADVERSARIAL-REVIEW.md).

**Advancement:** wait for the user’s reviewed go-ahead. No Sprint 2 work is authorized by this packet alone.
