# Recoverable backups and disaster recovery

Sprint 6 verifies least-privilege Course backup, a same-cluster restore of role ownership and ACLs, and restoration of a dummy MFA wrapping key against the actual crypto helper. Before operation, approve a recovery-point manifest covering DB snapshot/log position, schema and privilege export, matching independent object versions, configuration revision and protected key identifiers. Rebuild a separate isolated destination with reviewed identities, verify checksums/counts and key decryptability, and record start/end and achieved RPO/RTO. Confirm named backup and key custodians and rehearse alert escalation. [Release and operator checklist](final-release-readiness-assessment.md)

Sprint 5 extends local evidence to current-schema data, RLS definitions, restricted grants and separate synthetic encrypted object/configuration and test-key recovery. The approved operational objectives remain unchanged. [Sprint 5 staging and evidence](sprint-5-staging-results.md)

Sprint 1, 19 November 2026. Tracks DR-01/02 and DATA-01 in [the roadmap](../../SECURITY-ROADMAP.md). **Strategy prepared; no production backup, restore, database operation, subscription or disaster-recovery drill was performed.** Owner approval is required for the actual target, costs, retention, recovery objectives and every destructive/cutover operation.

## What is and is not a backup

The LMS administrator database “backup” functionality stores **metadata summaries**; exports contain bounded, institute-scoped permitted rows. Generic restore edits allowlisted existing fields and cannot recreate a database. These remain useful admin tools with their existing rules; none is a disaster-recovery backup.

A recoverable service requires a consistent database recovery point **plus** matching private objects/files, schema/migrations and guard functions/grants, server-secret/key custody, application/build/runtime dependencies and deployment configuration. A database restored without object data or MFA/GitHub wrapping keys can still be unusable. Git is an application-source record, not a student-record backup.

## Approved Sprint 4 planning objectives

| Item | Planning objective | Unverified prerequisite |
|---|---|---|
| Academic/identity database | RPO ≤24 hours and RTO ≤4 hours. Use PITR where supported by the approved infrastructure. | Size, backup duration, provider restore window and plan costs |
| Student file/object data | RPO <= 24 hours, consistent enough with DB references to identify every missing object | Existing versioning/snapshot/export facilities and institutional retention policy; no blocked asset validation |
| Keys/configuration | Recover the exact protected versions needed for every retained database recovery point | Separate custody, restore access and expiration policy |
| Independent backups | Daily encrypted copies under independent custody, retained for 30 days | Institution-approved retention/deletion/legal holds, destination/capacity and access model |
| Recovery rehearsal | Before first production readiness sign-off, monthly and after major schema/key changes | Isolated environment, synthetic/sanitized inputs and staffed operator review |

The owner approved these planning targets in Sprint 4. Scheduling, retention settings and measured production readiness require separate approval and evidence. Use approved existing infrastructure and identify costs before adding any service. Assess a shorter RPO during enrollment and exam periods with the academic owner. [Sprint 4 synthetic recovery](sprint-4-staging-verification.md)

## Layers and ownership

