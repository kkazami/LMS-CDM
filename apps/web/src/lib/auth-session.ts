import { getInstituteName } from "@lms/types";
import { db } from "./db";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { lockAccounts } from './super-user-v1/account-lock';
import { canonicalRole, mayAdmitAccount, privilegedRole } from './super-user-v1/capabilities';
import { applicationWriterQualified } from './super-user-v1/provisioning';
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS, sessionExpired, sessionActivity } from './session-policy';
import { needsClassEnrollment } from './student-access';

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

export class SessionAdmissionError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/**
 * Creates a real database-backed session for the user using a 256-bit CSPRNG opaque token.
 * Returns the raw token for client credentials while storing only the SHA-256 hash in PostgreSQL.
 */
export async function createSession(
  userId: string,
  metadata?: { userAgent?: string; ipAddress?: string },
  expectedPasswordHash?: string,
  expectedIdentity?: { role: string; instituteId: string; credentialProvisioningState: string | null; googleSubject?: string | null }
): Promise<CreateSessionResult> {
  // 7-day session validity
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS);

  // Generate 256 bits of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  const session = await db.$transaction(async tx => {
    await lockAccounts(tx, [userId]);
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || (expectedPasswordHash !== undefined && user.password !== expectedPasswordHash)) throw new SessionAdmissionError(401, 'Invalid email, password, or institute.');
    if (expectedIdentity && (user.role !== expectedIdentity.role || user.instituteId !== expectedIdentity.instituteId || user.credentialProvisioningState !== expectedIdentity.credentialProvisioningState)) throw new SessionAdmissionError(401, 'Invalid email, password, or institute.');
    if (expectedIdentity && 'googleSubject' in expectedIdentity && user.googleSubject !== expectedIdentity.googleSubject) throw new SessionAdmissionError(401, 'Google account connection changed. Sign in again.');
    if (!mayAdmitAccount(user)) throw new SessionAdmissionError(403, 'Your account has been deactivated. Please contact administration.');
    if (privilegedRole(user.role) && !await applicationWriterQualified(tx)) throw new SessionAdmissionError(503, 'Authentication unavailable.');
    return tx.session.create({ data: {
      tokenHash,
      userId,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    } });
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
type CredentialSelection = { token: string; userId: string; sessionId: string; tokenHash: string; role: string; instituteId: string } | null;
// Keys are actual request-context header objects (or the actual Request object),
// not client markers/PIDs/strings. Weak keys expire with the request. This pins
// credential selection only; live account/session authorization is never cached.
const requestCredentials = new WeakMap<object, Promise<CredentialSelection>>();
export async function getSession(request?: Request, options: { allowUnenrolled?: boolean } = {}) {
  let headerStore: Headers | null = null;
  try { headerStore = await headers(); } catch { /* Explicit Request fallback. */ }
  const key = headerStore ?? request;
  if (!key) return null;
  let selection = requestCredentials.get(key);
  let firstSession: Awaited<ReturnType<typeof validateSessionToken>> = null;
  if (!selection) {
    selection = (async () => {
      let cookieToken: string | undefined;
      try { cookieToken = (await cookies()).get('lumina_session')?.value; } catch { /* No Cookie context. */ }
      const select = async (token: string | null | undefined): Promise<CredentialSelection> => {
        if (!token) return null;
        const touch = request ? sessionActivity(new URL(request.url).pathname, request.method, request.headers.get('x-lms-user-active') === '1') : headerStore?.get('x-lms-session-touch') !== '0';
        const session = await validateSessionToken(token, touch);
        firstSession = session;
        return session ? { token, userId: session.userId, sessionId: session.id, tokenHash: session.tokenHash, role: session.user.role, instituteId: session.user.instituteId } : null;
      };
      const cookie = await select(cookieToken);
      return cookie ?? select(bearerToken(request?.headers.get('authorization') ?? headerStore?.get('authorization') ?? null));
    })();
    requestCredentials.set(key, selection);
  }
  const selected = await selection;
  if (!selected) return null;
  // Only the selecting caller uses its fresh read; later callers still revalidate.
  const current = firstSession ?? await validateSessionToken(selected.token, false);
  if (!current || current.id !== selected.sessionId || current.userId !== selected.userId || current.tokenHash !== selected.tokenHash
    || current.user.role !== selected.role || current.user.instituteId !== selected.instituteId) return null;
  if (!options.allowUnenrolled && await needsClassEnrollment(current.user)) return null;
  return current;
}

export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer ([A-Za-z0-9_-]{16,512})$/i);
  return match?.[1] ?? null;
}

export async function validateSessionToken(rawToken: string, touch = true) {
  if (!/^[A-Za-z0-9_-]{16,512}$/.test(rawToken)) return null;
  try {
    const tokenHash = hashToken(rawToken);

    // Internal session IDs are never bearer credentials.
    const session = await db.session.findFirst({
      where: {
        tokenHash,
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
    if (session.user.institute) session.user.institute.name = getInstituteName(session.user.institute.code, session.user.institute.name);

    if (sessionExpired(session)) {
      // Session expired, purge from database
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check if user account is active
    // Retain authenticated unknown-role identity solely so entry-point ceilings
    // can return 403. Unknown roles cannot create sessions or pass any role guard.
    if (session.user.isActive && session.user.activationStatus === 'ACTIVE' && canonicalRole(session.user.role) === 'UNKNOWN' && session.tokenHash === tokenHash) return session;
    if (!mayAdmitAccount(session.user) || (privilegedRole(session.user.role) && session.tokenHash !== tokenHash)) {
      // Purge session for deactivated user
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    if (privilegedRole(session.user.role) && !await applicationWriterQualified(db)) return null;

    if (touch && Date.now() - session.lastSeenAt.getTime() >= SESSION_TOUCH_MS) {
      const now = new Date();
      const updated = await db.session.updateMany({ where: { id: session.id, tokenHash, expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - SESSION_ABSOLUTE_MS) }, lastSeenAt: { gt: new Date(now.getTime() - SESSION_IDLE_MS) } }, data: { lastSeenAt: now } });
      if (!updated.count) return null;
      session.lastSeenAt = now;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Deletes the session from the database and clears the lumina_session cookie.
 * Uses the request's chosen identity for Cookie and Bearer clients alike.
 */
export async function deleteSession() {
  const session = await getSession(undefined, { allowUnenrolled: true });
  if (session) await db.$transaction(async tx => {
    await lockAccounts(tx, [session.userId]);
    await tx.session.deleteMany({ where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash } });
  });
  try {
    const cookieStore = await cookies();
    cookieStore.delete("lumina_session");
  } catch {
    // Non-cookie environment
  }

}
