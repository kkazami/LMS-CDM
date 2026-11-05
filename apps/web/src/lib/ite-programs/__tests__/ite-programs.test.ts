import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ITE_STUDENT_PROGRAM_CODES,
  getAvailableSidebarToolsForIteProgram,
  getFeaturesForIteProgram,
  resolveIteStudentProgramFromRecord,
  validateIteProgramSelectionAgainstDb,
  type DbAcademicProgramRow,
} from "../features";
import {
  evaluateProfileDepartmentUpdate,
  executeOneTimeIteProgramSelection,
  resolveAdminStudentDepartmentSync,
  resolveRegistrationDepartmentForInstitute,
  type OneTimeProgramSelectionStore,
} from "../registration";
import {
  studentRegistrationSchema,
  webGoogleLinkSchema,
  webStudentRegistrationSchema,
} from "../../auth-schema";

const SAMPLE_DB_ITE_PROGRAMS: DbAcademicProgramRow[] = [
  {
    id: "prog-beced",
    code: "BECEd",
    name: "Bachelor of Early Childhood Education",
    isActive: true,
    instituteId: "inst-ite",
  },
  {
    id: "prog-beed",
    code: "BEEd",
    name: "Bachelor of Elementary Education",
    isActive: true,
    instituteId: "inst-ite",
  },
  {
    id: "prog-btled",
    code: "BTLEd ICT",
    name: "Bachelor of Technology and Livelihood Education Major in ICT",
    isActive: true,
    instituteId: "inst-ite",
  },
  {
    id: "prog-bsed-sci",
    code: "BSEd SCIENCE",
    name: "Bachelor of Secondary Education Major in Science",
    isActive: true,
    instituteId: "inst-ite",
  },
  {
    id: "prog-gen-ed",
    code: "GENERAL EDUCATION",
    name: "General Education",
    isActive: true,
    instituteId: "inst-ite",
  },
];

describe("ITE Program Selection - Registration & Validation", () => {
  it("ITE signup with each valid program sets User.department to the exact AcademicProgram.code", async () => {
    for (const code of ITE_STUDENT_PROGRAM_CODES) {
      const res = await resolveRegistrationDepartmentForInstitute({
        instituteCode: "ite",
        instituteId: "inst-ite",
        rawProgram: code,
        loadItePrograms: async () => SAMPLE_DB_ITE_PROGRAMS,
      });
      assert.equal(res.ok, true);
      if (res.ok) {
        assert.equal(res.department, code);
      }
    }
  });

  it("ITE signup with an invalid program, GENERAL EDUCATION, or non-ITE program returns 400", async () => {
    for (const invalidProgram of ["GENERAL EDUCATION", "BSIT", "BSBA HRM", "UNKNOWN", "   "]) {
      const res = await resolveRegistrationDepartmentForInstitute({
        instituteCode: "ite",
        instituteId: "inst-ite",
        rawProgram: invalidProgram,
        loadItePrograms: async () => SAMPLE_DB_ITE_PROGRAMS,
      });
      assert.equal(res.ok, false, `Expected 400 for program=${invalidProgram}`);
      if (!res.ok) {
        assert.equal(res.status, 400);
      }
    }

    const dbValidationGenEd = validateIteProgramSelectionAgainstDb(
      "GENERAL EDUCATION",
      SAMPLE_DB_ITE_PROGRAMS
    );
    assert.equal(dbValidationGenEd.ok, false);
  });

  it("allows missing program at the API level for ITE (mobile signup compatibility) while requiring it in web form schemas", async () => {
    // API helper: missing program for ITE -> allowed with department: undefined
    const apiMissingProgram = await resolveRegistrationDepartmentForInstitute({
      instituteCode: "ite",
      instituteId: "inst-ite",
      rawProgram: undefined,
      loadItePrograms: async () => SAMPLE_DB_ITE_PROGRAMS,
    });
    assert.deepEqual(apiMissingProgram, { ok: true, department: undefined });

    // Shared API schema allows omitting program for ITE (mobile compatibility)
    const apiSchemaResult = studentRegistrationSchema.safeParse({
      name: "Juan Dela Cruz",
      studentNumber: "24-00123",
      email: "juan@cdm.edu.ph",
      password: "Password123",
      confirmPassword: "Password123",
      instituteCode: "ite",
      acceptedPolicies: true,
    });
    assert.equal(apiSchemaResult.success, true);

    // Web registration schema requires program when instituteCode === "ite"
    const webSchemaMissingIte = webStudentRegistrationSchema.safeParse({
      name: "Juan Dela Cruz",
      studentNumber: "24-00123",
      email: "juan@cdm.edu.ph",
      password: "Password123",
      confirmPassword: "Password123",
      instituteCode: "ite",
      acceptedPolicies: true,
    });
    assert.equal(webSchemaMissingIte.success, false);

    const webSchemaValidIte = webStudentRegistrationSchema.safeParse({
      name: "Juan Dela Cruz",
      studentNumber: "24-00123",
      email: "juan@cdm.edu.ph",
      password: "Password123",
      confirmPassword: "Password123",
      instituteCode: "ite",
      program: "BTLEd ICT",
      acceptedPolicies: true,
    });
    assert.equal(webSchemaValidIte.success, true);

    // Web Google link schema requires program when instituteCode === "ite"
    const webGoogleMissingIte = webGoogleLinkSchema.safeParse({
      email: "juan@cdm.edu.ph",
      password: "Password123",
      instituteCode: "ite",
      acceptedPolicies: true,
    });
    assert.equal(webGoogleMissingIte.success, false);

    const webGoogleValidIte = webGoogleLinkSchema.safeParse({
      email: "juan@cdm.edu.ph",
      password: "Password123",
      instituteCode: "ite",
      program: "BECEd",
      acceptedPolicies: true,
    });
    assert.equal(webGoogleValidIte.success, true);
  });

  it("leaves ICS and IBE signups completely unaffected (does not require program and ignores it if sent)", async () => {
    for (const inst of ["ics", "ibe"] as const) {
      const resNoProgram = await resolveRegistrationDepartmentForInstitute({
        instituteCode: inst,
        instituteId: `inst-${inst}`,
        rawProgram: undefined,
        loadItePrograms: async () => SAMPLE_DB_ITE_PROGRAMS,
      });
      assert.deepEqual(resNoProgram, { ok: true, department: undefined });

      const resWithProgram = await resolveRegistrationDepartmentForInstitute({
        instituteCode: inst,
        instituteId: `inst-${inst}`,
        rawProgram: "BTLEd ICT",
        loadItePrograms: async () => SAMPLE_DB_ITE_PROGRAMS,
      });
      assert.deepEqual(resWithProgram, { ok: true, department: undefined });

      const webSchemaNonIte = webStudentRegistrationSchema.safeParse({
        name: "Maria Santos",
        studentNumber: "24-00456",
        email: "maria@cdm.edu.ph",
        password: "Password123",
        confirmPassword: "Password123",
        instituteCode: inst,
        acceptedPolicies: true,
      });
      assert.equal(webSchemaNonIte.success, true);
    }
  });
});

