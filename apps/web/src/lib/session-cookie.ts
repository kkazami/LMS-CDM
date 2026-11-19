import { SESSION_ABSOLUTE_MS } from './session-policy';

export const LEGACY_SESSION_COOKIE = 'lumina_session';
export const HOST_SESSION_COOKIE = '__Host-lumina_session';
export const SESSION_COOKIE_NAMES = [HOST_SESSION_COOKIE, LEGACY_SESSION_COOKIE] as const;

export function sessionCookiePolicy({ production, cutover, now = Date.now() }: {
  production: boolean;
  cutover?: string;
  now?: number;
}) {
  const start = cutover === undefined ? undefined : Date.parse(cutover);
  if (start !== undefined && !Number.isFinite(start)) throw new Error('SESSION_HOST_COOKIE_CUTOVER must be an ISO timestamp.');
  const modern = production && start !== undefined && now >= start;
  const acceptLegacy = !modern || now - start < SESSION_ABSOLUTE_MS;
  return {
    write: modern ? HOST_SESSION_COOKIE : LEGACY_SESSION_COOKIE,
    read: production ? (acceptLegacy ? SESSION_COOKIE_NAMES : [HOST_SESSION_COOKIE]) : [LEGACY_SESSION_COOKIE],
  };
}

export function currentSessionCookiePolicy() {
  return sessionCookiePolicy({ production: process.env.NODE_ENV === 'production', cutover: process.env.SESSION_HOST_COOKIE_CUTOVER });
}

export function sessionCookieAttributes(name: string) {
  return { httpOnly: true, secure: name === HOST_SESSION_COOKIE || process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
}

export function hasSessionCookie(cookie: string | null) {
  return cookie?.split(';').some(part => SESSION_COOKIE_NAMES.some(name => part.trimStart().startsWith(name + '='))) ?? false;
}
