import { notFound, redirect } from "next/navigation";
import { normalizeRole } from "@/lib/admin-types";

export type LectureVideosActorRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface LectureVideosActor {
  userId: string;
  role: LectureVideosActorRole;
  instituteId: string;
  instituteCode: string;
  name: string;
}

export interface LectureVideosAccessCheckParams {
  userId: string;
  userRole: string;
  userInstituteCode: string;
  routeInstituteCode?: string;
}

export interface LectureVideosAccessDecision {
  allowed: boolean;
  role: LectureVideosActorRole | null;
  reason?:
    | "UNAUTHENTICATED"
    | "NOT_ITE_ROUTE"
    | "NOT_ITE_USER"
    | "INVALID_ROLE";
}

function isIteCode(code?: string | null): boolean {
  return Boolean(code && code.trim().toLowerCase() === "ite");
}

/**
 * Evaluates whether a user is allowed to access the ITE-wide "Lecture Videos" feature.
 * - Rejects unauthenticated users.
 * - Rejects non-ITE routes (`ics`, `ibe`, etc.) and non-ITE users (`ics`, `ibe`, etc.).
 * - Allows ANY ITE student (of any ITE program) and ITE faculty/instructors and ITE admins.
 */
export function evaluateLectureVideosAccess(
  params: LectureVideosAccessCheckParams
): LectureVideosAccessDecision {
  const {
    userId,
    userRole,
    userInstituteCode,
    routeInstituteCode = "ite",
  } = params;

  if (!userId || !userId.trim()) {
    return {
      allowed: false,
      role: null,
      reason: "UNAUTHENTICATED",
    };
  }

  if (!isIteCode(routeInstituteCode)) {
    return {
      allowed: false,
      role: null,
      reason: "NOT_ITE_ROUTE",
    };
  }

  if (!isIteCode(userInstituteCode)) {
    return {
      allowed: false,
      role: null,
      reason: "NOT_ITE_USER",
    };
  }

  const rawRoleUpper = (userRole ?? "").trim().toUpperCase();
  const validRoles = ["STUDENT", "INSTRUCTOR", "ADMIN", "PROFESSOR", "TEACHER"];
  if (!validRoles.includes(rawRoleUpper)) {
    return {
      allowed: false,
      role: null,
      reason: "INVALID_ROLE",
    };
  }

  const normalizedRole = normalizeRole(userRole) as LectureVideosActorRole;
  return {
    allowed: true,
    role: normalizedRole,
  };
}

/**
 * Server-component page guard for `/[institute]/lecture-videos`.
 * Allows any ITE student and ITE faculty/admins. Rejects ICS/IBE and unauthenticated callers.
 */
export async function requireLectureVideosPageActor(
  institute: string
): Promise<LectureVideosActor> {
  const { checkIteEligibility, isIteInstituteCode } = await import(
    "@/lib/ite/ite-eligibility"
  );
  const result = await checkIteEligibility();
  if (!result) {
    redirect(`/login?institute=${institute}`);
  }
  if (!isIteInstituteCode(institute)) {
    notFound();
  }

  const decision = evaluateLectureVideosAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: institute,
  });

  if (!decision.allowed || !decision.role) {
    if (decision.reason === "NOT_ITE_USER") {
      redirect(`/${result.instituteCode || "ics"}`);
    }
    notFound();
  }

  return {
    userId: result.userId,
    role: decision.role,
    instituteId: result.session.user.instituteId as string,
    instituteCode: result.instituteCode,
    name: result.session.user.name,
  };
}

/**
 * API route guard for `/api/lecture-videos/*`.
 * Uses `requireIteUser(request)` and verifies the caller is an ITE student, instructor, or admin.
 * Throws `{ status, message }` on failure.
 */
export async function requireLectureVideosApiActor(
  request: Request,
  allowedRoles?: LectureVideosActorRole[]
): Promise<LectureVideosActor> {
  const { requireIteUser } = await import("@/lib/ite/ite-eligibility");
  const result = await requireIteUser(request);

  const decision = evaluateLectureVideosAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: "ite",
  });

  if (!decision.allowed || !decision.role) {
    throw {
      status: 403,
      message: "This feature is only available to ITE users.",
    };
  }

  if (allowedRoles && !allowedRoles.includes(decision.role)) {
    throw {
      status: 403,
      message: "You do not have permission to perform this action.",
    };
  }

  return {
    userId: result.userId,
    role: decision.role,
    instituteId: (result.session.user as Record<string, unknown>)
      .instituteId as string,
    instituteCode: result.instituteCode,
    name: result.session.user.name,
  };
}

