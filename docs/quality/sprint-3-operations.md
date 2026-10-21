# Sprint 3 operator handoff

Scope: web and its Next.js backend. Use synthetic accounts and separate staging database/storage/queues. No mobile implementation, production deployment, bulk invitation delivery or provider configuration change is authorized by these test commands. This is an operator procedure, not an engineering-harness release approval.

## Local checks

```powershell
node tests/web-quality/test.mjs
pnpm --filter web exec tsc --noEmit --incremental false
node --import tsx tests/web-quality/integration.mjs
node --import tsx tests/web-quality/sprint3.mjs
$env:WEB_QUALITY_LOCAL_LOAD='1'
node --import tsx tests/web-quality/sprint2.mjs
Remove-Item Env:\WEB_QUALITY_LOCAL_LOAD
```

Windows database runners use the existing owned, verified PostgreSQL fixture. They do not load dotenv or a configured LMS database. The Sprint 3 runner imports through the actual roster service and restricted application principal, resumes persisted batches and repeats confirmation. Its logical backup restores into a newly created empty `harness_restore_*` database in that owned cluster. It compares hashes/counts for every public/security table; it never restores over a source database. Both databases stop with the owned cluster. This local drill excludes ACL restoration, provider backups/PITR, external blob recovery and application cutover.

The optional Sprint 2 local diagnostic uses a production build with fresh opaque sessions for 998 synthetic students, one professor and one administrator, 99,800 historical grades, and its own HTTPS certificate. It compares the default two-connection pool with an explicit eight-connection pool by restarting the owned app on the same code/build/database. The fixture verifies at least 32 database connections are available before that single-app experiment. Each 20-second ramp has two seconds of startup and two-second think time; each pool profile stops at its first failing workload. This is deliberately a short diagnostic, not proof of a 30–60 minute target or 1,000 browser sessions. It preserves the earlier 400-student benchmark and verifies the load dataset's submission count and grade sum afterward. The server records its own CPU/RSS and connection-pool counts once per second in `server-metrics.jsonl`; this does not measure database CPU or catch every transient peak.

Do not run migrations against a live database to obtain these results. After dependency changes, regenerate Prisma before typechecking; use a standalone config with an offline loopback URL if the workspace has live dotenv files.

## Staging workload setup

1. Record the exact build/source ID, dataset ID, URL, app instance count/CPU/RAM, database plan/pooler/global connection budget, storage quota, body limits, trusted scanner version/signatures and Judge0 worker limits. Identify every production alias. Confirm the target and all test data are isolated. Set proposed thresholds before running; record any later change and rerun.
2. Copy `tests/web-quality/staging.example.json` to ignored `tmp/web-quality/staging-load.json`. Replace its intentionally unusable `.invalid` origin and placeholders. Set `LMS_LOAD_REVIEWED_ORIGIN` to that exact origin and `LMS_LOAD_ENVIRONMENT_ID` to its environment ID. These are operator assertions, not automatic proof of separation. The production-origin exclusion list must include actual aliases.
3. Supply distinct synthetic accounts for every requested user. The first N entries define that run's mix. Reference fresh session tokens through `LMS_LOAD_SESSION_*` environment variables in the protected runner environment; never paste them into committed JSON or command arguments. Every token must resolve to its declared user at `/api/auth/me`. Tokens must remain valid for the whole test. The runner does not bypass idle expiry: model actual foreground heartbeats for long active sessions or explicitly test their expected expiry in a separate scenario.
4. Use representative per-user enrollments, returned/unreturned assignments, notifications, target groups and attachment histories. The example's array-shape checks are a starting contract, not proof that academic data is correct. Replace/extend `integrity` with exact expected response values before/after load. `afterAssertions` can specify different exact postconditions for mutation scenarios. Verify database-side counts/uniqueness/grades/receipts/attachments/rewards against the fixture manifest afterward; no public diagnostic/count endpoint has been added to the product.
5. Keep arrival rates and request concurrency distinct from active users. This runner uses paced closed-loop HTTP clients, one request in flight per user. Browser rendering and login bursts require their own tests; the Playwright matrix supplies functional browser evidence only. Request/RPS measurements are not page-load percentiles. Calibrate action frequency/background polling from actual journeys, including refresh/notifications/foreground study activity. The example mixed scenario is a read-heavy baseline; add reviewed write/heavy steps for the final mixed workload.

