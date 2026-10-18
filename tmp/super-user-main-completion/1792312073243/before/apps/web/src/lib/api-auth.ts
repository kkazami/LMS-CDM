import { db } from './db';
import { hashToken, getSession } from './auth-session';

/**
 * Resolves a session from either the lumina_session cookie (web/desktop)
 * or the Authorization: Bearer header (mobile).
 * Returns the full session with user data, or null.
 */
export async function getSessionFromRequest(request?: Request) {
  // 1. Try canonical getSession first (web/desktop path, request-cached)
  try {
    const session = await getSession();
    if (session) return session;
  } catch {
    // fall through to request-header checks
  }

  // 2. Try Bearer token (mobile path)
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const session = await validateToken(token);
      if (session) return session;
    }
  }

  return null;
}

async function validateToken(rawToken: string) {
  if (!rawToken) return null;

  try {
    const tokenHash = hashToken(rawToken);

    const session = await db.session.findFirst({
      where: {
        OR: [{ tokenHash }, { id: rawToken }],
      },
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
    if (user.isActive === false) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
