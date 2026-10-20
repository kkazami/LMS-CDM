const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, as, request } = require('./helpers.cjs');

test('submission and grading contracts reject malformed data before writes', async () => {
  const api = await load();
  const student = { id: 's', instituteId: 'ics', role: 'STUDENT' };
  for (const input of [{ syllabusItemId: 'x', status: 'RETURNED' }, { syllabusItemId: 'x', attachments: [{ url: 'javascript:bad' }] }, { syllabusItemId: 'x', studentId: 'other' }]) await assert.rejects(api.saveSubmission(student, 'c', input), e => e.status === 400);
  await assert.rejects(api.saveSubmission({ ...student, role: 'PROFESSOR' }, 'c', { syllabusItemId: 'x' }), e => e.status === 403);
  for (const grade of [NaN, Infinity, -1, '100']) await assert.rejects(api.gradeSubmission(student, 'x', grade), e => e.status === 400);
});

test('academic HTTP mutations reject cross-origin and malformed JSON before any write', async () => {
  const api = await load(); as({ id: 's', instituteId: 'ics', role: 'STUDENT' });
  assert.equal((await api.submit(request('/api/courses/c/submissions', { syllabusItemId: 'x' }, { Origin: 'https://foreign.example.test' }), { params: Promise.resolve({ courseId: 'c' }) })).status, 403);
  const response = await api.grade(new Request('https://lms.example.test/api/courses/c/submissions/grade', { method: 'POST', body: '{invalid' }), { params: Promise.resolve({ courseId: 'c' }) });
  assert.equal(response.status, 400);
});
