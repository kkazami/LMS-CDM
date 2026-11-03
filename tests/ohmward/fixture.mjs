import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { createDisposablePostgres } from '../labs/postgres-fixture.mjs';
import { installSuperUserBoundary } from '../../scripts/install-super-user-boundary.mjs';
import { evidenceRoot, safeEnvironment, sourceManifest } from '../../scripts/ohmward/evidence.mjs';

const require = createRequire(import.meta.url);
export const webRequire = createRequire(path.resolve('apps/web/package.json'));
export async function capture(name, program, args, env, cwd = process.cwd()) {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const id = `${Date.now()}-${name}`, startedAt = new Date().toISOString(), fingerprint = sourceManifest().fingerprint;
  return new Promise((resolve, reject) => {
    fs.writeFileSync(path.join(evidenceRoot, `${id}.stdout.txt`), ''); fs.writeFileSync(path.join(evidenceRoot, `${id}.stderr.txt`), '');
    const child = spawn(program, args, { env, cwd, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', value => { stdout += value; fs.appendFileSync(path.join(evidenceRoot, `${id}.stdout.txt`),value); }); child.stderr.on('data', value => { stderr += value; fs.appendFileSync(path.join(evidenceRoot, `${id}.stderr.txt`),value); });
    child.on('error', error => { stderr += String(error); });
    child.on('close', (exitCode, signal) => {
      fs.writeFileSync(path.join(evidenceRoot, `${id}.stdout.txt`), stdout); fs.writeFileSync(path.join(evidenceRoot, `${id}.stderr.txt`), stderr);
      fs.writeFileSync(path.join(evidenceRoot, `${id}.command.json`), JSON.stringify({ id, command: [program,...args], cwd, startedAt, finishedAt: new Date().toISOString(), fingerprint, exitCode, signal }, null, 2));
      if (exitCode === 0) resolve(stdout); else reject(Error(`Verification ${name} failed (${exitCode}); full output in ${id}.stderr.txt`));
    });
  });
}

export async function fixture({ boundary = false } = {}) {
  const output = path.resolve('tmp/ohmward/fixture-' + Date.now()); fs.mkdirSync(output, { recursive: true });
  const retained = process.env.LAB_TEST_PG_RUNTIME_ROOT || path.resolve('.orchestra/local-worktrees/trusted-local-harness/.orchestra/runs/run_trusted_local_profile_20261009/checkpoint/bqual-01-phase-3');
  if (!fs.existsSync(path.join(retained, '020-phase3-artifact-manifest-v1.json'))) throw Error('Reviewed PostgreSQL runtime unavailable; supply LAB_TEST_PG_RUNTIME_ROOT.');
  process.env.LAB_TEST_PG_RUNTIME_ROOT = retained;
  const env = { ...safeEnvironment(), DATABASE_URL: 'postgresql://unused@127.0.0.1:1/harness_ohmward_offline', DOTENV_CONFIG_PATH: path.join(output,'empty.env'), OHMWARD_ENABLED: 'true', NEXT_TELEMETRY_DISABLED: '1' }; fs.writeFileSync(env.DOTENV_CONFIG_PATH, '');
  const baseline = path.join(output, 'baseline.prisma'); fs.writeFileSync(baseline, execFileSync('git', ['-c','core.fsmonitor=false','show','HEAD:prisma/schema.prisma'], { encoding: 'utf8', windowsHide: true }));
  const config = path.join(output, 'prisma.config.mjs'); fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: baseline, datasource: { url: env.DATABASE_URL } }));
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
  const ddl = await capture('baseline-ddl', process.execPath, [cli,'migrate','diff','--config',config,'--from-empty','--to-schema',baseline,'--script'], env);
  const migration = fs.readFileSync('prisma/migrations/20261030000100_ohmward_foundation/migration.sql','utf8');
  let cluster;
  try {
    cluster = await createDisposablePostgres();
    await cluster.owner.query(ddl);
    await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE'),('ite','ite','Synthetic ITE');
      INSERT INTO "User"(id,name,email,role,"instituteId","studentNumber") VALUES
      ('teacher','Ohmward Instructor','ohm-teacher@example.invalid','PROFESSOR','ics',null),
      ('other-teacher','Unrelated Instructor','ohm-other-teacher@example.invalid','TEACHER','ics',null),
      ('student','Ohmward Learner','ohm-student@example.invalid','STUDENT','ics','OHM-001'),
      ('untouched','Zero Attempt Learner','ohm-untouched@example.invalid','STUDENT','ics','OHM-002'),
      ('unrelated','Other Class Learner','ohm-unrelated@example.invalid','STUDENT','ics','OHM-003'),
      ('pending','Pending Learner','ohm-pending@example.invalid','STUDENT','ics','OHM-004'),
      ('archived','Archived Class Learner','ohm-archived@example.invalid','STUDENT','ics','OHM-005'),
      ('foreign','Foreign Learner','ohm-foreign@example.invalid','STUDENT','ibe','OHM-006'),
      ('admin','ICS Administrator','ohm-admin@example.invalid','ADMIN','ics',null),
      ('foreign-admin','IBE Administrator','ohm-foreign-admin@example.invalid','ADMIN','ibe',null);
      INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt","isArchived") VALUES
      ('course','OHM101','OHMJOIN1','Ohmward fixtures','ics','teacher',now(),false),
      ('course-two','OHM102','OHMJOIN2','Second shared class','ics','teacher',now(),false),
      ('other-course','OTHER','OTHERJOIN','Unrelated class','ics','other-teacher',now(),false),
      ('archived-course','ARCHIVE','ARCHIVEJOIN','Archived class','ics','teacher',now(),true),
      ('foreign-course','FOREIGN','FOREIGNJOIN','Foreign class','ibe',null,now(),false);
      INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES
      ('en1','course','student','APPROVED'),('en2','course','untouched','APPROVED'),('en3','course-two','student','APPROVED'),
      ('en4','other-course','unrelated','APPROVED'),('en5','course','pending','PENDING'),('en6','archived-course','archived','APPROVED'),('en7','foreign-course','foreign','APPROVED');
      INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES('academic-item','course','QUIZ','Preserved academic quiz',100,now());
      INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",grade,status,"updatedAt") VALUES('academic-result','student','academic-item',72,'RETURNED',now());`);
    const preserved = (await cluster.owner.query('SELECT row_to_json(s) AS row FROM "StudentSubmission" s WHERE id=\'academic-result\'')).rows[0].row;
    await cluster.owner.query('BEGIN'); await cluster.owner.query(migration); await cluster.owner.query('COMMIT');
    let url = cluster.url;
    if (boundary) {
      await (await cluster.connect('bqual_bootstrap_admin','postgres')).query('ALTER ROLE bqual_schema_owner CREATEROLE');
      const password = randomBytes(32).toString('hex');
      await installSuperUserBoundary(cluster.owner, { runtimePrincipal: 'ohmward_runtime', operatorPrincipal: 'ohmward_operator', runtimePassword: password, operatorPassword: randomBytes(32).toString('hex'), qualificationReference: 'OWNED_OHMWARD_TEST_ONLY' });
      const target = new URL(url); target.username = 'ohmward_runtime'; target.password = password; url = target.href;
    } else await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
    const tokens = {};
    for (const id of ['student','untouched','unrelated','pending','archived','foreign','teacher','other-teacher','admin','foreign-admin']) {
      const token = randomBytes(32).toString('base64url'); tokens[id] = token;
      await cluster.owner.query('INSERT INTO "Session"(id,"tokenHash","userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 day\')', ['session-'+id, createHash('sha256').update(token).digest('hex'), id]);
    }
    return { cluster, output, env: { ...env, DATABASE_URL: url }, url, tokens, preserved, ddl, migration, stop: async () => {
      await cluster.stop();
      const receipts=path.join(evidenceRoot,'postgres-receipts',path.basename(cluster.artifactDirectory));fs.mkdirSync(receipts,{recursive:true});
      for(const file of fs.readdirSync(cluster.artifactDirectory).filter(name=>/^(pwsh|initdb|pg_ctl)\.exe-.*\.json$/.test(name)||name==='target-provenance.json'))fs.copyFileSync(path.join(cluster.artifactDirectory,file),path.join(receipts,file));
    } };
  } catch (error) { if (cluster) await cluster.stop(); throw error; }
}