```powershell
node tests/web-quality/load.mjs --config tmp/web-quality/staging-load.json --scenario mixed --users 50 --duration-seconds 1800
node tests/web-quality/load-report.mjs --input tmp/web-quality/load-results.json
```

Give each run a unique output path. Increase through 100, 250, 400 and 1,000 only after reviewing the previous result and provider resource graphs. Sustain the intended target for 30–60 minutes, then spike and return to baseline to verify recovery; repeat the final candidate. Do not let a request cap silently truncate a run. The runner fails on unachieved requested users, missing steps/data assertions, cap exhaustion, redirects, timeouts, response-size violations, latency thresholds or >=1% failures. Policy 429s are shown separately and still count as unmet workload, rather than being hidden as success. Payload bytes are received application bytes, not compressed network bytes. The local source fingerprint does not independently attest the deployed build: reconcile `candidateId` with the provider deployment receipt.

The runner records labels, timings, counters and fingerprints; no cookies, URLs containing credentials, response bodies or passwords enter results. API paths stay on the approved origin and redirects fail. There is no default staging/production URL, inherited database or disabled certificate check.

## Separate heavy scenarios

The example includes `deadline`, `uploads` and `codelab`. They require `allowSyntheticMutations=true`, suitable student-only accounts, independent data postconditions and agreed heavy-operation budgets. Reorder/filter the account list to match each scenario. The defaults are proposed budgets, not ISO rules.

- **Deadline:** use fresh ungraded assignments with future deadlines. Each synthetic student receives a stable idempotency key for that run; repeated actions intentionally test retries. Change the run prefix for a new experiment. Also run a first-write burst, not only receipt replays. Assert exactly one intended submission/attachment/reward effect per student and correct deadline rejection separately. Do not reuse returned/graded work.
- **Uploads:** generated plain-text payloads contain only synthetic `A` bytes; no arbitrary local file can be uploaded by this runner. Start at 10 KiB, then test accepted real file types/sizes with the scanner, body limits and storage provider. Pace below the current 20 attempts/user/minute and 250 MB owner quota unless testing those limits. Record scan time and DB/blob growth; clean synthetic assets through an operator-reviewed owned-dataset procedure. Expected 429/503 protection does not prove the requested workload fits.
- **CodeLab:** the sample executes a fixed Python print only through the app/Judge0 endpoint. Confirm language ID 71 exists in the selected engine and ICS eligibility. Capture app admissions, global worker queue, execution latency and failures. Current four-request admission is per warm app process, not a distributed queue. Never execute student code on the host or deploy the privileged development compose as production infrastructure.

No scanner, Judge0 or email stub is acceptable as production dependency proof. The existing ClamAV wire fixture proves protocol/failure handling only. Verify a real engine's current signatures and safe EICAR detection in isolated staging; never send test malware to ordinary users. Test email against a dedicated sink/provider sandbox, respecting invitation pacing and never sending to real student addresses.

## Resource and provider evidence

Capture timestamp-aligned app CPU/RAM/event-loop latency/restarts, DB CPU/disk/index size, active/idle/waiting connections, query latency/pool wait, scanner/queue depth and Judge0 workers. Record injector CPU/RAM too: an overloaded injector invalidates a capacity conclusion. For local metrics:

```powershell
node tests/web-quality/load-report.mjs --input tmp/web-quality/local-load-RUN-USERS.json --metrics tmp/roster-import/RUN/server-metrics.jsonl
```

Read-only SQL examples for an explicitly selected provider session (not automatically executed here):

```sql
SELECT current_database(), current_user, inet_server_addr(), inet_server_port();
SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid=pg_backend_pid();
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname=current_user;
SELECT state, wait_event_type, wait_event, count(*) FROM pg_stat_activity
WHERE datname=current_database() GROUP BY state,wait_event_type,wait_event;
SELECT pg_database_size(current_database());
SELECT relname, pg_table_size(relid), pg_indexes_size(relid) FROM pg_stat_user_tables;
```

`pg_stat_ssl` proves connection encryption, not client hostname verification. Check the app's deployed config, trusted CA, provider certificate and negative certificate/hostname cases too. Sprint 3 changes remote app URLs to `sslmode=verify-full`; a private CA may require a configured `sslrootcert`. A hostname/password containing `localhost` no longer classifies a remote database as local. Remote `sslmode=disable` or libpq compatibility cannot weaken this app policy. Test before rollout; a private/untrusted CA now fails closed.

