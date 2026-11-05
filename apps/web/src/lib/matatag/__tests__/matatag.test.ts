import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAvailableSidebarToolsForIteProgram,
  getFeaturesForIteProgram,
} from "../../ite-programs/features";
import { MATATAG_DATA, getMatatagData, getMatatagDocuments } from "../data";
import {
  BEED_ALLOWED_COURSE_CODES,
  type CompetencyItem,
  type MatatagData,
  type MatatagDocument,
} from "../types";
import {
  FIXED_BEED_SUBJECT_ORDER,
  SELECTABLE_ELEMENTARY_GRADES,
  documentCoversGrade,
  filterGuides,
  formatSecondaryGradesNote,
  getGradeOptions,
  getSubjectOptions,
  isOfficialDepedUrl,
  searchCompetencies,
} from "../rules";
import { evaluateMatatagAccess } from "../guard";

describe("MATATAG Curriculum Reference Hub - Registry Integration", () => {
  it("shows the hub under the exact title 'MATATAG Curriculum Reference Hub' for BEEd only", () => {
    const beedFeatures = getFeaturesForIteProgram("BEEd");
    const hub = beedFeatures.find((f) => f.id === "matatag-curriculum-guide");
    assert.ok(hub, "Expected matatag-curriculum-guide in BEEd features");
    assert.equal(hub.title, "MATATAG Curriculum Reference Hub");
    assert.equal(hub.status, "available");
    assert.equal(hub.href, "/ite/matatag");
    assert.deepEqual(hub.programs, ["BEEd"]);

    // Must NOT appear in other ITE programs
    for (const prog of ["BECEd", "BTLEd ICT", "BSEd SCIENCE"] as const) {
      const features = getFeaturesForIteProgram(prog);
      const otherHub = features.find((f) => f.id === "matatag-curriculum-guide");
      assert.equal(
        otherHub,
        undefined,
        `MATATAG Hub must not be exposed to ${prog}`
      );
    }
  });

  it("exposes the hub in BEEd sidebar tools and excludes other programs", () => {
    const beedTools = getAvailableSidebarToolsForIteProgram("BEEd");
    const hubTool = beedTools.find((t) => t.id === "matatag-curriculum-guide");
    assert.ok(hubTool, "Expected MATATAG tool in BEEd sidebar tools");
    assert.equal(hubTool.title, "MATATAG Curriculum Reference Hub");
    assert.equal(hubTool.href, "/ite/matatag");

    for (const otherProg of ["BECEd", "BTLEd ICT", "BSEd SCIENCE"] as const) {
      const tools = getAvailableSidebarToolsForIteProgram(otherProg);
      assert.equal(
        tools.some((t) => t.id === "matatag-curriculum-guide"),
        false,
        `MATATAG tool must not appear in sidebar tools for ${otherProg}`
      );
    }

    assert.deepEqual(getAvailableSidebarToolsForIteProgram(null), []);
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BSCS"), []);
  });
});

