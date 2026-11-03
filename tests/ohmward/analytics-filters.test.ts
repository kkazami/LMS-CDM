import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsFilterAction, analyticsFilterHref, ANALYTICS_ROUTE } from '../../apps/web/src/features/interactive-activities/ohmward/domain/analytics-filters';
const dates = { from: '2026-10-03', to: '2026-11-01' };
const empty = { courseId: '', search: '', ...dates };
test('analytics search preserves applied scope and dates, encodes input and resets pagination', () => {
  const href = analyticsFilterHref({ ...empty, courseId: 'class/a', search: 'Kaz & 23-001', from: '2026-10-01' }, dates);
  const query = new URL(href, 'http://localhost').searchParams;
  assert.equal(query.get('courseId'), 'class/a');
  assert.equal(query.get('search'), 'Kaz & 23-001');
  assert.equal(query.get('from'), '2026-10-01');
  assert.equal(query.has('page'), false);
  assert.equal(query.has('to'), false);
  assert.equal(analyticsFilterHref(empty, dates), ANALYTICS_ROUTE);
});
test('one filter action applies edited class/dates, clears active filters, and disables at defaults', () => {
  assert.equal(analyticsFilterAction(empty, empty, dates), 'none');
  const searched = { ...empty, search: 'kaz' };
  assert.equal(analyticsFilterAction(searched, empty, dates), 'clear');
  const filtered = { ...searched, courseId: 'class-a' };
  assert.equal(analyticsFilterAction(filtered, searched, dates), 'apply');
  assert.equal(analyticsFilterAction(filtered, filtered, dates), 'clear');
  assert.equal(analyticsFilterAction({ ...filtered, to: '2026-10-30' }, filtered, dates), 'apply');
  assert.equal(analyticsFilterAction(empty, searched, dates), 'clear');
});
