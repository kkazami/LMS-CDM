import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MYSQL_LAB } from '../../apps/web/src/lib/labs/mysql';
import { templateDefinition, stepSchema, assignmentInput, reviewInput, reopenInput, parseAnswer, responseComplete } from '../../apps/web/src/lib/labs/schema';

test('MySQL pilot validates with all five supported step types', () => {
  const lab = templateDefinition.parse(MYSQL_LAB);
  assert.deepEqual(new Set(lab.steps.map(step => step.type)), new Set(['INSTRUCTIONS', 'COMMAND', 'CHECKLIST', 'TEXT_RESPONSE', 'EVIDENCE_UPLOAD']));
  assert.equal(lab.steps.filter(step => step.required).length, 5);
});

test('publication definition rejects unsupported modes, unknown fields, duplicate keys and empty content', () => {
  for (const invalid of [
    { ...MYSQL_LAB, mode: 'EXECUTE' },
    { ...MYSQL_LAB, objective: '' },
    { ...MYSQL_LAB, steps: [] },
    { ...MYSQL_LAB, steps: [MYSQL_LAB.steps[0], MYSQL_LAB.steps[0]] },
    { ...MYSQL_LAB, steps: [{ ...MYSQL_LAB.steps[0], type: 'SHELL_EXECUTION' }] },
  ]) assert.equal(templateDefinition.safeParse(invalid).success, false);
});

test('checklists reject duplicate item IDs, unknown answer IDs and duplicate answers', () => {
  const step = MYSQL_LAB.steps.find(step => step.type === 'CHECKLIST')!;
  assert.equal(step.type, 'CHECKLIST');
  if (step.type !== 'CHECKLIST') throw Error('Invalid fixture');
  assert.equal(stepSchema.safeParse({ ...step, config: { items: [step.config.items[0], step.config.items[0]] } }).success, false);
  assert.throws(() => parseAnswer(step, { checkedIds: ['not-a-configured-item'] }));
  assert.throws(() => parseAnswer(step, { checkedIds: ['database', 'database'] }));
  assert.equal(responseComplete(step, { checkedIds: ['database'] }), false);
  assert.equal(responseComplete(step, { checkedIds: step.config.items.map(item => item.id) }), true);
});

test('instruction acknowledgement cannot be forged with truthy values or completion flags', () => {
  const step = MYSQL_LAB.steps[0];
  assert.equal(responseComplete(step, { acknowledged: false }), false);
  assert.equal(responseComplete(step, { acknowledged: 'true' }), false);
  assert.equal(responseComplete(step, { acknowledged: true, complete: true }), false);
  assert.equal(responseComplete(step, { acknowledged: true }), true);
});

test('text answers require nonblank content within the configured length', () => {
  const step = MYSQL_LAB.steps.find(step => step.type === 'TEXT_RESPONSE')!;
  assert.equal(responseComplete(step, { text: '  ' }), false);
  assert.equal(responseComplete(step, { text: 'x'.repeat(1501) }), false);
  assert.equal(responseComplete(step, { text: 'CREATE makes a database; USE selects it.' }), true);
});

test('evidence completion enforces both lower and upper configured file counts', () => {
  const step = MYSQL_LAB.steps.find(step => step.type === 'EVIDENCE_UPLOAD')!;
  assert.equal(responseComplete(step, {}, 0), false);
  assert.equal(responseComplete(step, {}, 1), true);
  assert.equal(responseComplete(step, {}, 2), false);
  assert.equal(responseComplete(step, { url: 'https://example.invalid/public.png' }, 1), false);
});

test('assignment input preserves instructor category while rejecting Material and ownership overrides', () => {
  for (const category of ['ACTIVITY', 'QUIZ', 'MIDTERM_EXAM', 'FINAL_EXAM', 'Laboratory Work']) {
    assert.equal(assignmentInput.parse({ versionId: 'version', category, maxPoints: 100 }).category, category);
  }
  for (const invalid of [
    { versionId: 'v', category: 'MATERIAL' },
    { versionId: 'v', maxPoints: 0 },
    { versionId: 'v', instructorId: 'another-teacher' },
    { versionId: 'v', studentId: 'another-student' },
    { versionId: 'v', mode: 'EXECUTE' },
  ]) assert.equal(assignmentInput.safeParse(invalid).success, false);
});

test('review requires stable request key, feedback and a finite nonnegative grade', () => {
  const base = { idempotencyKey: 'review-key-1', decision: 'GRADED', comment: 'Reviewed the evidence.', score: 85 };
  assert.equal(reviewInput.safeParse(base).success, true);
  for (const invalid of [
    { ...base, idempotencyKey: '' }, { ...base, comment: '' },
    { ...base, score: -1 }, { ...base, score: Infinity },
    { ...base, score: undefined }, { ...base, reviewerId: 'other' },
  ]) assert.equal(reviewInput.safeParse(invalid).success, false);
  assert.equal(reviewInput.safeParse({ idempotencyKey: 'revision-key', decision: 'NEEDS_REVISION', comment: 'Show the selected database.' }).success, true);
});

test('reopening requires an explicit correction deadline and comment', () => {
  const base = { idempotencyKey: 'reopen-key', comment: 'A further correction window is available.', revisionDueAt: new Date(Date.now() + 86400000).toISOString() };
  assert.equal(reopenInput.safeParse(base).success, true);
  assert.equal(reopenInput.safeParse({ ...base, revisionDueAt: undefined }).success, false);
  assert.equal(reopenInput.safeParse({ ...base, revisionDueAt: 'tomorrow' }).success, false);
});
