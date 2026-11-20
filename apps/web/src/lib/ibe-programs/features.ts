import { z } from "zod";
import {
  googleLinkSchema as baseGoogleLinkSchema,
  studentRegistrationSchema as baseStudentRegistrationSchema,
} from "../auth-schema";
import type { HallOfFameCategory } from "../hall-of-fame/types";
import type {
  DbAcademicProgramRow,
  StudentProgramRecordInput,
} from "../ite-programs/features";

export const IBE_STUDENT_PROGRAM_CODES = ["BSBA HRM", "BS ENTREP"] as const;

export type IbeStudentProgramCode = (typeof IBE_STUDENT_PROGRAM_CODES)[number];

export type IbeStudentProgramKind = "BSBA_HRM" | "BS_ENTREP";

export type IbeFeatureId =
  | "mock-interview"
  | "wordwise"
  | "financial-statements"
  | "business-plan"
  | "hall-of-fame"
  | "learning-hub";

export interface IbeProgramCatalogEntry {
  code: IbeStudentProgramCode;
  kind: IbeStudentProgramKind;
  defaultName: string;
  shortLabel: string;
  hallOfFameCategory: HallOfFameCategory;
}

export const IBE_PROGRAM_CATALOG: Record<
  IbeStudentProgramCode,
  IbeProgramCatalogEntry
> = {
  "BSBA HRM": {
    code: "BSBA HRM",
    kind: "BSBA_HRM",
    defaultName:
      "BS Business Administration Major in Human Resource Management",
    shortLabel: "Human Resource Management",
    hallOfFameCategory: "HR_LEADER",
  },
  "BS ENTREP": {
    code: "BS ENTREP",
    kind: "BS_ENTREP",
    defaultName: "BS Entrepreneurship",
    shortLabel: "Entrepreneurship",
    hallOfFameCategory: "ENTREPRENEUR",
  },
};

function normalizeProgramString(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, " ");
}

export function isBsbaHrmProgram(raw: string | null | undefined): boolean {
  const n = normalizeProgramString(raw);
  if (!n) return false;
  if (
    n === "BSBA HRM" ||
    n === "BSBA-HRM" ||
    n === "BSBA MAJOR IN HRM" ||
    n === "HRM" ||
    n.startsWith("BSBA HRM ") ||
    n.startsWith("BSBA-HRM ")
  ) {
    return true;
  }
  if (
    (n.includes("BUSINESS ADMINISTRATION") || n.includes("BSBA")) &&
    (n.includes("HUMAN RESOURCE") || n.includes("HRM"))
  ) {
    return true;
  }
  return false;
}

export function isBsEntrepProgram(raw: string | null | undefined): boolean {
  const n = normalizeProgramString(raw);
  if (!n) return false;
  if (
    n === "BS ENTREP" ||
    n === "BS-ENTREP" ||
    n === "BSENTREP" ||
    n === "BS ENTREPRENEURSHIP" ||
    n.startsWith("BS ENTREP ") ||
    n.startsWith("BS ENTREPRENEURSHIP ") ||
    n.startsWith("BSENTREP ")
  ) {
    return true;
  }
  if (
    n.includes("ENTREPRENEURSHIP") &&
    !n.includes("INSTITUTE OF BUSINESS AND ENTREPRENEURSHIP")
  ) {
    return true;
  }
  return false;
}

export function isEligibleIbeStudentProgramCode(
  raw: string | null | undefined
): raw is IbeStudentProgramCode {
  if (!raw) return false;
  return (IBE_STUDENT_PROGRAM_CODES as readonly string[]).includes(raw.trim());
}

export function classifyIbeStudentProgramCode(
  raw: string | null | undefined
): IbeStudentProgramCode | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (isEligibleIbeStudentProgramCode(trimmed)) return trimmed;
  if (isBsbaHrmProgram(trimmed)) return "BSBA HRM";
  if (isBsEntrepProgram(trimmed)) return "BS ENTREP";
  return null;
}

