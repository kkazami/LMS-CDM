# Sprint 4 synthetic staging and recovery

## Local evidence

The current Prisma-schema staging test runs in an ephemeral PostgreSQL 17 container without published ports or external network access. Its API runner uses only the isolated loopback namespace, fixture credentials and explicitly allowed workflows. The staging case passed student/instructor course reads and MFA-admin metadata export auditing. A custom-format dump restored three dummy users, one course, one enrollment and one export audit event into an empty disposable database. The dump stayed inside the temporary container. [Verification record](sprint-4-verification.json)

The separate restricted-role/RLS fixture restored three synthetic courses and rechecked role isolation, grants, transaction context and record integrity. Creating the recovery database and restoring the previously generated archive took 78 ms. The recovery fingerprint was `e9853630892e620785f0f4729cd6a4e7|3`. This small fixture leaves full service recovery and actual Prisma/Neon pooling unverified. [RLS pilot](postgresql-rls-implementation.md)

| Surface | Evidence and ordinary verification still due |
|---|---|
| Web portal | Offline production compilation and scoped regressions. Exercise normal browser navigation, sign-in/out, cookie transition, session management and classroom flows against an approved synthetic staging deployment. |
| Mobile | SDK matrix, typecheck and Android/iOS JavaScript and asset exports. Exercise real-device login, recovery and logout, deep links, notifications, WebView handoff and signed update/rollback before release. |
| Electron administrator console | Local typecheck and unsigned source compilation evidence. Rebuild and test the signed package, login and cookie handling on supported operating systems before distribution. |
| Classroom and grading | Ordinary course reads plus selected CodeLab and gradebook regressions. Exercise instructor setup, CodeLab and Ohmward, attendance, assessments and gradebook creation and review with synthetic courses. Keep earlier blocked cases excluded. |
| Connected features | GitHub, Knowledge Exchange, class coordination and hosted notifications still need ordinary synthetic workflows in the approved environment with dedicated application credentials. No live provider was called. |
| Administrative operations | Existing authorized export regression and real staging export audit. Separate approval is needed for production keys, enrollment, DB privileges and release. |

Record candidate commit, lockfile hash, build ID, fixture manifest, environment isolation, workflows, observed results, artifact checksums and owner for every future run. Keep mocked assertions, verified SQL behavior, actual devices and operator/production evidence distinct. The allowlist excludes prior blocked investigations and broad suite discovery.
