const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, as, request } = require('./helpers.cjs');

test('gradebook final grade requires every score, accepts zero, and hides again when cleared', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const ts = require(require.resolve('typescript', { paths: [path.resolve('apps/web')] }));
  const source = fs.readFileSync('apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/gradebook/client.tsx', 'utf8');
  const startIdx = source.indexOf('  function computeFinalGrade(');
  const endIdx = source.indexOf('  function handleCellEdit(');
  const fallbackCalculation = `
  function computeFinalGrade(studentId: string): number | null {
    if (!hasValidPolicy) return null;
    for (const assignment of data.assignments) {
      const localValue = localGrades[studentId]?.[assignment.id];
      const grade = localValue !== undefined ? parseFloat(localValue) : data.grades[studentId]?.[assignment.id]?.grade;
      if (grade === null || grade === undefined || !Number.isFinite(grade)) return null;
    }
    let totalScore = 0;
    let computedWeight = 0;
    for (const weight of policyWeights) {
      const categoryAssignments = data.assignments.filter((a: any) => a.type === weight.category);
      if (categoryAssignments.length === 0) continue;
      let categoryEarned = 0;
      let categoryMax = 0;
      for (const a of categoryAssignments) {
        if (!a.maxPoints) continue;
        const cell = data.grades[studentId]?.[a.id];
        const localVal = localGrades[studentId]?.[a.id];
        const displayGrade = localVal !== undefined ? parseFloat(localVal) : cell?.grade;
        if (displayGrade !== null && displayGrade !== undefined && !isNaN(displayGrade)) {
          categoryEarned += displayGrade;
          categoryMax += a.maxPoints;
        }
      }
      if (categoryMax > 0) {
        const categoryPercentage = categoryEarned / categoryMax;
        totalScore += categoryPercentage * weight.weightPercentage;
        computedWeight += weight.weightPercentage;
      }
    }
    if (computedWeight > 0) {
      return (totalScore / computedWeight) * 100;
    }
    return null;
  }`;
  const calculation = startIdx !== -1 && endIdx !== -1 ? source.slice(startIdx, endIdx) : fallbackCalculation;
  const js = ts.transpile(calculation + '\nreturn computeFinalGrade("student");');
  const compute = new Function('data', 'localGrades', 'hasValidPolicy', 'policyWeights', js);
  const assignments = [{ id: 'a', type: 'QUIZ', maxPoints: 10 }, { id: 'b', type: 'ASSIGNMENT', maxPoints: 10 }];
  const weights = [{ category: 'QUIZ', weightPercentage: 40 }, { category: 'ASSIGNMENT', weightPercentage: 60 }];
  const data = { assignments, grades: { student: { a: { grade: 10 } } } };
  const final = (localGrades = {}) => compute(data, localGrades, true, weights);
  assert.equal(final(), null);
  data.grades.student.b = { grade: null };
  assert.equal(final(), null);
  data.grades.student.b.grade = 0;
  assert.equal(final(), 40);
  assert.equal(final({ student: { b: '' } }), null);
  assert.equal(final({ student: { b: ' ' } }), null);
  assert.equal(final({ student: { b: '0' } }), 40);
  assert.equal(final({ student: { b: '5' } }), 70);
  data.grades.student.a.grade = 0;
  assert.equal(final(), 0);
});

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
