# Six audit regression tests

## Before remediation — 14 November 2026

Tested against source revision `ef23ea19b587768633857ae4d9a3e4b115b470a5` with application code unchanged at that time. All six leads reproduced: six tests failed their secure-behavior assertions, with no skipped tests or fixture failures. This section preserves the original evidence; current source has since been fixed.

| Lead | Result | Exact bounded observation | Test |
|---|---|---|---|
| 1. Student-selected activity grade | Reproduced | HTTP 201; existing dummy grade changed from 37 to 100; ActivitySubmission stored score=100 and passed=true for stateCheck={solved:false,poweredOn:false}. | `audit-regressions.test.cjs`, regression 1 |
| 2. Template authorization | Reproduced | HTTP 201 for both an unenrolled same-institute template and a different-institute template; each created one ActivitySubmission and one StudentSubmission grade record. | `audit-regressions.test.cjs`, regression 2 |
| 3. Generic restore authority | Reproduced | HTTP 200 and restoredCount=1 in each case: another institute's dummy student bio changed, and a same-institute dummy student's password field changed without the dedicated reset flow. | `audit-regressions.test.cjs`, regression 3 |
| 4. Generic export scope | Reproduced | HTTP 200; User export contained the other institute's dummy ID/email (`foreign-student`, `foreign@example.invalid`). | `audit-regressions.test.cjs`, regression 4 |
| 5. CodeLab template fixtures | Reproduced | HTTP 200 for each unauthorized course. Response contained input=`private-input-course-b` or `private-input-course-foreign` and expectedOutput=`fixture-output`; the fake provider was invoked once for each. | `audit-regressions.test.cjs`, regression 5 |
| 6. Hidden form score | Reproduced | Actual form submission/scoring persisted grade=10 and isReturned=false. Primary grades response returned score=null; classwork and submissions each returned grade=10. | `audit-regressions.test.cjs`, regression 6 |

Run from the repository root with PowerShell 7:

```powershell
pwsh -NoProfile -File tests/security/run-audit-regressions.ps1
```

The original pre-fix exit code was 1. Every test asserts the secure result; do not invert assertions to make this suite green. Test setup/infrastructure errors are distinguished from an observed security violation. The launcher prints its result directory containing `results.json` and `test-output.txt` under gitignored `tmp/security-regressions/`.

Before-fix recorded run: `tmp/security-regressions/audit-f693eb00c8a647d69000e6125ed0fe70/`.

## After remediation — 15 November 2026

Final targeted fixture: `tmp/security-regressions/audit-cbac44bd7fd740a69fc250854c0eda04/`. The targeted suite passed **22 tests, zero failures and zero skips**. The six original regressions remain permanent, with sibling, server-grading, normalized-point and Arduino preview coverage added. The full-check fixture `audit-9876e0a8149f43678ec1491f1c060f5e` used identical application source; the final targeted rerun additionally checks both grading-mutation serializers.

| Lead | Result | Exact observed secure result | Test file |
|---|---|---|---|
| 1. Student-selected activity grade | Not reproduced | HTTP 400; existing grade remained 37; no activity score or passed record was written. A separate valid-answer control wrote score 0/grade 0 for an invalid assembly and score 100/grade 10 for a valid ten-point assembly. | `tests/security/audit-regressions.test.cjs`, regression 1 and raw-answer integration; `activity-grading.test.ts` |
| 2. Template authorization | Not reproduced | Unenrolled same-institute template: HTTP 403; foreign-institute template: HTTP 404. Both created zero activity submissions and zero grade records. | `tests/security/audit-regressions.test.cjs`, regression 2 |
| 3. Generic restore authority | Not reproduced | Original foreign-profile and password payloads: HTTP 400, unchanged target fields, no restored count. Sibling test with only a foreign ID and otherwise writable `bio`: HTTP 404. Authorized local profile patch: HTTP 200; a mixed local/foreign batch: HTTP 404 and local change rolled back. | `tests/security/audit-regressions.test.cjs`, regression 3; `admin-database-cases.cjs` |
| 4. Generic export scope | Not reproduced | HTTP 200; foreign dummy user absent. Inspector rows and counts matched the administrator's institute; authentication/secret model selections returned HTTP 403. | `tests/security/audit-regressions.test.cjs`, regression 4; `admin-database-cases.cjs` |
| 5. CodeLab template fixtures | Not reproduced | Unenrolled course: HTTP 403; foreign course: HTTP 404; both had zero provider calls and no input/expectedOutput in the response. Authorized course control returned HTTP 200 and its dummy fixture. | `tests/security/audit-regressions.test.cjs`, regression 5; `codelab-authorization-cases.cjs` |
| 6. Form score inconsistency | Not reproduced under owner policy | Stored grade=10, isReturned=true; course grades score=10, classwork grade=10, own submissions grade=10. Authorized student/instructor sibling APIs and CSVs returned the same score; peers and unrelated readers were denied. | `tests/security/audit-regressions.test.cjs`, regression 6; `score-visibility-cases.cjs` |

The owner explicitly chose score visibility for the student and instructor. Regression 6 therefore tests that policy, including historical `showScoreAfter=false` rows; it does not claim that the previous hidden-score requirement was retained. Answer-key and feedback restrictions remain separately tested.

The command above should now exit 0 for the targeted suite. Add `-FullChecks` to attempt the complete existing Node/unit/typecheck/Playwright/integration inventory; that aggregate can exit 1 for unrelated failures or unavailable prerequisites. Final full-check results and the invariant-to-file mapping are recorded in `docs/quality/security-fixes-2026-11-15.md`.

## Fixture and execution boundaries

- Current `prisma/schema.prisma` is converted to SQL using installed Prisma 7.9.1 and its locally cached schema engine. This SQL-only tool uses an explicit standalone config and an empty allowlisted environment; it does not load repository config or dotenv files, connect to a database, or generate the Prisma client.
- All route execution and fixture processing take place in a read-only Node container. PostgreSQL 17 runs in a separate disposable container with `--network none`; Node joins only that container's loopback namespace. No ports are published. Images use `--pull=never`; no installs or external requests occur.
- The source copy contains application TypeScript, shared types, the reviewed boundary installer/SQL and these tests, without dotenv files. Source, schema and installed dependencies are mounted read-only. Writable paths are bounded scratch/tmp shared-memory mounts. Capabilities are dropped, privilege escalation is disabled, and CPU, memory, process, open-file, file-size and wall-clock limits apply.
- The database starts empty. All users/institutes/courses/answers and credentials are dummy-only. The production Super User boundary installer and administrator/credential/student-assignment successors are installed; the application role has restricted flags, no ownership/membership and passes the real `applicationWriterQualified` check. No deployed policies or database are consulted.
- Tests use real database-backed opaque-token session validation, API guards, course/enrollment checks, ORM transactions, form scoring, gradebook synchronization and response serializers. Next.js headers/cookies are supplied by a per-request AsyncLocalStorage adapter, rather than running a web server. Session admission, successful enrolled-course reads, denied unenrolled-course reads and successful authorized CodeLab execution are prerequisite controls.
- Stubs cover only Next's after callback, activity rewards and the external CodeLab runner. The runner returns synthetic data without executing student code. External fetch throws; the OS namespace also denies external egress.
- Fixture containers are removed in the launcher's finally block, destroying the database. The same sandbox is used for optional broad checks; container cleanup is checked after completion.

These are direct route-handler integration tests on the current schema, not deployed HTTP/proxy, browser, provider-isolation or historical migration-replay tests. The November 8 audit records have not been rewritten or promoted to a new verdict in this step.
