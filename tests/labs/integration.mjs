import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { createDisposablePostgres } from './postgres-fixture.mjs';
import { scannerFixture } from './scanner-fixture.mjs';
import { upgradeGuidedLabs } from '../../scripts/upgrade-guided-practical-labs.mjs';

const require = createRequire(import.meta.url);
const { load, as, webRequire } = require('./helpers.cjs');
const output = path.resolve('tmp/labs/integration-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), production: false, checks: [],
  boundaries: 'Synthetic actor inputs; real course/role/resource guards, PostgreSQL, transactions and private-file bytes. Scanner is a wire fixture, not antivirus readiness evidence.' };
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
safeEnv.DATABASE_URL = 'postgresql://unused@127.0.0.1:1/harness_labs_offline';
safeEnv.DOTENV_CONFIG_PATH = path.join(output, 'empty.env');
fs.writeFileSync(safeEnv.DOTENV_CONFIG_PATH, '');
const prismaCli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
const baseSchema = path.join(output, 'baseline.prisma');
const baselineRevision = '1a231cd0a10cb3c2bf733c04de17c01058ee300c';
report.baselineRevision = baselineRevision;
fs.writeFileSync(baseSchema, execFileSync('git', ['show', baselineRevision + ':prisma/schema.prisma'], { encoding: 'utf8', windowsHide: true }));
const config = path.join(output, 'prisma.config.mjs');
fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: baseSchema, datasource: { url: safeEnv.DATABASE_URL } }));
async function ddl(schema) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCli, 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', schema, '--script'], { env: safeEnv, windowsHide: true });
    let sql = '', diagnostic = '';
    child.stdout.on('data', bytes => { sql += bytes; });
    child.stderr.on('data', bytes => { diagnostic += bytes; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(sql) : reject(Error('Offline schema generation failed: ' + diagnostic.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted connection]').slice(0, 1200))));
  });
}
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
const rejects = (work, status) => assert.rejects(work, error => error.status === status);
const teacher = { id: 'teacher', instituteId: 'ics', role: 'PROFESSOR' };
const student = { id: 'student', instituteId: 'ics', role: 'STUDENT' };
const other = { id: 'other', instituteId: 'ics', role: 'STUDENT' };
const unrelated = { id: 'unrelated', instituteId: 'ics', role: 'PROFESSOR' };
const foreign = { id: 'foreign', instituteId: 'ibe', role: 'STUDENT' };
const deadline = () => new Date(Date.now() + 3 * 86400000).toISOString();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0e8AAAAASUVORK5CYII=', 'base64');
const image = (name = 'evidence.png') => new File([png], name, { type: 'image/png' });
let cluster, db, scanner;

