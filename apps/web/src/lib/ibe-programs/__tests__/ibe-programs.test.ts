import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DbAcademicProgramRow } from "../../ite-programs/features";
import {
  IBE_STUDENT_PROGRAM_CODES,
  canIbeProgramAccessFeature,
  getAvailableSidebarToolsForIbeProgram,
  getFeaturesForIbeProgram,
  getHallOfFameCategoryForIbeProgram,
  getIbeWelcomeBannerPortalLabel,
  inspectIbeDatabasePrograms,
  isEligibleIbeStudentProgramCode,
  resolveIbeStudentProgramFromRecord,
  validateIbeProgramSelectionAgainstDb,
} from "../features";
import {
  evaluateProfileDepartmentUpdate,
  executeOneTimeIbeProgramSelection,
  resolveAdminStudentDepartmentSync,
  resolveRegistrationDepartmentForInstitute,
  webGoogleLinkSchema,
  webStudentRegistrationSchema,
  type OneTimeIbeProgramSelectionStore,
} from "../registration";

const SAMPLE_DB_IBE_PROGRAMS: DbAcademicProgramRow[] = [
  {
    id: "prog-hrm",
    code: "BSBA HRM",
    name: "Bachelor of Science in Business Administration Major in Human Resource Management",
    isActive: true,
    instituteId: "inst-ibe",
  },
  {
    id: "prog-entrep",
    code: "BS ENTREP",
    name: "Bachelor of Science in Entrepreneurship",
    isActive: true,
    instituteId: "inst-ibe",
  },
];

describe("IBE Student Program Catalog & Database Validation", () => {
  it("inspects active IBE student programs from DB rows and confirms all 2 programs are present", () => {
    const inspection = inspectIbeDatabasePrograms(SAMPLE_DB_IBE_PROGRAMS);
    assert.equal(inspection.programs.length, 2);
    assert.deepEqual(
      inspection.programs.map((p) => p.code),
      ["BSBA HRM", "BS ENTREP"]
    );
    assert.deepEqual(inspection.missingCodes, []);
  });

  it("recognizes only BSBA HRM and BS ENTREP as valid IBE student program codes", () => {
    for (const code of IBE_STUDENT_PROGRAM_CODES) {
      assert.equal(isEligibleIbeStudentProgramCode(code), true);
    }
    assert.equal(isEligibleIbeStudentProgramCode("BTLEd ICT"), false);
    assert.equal(isEligibleIbeStudentProgramCode("BSIT"), false);
    assert.equal(isEligibleIbeStudentProgramCode(""), false);
    assert.equal(isEligibleIbeStudentProgramCode(null), false);
  });

  it("validates selected IBE program against active DB rows", () => {
    for (const code of IBE_STUDENT_PROGRAM_CODES) {
      const valid = validateIbeProgramSelectionAgainstDb(
        code,
        SAMPLE_DB_IBE_PROGRAMS
      );
      assert.equal(valid.ok, true);
      if (valid.ok) {
        assert.equal(valid.program.code, code);
      }
    }

    const missing = validateIbeProgramSelectionAgainstDb(
      undefined,
      SAMPLE_DB_IBE_PROGRAMS
    );
    assert.equal(missing.ok, false);

    const invalid = validateIbeProgramSelectionAgainstDb(
      "BSIT",
      SAMPLE_DB_IBE_PROGRAMS
    );
    assert.equal(invalid.ok, false);
  });
});

