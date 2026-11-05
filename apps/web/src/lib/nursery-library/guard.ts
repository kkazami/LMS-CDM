import { notFound, redirect } from "next/navigation";
import { normalizeRole } from "../admin-types";
import { resolveIteStudentProgram } from "../ite-programs/registration";

export interface NurseryLibraryActor {
  userId: string;
  role: "STUDENT";
  instituteId: string;
  name: string;
  programCode: "BECEd";
  programName?: string;
}

export interface NurseryLibraryAccessCheckParams {
  userId: string;
  userRole: string;
  userInstituteCode: string;
  routeInstituteCode?: string;
  resolveStudentProgram?: (
    userId: string
  ) => Promise<{ programCode: string | null; programName?: string } | null>;
}

export interface NurseryLibraryAccessDecision {
  allowed: boolean;
  role: string | null;
  programCode: "BECEd" | null;
  programName?: string;
  reason?:
    | "NOT_ITE_ROUTE"
    | "NOT_ITE_USER"
    | "NOT_STUDENT"
    | "NOT_BECED_PROGRAM"
    | "INVALID_ROLE";
}

function isIteCode(code?: string | null): boolean {
  return Boolean(code && code.trim().toLowerCase() === "ite");
}

export async function checkStudentBecedProgram(userId: string): Promise<{
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
 * Evaluates whether a user is allowed to access the Nursery Song & Educational Media Library.
 * Strict rule: Authenticated + institute "ite" + role STUDENT + resolved program is BECEd.
 * Instructors, admins, other ITE programs (BEEd, BSEd Science, BTLEd ICT), and other institutes (ICS, IBE) are rejected.
 */
export async function evaluateNurseryLibraryAccess(
  params: NurseryLibraryAccessCheckParams
): Promise<NurseryLibraryAccessDecision> {
  const {
    userId,
    userRole,
    userInstituteCode,
    routeInstituteCode = "ite",
    resolveStudentProgram = checkStudentBecedProgram,
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

  if (rawCode !== "BECEd") {
    return {
      allowed: false,
      role: "STUDENT",
      programCode: null,
      reason: "NOT_BECED_PROGRAM",
    };
  }

  return {
    allowed: true,
    role: "STUDENT",
    programCode: "BECEd",
    programName: programResult?.programName,
  };
}

/**
 * Server-component page guard for `/[institute]/nursery-library`.
 */
export async function requireNurseryLibraryPageActor(
  institute: string
): Promise<NurseryLibraryActor> {
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

  const decision = await evaluateNurseryLibraryAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: institute,
  });

  if (!decision.allowed || decision.programCode !== "BECEd") {
    if (decision.reason === "NOT_ITE_USER") {
      redirect(`/${result.instituteCode || "ics"}`);
    }
    if (decision.reason === "NOT_STUDENT") {
      const dest = result.role === "ADMIN" ? "admin" : "teachers";
      redirect(`/${institute.toLowerCase()}/${dest}`);
    }
    if (decision.reason === "NOT_BECED_PROGRAM") {
      redirect(`/${institute.toLowerCase()}/students`);
    }
    notFound();
  }

  return {
    userId: result.userId,
    role: "STUDENT",
    instituteId: result.session.user.instituteId,
    name: result.session.user.name,
    programCode: "BECEd",
    programName: decision.programName,
  };
}

