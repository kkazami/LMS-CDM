import type { AttendanceLocation, AttendanceMode, AttendanceStatus, AttendanceVerification } from '@lms/types';

export const DAY = 86_400_000;
export function sessionDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function classify(receivedAt: Date, presentUntil: Date): AttendanceStatus {
  return receivedAt < presentUntil ? 'PRESENT' : 'TARDY';
}
export function asyncEligibility(opensAt: Date, closesAt: Date, cutoff: Date, approvedAt: Date) {
  const required = closesAt.getTime() - approvedAt.getTime() >= Math.min(DAY, closesAt.getTime() - opensAt.getTime());
  return { required, presentUntil: new Date(Math.min(closesAt.getTime(), approvedAt.getTime() + cutoff.getTime() - opensAt.getTime())) };
}
export function verification(location: AttendanceLocation | undefined, center: { latitude: number | null; longitude: number | null; radius: number }, now: Date): { outcome: AttendanceVerification; distance: number | null; accuracy: number | null } {
  if (!location) return { outcome: 'DECLINED', distance: null, accuracy: null };
  const { latitude, longitude, accuracy, timestamp, mocked } = location;
  if (mocked) return { outcome: 'MOCK_REPORTED', distance: null, accuracy };
  if (center.latitude === null || center.longitude === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || now.getTime() - timestamp > 30_000 || timestamp > now.getTime() + 5_000) return { outcome: 'UNCLEAR', distance: null, accuracy };
  const radians = Math.PI / 180;
  const a = Math.sin((latitude - center.latitude) * radians / 2) ** 2 + Math.cos(latitude * radians) * Math.cos(center.latitude * radians) * Math.sin((longitude - center.longitude) * radians / 2) ** 2;
  const distance = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return { outcome: distance + accuracy <= center.radius ? 'NEARBY' : distance - accuracy > center.radius ? 'OUTSIDE' : 'UNCLEAR', distance: Math.round(distance), accuracy };
}
export function bulkEligible(requiresLocation: boolean, result: AttendanceVerification): boolean {
  return !requiresLocation || result === 'NEARBY';
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function liveBucket(mode: AttendanceMode): 'liveLimit' | 'asyncLimit' { return mode === 'ASYNCHRONOUS' ? 'asyncLimit' : 'liveLimit'; }
export function expiresAfter(now: Date, days: number | null): Date | null { return days === null ? null : new Date(now.getTime() + days * DAY); }
