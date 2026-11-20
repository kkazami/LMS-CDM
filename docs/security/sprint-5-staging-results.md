# Sprint 5 synthetic staging

## Local evidence

The allowed suites run in bounded Docker containers, with public pinned dependencies and no external network. PostgreSQL is in its own disposable loopback namespace with no published ports, using an exact current-schema companion. The permitted password writer starts from a pre-admitted synthetic account with approved course enrollment. Browser/native login endpoints and production credentials stay outside the characterization.

| Case | Current evidence |
|---|---|
| Scoped regressions | 121/121 passed. Covers selected legacy contracts, password writer policy and no-downgrade behavior, another-device revocation, cutover parsing and independent synthetic object/config/key recovery. |
| Prisma RLS | One real PostgreSQL fixture passed. It covered a reused pooled connection, a restricted runtime/job role, approved and pending enrollment, same-institute title writes and rollback. The dump/restore returned `3|2|3|t|f|f` in 1.058 seconds, including the expected grant vector. |
| Password writer | Current-schema case passed. The synthetic rejected choice left the session intact. Two concurrent valid writes produced one Argon2id change, zero remaining sessions and one metadata-only event. Restore returned `1|0|1` in 1.281 seconds. The first attempt got 401 because the fixture omitted the student's existing approved enrollment. Adding the fixture enrollment preserved that admission rule. |
| Existing staging workflow | The synthetic Student/Instructor course reads and MFA-admin metadata export passed unchanged. Recovery returned the expected 3 users, 1 course, 1 enrollment and 1 export event in 1.53 seconds. |
| Backup components | An authenticated-encryption rehearsal restored the expected digests of dummy configuration and object bytes using a separately stored test key in 6 ms. Data and key directories shared the bounded temporary environment. An operational drill must prove independent physical/access custody and test database, object and key consistency at one recovery point. |

## Owner-operated acceptance matrix

Use the same candidate SHA, approved synthetic environment and lockfile across clients. Record OS, client/build ID, application revision, step outcome and browser/real device/emulator status. Create synthetic users and courses with established role, enrollment and institute rules. Keep production, signing keys and previously blocked validation outside this matrix.

| Platform | Ordinary acceptance |
|---|---|
| Web | Student opens own approved course, submits ordinary assignment work and views available feedback. Instructor creates course material, views allowed work and grades a dummy submission. Administrator completes TOTP, uses permitted institute tools and confirms an export audit event. Super User completes TOTP and enters their dedicated area. Exercise legitimate password/Google admission, logout, active/idle expiry, another-device sign-out, both cookie names during the rehearsal and the final UTC cutoff. |
| Android and iOS, each | Install an SDK 58 development binary for the existing app identifier. Verify tabs, back behavior, Google callback and bearer renewal, cold/warm deep links, notifications, course navigation, WebView session transfer and logout. Use the approved synthetic endpoint and rehearse an update and rollback within the same runtime version. Record OS/device/Expo runtime and whether the app was actually installed. |
| Electron | Compile and package against the approved staging origin. Exercise administrator login and TOTP, reading both session names, launch/resume, expiry, account sign-out, permitted export and offline navigation. Capture signed-distribution verification only after separately approved owner access to signing infrastructure. |
| MFA pilot | Maintain existing privileged flow. When qualified for ordinary roles, exercise voluntary Instructor then optional Student enrollment, recovery code use and replacement with accessible recovery alternatives across the supported clients. |

Local route fixtures and compiled clients leave real browsers, devices, external providers and signed-release behavior open. [Release readiness](release-readiness-assessment.md)
