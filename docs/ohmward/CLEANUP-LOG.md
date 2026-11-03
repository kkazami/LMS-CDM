# Ohmward Sprint 1 verification cleanup

Started UTC: 10/30/2026 15:24:14

Scope: remove only untracked Ohmward-generated verification artifacts. No Sprint 2 implementation, build, integration/browser run, backup, migration, seed, or database query is authorized by this cleanup.

C: free before cleanup: **20707033088 bytes (19.285 GiB)**. Sizes below are logical regular-file bytes, without following junctions; parent/child breakdowns overlap. File counts exclude reparse entries and their targets.

## Initial git status --short

```text
error: fsmonitor_ipc__send_query: unspecified error on '.git/fsmonitor--daemon.ipc'
 M .env.example
 M apps/web/src/app/(dashboard)/[institute]/layout.tsx
 M apps/web/src/components/layout/DashboardLayout.tsx
 M apps/web/src/components/layout/MobileBottomNav.tsx
 M apps/web/src/components/layout/MobileMoreSheet.tsx
 M apps/web/src/components/layout/Sidebar.tsx
 M apps/web/src/components/layout/Topbar.tsx
 M apps/web/src/lib/business-plan/export.ts
 M package.json
 M prisma/schema.prisma
 M tests/business-plan/business-plan.test.ts
?? apps/web/src/app/(dashboard)/[institute]/activities/ohmward/
?? apps/web/src/app/api/ohmward/
?? apps/web/src/features/interactive-activities/ohmward/
?? docs/ohmward/
?? playwright.ohmward.config.ts
?? prisma/migrations/20261030000100_ohmward_foundation/
?? scripts/ohmward/
?? tests/ohmward/
```

Git emitted an existing fsmonitor IPC warning and exited 0. The working-tree status itself was captured above. No index/reset/checkout operation was performed.

## Inventory and final classification

DELETE entries were checked against git ls-files: none contain tracked files. Inspection of the unit-test imports, feature source, root commands and fixture code established that the real app/build/test:ohmward path uses no deleted artifact. Browser/integration fixtures are retired; their source is retained. KEEP entries are never cleanup targets.

