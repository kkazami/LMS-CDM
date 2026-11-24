import type {
  DbAcademicProgramRow,
  IteStudentProgramCode,
  StudentProgramRecordInput,
} from "../ite-programs/features";
import {
  evaluateProfileDepartmentUpdate as evaluateIteProfileDepartmentUpdate,
  loadActiveIteStudentProgramsFromDb,
  resolveAdminStudentDepartmentSync as resolveIteAdminStudentDepartmentSync,
  resolveRegistrationDepartmentForInstitute as resolveIteRegistrationDepartmentForInstitute,
} from "../ite-programs/registration";
import {
  IBE_STUDENT_PROGRAM_CODES,
  isEligibleIbeStudentProgramCode,
  resolveIbeStudentProgramFromRecord,
  validateIbeProgramSelectionAgainstDb,
  webGoogleLinkSchema,
  webStudentRegistrationSchema,
  type IbeStudentProgramCode,
  type ResolvedIbeStudentProgram,
} from "./features";

export { webGoogleLinkSchema, webStudentRegistrationSchema };

export interface ResolveRegistrationProgramInput {
  instituteCode: string;
  instituteId: string;
  rawProgram: unknown;
  loadItePrograms?: (instituteId: string) => Promise<DbAcademicProgramRow[]>;
  loadIbePrograms?: (instituteId: string) => Promise<DbAcademicProgramRow[]>;
}

export async function resolveRegistrationDepartmentForInstitute(
  input: ResolveRegistrationProgramInput
): Promise<
  | {
      ok: true;
      department: IteStudentProgramCode | IbeStudentProgramCode | undefined;
    }
  | { ok: false; status: 400; message: string }
> {
  const normalizedInstitute = input.instituteCode.trim().toLowerCase();

  if (normalizedInstitute === "ibe") {
    if (input.rawProgram === undefined) {
      return { ok: true, department: undefined };
    }

    const loadIbe = input.loadIbePrograms ?? loadActiveIbeStudentProgramsFromDb;
    const dbPrograms = await loadIbe(input.instituteId);
    const validation = validateIbeProgramSelectionAgainstDb(
      input.rawProgram,
      dbPrograms
    );
    if (!validation.ok) {
      return { ok: false, status: 400, message: validation.error };
    }

    return { ok: true, department: validation.program.code };
  }

  return resolveIteRegistrationDepartmentForInstitute({
    instituteCode: input.instituteCode,
    instituteId: input.instituteId,
    rawProgram: input.rawProgram,
    loadItePrograms:
      input.loadItePrograms ?? loadActiveIteStudentProgramsFromDb,
  });
}

export function resolveAdminStudentDepartmentSync(params: {
  studentInstituteCode: string | null | undefined;
  programCode: string | null | undefined;
}): { department?: IteStudentProgramCode | IbeStudentProgramCode } {
  const normalizedInst = params.studentInstituteCode?.trim().toLowerCase();
  const trimmedCode = params.programCode?.trim();
  if (normalizedInst === "ibe" && trimmedCode && isEligibleIbeStudentProgramCode(trimmedCode)) {
    return { department: trimmedCode };
  }
  return resolveIteAdminStudentDepartmentSync(params);
}

export function evaluateProfileDepartmentUpdate(params: {
  instituteCode: string;
  userRole: string;
  currentRecord: StudentProgramRecordInput & { department?: string | null };
  requestedDepartment: string | undefined;
}): {
  allowed: boolean;
  status?: number;
  message?: string;
  departmentToPersist: string | undefined;
} {
  const { instituteCode, userRole, currentRecord, requestedDepartment } = params;
  if (requestedDepartment === undefined) {
    return { allowed: true, departmentToPersist: undefined };
  }

  const normalizedInst = instituteCode.trim().toLowerCase();
  const isStudent = userRole.trim().toUpperCase() === "STUDENT";

  if (normalizedInst === "ibe" && isStudent) {
    const resolvedIbe = resolveIbeStudentProgramFromRecord(currentRecord);
    if (!resolvedIbe) {
      return { allowed: true, departmentToPersist: requestedDepartment };
    }

    const currentDept = (currentRecord.department ?? "").trim();
    const nextDept = requestedDepartment.trim();

    if (nextDept === currentDept || nextDept === resolvedIbe.programCode) {
      return { allowed: true, departmentToPersist: undefined };
    }

    return {
      allowed: false,
      status: 403,
      message:
        "Your IBE academic program is locked after selection and can only be changed by an administrator.",
      departmentToPersist: undefined,
    };
  }

  return evaluateIteProfileDepartmentUpdate(params);
}