describe("ITE Program Resolution Order", () => {
  it("resolves active ProgramMembership first, then User.department, then approved Enrollment", () => {
    // 1. Active ProgramMembership takes priority over User.department and Enrollment
    const fromMembership = resolveIteStudentProgramFromRecord({
      department: "BEEd",
      section: null,
      programMemberships: [
        {
          isActive: true,
          kind: "STUDENT",
          program: {
            code: "BTLEd ICT",
            name: "Bachelor of Technology and Livelihood Education Major in ICT",
          },
        },
      ],
      enrollments: [
        {
          status: "APPROVED",
          course: {
            program: {
              code: "BECEd",
              name: "Bachelor of Early Childhood Education",
            },
          },
        },
      ],
    });
    assert.notEqual(fromMembership, null);
    assert.equal(fromMembership?.programCode, "BTLEd ICT");
    assert.equal(fromMembership?.source, "membership");

    // 2. User.department takes priority when there is no active ProgramMembership
    const fromDepartment = resolveIteStudentProgramFromRecord({
      department: "BSEd SCIENCE",
      section: null,
      programMemberships: [],
      enrollments: [
        {
          status: "APPROVED",
          course: {
            program: {
              code: "BECEd",
              name: "Bachelor of Early Childhood Education",
            },
          },
        },
      ],
    });
    assert.notEqual(fromDepartment, null);
    assert.equal(fromDepartment?.programCode, "BSEd SCIENCE");
    assert.equal(fromDepartment?.source, "department");

    // 3. Approved Enrollment is used when neither ProgramMembership nor User.department has a recognizable program
    const fromEnrollment = resolveIteStudentProgramFromRecord({
      department: null,
      section: null,
      programMemberships: [],
      enrollments: [
        {
          status: "APPROVED",
          course: {
            program: {
              code: "BECEd",
              name: "Bachelor of Early Childhood Education",
            },
          },
        },
      ],
    });
    assert.notEqual(fromEnrollment, null);
    assert.equal(fromEnrollment?.programCode, "BECEd");
    assert.equal(fromEnrollment?.source, "enrollment");

    // 4. Returns null when none match any of the 4 ITE student programs
    const noneResolved = resolveIteStudentProgramFromRecord({
      department: "GENERAL EDUCATION",
      section: null,
      programMemberships: [],
      enrollments: [],
    });
    assert.equal(noneResolved, null);
  });
});