describe("MATATAG Curriculum Reference Hub - Access Guard", () => {
  it("allows BEEd student in ITE institute route", async () => {
    const decision = await evaluateMatatagAccess({
      userId: "user-beed-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({
        programCode: "BEEd",
        programName: "Bachelor of Elementary Education",
      }),
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.role, "STUDENT");
    assert.equal(decision.programCode, "BEEd");
  });

  it("rejects non-ITE route institute", async () => {
    const decision = await evaluateMatatagAccess({
      userId: "user-beed-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ics",
      resolveStudentProgram: async () => ({ programCode: "BEEd" }),
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "NOT_ITE_ROUTE");
  });

  it("rejects non-ITE student user", async () => {
    const decision = await evaluateMatatagAccess({
      userId: "user-ics-1",
      userRole: "STUDENT",
      userInstituteCode: "ics",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ programCode: "BEEd" }),
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "NOT_ITE_USER");
  });

  it("rejects instructors and admins", async () => {
    for (const role of ["INSTRUCTOR", "ADMIN", "PROFESSOR", "TEACHER"]) {
      const decision = await evaluateMatatagAccess({
        userId: "user-staff-1",
        userRole: role,
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
        resolveStudentProgram: async () => ({ programCode: "BEEd" }),
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_STUDENT");
    }
  });

  it("rejects students enrolled in other ITE programs (BECEd, BTLEd ICT, BSEd SCIENCE)", async () => {
    for (const otherProgram of ["BECEd", "BTLEd ICT", "BSEd SCIENCE", null, "BSIT"]) {
      const decision = await evaluateMatatagAccess({
        userId: "user-student-other",
        userRole: "STUDENT",
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
        resolveStudentProgram: async () => ({ programCode: otherProgram }),
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_BEED_PROGRAM");
    }
  });

  it("rejects invalid or unknown roles", async () => {
    const decision = await evaluateMatatagAccess({
      userId: "user-unknown",
      userRole: "GUEST",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ programCode: "BEEd" }),
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "INVALID_ROLE");
  });
});

describe("MATATAG Curriculum Reference Hub - Selectable Grades & Subject Rules", () => {
  it("defines strictly elementary selectable grades (Kindergarten to Grade 6)", () => {
    const gradeKeys = SELECTABLE_ELEMENTARY_GRADES.map((g) => g.key);
    assert.deepEqual(gradeKeys, ["Kindergarten", "1", "2", "3", "4", "5", "6"]);

    // Grades 7 to 10 must NEVER appear as selectable grades
    const rawGradeKeys: string[] = gradeKeys;
    for (let g = 7; g <= 12; g++) {
      assert.equal(
        rawGradeKeys.includes(String(g)),
        false,
        `Grade ${g} must never appear as a selectable grade`
      );
    }
  });

  it("getGradeOptions() flags enabled:true only for grades covered by documents", () => {
    const options = getGradeOptions(MATATAG_DATA);
    assert.equal(options.length, 7);

    // In starter data, doc 1 covers [1, 4, 7] and doc 2 covers [4, 7]
    const g1 = options.find((o) => o.key === "1");
    const g4 = options.find((o) => o.key === "4");
    const g2 = options.find((o) => o.key === "2");
    const gK = options.find((o) => o.key === "Kindergarten");

    assert.equal(g1?.enabled, true);
    assert.equal(g4?.enabled, true);
    assert.equal(g2?.enabled, false);
    assert.equal(gK?.enabled, false);
  });

  it("sorts subjects in the fixed BEEd priority order", () => {
    const options = getSubjectOptions(null, MATATAG_DATA);
    const subjectNames = options.map((o) => o.name);

    assert.deepEqual(
      subjectNames.slice(0, FIXED_BEED_SUBJECT_ORDER.length),
      [...FIXED_BEED_SUBJECT_ORDER]
    );

    // Active subjects in starter data: Mathematics and Araling Panlipunan
    const math = options.find((o) => o.name === "Mathematics");
    const ap = options.find((o) => o.name === "Araling Panlipunan");
    const english = options.find((o) => o.name === "English");

    assert.equal(math?.enabled, true);
    assert.equal(ap?.enabled, true);
    assert.equal(english?.enabled, false);
  });

  it("formats secondary grades note when a document also covers Grade 7+", () => {
    assert.equal(
      formatSecondaryGradesNote([1, 4, 7]),
      "This PDF also covers Grade 7"
    );
    assert.equal(
      formatSecondaryGradesNote([4, 7, 8]),
      "This PDF also covers Grades 7, 8"
    );
    assert.equal(formatSecondaryGradesNote([1, 2, 3, 4, 5, 6]), null);
  });
});

describe("MATATAG Curriculum Reference Hub - Filter & Search Logic", () => {
  it("filterGuides filters by grade", () => {
    const g1Docs = filterGuides(MATATAG_DATA.documents, "1");
    assert.equal(g1Docs.length, 1);
    assert.equal(g1Docs[0].id, "mathematics-grades-1-4-7");

    const g4Docs = filterGuides(MATATAG_DATA.documents, "4");
    assert.equal(g4Docs.length, 2);

    const g2Docs = filterGuides(MATATAG_DATA.documents, "2");
    assert.equal(g2Docs.length, 0);
  });

  it("filterGuides filters by subject", () => {
    const mathDocs = filterGuides(MATATAG_DATA.documents, null, "Mathematics");
    assert.equal(mathDocs.length, 1);
    assert.equal(mathDocs[0].subject, "Mathematics");

    const sciDocs = filterGuides(MATATAG_DATA.documents, null, "Science");
    assert.equal(sciDocs.length, 0);
  });

  it("filterGuides filters by query across title, subject, courses, and source", () => {
    const queryMath = filterGuides(MATATAG_DATA.documents, null, null, "arithmetic");
    assert.equal(queryMath.length, 0);

    const queryCourse = filterGuides(MATATAG_DATA.documents, null, null, "ELEMATP");
    assert.equal(queryCourse.length, 1);
    assert.equal(queryCourse[0].id, "mathematics-grades-1-4-7");

    const queryDeped = filterGuides(MATATAG_DATA.documents, null, null, "DepEd");
    assert.equal(queryDeped.length, 2);
  });

  it("searchCompetencies returns empty list on empty data", () => {
    const results = searchCompetencies(MATATAG_DATA.documents, null, null, "number");
    assert.deepEqual(results, []);
  });

  it("searchCompetencies finds synthetic competencies in test data", () => {
    const syntheticDocs: MatatagDocument[] = [
      {
        id: "mock-math-1",
        title: "Mock Math Guide",
        subject: "Mathematics",
        grades: [1, 2],
        url: "https://www.deped.gov.ph/wp-content/uploads/mock-math.pdf",
        localPath: null,
        source: "DepEd",
        supportsCourses: ["ELEMATP"],
        competencies: [
          {
            id: "comp-1",
            grade: 1,
            quarter: 1,
            domain: "Numbers and Number Sense",
            contentStandard: "Demonstrates understanding of whole numbers up to 100",
            performanceStandard: "Able to recognize, represent, and order whole numbers",
            learningCompetency: "Visualizes and represents numbers from 0 to 100",
            code: "M1NS-Ia-1.1",
          },
          {
            id: "comp-2",
            grade: 2,
            quarter: 2,
            domain: "Geometry",
            learningCompetency: "Identifies straight lines and curves",
            code: "M2GE-IIa-1",
          },
        ],
      },
    ];

    // Search by competency text
    const foundByText = searchCompetencies(syntheticDocs, null, null, "Visualizes");
    assert.equal(foundByText.length, 1);
    assert.equal(foundByText[0].competency.id, "comp-1");

    // Search by domain
    const foundByDomain = searchCompetencies(syntheticDocs, null, null, "geometry");
    assert.equal(foundByDomain.length, 1);
    assert.equal(foundByDomain[0].competency.id, "comp-2");

    // Search by code
    const foundByCode = searchCompetencies(syntheticDocs, null, null, "M1NS-Ia-1.1");
    assert.equal(foundByCode.length, 1);

    // Search filtered by grade
    const grade1Only = searchCompetencies(syntheticDocs, "1", null, null);
    assert.equal(grade1Only.length, 1);
    assert.equal(grade1Only[0].competency.grade, 1);
  });
});

describe("MATATAG Curriculum Reference Hub - Official DepEd URL Validator", () => {
  it("accepts valid https www.deped.gov.ph URLs", () => {
    assert.equal(
      isOfficialDepedUrl(
        "https://www.deped.gov.ph/wp-content/uploads/MATATAG-Mathematics-CG-Grades1-4-and-7.pdf"
      ),
      true
    );
    assert.equal(
      isOfficialDepedUrl(
        "https://www.deped.gov.ph/wp-content/uploads/ARALING-PANLIPUNAN-GRADES-4-7.pdf"
      ),
      true
    );
    assert.equal(
      isOfficialDepedUrl("https://www.deped.gov.ph/matatagcurriculumk147/"),
      true
    );
    assert.equal(
      isOfficialDepedUrl("https://www.deped.gov.ph:443/matatagcurriculumk147/"),
      true
    );
  });

  it("rejects http URLs", () => {
    assert.equal(
      isOfficialDepedUrl("http://www.deped.gov.ph/uploads/math.pdf"),
      false
    );
  });

  it("rejects other hosts and subdomains", () => {
    assert.equal(isOfficialDepedUrl("https://deped.gov.ph/uploads/math.pdf"), false);
    assert.equal(
      isOfficialDepedUrl("https://portal.deped.gov.ph/uploads/math.pdf"),
      false
    );
    assert.equal(isOfficialDepedUrl("https://google.com"), false);
  });

  it("rejects look-alikes and attacker spoof domains", () => {
    assert.equal(
      isOfficialDepedUrl("https://www.deped.gov.ph.evil.com/fake.pdf"),
      false
    );
    assert.equal(
      isOfficialDepedUrl("https://www.deped.gov.ph@evil.com/fake.pdf"),
      false
    );
  });

  it("rejects URLs with embedded credentials", () => {
    assert.equal(
      isOfficialDepedUrl("https://user:password@www.deped.gov.ph/fake.pdf"),
      false
    );
  });

  it("rejects non-standard ports", () => {
    assert.equal(
      isOfficialDepedUrl("https://www.deped.gov.ph:8080/fake.pdf"),
      false
    );
  });

  it("rejects javascript:, data:, and empty/invalid values", () => {
    assert.equal(isOfficialDepedUrl("javascript:alert(1)"), false);
    assert.equal(isOfficialDepedUrl("data:text/html;base64,PHNjcmlwdD4="), false);
    assert.equal(isOfficialDepedUrl(""), false);
    assert.equal(isOfficialDepedUrl(null), false);
    assert.equal(isOfficialDepedUrl(undefined), false);
    assert.equal(isOfficialDepedUrl("not a valid url"), false);
  });
});

describe("MATATAG Curriculum Reference Hub - JSON Data Integrity", () => {
  it("data has sourcePages and documents arrays", () => {
    const data = getMatatagData();
    assert.ok(Array.isArray(data.sourcePages), "sourcePages must be an array");
    assert.ok(Array.isArray(data.documents), "documents must be an array");
    assert.ok(data.documents.length >= 2, "Must contain at least 2 documents");
  });

  it("all documents have unique non-empty IDs", () => {
    const docs = getMatatagDocuments();
    const ids = docs.map((d) => d.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, "All document IDs must be unique");
    for (const id of ids) {
      assert.ok(id && id.trim().length > 0, "Document ID must be non-empty");
    }
  });

  it("all document URLs pass the strict official DepEd URL validator", () => {
    const docs = getMatatagDocuments();
    for (const doc of docs) {
      assert.equal(
        isOfficialDepedUrl(doc.url),
        true,
        `Document ${doc.id} url (${doc.url}) must pass isOfficialDepedUrl`
      );
    }

    const data = getMatatagData();
    for (const page of data.sourcePages) {
      assert.equal(
        isOfficialDepedUrl(page.url),
        true,
        `Source page url (${page.url}) must pass isOfficialDepedUrl`
      );
    }
  });

  it("all documents have non-empty grades arrays", () => {
    const docs = getMatatagDocuments();
    for (const doc of docs) {
      assert.ok(
        Array.isArray(doc.grades) && doc.grades.length > 0,
        `Document ${doc.id} must have non-empty grades array`
      );
    }
  });

  it("all documents have competencies array present (even if empty)", () => {
    const docs = getMatatagDocuments();
    for (const doc of docs) {
      assert.ok(
        Array.isArray(doc.competencies),
        `Document ${doc.id} must have competencies array`
      );
    }
  });

  it("supportsCourses uses only allowed CDM BEEd course codes", () => {
    const docs = getMatatagDocuments();
    const allowed = new Set<string>(BEED_ALLOWED_COURSE_CODES);

    for (const doc of docs) {
      assert.ok(
        Array.isArray(doc.supportsCourses),
        `Document ${doc.id} must have supportsCourses array`
      );
      for (const courseCode of doc.supportsCourses) {
        assert.ok(
          allowed.has(courseCode),
          `Document ${doc.id} has invalid courseCode ${courseCode}. Allowed: ${Array.from(allowed).join(", ")}`
        );
      }
    }
  });
});

