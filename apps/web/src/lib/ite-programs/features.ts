import { classifyIteProgram, type IteProgramKind } from "../ict-lab/rules";

export const ITE_STUDENT_PROGRAM_CODES = [
  "BECEd",
  "BEEd",
  "BTLEd ICT",
  "BSEd SCIENCE",
] as const;

export type IteStudentProgramCode = (typeof ITE_STUDENT_PROGRAM_CODES)[number];

export type IteStudentProgramKind = Exclude<IteProgramKind, "GENERAL_EDUCATION">;

export interface IteProgramCatalogEntry {
  code: IteStudentProgramCode;
  kind: IteStudentProgramKind;
  defaultName: string;
  shortLabel: string;
}

export const ITE_PROGRAM_CATALOG: Record<
  IteStudentProgramCode,
  IteProgramCatalogEntry
> = {
  BECEd: {
    code: "BECEd",
    kind: "BECED",
    defaultName: "Bachelor of Early Childhood Education",
    shortLabel: "Early Childhood Education",
  },
  BEEd: {
    code: "BEEd",
    kind: "BEED",
    defaultName: "Bachelor of Elementary Education",
    shortLabel: "Elementary Education (Generalist)",
  },
  "BTLEd ICT": {
    code: "BTLEd ICT",
    kind: "BTLED_ICT",
    defaultName: "Bachelor of Technology and Livelihood Education Major in ICT",
    shortLabel: "Technology & Livelihood Education (ICT)",
  },
  "BSEd SCIENCE": {
    code: "BSEd SCIENCE",
    kind: "BSED_SCIENCE",
    defaultName: "Bachelor of Secondary Education Major in Science",
    shortLabel: "Secondary Education (Science)",
  },
};

const KIND_TO_PROGRAM_CODE: Record<IteStudentProgramKind, IteStudentProgramCode> = {
  BECED: "BECEd",
  BEED: "BEEd",
  BTLED_ICT: "BTLEd ICT",
  BSED_SCIENCE: "BSEd SCIENCE",
};

export function isEligibleIteStudentProgramCode(
  raw: string | null | undefined
): raw is IteStudentProgramCode {
  if (!raw) return false;
  return (ITE_STUDENT_PROGRAM_CODES as readonly string[]).includes(raw.trim());
}

export function kindToIteProgramCode(
  kind: IteProgramKind | null | undefined
): IteStudentProgramCode | null {
  if (!kind || kind === "GENERAL_EDUCATION") return null;
  return KIND_TO_PROGRAM_CODE[kind] ?? null;
}

export function classifyIteStudentProgramCode(
  raw: string | null | undefined
): IteStudentProgramCode | null {
  const kind = classifyIteProgram(raw);
  return kindToIteProgramCode(kind);
}

export interface IteProgramFeature {
  id: string;
  title: string;
  description: string;
  href?: string;
  programs: readonly IteStudentProgramCode[];
  status: "available" | "coming-soon";
}

export interface IteSidebarProgramTool {
  id: string;
  title: string;
  description: string;
  href: string;
}

/**
 * Authoritative ITE per-program student feature configuration.
 * - "Lesson Plan Models": all four ITE student programs (coming-soon)
 * - "Nursery Songs & YouTube Categories": BECEd only (coming-soon)
 * - "MATATAG Curriculum Guide": BEEd only (coming-soon)
 * - "Interactive Educational Charts": BSEd SCIENCE only (coming-soon)
 * - "ICT Lab": BTLEd ICT only (available, links to /ite/ict-lab)
 */
export const ITE_PROGRAM_FEATURES: readonly IteProgramFeature[] = [
  {
    id: "ict-lab",
    title: "ICT Lab",
    description: "Code Playground, Hardware Explorer, LAN Cable Guide",
    href: "/ite/ict-lab",
    programs: ["BTLEd ICT"],
    status: "available",
  },
  {
    id: "nursery-songs-youtube-categories",
    title: "Nursery Songs & YouTube Categories",
    description:
      "Curated early childhood songs, action rhymes, and classroom video categories for young learners.",
    programs: ["BECEd"],
    status: "coming-soon",
  },
  {
    id: "matatag-curriculum-guide",
    title: "MATATAG Curriculum Guide",
    description:
      "Elementary generalist learning competencies, standards, and teaching references under the MATATAG curriculum.",
    programs: ["BEEd"],
    status: "coming-soon",
  },
  {
    id: "interactive-educational-charts",
    title: "Interactive Educational Charts",
    description:
      "Visual science reference charts, periodic tables, and interactive anatomical and physical diagrams.",
    programs: ["BSEd SCIENCE"],
    status: "coming-soon",
  },
  {
    id: "lesson-plan-models",
    title: "Lesson Plan Models",
    description:
      "Structured 4A's, 5E's, and DepEd DLP/DLL lesson plan exemplars tailored for pre-service teachers.",
    programs: ["BECEd", "BEEd", "BTLEd ICT", "BSEd SCIENCE"],
    status: "coming-soon",
  },
] as const;

/**
 * Returns ONLY the features whose `programs` list includes the given ITE student program.
 * Never returns another program's features.
 */
