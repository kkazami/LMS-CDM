import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftProblems, scheduleProblem } from '../../apps/web/src/components/labs/authoring';
import { MYSQL_LAB } from '../../apps/web/src/lib/labs/mysql';

test('authoring accepts the complete MySQL preset', () => {
  assert.deepEqual(draftProblems(MYSQL_LAB), []);
});

test('authoring directs a missing objective and step instructions to editable controls', () => {
  const draft = structuredClone(MYSQL_LAB);
  draft.objective = '   ';
  draft.steps[0] = { ...draft.steps[0], type: 'INSTRUCTIONS', config: { body: '' } };
  assert.deepEqual(draftProblems(draft), [
    { target: 'lab-objective', message: 'Check the learning objective.' },
    { target: 'lab-step-0', message: 'Step 1: add or correct the instructions.' },
  ]);
});

test('authoring maps each incomplete step type to its numbered step', () => {
  for (const [index, config, label] of [
    [1, { body: '', command: '' }, 'commands'],
    [2, { items: [{ id: 'one', label: '', required: true }] }, 'checklist text'],
    [3, { prompt: '', maxLength: 1500 }, 'question'],
    [4, { instructions: '', minFiles: 1, maxFiles: 1 }, 'evidence instructions'],
  ] as const) {
    const draft = structuredClone(MYSQL_LAB);
    const steps: unknown[] = draft.steps;
    steps[index] = { ...draft.steps[index], config };
    assert.deepEqual(draftProblems({ ...draft, steps }), [{ target: 'lab-step-' + index, message: 'Step ' + (index + 1) + ': add or correct the ' + label + '.' }]);
  }
});

test('authoring identifies invalid title and estimated time before step content', () => {
  assert.deepEqual(draftProblems({ ...MYSQL_LAB, title: '', estimatedMinutes: 0 }), [
    { target: 'lab-title', message: 'Check the title.' },
    { target: 'lab-estimatedMinutes', message: 'Check the estimated time.' },
  ]);
});

test('schedule accepts optional dates and a due date after the start', () => {
  for (const [start, due] of [['', ''], ['2030-01-01T10:00', ''], ['', '2030-01-01T10:00'], ['2030-01-01T10:00', '2030-01-01T10:01']]) {
    assert.equal(scheduleProblem(start, due), null);
  }
});

test('schedule blocks reversed and equal timestamps, including equivalent offsets', () => {
  for (const [start, due] of [
    ['2030-01-02T10:00', '2030-01-01T10:00'],
    ['2030-01-01T10:00', '2030-01-01T10:00'],
    ['2030-01-01T10:00+08:00', '2030-01-01T02:00Z'],
  ]) assert.equal(scheduleProblem(start, due), 'The due date must be after the start date. Change one of these dates, then try again.');
});

test('schedule directs malformed start and due values to clear errors', () => {
  assert.equal(scheduleProblem('invalid', ''), 'Choose a valid start date.');
  assert.equal(scheduleProblem('', 'invalid'), 'Choose a valid due date.');
});
