export type AnalyticsFilterValues = { courseId: string; search: string; from: string; to: string };
export const ANALYTICS_ROUTE = '/ics/activities/ohmward/instructor';
export function analyticsFilterHref(filters: AnalyticsFilterValues, defaults: { from: string; to: string }) {
  const query = new URLSearchParams();
  if (filters.courseId) query.set('courseId', filters.courseId);
  if (filters.search) query.set('search', filters.search);
  if (filters.from !== defaults.from) query.set('from', filters.from);
  if (filters.to !== defaults.to) query.set('to', filters.to);
  return query.size ? `${ANALYTICS_ROUTE}?${query}` : ANALYTICS_ROUTE;
}
export function analyticsFilterAction(draft: AnalyticsFilterValues, applied: AnalyticsFilterValues, defaults: { from: string; to: string }) {
  const changed = draft.courseId !== applied.courseId || draft.from !== applied.from || draft.to !== applied.to;
  const active = Boolean(draft.search || applied.search || applied.courseId || applied.from !== defaults.from || applied.to !== defaults.to);
  return changed ? 'apply' : active ? 'clear' : 'none';
}
