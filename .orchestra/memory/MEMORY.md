# Orchestra Memory & Lessons Learned Ledger

This ledger records architectural invariants, recurring agent failure modes, and critical lessons learned across sprints to ensure past regressions are never repeated.

---

## 1. Monorepo Architectural Invariants
- **Database Driver Adapter:** Prisma 7 uses `@prisma/adapter-pg`. Do not import default Prisma client directly in `apps/web`. Always import `{ db }` from `@/lib/db`.
- **Atomic UI Enforcement:** Shared components belong in `packages/ui`. Do not duplicate basic button or card implementations inside `apps/web/src/components`.
- **Dynamic Theming:** Never hardcode HEX colors for institute accents. Always query `getInstituteTheme(instituteCode)` to support `ics` (orange), `ibe` (gold/yellow), and `ite` (blue).
- **Mobile Viewport 16px Defense:** Always ensure text inputs have `fontSize: 16` (`text-base`) on mobile viewports to prevent iOS Safari auto-zoom behavior.

## 2. Recurring Agent Failure Modes & Mitigations
- **Failure:** Agent attempts to evaluate code directly on server without Judge0 sandbox.
  - **Mitigation:** Interactive code activities must proxy through `apps/web/src/app/api/codelab/evaluate/route.ts` communicating with the Judge0 container on port 2358.
- **Failure:** Agent misses institute scoping on dashboard routes.
  - **Mitigation:** Route validator in `scripts/harness-check.ts` rejects any route not under `[institute]/`.
- **Failure:** Multi-model mutations without transactions causing partial database states.
  - **Mitigation:** Enforce `db.$transaction([ ... ])` for all multi-record modifications.
