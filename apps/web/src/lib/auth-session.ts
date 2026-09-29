import { db } from "./db";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

/**
 * Computes a SHA-256 digest of an opaque bearer token.
 * Only this hash is stored and looked up in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface CreateSessionResult {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Creates a real database-backed session for the user using a 256-bit CSPRNG opaque token.
 * Returns the raw token for client credentials while storing only the SHA-256 hash in PostgreSQL.
 */
export async function createSession(
  userId: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<CreateSessionResult> {
  // 7-day session validity
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Generate 256 bits of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  const session = await db.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("lumina_session", rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return {
    sessionId: session.id,
    token: rawToken,
    expiresAt,
  };
}

/**
 * Validates the session from the lumina_session cookie or Authorization: Bearer header.
 * Hashes the incoming opaque token and verifies matching session in the database.
 * If expired or invalid, clears the cookie (if present) and returns null.
 */
export async function getSession() {
  let rawToken: string | undefined;
  let isCookie = false;

  try {
    const cookieStore = await cookies();
    rawToken = cookieStore.get("lumina_session")?.value;
    if (rawToken) {
      isCookie = true;
    }
  } catch {
    // cookies() might throw in non-request contexts
  }

  if (!rawToken) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        rawToken = authHeader.slice(7).trim();
      }
    } catch {
      // headers() might throw in non-request contexts
    }
  }

  if (!rawToken) return null;

  try {
    const tokenHash = hashToken(rawToken);

    // Look up session by tokenHash (or fallback to id for transition backwards-compatibility)
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

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      // Session expired, purge from database
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      if (isCookie) {
        try {
          const cookieStore = await cookies();
          cookieStore.delete("lumina_session");
        } catch {}
      }
      return null;
    }

    // Check if user account is active
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
 * Accepts optional tokenOverride for Bearer tokens sent from mobile/desktop clients.
 */
export async function deleteSession(tokenOverride?: string) {
  let rawToken = tokenOverride;

  try {
    const cookieStore = await cookies();
    if (!rawToken) {
      rawToken = cookieStore.get("lumina_session")?.value;
    }
    cookieStore.delete("lumina_session");
  } catch {
    // Non-cookie environment
  }

  if (rawToken) {
    try {
      const tokenHash = hashToken(rawToken);
      // Delete matching session by tokenHash or id
      const session = await db.session.findFirst({
        where: {
          OR: [{ tokenHash }, { id: rawToken }],
        },
      });

      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
    } catch (error) {
      console.error("Error deleting session from DB:", error);
    }
  }
}