describe("IBE Registration Validation (POST /api/auth/register & Zod Schemas)", () => {
  it("accepts IBE signup with each of the 2 valid IBE programs and resolves User.department to the exact program code", async () => {
    for (const code of IBE_STUDENT_PROGRAM_CODES) {
      const res = await resolveRegistrationDepartmentForInstitute({
        instituteCode: "ibe",
        instituteId: "inst-ibe",
        rawProgram: code,
        loadItePrograms: async () => [],
        loadIbePrograms: async () => SAMPLE_DB_IBE_PROGRAMS,
      });

      assert.equal(res.ok, true);
      if (res.ok) {
        assert.equal(res.department, code);
      }
    }
  });

  it("allows missing program at the API level for IBE (mobile compatibility) while rejecting invalid or empty strings with 400", async () => {
    const missingAllowed = await resolveRegistrationDepartmentForInstitute({
      instituteCode: "ibe",
      instituteId: "inst-ibe",
      rawProgram: undefined,
      loadItePrograms: async () => [],
      loadIbePrograms: async () => SAMPLE_DB_IBE_PROGRAMS,
    });
    assert.deepEqual(missingAllowed, { ok: true, department: undefined });

    for (const badInput of [null, "", "   ", "BSIT", "BTLEd ICT"]) {
      const res = await resolveRegistrationDepartmentForInstitute({
        instituteCode: "ibe",
        instituteId: "inst-ibe",
        rawProgram: badInput,
        loadItePrograms: async () => [],
        loadIbePrograms: async () => SAMPLE_DB_IBE_PROGRAMS,
      });

      assert.equal(res.ok, false);
      if (!res.ok) {
        assert.equal(res.status, 400);
        assert.ok(res.message.length > 0);
      }
    }

    // Web registration schema requires program when instituteCode === "ibe"
    const webSchemaMissingIbe = webStudentRegistrationSchema.safeParse({
      name: "Juan Dela Cruz",
      studentNumber: "24-00123",
      email: "juan@cdm.edu.ph",
      password: "Password123",
      confirmPassword: "Password123",
      instituteCode: "ibe",
      acceptedPolicies: true,
    });
    assert.equal(webSchemaMissingIbe.success, false);

    const webSchemaInvalidIbe = webStudentRegistrationSchema.safeParse({
      name: "Juan Dela Cruz",
      studentNumber: "24-00123",
      email: "juan@cdm.edu.ph",
      password: "Password123",
      confirmPassword: "Password123",
      instituteCode: "ibe",
      program: "BTLEd ICT",
      acceptedPolicies: true,
    });
    assert.equal(webSchemaInvalidIbe.success, false);

    const webSchemaValidIbe = webStudentRegistrationSchema.safeParse({
      name: "Juan Dela Cruz",
      studentNumber: "24-00123",
      email: "juan@cdm.edu.ph",
      password: "Password123",
      confirmPassword: "Password123",
      instituteCode: "ibe",
      program: "BSBA HRM",
      acceptedPolicies: true,
    });
    assert.equal(webSchemaValidIbe.success, true);

    // Web Google link schema requires program when instituteCode === "ibe"
    const webGoogleMissingIbe = webGoogleLinkSchema.safeParse({
      email: "juan@cdm.edu.ph",
      password: "Password123",
      instituteCode: "ibe",
      acceptedPolicies: true,
    });
    assert.equal(webGoogleMissingIbe.success, false);

    const webGoogleValidIbe = webGoogleLinkSchema.safeParse({
      email: "juan@cdm.edu.ph",
      password: "Password123",
      instituteCode: "ibe",
      program: "BS ENTREP",
      acceptedPolicies: true,
    });
    assert.equal(webGoogleValidIbe.success, true);
  });
});

describe("IBE Program Resolution Order", () => {
  it("resolves active ProgramMembership first, then User.department, then approved Enrollment", () => {
    // 1. Active ProgramMembership takes priority over User.department and Enrollment
    const fromMembership = resolveIbeStudentProgramFromRecord({
      department: "BS ENTREP",
      section: null,
      programMemberships: [
        {
          isActive: true,
          kind: "STUDENT",
          program: {
            code: "BSBA HRM",
            name: "Bachelor of Science in Business Administration Major in Human Resource Management",
          },
        },
      ],
      enrollments: [
        {
          status: "APPROVED",
          course: {
            program: {
              code: "BS ENTREP",
              name: "Bachelor of Science in Entrepreneurship",
            },
          },
        },
      ],
    });
    assert.notEqual(fromMembership, null);
    assert.equal(fromMembership?.programCode, "BSBA HRM");
    assert.equal(fromMembership?.source, "membership");

    // 2. User.department takes priority when there is no active ProgramMembership
    const fromDepartment = resolveIbeStudentProgramFromRecord({
      department: "BS ENTREP",
      section: null,
      programMemberships: [],
      enrollments: [
        {
          status: "APPROVED",
          course: {
            program: {
              code: "BSBA HRM",
              name: "Bachelor of Science in Business Administration Major in Human Resource Management",
            },
          },
        },
      ],
    });
    assert.notEqual(fromDepartment, null);
    assert.equal(fromDepartment?.programCode, "BS ENTREP");
    assert.equal(fromDepartment?.source, "department");

    // 3. Approved Enrollment is used when neither ProgramMembership nor User.department has a recognizable program
    const fromEnrollment = resolveIbeStudentProgramFromRecord({
      department: null,
      section: null,
      programMemberships: [],
      enrollments: [
        {
          status: "APPROVED",
          course: {
            program: {
              code: "BSBA HRM",
              name: "Bachelor of Science in Business Administration Major in Human Resource Management",
            },
          },
        },
      ],
    });
    assert.notEqual(fromEnrollment, null);
    assert.equal(fromEnrollment?.programCode, "BSBA HRM");
    assert.equal(fromEnrollment?.source, "enrollment");

    // 4. Returns null when none match any of the 2 IBE student programs
    const noneResolved = resolveIbeStudentProgramFromRecord({
      department: "Business",
      section: null,
      programMemberships: [],
      enrollments: [],
    });
    assert.equal(noneResolved, null);
  });
});

