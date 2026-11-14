# ICS mobile presentation implementation and acceptance

**Current course correction, 5 November:** [Checkpoint restoration](course-checkpoint-restoration.md) reinstates the user's confirmed left-thumbnail card and recovers course styles from this original 39-test handoff's saved compiled artifact. The subsequent older-Git restoration/context exclusion below is superseded. The Expo Go development preview is enabled; production defaults remain off.

**Latest user correction:** [Course layout restoration](course-layout-restoration.md) supersedes this report's course redesign direction/evidence. Original My Courses cards and course interiors are retained, with instructor image customization and the earlier web font request. The redesign context excludes course descendants; older captures remain historical.

## Current disposition

Implemented on `codex/ics-mobile-ui-overhaul`, behind the default-off `EXPO_PUBLIC_ICS_UI_V2` build flag. **Not released; Android emulator checks obtained, full device acceptance pending.** The original presentation stage avoided backend/auth/API changes. The later explicitly requested fullscreen, embedded UI, Ohmward and shared-cover functionality adds narrow web/API-client/mobile upload-adapter changes, documented in [the follow-up](mobile-workspace-followup.md). No database schema or auth protocol change is needed. [The reconciliation checklist](mobile-plan-reconciliation.md) records current implementation and release gaps across both stages.

The durable direction, original reference, separate generated concepts and exact prompts are in [the ICS native brief](../design/ics-mobile/BRIEF.md). [DESIGN.md](../design/ics-mobile/DESIGN.md) and its JSON sidecar document actual scoped tokens/components. Raster provenance scan: 5 assets, none missing metadata.

## Implemented

- One pure presentation selector plus authenticated-route context; supports ICS student and PROFESSOR/TEACHER only, rejects unsupported roles, hydration and missing credentials, and resets presentation state on identity/epoch changes. Existing session verification and offline access rules are unchanged.
- Bundled static Manrope weights and DM Serif Display match the web families. Scoped text/input adapters preserve explicit fonts and leave default contexts unchanged. Welcome changes to scalable Manrope at large font settings.
- Virtualized dashboard courses; real pending assignments/teaching queues before courses, then shortcuts/calendar. The follow-up uses full-width shared course banners and retains existing title, metadata, classwork/grades links and reorder operations.
- Rounded cards/controls and shared typography across native coursework, grades, analytics, alerts, study tools, practical-lab entry screens and profile editing. Existing actions, requests, forms, upload/draft/submission behavior and web workspace bridges are preserved.
- Restrained Reanimated press feedback, welcome entrance and existing stack transitions; reduced-motion alternatives. Label/weight/indicator selection, announced errors, grouped tools, native theme switch, account confirmations, opener focus restoration with navigation/account-exit suppression.
- Readable orange text ink is resolved by the scoped text adapter; brand fill colors remain unchanged. Course footer targets are at least 48 logical units and wrap with spacing. Course tab controls/back target retain a 48-unit minimum in the enabled presentation.
- Shared synthetic fixtures for preview/native transport; Maestro student, enrollment, grading and upload/draft flow assets. No production accounts or database seed operations.

## Evidence obtained

- `pnpm --filter mobile typecheck`: passed after the final source corrections.
- Node mobile tests: **45 passed** after the follow-up, covering presentation eligibility/transitions and contrast, dashboard authorization/order, session lifecycle, account/draft isolation, upload progress/cancellation, receipts, workspace routing/bootstrap, Google sign-in, shared-cover authorization and Expo multipart transport.
- Existing and redesigned Expo Web fixture journeys: passed for student/professor at widths 320, 390 and 768. Covers joining, course ordering, classwork pagination/assessment routing, flashcards, tasks, profile cancellation, teaching queues/tools and five reachable tab targets.
- Mounted account-switch check: actual new ICS sign-out confirmation → shared login → IBE student in the same browser session. New presentation markers and Manrope welcome styling do not survive into shared login/IBE.
- Default-rendering regression harness: **10 screenshot comparisons passed** for auth and IBE/ITE student/professor in light/dark. Only the auth crest image pixels are masked: baseline-vs-itself demonstrated unstable resampling; original asset bytes and 54×54 geometry are independently asserted. No other region is masked.
- Android and iOS Hermes bundles compiled successfully. All-platform export is recorded under `tmp/ics-ui-verified`, with the final course-layout native export under `tmp/ics-ui-native-release-check`; these are compilation artifacts, not native execution evidence.
- Supplementary screenshots are under `tmp/ics-ui-final-review`; isolation pairs under `tmp/ics-ui-isolation`. The course initial viewport now includes its heading, tabs, filters and coursework; the horizontal navigation/filter rows have scoped bounded flex growth. Temporary evidence is reproducible using the versioned harnesses rather than included as product assets.
- All five Maestro YAML files parse. This establishes syntax only, not passed native flows.

