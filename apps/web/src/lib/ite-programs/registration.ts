import {
  ITE_STUDENT_PROGRAM_CODES,
  isEligibleIteStudentProgramCode,
  resolveIteStudentProgramFromRecord,
  validateIteProgramSelectionAgainstDb,
  type DbAcademicProgramRow,
  type IteStudentProgramCode,
  type ResolvedIteStudentProgram,
  type StudentProgramRecordInput,
} from "./features";

export interface ResolveRegistrationProgramInput {
  instituteCode: string;
  instituteId: string;
  rawProgram: unknown;
  loadItePrograms: (instituteId: string) => Promise<DbAcademicProgramRow[]>;
}

/**
 * Validates `program` on `POST /api/auth/register`:
 * - For non-ITE institutes (`ics`, `ibe`), ignores `program` and returns `{ ok: true, department: undefined }`.
 * - For `ite`:
 *   - If `rawProgram === undefined`, returns `{ ok: true, department: undefined }` (mobile signup compatibility).
 *   - Otherwise validates `rawProgram` against the 4 eligible ITE `AcademicProgram` rows
 *     for the ITE institute and returns `{ ok: true, department: <AcademicProgram.code> }` to store in `User.department`.
 *   - Returns `{ ok: false, status: 400, message }` if `rawProgram` is empty, not one of the 4 ITE student programs,
 *     or missing in the database.
 */
export async function resolveRegistrationDepartmentForInstitute(
  input: ResolveRegistrationProgramInput
): Promise<
  | { ok: true; department: IteStudentProgramCode | undefined }
  | { ok: false; status: 400; message: string }
> {
  const normalizedInstitute = input.instituteCode.trim().toLowerCase();
  if (normalizedInstitute !== "ite") {
    return { ok: true, department: undefined };
  }

  // Option A (Mobile compatibility): when `program` is omitted altogether, allow signup without setting department.
  if (input.rawProgram === undefined) {
    return { ok: true, department: undefined };
  }

  const dbPrograms = await input.loadItePrograms(input.instituteId);
  const validation = validateIteProgramSelectionAgainstDb(
    input.rawProgram,
    dbPrograms
  );
  if (!validation.ok) {
    return { ok: false, status: 400, message: validation.error };
  }

  return { ok: true, department: validation.program.code };
}

/**
 * Computes the `department` field sync for `PATCH /api/admin/users/[userId]`:
 * - Runs ONLY when the target student belongs to the ITE institute (`studentInstituteCode === "ite"`)
 *   AND the chosen program is one of the 4 eligible ITE student program codes
 *   (`"BECEd"`, `"BEEd"`, `"BTLEd ICT"`, `"BSEd SCIENCE"`).
 * - For ICS, IBE, or any non-ITE student program code (such as `"GENERAL EDUCATION"`),
 *   returns `{}` so student updates behave identically to before this branch.
 */
export function resolveAdminStudentDepartmentSync(params: {
  studentInstituteCode: string | null | undefined;
  programCode: string | null | undefined;
}): { department?: IteStudentProgramCode } {
  if (
    !params.studentInstituteCode ||
    params.studentInstituteCode.trim().toLowerCase() !== "ite"
  ) {
    return {};
  }
  const trimmedCode = params.programCode?.trim();
  if (!isEligibleIteStudentProgramCode(trimmedCode)) {
    return {};
  }
  return { department: trimmedCode };
}

/**
 * Enforces the server-side lock on `User.department` in `PUT /api/profile`:
 * - ICS and IBE users (all roles), and ITE instructors/admins, are completely unaffected
 *   and return `{ allowed: true, departmentToPersist: requestedDepartment }`.
 * - Only ITE `STUDENT`s who already have a recognizable program (from active `ProgramMembership`,
 *   `User.department`, or approved `Enrollment`) are locked against changing `department`.
 * - ITE `STUDENT`s without a recognizable program yet are not blocked here.
 */
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

  const isIte = instituteCode.trim().toLowerCase() === "ite";
  const isStudent = userRole.trim().toUpperCase() === "STUDENT";

  if (!isIte || !isStudent) {
    return { allowed: true, departmentToPersist: requestedDepartment };
  }

  const resolved = resolveIteStudentProgramFromRecord(currentRecord);
  if (!resolved) {
    return { allowed: true, departmentToPersist: requestedDepartment };
  }

  const currentDept = (currentRecord.department ?? "").trim();
  const nextDept = requestedDepartment.trim();

  // Allow no-op when the profile form sends back the existing department unchanged
  if (nextDept === currentDept || nextDept === resolved.programCode) {
    return { allowed: true, departmentToPersist: undefined };
  }

  return {
    allowed: false,
    status: 403,
    message:
      "Your ITE academic program is locked after selection and can only be changed by an administrator.",
    departmentToPersist: undefined,
  };
}

export interface OneTimeProgramSelectionStore {
  findStudentRecord: (userId: string) => Promise<
    | (StudentProgramRecordInput & {
        id: string;
        role: string;
        institute: { id: string; code: string };
      })
    | null
  >;
  loadItePrograms: (instituteId: string) => Promise<DbAcademicProgramRow[]>;
  conditionalSetDepartment: (params: {
    userId: string;
    instituteId: string;
    expectedCurrentDepartment: string;
    newProgramCode: IteStudentProgramCode;
  }) => Promise<number>;
}

/**
 * Executes the one-time "Choose your program" selection for an existing ITE student:
 * - Only works for an authenticated ITE `STUDENT`.
 * - Validates `rawProgram` against the 4 ITE `AcademicProgram` rows in the database.
 * - Rejects with `409 Conflict` if the student already has a recognizable program
 *   (from active `ProgramMembership`, `User.department`, or approved `Enrollment`).
 * - Uses an atomic conditional update (`updateMany` matching the previous unassigned `department`
 *   and `programMemberships: { none: { isActive: true, kind: "STUDENT" } }`) so two parallel
 *   requests cannot both succeed.
 */
export async function executeOneTimeIteProgramSelection(params: {
  userId: string;
  rawProgram: unknown;
  store: OneTimeProgramSelectionStore;
}): Promise<
  | {
      ok: true;
      status: 200;
      programCode: IteStudentProgramCode;
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
    student.institute.code.trim().toLowerCase() !== "ite" ||
    student.role.trim().toUpperCase() !== "STUDENT"
  ) {
    return {
      ok: false,
      status: 403,
      message: "Only ITE students can select an ITE academic program.",
    };
  }

  const existingProgram = resolveIteStudentProgramFromRecord(student);
  if (existingProgram) {
    return {
      ok: false,
      status: 409,
      message: `Your academic program (${existingProgram.programCode}) has already been set and is locked.`,
    };
  }

  const dbPrograms = await store.loadItePrograms(student.institute.id);
  const validation = validateIteProgramSelectionAgainstDb(
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

export async function loadActiveIteStudentProgramsFromDb(
  instituteId?: string
): Promise<DbAcademicProgramRow[]> {
  const { db } = await import("@/lib/db");
  return db.academicProgram.findMany({
    where: {
      ...(instituteId ? { instituteId } : { institute: { code: "ite" } }),
      isActive: true,
      code: { in: [...ITE_STUDENT_PROGRAM_CODES] },
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
 * Server helper to resolve an ITE student's program from PostgreSQL by user ID.
 */
export async function resolveIteStudentProgram(
  userId: string
): Promise<ResolvedIteStudentProgram | null> {
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
    return resolveIteStudentProgramFromRecord(user);
  } catch {
    return null;
  }
}