describe("Admin Student Update Department Sync & Profile Lock for IBE", () => {
  it("syncs User.department when the student belongs to IBE and the program is BSBA HRM or BS ENTREP", () => {
    for (const code of IBE_STUDENT_PROGRAM_CODES) {
      assert.deepEqual(
        resolveAdminStudentDepartmentSync({
          studentInstituteCode: "ibe",
          programCode: code,
        }),
        { department: code }
      );
    }
  });

  it("locks department on PUT /api/profile for IBE students who already have a recognizable program", () => {
    const lockedAttempt = evaluateProfileDepartmentUpdate({
      instituteCode: "ibe",
      userRole: "STUDENT",
      currentRecord: {
        department: "BSBA HRM",
        programMemberships: [],
        enrollments: [],
      },
      requestedDepartment: "BS ENTREP",
    });
    assert.equal(lockedAttempt.allowed, false);
    assert.equal(lockedAttempt.status, 403);

    const unchangedAttempt = evaluateProfileDepartmentUpdate({
      instituteCode: "ibe",
      userRole: "STUDENT",
      currentRecord: {
        department: "BS ENTREP",
        programMemberships: [],
        enrollments: [],
      },
      requestedDepartment: "BS ENTREP",
    });
    assert.equal(unchangedAttempt.allowed, true);
  });

  it("succeeds once for an IBE student with no program and returns 409 on a second or parallel call", async () => {
    const storedUser: {
      id: string;
      role: string;
      department: string | null;
      section: string | null;
      institute: { id: string; code: string };
      hasActiveMembership: boolean;
    } = {
      id: "stu-ibe-1",
      role: "STUDENT",
      department: null,
      section: null,
      institute: { id: "inst-ibe", code: "ibe" },
      hasActiveMembership: false,
    };

    const store: OneTimeIbeProgramSelectionStore = {
      findStudentRecord: async (userId: string) => {
        if (userId !== storedUser.id) return null;
        return {
          id: storedUser.id,
          role: storedUser.role,
          department: storedUser.department,
          section: storedUser.section,
          institute: storedUser.institute,
          programMemberships: storedUser.hasActiveMembership
            ? [
                {
                  isActive: true,
                  kind: "STUDENT",
                  program: {
                    code: storedUser.department ?? "BSBA HRM",
                    name: "Bachelor of Science in Business Administration Major in Human Resource Management",
                  },
                },
              ]
            : [],
          enrollments: [],
        };
      },
      loadIbePrograms: async () => SAMPLE_DB_IBE_PROGRAMS,
      conditionalSetDepartment: async (params) => {
        if (
          storedUser.id === params.userId &&
          (storedUser.department ?? "") === params.expectedCurrentDepartment &&
          !storedUser.hasActiveMembership
        ) {
          storedUser.department = params.newProgramCode;
          return 1;
        }
        return 0;
      },
    };

    const first = await executeOneTimeIbeProgramSelection({
      userId: "stu-ibe-1",
      rawProgram: "BSBA HRM",
      store,
    });
    assert.equal(first.ok, true);
    if (first.ok) {
      assert.equal(first.programCode, "BSBA HRM");
    }

    const second = await executeOneTimeIbeProgramSelection({
      userId: "stu-ibe-1",
      rawProgram: "BS ENTREP",
      store,
    });
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.status, 409);
    }
  });
});