describe("Admin Student Update Department Sync (PATCH /api/admin/users/[userId])", () => {
  it("syncs User.department ONLY when the student belongs to ITE AND the program is one of the 4 ITE codes", () => {
    for (const code of ITE_STUDENT_PROGRAM_CODES) {
      assert.deepEqual(
        resolveAdminStudentDepartmentSync({
          studentInstituteCode: "ite",
          programCode: code,
        }),
        { department: code }
      );
    }

    // ITE student with non-student program code (GENERAL EDUCATION) -> no department sync
    assert.deepEqual(
      resolveAdminStudentDepartmentSync({
        studentInstituteCode: "ite",
        programCode: "GENERAL EDUCATION",
      }),
      {}
    );
  });

  it("leaves ICS and IBE student updates completely untouched (returns empty object)", () => {
    assert.deepEqual(
      resolveAdminStudentDepartmentSync({
        studentInstituteCode: "ics",
        programCode: "BSIT",
      }),
      {}
    );
    assert.deepEqual(
      resolveAdminStudentDepartmentSync({
        studentInstituteCode: "ics",
        programCode: "BSCpE",
      }),
      {}
    );
    assert.deepEqual(
      resolveAdminStudentDepartmentSync({
        studentInstituteCode: "ibe",
        programCode: "BSBA HRM",
      }),
      {}
    );
    // Even if an ITE program code were passed for a non-ITE student, it must not sync
    assert.deepEqual(
      resolveAdminStudentDepartmentSync({
        studentInstituteCode: "ics",
        programCode: "BTLEd ICT",
      }),
      {}
    );
    assert.deepEqual(
      resolveAdminStudentDepartmentSync({
        studentInstituteCode: "ibe",
        programCode: "BECEd",
      }),
      {}
    );
  });
});

describe("Profile Department Locking & One-Time Program Selection", () => {
  it("locks department on PUT /api/profile ONLY for ITE students who already have a recognizable program", () => {
    // ITE student with existing program attempting to change department -> 403
    const lockedAttempt = evaluateProfileDepartmentUpdate({
      instituteCode: "ite",
      userRole: "STUDENT",
      currentRecord: {
        department: "BTLEd ICT",
        programMemberships: [],
        enrollments: [],
      },
      requestedDepartment: "BECEd",
    });
    assert.equal(lockedAttempt.allowed, false);
    assert.equal(lockedAttempt.status, 403);

    // ITE student with existing program via active ProgramMembership attempting to change department -> 403
    const lockedViaMembership = evaluateProfileDepartmentUpdate({
      instituteCode: "ite",
      userRole: "STUDENT",
      currentRecord: {
        department: null,
        programMemberships: [
          {
            isActive: true,
            kind: "STUDENT",
            program: { code: "BEEd", name: "Bachelor of Elementary Education" },
          },
        ],
        enrollments: [],
      },
      requestedDepartment: "BECEd",
    });
    assert.equal(lockedViaMembership.allowed, false);
    assert.equal(lockedViaMembership.status, 403);

    // Sending the exact same department back on profile save -> allowed
    const unchangedAttempt = evaluateProfileDepartmentUpdate({
      instituteCode: "ite",
      userRole: "STUDENT",
      currentRecord: {
        department: "BTLEd ICT",
        programMemberships: [],
        enrollments: [],
      },
      requestedDepartment: "BTLEd ICT",
    });
    assert.equal(unchangedAttempt.allowed, true);

    // ITE student who does NOT yet have a recognizable program -> not blocked
    const unassignedIteStudent = evaluateProfileDepartmentUpdate({
      instituteCode: "ite",
      userRole: "STUDENT",
      currentRecord: {
        department: null,
        programMemberships: [],
        enrollments: [],
      },
      requestedDepartment: "Education",
    });
    assert.deepEqual(unassignedIteStudent, {
      allowed: true,
      departmentToPersist: "Education",
    });
  });

  it("leaves ICS and IBE users (all roles) and ITE instructors/admins completely unaffected on PUT /api/profile", () => {
    for (const instituteCode of ["ics", "ibe"] as const) {
      for (const userRole of ["STUDENT", "PROFESSOR", "TEACHER", "ADMIN"] as const) {
        const res = evaluateProfileDepartmentUpdate({
          instituteCode,
          userRole,
          currentRecord: {
            department: "BSIT",
            programMemberships: [
              {
                isActive: true,
                kind: "STUDENT",
                program: { code: "BTLEd ICT", name: "BTLEd ICT" },
              },
            ],
            enrollments: [],
          },
          requestedDepartment: "Updated Department",
        });
        assert.deepEqual(res, {
          allowed: true,
          departmentToPersist: "Updated Department",
        });
      }
    }

    for (const iteNonStudentRole of ["PROFESSOR", "TEACHER", "ADMIN"] as const) {
      const res = evaluateProfileDepartmentUpdate({
        instituteCode: "ite",
        userRole: iteNonStudentRole,
        currentRecord: {
          department: "BTLEd ICT",
          programMemberships: [],
          enrollments: [],
        },
        requestedDepartment: "Teacher Education Faculty",
      });
      assert.deepEqual(res, {
        allowed: true,
        departmentToPersist: "Teacher Education Faculty",
      });
    }
  });

  it("succeeds once for an ITE student with no program and returns 409 on a second or parallel call", async () => {
    // Simulate in-memory user record with atomic conditional update
    const storedUser: {
      id: string;
      role: string;
      department: string | null;
      section: string | null;
      institute: { id: string; code: string };
      hasActiveMembership: boolean;
      enrolledPrograms: string[];
    } = {
      id: "stu-ite-1",
      role: "STUDENT",
      department: null,
      section: null,
      institute: { id: "inst-ite", code: "ite" },
      hasActiveMembership: false,
      enrolledPrograms: [],
    };

    const store: OneTimeProgramSelectionStore = {
      findStudentRecord: async (userId) => {
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
                  program: { code: "BECEd", name: "Bachelor of Early Childhood Education" },
                },
              ]
            : [],
          enrollments: storedUser.enrolledPrograms.map((code) => ({
            status: "APPROVED",
            course: {
              program: { code, name: code },
            },
          })),
        };
      },
      loadItePrograms: async () => SAMPLE_DB_ITE_PROGRAMS,
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

    // Two parallel requests for a student with no program: only the first conditional update wins
    const [firstResult, secondParallelResult] = await Promise.all([
      executeOneTimeIteProgramSelection({
        userId: "stu-ite-1",
        rawProgram: "BTLEd ICT",
        store,
      }),
      executeOneTimeIteProgramSelection({
        userId: "stu-ite-1",
        rawProgram: "BEEd",
        store,
      }),
    ]);

    assert.equal(firstResult.ok, true);
    if (firstResult.ok) {
      assert.equal(firstResult.programCode, "BTLEd ICT");
    }
    assert.equal(secondParallelResult.ok, false);
    if (!secondParallelResult.ok) {
      assert.equal(secondParallelResult.status, 409);
    }
    assert.equal(storedUser.department, "BTLEd ICT");

    // Subsequent sequential call also returns 409 Conflict
    const thirdResult = await executeOneTimeIteProgramSelection({
      userId: "stu-ite-1",
      rawProgram: "BECEd",
      store,
    });
    assert.equal(thirdResult.ok, false);
    if (!thirdResult.ok) {
      assert.equal(thirdResult.status, 409);
    }
  });
});

