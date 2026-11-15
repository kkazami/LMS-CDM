const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { Client } = require('pg');
const { invoke, provider } = require('./audit-loader.cjs');

// The launcher creates this cluster in a network-none namespace. No supplied DB URL is accepted.
assert.equal(process.env.AUDIT_DISPOSABLE, '1', 'Use run-audit-regressions.ps1');
assert.equal(process.env.DATABASE_URL, 'postgresql://audit_app:dummy_fixture_only@127.0.0.1:5432/audit_regression');
const owner = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', database: 'audit_regression', connectionTimeoutMillis: 5000 });
const tokens = { teacher: randomBytes(32).toString('base64url'), student: randomBytes(32).toString('base64url'), admin: randomBytes(32).toString('base64url') };
const observations = [];
let db, routes;
const source = route => require(path.resolve('apps/web/src/app/api', route, 'route.ts'));
const body = assignmentId => ({ studentId: 'student', assignmentId, activityType: 'pc-build',
  variantSeed: 'audit-fixture', startedAt: new Date().toISOString(), completionTimeSeconds: 1,
  attempts: 1, stateCheck: { solved: false, poweredOn: false }, score: 100, maxScore: 100, passed: true });

before(async () => {
  await owner.connect();
  const identity = (await owner.query('SELECT current_database() db, host(inet_server_addr()) host')).rows[0];
  assert.deepEqual(identity, { db: 'audit_regression', host: '127.0.0.1' });
  assert.equal((await owner.query('SELECT count(*)::int n FROM information_schema.tables WHERE table_schema=\'public\'')).rows[0].n, 0);
  await owner.query(fs.readFileSync('/fixture/schema.sql', 'utf8'));
  // Fixture-owner provisioning happens before the production guard is installed.
  await owner.query(`
    INSERT INTO "Institute"(id,code,name) VALUES ('ics','ics','Dummy Computing'),('ite','ite','Dummy Education');
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES
    ('admin','Dummy Administrator','admin@example.invalid',NULL,'ADMIN','ics'),
    ('teacher','Dummy Teacher','teacher@example.invalid',NULL,'PROFESSOR','ics'),
    ('teacher-b','Dummy Foreign Teacher','teacher-b@example.invalid',NULL,'PROFESSOR','ite'),
    ('student','Dummy Student','student@example.invalid',NULL,'STUDENT','ics'),
    ('foreign-student','Dummy Foreign Student','foreign@example.invalid',NULL,'STUDENT','ite');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES
    ('course-a','A','DUMMY-A','Enrolled course','ics','teacher',now()),
    ('course-b','B','DUMMY-B','Unenrolled course','ics','teacher',now()),
    ('course-foreign','F','DUMMY-F','Other institute course','ite','teacher-b',now());
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES ('enrollment','course-a','student','APPROVED');
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES
    ('grade-item','course-a','ACTIVITY','Dummy activity',100,now()),
    ('foreign-item','course-b','ACTIVITY','Unenrolled activity',100,now()),
    ('cross-institute-item','course-foreign','ACTIVITY','Foreign activity',100,now()),
    ('form-item','course-a','QUIZ','Hidden-score form',10,now());
    INSERT INTO "ActivityTemplate"(id,"activityType","courseId","syllabusItemId","createdBy","updatedAt") VALUES
    ('own-template','pc-build','course-a','grade-item','teacher',now()),
    ('other-template','pc-build','course-b','foreign-item','teacher',now()),
    ('foreign-template','pc-build','course-foreign','cross-institute-item','teacher-b',now());
    INSERT INTO "StudentSubmission"(id,"syllabusItemId","studentId",grade,status,"updatedAt") VALUES
    ('existing-grade','grade-item','student',37,'GRADED',now());
  `);
  const { installSuperUserBoundary } = await import('../../scripts/install-super-user-boundary.mjs');
  await installSuperUserBoundary(owner, { runtimePrincipal: 'audit_app', operatorPrincipal: 'audit_operator',
    runtimePassword: 'dummy_fixture_only'.padEnd(32, '_'), operatorPassword: 'dummy_operator_only'.padEnd(32, '_'),
    qualificationReference: 'isolated-dummy-regression-fixture' });
  // The test URL contains synthetic credentials only; use a short fixed password after provisioning.
  await owner.query("ALTER ROLE audit_app PASSWORD 'dummy_fixture_only'");
  for (const successor of ['administrator-consolidation.sql', 'administrator-credentials.sql', 'student-program-assignment.sql']) {
    await owner.query(fs.readFileSync(path.join('prisma/super-user-v1', successor), 'utf8'));
  }
  db = require('../../apps/web/src/lib/db.ts').db;
  assert.equal(await require('../../apps/web/src/lib/super-user-v1/provisioning.ts').applicationWriterQualified(db), true,
    'A failed privileged-principal qualification must not masquerade as authorization success');
  for (const [userId, token] of Object.entries(tokens)) await db.session.create({ data: {
    id: `session-${userId}`, userId, tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 3600000), lastSeenAt: new Date(),
  } });
  for (const [userId, token] of Object.entries(tokens)) {
    const session = await require('../../apps/web/src/lib/auth-session.ts').validateSessionToken(token, false);
    assert.equal(session?.userId, userId, 'Control: each dummy bearer must pass real session admission');
  }
  routes = {
    activity: source('activities/submit').POST, restore: source('admin/database/restore').POST,
    export: source('admin/database/export').GET, run: source('codelab/run-tests').POST,
    classwork: source('courses/[courseId]/classwork').GET,
    submissions: source('courses/[courseId]/submissions').GET, grades: source('courses/[courseId]/grades').GET,
    submitForm: source('courses/[courseId]/forms/[formId]/attempts/[attemptId]/submit').POST,
  };
  // Exercise real session validation and resource guards before any negative assertion.
  const me = await invoke(source('auth/me').GET, tokens.student, '/api/auth/me');
  assert.equal(me.status, 200, await me.clone().text());
  const own = await invoke(routes.classwork, tokens.student, '/api/courses/course-a/classwork', 'GET', undefined, { courseId: 'course-a' });
  assert.equal(own.status, 200, await own.clone().text());
  const foreign = await invoke(routes.classwork, tokens.student, '/api/courses/course-b/classwork', 'GET', undefined, { courseId: 'course-b' });
  assert.equal(foreign.status, 403, 'Control: ordinary course access must reject the same unenrolled principal');
  const admin = await invoke(routes.export, tokens.admin, '/api/admin/database/export?model=User');
  assert.ok(admin.status === 200 || admin.status === 403, `Admin control failed: ${admin.status}`);
}, { timeout: 90000 });

