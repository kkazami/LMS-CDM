import { notFound, redirect } from "next/navigation";
import { normalizeRole } from "../admin-types";
import { resolveIteStudentProgram } from "../ite-programs/registration";
import {
  isEligibleIteStudentProgramCode,
  type IteStudentProgramCode,
} from "../ite-programs/features";

export interface LessonPlanActor {
  userId: string;
  role: "STUDENT";
  instituteId: string;
  name: string;
  programCode: IteStudentProgramCode;
  programName?: string;
}

export interface LessonPlanAccessCheckParams {
  userId: string;
  userRole: string;
  userInstituteCode: string;
  routeInstituteCode?: string;
  resolveStudentProgram?: (
    userId: string
  ) => Promise<{ programCode: string | null; programName?: string } | null>;
}

export interface LessonPlanAccessDecision {
  allowed: boolean;
  role: string | null;
  programCode: IteStudentProgramCode | null;
  programName?: string;
  reason?:
    | "NOT_ITE_ROUTE"
    | "NOT_ITE_USER"
    | "NOT_STUDENT"
    | "NOT_ELIGIBLE_PROGRAM"
    | "INVALID_ROLE";
}

function isIteCode(code?: string | null): boolean {
  return Boolean(code && code.trim().toLowerCase() === "ite");
}

export async function checkStudentEligibleIteProgram(userId: string): Promise<{
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
 * Evaluates whether a user is allowed to access the Lesson Plan Builder.
 * Rule: Authenticated + institute "ite" + role STUDENT + resolved program is one of
 * the four ITE programs (BECEd, BEEd, BTLEd ICT, BSEd SCIENCE).
 */
export async function evaluateLessonPlanAccess(
  params: LessonPlanAccessCheckParams
): Promise<LessonPlanAccessDecision> {
  const {
    userId,
    userRole,
    userInstituteCode,
    routeInstituteCode = "ite",
    resolveStudentProgram = checkStudentEligibleIteProgram,
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

  if (!isEligibleIteStudentProgramCode(rawCode)) {
    return {
      allowed: false,
      role: "STUDENT",
      programCode: null,
      reason: "NOT_ELIGIBLE_PROGRAM",
    };
  }

  return {
    allowed: true,
    role: "STUDENT",
    programCode: rawCode,
    programName: programResult?.programName,
  };
}

/**
 * Server-component page guard for `/[institute]/lesson-plans`.
 */
export async function requireLessonPlanPageActor(
  institute: string
): Promise<LessonPlanActor> {
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

  const decision = await evaluateLessonPlanAccess({
    userId: result.userId,
    userRole: result.role,
    userInstituteCode: result.instituteCode,
    routeInstituteCode: institute,
  });

  if (!decision.allowed || !decision.programCode) {
    if (decision.reason === "NOT_ITE_USER") {
      redirect(`/${result.instituteCode || "ics"}`);
    }
    if (decision.reason === "NOT_STUDENT") {
      const dest = result.role === "ADMIN" ? "admin" : "teachers";
      redirect(`/${institute.toLowerCase()}/${dest}`);
    }
    if (decision.reason === "NOT_ELIGIBLE_PROGRAM") {
      redirect(`/${institute.toLowerCase()}/students`);
    }
    notFound();
  }

  return {
    userId: result.userId,
    role: "STUDENT",
    instituteId: result.session.user.instituteId,
    name: result.session.user.name,
    programCode: decision.programCode,
    programName: decision.programName,
  };
}

