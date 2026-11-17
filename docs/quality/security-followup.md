# Security remediation follow-up

## Status on 17 November 2026

The follow-up MFA/compatibility/CI changes are committed as `6c37f288e987af5596b4fd47cd93bfe3d18fba11`. The clean full re-audit target is now `5dc0a42963b241ca0bbaa1711ad6318fe0b9f202`, tagged `security-audit-target-2026-11-17-r2`. It includes a one-byte correction found during the real local browser check: the database restore page contained a Windows-1252 en dash that Next/SWC could not compile. Replacing it with an ASCII hyphen changes no authorization logic. The web typecheck passes afterward; strict decoding of 1,846 tracked code/config files finds no invalid UTF-8.

Final native verification passes all 36 security regressions, 10 adapted legacy admission/revocation controls, 30 CodeLab tests, 69 harness tests and web/mobile/desktop/harness typechecks. The broad inventory is 514 tests: 505 pass, 8 fail, 1 skip; its exact failure names match the pre-fix baseline. All discovered web library units are 374: 373 pass, 1 fail, with the same baseline navigation-label expectation. These inventories are not wholly green. Evidence remains in ignored `tmp/security-followup/native-final/FINAL.json`, `RESULTS.md` and command logs; the encoding-only web recheck is in `logs/encoding/`.

The actual local Brave browser journey passes six checks against a fresh dummy PostgreSQL/current-schema fixture: password-only privileged admission returns 202 without an ordinary session and protected identity 401; authenticator verification still requires recovery acknowledgment; acknowledgment admits the administrator; restore explains existing-row restrictions and rejects snapshot summaries; the exact source Arduino starter emits `LED ON`; and an authenticated browser-context activity API request normalizes 100 percent to 10 points for a 10 point coursework item. The last check is an API request, not mouse assembly. An external editor CDN request was deliberately blocked, with two opaque browser Event errors recorded; the verified starter and assertion paths still pass. This does not establish arbitrary template compatibility or offline editor asset loading. Both owned app and PostgreSQL processes were stopped. See `tmp/security-followup/browser-final/RESULTS.md`.

Docker is running again. Full standard re-audit run2 uses a separate clean detached checkout. The platform interrupted the upload/privacy reviewer with its cybersecurity safeguard, so this pass is explicitly incomplete: 6 units source-reviewed, 1 unvalidated candidate and 66 deferred units, 73 total after preserving newly discovered boundaries. All 23 prior units were reopened. No post-wave or final-clean critic ran, and no candidate received independent runtime/final-record verification. The one source hypothesis remains only in the candidate queue/ledger; findings.json contains no validated records and is not a clean security verdict. REPORT.md, FINDINGS-DETAIL.md and NEEDS-VALIDATION.md disclose the interruption; both format validators pass. The parent did not retry or rephrase the blocked review. Completed fixes/tests are retained. Operational native/browser/live-read receipts remain separate from full-audit evidence.

Production deployment, real administrator MFA device enrollment, MFA key/schema rollout, current proxy/header verification and proof of shipped native build configuration remain outstanding. The 15 November configured-database inspection and hosting observations below are historical observations, not revalidated 17 November facts. Its one above-maximum historical quiz grade still requires incident/data-integrity triage; no real records have been changed. Dependency advisory matches remain unresolved and are not evidence of application exploitability by themselves.

## Pinned source and review

The original remediation is committed on `codex/security-remediation-2026-11-15` as `eebc86b4db525d0c7e59ede2e590a7bb185fccb6`, tagged `security-remediation-2026-11-15`. Its immediate pre-fix parent is `519ae46499c07e17c2678c7d3a9329f194e96e3d`; the historical regression revision `ef23ea19b587768633857ae4d9a3e4b115b470a5` and November8 audit describe earlier source and are not interchangeable with that parent.

The parent reviewed the remediation diff, including the admin-database allowlists, grader, parser/playback, course guards, score serialization, callers and fixtures. No new authorization blocker was identified during that review. The subsequent compatibility/MFA changes and browser-discovered encoding correction have their own committed target and validation described above; the independent full re-audit remains unfinished after the platform interruption.

## Native Windows comparison

Baseline and fixed checkouts are separate disposable local copies, with scratch-local user/config/cache directories, an empty allowlisted process environment and a dummy database URL. Neither imports root dotenv files or real credentials. The owner explicitly requested native installs/tests, so this operational baseline uses native Windows processes rather than claiming Linux-sandbox results are equivalent.

Both revisions completed `pnpm install --frozen-lockfile`, Prisma generation and Next type generation. Node v25.8.0 and pnpm10.32.1 satisfy the repository engine/package-manager constraints. Both revisions pass web, mobile, desktop and harness typechecks. The former missing `practicumLessonPlanFile` and CodeMirror errors disappear after installing/generating; they were not established as application-source failures.

