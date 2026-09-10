import { db } from "./db";
import { cookies, headers } from "next/headers";

/**
 * Creates a real database-backed session for the user and sets the HTTP-only cookie.
 */
export async function createSession(userId: string) {
  // 1 week session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("lumina_session", session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return session;
}

/**
 * Validates the session from the lumina_session cookie or Authorization: Bearer header.
 * If expired or invalid, clears the cookie (if present) and returns null.
 */
export async function getSession() {
  let sessionId: string | undefined;
  let isCookie = false;

  try {
    const cookieStore = await cookies();
    sessionId = cookieStore.get("lumina_session")?.value;
    if (sessionId) {
      isCookie = true;
    }
  } catch {
    // cookies() might throw in non-request contexts
  }

  if (!sessionId) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        sessionId = authHeader.slice(7).trim();
      }
    } catch {
      // headers() might throw in non-request contexts
    }
  }

  if (!sessionId) return null;

  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: { institute: true },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      // Session has expired, clear the cookie if applicable
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      if (isCookie) {
        try {
          const cookieStore = await cookies();
          cookieStore.delete("lumina_session");
        } catch {}
      }
      return null;
    }

    // Check if the user account has been deactivated
    const user = session.user as Record<string, unknown>;
    if (user.isActive === false) {
      // Purge session for deactivated user
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      if (isCookie) {
        try {
          const cookieStore = await cookies();
          cookieStore.delete("lumina_session");
        } catch {}
      }
      return null;
    }

    return session;
  } catch (error) {
    console.error("Session lookup error", error);
    return null;
  }
}

/**
 * Deletes the session from the database and clears the lumina_session cookie.
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("lumina_session")?.value;

  if (sessionId) {
    try {
      await db.session.delete({ where: { id: sessionId } });
    } catch (error) {
      console.error("Error deleting session from DB:", error);
    }
  }

  cookieStore.delete("lumina_session");
}
