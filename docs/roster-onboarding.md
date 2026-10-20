# Roster onboarding and activation

Administrators open `/{institute}/admin/onboarding`, also linked from Accounts and Course Management. Public `/register` routes now explain how to contact the Office of the Registrar; the registration API rejects every request. Existing accounts are preserved.

## Administrator workflow

1. Import the Registrar-approved student roster with `student_Id,last_name,first_name,email,program,section`. All six values are required. Imports create pending students without passwords.
2. Create an academic term, then import courses using `courseCode,subject,title,section,room,description,instructorEmail,program`. Course code, subject, title, and section are required. Select the term in the screen. The academic code remains separate from the generated join code.
3. Import enrollment CSV (`student_Id,courseCode,section`) or generate program/section matches. Review and explicitly confirm them.
4. Review invitation estimates and select **Send Invitations**. Students choose their own password through their email link and can then sign in using email or student ID.

Every import supports templates, server validation, selected valid rows, Skip/Update, reports and resumable processing. Reopening the same import type in the same browser restores its last batch. Previews expire after 30 minutes; detailed rows are purged after 30 days by the scheduler. A partial confirmed import can be resumed; completed rows are not replayed.

Student updates preserve email and student ID. To fix an email typo on a pending account, open **Invitations → Correct Email**, enter the new address and correction reason, then send a new invitation. This increments the invitation version, revokes old links, and cancels old jobs. A message already in flight may still arrive at the old address, but its link is unusable and its send result does not replace the corrected account's status.

Links last 72 hours from the send attempt. One reminder is scheduled 48 hours after the first accepted invitation for the current email/version. A recent manual resend suppresses an unnecessary reminder. Activation revokes all other grants and never signs a student in automatically.

## Database installation

**Do not apply migrations with the application runtime role or against an unreviewed database.** Back up the selected database and run the reconciliation report first. Scripts never choose a default operator target:

```powershell
# Supply ROSTER_DATABASE_URL through a protected operator environment.
node scripts/roster-reconcile.mjs C:\protected\roster-reconciliation.json
```

The report contains internal account IDs, not passwords, tokens or raw email addresses. Resolve every reported conflict through approved school records. Schema rollout has two stages: `20261019083000_roster_compatibility` adds the nullable names, activation fields, terms and queue tables without rewriting existing account values; `20261019090000_roster_activation` reconciles identifiers and adds student-number uniqueness. The second stage stops if identity conflicts remain. Student imports fail closed until both student-number indexes are installed. Viewing existing accounts, managing school terms, and inviting an existing pending account by its internal account ID do not depend on student-number uniqueness. These operations retain live Administrator authorization, institute scoping, account locks, and audit checks. Existing email login remains available after the compatibility stage; ambiguous student-ID logins are rejected.

For a database with existing duplicate student numbers, apply only the compatibility stage first using the existing security-boundary owner. This restores existing-account login without inventing or renumbering student identities:

```powershell
node tests/roster/integration.mjs
node scripts/apply-roster-compatibility.mjs --owner-stdin --evidence tmp/roster-import/integration-<run>/report.json
```

The setup command reads the owner connection through hidden input, verifies it targets the configured runtime database, installs the narrow assignment function and table grants in the same transaction, checks existing account contents and table counts, records the migration checksum, and verifies the restricted runtime can use the new login fields and rate-limit table. It never stores the owner connection. Keep the application configured with its restricted runtime role. After authoritative roster reconciliation, apply the remaining reviewed identity migration; do not mark it applied before its constraints exist.

### Existing migration-history prerequisite

The repository's original migration prefix predates much of the current Prisma schema, including academic programs and privileged-account provisioning. The new compatibility and roster-activation migrations are an **upgrade from the established current LMS baseline**, represented by the frozen test fixture `tests/roster/fixtures/baseline.prisma`. They are not a replacement baseline for an empty database.

Before deployment, an operator must reconcile the target's actual schema and Prisma migration history against that baseline. Do not blindly replay the old migration prefix on a current shared database. A complete historical-baseline repair is separate from this feature. The integration test replays the supported baseline, applies the actual feature migration, compares current Prisma columns, and verifies preservation and transaction recovery.

