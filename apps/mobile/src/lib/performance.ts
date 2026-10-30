// Bounded local diagnostics: route templates and timings, never student content.
type Measurement = { path: string; durationMs: number; bytes: number; status: number };
const requests: Measurement[] = [];
const marks: Record<string, number> = {};
const launchedAt = Date.now();
const enteredAt: Partial<Record<'home' | 'course', number>> = {};
export function beginUsefulContent(screen: 'home' | 'course') {
  enteredAt[screen] = Date.now();
  delete marks[screen];
}
let report: ((screen: string, milliseconds: number) => void) | null = null;
export function observeUsefulContent(callback: (screen: string, milliseconds: number) => void) {
  report = callback;
  return () => { report = null; };
}
export function recordRequest(value: Measurement) {
  requests.push({ ...value, path: value.path.replace(/\/[a-z0-9_-]{16,}(?=\/|$)/gi, '/:id') });
  if (requests.length > 100) requests.shift();
}
export function markUsefulContent(screen: 'home' | 'course') {
  if (marks[screen] !== undefined) return;
  marks[screen] = Date.now() - (enteredAt[screen] ?? launchedAt);
  report?.(screen, marks[screen]);
}
export function performanceSnapshot() { return { marks: { ...marks }, requests: [...requests] }; }
