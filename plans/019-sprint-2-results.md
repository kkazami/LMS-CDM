# Sprint 2 — Web workflows, sessions, files and bounded views

Status: **DONE locally; deployment and real scanner/hosting verification pending.** No live migration or deployment has been performed. Work is on `codex/sprint-2-web-quality`, carrying the existing uncommitted Sprint 1 and user work. Mobile screens and the mobile aggregate grades API remain untouched.

## Implemented changes

- **Sessions and browser security:** 30-minute inactivity and seven-day absolute lifetime; refresh cannot extend either boundary. Foreground input can renew activity through the existing visible web heartbeat; hidden/idle/background polling cannot. Password changes share the existing password policy and atomically revoke every session. Cookie/bearer identity precedence and the dedicated role ceilings remain covered. Internal session IDs are no longer bearer credentials.
- **CSRF, HTML and cache boundaries:** mutation-origin checks before legacy handlers and middleware, nonce-based production script CSP, server sanitization of new and historical note HTML and plain-text editor paste. Private/no-store responses and a public-assets-only service worker prevent cached account pages/API data from surviving sign-out in the old LMS cache. Next document rendering is dynamic for fresh nonces.
- **Files:** generated private asset URLs and PostgreSQL byte storage replace new public/filesystem/data-URL fallbacks. Signatures, extensions, MIME, bounded bodies, upload concurrency, owner quota and scanner verdicts are enforced before persistence. Reads verify ownership or a permitted persisted resource; submission files load separately from the gradebook. Private avatars bypass the image optimizer because it does not forward session cookies, and the anonymous leaderboard uses initials for those private avatars. Old public files still need a controlled historical migration.
- **Bounded work:** 50 students per gradebook page, with all supported graded activities up to 200 and explicit errors for oversized interactive histories. Matrix files contain short authorized links instead of embedded bytes. Risk analytics pages 50 enrollments and narrows history to those students/courses, with an explicit 2,000-activity guard. Counts, search and risk order are labelled as applying to the page. Visible study polling avoids overlap/idle traffic; CodeLab permits four pending provider executions per warm process. The production database pool remains unchanged.
- **Web interactions:** named search dialog, keyboard containment and focus return, explicit WebKit invoking-button focus, semantic grading button and labelled grade input/dialog. Login waits for React readiness before accepting input so early typing is not lost during hydration. The delayed virtual-keyboard focus scroll is restricted to narrow viewports, avoiding a moving desktop sign-in button in WebKit. A dashboard error boundary provides a retry action.

Two connected dependencies expanded the starting file list: the service worker ignored private response headers, and the shared API client's mobile consumers expected a complete gradebook roster. The worker now caches only public assets; the shared client combines bounded server pages to preserve its prior complete-roster result without editing mobile screens. Its whole-roster memory cost remains a deliberate compatibility limitation.

## Executed evidence

| Check | Result |
|---|---|
| Existing regression suite plus session/resource checks | PASS — 77 tests, no failures/skips |
| Owned PostgreSQL academic/security/password scenarios | PASS — 17 scenarios; rollback and all-session revocation verified |
| Additive Sprint 2 migrations | PASS on an owned fixture with 413 existing synthetic accounts; existing session creation times preserved |
| 400 students × 100 graded activities | PASS — 40,000 grades, all eight student pages covered exactly once; 9,000 earned points/student preserved |
| Production build and web/shared-client typechecks | PASS — final production build and typechecks exit 0 |
| Chrome, Firefox, WebKit and 390px web browser matrix | PASS — 24 passed, 0 failed/skipped/flaky; no retries |
| Real ClamAV engine/signatures, deployment body limits, historical file migration | NOT VERIFIED — staging/release dependency |
| 400/1,000 concurrent users, hosting security, restore and human evaluation | NOT VERIFIED — Sprint 3 |
| Engineering harness safety tests / typecheck | PASS — 69 tests and typecheck; this does not constitute an independent product-release review |

Final receipts (all paths are repository-relative and ignored test output):

