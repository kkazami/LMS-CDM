import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { installAdministratorCredentials } from './install-administrator-credentials.mjs';

const args = process.argv.slice(2);
const ownerFile = args[args.indexOf('--owner-env') + 1];
const evidenceFile = args[args.indexOf('--evidence') + 1];
if (!args.includes('--owner-env') || !args.includes('--evidence') || !ownerFile || !evidenceFile) throw new Error('Supply --owner-env and --evidence.');
const sqlSHA256 = createHash('sha256').update(fs.readFileSync('prisma/super-user-v1/administrator-credentials.sql')).digest('hex');
const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
if (evidence.error || !evidence.clusterStopped || evidence.administratorCredentialsSHA256 !== sqlSHA256
  || evidence.checks.some(check => check.result !== 'PASS')
  || !evidence.checks.some(check => check.name === 'failed credential audits roll back profile, password and session changes')) throw new Error('Successful current disposable-database checks are required.');

// Use the existing protected owner configuration only for this explicit setup operation.
const ownerConfig = parseEnv(fs.readFileSync(ownerFile, 'utf8'));
const runtimeConfig = parseEnv(fs.readFileSync('apps/web/.env.local', 'utf8'));
const ownerURL = new URL(ownerConfig.DATABASE_URL), runtimeURL = new URL(runtimeConfig.DATABASE_URL);
if (ownerURL.hostname !== runtimeURL.hostname || ownerURL.pathname !== runtimeURL.pathname || ownerURL.username === runtimeURL.username) throw new Error('Existing owner and runtime targets must match and use separate principals.');
ownerURL.searchParams.set('sslmode', 'verify-full');
runtimeURL.searchParams.set('sslmode', 'verify-full');
const owner = new Client({ connectionString: ownerURL.href, connectionTimeoutMillis: 10000 });
const runtime = new Client({ connectionString: runtimeURL.href, connectionTimeoutMillis: 10000 });
const receipt = { startedAt: new Date().toISOString(), sqlSHA256, evidenceFile, status: 'NOT_APPLIED' };
try {
  await owner.connect(); await runtime.connect();
  if (!(await runtime.query('SELECT super_user_security.application_boundary_qualified() AS qualified')).rows[0].qualified) throw new Error('Existing runtime boundary is unavailable.');
  const result = await installAdministratorCredentials(owner);
  Object.assign(receipt, result, { status: 'APPLIED' });
  const verification = (await runtime.query(`SELECT super_user_security.application_boundary_qualified() AS qualified,
    has_function_privilege(current_user,'super_user_security.reset_administrator_password(text,text,text,text,text)','EXECUTE') AS executable,
    NOT has_table_privilege(current_user,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') AS permitsProtected`)).rows[0];
  receipt.verified = verification.qualified && verification.executable && verification.permitsprotected;
  if (!receipt.verified) throw new Error('Post-setup runtime verification failed. Reconcile before retrying.');
} catch (error) {
  receipt.status = error.code === 'COMMIT_UNCERTAIN' ? 'COMMIT_UNCERTAIN_RECONCILE' : receipt.status === 'APPLIED' ? 'APPLIED_REQUIRES_RECONCILIATION' : 'STOPPED';
  // Do not print connection strings, query inputs, or credential-bearing ORM errors.
  receipt.errorCode = error.code ?? 'SETUP_FAILED';
  process.exitCode = 1;
} finally {
  await owner.end().catch(() => {}); await runtime.end().catch(() => {});
  receipt.finishedAt = new Date().toISOString();
  const output = path.join('tmp', 'administrator-credentials');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, `setup-${Date.now()}.json`), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}
