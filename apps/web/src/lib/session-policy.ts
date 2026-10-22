export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_TOUCH_MS = 60 * 1000;

export function sessionDeadline(session: { createdAt: Date; expiresAt: Date }) {
  return new Date(Math.min(session.expiresAt.getTime(), session.createdAt.getTime() + SESSION_ABSOLUTE_MS));
}

export function sessionExpired(session: { createdAt: Date; expiresAt: Date; lastSeenAt: Date }, now = Date.now()) {
  return sessionDeadline(session).getTime() <= now || session.lastSeenAt.getTime() + SESSION_IDLE_MS <= now;
}

export function passiveSessionPath(pathname: string) {
  return ['/api/notifications', '/api/gamification/heartbeat', '/api/gamification/new-badges', '/api/auth/me', '/api/auth/refresh'].some(path => pathname === path || pathname.startsWith(path + '/'));
}

export function sessionActivity(pathname: string, method: string, foreground: boolean) {
  if (pathname === '/api/gamification/heartbeat') return method === 'POST' && foreground;
  return !passiveSessionPath(pathname);
}