- `tmp/web-quality/sprint-2-node.xml`: 77 executed tests, zero failures/errors/skips.
- `tmp/web-quality/integration-1792501531526/report.json`: 17 PostgreSQL scenarios, PASS, owned cluster stopped.
- `tmp/roster-import/sprint2-1792501185681/report.json`: migration, 400-student measurement, production build and browser gates PASS; owned HTTPS server and cluster stopped.
- The same directory's `playwright.json`, `browser.log` and `build.log`: 24 passing real browser tests and production-build output. Browser versions on Windows: Chrome 155.0.8059.85, Firefox 155.0 and WebKit 26.6; this is not a physical Safari/macOS test.
- Tested product-source SHA-256: `96a127408cbdf235a48b6a8b39bfaca9ec39cd5211f6a924dd82c5fed930cd80`. The runner verifies the source remains unchanged between its build snapshot and completed browser run. Its fingerprint covers web source/public assets except legacy uploads, web package/config, shared API client, schema and lockfile.

Earlier failed browser runs remain in ignored temporary evidence; they exposed the login hydration, grading semantics, desktop focus-scroll and WebKit focus issues fixed here. Missing browser runtimes and test-only IP-rate-limit collisions were fixture/environment failures and were not counted as product passes. Harness tests initially could not create temporary Git metadata inside the Windows sandbox; the authorized unsandboxed rerun passed all 69 safety tests.

## Measurement interpretation

The runner measures the previous unpaged gradebook query/serialization shape and the new page on the same local database, using three sequential samples. It records payload bytes, elapsed time and SQL statement count. A page contains 50 of the 400 students and retains all 100 activities; the entire roster remains reachable across eight pages. The extra count query trades one SQL statement for bounded row/submission transfer. This is a local page measurement, not a concurrency benchmark or an import test.

| Local service + JSON measurement | Previous full roster | New first page |
|---|---:|---:|
| Students returned / activities retained | 400 / 100 | 50 / 100 |
| JSON bytes | 7,464,706 | 734,083 |
| Median elapsed time (three sequential samples) | 617.3 ms | 83.4 ms |
| Observed elapsed range | 518.7–913.7 ms | 77.0–96.3 ms |
| SQL statements, including course lookup | 5 | 6 |

The first-page payload is approximately 90.2% smaller. These timings include the local service queries and JSON serialization; they are not HTTP p95/p99, browser render times or a 1,000-user result. No CPU/RAM/production-storage measurement is claimed here.

Server matrix construction/serialization changes from O(students × activities + embedded file bytes) to O(page students × supported activities + bounded attachment metadata). Database roster count/sort/offset work still depends on dataset size; no constant-time query or deployment-capacity claim is made. Storage quotas, binary database storage and per-process admission also need hosting measurements.

## Reproduction and handoff

Run the baseline and focused regressions, then the owned integration/build/browser checks:

```powershell
node --import tsx --test tests/roster/rules.test.ts tests/program-head/meeting-links.test.ts tests/navigation/active-path.test.ts tests/calendar/student-calendar.test.ts tests/codelab/completion.test.cjs tests/codelab/runner.test.cjs tests/security/mutation-origin.test.cjs tests/auth/login-diagnostics.test.cjs tests/database/ssl-config.test.cjs tests/calendar/events-api.test.cjs tests/web-quality/security.test.cjs tests/web-quality/academic.test.cjs tests/web-quality/sessions.test.cjs tests/web-quality/resources.test.cjs
node --import tsx tests/web-quality/integration.mjs
node --import tsx tests/web-quality/sprint2.mjs
pnpm --filter web exec tsc --noEmit --incremental false
pnpm --filter web exec tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck ../../packages/api-client/src/index.ts
```

The Sprint 2 runner builds an isolated source copy in production mode, runs an owned HTTPS server and real browser login/API/server-action journeys, checks the product-source SHA-256 remains unchanged, and stops its own database/server. It supplies the dedicated Playwright configuration's required owned-target state; it cannot silently reuse production. Its functional matrix has a disclosed 100-login allowance for the single loopback IP while retaining product account limits. Product rate-limit defaults are unchanged. See `tests/web-quality/README.md` for browser prerequisites and fixture limitations.

Monaco is the unmodified installed distribution served at its configured CDN URLs for CSP testing; external CDN uptime and Judge0 live execution are not tested by that check. The scanner fixture checks the real clamd wire protocol and rejection/error handling but is not a malware engine. These are explicit limits, not an ISO certification or a new numerical software-quality grade.

Read [Sprint 2 deployment handoff](../docs/quality/sprint-2-deployment.md) before applying migrations or configuring scanning. Live scanner/storage, historical files, hosting limits and provider/proxy verification remain release gates. Sprint 3 still owns measured concurrency/capacity, backup restoration, provider controls, user feedback and the final six-characteristic quality assessment.
