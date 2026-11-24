# Database security and institute isolation proposal

DB-01 and DB-02 remain partially implemented. The repository uses one PostgreSQL schema, Prisma 7 with `@prisma/adapter-pg`, and a `pg` pool. The remote connection helper requires certificate and hostname validation, caps pool sizing and sets connection timeouts. Institute authority is primarily enforced by server policy and query predicates. Protected account/provisioning SQL adds restricted functions, triggers and writer qualification. Sprint 2 tested the protected role and metadata-only admin export against disposable PostgreSQL. Actual Neon production roles, policies, schema, query bounds and recovery require operator evidence. [Database helper](../../apps/web/src/lib/db.ts) · [Protected SQL](../../prisma/super-user-v1/) · [Sprint 2 evidence](sprint-2-verification.json)

| Approach | Benefits | Limits and compatibility |
|---|---|---|
| Application authorization and institute predicates | Expresses role, membership, field visibility, academic behavior and delegated scopes in existing Prisma services. Works with web/mobile/desktop backend and institute exports. | A missing predicate or an unreviewed raw query can bypass the intended resource scope. Every read/write path including jobs and imports needs its own test. |
| PostgreSQL row-level security | Database can restrict row visibility and writes on individually approved tables, even if an application read omits a predicate. Design explicit `USING` and `WITH CHECK` behavior for every role/table. | Table owners normally bypass RLS unless forced. Superuser and BYPASSRLS roles bypass it. Missing tenant context needs to deny access. RLS does not replace field, course, membership, publication or grade rules. Joined models, background jobs, functions, restore and global lookups need explicit design. [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) |
| Restricted PostgreSQL principals and grants | Separate runtime, migrations, provisioning operator, backup and monitoring roles. Narrow schema/table/sequence/function permissions and preserve existing protected writer decisions. | A principal allowed to read an entire table can still read records across institutes unless the query or RLS scopes them. Grants need a full workflow inventory before narrowing. Neon role management and provider-supported privileges must be verified on the actual project. |
| Combined controls | Application owns policy and field/course semantics. Restricted DB credentials reduce capability. Reviewed RLS can add a selected tenant-row restriction. | Highest operational complexity. Needs transaction-scoped request context, policy/role tests for writes and nested Prisma reads, explicit jobs and recovery, measured pool cost and a tested migration order. |

## Recommended sequence

1. Maintain the application checks and institute-scoped final predicates first. Inventory protected writer calls, raw queries, global jobs, import/export and nested course/student ownership. Apply bounded pagination and query input sizes. Use parameterized Prisma and SQL. Benchmark query plans, pool headroom, statement/transaction timeouts and lock waits with synthetic institutes and representative volumes.
2. Have the operator verify runtime role inheritance, object ownership, schema privileges, table and sequence permissions, function execute grants, default grants, trigger presence and fixed `SECURITY DEFINER` search paths. Use a separate approved migration role and provider-supported connection mode. Verify failover and pool totals across serverless instances. Use an isolated Neon or PostgreSQL fixture for narrowing changes before separate approval. [Neon connection pooling](https://neon.com/docs/connect/connection-pooling) · [Production operator checklist](production-operator-checklist.md)
3. If approved, pilot RLS on one direct institute-owned model with clear operations, avoiding identity, export and grading as first targets. Provide tenant context from the admitted actor inside the same Prisma interactive transaction, using a parameterized transaction-local setting such as `set_config(..., true)`. Include every relevant query through that transaction client. Test missing context, transaction cleanup and pool reuse across synthetic institutes. Never set tenant context once per pooled connection; transaction pooling can reassign the server connection. A shared principal permitted to set arbitrary tenant context constrains accidental scoping faults and has limited protection under full runtime compromise. Explicit account/field authorization remains vital.
4. Plan enablement and rollback using separate, approved migration steps. Require all application operations to work before enforcing policies, compare query plans and bulk operation effects, and document deliberate maintenance paths. Keep a known compatible runtime and policy revision. Rehearse backup and isolated restore with schema, roles, grants, functions, RLS and encryption keys. Rollback must preserve authorization and MFA. [Backup and disaster recovery](backup-disaster-recovery.md)

No change to PostgreSQL roles, schema or RLS was made. The owner must approve any role changes, provider configuration or RLS rollout after the compatibility and permission inventory. The first operational receipt should contain the deployment commit, database environment identity without connection secrets, effective role flags and grants, migration revision, backup location ID and restoration result.

## Operator metadata check

After separately approving and identifying the environment, have the operator use the runtime identity through the deployment's approved access path. Capture only role flags, privilege booleans and reviewed schema metadata. The following starter queries perform no row-level data reads and make no modifications. A false ownership or RLS bypass flag is one prerequisite. Compare the complete privilege inventory with the approved workflows before narrowing grants.

```sql
SELECT current_database(), session_user, current_user;

SELECT rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
FROM pg_catalog.pg_roles
WHERE rolname = current_user;

SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public,
       has_table_privilege(current_user, 'public."AuditLog"', 'INSERT') AS can_append_audit_log;

SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       c.relowner = r.oid AS runtime_owns_table
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_roles AS r ON r.rolname = current_user
WHERE n.nspname = 'public'
  AND c.relname IN ('User', 'Course', 'Enrollment', 'StudentSubmission', 'AuditLog');
```

Read these results with the existing protected writer qualification workflow, membership/ownership inventory and migration receipt. An absent expected relation or writer guard is a release blocker. Verify grants and statement/lock timeout decisions on staging first. [PostgreSQL privilege inspection functions](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-INFO-ACCESS-TABLE)

## Sprint 4 application follow-up

The [isolated PostgreSQL pilot](postgresql-rls-implementation.md) exercises role-aware read isolation under disposable restricted grants and transaction-scoped context. Apply the combined approach in synthetic Prisma/Neon staging only after the driver, pool, jobs and maintenance prerequisites pass. The pilot ships no production schema migration and grants no additional application role capabilities. [Release gates](production-release-gates.md)