export interface IbeProgramFeature {
  id: IbeFeatureId;
  title: string;
  shortLabel: string;
  description: string;
  sublabel: string;
  href: string;
  programs: readonly IbeStudentProgramCode[];
  status: "available";
}

export interface IbeSidebarProgramTool {
  id: IbeFeatureId;
  title: string;
  description: string;
  href: string;
}

/**
 * Authoritative IBE per-program student feature configuration:
 * - BSBA HRM:
 *   • Mock Interview (/ibe/mock-interview)
 *   • IBE WordWise – Vocabulary & Academic Language Hub (/ibe/wordwise)
 *   • Hall of Fame (/ibe/hall-of-fame) — locked to HR_LEADER (10 Famous HR Leaders)
 *   • IBE Learning Hub (/ibe/learning-hub) — identical catalog for both programs
 * - BS ENTREP:
 *   • Financial Statement Generator (/ibe/financial-statements)
 *   • Business Plan Guide (/ibe/business-plan)
 *   • Hall of Fame (/ibe/hall-of-fame) — locked to ENTREPRENEUR (10 Famous Entrepreneurs)
 *   • IBE Learning Hub (/ibe/learning-hub) — identical catalog for both programs
 */
export const IBE_PROGRAM_FEATURES: readonly IbeProgramFeature[] = [
  {
    id: "mock-interview",
    title: "Mock Interview",
    shortLabel: "Mock Interview",
    description:
      "AI interview coach, 36 sample answers, Recruiter Mode simulation, and readiness quiz.",
    sublabel: "AI interview coach",
    href: "/ibe/mock-interview",
    programs: ["BSBA HRM"],
    status: "available",
  },
  {
    id: "wordwise",
    title: "IBE WordWise",
    shortLabel: "IBE WordWise",
    description:
      "Live 150,000+ English Dictionary with A–Z lookup, 6 academic vocabulary categories, Word of the Day, IPA & audio pronunciation, and daily vocabulary activity.",
    sublabel: "Live Dictionary & Language Hub",
    href: "/ibe/wordwise",
    programs: ["BSBA HRM"],
    status: "available",
  },
  {
    id: "financial-statements",
    title: "Financial Statement Generator",
    shortLabel: "Financial Statements",
    description:
      "Prepare, validate, and export Income Statement, Balance Sheet, Cash Flow, and Equity reports.",
    sublabel: "Accounting reports",
    href: "/ibe/financial-statements",
    programs: ["BS ENTREP"],
    status: "available",
  },
  {
    id: "business-plan",
    title: "Business Plan Guide",
    shortLabel: "Business Plan Guide",
    description:
      "14 sequential entrepreneurship guide lessons, sample templates, and guided venture builder.",
    sublabel: "Guided Venture Builder",
    href: "/ibe/business-plan",
    programs: ["BS ENTREP"],
    status: "available",
  },
  {
    id: "hall-of-fame",
    title: "Hall of Fame",
    shortLabel: "Hall of Fame",
    description:
      "Curated biographies, major achievements, and career timelines of 10 famous industry leaders.",
    sublabel: "Industry leaders",
    href: "/ibe/hall-of-fame",
    programs: ["BSBA HRM", "BS ENTREP"],
    status: "available",
  },
  {
    id: "learning-hub",
    title: "IBE Learning Hub",
    shortLabel: "IBE Learning Hub",
    description:
      "Curated free external business courses & certificates (HP LIFE, Saylor, HubSpot, OpenLearn, Santander, Alison).",
    sublabel: "External courses",
    href: "/ibe/learning-hub",
    programs: ["BSBA HRM", "BS ENTREP"],
    status: "available",
  },
] as const;

export function canIbeProgramAccessFeature(
  programCode: string | null | undefined,
  featureId: IbeFeatureId
): boolean {
  const canonical = classifyIbeStudentProgramCode(programCode);
  if (!canonical) return false;
  const feature = IBE_PROGRAM_FEATURES.find((f) => f.id === featureId);
  if (!feature) return false;
  return feature.programs.includes(canonical);
}