| Classification | Full path | Bytes | Regular files | Why |
|---|---|---:|---:|---|
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075` | 2104925943 | 7668 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365628304` | 1061064 | 12 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366112897` | 321612 | 7 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366356006` | 1015573 | 11 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366538305` | 857900 | 9 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366656564` | 1080720 | 10 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366878840` | 1080464 | 10 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793371167783` | 0 | 0 | Ohmward browser.mjs output namespace; isolated builds, screenshot/trace/failure results; shared junction targets excluded from size. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\ohmward` | 1313410 | 49 | Ohmward fixture.mjs/verify.mjs synthetic configs and retained browser session state; no live learner data. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\docs\ohmward\evidence` | 15273801 | 342 | Generated Ohmward Sprint 1 verification logs, source snapshots, screenshots and annexes; retired by user. |
| KEEP | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793364952342_15782341` | 1664 | 1 | Same-day cluster lacks copied Ohmward ownership receipts; skipped unless stronger ownership evidence is established. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793364970360_600788ea` | 56682162 | 2050 | Synthetic cluster contains Ohmward-exclusive student marker, nonshared/no-real-accounts target provenance, and creation falls inside captured Ohmward run(s): 1793364967935-integration |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365070255_dc572d70` | 88546896 | 3110 | Synthetic cluster contains Ohmward-exclusive student marker, nonshared/no-real-accounts target provenance, and creation falls inside captured Ohmward run(s): 1793365066821-integration |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365224150_cb23f1f0` | 56642347 | 2048 | Synthetic cluster contains Ohmward-exclusive student marker, nonshared/no-real-accounts target provenance, and creation falls inside captured Ohmward run(s): 1793365221431-browser |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365631813_dffd44ff` | 73969563 | 2052 | Synthetic cluster contains Ohmward-exclusive student marker, nonshared/no-real-accounts target provenance, and creation falls inside captured Ohmward run(s): 1793365627815-browser |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365671967_b3161bff` | 88538739 | 3110 | Synthetic cluster contains Ohmward-exclusive student marker, nonshared/no-real-accounts target provenance, and creation falls inside captured Ohmward run(s): 1793365627815-browser, 1793365667206-integration |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366114826_f02660f1` | 57048022 | 2050 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366358695_f833a6e1` | 56890546 | 2048 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366540058_e4c678cf` | 56898189 | 2050 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366658319_30ff3a08` | 57048011 | 2050 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366723232_1aa5b15c` | 88538704 | 3110 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366880495_cae4057b` | 56784633 | 2048 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| DELETE | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793370192962_c5625e70` | 88538702 | 3110 | Synthetic stopped cluster: identical original receipts copied by Ohmward fixture.stop; target-provenance confirms no real accounts/shared target. |
| KEEP | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793371170254_86f240af` | 3255 | 2 | Same-day cluster lacks copied Ohmward ownership receipts; skipped unless stronger ownership evidence is established. |
| KEEP | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\.orchestra\local-worktrees\trusted-local-harness\.orchestra\runs\run_trusted_local_profile_20261009\checkpoint\bqual-01-phase-3` | 226120927 | 4079 | Preexisting retained PostgreSQL distribution; shared labs/gradebook runtime, not created by Ohmward. |
| KEEP | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules` | 2885241541 | 131303 | Real repository dependencies/source; protected. Reparse links are excluded from physical size/file counts. |
| KEEP | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\apps\web\node_modules` | 65494 | 48 | Real repository dependencies/source; protected. Reparse links are excluded from physical size/file counts. |
| KEEP | `C:\Users\kirby\Desktop\lms-monorepo-skeleton\packages` | 79065 | 63 | Real repository dependencies/source; protected. Reparse links are excluded from physical size/file counts. |

### Nested build/evidence detail (already included above)

| Full path | Bytes | Files |
|---|---:|---:|
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq` | 2104925821 | 7667 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next` | 2085241545 | 6404 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack` | 1622196828 | 17 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\turbopack` | 315341118 | 16 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\docs\ohmward\evidence\sprint-1\source` | 361235 | 52 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\docs\ohmward\evidence\sprint-1\visuals` | 5415199 | 41 |

### Individual large generated files (16 MiB or larger; included in parent totals)

| Full path | Bytes |
|---|---:|
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\server-production\index.pack.old` | 164180719 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\server-production\index.pack` | 164180749 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\server-production\3.pack` | 21381399 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\server-production\1.pack` | 137132556 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\server-production\0.pack` | 680711686 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\edge-server-production\1.pack` | 18092818 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\client-production\index.pack.old` | 45217307 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\client-production\index.pack` | 45218400 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\webpack\client-production\0.pack` | 309792093 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\turbopack\v16.4.2-2864b177\00000050.sst` | 59244330 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\turbopack\v16.4.2-2864b177\00000049.sst` | 175601463 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\cache\turbopack\v16.4.2-2864b177\00000047.sst` | 52364823 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793364970360_600788ea\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365070255_dc572d70\postgres-data\pg_wal\000000010000000000000003` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365070255_dc572d70\postgres-data\pg_wal\000000010000000000000002` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365224150_cb23f1f0\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365631813_dffd44ff\postgres-data\pg_wal\000000010000000000000002` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365631813_dffd44ff\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365671967_b3161bff\postgres-data\pg_wal\000000010000000000000003` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365671967_b3161bff\postgres-data\pg_wal\000000010000000000000002` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366114826_f02660f1\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366358695_f833a6e1\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366540058_e4c678cf\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366658319_30ff3a08\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366723232_1aa5b15c\postgres-data\pg_wal\000000010000000000000003` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366723232_1aa5b15c\postgres-data\pg_wal\000000010000000000000002` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366880495_cae4057b\postgres-data\pg_wal\000000010000000000000001` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793370192962_c5625e70\postgres-data\pg_wal\000000010000000000000003` | 16777216 |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793370192962_c5625e70\postgres-data\pg_wal\000000010000000000000002` | 16777216 |

### Shared caches — KEEP

| Full path | Bytes | Files |
|---|---:|---:|
| `C:\Users\kirby\AppData\Local\pnpm\store` | 4755738971 | 136107 |
| `C:\Users\kirby\AppData\Local\npm-cache` | 2975114089 | 32669 |
| `C:\Users\kirby\AppData\Local\ms-playwright` | 539801812 | 419 |

pnpm store path was checked in the host environment. Sandbox-remapped cache paths are not the host store; no cache was deleted. npm config get cache was refused by its protected-option policy; the existing host default cache directory was measured directly instead.

### Temporary secret-directory paths

Exact paths from fixture provisioning receipts were checked on the host; all 14 are already absent. No secret-file contents were read or printed. No external temporary directory was deleted.

- KEEP / already absent: `C:\Users\kirby\AppData\Local\Packages\sandbox.{aeaa3149-52a7-47ab-9a81-dbd78a485a0f}\AC\Temp\su-v1-54f2460381aec11d9c82cd0e96444cc9`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-b31fa7294ae769ae2f01f851abf6e383`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-71b07f50424f9ddc8f5819ba4708a988`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-8ca7141d29f934c5b20a33e52b5e813d`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-95e4b088ad328e2c32e99c15b310c4a7`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-c76ab74046b4fe9cac4912cd3025c069`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-1866736e72cde5469108257031bb4ba6`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-7c2eb2209e1d78b3888f24f3c441c191`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-4fa0425e473c567cc71021ef9f1257f7`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-dfcd803a6e07e389ada9cd83a06ae9ec`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-78455ad6b6b84d1b20b1d8a7fa9ea86f`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-278a679b203b8b9318b9d5f331edd7fa`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-14d3c69d769afa2ca319928e2824ac84`.
- KEEP / already absent: `C:\Users\kirby\AppData\Local\Temp\su-v1-aa973ad6644c36d0d7442fd012afc8bd`.

Other project temporary folders, older PostgreSQL clusters, real .next output, shared retained worktrees, all .env files and real repository source/dependencies remain untouched. Generic temporary folders without exact ownership receipts were not eligible for removal.

### Host process inventory

No postgres.exe, pg_ctl.exe or chrome.exe processes were found. No candidate process matched Ohmward browser/fixture/config/cluster paths. All unrelated processes below are KEEP; **zero processes stopped**.

| PID | Parent PID | Image | Executable |
|---:|---:|---|---|
| 4068 | 10916 | node.exe | `C:\Users\kirby\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` |
| 18264 | 9360 | node.exe | `C:\Users\kirby\AppData\Local\OpenAI\Codex\runtimes\cua_node\5c41f77a7900391c\bin\node.exe` |
| 17560 | 26796 | node.exe | `C:\Users\kirby\AppData\Local\OpenAI\Codex\runtimes\cua_node\5c41f77a7900391c\bin\node.exe` |
| 25792 | 9360 | node.exe | `C:\Users\kirby\AppData\Local\OpenAI\Codex\runtimes\cua_node\5c41f77a7900391c\bin\node.exe` |
| 8904 | 1092 | node.exe | `C:\Users\kirby\AppData\Local\OpenAI\Codex\runtimes\cua_node\5c41f77a7900391c\bin\node.exe` |
| 29884 | 29664 | node.exe | `C:\Users\kirby\AppData\Local\OpenAI\Codex\runtimes\cua_node\5c41f77a7900391c\bin\node.exe` |
| 27824 | 10804 | node.exe | `C:\Users\kirby\AppData\Local\OpenAI\Codex\runtimes\cua_node\5c41f77a7900391c\bin\node.exe` |
| 13444 | 28116 | msedge.exe | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| 28088 | 13444 | msedge.exe | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| 16564 | 13444 | msedge.exe | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| 24836 | 13444 | msedge.exe | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| 25884 | 13444 | msedge.exe | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| 24044 | 4200 | node.exe | `C:\Program Files\nodejs\node.exe` |

## Junction safety and deletion record

Eight reparse points were found inside the isolated copy; none in evidence or other deletion candidates. Targets are recorded below. Each link will be removed with System.IO.Directory.Delete(link, false), which removes the directory junction itself without recursion. Immediately before and after each link removal, the resolved target must exist with matching regular-file count, byte total and reparse-point count. Traversal never follows nested links. The real root node_modules and apps/web/node_modules are also checked after every link removal.

Protected tracked/untracked source files hashed before cleanup: 1749. Only hashes were stored temporarily, not source snapshots. Final comparison will be recorded below.

Host process ownership rechecked immediately before deletion UTC 2026-10-30T15:27:45.8518909Z: no fixture-owned processes; zero stopped.
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\packages` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\packages`. Target exists; files **63 -> 63**, bytes 79065 -> 79065, links 1 -> 1. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\node_modules` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules`. Target exists; files **131303 -> 131303**, bytes 2885241541 -> 2885241541, links 4289 -> 4289. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\node_modules` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\apps\web\node_modules`. Target exists; files **48 -> 48**, bytes 65494 -> 65494, links 60 -> 60. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\node_modules\postcss-71763ebbb8810717` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules\.pnpm\postcss@8.5.31\node_modules\postcss`. Target exists; files **58 -> 58**, bytes 224504 -> 224504, links 0 -> 0. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\node_modules\pg-71df57fbe79e18ab` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules\.pnpm\pg@8.23.0\node_modules\pg`. Target exists; files **20 -> 20**, bytes 100044 -> 100044, links 0 -> 0. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\node_modules\officeparser-65ad2faf016a2acc` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules\.pnpm\officeparser@7.5.1_encoding@0.1.13\node_modules\officeparser`. Target exists; files **93 -> 93**, bytes 12382724 -> 12382724, links 0 -> 0. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\node_modules\@prisma\client-604255c45e072330` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules\.pnpm\@prisma+client@7.9.1_prisma_11f4edd8bd61acc42bfba74b01e22a1d\node_modules\@prisma\client`. Target exists; files **84 -> 84**, bytes 78415422 -> 78415422, links 0 -> 0. Both real node_modules baselines unchanged (root 131303 files; web 48 files).
- Removed link only: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075\web-workspace-l8QUfq\apps\web\.next\node_modules\@prisma\adapter-pg-e14cd8e9c47cd88d` -> `C:\Users\kirby\Desktop\lms-monorepo-skeleton\node_modules\.pnpm\@prisma+adapter-pg@7.9.1\node_modules\@prisma\adapter-pg`. Target exists; files **7 -> 7**, bytes 70794 -> 70794, links 0 -> 0. Both real node_modules baselines unchanged (root 131303 files; web 48 files).

