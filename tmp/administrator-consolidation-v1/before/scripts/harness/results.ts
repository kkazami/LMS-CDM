import { ensure, object, records, words } from './contracts';
import { CommandSpec } from './types';

/** A zero exit code alone cannot establish that mapped tests actually executed. */
export function checkResults(raw: unknown, spec: CommandSpec, environment: string, expectedTarget?: string): void {
  const d = object(raw, 'test report');
  const tests = records(d.tests, 'executed tests');
  ensure(d.environment === environment, 'Test report environment mismatch');
  if (spec.domain === 'post-deploy') ensure(expectedTarget && d.target === expectedTarget, 'Post-deployment report must verify the approved actual target');
  tests.forEach(t => {
    ensure(t.status === 'passed', `Test ${t.id} failed, skipped or was flaky`);
    ensure(t.executed === true, `Test ${t.id} did not execute`);
  });
  spec.tests.forEach(id => ensure(tests.some(t => t.id === id), `Mapped test did not execute: ${id}`));
  if (spec.domain === 'database') {
    const db = object(d.database, 'database rehearsal report');
    ensure(typeof db.targetFingerprint === 'string' && db.targetFingerprint.length >= 16, 'Missing disposable database identity');
    ensure(typeof db.beforeSchemaHash === 'string' && typeof db.afterSchemaHash === 'string', 'Missing before/after database schema identity');
    words(db.coverage, 'database executed coverage');
    spec.coverage.forEach(c => ensure((db.coverage as string[]).includes(c), `Database action was not reported: ${c}`));
    ensure(db.disposable === true, 'Rehearsal database must be disposable');
  }
}
