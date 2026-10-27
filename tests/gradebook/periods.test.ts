import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePeriodGrades, defaultPeriodPolicy, periodAssignmentsSchema, periodPolicySchema, resolveItemPeriod } from '../../apps/web/src/lib/grading/periods';

const items = [
  { id: 'm', type: 'QUIZ', maxPoints: 100, gradingPeriod: 'MIDTERM' as const },
  { id: 'f', type: 'ACTIVITY', maxPoints: 100, gradingPeriod: 'FINALS' as const },
];
test('Midterm 80 and Finals 90 produce 86 using 40/60 without mixing point pools', () => {
  const scores: Record<string, number> = { m: 80, f: 90 };
  const result = calculatePeriodGrades(items, id => scores[id], defaultPeriodPolicy);
  assert.equal(result.MIDTERM.percentage, 80); assert.equal(result.FINALS.percentage, 90); assert.equal(result.finalGrade, 86);
  assert.equal(calculatePeriodGrades([{ ...items[0], maxPoints: 1000 }, items[1]], id => id === 'm' ? 800 : 90, defaultPeriodPolicy).finalGrade, 86);
});
test('edited policy applies independently and each period can use its own category allocation', () => {
  const policy = { midtermWeightPercentage: 30, finalsWeightPercentage: 70, categoryWeights: { MIDTERM: [{ category: 'QUIZ', weightPercentage: 25 }, { category: 'ACTIVITY', weightPercentage: 75 }] } };
  const work = [...items, { id: 'ma', type: 'ACTIVITY', maxPoints: 50, gradingPeriod: 'MIDTERM' as const }];
  const grades: Record<string, number> = { m: 100, ma: 25, f: 90 };
  const result = calculatePeriodGrades(work, id => grades[id], policy);
  assert.equal(result.MIDTERM.percentage, 62.5); assert.equal(result.FINALS.percentage, 90); assert.equal(result.finalGrade, 81.75);
});
test('missing grades and unassigned work block Final Grade; explicit zero is valid', () => {
  assert.equal(calculatePeriodGrades(items, id => id === 'm' ? 80 : null, defaultPeriodPolicy).finalGrade, null);
  assert.equal(calculatePeriodGrades(items, id => id === 'm' ? 0 : 100, defaultPeriodPolicy).finalGrade, 60);
  assert.equal(calculatePeriodGrades([...items, { id: 'u', type: 'QUIZ', maxPoints: 10 }], () => 5, defaultPeriodPolicy).finalGrade, null);
  assert.equal(calculatePeriodGrades(items, () => Number.NaN, defaultPeriodPolicy).finalGrade, null);
});
test('exam categories map explicitly, title guesses are unnecessary, manual unassignment overrides defaults', () => {
  assert.equal(resolveItemPeriod('MIDTERM_EXAM'), 'MIDTERM'); assert.equal(resolveItemPeriod('FINAL_EXAM'), 'FINALS');
  assert.equal(resolveItemPeriod('ACTIVITY'), 'UNASSIGNED'); assert.equal(resolveItemPeriod('MIDTERM_EXAM', 'UNASSIGNED'), 'UNASSIGNED');
});
test('invalid and duplicate policy input fails validation', () => {
  for (const change of [{ midtermWeightPercentage: 45 }, { finalsWeightPercentage: -1 }, { midtermWeightPercentage: Number.NaN }, { categoryWeights: { MIDTERM: [{ category: 'QUIZ', weightPercentage: 20 }] } }, { categoryWeights: { FINALS: [{ category: 'QUIZ', weightPercentage: 50 }, { category: 'QUIZ', weightPercentage: 50 }] } }]) assert.equal(periodPolicySchema.safeParse({ ...defaultPeriodPolicy, ...change }).success, false);
  assert.equal(periodAssignmentsSchema.safeParse([{ syllabusItemId: 'a', period: 'MIDTERM' }, { syllabusItemId: 'a', period: 'FINALS' }]).success, false);
});
test('legacy category policy is retained unless the period explicitly chooses total points', () => {
  const legacy = [{ category: 'QUIZ', weightPercentage: 50 }, { category: 'ACTIVITY', weightPercentage: 50 }];
  assert.equal(calculatePeriodGrades(items, () => 80, defaultPeriodPolicy, legacy).finalGrade, 80);
  assert.equal(calculatePeriodGrades(items, () => 80, defaultPeriodPolicy, [{ category: 'OTHER', weightPercentage: 100 }]).finalGrade, null);
  assert.equal(calculatePeriodGrades(items, () => 80, { ...defaultPeriodPolicy, categoryWeights: { MIDTERM: [], FINALS: [] } }, legacy).finalGrade, 80);
});