| Inventory | Pre-fix parent | Original fixed commit |
|---|---|---|
| Broad native Node inventory | 500 tests:491 pass,8 fail,1 skip | 504 tests:495 pass,8 fail,1 skip |
| All discovered web library unit files | 374 tests:373 pass,1 fail | 374 tests:373 pass,1 fail |
| Harness unit suite | 69 pass | 69 pass |
| Web/mobile/desktop/harness typecheck | Each passes | Each passes |

The broad Node failure names match exactly between revisions; there are no new failures in that comparison. Existing prerequisites include the protected signer/runtime fixture, an intentionally unreachable dummy database, and source/mock expectations. Two test files also need the web tsconfig for TSX aliases; their nine cases pass under that normal configuration. The web unit failure is the unchanged `Tasks` versus `Tasks & Calendar` label expectation. This is not a claim that the whole existing suite is green.

Evidence is retained under ignored `tmp/security-followup/native/`, including `comparison-node.json`, per-command logs and dependency summaries. The original committed security regression results remain historical records of their own revision.

## Behavior compatibility and administrator notice

The exact source-defined Arduino starter contains `Serial.begin(9600)` and literal `Serial.println` calls. The original bounded parser rejected them. Follow-up support parses those calls into typed data; arbitrary code, expressions, escapes and unsupported libraries remain rejected. String-aware scanning preserves comment markers and semicolons inside supported literal messages. Preview output is capped at128 lines/16KiB plus one truncation notice; server grading ignores serial output. Tests exercise the exact instructor default, its dummy circuit, serial limits, bounded preview output and the exact default OR truth table.

SubmitBar now reports the server's returned score and maximum, rather than promising later instructor grading after an already-graded submission. Sequential `D_FF` circuits and blank-target/free-build logic remain unsupported for assessed submission. General C++ sketches remain unsupported. Do not assign those unsupported modes for credit without adding a reviewed grading contract. Existing rack instructions describe a stricter topology/subnet than the simplified reachability grader; the re-audit must assess that policy gap rather than assume every instructional condition is enforced.

The configured live inventory currently contains seven CodeLab templates and no persisted Arduino/logic templates. Compatibility tests use source-defined defaults and synthetic circuits; no private instructor fixtures or student answers were copied into tests. No claim of a passing live browser assessment journey is made.

Administrator release notice, ready for the deployment communication:

> Institute database tools remain available. Exports contain only your institute's permitted records, exclude authentication secrets, and return up to500 records per request; an export is not a complete database backup. Restore updates existing records only: User name/bio/phone/department/yearLevel; Course title/description/subject/room; SyllabusItem title/description. Keep imports within1MiB and1â€“500 rows. New rows, credentials, roles, ownership and nested records must use their dedicated management workflows. Any unauthorized target rolls back the entire batch. Snapshot downloads are summaries without record data and cannot be restored. Arrange genuine backups through the database operator before relying on recovery.

The in-app restore modal already states the restrictions. The notice has not been sent externally or represented as deployed behavior while the release is pending.

## Configured database inspection and incident triage

The database and hosting observations below were captured on15November2026. They have not been revalidated as current deployment facts on17November.

The owner authorized read-only inspection of the configured database after environment identification. Root and web local settings identify the same Neon endpoint (non-secret fingerprint `702e6b441911cb2e`). Local files do not identify its hosting environment/branch, so these are facts about the configured live database, not a proven match to the Vercel production database secret.

The trusted operator-side script imported only the PostgreSQL driver, never application code. It used verified TLS, a repeatable-read READ ONLY transaction,6-second statements,500ms lock waits, bounded samples and rollback. Reports contain counts, role flags and numeric triage context only, without credentials, student identities or answers. No grades/accounts/audit records changed.

- PostgreSQL17.12. The runtime principal is not a superuser, owner of the checked application tables, role/database creator, replication role or RLS bypass role; it has no role memberships.
- The checked application tables have no RLS policies enabled. Session, User, Course and StudentSubmission have active non-internal triggers. Tenant isolation therefore depends on the application authorization layer and relevant database guards, not an assumed row-policy backstop.
-22 activity submissions: zero institute or template/coursework mismatches. There are no non-CodeLab score100/passed=true records, so no explicit unsolved full-mark record was found.
-60 gradebook records: zero institute mismatches; one grade exceeds its current coursework maximum.
-No database restore/export audit actions were found. Export endpoints do not emit such an audit event, so absence of logs does not establish that exports were unused.
-Four ADMIN accounts and one SUPER_USER account currently have no MFA factor table deployed. No real account was enrolled or given fabricated recovery codes.

**Incident/data-integrity triage flag:** one historical QUIZ row stores grade50 against maximum2, statusSUBMITTED and returned=true. It has no linked activity submission, so it does not by itself demonstrate exploitation of the activity-submit flaw. Preserve the row and related history; review form normalization, manual grading and maximum-point changes before deciding how to reconcile it. The check made no correction and does not assert that an attacker caused this anomaly. No suspicious activity/cross-institute row was found within the complete checked sets, which are below the50,000-row safety cap; this cannot prove the old holes were never used.

