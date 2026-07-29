import { db } from './db';
import { cookies } from 'next/headers';

/**
 * Resolves a session from either the lumina_session cookie (web/desktop)
 * or the Authorization: Bearer header (mobile).
 * Returns the full session with user data, or null.
 */
export async function getSessionFromRequest(request?: Request) {
  // 1. Try cookie first (web/desktop path)
  try {
    const cookieStore = await cookies();
    const cookieSessionId = cookieStore.get('lumina_session')?.value;
    if (cookieSessionId) {
      const session = await validateSessionId(cookieSessionId);
      if (session) return session;
    }
  } catch {
    // cookies() throws in non-cookie contexts, fall through to bearer
  }

  // 2. Try Bearer token (mobile path)
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await validateSessionId(token);
      if (session) return session;
    }
  }

  return null;
}

async function validateSessionId(sessionId: string) {
  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: { institute: true },
        },
      },
    });

    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    const user = session.user as Record<string, unknown>;
    if (user.isActive === false) return null;

    return session;
  } catch {
    return null;
  }
}
