// Uses only the owned loopback fixture; never loads live dotenv files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDisposablePostgres } from '../program-head/postgres-fixture.mjs';
import { repairSessionIdle } from '../../scripts/repair-session-idle.mjs';

const checks=[];
const fixture=await createDisposablePostgres();
try {
  const owner=fixture.owner;
  await owner.query(`CREATE TABLE "Session"(id text PRIMARY KEY,"tokenHash" text NOT NULL,"userId" text NOT NULL,"createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" timestamp(3) NOT NULL); CREATE TABLE _prisma_migrations(id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,migration_name varchar(255) NOT NULL,started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,rolled_back_at timestamptz,applied_steps_count integer NOT NULL DEFAULT 0); GRANT SELECT,INSERT,UPDATE,DELETE ON "Session" TO bqual_test_app; INSERT INTO "Session" VALUES('old','synthetic-old','synthetic-user',now()-interval '2 days',now()+interval '5 days'),('recent','synthetic-recent','synthetic-user',now()-interval '1 minute',now()+interval '6 days')`);
  const app=await fixture.connect();
  await owner.query(`CREATE FUNCTION guard_fixture_session_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SESSION_ADMISSION_DENIED' USING ERRCODE='42501'; END $$; CREATE TRIGGER fixture_session_guard BEFORE UPDATE ON "Session" FOR EACH ROW EXECUTE FUNCTION guard_fixture_session_update()`);
  await assert.rejects(app.query('SELECT "lastSeenAt" FROM "Session" LIMIT 0'),e=>e.code==='42703');
  checks.push('Reproduced missing session column on restricted runtime');
  const applied=await repairSessionIdle(owner);
  assert.equal(applied.status,'APPLIED'); assert.equal(applied.preservedSessions,2); assert.equal(applied.originalSessionFieldsPreserved,true);
  assert.equal((await app.query('SELECT count(*)::int AS n FROM "Session" WHERE "lastSeenAt"=TIMESTAMP \'1970-01-01 00:00:00\'')).rows[0].n,2);
  assert.equal((await app.query('SELECT "lastSeenAt" < now()-interval \'30 minutes\' AS expired FROM "Session" WHERE id=\'old\'')).rows[0].expired,true);
  await assert.rejects(owner.query('UPDATE "Session" SET "lastSeenAt"="createdAt"'),e=>e.code==='42501');
  checks.push('Applied migration without row updates; preserved old fields, expired old sessions and retained admission guard');
  await app.query('INSERT INTO "Session"(id,"tokenHash","userId","expiresAt") VALUES($1,$2,$3,now()+interval \'7 days\')',['new','synthetic-new','synthetic-user']);
  assert.ok((await app.query('SELECT "lastSeenAt" FROM "Session" WHERE id=\'new\'')).rows[0].lastSeenAt instanceof Date);
  checks.push('Restricted runtime creates and reads new sessions with activity default');
  assert.equal((await repairSessionIdle(owner)).status,'ALREADY_APPLIED');
  await assert.rejects(app.query('ALTER TABLE "Session" ADD COLUMN forbidden text'),e=>e.code==='42501');
  checks.push('Safe repeat and unchanged runtime schema restrictions');
  await owner.query('UPDATE _prisma_migrations SET checksum=$1',['0'.repeat(64)]);
  await assert.rejects(repairSessionIdle(owner),/reconciliation/);
  assert.equal((await app.query('SELECT count(*)::int AS n FROM "Session"')).rows[0].n,3);
  checks.push('Refuses conflicting history without losing sessions');
} finally { await fixture.stop(); }
const result={status:'PASS',checks,clusterStopped:true,production:false};
fs.mkdirSync('tmp/web-quality',{recursive:true}); fs.writeFileSync('tmp/web-quality/session-idle-repair-test.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