export function getHallOfFameCategoryForIbeProgram(
  programCode: string | null | undefined
): HallOfFameCategory | null {
  const canonical = classifyIbeStudentProgramCode(programCode);
  if (!canonical) return null;
  return IBE_PROGRAM_CATALOG[canonical].hallOfFameCategory;
}

export function getFeaturesForIbeProgram(
  programCode: string | null | undefined
): IbeProgramFeature[] {
  const canonical = classifyIbeStudentProgramCode(programCode);
  if (!canonical) return [];
  return IBE_PROGRAM_FEATURES.filter((feature) =>
    feature.programs.includes(canonical)
  ).map((feature) => {
    if (feature.id === "hall-of-fame") {
      return {
        ...feature,
        description:
          canonical === "BSBA HRM"
            ? "Biographies, achievements, and career timelines of 10 Famous HR Leaders (5 Filipino & 5 International)."
            : "Biographies, achievements, and career timelines of 10 Famous Entrepreneurs (5 Filipino & 5 International).",
        sublabel:
          canonical === "BSBA HRM" ? "10 Famous HR Leaders" : "10 Famous Entrepreneurs",
      };
    }
    return feature;
  });
}

export function getAvailableSidebarToolsForIbeProgram(
  programCode: string | null | undefined
): IbeSidebarProgramTool[] {
  return getFeaturesForIbeProgram(programCode).map((feature) => ({
    id: feature.id,
    title: feature.title,
    description: feature.description,
    href: feature.href,
  }));
}

export interface ResolvedIbeStudentProgram {
  programCode: IbeStudentProgramCode;
  programKind: IbeStudentProgramKind;
  programName: string;
  source: "membership" | "department" | "enrollment";
}

/**
 * Resolves a student's IBE program from their record in strict priority order:
 * 1. Active `ProgramMembership` (`program.code` / `program.name`)
 * 2. `User.department` (and `User.section`)
 * 3. Approved `Enrollment` (`course.program.code` / `course.program.name` / `course.section`)
 */
export function resolveIbeStudentProgramFromRecord(
  record: StudentProgramRecordInput | null | undefined
): ResolvedIbeStudentProgram | null {
  if (!record) return null;

  // 1. Active ProgramMembership first
  for (const membership of record.programMemberships ?? []) {
    if (membership.isActive === false) continue;
    if (membership.kind && membership.kind.toUpperCase() !== "STUDENT") continue;
    const prog = membership.program;
    if (!prog) continue;
    const matchedCode =
      classifyIbeStudentProgramCode(prog.code) ??
      classifyIbeStudentProgramCode(prog.name);
    if (matchedCode) {
      const catalog = IBE_PROGRAM_CATALOG[matchedCode];
      return {
        programCode: matchedCode,
        programKind: catalog.kind,
        programName: prog.name?.trim() || catalog.defaultName,
        source: "membership",
      };
    }
  }

  // 2. User.department (and User.section fallback)
  const deptMatched =
    classifyIbeStudentProgramCode(record.department) ??
    classifyIbeStudentProgramCode(record.section);
  if (deptMatched) {
    const catalog = IBE_PROGRAM_CATALOG[deptMatched];
    return {
      programCode: deptMatched,
      programKind: catalog.kind,
      programName: catalog.defaultName,
      source: "department",
    };
  }

  // 3. Approved enrollments
  for (const enrollment of record.enrollments ?? []) {
    if (enrollment.status && enrollment.status.toUpperCase() !== "APPROVED") {
      continue;
    }
    const course = enrollment.course;
    if (!course) continue;
    const prog = course.program;
    const enrollmentMatched =
      classifyIbeStudentProgramCode(prog?.code) ??
      classifyIbeStudentProgramCode(prog?.name) ??
      classifyIbeStudentProgramCode(course.section);
    if (enrollmentMatched) {
      const catalog = IBE_PROGRAM_CATALOG[enrollmentMatched];
      return {
        programCode: enrollmentMatched,
        programKind: catalog.kind,
        programName: prog?.name?.trim() || catalog.defaultName,
        source: "enrollment",
      };
    }
  }

  return null;
}

