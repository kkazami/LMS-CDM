// Owned loopback PostgreSQL only. HTTP identity selection is injected; authorization, SQL and transactions are real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createDisposablePostgres } from '../program-head/postgres-fixture.mjs';
const require = createRequire(import.meta.url);
const { load, as, request, webRequire } = require('./helpers.cjs');
const output = path.resolve('tmp/web-quality/integration-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), production: false, checks: [], identityBoundary: 'injected synthetic session; real role/resource guards, PostgreSQL and transactions' };
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const schemaPath = path.join(output, 'pre-sprint.prisma');
fs.writeFileSync(schemaPath, schema.replace(/^\s*submissionRequests\s+SubmissionRequest\[\]\r?\n/m, '').replace(/model SubmissionRequest \{[^}]*\}\s*/m, '').replace(/^\s*idempotencyKey String\?\r?\n/m, '').replace(/^\s*@@unique\(\[userId, idempotencyKey\]\)\r?\n/m, ''));
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
safeEnv.DATABASE_URL = 'postgresql://unused@127.0.0.1:1/harness_offline_web_quality';
safeEnv.DOTENV_CONFIG_PATH = path.join(output, 'empty.env');
fs.writeFileSync(safeEnv.DOTENV_CONFIG_PATH, '');
const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
const offlineConfig = path.join(output, 'prisma.config.mjs');
fs.writeFileSync(offlineConfig, 'export default ' + JSON.stringify({ schema: schemaPath, datasource: { url: safeEnv.DATABASE_URL } }));
const ddl = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [cli, 'migrate', 'diff', '--config', offlineConfig, '--from-empty', '--to-schema', schemaPath, '--script'], { env: safeEnv, windowsHide: true });
  let sql = '', diagnostics = ''; child.stdout.on('data', bytes => { sql += bytes; }); child.stderr.on('data', bytes => { diagnostics += bytes; });
  child.on('error', reject); child.on('close', code => {
    if (code === 0) resolve(sql);
    else { console.error(diagnostics.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted connection]').slice(0, 2500)); reject(Error('Offline schema generation failed.')); }
  });
});
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
let cluster, db;
try {
  cluster = await createDisposablePostgres();
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1'); assert.match(cluster.database, /^harness_/);
  report.target = { host: '127.0.0.1', database: cluster.database, port: cluster.port };
  await cluster.owner.query(ddl);
  await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE');
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES
    ('student','Synthetic Student','student@example.invalid','UNUSABLE','STUDENT','ics'),
    ('other','Other Student','other@example.invalid','UNUSABLE','STUDENT','ics'),
    ('teacher','Synthetic Teacher','teacher@example.invalid','UNUSABLE','PROFESSOR','ics'),
    ('admin','Synthetic Admin','admin@example.invalid','UNUSABLE','ADMIN','ics'),
    ('unrelated','Unrelated Teacher','unrelated@example.invalid','UNUSABLE','TEACHER','ics'),
    ('foreign','Foreign Student','foreign@example.invalid','UNUSABLE','STUDENT','ibe');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES('course','TEST','TESTJOIN','Synthetic Course','ics','teacher',CURRENT_TIMESTAMP),('foreign-course','OTHER','OTHERJOIN','Foreign Course','ibe',NULL,CURRENT_TIMESTAMP);
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES('enrolled','course','student','APPROVED');
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES('item','course','ASSIGNMENT','Synthetic Assignment',100,CURRENT_TIMESTAMP),('second','course','ASSIGNMENT','Second',100,CURRENT_TIMESTAMP),('foreign-item','foreign-course','ASSIGNMENT','Foreign',100,CURRENT_TIMESTAMP);`);
  const before = (await cluster.owner.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n;
  const migration = fs.readFileSync('prisma/migrations/20261020120000_submission_replay/migration.sql', 'utf8');
  report.migrationSHA256 = createHash('sha256').update(migration).digest('hex');
  await check('additive migration preserves existing synthetic users and grants are sufficient for restricted runtime', async () => {
    await cluster.owner.query('BEGIN'); await cluster.owner.query(migration); await cluster.owner.query('COMMIT');
    assert.equal((await cluster.owner.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n, before);
    await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
  });
  const { PrismaClient } = webRequire('@prisma/client');
  const { PrismaPg } = webRequire('@prisma/adapter-pg');
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: cluster.url, max: 8 }), log: [] });
  const student = await db.user.findUniqueOrThrow({ where: { id: 'student' } });
  const teacher = await db.user.findUniqueOrThrow({ where: { id: 'teacher' } });
  const api = await load(db, { user: student });
  const context = { params: Promise.resolve({ courseId: 'course' }) };
  const payload = { syllabusItemId: 'item', attachments: [{ url: 'https://files.example.invalid/answer.pdf', fileName: 'answer.pdf', type: 'FILE' }] };
  await check('valid student, teacher and administrator can read course assignments; privileged and anonymous identities cannot inherit access', async () => {
    for (const id of ['student', 'teacher', 'admin']) {
      as(await db.user.findUniqueOrThrow({ where: { id } }));
      const response = await api.assignments(request('/api/assignments?courseId=course'));
      assert.equal(response.status, 200, await response.clone().text());
    }
    as({ ...teacher, role: 'SUPER_USER' }); assert.equal((await api.assignments(request('/api/assignments?courseId=course'))).status, 403);
    as(null); assert.equal((await api.assignments(request('/api/assignments?courseId=course'))).status, 401);
    as(student);
  });
  await check('same-key concurrent HTTP retries return the same receipt and create one submission, attachment and submission reward', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => api.submit(request('/api/courses/course/submissions', payload, { 'Idempotency-Key': 'first-request' }), context)));
    for (const response of responses) assert.equal(response.status, 200, await response.clone().text());
    const bodies = await Promise.all(responses.map(response => response.json()));
    for (const body of bodies) assert.deepEqual(body, bodies[0]);
    assert.equal(await db.studentSubmission.count(), 1); assert.equal(await db.submissionAttachment.count(), 1); assert.equal(await db.submissionRequest.count(), 1);
    assert.equal(await db.expTransaction.count({ where: { source: 'assignment' } }), 1);
    assert.equal((await api.submit(request('/api/courses/course/submissions', { ...payload, status: 'DRAFT' }, { 'Idempotency-Key': 'first-request' }), context)).status, 409);
  });
  await check('unkeyed and new-key retries deduplicate attachments and preserve original submitted timestamp', async () => {
    const before = await db.studentSubmission.findFirstOrThrow();
    await Promise.all([api.saveSubmission(student, 'course', payload), api.saveSubmission(student, 'course', payload, 'new-key')]);
    assert.equal(await db.submissionAttachment.count(), 1);
    assert.equal((await db.studentSubmission.findFirstOrThrow()).submittedAt.toISOString(), before.submittedAt.toISOString());
  });
  await check('wrong institute, unenrolled student, unrelated instructor, foreign item and nonstudent submission are denied', async () => {
    for (const id of ['foreign', 'other']) {
      const actor = await db.user.findUniqueOrThrow({ where: { id } }); as(actor);
      assert.ok([403,404].includes((await api.assignments(request('/api/assignments?courseId=course'))).status));
      await assert.rejects(api.saveSubmission(actor, 'course', payload), error => [403,404].includes(error.status));
    }
    await assert.rejects(api.saveSubmission(teacher, 'course', payload), error => error.status === 403);
    await assert.rejects(api.saveSubmission(student, 'course', { syllabusItemId: 'foreign-item' }), error => error.status === 404);
    const unrelated = await db.user.findUniqueOrThrow({ where: { id: 'unrelated' } });
    const submission = await db.studentSubmission.findFirstOrThrow();
    await assert.rejects(api.gradeSubmission(unrelated, submission.id, 100), error => error.status === 403);
    as(student);
  });
  await check('flashcard save validates the actual attachment course and enrollment before any deck writes', async () => {
    const attachment = await db.attachment.create({ data: { syllabusItemId: 'item', type: 'FILE', fileName: 'synthetic.txt', url: 'data:text/plain;base64,U3ludGhldGlj' } });
    const payload = { courseId: 'course', attachmentId: attachment.id, save: true, cards: [{ front: 'Synthetic question', back: 'Synthetic answer' }] };
    as(student);
    assert.equal((await api.generate(request('/api/flashcards/auto-generate', payload))).status, 201);
    assert.equal(await db.flashcardDeck.count(), 1);
    assert.equal((await api.generate(request('/api/flashcards/auto-generate', { ...payload, courseId: 'foreign-course' }))).status, 404);
    as(await db.user.findUniqueOrThrow({ where: { id: 'other' } }));
    assert.equal((await api.generate(request('/api/flashcards/auto-generate', payload))).status, 403);
    assert.equal(await db.flashcardDeck.count(), 1); as(student);
  });
  await check('classwork reads are scoped and publication with attachments validates and rolls back atomically', async () => {
    as(await db.user.findUniqueOrThrow({ where: { id: 'other' } })); assert.equal((await api.classworkList(request('/api/courses/course/classwork'), context)).status, 403);
    as(student); assert.equal((await api.createClasswork(request('/api/courses/course/classwork', { title: 'Invalid student write' }), context)).status, 403);
    as(teacher); assert.equal((await api.createClasswork(request('/api/courses/course/classwork', { title: 5 }), context)).status, 400);
    const count = await db.syllabusItem.count();
    await cluster.owner.query(`CREATE FUNCTION fail_material() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_FAILURE'; END $$; CREATE TRIGGER test_material_failure BEFORE INSERT ON "Attachment" FOR EACH ROW EXECUTE FUNCTION fail_material();`);
    try { assert.equal((await api.createClasswork(request('/api/courses/course/classwork', { title: 'Rollback', attachments: [{ url: 'https://files.example.invalid/test.pdf' }] }), context)).status, 503); }
    finally { await cluster.owner.query('DROP TRIGGER test_material_failure ON "Attachment"; DROP FUNCTION fail_material()'); }
    assert.equal(await db.syllabusItem.count(), count);
    assert.equal((await api.createClasswork(request('/api/courses/course/classwork', { title: 'Published', attachments: [{ url: 'https://files.example.invalid/test.pdf' }] }), context)).status, 200);
    assert.equal(await db.syllabusItem.count(), count + 1); as(student);
  });
  await check('real attachment insertion failure rolls back status, attachments, receipt and EXP; retry succeeds', async () => {
    await cluster.owner.query(`CREATE FUNCTION fail_attachment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_FAILURE'; END $$; CREATE TRIGGER test_failure BEFORE INSERT ON "SubmissionAttachment" FOR EACH ROW EXECUTE FUNCTION fail_attachment();`);
    try { await assert.rejects(api.saveSubmission(student, 'course', { ...payload, syllabusItemId: 'second' }, 'rollback')); }
    finally { await cluster.owner.query('DROP TRIGGER test_failure ON "SubmissionAttachment"; DROP FUNCTION fail_attachment()'); }
    assert.equal(await db.studentSubmission.count({ where: { syllabusItemId: 'second' } }), 0);
    assert.equal(await db.submissionRequest.count(), 2);
    await api.saveSubmission(student, 'course', { ...payload, syllabusItemId: 'second' }, 'rollback');
    assert.equal(await db.studentSubmission.count({ where: { syllabusItemId: 'second' } }), 1);
  });
  await db.gradeIncentiveRule.create({ data: { id: 'rule', courseId: 'course', label: 'Passing', gradeMin: 60, bonusExp: 7, createdBy: 'teacher' } });
  await check('parallel API/service/web-action regrading awards each course incentive once', async () => {
    const submission = await db.studentSubmission.findFirstOrThrow({ where: { syllabusItemId: 'item' } });
    as(teacher);
    await Promise.all([api.gradeSubmission(teacher, submission.id, 80, 'Feedback'), api.gradeSubmission(teacher, submission.id, 95), api.gradebook.updateGrade(submission.id, 90)]);
    assert.equal(await db.expTransaction.count({ where: { source: 'grade_incentive', courseId: 'course' } }), 1);
    assert.equal(await db.privateComment.count(), 1);
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).isReturned, true);
    const first = await db.expTransaction.findFirstOrThrow({ where: { source: 'grade_incentive' } }); assert.equal(first.amount, 7);
    await api.gradebook.upsertGrade('item', 'student', 10); await api.gradebook.upsertGrade('item', 'student', 90);
    assert.equal(await db.expTransaction.count({ where: { source: 'grade_incentive' } }), 1);
  });
  await check('legacy returned grades establish a zero-EXP baseline instead of issuing retroactive duplicate incentives', async () => {
    const legacy = await db.syllabusItem.create({ data: { courseId: 'course', title: 'Legacy', type: 'ASSIGNMENT', maxPoints: 100 } });
    const submission = await db.studentSubmission.create({ data: { syllabusItemId: legacy.id, studentId: 'student', grade: 90, isReturned: true, status: 'RETURNED' } });
    const before = (await db.gamificationProfile.findUniqueOrThrow({ where: { studentId: 'student' } })).exp;
    await api.gradeSubmission(teacher, submission.id, 10); await api.gradeSubmission(teacher, submission.id, 90);
    assert.equal((await db.gamificationProfile.findUniqueOrThrow({ where: { studentId: 'student' } })).exp, before);
    const baseline = await db.expTransaction.findFirstOrThrow({ where: { idempotencyKey: `grade:${submission.id}:rule` } });
    assert.equal(baseline.amount, 0); assert.equal(baseline.source, 'grade_incentive_baseline');
  });
  await check('grade/reward failure rolls back grade, feedback and notification', async () => {
    const submission = await db.studentSubmission.findFirstOrThrow({ where: { syllabusItemId: 'second' } });
    const notifications = await db.notification.count(); const comments = await db.privateComment.count();
    await cluster.owner.query(`CREATE FUNCTION fail_reward() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_FAILURE'; END $$; CREATE TRIGGER test_reward_failure BEFORE INSERT ON "ExpTransaction" FOR EACH ROW EXECUTE FUNCTION fail_reward();`);
    try { await assert.rejects(api.gradeSubmission(teacher, submission.id, 90, 'Rollback feedback')); }
    finally { await cluster.owner.query('DROP TRIGGER test_reward_failure ON "ExpTransaction"; DROP FUNCTION fail_reward()'); }
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).grade, null);
    assert.equal(await db.privateComment.count(), comments); assert.equal(await db.notification.count(), notifications);
  });
  await check('simultaneous EXP idempotency and daily caps are serialized in PostgreSQL', async () => {
    await Promise.all(Array.from({ length: 4 }, () => api.grantExp({ userId: 'student', amount: 10, reason: 'Synthetic', source: 'test', idempotencyKey: 'duplicate' })));
    assert.equal(await db.expTransaction.count({ where: { source: 'test' } }), 1);
    await assert.rejects(db.expTransaction.create({ data: { userId: 'student', amount: 10, source: 'test', reason: 'Duplicate insert must fail', idempotencyKey: 'duplicate' } }), error => error.code === 'P2002');
    await Promise.all(Array.from({ length: 4 }, (_, i) => api.grantExp({ userId: 'student', amount: 10, reason: 'Cap test', source: 'cap', idempotencyKey: 'cap-' + i, dailyCap: 15 })));
    assert.equal((await db.expTransaction.aggregate({ where: { source: 'cap' }, _sum: { amount: true } }))._sum.amount, 15);
  });
  await check('perfect-score badge failure rolls back the grade and incentive; HTTP retry awards the badge exactly once', async () => {
    const submission = await db.studentSubmission.findFirstOrThrow({ where: { syllabusItemId: 'second' } });
    await cluster.owner.query(`CREATE FUNCTION fail_badge() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_FAILURE'; END $$; CREATE TRIGGER test_badge_failure BEFORE INSERT ON "StudentBadge" FOR EACH ROW EXECUTE FUNCTION fail_badge();`);
    try { await assert.rejects(api.gradeSubmission(teacher, submission.id, 100)); }
    finally { await cluster.owner.query('DROP TRIGGER test_badge_failure ON "StudentBadge"; DROP FUNCTION fail_badge()'); }
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).grade, null);
    assert.equal(await db.expTransaction.count({ where: { idempotencyKey: `grade:${submission.id}:rule` } }), 0);
    as(teacher);
    for (let i = 0; i < 2; i++) assert.equal((await api.grade(request('/api/courses/course/submissions/grade', { submissionId: submission.id, grade: 100 }), context)).status, 200);
    assert.equal(await db.expTransaction.count({ where: { idempotencyKey: 'badge:perfect-score' } }), 1);
  });
  await check('badge award/reward is atomic and idempotent under concurrent callers', async () => {
    const awards = await Promise.all(Array.from({ length: 4 }, () => api.awardBadgeIfEarned('student', 'synthetic-badge')));
    assert.equal(awards.filter(Boolean).length, 1); assert.equal(await db.expTransaction.count({ where: { idempotencyKey: 'badge:synthetic-badge' } }), 1);
  });
  await check('explicit key rotation dry-run preserves ciphertext; apply reencrypts without losing the token', async () => {
    const oldKey = process.env.TOKEN_ENCRYPTION_KEY, oldPrevious = process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS;
    const { randomBytes } = await import('node:crypto');
    const previous = randomBytes(32).toString('hex'), next = randomBytes(32).toString('hex');
    process.env.TOKEN_ENCRYPTION_KEY = previous; delete process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS;
    try {
      const ciphertext = api.encryptGithubToken('synthetic-rotation-token');
      const stored = await db.githubToken.create({ data: { userId: 'student', encryptedToken: ciphertext, scope: 'read:user' } });
      async function rotate(apply) {
        return new Promise((resolve, reject) => {
          const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/rotate-github-token-key.ts', '--database', cluster.database, '--host', '127.0.0.1', ...(apply ? ['--apply'] : [])], { env: { ...safeEnv, GITHUB_TOKEN_ROTATION_DATABASE_URL: cluster.url, TOKEN_ENCRYPTION_KEY: next, TOKEN_ENCRYPTION_PREVIOUS_KEYS: JSON.stringify([previous]) }, windowsHide: true });
          let output = ''; child.stdout.on('data', bytes => { output += bytes; }); child.stderr.resume(); child.on('error', reject);
          child.on('close', code => code === 0 ? resolve(JSON.parse(output.trim())) : reject(Error('Synthetic rotation failed.')));
        });
      }
      assert.equal((await rotate(false)).mode, 'DRY_RUN');
      assert.ok((await db.githubToken.findUniqueOrThrow({ where: { id: stored.id } })).encryptedToken === ciphertext);
      assert.equal((await rotate(true)).mode, 'APPLIED');
      process.env.TOKEN_ENCRYPTION_KEY = next;
      assert.ok(api.decryptGithubToken((await db.githubToken.findUniqueOrThrow({ where: { id: stored.id } })).encryptedToken) === 'synthetic-rotation-token');
    } finally {
      if (oldKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY; else process.env.TOKEN_ENCRYPTION_KEY = oldKey;
      if (oldPrevious === undefined) delete process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS; else process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS = oldPrevious;
    }
  });
  const template = await db.activityTemplate.create({ data: { id: 'custom-level', courseId: 'course', syllabusItemId: 'item', createdBy: 'teacher', title: 'Synthetic Level', activityType: 'codelab' } });
  const activity = await db.activitySubmission.create({ data: { studentId: 'student', templateId: template.id, activityType: 'codelab', variantSeed: 'test', startedAt: new Date(), completionTimeSeconds: 5, score: 80, passed: true } });
  await check('moderation failure rolls back activity and gradebook; repeated reject preserves original score; restore uses pass threshold', async () => {
    await cluster.owner.query(`CREATE FUNCTION fail_gradebook() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_FAILURE'; END $$; CREATE TRIGGER test_gradebook_failure BEFORE UPDATE ON "StudentSubmission" FOR EACH ROW EXECUTE FUNCTION fail_gradebook();`);
    try { await assert.rejects(api.moderateCodeLab(teacher, { submissionId: activity.id, action: 'reject' })); }
    finally { await cluster.owner.query('DROP TRIGGER test_gradebook_failure ON "StudentSubmission"; DROP FUNCTION fail_gradebook()'); }
    assert.equal((await db.activitySubmission.findUniqueOrThrow({ where: { id: activity.id } })).score, 80);
    await api.moderateCodeLab(teacher, { submissionId: activity.id, action: 'reject' }); await api.moderateCodeLab(teacher, { submissionId: activity.id, action: 'reject' });
    await api.moderateCodeLab(teacher, { submissionId: activity.id, action: 'restore' });
    assert.equal((await db.activitySubmission.findUniqueOrThrow({ where: { id: activity.id } })).score, 80);
    assert.equal((await db.activitySubmission.findUniqueOrThrow({ where: { id: activity.id } })).passed, true);
    assert.equal((await db.studentSubmission.findFirstOrThrow({ where: { syllabusItemId: 'item' } })).grade, 80);
    await api.moderateCodeLab(teacher, { submissionId: activity.id, action: 'delete' });
    assert.equal(await db.activitySubmission.count(), 0); assert.equal((await db.studentSubmission.findFirstOrThrow({ where: { syllabusItemId: 'item' } })).grade, null);
  });
  await check('password changes enforce the common policy, revoke every session atomically and roll back on a revocation failure', async () => {
    const { compile } = require('./compile.cjs');
    const { hash, compare } = webRequire('bcryptjs');
    const currentPassword = 'SyntheticCurrentPass1!';
    const oldHash = await hash(currentPassword, 10);
    await db.user.create({ data: { id: 'password-student', name: 'Synthetic Password', email: 'password@example.invalid', password: oldHash, role: 'STUDENT', instituteId: 'ics' } });
    const first = await db.session.create({ data: { userId: 'password-student', tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 86400000) }, include: { user: true } });
    await db.session.create({ data: { userId: 'password-student', tokenHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 86400000) } });
    const { POST } = await compile(`export { POST } from './apps/web/src/app/api/auth/change-password/route';`, { db, session: first });
    const attempt = newPassword => POST(request('/api/auth/change-password', { currentPassword, newPassword }));
    assert.equal((await attempt('weakpass')).status, 400);
    assert.equal((await attempt('A1' + 'é'.repeat(40))).status, 400);
    assert.equal(await db.session.count({ where: { userId: first.userId } }), 2);
    await cluster.owner.query(`CREATE FUNCTION fail_password_revoke() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."userId"='password-student' THEN RAISE EXCEPTION 'SYNTHETIC_REVOKE_FAILURE'; END IF; RETURN OLD; END $$; CREATE TRIGGER test_password_revoke BEFORE DELETE ON "Session" FOR EACH ROW EXECUTE FUNCTION fail_password_revoke();`);
    try { assert.notEqual((await attempt('SyntheticNewPass2!')).status, 200); }
    finally { await cluster.owner.query('DROP TRIGGER test_password_revoke ON "Session"; DROP FUNCTION fail_password_revoke()'); }
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: first.userId } })).password, oldHash);
    assert.equal(await db.session.count({ where: { userId: first.userId } }), 2);
    const changed = await attempt('SyntheticNewPass2!'); assert.equal(changed.status, 200);
    assert.match(changed.headers.get('set-cookie'), /lumina_session=;.*Max-Age=0/i);
    assert.equal(await db.session.count({ where: { userId: first.userId } }), 0);
    assert.ok(await compare('SyntheticNewPass2!', (await db.user.findUniqueOrThrow({ where: { id: first.userId } })).password));
  });
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL'; report.errorType = error?.name || 'Error';
  // Assertion output is synthetic; ORM SQL/arguments are never emitted.
  const diagnostic = error instanceof assert.AssertionError || error?.name === 'Error' ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted connection]') : report.errorType;
  console.error('WEB_QUALITY_INTEGRATION_FAILED', diagnostic);
  process.exitCode = 1;
} finally {
  if (db) await db.$disconnect();
  if (cluster) { await cluster.stop(); report.clusterStopped = true; }
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Evidence: ' + path.relative(process.cwd(), path.join(output, 'report.json')));
}