Check the real restricted runtime grants and boundary qualification, networking/firewall/private scanner access, encryption at rest, managed secret access/rotation, backup retention/PITR and alert delivery. The production pool still defaults to two connections per process. `DATABASE_POOL_MAX` accepts an explicit integer from 1 to 20 and rejects malformed/out-of-range values; development defaults to 15. Confirm **instances × per-process pool + workers + operator headroom** fits the actual provider/pooler budget before setting it. The local eight-connection experiment is not a production recommendation. The current default login IP limit is ten attempts per 15 minutes; test a campus-NAT login burst separately and calibrate it with abuse controls. Functional browser tests explicitly use a test-only higher IP allowance and do not prove that burst works at defaults.

## Restore and incident procedure

Adopt numerical RTO/RPO and the covered failure scenarios. For a real drill, freeze the synthetic source or use the same consistent snapshot on both comparisons. Export a provider backup/PITR point and file-storage manifest to protected storage. Record capture time, encryption, retention, checksum and restoration target. Restore to a separate, empty owned database/storage namespace, not over the live source. Restore owner/grants/security functions via the established boundary procedure, then verify academic data and login/submission/grading behavior.

`restore-check.mjs` is intentionally **read-only**: it compares an already restored target and does not run destructive restore commands. Its config needs `syntheticOnly=true`, `environmentKind="staging"`, an environment ID, reviewed `allowedHosts`, `backupCapturedAt`, `sourceUrlEnv`/`restoredUrlEnv` names beginning `LMS_QUALITY_`, an `ownershipNonce`, and an output under `tmp/web-quality/`. The target database must be separately named `quality_restore_*` or `harness_restore_*`; the operator must have provisioned `public.quality_restore_ownership("environmentId",nonce)` with exactly the matching row. Protect the nonce/config; it is an ownership assertion, not a grant of database authority. Non-loopback URLs require `sslmode=verify-full`. Use database accounts that can read all intended tables; incomplete access fails.

```powershell
node tests/web-quality/restore-check.mjs --config tmp/web-quality/restore.json
```

The comparator uses read-only repeatable-read snapshots/cursors, bounded connection/query timeouts and hashes instead of exporting rows. It compares all public/security table data, including binary content, session hashes and audit records; it does not compare grants, function definitions or external storage. Source must remain frozen across backup and comparison. Backup age is reported as observed age, not a promise of maximum data loss. Measure RTO from incident detection through provisioning, restore, grants, app cutover and successful task validation; `pg_restore` time alone is insufficient.

On a suspected incident: preserve sanitized timestamps/request IDs and provider logs, restrict affected access via the approved operator channel, revoke exposed sessions/keys, stop unsafe writes/queues, and select a verified backup and rollback candidate. Do not log session cookies, SMTP credentials, reset tokens, raw SQL arguments or student file contents. Have a real alert fire to the operator test channel and verify receipt. After restoration, compare data and reconcile writes since the recovery point before reopening access. Record detection, intervention, restoration and validation times.

## Candidate rollout and rollback

Use the Sprint 1 and 2 deployment handoffs together with this document. Reconcile the historical Prisma baseline first; never blindly apply the entire old migration chain to an existing deployment. Rehearse additive replay/session/private-asset migrations on an owned existing-data copy. Verify runtime grants for the new receipt/storage tables, configured vault keys/webhook secret, scanner availability, upload-body/storage limits, remote trusted database CA and private asset access. Existing public uploads/data URLs remain legacy exposure until an explicit authenticated migration/inventory is completed.

Record the previous deployment/build ID and compatible database state; take verified DB and storage backups before rollout. Obtain approval for the concrete environment/build/migrations. Deploy, then run synthetic login, roster preview/commit/resume, submission/retry, grading/return, private upload/download/denial and CodeLab smoke checks. Monitor errors, latency, queues and pool pressure. Route traffic back to the prior compatible app build if gates fail. Do not drop receipt/scan/session columns or delete academic records to roll back an additive migration. If the previous app cannot honor the new security/data contract, use a reviewed forward repair or restore/cutover plan instead of a blind binary rollback.

The CI workflow runs regression/type/build/advisory checks and scans the development Judge0/Postgres/Redis image tags without starting privileged workloads. A workflow file is not a passing Actions run; provider deployment, real restore, image-digest review and human task evaluation remain independent gates. Do not create fabricated harness actors, signatures, approvals or release status to bypass those gates.