after(async () => {
  fs.writeFileSync('/scratch/results.json', JSON.stringify(observations, null, 2));
  console.log('AUDIT_RESULTS_JSON ' + JSON.stringify(observations));
  await db?.$disconnect();
  await globalThis.pgPool?.end();
  await owner.end();
});

function regression(id, name, work) {
  test(`${id}: ${name}`, { timeout: 20000 }, async t => {
    const row = { lead: id, name, testFile: 'tests/security/audit-regressions.test.cjs', result: 'blocked' };
    observations.push(row);
    const { observed, secure } = await work();
    row.observed = observed;
    row.result = secure ? 'not reproduced' : 'reproduced';
    t.diagnostic(JSON.stringify(row));
    assert.ok(secure, `Secure behavior violated: ${JSON.stringify(observed)}`);
  });
}
function operational(response) {
  assert.ok(response.status < 500 && response.status !== 401 && response.status !== 429,
    `Fixture/infrastructure failure (${response.status}) is not a security verdict`);
}

regression(1, 'student outcome fields cannot assign or overwrite a trusted grade', async () => {
  const response = await invoke(routes.activity, tokens.student, '/api/activities/submit', 'POST', body('own-template'));
  operational(response);
  const submission = await db.studentSubmission.findUniqueOrThrow({ where: { id: 'existing-grade' } });
  const activity = await db.activitySubmission.findFirst({ where: { templateId: 'own-template', studentId: 'student' } });
  return { observed: { status: response.status, grade: submission.grade, activityScore: activity?.score ?? null, passed: activity?.passed ?? null },
    secure: submission.grade !== 100 && activity?.score !== 100 && activity?.passed !== true };
});

