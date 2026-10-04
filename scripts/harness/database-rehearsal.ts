import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { ensure, object, words } from './contracts';
import { digest, safePath } from './repository';
import { assertCleanTestCheckout, pnpmEntry } from './runner';
import { sanitize } from './redaction';

export function disposableDatabase(value: string): URL {
  const url = new URL(value);
  ensure(['postgres:', 'postgresql:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && /^\/harness_[a-zA-Z0-9_]+$/.test(url.pathname), 'Rehearsal requires explicit local PostgreSQL harness_* URL');
  ensure(!url.search, 'Database options/proxies are not permitted for disposable rehearsal');
  return url;
}

/** Real PostgreSQL/Prisma adapter; no connection is made until explicit disposable input is validated. */
export async function rehearse(root: string, specFile: string): Promise<unknown> {
  assertCleanTestCheckout(root);
  ensure(process.env.HARNESS_TEST_DATABASE_URL && process.env.HARNESS_ENVIRONMENT_ID, 'Run database rehearsal through the runner with explicit disposable credentials');
  const url = disposableDatabase(process.env.HARNESS_TEST_DATABASE_URL);
  const spec = object(JSON.parse(fs.readFileSync(safePath(root, specFile), 'utf8')), 'rehearsal spec');
  const baseline = words(spec.baseline, 'baseline migrations', false);
  const preservation = words(spec.preservationQueries, 'preservation queries');
  const compatibility = words(spec.compatibilityQueries, 'compatibility queries');
  ensure(typeof spec.seedSQL === 'string' && spec.seedSQL.trim(), 'Upgrade requires reviewed representative seed SQL');
  const migrationRoot = safePath(root, 'prisma/migrations');
  const migrations = fs.readdirSync(migrationRoot).filter(name => fs.statSync(path.join(migrationRoot, name)).isDirectory()).sort();
  ensure(migrations.length > baseline.length && baseline.every((name, i) => name === migrations[i]), 'Baseline must be an ordered prefix with at least one pending migration');
  ensure(typeof spec.migrationReview === 'string' && spec.migrationReview.trim(), 'Reviewed SQL/compatibility assessment is required');
  const migrationDigests = Object.fromEntries(migrations.map(name => [name, digest(fs.readFileSync(path.join(migrationRoot, name, 'migration.sql'), 'utf8'))]));
  const requireRoot = createRequire(path.join(root, 'package.json'));
  const { Client } = requireRoot('pg') as typeof import('pg');
  const adminURL = new URL(url); adminURL.pathname = '/postgres';
  const admin = new Client({ connectionString: adminURL.href, connectionTimeoutMillis: 5000 }); await admin.connect();
  const suffix = randomUUID().replace(/-/g, ''), names = ['fresh', 'upgrade', 'recovery'].map(name => `harness_${name}_${suffix}`);
  const clients: InstanceType<typeof Client>[] = [];
  const created: string[] = [];
  const tests: { id: string; status: string; executed: boolean }[] = [];
  const passed = (id: string) => tests.push({ id, status: 'passed', executed: true });
  const databaseURL = (name: string) => { const target = new URL(url); target.pathname = '/' + name; return target.href; };
  const prisma = async (cwd: string, target: string, config: string) => {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [pnpmEntry(), 'exec', 'prisma', 'migrate', 'deploy', '--config', config], { cwd, shell: false, windowsHide: true,
        env: { PATH: process.env.PATH, Path: process.env.Path, SystemRoot: process.env.SystemRoot, USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME, DATABASE_URL: target, pnpm_config_verify_deps_before_run: 'warn', pnpm_config_pm_on_fail: 'error' } });
      let output = ''; const timer = setTimeout(() => child.kill(), 120000);
      child.stdout.on('data', b => output += b.toString()); child.stderr.on('data', b => output += b.toString());
      child.on('error', e => { clearTimeout(timer); reject(e); }); child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(sanitize('Prisma rehearsal failed: ' + output))); });
    });
  };
  const connect = async (name: string) => { const client = new Client({ connectionString: databaseURL(name) }); await client.connect(); clients.push(client); return client; };
  const schema = async (client: InstanceType<typeof Client>) => digest((await client.query(`SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations' ORDER BY table_name,ordinal_position`)).rows);
  const rows = async (client: InstanceType<typeof Client>, queries: string[]) => Promise.all(queries.map(async sql => { ensure(/^\s*SELECT\b/i.test(sql) && !/;|\b(FOR\s+UPDATE|INTO|pg_|dblink|COPY)\b/i.test(sql), 'Preservation/compatibility queries must be reviewed single SELECTs'); return (await client.query(sql)).rows; }));
  let beforeSchemaHash = '', afterSchemaHash = '';
  try {
    for (const name of names) { await admin.query(`CREATE DATABASE "${name}"`); created.push(name); } passed('database: disposable creation');
    await prisma(root, databaseURL(names[0]), 'prisma.config.ts'); const fresh = await connect(names[0]); passed('database: fresh replay');
    const work = safePath(root, `.orchestra/runs/database-rehearsal-${suffix}/baseline`); fs.mkdirSync(path.join(work, 'prisma/migrations'), { recursive: true });
    fs.copyFileSync(safePath(root, 'prisma/schema.prisma'), path.join(work, 'prisma/schema.prisma'));
    for (const name of baseline) fs.cpSync(path.join(migrationRoot, name), path.join(work, 'prisma/migrations', name), { recursive: true });
    const lock = path.join(migrationRoot, 'migration_lock.toml'); if (fs.existsSync(lock)) fs.copyFileSync(lock, path.join(work, 'prisma/migrations/migration_lock.toml'));
    // The adapter generates its own no-dotenv config inside ignored output; no live config is copied.
    fs.writeFileSync(path.join(work, 'prisma.config.ts'), `import {defineConfig} from 'prisma/config'; export default defineConfig({schema:'prisma/schema.prisma',migrations:{path:'prisma/migrations'},datasource:{url:process.env.DATABASE_URL!}});`);
    fs.symlinkSync(safePath(root, 'node_modules'), path.join(work, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    await prisma(work, databaseURL(names[1]), 'prisma.config.ts'); const upgrade = await connect(names[1]);
    await upgrade.query(String(spec.seedSQL)); beforeSchemaHash = await schema(upgrade); const preserved = await rows(upgrade, preservation); passed('database: baseline and representative data');
    await prisma(root, databaseURL(names[1]), 'prisma.config.ts'); afterSchemaHash = await schema(upgrade); passed('database: migration application');
    ensure(digest(await rows(upgrade, preservation)) === digest(preserved), 'Migration changed representative preserved data'); passed('database: data preservation');
    ensure(afterSchemaHash === await schema(fresh), 'Upgrade schema differs from fresh replay'); passed('database: post schema');
    for (const result of await rows(upgrade, compatibility)) ensure(result.length && result.every(row => Object.values(row).every(value => value === true)), 'Compatibility SELECT must return true assertions'); passed('database: compatibility');
    // Explicit transactional recovery rehearsal, not a claim that arbitrary deployed migrations can be rolled back.
    const recovery = await connect(names[2]); await recovery.query('CREATE TABLE recovery_probe(id integer PRIMARY KEY); INSERT INTO recovery_probe VALUES(1)');
    await recovery.query('BEGIN'); let detected = false;
    try { await recovery.query('DELETE FROM recovery_probe; SELECT missing_column FROM recovery_probe'); } catch { detected = true; await recovery.query('ROLLBACK'); }
    ensure(detected && (await recovery.query('SELECT id FROM recovery_probe')).rows[0]?.id === 1, 'Failure detection/transaction recovery failed'); passed('database: failure detection and transaction recovery');
    ensure(typeof spec.recoveryAssessment === 'string' && spec.recoveryAssessment.trim(), 'Human-reviewed forward/backup recovery assessment is required');
    return { environment: process.env.HARNESS_ENVIRONMENT_ID, tests, database: { targetFingerprint: digest({ host: url.hostname, port: url.port, databases: names }), beforeSchemaHash, afterSchemaHash,
      coverage: ['migration-review', 'migration-apply', 'fresh-replay', 'existing-upgrade', 'compatibility', 'recovery', 'data-preservation', 'post-schema'], disposable: true, migrationDigests }, migrationReview: spec.migrationReview, recoveryAssessment: spec.recoveryAssessment };
  } finally {
    await Promise.allSettled(clients.map(client => client.end()));
    for (const name of created) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name]); await admin.query(`DROP DATABASE IF EXISTS "${name}"`); }
    await admin.end();
  }
}

if (require.main === module) {
  const index = process.argv.indexOf('--spec');
  if (index < 0) { console.error('Database rehearsal requires reviewed --spec and runner-injected disposable configuration'); process.exitCode = 1; }
  else rehearse(process.cwd(), process.argv[index + 1]).then(report => { ensure(process.env.HARNESS_RESULT_PATH, 'Missing runner result path'); fs.writeFileSync(process.env.HARNESS_RESULT_PATH, JSON.stringify(report)); }).catch(error => { console.error(sanitize(error.message)); process.exitCode = 1; });
}