/**
 * Validates a client-submitted IBE program code against the 2 eligible IBE student programs
 * AND the active `AcademicProgram` rows loaded from the database for the IBE institute.
 */
export function validateIbeProgramSelectionAgainstDb(
  rawProgram: unknown,
  dbIbePrograms: readonly DbAcademicProgramRow[]
):
  | { ok: true; program: DbAcademicProgramRow & { code: IbeStudentProgramCode } }
  | { ok: false; error: string } {
  if (typeof rawProgram !== "string" || !rawProgram.trim()) {
    return {
      ok: false,
      error: "Please select a valid IBE academic program.",
    };
  }

  const trimmed = rawProgram.trim();
  if (!isEligibleIbeStudentProgramCode(trimmed)) {
    return {
      ok: false,
      error:
        "Selected program is not an eligible IBE student degree program.",
    };
  }

  const matched = dbIbePrograms.find(
    (row) => row.isActive !== false && row.code.trim() === trimmed
  );
  if (!matched) {
    return {
      ok: false,
      error: `Selected IBE program "${trimmed}" is not available in the database.`,
    };
  }

  return {
    ok: true,
    program: {
      ...matched,
      code: trimmed,
    },
  };
}

/**
 * Inspects the DB `AcademicProgram` rows for IBE and returns the ordered list of the 2
 * eligible student programs plus any missing required codes.
 */
export function inspectIbeDatabasePrograms(
  dbRows: readonly DbAcademicProgramRow[]
): {
  programs: Array<{ id: string; code: IbeStudentProgramCode; name: string }>;
  missingCodes: IbeStudentProgramCode[];
} {
  const programs: Array<{
    id: string;
    code: IbeStudentProgramCode;
    name: string;
  }> = [];
  const missingCodes: IbeStudentProgramCode[] = [];

  for (const requiredCode of IBE_STUDENT_PROGRAM_CODES) {
    const found = dbRows.find(
      (row) => row.isActive !== false && row.code.trim() === requiredCode
    );
    if (found) {
      programs.push({
        id: found.id,
        code: requiredCode,
        name: found.name,
      });
    } else {
      missingCodes.push(requiredCode);
    }
  }

  return { programs, missingCodes };
}

export function getIbeWelcomeBannerPortalLabel(
  instituteCode: string,
  defaultName: string,
  isTeacher: boolean = false,
  programCode?: string | null
): string {
  const normalizedCode = (instituteCode || "").toLowerCase();
  if (!isTeacher && normalizedCode === "ibe" && programCode?.trim()) {
    return `IBE • ${programCode.trim()}`;
  }
  return isTeacher ? `${defaultName} • Faculty Portal` : `${defaultName} · Portal`;
}

export const webStudentRegistrationSchema =
  baseStudentRegistrationSchema.superRefine((data, ctx) => {
    if (data.instituteCode === "ibe") {
      if (!data.program || !data.program.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["program"],
          message: "Select your program.",
        });
      } else if (!isEligibleIbeStudentProgramCode(data.program)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["program"],
          message: "Select one of the eligible IBE academic programs.",
        });
      }
    }
  });

export const webGoogleLinkSchema = baseGoogleLinkSchema.superRefine(
  (data, ctx) => {
    if (data.instituteCode === "ibe") {
      if (!data.program || !data.program.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["program"],
          message: "Select your program.",
        });
      } else if (!isEligibleIbeStudentProgramCode(data.program)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["program"],
          message: "Select one of the eligible IBE academic programs.",
        });
      }
    }
  }
);
