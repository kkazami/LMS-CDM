# Quiz Arena database cleanup — review plan

Prepared 4 November 2026 at Kirby's request. **Planning and read-only inspection only. Database execution is not approved by this document.** This is separate from the mobile UI/Ohmward integration, which uses existing tables and columns.

## Observed state

The configured root Prisma and web runtime connections identify the same database. Its application principal passes the existing boundary qualification check. Read-only inspection found:

| Table | Rows currently present |
| --- | ---: |
| ArenaQuiz | 7 |
| ArenaQuestion | 18 |
| ArenaAnswerChoice | 56 |
| ArenaGameSession | 16 |
| ArenaParticipant | 19 |
| ArenaPlayerAnswer | 25 |
| **Total** | **141** |

These are aggregate counts, not a data export. No records were changed. No foreign keys from non-Arena tables into these six tables were found. A second read-only catalog pass found 99 direct dependency entries, all constraints, defaults, indexes, internal TOAST storage or table types belonging to the six tables. No direct dependent views/functions, non-internal triggers or policies were found; no non-system function body text referenced the six Arena names. This metadata check does not detect application SQL, dynamic SQL assembled from fragments or external jobs, so the execution inventory must still cover them and be refreshed before removal.

`20261103000000_remove_quiz_arena` is pending. It drops all six tables with `CASCADE`, including their quiz/game/answer data. Its comment says removal was approved earlier; the current request authorizes preparation for review, so this run has not treated that comment as permission to delete data.

`20261025000000_quiz_arena` is recorded as successfully applied, but its database checksum differs from the current migration file. Normalized line endings and removing the current idempotent CREATE clauses do not reconcile it. The only reachable Git revision containing that migration, `2556cf4a5debd99b0d69be1ccb1f495d7f6db170`, also fails the recorded checksum comparison in its original, LF and CRLF forms. Recovery therefore needs an original deployment artifact or verified backup. No failed or unknown applied migrations were reported. The existing Ohmward readiness command correctly remains unsuccessful while migration history is unresolved.

## Implementation sequence

1. **Recover migration provenance.** Obtain the exact SQL originally applied from the original deployment/source artifact or a verified backup. Compare its SHA-256 against the recorded checksum, including original line endings. Restore the historical file only when it matches. Do not edit the database checksum, reset the database, or mark an unexecuted migration applied to hide the discrepancy. If the original SQL cannot be recovered, stop for a separately reviewed migration-history reconciliation procedure.
2. **Inventory dependencies and deployment order.** Capture the six table schemas, indexes, grants, policies, triggers and dependent views/functions. Review all objects that `CASCADE` would remove. The current candidate has no Arena models or routes; its remaining `Topbar` breadcrumb label is inactive metadata, not an Arena workspace. Verify the actual deployed web build and supported desktop/mobile clients no longer query Arena before dropping anything. Disable/drain any remaining Arena jobs or writes.
3. **Create a recoverable backup.** Prefer a verified Neon recovery branch/restore point and also export the six tables in PostgreSQL custom format, with their schema/data and the migration-history snapshot. Store backups outside Git in restricted storage. Use a compatible `pg_dump` version. Restore the backup to an isolated database and verify all six row counts and relationships. Refresh the counts immediately before execution; the counts above can change.
4. **Rehearse on the isolated copy.** Review [the safer SQL candidate](quiz-arena-cleanup-candidate.sql): it wraps the six-table DROP in a transaction, uses bounded lock/statement timeouts, and uses default RESTRICT so unexpected dependencies stop the operation instead of being removed by CASCADE. It is outside Prisma's migrations directory and has not been executed. After the historical checksum is reconciled and the candidate approved, replace the still-unapplied removal migration with the approved SQL and run it against the copy with a temporary owner connection. Confirm only the intended Arena objects disappear, all other migration history stays intact, and the application's normal restricted writer still passes its boundary/readiness checks. Run Ohmward and mobile-cover checks plus authenticated student/professor smoke flows on synthetic data.
5. **Present the final execution packet for approval.** Include the exact SQL/checksum, recovered migration provenance, dependency inventory, verified backup/restore evidence, expected deleted row counts, deployment revision, maintenance window and rollback procedure. The repository harness separates release readiness from human deployment approval; database owner access is a credential prerequisite, not approval to delete records.
6. **Execute the approved migration once.** Use an owner connection only for the migration process, against the independently verified same database identity. Keep the deployed app on its restricted application connection. Use Prisma's migration deployment path so the pending migration receives its normal history record. Do not run seeds, `migrate reset`, `db push`, broad schema repair or an ad-hoc unrecorded DROP.
7. **Verify and close.** Confirm the six tables are absent; check migration history has no pending/failed/missing/changed entries; run `pnpm ohmward:check-db`, Prisma validation and the application-role permission check. Recheck live `/api/health`, student/professor sign-in, course lists/covers, Ohmward saved progress, grading and uploads. Record the deployed revision and retain the backup until the agreed retention window ends.

## Commands to use after prerequisites and approval

The following are operator templates, not commands executed in this run. A secret must be supplied through a local ignored environment file or secret manager, never pasted into a report, committed, or placed in a command argument that is logged. Confirm root/web database identity before substituting an owner connection.

```powershell
# Read-only checks using the normal configured application connection:
pnpm exec prisma validate
pnpm ohmward:check-db

# After backup/restore rehearsal, provenance reconciliation and approval:
# NEON_OWNER_DATABASE_URL is supplied securely to this process.
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:NEON_OWNER_DATABASE_URL
  pnpm exec prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed: stop and inspect; do not rerun blindly.' }
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
}
pnpm ohmward:check-db
```

No owner connection is needed to keep implementing or testing the current mobile additions. Owner access, backup tooling/recovery access and explicit execution approval are required before step 6.

## Rollback

Before the DROP commits, stop and roll back the migration transaction if the rehearsed procedure supports it. After a committed DROP, a code rollback alone cannot recover quiz data. Restore the verified Arena backup into a recovery database/branch, validate counts and constraints, and use the reviewed recovery procedure to restore only the intended Arena schema/data. Reconcile Prisma history through an approved recovery migration/procedure; do not simply remove the applied history row. Avoid replacing the entire live database with an older snapshot that would discard newer coursework or submissions. Keep the last verified non-Arena application build available while recovery is assessed.
