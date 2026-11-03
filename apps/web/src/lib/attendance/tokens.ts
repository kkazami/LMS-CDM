import { createHmac, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { AccessError } from '@/lib/super-user-v1/actor';

function key() {
  const value = process.env.ATTENDANCE_QR_SECRET;
  if (!value || value.length < 32) throw new AccessError(503, 'Attendance QR signing is not configured.');
  return new TextEncoder().encode(value);
}
export async function signAttendanceToken(kind: 'qr' | 'challenge', session: { id: string; courseId: string; tokenVersion: number; closesAt: Date }, now: Date, seconds: number, userId?: string) {
  const expires = Math.min(Math.floor(session.closesAt.getTime() / 1000), Math.floor(now.getTime() / 1000) + seconds);
  return new SignJWT({ kind, sessionId: session.id, courseId: session.courseId, version: session.tokenVersion, userId }).setProtectedHeader({ alg: 'HS256' }).setIssuer('cdm-attendance').setIssuedAt(Math.floor(now.getTime() / 1000)).setExpirationTime(expires).sign(key());
}
export async function verifyAttendanceToken(token: string | undefined, kind: 'qr' | 'challenge', session: { id: string; courseId: string; tokenVersion: number }, now: Date, userId?: string) {
  if (!token) throw new AccessError(400, kind === 'qr' ? 'Scan the current attendance QR.' : 'Refresh location verification and try again.');
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'], issuer: 'cdm-attendance', currentDate: now });
    if (payload.kind !== kind || payload.sessionId !== session.id || payload.courseId !== session.courseId || payload.version !== session.tokenVersion || payload.userId !== userId) throw new Error('Token mismatch');
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(400, 'This code or location challenge has expired. Try again.');
  }
}
export function liveCode(sessionId: string, version: number, slot: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hash = createHmac('sha256', key()).update(`${sessionId}:${version}:${slot}`).digest();
  return Array.from(hash.subarray(0, 8), byte => alphabet[byte % alphabet.length]).join('');
}
export function verifyLiveCode(input: string | undefined, session: { id: string; tokenVersion: number }, now: Date): boolean {
  if (!input || !/^[A-Z2-9]{8}$/.test(input.toUpperCase())) return false;
  const slot = Math.floor(now.getTime() / 60000);
  const valid = [liveCode(session.id, session.tokenVersion, slot)];
  if (now.getTime() % 60000 < 10000) valid.push(liveCode(session.id, session.tokenVersion, slot - 1));
  return valid.some(code => timingSafeEqual(Buffer.from(input.toUpperCase()), Buffer.from(code)));
}