export function getFeaturesForIteProgram(
  programCode: string | null | undefined
): IteProgramFeature[] {
  const canonical = classifyIteStudentProgramCode(programCode);
  if (!canonical) return [];
  return ITE_PROGRAM_FEATURES.filter((feature) =>
    feature.programs.includes(canonical)
  );
}

/**
 * Returns ONLY the "available" features with a valid `href` for the given ITE student program,
 * used to populate the "Program tools" group in the ITE student sidebar.
 */
export function getAvailableSidebarToolsForIteProgram(
  programCode: string | null | undefined
): IteSidebarProgramTool[] {
  return getFeaturesForIteProgram(programCode)
    .filter(
      (feature): feature is IteProgramFeature & { href: string } =>
        feature.status === "available" && Boolean(feature.href)
    )
    .map((feature) => ({
      id: feature.id,
      title: feature.title,
      description: feature.description,
      href: feature.href,
    }));
}

export interface StudentProgramRecordInput {
  department?: string | null;
  section?: string | null;
  programMemberships?: Array<{
    isActive?: boolean;
    kind?: string;
    program?: {
      code?: string | null;
      name?: string | null;
    } | null;
  }>;
  enrollments?: Array<{
    status?: string;
    course?: {
      section?: string | null;
      program?: {
        code?: string | null;
        name?: string | null;
      } | null;
    } | null;
  }>;
}

export interface ResolvedIteStudentProgram {
  programCode: IteStudentProgramCode;
  programKind: IteStudentProgramKind;
  programName: string;
  source: "membership" | "department" | "enrollment";
}

/**
 * Resolves a student's ITE program from their record in strict priority order:
 * 1. Active `ProgramMembership` (`program.code` / `program.name`)
 * 2. `User.department` (and `User.section`)
 * 3. Approved `Enrollment` (`course.program.code` / `course.program.name` / `course.section`)
 *
 * Excludes `"GENERAL EDUCATION"` because it is not a student degree program.
 */
export function resolveIteStudentProgramFromRecord(
  record: StudentProgramRecordInput | null | undefined
): ResolvedIteStudentProgram | null {
  if (!record) return null;

  // 1. Active ProgramMembership first
  for (const membership of record.programMemberships ?? []) {
    if (membership.isActive === false) continue;
    if (membership.kind && membership.kind.toUpperCase() !== "STUDENT") continue;
    const prog = membership.program;
    if (!prog) continue;
    const matchedCode =
      classifyIteStudentProgramCode(prog.code) ??
      classifyIteStudentProgramCode(prog.name);
    if (matchedCode) {
      const catalog = ITE_PROGRAM_CATALOG[matchedCode];
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
    classifyIteStudentProgramCode(record.department) ??
    classifyIteStudentProgramCode(record.section);
  if (deptMatched) {
    const catalog = ITE_PROGRAM_CATALOG[deptMatched];
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
      classifyIteStudentProgramCode(prog?.code) ??
      classifyIteStudentProgramCode(prog?.name) ??
      classifyIteStudentProgramCode(course.section);
    if (enrollmentMatched) {
      const catalog = ITE_PROGRAM_CATALOG[enrollmentMatched];
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

export interface DbAcademicProgramRow {
  id: string;
  code: string;
  name: string;
  instituteId?: string;
  isActive?: boolean;
}

/**
 * Validates a client-submitted ITE program code against the 4 eligible ITE student programs
 * AND the active `AcademicProgram` rows loaded from the database for the ITE institute.
 */
export function validateIteProgramSelectionAgainstDb(
  rawProgram: unknown,
  dbItePrograms: readonly DbAcademicProgramRow[]
):
  | { ok: true; program: DbAcademicProgramRow & { code: IteStudentProgramCode } }
  | { ok: false; error: string } {
  if (typeof rawProgram !== "string" || !rawProgram.trim()) {
    return {
      ok: false,
      error: "Please select a valid ITE academic program.",
    };
  }

  const trimmed = rawProgram.trim();
  if (!isEligibleIteStudentProgramCode(trimmed)) {
    return {
      ok: false,
      error:
        "Selected program is not an eligible ITE student degree program.",
    };
  }

  const matched = dbItePrograms.find(
    (row) => row.isActive !== false && row.code.trim() === trimmed
  );
  if (!matched) {
    return {
      ok: false,
      error: `Selected ITE program "${trimmed}" is not available in the database.`,
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
 * Inspects the DB `AcademicProgram` rows for ITE and returns the ordered list of the 4
 * eligible student programs plus any missing required codes.
 */
export function inspectIteDatabasePrograms(
  dbRows: readonly DbAcademicProgramRow[]
): {
  programs: Array<{ id: string; code: IteStudentProgramCode; name: string }>;
  missingCodes: IteStudentProgramCode[];
} {
  const programs: Array<{
    id: string;
    code: IteStudentProgramCode;
    name: string;
  }> = [];
  const missingCodes: IteStudentProgramCode[] = [];

  for (const requiredCode of ITE_STUDENT_PROGRAM_CODES) {
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
