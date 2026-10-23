/**
 * apps/web/src/lib/ite/ite-eligibility.ts
 *
 * Single source of truth for ITE-only feature access control.
 * Mirrors the kx-eligibility.ts pattern used for ICS Knowledge Exchange.
 *
 * RULE: Every new ITE feature (Participation Tracker, Academic Risk Alerts)
 * MUST check eligibility here — never inline the institute-code string.
 */

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getSessionFromRequest } from "@/lib/api-auth";
import { normalizeRole } from "@/lib/admin-types";
import { ITE_INSTITUTE_CODE } from "./engagement-config";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface IteEligibilitySession {
  user: {
    id: string;
    role: string;
    instituteId: string;
  };
}

export interface IteEligibilityResult {
  eligible: boolean;
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  role: ReturnType<typeof normalizeRole>;
  instituteCode: string;
  userId: string;
}

// ─── Synchronous helpers (no DB) ───────────────────────────────────────────

/** True when the given code is "ite" (case-insensitive). */
export function isIteInstituteCode(code?: string | null): boolean {
  if (!code) return false;
  return code.toLowerCase() === ITE_INSTITUTE_CODE;
}

// ─── Async helpers (DB lookup) ─────────────────────────────────────────────

/**
 * Resolves a user's institute code from the DB and returns whether they are ITE.
 */
export async function isIteUser(instituteId: string): Promise<boolean> {
  try {
    const inst = await db.institute.findUnique({
      where: { id: instituteId },
      select: { code: true },
    });
    return isIteInstituteCode(inst?.code);
  } catch {
    return false;
  }
}

/**
 * Full eligibility check for server-side page routes (uses cookie session).
 * Returns null if no valid session; returns result with eligible=false if not ITE.
 */
export async function checkIteEligibility(): Promise<IteEligibilityResult | null> {
  const session = await getSession();
  if (!session) return null;

  const role = normalizeRole(session.user.role as string);

  const inst = session.user.instituteId
    ? await db.institute.findUnique({
        where: { id: session.user.instituteId as string },
        select: { code: true },
      })
    : null;

  const instituteCode = inst?.code?.toLowerCase() ?? "";
  const eligible = isIteInstituteCode(instituteCode);

  return {
    eligible,
    session,
    role,
    instituteCode,
    userId: session.user.id,
  };
}

/**
 * Full eligibility check for API route handlers (cookie or Bearer).
 * Returns null if no valid session.
 */
export async function checkIteEligibilityFromRequest(
  request: Request
): Promise<IteEligibilityResult | null> {
  const session = await getSessionFromRequest(request);
  if (!session) return null;

  const role = normalizeRole(session.user.role as string);

  const inst = session.user.instituteId
    ? await db.institute.findUnique({
        where: { id: (session.user as Record<string, unknown>).instituteId as string },
        select: { code: true },
      })
    : null;

  const instituteCode = inst?.code?.toLowerCase() ?? "";
  const eligible = isIteInstituteCode(instituteCode);

  return {
    eligible,
    session,
    role,
    instituteCode,
    userId: session.user.id,
  };
}

/**
 * requireIteUser — throws a 403-compatible error when the caller is not ITE.
 * Use in API route handlers that must be ITE-only.
 *
 * Usage:
 *   const { session, role, userId } = await requireIteUser(request);
 */
export async function requireIteUser(request: Request): Promise<IteEligibilityResult> {
  const result = await checkIteEligibilityFromRequest(request);

  if (!result) {
    throw { status: 401, message: "Authentication required." };
  }

  if (!result.eligible) {
    throw { status: 403, message: "This feature is only available to ITE users." };
  }

  return result;
}
