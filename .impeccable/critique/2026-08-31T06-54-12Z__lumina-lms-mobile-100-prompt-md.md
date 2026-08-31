---
target: Lumina LMS Mobile 100 Prompt
total_score: 38
max_score: 100
na_heuristics: 
p0_count: 5
p1_count: 6
timestamp: 2026-08-31T06-54-12Z
slug: lumina-lms-mobile-100-prompt-md
---
## Lumina LMS Mobile Plan Review

**Overall score: 38/100.** Ambitious and thoughtful, but not deployment-ready as written.

### Core verdict

The plan is comprehensive in feature enumeration but not in the decisions that make an education product safe to ship. It proposes incompatible changes to the current Expo, pnpm, auth, API-client, and Prisma foundations; it promises full offline operation without defining trustworthy academic submission semantics; and it places privacy, testing, accessibility, and release governance too late.

### Priority findings

- **P0 — No product boundary or role matrix.** The roadmap is student-heavy while claiming LMS completeness. Define student, instructor, and admin capabilities; decide what remains web-only; tie each capability to RBAC, offline eligibility, and a metric.
- **P0 — Unsafe auth rewrite.** The repo currently uses opaque server sessions for web cookies and mobile bearer session IDs. JWT access tokens plus a raw refresh-token table need an auth RFC: coexistence, signing, hashing, atomic rotation/replay detection, revocation, device control, migrations, and rollback.
- **P0 — Offline assignment submission is academically unsafe.** Define client/server timestamps, idempotency, late policy, attachment ordering, durable receipt, retry/cancel, user-visible outbox, and conflict handling before queuing submissions.
- **P0 — Education-data privacy is missing.** Sentry screenshots and PostHog/session replay can expose grades and coursework. Add data classification, redaction/allowlists, vendor/legal approval, retention/deletion, consent choices, and incident procedures before telemetry.
- **P0 — Pre-flight is incompatible with the repo.** The monorepo uses pnpm, existing `TaskItem` and workspace-task APIs, an `index.ts` API client with known `any`s, Expo SDK 55/RN 0.83/Reanimated 4, and existing upload/flashcard routes. The plan references Yarn, a nonexistent client path, duplicate models/endpoints, and Reanimated 3.
- **P0 — Phase dependencies are circular.** P2 requires offline submissions before P4 provides an outbox; P4 requires task APIs/hooks P6 says it will create. Reorder around vertical slices.
- **P1 — Native-platform rules are overprescriptive.** FlashList for every list, bottom sheet for every modal, no native Alert, haptics everywhere, zero raw colors, and a fixed-height hero all conflict with native affordances, Dynamic Type, status semantics, or real layouts.
- **P1 — File, push, real-time, and deep-link designs lack service contracts.** Uploads need private storage, signed URLs, scanning, resumability, and authorization. Push needs receipts, preference enforcement, time-zone/idempotent jobs, credentials, and real delivery verification. Realtime topology cannot be selected after client dependency installation.
- **P1 — Accessibility plan is web-derived.** Some required React Native roles are not reliable; 44 pt misses Android’s 48 dp guidance; use native VoiceOver/TalkBack, IME, tablet, RTL, gesture alternative, and scalable semantic typography criteria.
- **P1 — Store and operational requirements are incomplete.** Missing privacy/data-safety declarations, deletion path, support, terms, account review/demo access, content/moderation policy, staged rollout/rollback, incident runbook, and EAS runtime/update compatibility.
- **P2 — Test and performance gates are not credible.** Tests arrive in Phase 7; physical-only systems are assigned to generic simulator flows; `yarn lint` presently only prints text; and bundle, memory, start-time, and 100/100 score targets lack baselines or valid harnesses.

### Recommended replacement sequence

1. Discovery/RFC: capability and role matrix, API/schema inventory, tenant/RBAC audit, auth, upload, realtime, privacy, and release decisions.
2. Backend contracts/security: central authorization, safe auth evolution, migrations/rollback, typed DTOs, secure uploads, pagination/errors, tests.
3. Expo foundation: compatible packages via pnpm/Expo, safe environments/app identities/EAS channels, cache partitioning, telemetry redaction, test harness.
4. Native design system plus baseline accessibility.
5. Deliver vertical student journeys, each with API, RBAC, states, accessibility, tests, and device checks.
6. Tier offline support: read cache; drafts; safe/idempotent tasks; high-stakes assignment outbox only after policy and receipts.
7. Add push/realtime after provider/service operations exist; then CI, staged release, and bounded polish.

### Scores

Nielsen heuristic score: **17/40**. The plan offers state feedback and familiar academic terminology, but under-specifies recovery, user control, help, task prioritization, and platform consistency. Cognitive-load check: **6/8 failures** because Phase 6 and the UI prescriptions bundle too many simultaneous decisions without progressive disclosure.
