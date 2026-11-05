import { notFound, redirect } from "next/navigation";
import { normalizeRole } from "../admin-types";
import { HttpError } from "../practicum/http";
import { isBtledIctProgram } from "./rules";

export type IctLabRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface IctLabActor {
  userId: string;
  role: IctLabRole;
  instituteId: string;
  name: string;
  programCode: string | null;
}

export interface IctLabAccessCheckParams {
  userId: string;
  userRole: string;
  userInstituteCode: string;
  routeInstituteCode?: string;
  resolveStudentProgram?: (
    userId: string
  ) => Promise<{ isBtledIct: boolean; programCode: string | null }>;
}

export interface IctLabAccessDecision {
  allowed: boolean;
  role: IctLabRole | null;
  programCode: string | null;
  reason?:
    | "NOT_ITE_ROUTE"
    | "NOT_ITE_USER"
    | "NOT_STUDENT"
    | "NOT_BTLED_ICT"
    | "INVALID_ROLE";
}

function isIteCode(code?: string | null): boolean {
  return Boolean(code && code.trim().toLowerCase() === "ite");
}

/**
 * Checks whether a student user in ITE belongs to the BTLED ICT program.
 * Inspects:
 * 1. Active `ProgramMembership` rows (`program.code` / `program.name`)
 * 2. `User.department` and `User.section`
 * 3. Approved course `Enrollment` rows (`course.program.code` / `course.program.name` / `course.section`)
 */
