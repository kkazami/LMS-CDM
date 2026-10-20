// Called only by sprint2.mjs after it creates the database, HTTPS certificate and production server.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

export async function seedOwnedLoad(cluster) {
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1'); assert.match(cluster.database, /^harness_/);
  // Leave the previously measured 400-student gradebook intact; additional load identities have their own course.
  await cluster.owner.query(`INSERT INTO "User"(id,name,email,password,role,"instituteId") SELECT 'load-'||i,'Synthetic Load '||i,'load-'||i||'@example.invalid','UNUSABLE','STUDENT','ics' FROM generate_series(1,998)i;
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('load-teacher','Synthetic Load Teacher','load-teacher@example.invalid','UNUSABLE','PROFESSOR','ics'),('load-admin','Synthetic Load Admin','load-admin@example.invalid','UNUSABLE','ADMIN','ics');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES('load-course','LOAD','LOADJOIN','Synthetic Load Course','ics','load-teacher',CURRENT_TIMESTAMP);
    INSERT INTO "Enrollment"(id,"studentId","courseId",status) SELECT 'load-enroll-'||i,'load-'||i,'load-course','APPROVED' FROM generate_series(1,998)i;
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","orderIndex","updatedAt") SELECT 'load-item-'||i,'load-course','ASSIGNMENT','Synthetic activity '||i,100,i,CURRENT_TIMESTAMP FROM generate_series(1,100)i;
    INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",status,grade,"isReturned","submittedAt","updatedAt") SELECT 'load-sub-'||s||'-'||a,'load-'||s,'load-item-'||a,'RETURNED',90,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM generate_series(1,998)s CROSS JOIN generate_series(1,100)a;`);
}
export async function ownedLoad({ cluster, db, origin, output, safeEnv, run, restart }) {
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1'); assert.match(cluster.database, /^harness_/);
  assert.match(origin, /^https:\/\/127\.0\.0\.1:\d+$/);
  const env = { ...safeEnv, LMS_LOAD_REVIEWED_ORIGIN: origin, LMS_LOAD_ENVIRONMENT_ID: 'owned-local-production-build', NODE_EXTRA_CA_CERTS: path.join(output, 'localhost-cert.pem') };
  const accounts = [];
  const identities = ['load-teacher', 'load-admin', ...Array.from({ length: 998 }, (_, i) => 'load-' + (i + 1))];
  for (const [i, id] of identities.entries()) {
    const token = randomBytes(32).toString('base64url'), sessionEnv = 'LMS_LOAD_SESSION_OWNED_' + i;
    env[sessionEnv] = token;
    // Use the qualified application principal: privileged session admission rejects schema-owner DML.
    await db.session.create({ data: { id: 'load-session-' + i, userId: id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
    accounts.push({ id, role: i === 0 ? 'PROFESSOR' : i === 1 ? 'ADMIN' : 'STUDENT', sessionEnv, bindings: { courseId: 'load-course' } });
  }
  const example = JSON.parse(fs.readFileSync('tests/web-quality/staging.example.json', 'utf8'));
  const available = Number((await cluster.owner.query('SHOW max_connections')).rows[0].max_connections);
  assert.ok(available >= 32, 'The explicitly owned single-app experiment needs a known spare database budget.');
  const profiles = [];
  for (const poolMax of [2, 8]) {
    if (poolMax !== 2) await restart(poolMax);
    const results = [];
    for (const users of [50, 100, 250, 400, 1000]) {
      const resultFile = path.resolve(`tmp/web-quality/local-load-${path.basename(output)}-pool${poolMax}-${users}.json`);
      const config = { ...example, environment: { kind: 'staging', id: env.LMS_LOAD_ENVIRONMENT_ID, origin, syntheticOnly: true, productionOrigins: ['https://excluded-production.example.invalid'] },
        candidateId: 'owned-production-build-pool' + poolMax, datasetId: '998-students-100-activities-99800-returned-grades', accounts,
        limits: { maxUsers: 1000, maxDurationSeconds: 20, requestTimeoutMs: 10000, maxRequests: 50000, maxResponseBytes: 5 * 1024 * 1024, thinkTimeMs: 2000, rampSeconds: 2 }, output: resultFile,
        integrity: [{ name: 'gradebook-roster', accountId: 'load-teacher', path: '/api/courses/load-course/gradebook?page=1', assertions: [{ pointer: '/pagination/total', equals: 998 }] }] };
      const configFile = path.join(output, `local-load-pool${poolMax}-${users}.json`); fs.writeFileSync(configFile, JSON.stringify(config));
      let exitedZero = true;
      try { await run(['tests/web-quality/load.mjs', '--config', configFile, '--scenario', 'mixed', '--users', String(users), '--duration-seconds', '20'], env, `local-load-pool${poolMax}-${users}.log`); }
      catch { exitedZero = false; }
      if (!fs.existsSync(resultFile)) throw Error('Local load did not produce its evidence.');
      const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
      results.push({ users, result: result.result, evidence: path.relative(process.cwd(), resultFile), achieved: result.achieved, summary: result.summary });
      console.log('LOCAL_DIAGNOSTIC pool=' + poolMax + ' users=' + users + ': ' + result.result);
      if (!exitedZero || result.result !== 'PASS') break; // Investigate the first failing workload before increasing pressure.
    }
    profiles.push({ poolMax, results });
  }
  const academic = (await cluster.owner.query('SELECT count(*)::int n,sum(grade)::int total FROM "StudentSubmission" WHERE "studentId" LIKE \'load-%\'')).rows[0];
  assert.equal(academic.n, 99800); assert.equal(academic.total, 99800 * 90);
  return { profiles, providerFixtureMaxConnections: available, appProcesses: 1, academicIntegrity: 'PASS', durationPerRampSeconds: 20, note: 'Same code/build/dataset; restart owned app to compare explicit pool budgets. Short owned-local read workload with pre-provisioned synthetic sessions. Not a 30–60 minute sustain, browser/login burst, deadline/upload/CodeLab test or production capacity claim.' };
}
