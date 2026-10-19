import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { installRosterActivation } from './install-roster-activation.mjs';

const migrationName = '20261019083000_roster_compatibility';
const sql = fs.readFileSync(`prisma/migrations/${migrationName}/migration.sql`, 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');
const evidencePath = process.argv[process.argv.indexOf('--evidence') + 1];
if (!process.argv.includes('--evidence') || !process.argv.includes('--owner-stdin'))
  throw new Error('Supply --owner-stdin and --evidence. No default owner connection is used.');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
if (!evidence.disposable || !evidence.success || evidence.compatibilitySHA256 !== checksum ||
    !evidence.checks.every(check => check.result === 'PASS') ||
    !evidence.checks.some(check => check.name === 'Compatibility rollout keeps email login working, rejects ambiguous IDs and blocks imports'))
  throw new Error('Current successful disposable migration and login evidence is required.');

async function hiddenLine() {
  process.stdout.write('Database-owner connection (hidden input):\n');
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  try {
    return await new Promise((resolve, reject) => {
      let value = '';
      const read = chunk => {
        value += chunk;
        if (value.includes('\u0003') || value.length > 8192) {
          process.stdin.off('data', read);
          reject(new Error('Owner input cancelled or too long.'));
        } else if (/[\r\n]/.test(value)) {
          process.stdin.off('data', read);
          resolve(value.split(/[\r\n]/)[0].trim());
        }
      };
      process.stdin.on('data', read);
    });
  } finally {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

const runtimeConfig = parseEnv(fs.readFileSync('apps/web/.env.local', 'utf8'));
const runtimeURL = new URL(runtimeConfig.DATABASE_URL);
const ownerURL = new URL(await hiddenLine());
if (ownerURL.hostname !== runtimeURL.hostname || ownerURL.pathname !== runtimeURL.pathname ||
    ownerURL.username === runtimeURL.username || ownerURL.protocol !== runtimeURL.protocol)
  throw new Error('Owner and runtime must target the same existing database using separate principals.');
ownerURL.searchParams.set('sslmode', 'verify-full');
runtimeURL.searchParams.set('sslmode', 'verify-full');
const owner = new Client({ connectionString: ownerURL.href, connectionTimeoutMillis: 10000 });
const runtime = new Client({ connectionString: runtimeURL.href, connectionTimeoutMillis: 10000 });
const receipt = { startedAt: new Date().toISOString(), migrationName, checksum, evidencePath, status: 'NOT_APPLIED' };
let transaction = false, committing = false;
try {
  await owner.connect();
  await runtime.connect();
  const qualified = (await runtime.query('SELECT super_user_security.application_boundary_qualified() AS qualified')).rows[0].qualified;
  const owned = (await owner.query(`SELECT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('super_user_security.guard_user()') AND pg_get_userbyid(proowner)=current_user) AS owned`)).rows[0].owned;
  if (!qualified || !owned) throw new Error('Expected the existing qualified application role and security-boundary owner.');
  const installed = (await owner.query('SELECT checksum,finished_at FROM _prisma_migrations WHERE migration_name=$1 AND rolled_back_at IS NULL', [migrationName])).rows;
  if (installed.length) {
    if (installed.length !== 1 || installed[0].checksum !== checksum || !installed[0].finished_at)
      throw new Error('Migration history requires reconciliation.');
    receipt.status = 'ALREADY_APPLIED';
  } else {
    await owner.query('BEGIN'); transaction = true;
    await owner.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='45s'");
    await owner.query('LOCK TABLE "User","Course","Enrollment","ProgramMembership" IN SHARE ROW EXCLUSIVE MODE');
    const userDigest = async () => (await owner.query(`SELECT encode(sha256(convert_to(coalesce(string_agg((to_jsonb(u)-ARRAY['firstName','lastName','section','activationStatus','activatedAt','invitationVersion'])::text,'' ORDER BY id),''),'UTF8')),'hex') AS digest FROM "User" u`)).rows[0].digest;
    const before = await userDigest();
    const tables = (await owner.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`)).rows;
    const counts = {};
    for (const { tablename } of tables) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      counts[tablename] = (await owner.query(`SELECT count(*)::text n FROM public.${quoted}`)).rows[0].n;
    }
    await owner.query(sql.replace(/\bBEGIN;/, '').replace(/COMMIT;\s*$/, ''));
    await installRosterActivation(owner, { manageTransaction: false });
    if (await userDigest() !== before) throw new Error('Account preservation check failed.');
    for (const { tablename } of tables) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      if ((await owner.query(`SELECT count(*)::text n FROM public.${quoted}`)).rows[0].n !== counts[tablename])
        throw new Error('Existing record-count preservation check failed.');
    }
    await owner.query('INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES($1,$2,$3,clock_timestamp(),1)', [randomUUID(),checksum,migrationName]);
    committing = true;
    await owner.query('COMMIT');
    transaction = false;
    receipt.status = 'APPLIED';
    receipt.existingAccountsUnchanged = true;
    receipt.existingRecordCountsUnchanged = true;
  }
  await runtime.query('BEGIN');
  try {
    await runtime.query('SELECT "activationStatus","firstName","lastName","section","invitationVersion","activatedAt" FROM "User" LIMIT 1');
    await runtime.query(`INSERT INTO "RateLimitBucket"(key,count,"expiresAt") VALUES($1,1,clock_timestamp()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count="RateLimitBucket".count+1 RETURNING count`, ['repair-check-' + randomUUID()]);
    const boundary = (await runtime.query(`SELECT super_user_security.application_boundary_qualified() AS qualified, NOT has_table_privilege(current_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') AS permits_protected`)).rows[0];
    if (!boundary.qualified || !boundary.permits_protected) throw new Error('Application security boundary verification failed.');
    receipt.runtimeVerified = true;
  } finally { await runtime.query('ROLLBACK'); }
  receipt.pendingDuplicateIdGroups = (await runtime.query(`SELECT count(*)::int n FROM (SELECT 1 FROM "User" WHERE coalesce(nullif(btrim("studentNumber"),''),CASE WHEN upper(role)='STUDENT' THEN nullif(btrim("uniqueId"),'') END) IS NOT NULL GROUP BY upper(coalesce(nullif(btrim("studentNumber"),''),CASE WHEN upper(role)='STUDENT' THEN nullif(btrim("uniqueId"),'') END)) HAVING count(*)>1) x`)).rows[0].n;
} catch (error) {
  if (transaction && !committing) await owner.query('ROLLBACK').catch(() => {});
  receipt.status = committing && transaction ? 'COMMIT_UNCERTAIN_RECONCILE' : receipt.status === 'APPLIED' ? 'APPLIED_REQUIRES_VERIFICATION' : 'STOPPED';
  receipt.errorCode = error.code ?? 'COMPATIBILITY_REPAIR_FAILED';
  process.exitCode = 1;
} finally {
  await owner.end().catch(() => {});
  await runtime.end().catch(() => {});
  receipt.finishedAt = new Date().toISOString();
  const directory = path.resolve('tmp/roster-import');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `compatibility-repair-${Date.now()}.json`), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}