describe("IBE Program Feature Matrix, Hall of Fame Category Lock & Portal Label", () => {
  it("scopes BSBA HRM strictly to Mock Interview, WordWise, Hall of Fame (HR_LEADER), and Learning Hub", () => {
    assert.equal(canIbeProgramAccessFeature("BSBA HRM", "mock-interview"), true);
    assert.equal(canIbeProgramAccessFeature("BSBA HRM", "wordwise"), true);
    assert.equal(canIbeProgramAccessFeature("BSBA HRM", "hall-of-fame"), true);
    assert.equal(canIbeProgramAccessFeature("BSBA HRM", "learning-hub"), true);
    assert.equal(canIbeProgramAccessFeature("BSBA HRM", "financial-statements"), false);
    assert.equal(canIbeProgramAccessFeature("BSBA HRM", "business-plan"), false);

    assert.equal(getHallOfFameCategoryForIbeProgram("BSBA HRM"), "HR_LEADER");
    assert.deepEqual(
      getFeaturesForIbeProgram("BSBA HRM").map((f) => f.id),
      ["mock-interview", "wordwise", "hall-of-fame", "learning-hub"]
    );
    assert.deepEqual(
      getAvailableSidebarToolsForIbeProgram("BSBA HRM").map((f) => f.id),
      ["mock-interview", "wordwise", "hall-of-fame", "learning-hub"]
    );
    assert.equal(
      getIbeWelcomeBannerPortalLabel("ibe", "IBE", false, "BSBA HRM"),
      "IBE • BSBA HRM"
    );
  });

  it("scopes BS ENTREP strictly to Financial Statements, Business Plan Guide, Hall of Fame (ENTREPRENEUR), and Learning Hub", () => {
    assert.equal(canIbeProgramAccessFeature("BS ENTREP", "financial-statements"), true);
    assert.equal(canIbeProgramAccessFeature("BS ENTREP", "business-plan"), true);
    assert.equal(canIbeProgramAccessFeature("BS ENTREP", "hall-of-fame"), true);
    assert.equal(canIbeProgramAccessFeature("BS ENTREP", "learning-hub"), true);
    assert.equal(canIbeProgramAccessFeature("BS ENTREP", "mock-interview"), false);
    assert.equal(canIbeProgramAccessFeature("BS ENTREP", "wordwise"), false);

    assert.equal(getHallOfFameCategoryForIbeProgram("BS ENTREP"), "ENTREPRENEUR");
    assert.deepEqual(
      getFeaturesForIbeProgram("BS ENTREP").map((f) => f.id),
      ["financial-statements", "business-plan", "hall-of-fame", "learning-hub"]
    );
    assert.deepEqual(
      getAvailableSidebarToolsForIbeProgram("BS ENTREP").map((f) => f.id),
      ["financial-statements", "business-plan", "hall-of-fame", "learning-hub"]
    );
    assert.equal(
      getIbeWelcomeBannerPortalLabel("ibe", "IBE", false, "BS ENTREP"),
      "IBE • BS ENTREP"
    );
  });

  it("denies all 6 IBE program-specific features when student program is unassigned (null)", () => {
    assert.equal(canIbeProgramAccessFeature(null, "mock-interview"), false);
    assert.equal(canIbeProgramAccessFeature(null, "wordwise"), false);
    assert.equal(canIbeProgramAccessFeature(null, "financial-statements"), false);
    assert.equal(canIbeProgramAccessFeature(null, "business-plan"), false);
    assert.equal(canIbeProgramAccessFeature(null, "hall-of-fame"), false);
    assert.equal(canIbeProgramAccessFeature(null, "learning-hub"), false);
    assert.equal(getHallOfFameCategoryForIbeProgram(null), null);
    assert.deepEqual(getFeaturesForIbeProgram(null), []);
    assert.equal(
      getIbeWelcomeBannerPortalLabel("ibe", "IBE", false, null),
      "IBE · Portal"
    );
  });
});