Sanitized operator evidence remains in ignored `tmp/security-followup/configured-database-review.json`.

## Hosting, providers and distributed clients

Read-only Vercel UI inspection identifies project `lms-cdm` under scope `kaz14`. Production `CODELAB_RUNNER` is `onlinecompiler`, and an OnlineCompiler key is configured. JDoodle credentials also exist, but JDoodle is not selected. No key value was revealed or changed.

The displayed production deployment is commit `7d64a955e064b4f018cfe322f45ca82486f6e2e3` from November5. Vercel reports deployments paused since November6 for Hobby CPU fair-use limits, ending December6. No redeploy, rollback, upgrade or payment was attempted. Source fixes and MFA must not be described as deployed to that revision.

OnlineCompiler's [published security contract](https://onlinecompiler.io/security) claims fresh gVisor sandboxes and disabled external networking. This is a documented provider dependency, not an independently observed sandbox guarantee. The current application has no host-execution fallback and production rejects JDoodle. Authenticated reviewed Judge0 offers an application-specified `enable_network:false`, but a request flag still depends on the provider enforcing it. Retaining the currently configured OnlineCompiler is acceptable only with that explicit trust assumption; no hosted malicious-program test or paid quota was used.

Source includes security headers/origin enforcement, Electron packaging and Expo iOS/Android configuration. Live proxy header behavior and actual Electron/app-store distribution have not been established. The owner reports mobile works; that is not a signing/store-release attestation.

## Dependency and CI checks

The fresh fixed checkout's advisory scan reports116 total advisory matches (14 low,46 moderate,54 high,2 critical), and49 production matches (7 low,16 moderate,25 high,1 critical). Counts are registry advisory matches in dependency paths, not confirmed reachable application vulnerabilities.

- Production critical: Expo/react-native/react-devtools-core transitively selects `shell-quote@1.8.3`; [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p) lists1.8.4 as patched. Reachability depends on the devtools shell-token input path; the audit must distinguish build/dev tooling from shipped student code paths.
- Additional all-dependency critical: desktop electron-builder/app-builder-lib selects `tar@6.2.1`; [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) lists7.5.19 as patched. A blind major override is not a tested compatibility fix.

No automatic dependency repair or lockfile change was made. Full JSON evidence is in the native scratch logs.

Both GitHub workflows now pin all eight action uses to the exact public upstream v4 commits resolved for this change: checkout`11d5960a326750d5838078e36cf38b85af677262`, setup-node`49933ea5288caeca8642d1e84afbd3f7d6820020`, upload-artifact`ea165f8d65b6e75b540449e92b4886f43607fa02`, and pnpm/action-setup`b906affcce14559ad1aafd4ab0e942779e9f58b1` (the peeled annotated tag). Workflow pinning does not claim the dependency gate or CI run is green.

## MFA and re-audit status

The owner selected LMS authenticator apps and recovery codes. Implementation and fresh independent source review are complete. The follow-up adds encrypted TOTP secrets, single-use recovery codes, primary-only pending challenges, atomic one-time session admission, and revocation triggers for account/factor changes. Real MFA API cookies, enrollment acknowledgment, concurrent replay, administrative cancellation, institute boundaries and ordinary student behavior are covered by the current-schema fixture. A premature-completion error-handling failure found during testing was corrected by awaiting the asynchronous completion inside the route's error boundary. See `admin-mfa.md` for rollout requirements. Real deployment requires the migration, a protected wrapping key and actual device enrollment; none has been applied to the configured database or hosting project.

On17November, the final follow-up passed all36 targeted security tests in both the offline Docker fixture and the native Windows dummy database, with no failures/skips. The original six results remain `not reproduced`. Web/mobile/desktop/harness native typechecks pass; the corrected web route was typechecked again. All30 CodeLab contract/completion cases and69 harness cases pass. Two legacy mock fixtures were updated to preserve their original invariants while modeling the new cookie-clearing and transactional MFA revocation behavior; their10 cases pass. The final comparable broad Node run and a separate real local browser check are recorded separately under `tmp/security-followup/native-final/` and `browser-final/`; this statement does not claim a fully green existing suite or browser journey.

The refreshed17November registry scan still reports49 production matches (6low,17moderate,25high,1critical) and116 all-dependency matches (13low,47moderate,54high,2critical). The totals/critical counts match15November, but this is not a literal severity reclassification: the current scan no longer matches low deepmerge advisory `GHSA-gcqx-w48m-w2h4` and newly matches moderate Next advisory `GHSA-mfr8-8qww-v76h`. The lockfile remains unchanged.

The follow-up is pinned by local tag `security-audit-target-2026-11-17`. The full `standard` re-audit starts from that committed clean source, reads the November8 ledger/findings and remediation evidence, and makes every prior deferred/blocked/needs-validation unit current work. It must cover the newly added MFA code and the compatibility/CI changes too. No clean critic or full-coverage claim is made before those stages finish. Deployment, real device enrollment and delivery of the administrator rollout notice remain operator actions.