describe("ITE Program Features & Sidebar Filtering", () => {
  it("returns only each program's features and exposes ICT Lab in sidebar tools only for BTLEd ICT", () => {
    const becedFeatures = getFeaturesForIteProgram("BECEd");
    assert.deepEqual(
      becedFeatures.map((f) => f.title),
      ["Nursery Songs & YouTube Categories", "Lesson Plan Models"]
    );
    assert.ok(becedFeatures.every((f) => f.status === "coming-soon"));
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BECEd"), []);

    const beedFeatures = getFeaturesForIteProgram("BEEd");
    assert.deepEqual(
      beedFeatures.map((f) => f.title),
      ["MATATAG Curriculum Guide", "Lesson Plan Models"]
    );
    assert.ok(beedFeatures.every((f) => f.status === "coming-soon"));
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BEEd"), []);

    const bsedSciFeatures = getFeaturesForIteProgram("BSEd SCIENCE");
    assert.deepEqual(
      bsedSciFeatures.map((f) => f.title),
      ["Interactive Educational Charts", "Lesson Plan Models"]
    );
    assert.ok(bsedSciFeatures.every((f) => f.status === "coming-soon"));
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BSEd SCIENCE"), []);

    const btledFeatures = getFeaturesForIteProgram("BTLEd ICT");
    assert.deepEqual(
      btledFeatures.map((f) => f.title),
      ["ICT Lab", "Lesson Plan Models"]
    );
    const ictLabFeature = btledFeatures.find((f) => f.id === "ict-lab");
    assert.equal(ictLabFeature?.status, "available");
    assert.equal(ictLabFeature?.href, "/ite/ict-lab");

    const btledSidebarTools = getAvailableSidebarToolsForIteProgram("BTLEd ICT");
    assert.deepEqual(btledSidebarTools, [
      {
        id: "ict-lab",
        title: "ICT Lab",
        description: "Code Playground, Hardware Explorer, LAN Cable Guide",
        href: "/ite/ict-lab",
      },
    ]);

    assert.deepEqual(getFeaturesForIteProgram(null), []);
    assert.deepEqual(getAvailableSidebarToolsForIteProgram(null), []);
  });
});