regression(2, 'selected templates require approved enrollment and the same institute', async () => {
  const observed = [];
  for (const [templateId, itemId] of [['other-template', 'foreign-item'], ['foreign-template', 'cross-institute-item']]) {
    const legacy = body(templateId);
    const { score, maxScore, passed, stateCheck, ...metadata } = legacy;
    const response = await invoke(routes.activity, tokens.student, '/api/activities/submit', 'POST', { ...metadata, answers: {} });
    operational(response);
    observed.push({ templateId, status: response.status,
      submissions: await db.activitySubmission.count({ where: { templateId, studentId: 'student' } }),
      grades: await db.studentSubmission.count({ where: { syllabusItemId: itemId, studentId: 'student' } }) });
  }
  return { observed, secure: observed.every(o => [403, 404].includes(o.status) && o.submissions === 0 && o.grades === 0) };
});

regression(3, 'restore cannot mutate another institute or bypass credential-field restrictions', async () => {
  const observed = [];
  for (const [targetId, field, value] of [['foreign-student', 'bio', 'dummy-unauthorized-marker'], ['student', 'password', 'disabled-dummy-credential']]) {
    const original = await db.user.findUniqueOrThrow({ where: { id: targetId } });
    // Prisma validates both upsert branches. Include required create fields from this dummy row.
    const record = { id: original.id, name: original.name, email: original.email, instituteId: original.instituteId, [field]: value };
    const response = await invoke(routes.restore, tokens.admin, '/api/admin/database/restore', 'POST', { model: 'User', records: [record] });
    operational(response);
    const saved = await db.user.findUniqueOrThrow({ where: { id: targetId } });
    observed.push({ targetId, field, status: response.status, changed: saved[field] !== original[field], restoredCount: (await response.json()).restoredCount ?? null });
  }
  return { observed, secure: observed.every(o => !o.changed) };
});

regression(4, 'model-selected export does not return another institute user', async () => {
  const response = await invoke(routes.export, tokens.admin, '/api/admin/database/export?model=User');
  operational(response);
  const text = await response.text();
  const exposed = text.includes('foreign@example.invalid') || text.includes('foreign-student');
  return { observed: { status: response.status, foreignDummyUserPresent: exposed }, secure: !exposed };
});

regression(5, 'CodeLab requires course authority before running or disclosing fixtures', async () => {
  const observed = [];
  for (const courseId of ['course-a', 'course-b', 'course-foreign']) {
    const templateId = `code-${courseId}`;
    await db.activityTemplate.create({ data: { id: templateId, activityType: 'codelab', courseId,
      createdBy: courseId === 'course-foreign' ? 'teacher-b' : 'teacher', variables: JSON.stringify({
        publicTestCases: [{ input: `private-input-${courseId}`, expectedOutput: 'fixture-output' }], variablesConfig: [],
      }) } });
    const calls = provider.calls;
    const response = await invoke(routes.run, tokens.student, '/api/codelab/run-tests', 'POST', {
      templateId, variantSeed: 'audit-fixture', sourceCode: 'print(1)', languageId: 71,
    });
    operational(response);
    const data = await response.json();
    if (courseId === 'course-a') {
      assert.equal(response.status, 200, JSON.stringify(data));
      assert.equal(data.results[0].expectedOutput, 'fixture-output', 'Control: fixture/provider must work for authorized principal');
    } else observed.push({ courseId, status: response.status, providerCalls: provider.calls - calls,
      input: data.results?.[0]?.input ?? null, expectedOutput: data.results?.[0]?.expectedOutput ?? null });
  }
  return { observed, secure: observed.every(o => [403, 404].includes(o.status) && o.providerCalls === 0 && o.input === null && o.expectedOutput === null) };
});

