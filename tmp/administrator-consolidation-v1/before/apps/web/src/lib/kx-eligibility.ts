/**
 * apps/web/src/lib/kx-eligibility.ts
 *
 * Single source of truth for determining whether a user can access
 * the Knowledge Exchange (KX) Q&A module.
 *
 * RULE: Strictly gated to users belonging to the Institute of Computer Studies (ICS).
 * Non-ICS institutes (e.g. IBE, ITE) are barred from access.
 */

import { db } from "./db";
import { getSession } from "./auth-session";
import { getSessionFromRequest } from "./api-auth";
import { normalizeRole } from "./admin-types";

/** The institute code that gates access to Knowledge Exchange. */
export const ELIGIBLE_KX_INSTITUTE_CODE = "ics";

/**
 * Minimal session shape needed for eligibility checks.
 */
export interface KxEligibilitySession {
  user: {
    id?: string;
    role?: string;
    instituteId?: string;
  };
}

/**
 * Synchronous check for whether an institute code is eligible for KX.
 *
 * @param instituteCode Institute code string (e.g., "ics", "ibe", "ite")
 * @returns true if code is "ics", false otherwise
 */
export function isEligibleKxInstituteCode(instituteCode?: string | null): boolean {
  if (!instituteCode || typeof instituteCode !== "string") return false;
  return instituteCode.toLowerCase() === ELIGIBLE_KX_INSTITUTE_CODE;
}

/**
 * Checks if a user session or institute code is eligible for Knowledge Exchange.
 * Overloaded to accept an institute code string or a session object.
 *
 * @param target Institute code string or user session
 * @returns boolean or Promise<boolean>
 */
export function isEligibleForKnowledgeExchange(instituteCode: string): boolean;
export function isEligibleForKnowledgeExchange(session: KxEligibilitySession): Promise<boolean>;
export function isEligibleForKnowledgeExchange(
  target: string | KxEligibilitySession | null | undefined
): boolean | Promise<boolean> {
  if (!target) return false;

  if (typeof target === "string") {
    return isEligibleKxInstituteCode(target);
  }

  return (async () => {
    if (!target.user?.instituteId) return false;

    try {
      const institute = await db.institute.findUnique({
        where: { id: target.user.instituteId },
        select: { code: true },
      });

      if (!institute?.code) return false;
      return isEligibleKxInstituteCode(institute.code);
    } catch {
      return false;
    }
  })();
}

/**
 * Full eligibility check for API route handlers and server actions.
 * Resolves session, checks institute, and returns structured result.
 *
 * @param request Optional request for mobile Bearer token resolution
 * @returns Eligibility result and session, or null if unauthenticated
 */
export async function checkKxEligibility(request?: Request) {
  let session = request ? await getSessionFromRequest(request) : await getSession();
  if (!session && !request) {
    // Fallback try request if not passed
    session = await getSession();
  }

  if (!session) {
    return null;
  }

  const role = normalizeRole(session.user.role as string);

  if (request) {
    const headerCode = request.headers.get("x-institute-code");
    if (headerCode && !isEligibleKxInstituteCode(headerCode)) {
      return {
        eligible: false,
        session,
        role,
        instituteCode: headerCode.toLowerCase(),
      };
    }

    try {
      const url = new URL(request.url);
      const queryInstitute = url.searchParams.get("institute");
      if (queryInstitute && !isEligibleKxInstituteCode(queryInstitute)) {
        return {
          eligible: false,
          session,
          role,
          instituteCode: queryInstitute.toLowerCase(),
        };
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  let instituteCode = "";
  if (session.user.instituteId) {
    const institute = await db.institute.findUnique({
      where: { id: session.user.instituteId },
      select: { code: true },
    });
    if (institute?.code) {
      instituteCode = institute.code.toLowerCase();
    }
  }

  const eligible = isEligibleKxInstituteCode(instituteCode);

  return {
    eligible,
    session,
    role,
    instituteCode,
  };
}