export async function checkStudentBtledIctProgram(userId: string): Promise<{
  isBtledIct: boolean;
  programCode: string | null;
}> {
  try {
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        department: true,
        section: true,
        programMemberships: {
          where: { isActive: true },
          select: {
            program: {
              select: { code: true, name: true },
            },
          },
        },
        enrollments: {
          where: { status: "APPROVED" },
          select: {
            course: {
              select: {
                section: true,
                program: {
                  select: { code: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return { isBtledIct: false, programCode: null };

    for (const membership of user.programMemberships) {
      if (
        isBtledIctProgram(membership.program.code) ||
        isBtledIctProgram(membership.program.name)
      ) {
        return { isBtledIct: true, programCode: membership.program.code };
      }
    }

    if (isBtledIctProgram(user.department)) {
      return { isBtledIct: true, programCode: user.department };
    }

    if (isBtledIctProgram(user.section)) {
      return { isBtledIct: true, programCode: "BTLEd ICT" };
    }

    for (const enrollment of user.enrollments) {
      const prog = enrollment.course.program;
      if (
        (prog && (isBtledIctProgram(prog.code) || isBtledIctProgram(prog.name))) ||
        isBtledIctProgram(enrollment.course.section)
      ) {
        return {
          isBtledIct: true,
          programCode: prog?.code ?? "BTLEd ICT",
        };
      }
    }

    return {
      isBtledIct: false,
      programCode: user.programMemberships[0]?.program.code || user.department || null,
    };
  } catch {
    return { isBtledIct: false, programCode: null };
  }
}

/**
 * Single centralized access evaluation used by the sidebar check, page guard, and API guard.
 * Permanent rule: authenticated + institute "ite" + role STUDENT + active BTLED ICT program match.
 */
export async function evaluateIctLabAccess(
  params: IctLabAccessCheckParams
): Promise<IctLabAccessDecision> {
  const {
    userId,
    userRole,
    userInstituteCode,
    routeInstituteCode = "ite",
    resolveStudentProgram = checkStudentBtledIctProgram,
  } = params;

  if (!isIteCode(routeInstituteCode)) {
    return {
      allowed: false,
      role: null,
      programCode: null,
      reason: "NOT_ITE_ROUTE",
    };
  }

  if (!isIteCode(userInstituteCode)) {
    return {
      allowed: false,
      role: null,
      programCode: null,
      reason: "NOT_ITE_USER",
    };
  }

  const normalizedRole = normalizeRole(userRole);
  if (
    normalizedRole !== "STUDENT" &&
    normalizedRole !== "INSTRUCTOR" &&
    normalizedRole !== "ADMIN"
  ) {
    return {
      allowed: false,
      role: null,
      programCode: null,
      reason: "INVALID_ROLE",
    };
  }

  // TEMPORARY testing switch - remove before merging to main
  const isOpenToAllIte = process.env.ICT_LAB_OPEN_TO_ALL_ITE === "true";

  if (normalizedRole !== "STUDENT") {
    if (isOpenToAllIte) {
      return {
        allowed: true,
        role: normalizedRole,
        programCode: null,
      };
    }
    return {
      allowed: false,
      role: normalizedRole,
      programCode: null,
      reason: "NOT_STUDENT",
    };
  }

  const { isBtledIct, programCode } = await resolveStudentProgram(userId);

  if (!isBtledIct && !isOpenToAllIte) {
    return {
      allowed: false,
      role: "STUDENT",
      programCode,
      reason: "NOT_BTLED_ICT",
    };
  }

  return {
    allowed: true,
    role: "STUDENT",
    programCode,
  };
}

/**
 * Determines whether the user is eligible to see the "ICT Lab" sidebar entry
 * inside `(dashboard)/[institute]/layout.tsx`.
 */
export async function isEligibleForIctLabSidebar(params: {
  userId: string;
  userRole: string;
  userInstituteCode: string;
  routeInstituteCode: string;
  resolveStudentProgram?: (
    userId: string
  ) => Promise<{ isBtledIct: boolean; programCode: string | null }>;
}): Promise<boolean> {
  const decision = await evaluateIctLabAccess(params);
  return decision.allowed;
}

/**
 * Server-component page guard for `/[institute]/ict-lab`.
 * Redirects unauthenticated users to `/login?institute=...`, and redirects or 404s unauthorized users.
 */
export async function requireIctLabPageActor(institute: string): Promise<IctLabActor> {
  const { checkIteEligibility, isIteInstituteCode } = await import("@/lib/ite/ite-eligibility");
  const result = await checkIteEligibility();
  if (!result) {
    redirect(`/login?institute=${institute}`);
  }
  if (!isIteInstituteCode(institute)) {
    notFound();
  }

  const decision = await evaluateIctLabAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: institute,
  });

  if (!decision.allowed || !decision.role) {
    if (decision.reason === "NOT_ITE_USER") {
      redirect(`/${result.instituteCode || "ics"}`);
    }
    if (decision.reason === "NOT_STUDENT") {
      const dest = result.role === "ADMIN" ? "admin" : "teachers";
      redirect(`/${institute.toLowerCase()}/${dest}`);
    }
    if (decision.reason === "NOT_BTLED_ICT") {
      redirect(`/${institute.toLowerCase()}/students`);
    }
    notFound();
  }

  return {
    userId: result.userId,
    role: decision.role,
    instituteId: result.session.user.instituteId,
    name: result.session.user.name,
    programCode: decision.programCode,
  };
}

/**
 * API route handler guard for `/api/ite/ict-lab/**`.
 * Throws `HttpError(401)` or `HttpError(403)` when unauthorized.
 */
export async function requireIctLabApiActor(request: Request): Promise<IctLabActor> {
  const { checkIteEligibilityFromRequest } = await import("@/lib/ite/ite-eligibility");
  const result = await checkIteEligibilityFromRequest(request);
  if (!result) {
    throw new HttpError(401, "Authentication required.");
  }

  const decision = await evaluateIctLabAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: "ite",
  });

  if (!decision.allowed || !decision.role) {
    if (decision.reason === "NOT_ITE_USER") {
      throw new HttpError(403, "ICT Lab is only available in the ITE portal.");
    }
    if (decision.reason === "NOT_STUDENT") {
      throw new HttpError(403, "ICT Lab is restricted to BTLED ICT students.");
    }
    if (decision.reason === "NOT_BTLED_ICT") {
      throw new HttpError(403, "ICT Lab is restricted to BTLED ICT students.");
    }
    throw new HttpError(403, "Forbidden.");
  }

  return {
    userId: result.userId,
    role: decision.role,
    instituteId: result.session.user.instituteId,
    name: result.session.user.name,
    programCode: decision.programCode,
  };
}

