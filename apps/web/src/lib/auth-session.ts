import { db } from "./db";
import { cookies } from "next/headers";

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
 * Validates the session from the lumina_session cookie.
 * If expired or invalid, clears the cookie and returns null.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("lumina_session")?.value;

  if (!sessionId) return null;

  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      // Session has expired, clear the cookie
      await db.session.delete({ where: { id: session.id } });
      cookieStore.delete("lumina_session");
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
