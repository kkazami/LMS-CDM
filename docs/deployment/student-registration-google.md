# Student registration and Google sign-in

Implemented 24 October 2026. Publish through the main-branch Vercel deployment after configuring the Production environment below.

## Account and access flow

- `/register` accepts full name, email, student ID, password, confirmation, institute, and policy consent. New student IDs must be two digits, a hyphen, and five digits, for example `26-12345`. Email and student ID must be unique. Passwords follow the existing strength policy and are hashed with bcrypt.
- Public input cannot set staff roles, permissions, activation state, or an arbitrary institute ID. Accounts are created as active `STUDENT` accounts in ICS, ITE, or IBE.
- Registration signs the student in and sends them to `/join-class`. Password login supports email or student ID and returns `user.requiresEnrollment` for mobile clients.
- Every ordinary session consumer, including APIs and server actions, requires an approved enrollment in an active class belonging to the student's registered institute. Dashboard requests redirect to the join screen. Authentication metadata, logout, and the join endpoint remain available before enrollment.
- `/api/student/join-class` derives the institute from the live account, never from submitted institute fields. A valid code immediately approves enrollment. Foreign and archived classes are rejected. Repeated joins are idempotent. Previously declined students must contact their instructor. Course discovery requests still require instructor approval.
- The requirement also applies to existing students without an active class. Pending, foreign, removed, and archived enrollments grant no institute-feature access. Staff roles retain their existing access rules.
- Web and native mobile support password registration and joining a class. Google OAuth runs in the web portal; the native registration screen links to it. Native Google sign-in and automatic browser-to-native token handoff are not implemented. A Google-created account also has a password and can sign into the native app with it.

## Google Cloud configuration

Use the existing **Web application** client. The screenshot already includes the needed origins:

```text
https://lms-cdm.vercel.app
http://localhost:3000
```

Authorized redirect URIs must include both exact values:

```text
https://lms-cdm.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

The screenshot includes only the localhost redirect. Subsequent direct checks with the configured client reached Google's sign-in page for both callback URLs without `redirect_uri_mismatch` or `invalid_client`. A separate token-endpoint check using a deliberately invalid code returned `invalid_grant`, indicating the configured client credentials were recognized. These checks do not replace an interactive login. Add extra origins and redirects only for domains you actually use. A `127.0.0.1` or preview hostname is a different origin and needs its own authorized callback and matching configuration.

Configure these server-only variables:

| Variable | Local `apps/web/.env.local` | Vercel Production |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Existing web client's ID | Same web client's ID |
| `GOOGLE_CLIENT_SECRET` | Existing client secret | Existing client secret, stored as a secret |
| `APP_BASE_URL` | `http://localhost:3000` | `https://lms-cdm.vercel.app` |

Local files are not uploaded as Vercel environment configuration. Configure Vercel separately, then deploy so the values reach the running application. Do not use production `APP_BASE_URL` during local login: OAuth must return to the same browser origin that holds the state cookie.

Review Google Auth Platform's Audience and publishing configuration for the intended student audience. Only `openid`, `email`, and `profile` are requested. Google documents an exception allowing these basic identity scopes without the Testing allowlist; Workspace administrator restrictions can still apply. Gmail and Drive access are not requested. [Google's app-state reference](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).

The implementation uses Google's authorization code flow with PKCE, state, nonce, verified email and signed ID-token validation against Google's keys. OAuth context and pending registration identity are stored in encrypted, HttpOnly, short-lived cookies. Existing LMS accounts require their current password before linking Google; existing account data and credentials are preserved. Subsequent Google login uses the stable Google subject identifier. [Google OpenID Connect documentation](https://developers.google.com/identity/openid-connect/openid-connect).

## Database migration

`prisma/migrations/20261023090000_student_self_registration/migration.sql` adds the nullable `User.googleSubject` column and its unique index. It is additive and replayable; no existing student, password, enrollment, role, or grant is rewritten.

The migration was applied to the configured Neon database using the separately supplied owner connection through hidden terminal input. The restricted runtime account successfully read the new column, and `application_boundary_qualified()` remained true. Existing account/session security triggers were preserved. The owner connection was not saved or substituted for the runtime connection.

Sanitized receipt: `tmp/student-registration/migration-*.json`. This targeted application does not edit Prisma's migration ledger. The normal owner-controlled migration pipeline can replay and record the migration later. Do not run unrelated pending migrations just to record this one.

The operator entrypoint is `node scripts/install-student-registration.mjs --apply --owner-stdin`. It checks owner/runtime database identity, uses verified TLS, validates the resulting column/index, and verifies the runtime security boundary.

## Verification

Run:

```text
node tests/auth/student-registration.integration.mjs --browser
node --test tests/web-quality/sessions.test.cjs tests/auth/login-diagnostics.test.cjs tests/auth/login-policies.test.cjs
pnpm --filter web exec tsc --noEmit
pnpm --filter mobile typecheck
pnpm harness:test
pnpm harness:typecheck
pnpm build:web
```

The integration runner owns a disposable loopback PostgreSQL database and uses synthetic accounts. It exercises real route handlers, session code, password checks, enrollment writes, JWT verification and cookies. Google HTTP responses and signing keys are substituted only in the OAuth protocol tests. Browser tests run an isolated copy of Next.js and check desktop/mobile layouts, registration, direct feature API denial, foreign-code rejection, same-institute unlocking and Google initiation.

Real Google account consent and production redirects require a final interactive smoke test with the configured client and deployed application. Project-scoped Vercel metadata now confirms `APP_BASE_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` are present in Production. The two Google credentials are saved as secrets. Their saved values were not read back. No native device runtime test or production account creation was performed.

Verification results: the focused suite passed 15 database/protocol checks and four browser checks; the 10 login/session regression tests and 69 harness safety tests passed. Web and mobile TypeScript checks, harness typecheck, and the production web build passed. The older roster integration suite passed its three initial upgrade-preservation checks, then stopped at a stale full-schema fixture comparison (including missing Arena tables and `User.securityPin`). That suite is not reported as passing.

Final focused evidence: `tmp/roster-import/student-registration-1792795529894/report.json`. Build log: `tmp/student-registration-build.log`. The focused run also verifies that another institute's course/announcement endpoints deny access, and that announcements from unjoined classes are excluded. An earlier browser run overlapped Prisma client regeneration and failed to start; the completed standalone rerun passed.

Release validation on the latest main baseline (`efed220`): production build, mobile typecheck, 10 authentication regressions and the 19-check focused suite passed. The browser run additionally checked that ITE Focus, Practicum and Meetings return no feature data before enrollment and succeed after a matching ITE class code. Release evidence is under `tmp/registration-release/` in the originating workspace.
