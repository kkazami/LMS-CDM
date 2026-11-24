import { notFound, redirect } from "next/navigation";
import { normalizeRole } from "../admin-types";
import { resolveIteStudentProgram } from "../ite-programs/registration";

export interface MatatagActor {
  userId: string;
  role: "STUDENT";
  instituteId: string;
  name: string;
  programCode: "BEEd";
  programName?: string;
}

export interface MatatagAccessCheckParams {
  userId: string;
  userRole: string;
  userInstituteCode: string;
  routeInstituteCode?: string;
  resolveStudentProgram?: (
    userId: string
  ) => Promise<{ programCode: string | null; programName?: string } | null>;
}

export interface MatatagAccessDecision {
  allowed: boolean;
  role: string | null;
  programCode: "BEEd" | null;
  programName?: string;
  reason?:
    | "NOT_ITE_ROUTE"
    | "NOT_ITE_USER"
    | "NOT_STUDENT"
    | "NOT_BEED_PROGRAM"
    | "INVALID_ROLE";
}

function isIteCode(code?: string | null): boolean {
  return Boolean(code && code.trim().toLowerCase() === "ite");
}

export async function checkStudentBeedProgram(userId: string): Promise<{
  programCode: string | null;
  programName?: string;
} | null> {
  const resolved = await resolveIteStudentProgram(userId);
  if (!resolved) {
    return null;
  }
  return {
    programCode: resolved.programCode,
    programName: resolved.programName,
  };
}

/**
 * Evaluates whether a user is allowed to access the MATATAG Curriculum Reference Hub.
 * Strict rule: Authenticated + institute "ite" + role STUDENT + resolved program is BEEd.
 * Instructors, admins, other ITE programs (BECEd, BSEd Science, BTLEd ICT), and other institutes (ICS, IBE) are rejected.
 */
export async function evaluateMatatagAccess(
  params: MatatagAccessCheckParams
): Promise<MatatagAccessDecision> {
  const {
    userId,
    userRole,
    userInstituteCode,
    routeInstituteCode = "ite",
    resolveStudentProgram = checkStudentBeedProgram,
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

  const rawRoleUpper = (userRole ?? "").trim().toUpperCase();
  const validRoles = ["STUDENT", "INSTRUCTOR", "ADMIN", "PROFESSOR", "TEACHER"];
  if (!validRoles.includes(rawRoleUpper)) {
    return {
      allowed: false,
      role: null,
      programCode: null,
      reason: "INVALID_ROLE",
    };
  }

  const normalizedRole = normalizeRole(userRole);
  if (normalizedRole !== "STUDENT") {
    return {
      allowed: false,
      role: normalizedRole,
      programCode: null,
      reason: "NOT_STUDENT",
    };
  }

  const programResult = await resolveStudentProgram(userId);
  const rawCode = programResult?.programCode;

  if (rawCode !== "BEEd") {
    return {
      allowed: false,
      role: "STUDENT",
      programCode: null,
      reason: "NOT_BEED_PROGRAM",
    };
  }

  return {
    allowed: true,
    role: "STUDENT",
    programCode: "BEEd",
    programName: programResult?.programName,
  };
}

/**
 * Server-component page guard for `/[institute]/matatag`.
 */
export async function requireMatatagPageActor(
  institute: string
): Promise<MatatagActor> {
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

  const decision = await evaluateMatatagAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: institute,
  });

  if (!decision.allowed || decision.programCode !== "BEEd") {
    if (decision.reason === "NOT_ITE_USER") {
      redirect(`/${result.instituteCode || "ics"}`);
    }
    if (decision.reason === "NOT_STUDENT") {
      const dest = result.role === "ADMIN" ? "admin" : "teachers";
      redirect(`/${institute.toLowerCase()}/${dest}`);
    }
    if (decision.reason === "NOT_BEED_PROGRAM") {
      redirect(`/${institute.toLowerCase()}/students`);
    }
    notFound();
  }

  return {
    userId: result.userId,
    role: "STUDENT",
    instituteId: result.session.user.instituteId,
    name: result.session.user.name,
    programCode: "BEEd",
    programName: decision.programName,
  };
}