### Deleted roots

| Deleted path | Bytes before deletion | Files | Result |
|---|---:|---:|---|
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365222075` | 2104925943 | 7668 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793365628304` | 1061064 | 12 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366112897` | 321612 | 7 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366356006` | 1015573 | 11 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366538305` | 857900 | 9 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366656564` | 1080720 | 10 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793366878840` | 1080464 | 10 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\roster-import\ohmward-browser-1793371167783` | 0 | 0 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\ohmward` | 1313410 | 49 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\docs\ohmward\evidence` | 15273801 | 342 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793364970360_600788ea` | 56682162 | 2050 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365070255_dc572d70` | 88546896 | 3110 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365224150_cb23f1f0` | 56642347 | 2048 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365631813_dffd44ff` | 73969563 | 2052 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793365671967_b3161bff` | 88538739 | 3110 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366114826_f02660f1` | 57048022 | 2050 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366358695_f833a6e1` | 56890546 | 2048 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366540058_e4c678cf` | 56898189 | 2050 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366658319_30ff3a08` | 57048011 | 2050 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366723232_1aa5b15c` | 88538704 | 3110 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793366880495_cae4057b` | 56784633 | 2048 | Deleted; confirmed absent |
| `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793370192962_c5625e70` | 88538702 | 3110 | Deleted; confirmed absent |

Removed 22 generated roots, 2953057001 logical bytes (2.75 GiB). All 1749 protected source file hashes match the pre-cleanup baseline; both real dependency directories retain their original counts/bytes/links. No restoration required.

## Post-cleanup checks

Only the requested git status and three product verification commands were run. No build, migration, integration/browser fixture or Prisma generation command was run. Working directory for each: `C:\Users\kirby\Desktop\lms-monorepo-skeleton`.

### git status --short

```text
error: fsmonitor_ipc__send_query: unspecified error on '.git/fsmonitor--daemon.ipc'
 M .env.example
 M apps/web/src/app/(dashboard)/[institute]/layout.tsx
 M apps/web/src/components/layout/DashboardLayout.tsx
 M apps/web/src/components/layout/MobileBottomNav.tsx
 M apps/web/src/components/layout/MobileMoreSheet.tsx
 M apps/web/src/components/layout/Sidebar.tsx
 M apps/web/src/components/layout/Topbar.tsx
 M apps/web/src/lib/business-plan/export.ts
 M package.json
 M prisma/schema.prisma
 M tests/business-plan/business-plan.test.ts
