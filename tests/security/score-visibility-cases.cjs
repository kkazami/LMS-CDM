const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');

// Run after the shared fixture has submitted and scored its own 10-point form.
async function scoreVisibilityCases(db, invoke, tokens, source, params = {}) {
  const selected = { courseId: 'course-a', formId: 'hidden-form', attemptId: 'attempt', itemId: 'form-item', ...params };
  const { courseId, formId, attemptId, itemId } = selected;
  assert.ok(tokens.teacher, 'The sibling fixture requires the assigned instructor token');
  const coursePath = `courses/${courseId}`;
  const formPath = `${coursePath}/forms/${formId}`;
  const results = [];
  const routes = {
    grades: ['courses/[courseId]/grades', `${coursePath}/grades`],
    globalGrades: ['grades', 'grades?institute=ics'],
    classwork: ['courses/[courseId]/classwork', `${coursePath}/classwork`],
    submissions: ['courses/[courseId]/submissions', `${coursePath}/submissions?syllabusItemId=${itemId}`],
    history: ['courses/[courseId]/forms/[formId]/attempts', `${formPath}/attempts`],
    attempt: ['courses/[courseId]/forms/[formId]/attempts/[attemptId]', `${formPath}/attempts/${attemptId}`],
    responses: ['courses/[courseId]/forms/[formId]/responses', `${formPath}/responses`],
    response: ['courses/[courseId]/forms/[formId]/responses/[attemptId]', `${formPath}/responses/${attemptId}`],
    responsesCsv: ['courses/[courseId]/forms/[formId]/responses/export', `${formPath}/responses/export`],
    gradebook: ['courses/[courseId]/gradebook', `${coursePath}/gradebook`],
    gradebookCsv: ['courses/[courseId]/gradebook/export', `${coursePath}/gradebook/export`],
  };
  async function get(name, token, overrides = {}) {
    const [module, url] = routes[name];
    const requested = { ...selected, ...overrides };
    const requestedUrl = url.replace(`courses/${courseId}`, `courses/${requested.courseId}`);
    return invoke(source(module).GET, token, `/api/${requestedUrl}`, 'GET', undefined, requested);
  }
  async function json(name, token) {
    const response = await get(name, token);
    assert.equal(response.status, 200, `${name}: ${await response.clone().text()}`);
    return response.json();
  }
  function record(endpoint, observed) { results.push({ endpoint, observed }); }

  const grades = await json('grades', tokens.student);
  assert.equal(grades.items.find(item => item.id === itemId)?.score, 10);
  record('course grades', { score: 10 });
  const globalGrades = await json('globalGrades', tokens.student);
  const stored = await db.studentSubmission.findUniqueOrThrow({ where: {
    syllabusItemId_studentId: { syllabusItemId: itemId, studentId: 'student' },
  } });
  assert.equal(globalGrades.grades.find(grade => grade.id === stored.id)?.value, 10,
    'Global grades must include a completed form score even when its submission status is SUBMITTED');
  record('global grades', { value: 10 });
  const classwork = await json('classwork', tokens.student);
  assert.equal(classwork.items.find(item => item.id === itemId)?.submission?.grade, 10);
  record('classwork', { grade: 10 });
  const submissions = await json('submissions', tokens.student);
  assert.equal(submissions.submission?.studentId, 'student');
  assert.equal(submissions.submission?.grade, 10);
  record('own submissions', { studentId: 'student', grade: 10 });
  const history = await json('history', tokens.student);
  assert.equal(history.attempts.find(attempt => attempt.id === attemptId)?.rawScore, 10);
  record('own attempt history', { rawScore: 10 });
  const attempt = await json('attempt', tokens.student);
  assert.equal(attempt.attempt.rawScore, 10);
  assert.equal(attempt.attempt.answers[0].pointsAwarded, 10);
  assert.equal('passwordHash' in attempt.attempt.form, false);
  // Score access must not implicitly release answer keys or separately hidden feedback.
  assert.equal(attempt.attempt.answers[0].isCorrect, null);
  assert.equal(attempt.attempt.answers[0].feedback, null);
  record('own attempt detail', { rawScore: 10, pointsAwarded: 10, answerKeyReleased: false });

  const teacherSubmissions = await json('submissions', tokens.teacher);
  assert.equal(teacherSubmissions.submissions.find(submission => submission.studentId === 'student')?.grade, 10);
  record('instructor submissions', { grade: 10 });
  const responses = await json('responses', tokens.teacher);
  assert.equal(responses.attempts.find(attempt => attempt.id === attemptId)?.rawScore, 10);
  record('instructor responses', { rawScore: 10 });
  const response = await json('response', tokens.teacher);
  assert.equal(response.attempt.rawScore, 10);
  assert.equal(response.attempt.questionsWithAnswers[0].answer.pointsAwarded, 10);
  record('instructor response detail', { rawScore: 10, pointsAwarded: 10 });

  // Fixture values deliberately have no commas/newlines; this is not a general CSV parser.
  const cells = line => line.replace(/^\uFEFF/, '').split(',').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
  for (const name of ['responsesCsv', 'gradebookCsv']) {
    const exported = await get(name, tokens.teacher);
    assert.equal(exported.status, 200, `${name}: ${await exported.clone().text()}`);
    const lines = (await exported.text()).trim().split(/\r?\n/).map(cells);
    const header = lines[0];
    const emailColumn = header.indexOf('Email');
    const scoreColumn = name === 'responsesCsv'
      ? header.indexOf('Raw Score')
      : header.findIndex(value => value.includes('Hidden-score form'));
    assert.ok(emailColumn >= 0 && scoreColumn >= 0, `${name}: expected score/email columns`);
    const row = lines.slice(1).find(row => row[emailColumn] === 'student@example.invalid');
    assert.equal(Number(row?.[scoreColumn]), 10, `${name}: student's exact form score`);
    record(name, { score: 10 });
  }
  const gradebook = await json('gradebook', tokens.teacher);
  assert.equal(gradebook.grades.student[itemId].grade, 10);
  record('instructor gradebook', { grade: 10 });

  for (const name of ['responses', 'response', 'responsesCsv', 'gradebook', 'gradebookCsv']) {
    const denied = await get(name, tokens.student);
    assert.equal(denied.status, 403, `${name}: student must not become an instructor reader`);
    record(`${name} student denial`, { status: 403 });
  }
  for (const name of ['grades', 'classwork', 'submissions']) {
    const denied = await get(name, tokens.student, { courseId: 'course-b' });
    assert.equal(denied.status, 403, `${name}: student must not read an unenrolled course`);
    record(`${name} unenrolled denial`, { status: 403 });
  }

  const peerId = 'score-visibility-peer';
  await db.user.create({ data: { id: peerId, name: 'Dummy Score Peer', email: 'score-peer@example.invalid', role: 'STUDENT', instituteId: 'ics' } });
  await db.enrollment.create({ data: { studentId: peerId, courseId, status: 'APPROVED' } });
  const peerToken = randomBytes(32).toString('base64url');
  await db.session.create({ data: { userId: peerId,
    tokenHash: createHash('sha256').update(peerToken).digest('hex'),
    expiresAt: new Date(Date.now() + 3600000), lastSeenAt: new Date(),
  } });
  const peerHistory = await json('history', peerToken);
  assert.equal(peerHistory.attempts.length, 0, 'A same-course peer cannot list the owner\'s attempts');
  const peerSubmissions = await json('submissions', peerToken);
  assert.equal(peerSubmissions.submission, null, 'A same-course peer cannot read the owner\'s submission');
  const peerAttempt = await get('attempt', peerToken);
  assert.equal(peerAttempt.status, 403, 'A valid same-course peer cannot select the owner\'s attempt ID');
  record('same-course peer isolation', { historyCount: 0, submission: null, attemptStatus: 403 });

  const foreignTeacherToken = randomBytes(32).toString('base64url');
  await db.session.create({ data: { userId: 'teacher-b',
    tokenHash: createHash('sha256').update(foreignTeacherToken).digest('hex'),
    expiresAt: new Date(Date.now() + 3600000), lastSeenAt: new Date(),
  } });
  for (const name of ['responses', 'response', 'responsesCsv', 'gradebook']) {
    const denied = await get(name, foreignTeacherToken);
    assert.ok([403, 404].includes(denied.status), `${name}: a foreign instructor cannot read course scores`);
    record(`${name} foreign instructor denial`, { status: denied.status });
  }

  // Mutation responses serialize the same scores as the read endpoints.
  const answer = await db.formAttemptAnswer.findFirstOrThrow({ where: { attemptId } });
  const regrade = token => invoke(source(routes.response[0]).PATCH, token,
    `/api/${routes.response[1]}`, 'PATCH', { answerId: answer.id, pointsAwarded: 10 }, selected);
  for (const token of [tokens.student, foreignTeacherToken]) {
    const denied = await regrade(token);
    assert.ok([403, 404].includes(denied.status), 'Only the authorized instructor can serialize a manual regrade');
  }
  const regraded = await regrade(tokens.teacher);
  assert.equal(regraded.status, 200, await regraded.clone().text());
  assert.equal((await regraded.json()).newScore, 10);
  assert.equal((await json('attempt', tokens.student)).attempt.rawScore, 10);
  record('manual response grading', { newScore: 10, ownerRawScore: 10 });

  const grade = token => invoke(source('courses/[courseId]/submissions/grade').POST, token,
    `/api/${coursePath}/submissions/grade`, 'POST', { submissionId: stored.id, grade: 10 }, selected);
  for (const token of [tokens.student, foreignTeacherToken]) {
    const denied = await grade(token);
    assert.ok([403, 404].includes(denied.status), 'Student and foreign instructor cannot return this submission');
  }
  const returned = await grade(tokens.teacher);
  assert.equal(returned.status, 200, await returned.clone().text());
  const returnedSubmission = (await returned.json()).submission;
  assert.equal(returnedSubmission.studentId, 'student');
  assert.equal(returnedSubmission.grade, 10);
  assert.equal(returnedSubmission.isReturned, true);
  record('submission grading response', { grade: 10, isReturned: true });
  return results;
}

module.exports = { scoreVisibilityCases };
