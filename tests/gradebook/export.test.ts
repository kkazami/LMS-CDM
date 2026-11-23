import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { defaultPeriodPolicy } from '../../apps/web/src/lib/grading/periods';
import { recordedScoreInPoints } from '../../apps/web/src/lib/grading/score-units';

const require = createRequire(import.meta.url);
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('legacy quiz percentages convert to points while valid point scores and manual grades keep their units', () => {
  assert.equal(recordedScoreInPoints(50, 'SUBMITTED', true, 2), 1);
  assert.equal(recordedScoreInPoints(1, 'SUBMITTED', true, 2), 1);
  assert.equal(recordedScoreInPoints(0, 'SUBMITTED', true, 2), 0);
  assert.equal(recordedScoreInPoints(null, 'SUBMITTED', true, 2), null);
  assert.equal(recordedScoreInPoints(50, 'RETURNED', true, 2), 50);
  assert.equal(recordedScoreInPoints(50, 'SUBMITTED', false, 2), 50);
});

test('subject CSV exports period and combined grade equivalents, preserving pending and zero scores', async () => {
  const students = [
    { id: 'complete', name: 'Complete Student', email: 'complete@example.invalid' },
    { id: 'pending', name: 'Pending Student', email: 'pending@example.invalid' },
    { id: 'zero', name: 'Zero Student', email: 'zero@example.invalid' },
  ];
  const items = [
    { id: 'm', title: 'Midterm', type: 'MIDTERM_EXAM', maxPoints: 2, form: { id: 'midterm-form' } },
    { id: 'f', title: 'Finals', type: 'FINAL_EXAM', maxPoints: 100 },
  ];
  const scores = [
    { studentId: 'complete', syllabusItemId: 'm', grade: 80, status: 'SUBMITTED' },
    { studentId: 'complete', syllabusItemId: 'f', grade: 90 },
    { studentId: 'pending', syllabusItemId: 'm', grade: 96, status: 'SUBMITTED' },
    { studentId: 'zero', syllabusItemId: 'm', grade: 0, status: 'SUBMITTED' },
    { studentId: 'zero', syllabusItemId: 'f', grade: 0 },
  ];
  const scopes: unknown[] = [];
  const fixture = {
    policy: defaultPeriodPolicy,
    requireCourseRelationship: async (_actor: unknown, courseId: string, instructor: boolean) => { scopes.push([courseId, instructor]); },
    db: {
      course: { findUnique: async () => ({ title: 'Test Subject', code: 'TEST101' }) },
      enrollment: { findMany: async () => students.map(student => ({ student })) },
      syllabusItem: { findMany: async () => items },
      studentSubmission: { findMany: async () => scores },
      gradingPolicy: { findUnique: async () => null },
    },
  };
  const stubs: Record<string, string> = {
    '@/lib/db': 'export const db = fixture.db;',
    '@/lib/super-user-v1/legacy-entry-guard': "export const requireLegacyActor = async () => ({role:'PROFESSOR'});",
    '@/lib/super-user-v1/actor': 'export const requireCourseRelationship = fixture.requireCourseRelationship;',
    '@/lib/super-user-v1/capabilities': 'export const canonicalRole = role => role;',
    '@/lib/administrator-scope': 'export const administratorCourse = async () => {throw new Error("Unexpected administrator");};',
    '@/lib/labs/readiness': 'export const labsAvailable = async () => false;',
    '@/lib/grading/period-service': 'export const readPeriodConfiguration = async () => ({policy:fixture.policy,assignments:{}});',
  };
  const bundle = await build({ entryPoints: ['apps/web/src/lib/skills/gradebook-exporter.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'apps/web/tsconfig.json', plugins: [{ name: 'export-fixtures', setup(builder: any) {
    builder.onResolve({ filter: /^@\/lib\// }, ({ path: name }: { path: string }) => stubs[name] ? { path: name, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }: { path: string }) => ({ contents: stubs[name] }));
  } }] });
  const module = { exports: {} as any };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require: webRequire, fixture });
  const result = await module.exports.exportGradebookSkill('subject-id');
  assert.deepEqual(scopes, [['subject-id', true]]);
  assert.equal(result.studentCount, 3);
  assert.ok(result.csvContent.startsWith('\uFEFF'));
  assert.ok(result.csvContent.split('\n')[0].endsWith('"Midterm Grade","Finals Grade","Final Grade"'));
  assert.ok(!result.csvContent.includes('%'));
  assert.deepEqual(result.csvContent.split('\n').slice(1).map((line: string) => line.split(',')[2]), ['1.6', '1.92', '0']);
  const rows = result.csvContent.split('\n').slice(1).map((line: string) => {
    const cells = line.split(',');
    assert.equal(cells.length, 9);
    return cells.slice(-3);
  });
  assert.deepEqual(rows, [
    ['2.75', '1.75', '2.25'],
    ['1.00', 'Pending', 'Pending'],
    ['5.00', '5.00', '5.00'],
  ]);
});