1. **Managed PostgreSQL recovery:** the DBA records the actual provider/project/branch, retention/restore window, deletion protections, tested restore mechanism and privileges. For Neon, branching/restore availability depends on the actual service configuration; a branch in the same account is not an independently protected backup. Do not assume the historical configured Neon database is production. See [Neon branching/recovery documentation](https://neon.com/docs/introduction/branching).
2. **Independent encrypted logical backup:** use supported PostgreSQL clients and an approved read-only backup principal against the approved direct endpoint. A custom-format archive is portable and can be inspected/restored independently; it includes schema/data but not all cluster-global roles or external blobs. Review extensions, large objects, RLS and read privileges so the backup is complete; never silently use a tenant-filtered runtime account. Do not use the application/migration owner's live credentials in CI.
3. **Object/file recovery:** the storage operator supplies existing inventory/versioning/retention documentation and recovery-point IDs. Plan object backups and DB-reference reconciliation; no blocked asset/privacy unit is reopened or probed. Avoid committing object lists containing student filenames or identifiers into this repository.
4. **Keys and operational configuration:** a separate security custodian retains encrypted copies/versions of MFA and provider-token wrapping keys, relevant signing keys, configuration metadata and release artifacts. Back up key material separately from encrypted data with independent access control. Record key identifiers only in ordinary evidence. A backup encrypted by a lost key is not recoverable.
5. **Evidence and custody:** the operator records backup ID, environment fingerprint, source/schema/client versions, timestamps, size, encrypted-object checksum, encryption key identifier and job outcome. Access is limited, logged and separated from application writers. Use immutable/object-lock protection when approved/available; do not assume a provider feature or purchase it implicitly. Alert on failed/stale backups and failed retention enforcement.

Use the [PostgreSQL backup overview](https://www.postgresql.org/docs/17/backup.html) to choose between logical dumps and provider/continuous-archive recovery. Provider PITR and a separately held logical archive address different failure modes; neither alone proves full service recovery.

## Operator command templates — not executed

The DBA must approve the exact service definitions, identities, directories, disk bounds and target before use. Keep credentials in a protected service/password file or approved secret-injection mechanism, with certificate and hostname verification; do not place them in shell arguments/history. Start on a disposable synthetic database. Never run these templates automatically from the LMS application or an untrusted PR.

```sh
# Read-only source backup, approved target and secure local working directory only.
pg_dump --dbname='service=lms_backup_source' --format=custom --no-password --file='/protected-work/lms-recovery.dump'
```

Encrypt the archive immediately using the operator's approved managed encryption tool, verify the encrypted copy/checksum and upload it to the separately protected approved destination. Custom-format compression is **not encryption**. Any temporary plaintext archive needs encrypted working storage, restrictive permissions, bounded lifetime and operator disposal under retention policy. Do not store it under repository `tmp/` or CI artifacts.

Do not use `--no-owner --no-acl` on the source dump merely to hide missing recovery requirements. The archive should preserve source definitions. Provision destination roles explicitly; if restoring without original ownership/ACLs below, separately reapply and verify reviewed owners, grants and security-definer function ownership. PostgreSQL `pg_dump` cannot back up a server newer than its supported major; record a compatible maintained client version. See [the official pg_dump contract](https://www.postgresql.org/docs/17/app-pgdump.html).

```sh
# Inspection is not a restore or proof of recoverability.
pg_restore --list '/protected-work/lms-recovery.dump'

# ONLY a separately provisioned, verified disposable recovery database.
pg_restore --dbname='service=lms_disposable_restore' --exit-on-error --single-transaction --no-owner --no-acl --no-password '/protected-work/lms-recovery.dump'
```

No `--clean`, drop/create, production restore, schema reset or cutover command is authorized here. Stop if the destination cannot be proven empty, isolated and disposable. Reading or restoring a production archive requires approval because it contains real data even in a non-production environment. Use synthetic content for Sprint fixtures and general testing.

## Recovery rehearsal and incident procedure

1. Record incident/rehearsal owner, source recovery point and exact approved destination. Stop automated writers, provider jobs and notifications in the recovery environment; deny external network/provider/SMTP/OAuth traffic. Never point test clients at production.
2. Check encrypted-backup integrity and decrypt through protected custody into bounded encrypted working storage. Restore into the empty isolated destination; retain tool exit/status and metadata, not dumped rows. A valid archive listing is only a preflight.
3. Recreate approved restricted runtime/migration/backup roles, object ownership and grants. Verify extension requirements, schema/migration receipts, tenant guards and revocation triggers. A schema-only Prisma diff is not the SQL-function/trigger recovery plan.
4. Restore the corresponding objects/files and configuration/key versions. Count and reconcile references using protected operator tools; report aggregate mismatches only. If DB/blob points differ, document missing/newer objects and loss decisions before opening reads.
5. **Prevent authentication rollback:** recovered sessions, pending challenges, factor counters and recovery-code hashes may be older than real use. Keep privileged access closed. An authorized operator must revoke restored sessions/challenges and decide safe factor recovery/re-enrollment before any public exposure; do not restore consumed recovery codes or old factor epochs as usable credentials. Compromised credentials/keys require rotation and incident handling. This is a separately approved operational action, not SQL executed by the sprint.
6. Run scoped ordinary synthetic student/instructor/admin journeys in the isolated service, check institutional/academic integrity and supported file availability without retrying blocked security validation. Check key-dependent normal MFA enrollment on dedicated synthetic actors. Record start/end times and achieved loss window; explicitly list any untested controls.
7. For an actual incident, get academic/privacy/operator approval of the loss/reconciliation plan, freeze conflicting writers, promote the recovered environment through the protected release process, verify exact endpoint/secret identity and monitor. Keep the old environment preserved and isolated for investigation. Never silently replay grades or external notifications.
8. Retain a signed metadata-only recovery receipt, restore failures and cleanup evidence. Destroy only the exact owned disposable environment after approval; never run a computed recursive delete or drop against an ambiguous target.

Completion means a **successful actual isolated recovery** within approved RPO/RTO, not a written plan, passing harness unit test, provider marketing claim, archive listing or administrator summary. Until an operator supplies that receipt, production recovery remains unverified.
