# Prisma RLS qualification

Sprint 6 separately qualifies a non-login policy definer with only the eligibility lookup columns, a non-login Course owner, and a separate Course backup role. An isolated backup completed under that role. A separate full same-cluster restore reproduced the policy and table owners, four policies and expected grant vector. These fixtures do not create deployment migrations.

### Exact synthetic Neon proposal

The owner must approve a distinct, empty nonproduction Neon project and branch created without copying production, and provide only project/branch identifiers and authorization scope in review. The operator provisions TLS-verified pooled and direct endpoints with isolated credentials, a restricted Prisma runtime, a non-login migration and policy owner, and separate jobs and backup roles. Record effective grants and verify no production secrets or project connections before any connection. Use the direct endpoint for migration and backup principals. Use the pooled endpoint for two concurrent admitted Prisma transactions, followed by scoped reads, rollback and transaction-context reset. Test one dedicated job and a restricted backup, then reprovision roles and restore in a separate synthetic destination. Record revisions, durations, observed rows/permissions, failures and rollback receipts. [Neon pooling](https://neon.com/docs/connect/connection-pooling)

Review the role/grant proposal independently before the Course RLS policy proposal. The checked-in [principal overlay](../../tests/sprint-6/rls-principals.sql) is disposable. Production ownership, grant changes and policy activation require separate written approval. A Course-only backup is a scope check. Full recovery requires the complete approved data and role inventory.

The current LMS schema was loaded into disposable PostgreSQL 17 with synthetic institutes, courses, enrollments and users. The pilot uses the same Prisma package and `PrismaPg` driver as the application, with a locally bounded single-connection `pg` pool. Interactive transactions set parameters from synthetic admitted actors with `set_config(..., true)` and query through the transaction client. The test confirmed the same backend PID on reuse and observed zero rows without context after commit and rollback.

| Boundary | Observed result |
|---|---|
| Student | Reads the approved course only. Ordinary reads excluded the pending and other-institute courses. Course update count was zero. |
| Instructor | Reads and edits their assigned course title. The rolled-back write left the prior title intact. |
| Administrator | Reads and updates courses in their institute. Editing the synthetic other-institute course returned a zero count. |
| Runtime grants | Course title/update timestamp writes permitted by field grants. Institute changes and direct enrollment reads unavailable. |
| Scheduled-job principal | Reads course ID and institute ID across the fixture with a separate principal. Title access is absent. The actual production scheduler remains outside this fixture. |
| Restore | Restored three courses, both changed titles, all three policies and the expected column-grant vector in the same isolated cluster. |

The fixed-path read policy's definer owns the demo function in the disposable cluster. A deployed policy needs a dedicated non-login owner and reviewed minimal underlying grants. The shared runtime can set custom settings, so the request adapter and trusted server admission remain part of the security boundary. The pilot covers selected Course reads and title updates. Other academic mutations, inserts, deletes, protected SQL, jobs and provider pooling require their own evidence.

### Review and rollback sequence

1. Review a role/grant-only change in staging. Retain existing application checks, determine ownership and provision runtime, job, migration and backup roles independently. Qualify recovery of role definitions on a separately approved isolated cluster.
2. Qualify the interactive transaction adapter in approved synthetic Prisma/Neon staging. Ensure `set_config` values come from the admitted actor, all policy-covered operations use the transaction client, and no context survives connection reuse. Test owner, job and backup exceptions.
3. Apply and verify individually reviewed Course read and title-update policies first. Leave other data families unchanged. Expand only after representative cross-role reads, dependent batch/academic writes and job/restore tests pass.
4. Roll back an affected application/SQL group through reviewed migration order and expected grants. Keep the server-layer authorization active while reverting policies. Restore the latest approved dump into isolation before any recovery cutover.

Only the [fixture SQL](../../tests/sprint-5/prisma-course-rls.sql) and [test](../../tests/sprint-5/prisma-rls.test.cjs) ship in this sprint. Production migrations require a separate approved proposal and an operator receipt. Actual Neon transaction pool routing is open. [Verification](sprint-5-verification.json)