try {
  const baselineDdl = await ddl(baseSchema);
  cluster = await createDisposablePostgres();
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1');
  assert.match(cluster.database, /^harness_labs_/);
  report.target = { host: '127.0.0.1', database: cluster.database, port: cluster.port };
  await cluster.owner.query(baselineDdl);
  await (await cluster.connect('bqual_bootstrap_admin', 'postgres')).query('CREATE ROLE lms_web_runtime_v1 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE');
  await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE');
    INSERT INTO "User"(id,name,email,role,"instituteId") VALUES
    ('student','Synthetic Student','student@example.invalid','STUDENT','ics'),('other','Other Student','other@example.invalid','STUDENT','ics'),
    ('teacher','Synthetic Teacher','teacher@example.invalid','PROFESSOR','ics'),('unrelated','Other Teacher','other-teacher@example.invalid','PROFESSOR','ics'),
    ('foreign','Foreign Student','foreign@example.invalid','STUDENT','ibe');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES
    ('course','LAB','LABJOIN','Synthetic Lab Course','ics','teacher',CURRENT_TIMESTAMP),('foreign-course','OTHER','OTHERJOIN','Foreign','ibe',NULL,CURRENT_TIMESTAMP);
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES('student-enrollment','course','student','APPROVED'),('other-enrollment','course','other','APPROVED');
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES('legacy','course','ACTIVITY','Historical Empty Classwork',100,CURRENT_TIMESTAMP);
    INSERT INTO "StudentSubmission"(id,"syllabusItemId","studentId","updatedAt") VALUES('legacy-placeholder','legacy','student',CURRENT_TIMESTAMP);
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app;`);
  await check('unmigrated database keeps ordinary Classwork, submission, discovery and gradebook usable', async () => {
    const { PrismaClient } = webRequire('@prisma/client');
    const { PrismaPg } = webRequire('@prisma/adapter-pg');
    const legacy = new PrismaClient({ adapter: new PrismaPg({ connectionString: cluster.url, max: 4 }),
      omit: { syllabusItem: { workHistoryState: true }, studentSubmission: { workHistoryState: true } } });
    try {
      const old = await load(legacy);
      assert.equal(await old.labSchemaState(), 'legacy');
      assert.equal(await old.labsAvailable(), false);
      assert.equal((await legacy.syllabusItem.findMany({ include: { attachments: true } })).length, 1);
      assert.equal((await old.saveSubmission(student, 'course', { syllabusItemId: 'legacy', status: 'DRAFT' })).success, true);
      as(student);
      assert.equal((await old.readAssignments(new Request('https://lms.example.invalid/api/assignments?institute=ics&courseId=course&limit=50'))).status, 200);
      const todoUrl = 'https://lms.example.invalid/api/todo?institute=ics';
      const todoRequest = new Request(todoUrl); Object.defineProperty(todoRequest, 'nextUrl', { value: new URL(todoUrl) });
      assert.equal((await old.readTodo(todoRequest)).status, 200);
      await old.getDashboardCalendar(student, 'ics');
      assert.equal((await old.readGradebook(teacher, 'course')).assignments.length, 1);
      await rejects(() => old.requireLabSchema(), 503);
    } finally { await legacy.$disconnect(); }
  });
  const migrations = fs.readdirSync('prisma/migrations').filter(name => /guided_practical_labs/.test(name));
  assert.equal(migrations.length, 1, 'Exactly one additive lab migration must be selected explicitly.');
  const migration = fs.readFileSync(path.join('prisma/migrations', migrations[0], 'migration.sql'), 'utf8');
  report.migrationSHA256 = createHash('sha256').update(migration).digest('hex');
  await check('additive migration preserves historical work and fails closed on legacy provenance', async () => {
    await cluster.owner.query('CREATE TABLE \"_prisma_migrations\" (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)');
    assert.equal((await upgradeGuidedLabs(cluster.owner, 'bqual_test_app')).status, 'APPLIED');
    assert.equal((await upgradeGuidedLabs(cluster.owner, 'bqual_test_app')).status, 'ALREADY_APPLIED');
    const row = (await cluster.owner.query('SELECT s.id,s."workHistoryState",i."workHistoryState" AS "itemState" FROM "StudentSubmission" s JOIN "SyllabusItem" i ON i.id=s."syllabusItemId" WHERE s.id=$1', ['legacy-placeholder'])).rows[0];
    assert.equal(row.id, 'legacy-placeholder'); assert.equal(row.workHistoryState, 'UNKNOWN'); assert.equal(row.itemState, 'UNKNOWN');
  });
  await check('migration grants only table operations to the existing restricted runtime role', async () => {
    for (const table of ['LabTemplate', 'LabTemplateVersion', 'LabStep', 'LabAssignment', 'LabAttempt', 'LabStepResponse', 'LabSubmission', 'LabEvidence', 'LabSubmissionEvidence', 'LabReview']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        assert.equal((await cluster.owner.query('SELECT has_table_privilege($1,$2,$3) allowed', ['lms_web_runtime_v1', 'public."' + table + '"', privilege])).rows[0].allowed, true);
      }
    }
    assert.equal((await cluster.owner.query("SELECT has_schema_privilege('lms_web_runtime_v1','public','CREATE') allowed")).rows[0].allowed, false);
  });
  await check('selected baseline and additive migration replay into a fresh owned database', async () => {
    const fresh = await cluster.createEmptyDatabase();
    assert.match(fresh.database, /^harness_labs_replay_/);
    await fresh.owner.query(baselineDdl); await fresh.owner.query(migration);
    const columns = await fresh.owner.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name<>'_prisma_migrations' ORDER BY table_name,ordinal_position");
    const upgradedColumns = await cluster.owner.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name<>'_prisma_migrations' ORDER BY table_name,ordinal_position");
    assert.deepEqual(columns.rows, upgradedColumns.rows);
    assert.equal((await fresh.owner.query('SELECT count(*)::int n FROM "LabAttempt"')).rows[0].n, 0);
  });
  // Explicit local test principal only. Production grants remain a deployment gate.
  await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
  const { PrismaClient } = webRequire('@prisma/client');
  const { PrismaPg } = webRequire('@prisma/adapter-pg');
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: cluster.url, max: 8 }), log: [] });
  const api = await load(db);
  scanner = await scannerFixture();
  process.env.CLAMAV_HOST = scanner.host; process.env.CLAMAV_PORT = String(scanner.port);
  let template, published, assignment, attempt;
  const context = () => ['course', assignment.id, attempt.id];
  const response = stepId => attempt.responses.find(row => row.stepId === stepId);
  const save = async (step, answer) => { attempt = await api.saveResponse(student, ...context(), step.id, { expectedRevision: response(step.id)?.revision ?? 0, answer }); };
  const academicViews = async () => {
    as(student);
    try {
      const url = 'https://lms.example.invalid/api/todo?institute=ics';
      const request = new Request(url); Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
      const todo = await api.readTodo(request); assert.equal(todo.status, 200);
      const assignments = await api.readAssignments(new Request('https://lms.example.invalid/api/assignments?institute=ics&courseId=course&limit=50')); assert.equal(assignments.status, 200);
      const calendar = await api.getDashboardCalendar(student, 'ics');
      return { todo: Object.values((await todo.json()).items).flat(), assignments: (await assignments.json()).assignments, calendar: calendar.events };
    } finally { as(null); }
  };

  await check('HTTP adapter rejects anonymous, cross-origin and forbidden-institute requests', async () => {
    const endpoint = 'https://lms.example.invalid/api/labs/templates';
    as(null);
    const anonymous = await api.handleLabRequest(new Request(endpoint), { path: ['templates'] });
    assert.equal(anonymous.status, 401); assert.equal(anonymous.headers.get('cache-control'), 'private, no-store');
    as(foreign);
    assert.equal((await api.handleLabRequest(new Request(endpoint), { path: ['templates'] })).status, 403);
    as(teacher);
    assert.equal((await api.handleLabRequest(new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://foreign.example.invalid' }, body: JSON.stringify({ preset: 'MYSQL' }) }), { path: ['templates'] })).status, 403);
    assert.equal((await api.handleLabRequest(new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{invalid' }), { path: ['templates'] })).status, 400);
    as(null);
    assert.equal(await db.labTemplate.count(), 0);
  });

  await check('only authorized ICS instructors author templates', async () => {
    await rejects(() => api.createTemplate(student, { preset: 'MYSQL' }), 403);
    await rejects(() => api.createTemplate(foreign, { preset: 'MYSQL' }), 403);
    await rejects(() => api.createTemplate({ ...teacher, role: 'SUPER_USER' }, { preset: 'MYSQL' }), 403);
    template = await api.createTemplate(teacher, { preset: 'MYSQL' });
    assert.equal(template.versions[0].status, 'DRAFT');
    await rejects(() => api.createAssignment(teacher, 'course', { versionId: template.versions[0].id }), 404);
    published = await api.publishTemplate(teacher, template.id, { expectedRevision: template.versions[0].revision });
    assert.equal(published.versions[0].status, 'PUBLISHED');
    await rejects(() => api.saveTemplate(teacher, template.id, { ...api.MYSQL_LAB, expectedRevision: published.versions[0].revision }), 409);
  });

  await check('legacy UNKNOWN placeholders cannot link and retain their IDs', async () => {
    await rejects(() => api.createAssignment(teacher, 'course', { versionId: published.versions[0].id, syllabusItemId: 'legacy' }), 409);
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: 'legacy-placeholder' } })).id, 'legacy-placeholder');
  });

  await check('linking uses the existing Classwork due date when validating the start date', async () => {
    const due = new Date(Date.now() + 86400000);
    const item = await db.syllabusItem.create({ data: { courseId: 'course', title: 'Scheduled untouched work', type: 'QUIZ', maxPoints: 50, dueDate: due, workHistoryState: 'UNTOUCHED' } });
    await rejects(() => api.createAssignment(teacher, 'course', { versionId: published.versions[0].id, syllabusItemId: item.id, opensAt: new Date(due.getTime() + 3600000).toISOString() }), 400);
    assert.equal(await db.labAssignment.count({ where: { syllabusItemId: item.id } }), 0);
    const preserved = await db.syllabusItem.findUniqueOrThrow({ where: { id: item.id } });
    assert.equal(preserved.dueDate.toISOString(), due.toISOString()); assert.equal(preserved.type, 'QUIZ');
  });

  await check('new untouched placeholders can link without replacement', async () => {
    const item = await db.syllabusItem.create({ data: { id: 'untouched', courseId: 'course', title: 'Untouched Midterm', type: 'MIDTERM_EXAM', maxPoints: 100, workHistoryState: 'UNTOUCHED' } });
    await db.studentSubmission.create({ data: { id: 'untouched-placeholder', syllabusItemId: item.id, studentId: student.id, workHistoryState: 'UNTOUCHED' } });
    const linked = await api.createAssignment(teacher, 'course', { versionId: published.versions[0].id, syllabusItemId: item.id });
    assert.equal(linked.syllabusItem.type, 'MIDTERM_EXAM');
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: 'untouched-placeholder' } })).id, 'untouched-placeholder');
  });

  await check('item provenance blocks linking after work is cleared or child rows disappear', async () => {
    const item = await db.syllabusItem.create({ data: { id: 'started', courseId: 'course', title: 'Previously edited', type: 'ACTIVITY', maxPoints: 100, workHistoryState: 'UNTOUCHED' } });
    await db.$transaction(async tx => { await api.lockSyllabusItem(tx, item.id); await api.markAcademicWorkStarted(tx, item.id); });
    await rejects(() => api.createAssignment(teacher, 'course', { versionId: published.versions[0].id, syllabusItemId: item.id }), 409);
    assert.equal((await db.syllabusItem.findUniqueOrThrow({ where: { id: item.id } })).workHistoryState, 'STARTED');
  });

  await check('publishing and opening resume one attempt; course and student isolation hold', async () => {
    assignment = await api.createAssignment(teacher, 'course', { versionId: published.versions[0].id, category: 'ACTIVITY', maxPoints: 100, dueDate: deadline() });
    await rejects(() => api.openAttempt(student, 'course', assignment.id), 404);
    let views = await academicViews();
    assert.equal(views.assignments.some(item => item.id === assignment.syllabusItem.id), false);
    assert.equal(views.todo.some(item => item.id === assignment.syllabusItem.id), false);
    await api.patchAssignment(teacher, 'course', assignment.id, { published: true, opensAt: new Date(Date.now() + 86400000).toISOString() });
    views = await academicViews();
    assert.equal(views.assignments.some(item => item.id === assignment.syllabusItem.id), false);
    assert.equal(views.todo.some(item => item.id === assignment.syllabusItem.id), false);
    assert.equal(views.calendar.some(item => item.id === 'syllabus_' + assignment.syllabusItem.id), false);
    await api.patchAssignment(teacher, 'course', assignment.id, { opensAt: null });
    views = await academicViews();
    assert.equal(views.assignments.some(item => item.id === assignment.syllabusItem.id), true);
    const opened = await Promise.all([api.openAttempt(student, 'course', assignment.id), api.openAttempt(student, 'course', assignment.id)]);
    assert.equal(opened[0].id, opened[1].id); attempt = opened[0];
    assert.equal(await db.labAttempt.count({ where: { assignmentId: assignment.id, studentId: student.id } }), 1);
    await rejects(() => api.getAttempt(other, ...context()), 404);
    await rejects(() => api.getAttempt(unrelated, ...context()), 403);
    await rejects(() => api.getAttempt(foreign, ...context()), 403);
    await rejects(() => api.getAttempt({ ...student, role: 'PROFESSOR' }, ...context()), 403);
    await rejects(() => api.submitAttempt(student, ...context(), { idempotencyKey: randomUUID() }), 400);
    await rejects(() => api.saveSubmission(student, 'course', { syllabusItemId: assignment.syllabusItem.id }), 409);
  });

  await check('progress persists, stale saves and cross-version steps are rejected', async () => {
    for (const step of attempt.version.steps) {
      if (step.type === 'INSTRUCTIONS' || step.type === 'COMMAND') await save(step, { acknowledged: true });
      if (step.type === 'CHECKLIST') await save(step, { checkedIds: step.config.items.map(item => item.id) });
      if (step.type === 'TEXT_RESPONSE') await save(step, { text: 'CREATE DATABASE makes a database; USE selects the current database.' });
    }
    const textStep = attempt.version.steps.find(step => step.type === 'TEXT_RESPONSE');
    await rejects(() => api.saveResponse(student, ...context(), textStep.id, { expectedRevision: 0, answer: { text: 'stale overwrite' } }), 409);
    await rejects(() => api.saveResponse(student, ...context(), 'unrelated-version-step', { expectedRevision: 0, answer: {} }), 404);
    const restored = await api.getAttempt(student, ...context());
    assert.equal(restored.responses.find(row => row.stepId === textStep.id).answer.text, response(textStep.id).answer.text);
  });

  await check('evidence validates size, type, scanner failures and private ownership', async () => {
    const step = attempt.version.steps.find(step => step.type === 'EVIDENCE_UPLOAD');
    await rejects(() => api.uploadEvidence(student, ...context(), step.id, new File([new Uint8Array(api.LAB_MAX_BYTES + 1)], 'big.png', { type: 'image/png' }), 0), 413);
    await rejects(() => api.uploadEvidence(student, ...context(), step.id, new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }), 0), 400);
    scanner.setMode('infected'); await rejects(() => api.uploadEvidence(student, ...context(), step.id, image(), 0), 400);
    scanner.setMode('invalid'); await rejects(() => api.uploadEvidence(student, ...context(), step.id, image(), 0), 503);
    assert.equal(await db.labEvidence.count(), 0);
    scanner.setMode('clean'); attempt = await api.uploadEvidence(student, ...context(), step.id, image('../result.png'), 0);
    const evidence = response(step.id).evidence[0];
    assert.equal(evidence.fileName, 'result.png');
    assert.deepEqual((await api.readLabEvidence(student, evidence.id)).bytes, png);
    const storedEvidence = await db.labEvidence.findUniqueOrThrow({ where: { id: evidence.id } });
    assert.deepEqual((await api.readPrivateUpload(student, storedEvidence.assetId)).bytes, png);
    await rejects(() => api.readLabEvidence(other, evidence.id), 404);
    await rejects(() => api.readLabEvidence(teacher, evidence.id), 404);
    await cluster.owner.query('UPDATE "Enrollment" SET status=\'PENDING\' WHERE id=\'student-enrollment\'');
    try { await rejects(() => api.readPrivateUpload(student, storedEvidence.assetId), 403); }
    finally { await cluster.owner.query('UPDATE "Enrollment" SET status=\'APPROVED\' WHERE id=\'student-enrollment\''); }
  });

  await check('lab evidence cannot be repurposed as an ordinary private attachment', async () => {
    const evidence = await db.labEvidence.findFirstOrThrow();
    const item = await db.syllabusItem.create({ data: { id: 'reuse-item', courseId: 'course', type: 'ASSIGNMENT', title: 'Separate ordinary assignment', maxPoints: 100, workHistoryState: 'UNTOUCHED' } });
    const url = '/api/assets/' + evidence.assetId;
    await rejects(() => api.requireOwnedUpload(db, student, url), 409);
    await rejects(() => api.saveSubmission(student, 'course', { syllabusItemId: item.id, status: 'DRAFT', attachments: [{ type: 'FILE', fileName: 'lab-evidence.png', url }] }), 409);
    assert.equal(await db.studentSubmission.count({ where: { syllabusItemId: item.id } }), 0);
    assert.equal(await db.submissionAttachment.count({ where: { url } }), 0);
    assert.equal((await db.syllabusItem.findUniqueOrThrow({ where: { id: item.id } })).workHistoryState, 'UNTOUCHED');
    const ordinary = await db.privateAsset.create({ data: { id: 'ordinary-test-file', ownerId: student.id, instituteId: 'ics', fileName: 'ordinary.txt', mimeType: 'text/plain', size: 4, content: Buffer.from('safe'), scanStatus: 'CLEAN' } });
    await api.requireOwnedUpload(db, student, '/api/assets/' + ordinary.id);
    const result = await api.saveSubmission(student, 'course', { syllabusItemId: item.id, status: 'DRAFT', attachments: [{ type: 'FILE', fileName: ordinary.fileName, url: '/api/assets/' + ordinary.id }] });
    assert.equal(result.submission.attachments.length, 1);
    assert.equal(result.submission.attachments[0].url, '/api/assets/' + ordinary.id);
  });

  let firstSnapshot;
  await check('lost submit response replays exactly once with one snapshot and notification', async () => {
    const input = { idempotencyKey: randomUUID() };
    const first = await api.submitAttempt(student, ...context(), input);
    const replay = await api.submitAttempt(student, ...context(), input);
    assert.deepEqual(replay, first);
    assert.equal(await db.labSubmission.count({ where: { attemptId: attempt.id } }), 1);
    assert.equal(await db.notification.count({ where: { userId: teacher.id, title: 'Practical lab submitted' } }), 1);
    firstSnapshot = await db.labSubmission.findUniqueOrThrow({ where: { id: first.submissionId } });
    const evidence = attempt.responses.flatMap(row => row.evidence)[0];
    assert.deepEqual((await api.readLabEvidence(teacher, evidence.id)).bytes, png);
    await rejects(() => api.saveResponse(student, ...context(), attempt.version.steps[0].id, { expectedRevision: 1, answer: { acknowledged: false } }), 409);
  });

  await check('notification failure rolls back review, academic grade and replay receipt', async () => {
    await cluster.owner.query(`CREATE FUNCTION lab_test_notification_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notification storage failure'; END $$;
      CREATE TRIGGER lab_test_notification_failure BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION lab_test_notification_failure();`);
    const count = await db.submissionRequest.count();
    try {
      await assert.rejects(() => api.reviewAttempt(teacher, ...context(), { idempotencyKey: randomUUID(), decision: 'GRADED', score: 70, comment: 'Rollback test.' }));
      assert.equal((await db.labAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).status, 'SUBMITTED');
      assert.equal(await db.labReview.count({ where: { attemptId: attempt.id } }), 0);
      assert.equal(await db.submissionRequest.count(), count);
      assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { syllabusItemId_studentId: { syllabusItemId: assignment.syllabusItem.id, studentId: student.id } } })).grade, null);
    } finally { await cluster.owner.query('DROP TRIGGER lab_test_notification_failure ON "Notification"; DROP FUNCTION lab_test_notification_failure();'); }
  });

  await check('correction review defaults seven days, replays without duplicates and rejects changed payload', async () => {
    const input = { idempotencyKey: randomUUID(), decision: 'NEEDS_REVISION', comment: 'Add a clearer screenshot.', stepId: attempt.version.steps.find(step => step.type === 'EVIDENCE_UPLOAD').id };
    const before = Date.now();
    const first = await api.reviewAttempt(teacher, ...context(), input);
    const expiry = new Date(first.revisionDueAt).getTime();
    assert.ok(expiry >= before + 7 * 86400000 && expiry <= Date.now() + 7 * 86400000);
    assert.deepEqual(await api.reviewAttempt(teacher, ...context(), input), first);
    await rejects(() => api.reviewAttempt(teacher, ...context(), { ...input, comment: 'Different payload' }), 409);
    assert.equal(await db.labReview.count({ where: { attemptId: attempt.id } }), 1);
    const projection = await db.studentSubmission.findUniqueOrThrow({ where: { syllabusItemId_studentId: { syllabusItemId: assignment.syllabusItem.id, studentId: student.id } } });
    assert.equal(projection.status, 'DRAFT'); assert.equal(projection.isReturned, false); assert.equal(projection.grade, null);
    const views = await academicViews();
    const pending = views.todo.find(item => item.id === assignment.syllabusItem.id);
    assert.equal(pending.labStatus, 'NEEDS_REVISION'); assert.equal(pending.dueDate, first.revisionDueAt);
    assert.equal(views.calendar.find(item => item.id === 'syllabus_' + assignment.syllabusItem.id).eventDate, first.revisionDueAt);
  });

  await check('expired corrections block edits and submission until instructor reopens', async () => {
    await cluster.owner.query('UPDATE "LabAttempt" SET "revisionDueAt"=CURRENT_TIMESTAMP - interval \'1 minute\' WHERE id=$1', [attempt.id]);
    const step = attempt.version.steps.find(step => step.type === 'TEXT_RESPONSE');
    await rejects(() => api.saveResponse(student, ...context(), step.id, { expectedRevision: response(step.id).revision, answer: { text: 'After expiry' } }), 409);
    const evidenceStep = attempt.version.steps.find(step => step.type === 'EVIDENCE_UPLOAD');
    await rejects(() => api.uploadEvidence(student, ...context(), evidenceStep.id, image(), response(evidenceStep.id).revision), 409);
    await rejects(() => api.submitAttempt(student, ...context(), { idempotencyKey: randomUUID() }), 409);
    await rejects(() => api.reopenAttempt(student, ...context(), { idempotencyKey: randomUUID(), comment: 'Self reopen', revisionDueAt: deadline() }), 403);
    const input = { idempotencyKey: randomUUID(), comment: 'Correction window reopened.', revisionDueAt: deadline() };
    const first = await api.reopenAttempt(teacher, ...context(), input);
    assert.deepEqual(await api.reopenAttempt(teacher, ...context(), input), first);
    assert.equal(await db.labReview.count({ where: { attemptId: attempt.id, decision: 'REOPENED' } }), 1);
  });

  await check('replacement evidence and resubmission preserve earlier immutable work', async () => {
    attempt = await api.getAttempt(student, ...context());
    const step = attempt.version.steps.find(step => step.type === 'EVIDENCE_UPLOAD');
    const old = response(step.id).evidence.find(row => !row.supersededAt);
    attempt = await api.uploadEvidence(student, ...context(), step.id, image('corrected.png'), response(step.id).revision, old.id);
    assert.equal(response(step.id).evidence.length, 2);
    assert.ok(response(step.id).evidence.find(row => row.id === old.id).supersededAt);
    assert.deepEqual((await api.readLabEvidence(teacher, old.id)).bytes, png);
    const textStep = attempt.version.steps.find(row => row.type === 'TEXT_RESPONSE');
    await save(textStep, { text: 'Corrected explanation of creating versus selecting a database.' });
    const result = await api.submitAttempt(student, ...context(), { idempotencyKey: randomUUID() });
    assert.equal(result.round, 2);
    assert.deepEqual((await db.labSubmission.findUniqueOrThrow({ where: { id: firstSnapshot.id } })).snapshot, firstSnapshot.snapshot);
    assert.equal(await db.labEvidence.count(), 2);
  });

  await check('final grade and review replay commit once into existing academic record', async () => {
    const input = { idempotencyKey: randomUUID(), decision: 'GRADED', score: 92.25, comment: 'The corrected evidence meets the requirements.' };
    const result = await api.reviewAttempt(teacher, ...context(), input);
    assert.deepEqual(await api.reviewAttempt(teacher, ...context(), input), result);
    const projection = await db.studentSubmission.findUniqueOrThrow({ where: { syllabusItemId_studentId: { syllabusItemId: assignment.syllabusItem.id, studentId: student.id } } });
    assert.equal(projection.status, 'RETURNED'); assert.equal(projection.grade, 92.25); assert.equal(projection.isReturned, true);
    assert.equal((await db.syllabusItem.findUniqueOrThrow({ where: { id: assignment.syllabusItem.id } })).type, 'ACTIVITY');
    assert.equal(await db.labReview.count({ where: { attemptId: attempt.id, decision: 'GRADED' } }), 1);
    assert.equal(await db.notification.count({ where: { userId: student.id, title: 'Practical lab graded' } }), 1);
    await rejects(() => api.gradeSubmission(teacher, projection.id, 10), 409);
    assert.equal((await academicViews()).todo.some(item => item.id === assignment.syllabusItem.id), false);
  });

  await check('archival hides discovery but preserves authorized submitted history', async () => {
    await api.patchAssignment(teacher, 'course', assignment.id, { archived: true });
    const views = await academicViews();
    assert.equal(views.assignments.some(item => item.id === assignment.syllabusItem.id), false);
    assert.equal(views.todo.some(item => item.id === assignment.syllabusItem.id), false);
    assert.equal(views.calendar.some(item => item.id === 'syllabus_' + assignment.syllabusItem.id), false);
    assert.equal((await api.getAttempt(student, ...context())).status, 'GRADED');
    await api.patchAssignment(teacher, 'course', assignment.id, { archived: false });
  });

  await check('linking and an ordinary submission race under the same item lock', async () => {
    const item = await db.syllabusItem.create({ data: { id: 'race', courseId: 'course', title: 'Race test', type: 'QUIZ', maxPoints: 100, workHistoryState: 'UNTOUCHED' } });
    const outcomes = await Promise.allSettled([
      api.createAssignment(teacher, 'course', { versionId: published.versions[0].id, syllabusItemId: item.id }),
      api.saveSubmission(student, 'course', { syllabusItemId: item.id, status: 'DRAFT' }),
    ]);
    assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(row => row.status === 'rejected' && row.reason.status === 409).length, 1);
  });

  await check('review queue pages beyond fifty students and filters without exposing other student work', async () => {
    const users = Array.from({ length: 54 }, (_, index) => ({ id: 'queue-student-' + String(index).padStart(3, '0'), name: 'Queue Student ' + index, email: 'queue-' + index + '@example.invalid', role: 'STUDENT', instituteId: 'ics' }));
    await db.user.createMany({ data: users });
    await db.enrollment.createMany({ data: users.map(user => ({ courseId: 'course', studentId: user.id, status: 'APPROVED' })) });
    await db.labAttempt.createMany({ data: users.map(user => ({ id: 'queue-attempt-' + user.id, assignmentId: assignment.id, versionId: attempt.version.id, studentId: user.id, attemptNumber: 1, evidenceToken: randomUUID() })) });
    const first = await api.getAssignment(teacher, 'course', assignment.id, 1);
    const second = await api.getAssignment(teacher, 'course', assignment.id, 2);
    assert.equal(first.attemptPagination.total, 55); assert.equal(first.attempts.length, 50); assert.equal(second.attempts.length, 5);
    assert.equal(new Set([...first.attempts, ...second.attempts].map(row => row.id)).size, 55);
    const target = second.attempts.at(-1).student.id;
    const filtered = await api.getAssignment(teacher, 'course', assignment.id, 1, target);
    assert.equal(filtered.attempts.length, 1); assert.equal(filtered.attempts[0].student.id, target);
    const ownOnly = await api.getAssignment(student, 'course', assignment.id, 1, target);
    assert.equal(ownOnly.attempts.length, 1); assert.equal(ownOnly.attempts[0].student.id, student.id);
    await rejects(() => api.getAssignment(teacher, 'course', assignment.id, 3), 400);
  });

  await check('database constraints freeze published instructions, provenance and submitted history', async () => {
    await assert.rejects(() => cluster.owner.query('UPDATE "LabTemplateVersion" SET title=$1 WHERE id=$2', ['Changed after publication', published.versions[0].id]), error => error.code === '23514');
    await assert.rejects(() => cluster.owner.query('UPDATE "LabStep" SET title=$1 WHERE id=$2', ['Changed step', attempt.version.steps[0].id]), error => error.code === '23514');
    await assert.rejects(() => cluster.owner.query('UPDATE "LabSubmission" SET snapshot=$1::jsonb WHERE id=$2', ['{}', firstSnapshot.id]), error => error.code === '23514');
    await assert.rejects(() => cluster.owner.query('DELETE FROM "LabReview" WHERE "attemptId"=$1', [attempt.id]), error => error.code === '23514');
    await assert.rejects(() => cluster.owner.query('UPDATE "SyllabusItem" SET "workHistoryState"=\'UNTOUCHED\' WHERE id=$1', [assignment.syllabusItem.id]), error => error.code === '23514');
    const draft = await api.draftTemplate(teacher, template.id);
    const newVersion = draft.versions.find(version => version.status === 'DRAFT');
    assert.notEqual(newVersion.id, attempt.version.id);
    assert.equal((await api.getAttempt(student, ...context())).version.id, attempt.version.id);
    await assert.rejects(() => db.labStepResponse.create({ data: { attemptId: attempt.id, stepId: newVersion.steps[0].id, versionId: attempt.version.id, answer: {} } }), error => error.code === 'P2003');
  });

  report.finishedAt = new Date().toISOString(); report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.failure = { name: error.name, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted connection]') };
  console.error(report.failure.name + ': ' + report.failure.message);
  process.exitCode = 1;
} finally {
  await db?.$disconnect().catch(() => {});
  await scanner?.close();
  await cluster?.stop();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Lab integration report: ${path.relative(process.cwd(), output)}/report.json; ${report.checks.length} checks passed.`);
}