## Independent review

The Impeccable finish reviewer supported the available visual direction and found three material corrections: small raw-orange course text, 44-unit course footer targets, and Android tools-close focus restoration. All three received source fixes and focused checks. The focused verdict resolved contrast and focus in source and requested an additional outer footer wrapping gap; v2 now applies gap 8 to both outer and inner groups, preserving the incumbent defaults. The final focused verdict is **Resolved: source/preview fix list closed**, after the last recapture and successful fixture run. It establishes no native readiness. The reviewer accepted the unoccluded professor and course-initial-viewport recaptures. Native evidence remains outside the scope of the preview review; no HTML/CSS detector result is claimed for native components.

## Open acceptance gates / environment findings

| Gate | Status / ownership |
| --- | --- |
| Native dashboard/tab/tools checkpoint, both roles/themes | **Android evidence obtained:** actual APK at 320dp, both roles/themes, synthetic transport. iPhone checkpoint and Kirby's device acceptance remain pending. |
| Local Android build | **Passed.** Windows long-path failure resolved with local SDK CMake 3.31.6/Ninja 1.12.1 and process-only Gradle property; x86_64 debug APK built and installed. No project/native dependency bypass. |
| Maestro flows | **Authored, not executed by Maestro.** No Maestro CLI on this host. ADB-driven native checks exercised sign-in/out, tools, fullscreen/keyboard/Back, embedded navigation and cover select/crop/save. OS document picker, grading, upload interruption/retry and full draft-relaunch journeys still require the runner. |
| Native accessibility and navigation | **Partial.** Actual Gboard/fullscreen safe areas, CodeLab draft-preserving Back and Knowledge Exchange history exercised. VoiceOver/TalkBack, large text, reduced motion, unsaved-exit variants, iOS edge navigation and nested profile acceptance remain pending. |
| Embedded workspace theme agreement | **Partial.** Real embedded components exercised in Android; both-theme browser matrix and native dashboard/tools captures obtained. Complete iOS/native dark-state parity remains pending. |
| Tablets | **Partial.** Android 768dp instructor dashboard/tools in both themes and photo editor exercised. Android 800dp large text and iPad 768-point both-theme acceptance remain pending. |
| Physical performance | **Pending.** Pixel 6a at 60 Hz, populated home/100-item coursework fixture, <5% missed frames, no >100 ms interaction stall, useful-content median ≤10% regression across five equivalent warm runs. No hardware measurements obtained. |

These unresolved gates prevent release acceptance. Keep the feature flag disabled by default. The change has no remote flag/OTA pipeline or instant kill switch; roll back by distributing the previous verified artifact or a flag-disabled build. Generated native projects are ignored; no native dependency/configuration change is shipped.

## Reproduce without production data

1. Run the Node suite with `node --import tsx --test tests/mobile/*.test.ts`, and mobile typecheck with the command above.
2. Export an incumbent/disabled baseline and enabled candidate to separate temporary folders. The preview runner takes `MOBILE_PREVIEW_ROOT`, `MOBILE_PREVIEW_OUTPUT`, and `MOBILE_PREVIEW_V2=true` for the candidate. Run `node tests/mobile/preview-smoke.cjs`.
3. Set `MOBILE_BASELINE_ROOT` and `MOBILE_CANDIDATE_ROOT`, then run `node tests/mobile/visual-isolation.cjs`. The baseline must be exported from the pre-change revision; the harness refuses missing/incomplete exports.
4. For native fixture runs, use `node tests/mobile/fixture-server.cjs` and the Maestro README. Never point the synthetic flows at production.

The implementing engineer owns fixture/reset data and automation. Kirby owns physical-device checks and release acceptance. Log unrelated findings here with reproduction and impact; a pre-existing defect blocking a required flow blocks release acceptance and requires a separately scoped repair, while independent UI work may continue behind the disabled flag.