regression(6, 'completed scores are visible consistently to their authorized owner', async () => {
  await db.form.create({ data: { id: 'hidden-form', courseId: 'course-a', syllabusItemId: 'form-item',
    createdBy: 'teacher', title: 'Dummy hidden form', formType: 'QUIZ', status: 'PUBLISHED',
    showScoreAfter: false, opensAt: new Date(Date.now() - 60000), closesAt: new Date(Date.now() + 3600000),
    questions: { create: { id: 'question', questionType: 'MULTIPLE_CHOICE', prompt: 'Dummy question', points: 10,
      config: JSON.stringify({ options: [{ id: 'correct', text: 'Dummy answer', isCorrect: true }] }) } } } });
  await db.formAttempt.create({ data: { id: 'attempt', formId: 'hidden-form', userId: 'student',
    answers: { create: { questionId: 'question', answerOptions: JSON.stringify(['correct']) } } } });
  const params = { courseId: 'course-a', formId: 'hidden-form', attemptId: 'attempt' };
  const submitted = await invoke(routes.submitForm, tokens.student,
    '/api/courses/course-a/forms/hidden-form/attempts/attempt/submit', 'POST', {}, params);
  assert.equal(submitted.status, 200, await submitted.clone().text());
  assert.equal((await submitted.json()).score, 10);
  const saved = await db.studentSubmission.findUniqueOrThrow({ where: { syllabusItemId_studentId: { syllabusItemId: 'form-item', studentId: 'student' } } });
  assert.equal(saved.grade, 10, 'Control: real form scorer must persist the dummy score');
  assert.equal(saved.isReturned, true);
  const gradesResponse = await invoke(routes.grades, tokens.student, '/api/courses/course-a/grades', 'GET', undefined, params);
  const classworkResponse = await invoke(routes.classwork, tokens.student, '/api/courses/course-a/classwork', 'GET', undefined, params);
  const submissionsResponse = await invoke(routes.submissions, tokens.student, '/api/courses/course-a/submissions?syllabusItemId=form-item', 'GET', undefined, params);
  for (const response of [gradesResponse, classworkResponse, submissionsResponse]) assert.equal(response.status, 200, await response.clone().text());
  const grades = await gradesResponse.json(), classwork = await classworkResponse.json(), submissions = await submissionsResponse.json();
  const observed = { storedGrade: saved.grade, isReturned: saved.isReturned,
    gradesScore: grades.items.find(i => i.id === 'form-item').score,
    classworkGrade: classwork.items.find(i => i.id === 'form-item').submission?.grade ?? null,
    submissionsGrade: submissions.submission?.grade ?? null };
  assert.equal(observed.gradesScore, 10, 'Owner policy: completed form scores are visible to their student');
  console.log('SCORE_SIBLINGS ' + JSON.stringify(await require('./score-visibility-cases.cjs').scoreVisibilityCases(db, invoke, tokens, source)));
  return { observed, secure: observed.classworkGrade === 10 && observed.submissionsGrade === 10 };
});

test('database sibling endpoints preserve institute scope, secrets and restore invariants', { timeout: 20000 }, async () => {
  await require('./admin-database-cases.cjs')(db, invoke, tokens, source);
});

test('CodeLab evaluate and persisted static definitions preserve course authority', { timeout: 20000 }, async () => {
  await require('./codelab-authorization-cases.cjs')(db, invoke, tokens, source, provider);
});

test('valid raw activity answers are server-graded and normalized to coursework points', { timeout: 20000 }, async () => {
  const placed = socketId => ({ placed: true, socketId });
  const answers = { mobo: placed('case-mobo-socket'), cpu: placed('mobo-cpu-socket'), cooler: placed('mobo-cooler-socket'),
    gpu: placed('mobo-gpu-socket'), psu: placed('case-psu-socket'), thermalPasteApplied: true,
    ramSticks: { ram1: placed('dimm-A2'), ram2: placed('dimm-B2') } };
  const { score, maxScore, passed, stateCheck, ...metadata } = body('own-template');
  await db.syllabusItem.update({ where: { id: 'grade-item' }, data: { maxPoints: 10 } });
  for (const [paste, expectedScore, expectedGrade] of [[false, 0, 0], [true, 100, 10]]) {
    const response = await invoke(routes.activity, tokens.student, '/api/activities/submit', 'POST', {
      ...metadata, answers: { ...answers, thermalPasteApplied: paste },
    });
    assert.equal(response.status, 201, await response.clone().text());
    const result = await response.json();
    assert.equal(result.submission.score, expectedScore);
    assert.equal(result.submission.passed, paste);
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: 'existing-grade' } })).grade, expectedGrade);
  }
});