After applying the reviewed feature migration, run `pnpm prisma generate` and restart the application server so Node loads the new generated client. Next.js hot reload alone can retain the old generated module and omit new fields. The database singleton fingerprints the generated schema to replace older globally cached clients; login reports a server reload requirement if activation data is missing instead of treating every account as invalid. Using the existing security-boundary owner connection, call the exported `installRosterActivation(owner)` from `scripts/install-roster-activation.mjs`. This installs the narrow `set_student_program` function and grants the new application tables to the existing qualified application principals. It requires the existing security boundary and rejects an unexpected installed function. It does not create privileged accounts or bypass assignment guards.

The email queue requires a working email connection and delivery worker. Student imports require the student-number constraints. Existing legacy courses retain a null term and appear as **Legacy / term not assigned**; do not guess their historical semester.

Recovery before rollout is restoring the verified backup or a reviewed forward repair. A Git revert cannot undo imported records. Stop invitation sending and the scheduler before any rollback involving activation or queued jobs. Retain audit history and reconcile attempts whose SMTP result is uncertain.

## SMTP and scheduling

Rotate the Gmail app password previously shared in the planning conversation. Keep the replacement in server secrets, never in tracked files. The mailer requires actual SMTP acceptance and never falls back to printing email bodies.

Server settings:

```dotenv
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="cdm.lms.dev@gmail.com"
SMTP_PASS="<new-app-password>"
SMTP_FROM='"CdM LMS Admin" <cdm.lms.dev@gmail.com>'
APP_BASE_URL="https://<actual-lms-host>"
CRON_SECRET="<at-least-32-random-characters>"
EMAIL_INVITATIONS_ENABLED="false"
EMAIL_DAILY_LIMIT="400"
```

Port 587 uses required STARTTLS. Verify outbound port access and a web-function duration of at least 60 seconds. The processor has a 45-second budget, sends at most five attempts per invocation, and shares a PostgreSQL lease and rolling sender budget across instances. SMTP operations occur outside transactions. Retries use 1 minute, 15 minutes, 1 hour and 6 hours; five attempts total. Authentication/quota errors pause sending. After correction, use **Verify SMTP / Resume Sender**.

Deploy `workers/invitation-scheduler/worker.mjs` using its Wrangler configuration. Set `LMS_EMAIL_ENDPOINT` to the exact HTTPS URL ending `/api/internal/email/process` and store the same `CRON_SECRET` as a Worker secret. Do not put SMTP or database credentials in the Worker. Its cron runs every minute and uses an authenticated POST, timeout, and redirect rejection.

Confirm the scheduler heartbeat and SMTP verification in the administrator screen, then enable `EMAIL_INVITATIONS_ENABLED=true`. First pilot a small approved recipient list. No production sending, scheduler deployment, credential rotation, or shared database mutation is performed by the implementation tests.

At 400 attempts per rolling day, 500 recipients span roughly two days. The UI shows queued work, available budget and an estimated completion time. Retries and unrelated mailbox use can delay delivery. The estimate disappears if sending is paused or the scheduler has not reported for three minutes. `SENT` means accepted by SMTP, not confirmed inbox delivery. Provider limits must be reviewed before changing the cap.

## Verification

```powershell
node --import tsx --test tests/roster/rules.test.ts tests/roster/scheduler.test.mjs
node tests/roster/integration.mjs
node tests/roster/integration.mjs --browser
node tests/roster/build.mjs
pnpm prisma validate
pnpm --filter web exec tsc --noEmit
pnpm --filter mobile typecheck
pnpm harness:test
pnpm harness:typecheck
```

The PostgreSQL integration suite uses the existing owned-loopback fixture, real restricted application credentials, synthetic school data, fake SMTP and actual database guards. It requires the repository's retained PostgreSQL test distribution and permission to launch local processes. It deletes its own stopped database storage while retaining reports and logs. Browser and build checks use disposable source copies without live environment files, leaving an existing dev server alone. The build check disables only disposable webpack caching to limit disk usage. Test receipts are development evidence, not controlled-harness release certification.
