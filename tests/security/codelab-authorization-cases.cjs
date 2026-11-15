const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');

module.exports = async function codelabAuthorizationCases(db, invoke, tokens, source, provider) {
  for (const courseId of ['course-b', 'course-foreign']) {
    const before = provider.calls;
    const response = await invoke(source('codelab/evaluate').POST, tokens.student, '/api/codelab/evaluate', 'POST', {
      templateId: `code-${courseId}`, seed: 'audit-fixture', sourceCode: 'print(1)', languageId: 71,
    });
    assert.ok([403, 404].includes(response.status), await response.clone().text());
    assert.equal(provider.calls, before, 'Foreign assessments must be rejected before execution');
    assert.equal(await db.activitySubmission.count({ where: { templateId: `code-${courseId}` } }), 0);
  }
  // A valid course template cannot redirect its grade to another course's item.
  await db.activityTemplate.create({ data: { id: 'bad-linked-code', activityType: 'codelab', courseId: 'course-a',
    syllabusItemId: 'cross-institute-item', createdBy: 'teacher', variables: JSON.stringify({
      publicTestCases: [{ input: '', expectedOutput: 'fixture-output' }], variablesConfig: [],
    }) } });
  const redirected = await invoke(source('codelab/evaluate').POST, tokens.student, '/api/codelab/evaluate', 'POST', {
    templateId: 'bad-linked-code', seed: 'audit-fixture', sourceCode: 'print(1)', languageId: 71,
  });
  assert.equal(redirected.status, 409, await redirected.clone().text());
  assert.equal(await db.activitySubmission.count({ where: { templateId: 'bad-linked-code' } }), 0);
  const completion = require('../../apps/web/src/lib/codelab-completion.ts');
  const problemId = 'python-level-1';
  const payload = studentId => ({ studentId, assignmentId: problemId, activityType: 'codelab', variantSeed: 'fixture',
    startedAt: new Date().toISOString(), completionTimeSeconds: 1, attempts: 1,
    score: 100, maxScore: 100, passed: true, stateCheck: { sourceCode: 'dummy server-evaluated result' } });
  const save = userId => async () => Response.json(await completion.saveCodeLabCompletion(payload(userId), 'ics'));
  const first = await invoke(save('student'), tokens.student, '/api/codelab/evaluate', 'POST', {});
  assert.equal(first.status, 200);
  const saved = (await first.json()).submission;
  const template = await db.activityTemplate.findUniqueOrThrow({ where: { id: saved.templateId } });
  assert.equal(template.courseId, 'course-a');
  assert.ok(await completion.getCodeLabCompletion('student', problemId), 'Public problem progress survives course-specific persistence');
  await db.user.create({ data: { id: 'other-course-student', name: 'Dummy Other Student', email: 'other-course@example.invalid', instituteId: 'ics', role: 'STUDENT' } });
  await db.enrollment.create({ data: { studentId: 'other-course-student', courseId: 'course-b', status: 'APPROVED' } });
  const token = randomBytes(32).toString('base64url');
  await db.session.create({ data: { userId: 'other-course-student', tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), lastSeenAt: new Date() } });
  const second = await invoke(save('other-course-student'), token, '/api/codelab/evaluate', 'POST', {});
  const other = (await second.json()).submission;
  assert.notEqual(other.templateId, saved.templateId, 'Public definitions must not share course-owned records');
  assert.equal((await db.activityTemplate.findUniqueOrThrow({ where: { id: other.templateId } })).courseId, 'course-b');
};