export interface OneTimeIbeProgramSelectionStore {
  findStudentRecord: (userId: string) => Promise<
    | (StudentProgramRecordInput & {
        id: string;
        role: string;
        institute: { id: string; code: string };
      })
    | null
  >;
  loadIbePrograms: (instituteId: string) => Promise<DbAcademicProgramRow[]>;
  conditionalSetDepartment: (params: {
    userId: string;
    instituteId: string;
    expectedCurrentDepartment: string;
    newProgramCode: IbeStudentProgramCode;
  }) => Promise<number>;
}

/**
 * Executes the one-time "Choose your IBE program" selection for an existing IBE student:
 * - Only works for an authenticated IBE `STUDENT`.
 * - Validates `rawProgram` against the 2 IBE `AcademicProgram` rows (`BSBA HRM` and `BS ENTREP`) in the database.
 * - Rejects with `409 Conflict` if the student already has a recognizable IBE program
 *   (from active `ProgramMembership`, `User.department`, or approved `Enrollment`).
 * - Uses an atomic conditional update (`updateMany` matching the previous unassigned `department`
 *   and `programMemberships: { none: { isActive: true, kind: "STUDENT" } }`) so two parallel
 *   requests cannot both succeed.
 */
export async function executeOneTimeIbeProgramSelection(params: {
  userId: string;
  rawProgram: unknown;
  store: OneTimeIbeProgramSelectionStore;
}): Promise<
  | {
      ok: true;
      status: 200;
      programCode: IbeStudentProgramCode;
      programName: string;
    }
  | {
      ok: false;
      status: 400 | 403 | 404 | 409;
      message: string;
    }
> {
  const { userId, rawProgram, store } = params;

  const student = await store.findStudentRecord(userId);
  if (!student) {
    return { ok: false, status: 404, message: "Student account not found." };
  }

  if (
    student.institute.code.trim().toLowerCase() !== "ibe" ||
    student.role.trim().toUpperCase() !== "STUDENT"
  ) {
    return {
      ok: false,
      status: 403,
      message: "Only IBE students can select an IBE academic program.",
    };
  }

  const existingProgram = resolveIbeStudentProgramFromRecord(student);
  if (existingProgram) {
    return {
      ok: false,
      status: 409,
      message: `Your academic program (${existingProgram.programCode}) has already been set and is locked.`,
    };
  }

  const dbPrograms = await store.loadIbePrograms(student.institute.id);
  const validation = validateIbeProgramSelectionAgainstDb(
    rawProgram,
    dbPrograms
  );
  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      message: validation.error,
    };
  }

  const updatedCount = await store.conditionalSetDepartment({
    userId: student.id,
    instituteId: student.institute.id,
    expectedCurrentDepartment: student.department ?? "",
    newProgramCode: validation.program.code,
  });

  if (updatedCount !== 1) {
    return {
      ok: false,
      status: 409,
      message: "Your academic program has already been set and is locked.",
    };
  }

  return {
    ok: true,
    status: 200,
    programCode: validation.program.code,
    programName: validation.program.name,
  };
}

export async function loadActiveIbeStudentProgramsFromDb(
  instituteId?: string
): Promise<DbAcademicProgramRow[]> {
  const { db } = await import("@/lib/db");
  return db.academicProgram.findMany({
    where: {
      ...(instituteId ? { instituteId } : { institute: { code: "ibe" } }),
      isActive: true,
      code: { in: [...IBE_STUDENT_PROGRAM_CODES] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      instituteId: true,
      isActive: true,
    },
  });
}

/**
 * Server helper to resolve an IBE student's program from PostgreSQL by user ID.
 */
export async function resolveIbeStudentProgram(
  userId: string
): Promise<ResolvedIbeStudentProgram | null> {
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
            isActive: true,
            kind: true,
            program: {
              select: { code: true, name: true },
            },
          },
        },
        enrollments: {
          where: { status: "APPROVED" },
          select: {
            status: true,
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
    return resolveIbeStudentProgramFromRecord(user);
  } catch {
    return null;
  }
}

export { isEligibleIbeStudentProgramCode };