?? apps/web/src/app/(dashboard)/[institute]/activities/ohmward/
?? apps/web/src/app/api/ohmward/
?? apps/web/src/features/interactive-activities/ohmward/
?? docs/ohmward/
?? playwright.ohmward.config.ts
?? prisma/migrations/20261030000100_ohmward_foundation/
?? scripts/ohmward/
?? tests/ohmward/
```

Exit code: 0.
Before/after git status output is identical (including the existing fsmonitor warning). Generated deletions were ignored/untracked under already untracked docs/ohmward; only intentional documentation files changed. All 1,749 protected source hashes were separately verified unchanged.

### pnpm test:ohmward

Started UTC: 2026-10-30T15:29:18.5349629Z

```text

> cdm-lms@ test:ohmward C:\Users\kirby\Desktop\lms-monorepo-skeleton
> node --import tsx --test tests/ohmward/*.test.ts

✔ CIR-01/a: correct work passes; empty work fails; hints change stars only (6.7456ms)
✔ CIR-01/b: correct work passes; empty work fails; hints change stars only (0.4679ms)
✔ CIR-02/a: correct work passes; empty work fails; hints change stars only (0.382ms)
✔ CIR-02/b: correct work passes; empty work fails; hints change stars only (0.3248ms)
✔ CIR-03/a: correct work passes; empty work fails; hints change stars only (3.1778ms)
✔ CIR-03/b: correct work passes; empty work fails; hints change stars only (0.591ms)
✔ five of six knowledge criteria pass at 83.33; four fail; false claims are rejected (1.9564ms)
✔ CIR-03 rejects reversed LED, battery short, duplicate terminals, disconnected and unknown pins (0.3777ms)
✔ CIR-03 accepts equivalent series order and reversed wire direction; open switch gives zero current (0.8842ms)
✔ progression requires primer and previous pass, never stars or unavailable levels (0.4641ms)
✔ delivered content has complete cards, two variants, three hints, references and numeric assumptions (0.2608ms)
✔ streamed payload limits reject oversized input without relying on Content-Length (50.4385ms)
✔ independent knowledge goldens and neutral public geometry establish the answer boundary (0.4441ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 879.1537
```

Finished UTC: 2026-10-30T15:29:20.2968943Z. Exit code: 0.

### pnpm prisma validate

Started UTC: 2026-10-30T15:29:20.3050037Z

```text
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma\schema.prisma.
The schema at prisma\schema.prisma is valid 🚀
```

Finished UTC: 2026-10-30T15:29:24.9316560Z. Exit code: 0.

### pnpm --filter web exec tsc --noEmit

Started UTC: 2026-10-30T15:29:24.9354509Z

```text
```

Finished UTC: 2026-10-30T15:30:10.5406004Z. Exit code: 0.

### Result

- Product verification commands: **3 passed, 0 failed**. Unit cases: **13 passed, 0 failed, 0 skipped**. Prisma schema validation and TypeScript each exited 0.
- Git status before/after is identical. Intentional documentation changes are this new CLEANUP-LOG.md and the updated HANDOFF.md; both sit under the already untracked docs/ohmward directory. No product/source/config/migration files were changed by cleanup.
- All 1,749 protected source files match their pre-cleanup hashes. Eight detached junction targets and the real root/web dependency trees retain their original counts/bytes. No cleanup-induced failure, lost source or restoration was required.
- Removed 22 historical generated roots: **2,953,057,001 logical bytes (2.750 GiB)**. This includes the one isolated app copy, all eight Ohmward browser-output folders, fixture configurations/state, twelve conclusively owned synthetic clusters, and evidence annexes. There were no copied physical node_modules to delete: all such entries in the isolated app were links to protected real dependencies.
- Ambiguous KEEP items: `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793364952342_15782341` (1,664 bytes) and `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\labs\postgres\local_1793371170254_86f240af` (3,255 bytes). They lack sufficient Ohmward ownership proof and were skipped. No deletion approval is requested for them.
- pnpm/npm/Playwright caches and the shared PostgreSQL distribution were retained. No fixture-owned processes were running; **zero processes stopped**.
- `pnpm test:ohmward:integration` and the Playwright fixture are **retired under the new approach**. Prior retained-state/reuse invocations no longer work because their owned state and app copy were removed. Their scripts remain in source; do not run them to reprovision heavy artifacts. No integration, browser, screenshot, build or database checks were run during cleanup.
- **No migration, schema write, seed, backup or other operation was applied to any database during cleanup.** Prisma validation was schema-file validation only. Historical synthetic stopped database files were deleted directly from their verified owned folders; no real database was contacted or deleted.

## Start the development server

From `C:\Users\kirby\Desktop\lms-monorepo-skeleton`, run `pnpm dev:web`. Ohmward remains disabled unless the server environment has `OHMWARD_ENABLED=true`. Use the development-database procedure below before enabling it. Open `/ics/activities/ohmward` as an eligible ICS learner, or `/ics/activities/ohmward/instructor` as authorized ICS staff. No server was started by this cleanup.

## Development database: backup first, then apply the migration

These are **instructions for the user, not executed cleanup commands**. Use a new PowerShell terminal. Explicitly identify your DEVELOPMENT host, database and account; do not rely on repository .env values, which may contain live credentials. The commands below preserve .env files and use process-local settings only. Enter a hostname or IPv4 address. Use the SSL mode required by your development provider (`disable` only for a deliberately local, trusted connection; typically `require` for hosted PostgreSQL).

The retained PostgreSQL tools were kept. Their pg_dump must support your server version; a version-mismatch error stops this procedure. You can substitute a compatible installed PostgreSQL bin directory. The backup directory is outside the repository and should be kept private because it contains development learner data.

```powershell
Set-Location -LiteralPath 'C:\Users\kirby\Desktop\lms-monorepo-skeleton'
$ErrorActionPreference = 'Stop'
$pgBin = Join-Path (Get-Location) '.orchestra\local-worktrees\trusted-local-harness\.orchestra\runs\run_trusted_local_profile_20261009\checkpoint\bqual-01-phase-3\local-postgresql\distribution\pgsql\bin'
$env:PGHOST = Read-Host 'Confirmed DEVELOPMENT hostname or IPv4 address'
$env:PGPORT = Read-Host 'Confirmed DEVELOPMENT PostgreSQL port'
$env:PGDATABASE = Read-Host 'Confirmed DEVELOPMENT database name'
$env:PGUSER = Read-Host 'DEVELOPMENT database migration/backup user'
$env:PGSSLMODE = Read-Host 'DEVELOPMENT SSL mode (provider requirement)'
$devSecret = Read-Host 'DEVELOPMENT database password' -AsSecureString
$env:PGPASSWORD = [Net.NetworkCredential]::new('', $devSecret).Password

# Explicit process-local Prisma target; never print the resulting URL.
$encodedUser = [Uri]::EscapeDataString($env:PGUSER)
$encodedPassword = [Uri]::EscapeDataString($env:PGPASSWORD)
$encodedDatabase = [Uri]::EscapeDataString($env:PGDATABASE)
$env:DATABASE_URL = 'postgresql://{0}:{1}@{2}:{3}/{4}?schema=public&sslmode={5}' -f $encodedUser,$encodedPassword,$env:PGHOST,$env:PGPORT,$encodedDatabase,$env:PGSSLMODE

$backupDirectory = Join-Path $env:USERPROFILE 'Documents\lms-dev-backups'
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$devBackup = Join-Path $backupDirectory ('lms-dev-before-ohmward-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
& (Join-Path $pgBin 'pg_dump.exe') --format=custom --file $devBackup
if ($LASTEXITCODE -ne 0) { throw 'Backup failed. Do not migrate.' }
& (Join-Path $pgBin 'pg_restore.exe') --list $devBackup | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Backup archive could not be listed. Do not migrate.' }
Get-Item -LiteralPath $devBackup | Select-Object FullName,Length

# Read-only inspection of this explicitly selected DEVELOPMENT database.
pnpm prisma migrate status
```

Read the status output. A pending migration can make `migrate status` exit nonzero; distinguish that from a connection or migration-history error. Continue only if **the sole pending migration is `20261030000100_ohmward_foundation`**, the existing migration history is otherwise healthy, and the backup succeeded. If other migrations are pending, the database is unbaselined, history diverges or any previous migration failed, stop and resolve that development-history issue separately; do not apply unrelated migrations as part of this instruction. If Ohmward is already applied, skip deployment. Never use a reset command to resolve status here.

Only after those conditions hold, execute:

```powershell
pnpm prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migration failed. Leave Ohmward disabled and inspect the error.' }
pnpm prisma migrate status
if ($LASTEXITCODE -ne 0) { throw 'Migration history is not up to date. Leave Ohmward disabled.' }
pnpm prisma generate
if ($LASTEXITCODE -ne 0) { throw 'Client generation failed. Leave Ohmward disabled.' }
$env:OHMWARD_ENABLED = 'true'
pnpm dev:web
```

`migrate deploy` applies every pending migration, which is why the single-pending-migration condition is required. The kept Ohmward SQL creates the three focused tables, constraints, indexes and related persistence protections; it does not seed learner accounts or assign academic grades. `pg_restore --list` checks that the backup archive can be read; it is not a restore rehearsal. No restore rehearsal is requested or performed. Keep the backup for recovery and close this terminal after stopping the server to discard the process-local credentials. No credentials were printed or written by these instructions during cleanup, because these commands were not executed here.

## Cleanup-only temporary working files

Removed temporary cleanup scripts, inventories and hash-only metadata from `C:\Users\kirby\Desktop\lms-monorepo-skeleton\tmp\ohmward-cleanup-work`: 1915698 bytes, 12 files, zero reparse points. This folder was created solely during this cleanup. The required initial git output, classifications, target-count checks and verification output were first preserved above; no source snapshots were retained.

## Disk space after cleanup

Measured UTC 2026-10-30T15:31:57.5344413Z: C: free **23708819456 bytes (22.081 GiB)**. Before cleanup: 20,705,443,840 bytes (19.283 GiB). Historical artifacts deleted: 2,953,057,001 logical bytes (2.750 GiB), plus the small cleanup-only metadata folder. Free-space changes include allocation and concurrent system activity, so they need not equal logical deleted bytes exactly.

Cleanup finished. Sprint 2 was not started. No database was contacted or migrated.
