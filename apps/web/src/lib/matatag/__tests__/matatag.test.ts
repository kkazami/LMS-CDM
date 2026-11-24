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
  type MatatagDocument,
} from "../types";
import {
  FIXED_BEED_SUBJECT_ORDER,
  SELECTABLE_ELEMENTARY_GRADES,
  filterGuides,
  formatSecondaryGradesNote,
  getDocumentSourceBadgeInfo,
  getGradeOptions,
  getSubjectOptions,
  isAllowedGuideUrl,
  isAllowedMirrorUrl,
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

  it("getGradeOptions() flags all grades enabled now that full elementary set is covered", () => {
    const options = getGradeOptions(MATATAG_DATA);
    assert.equal(options.length, 7);

    // All grades K to 6 are now covered by documents
    for (const opt of options) {
      assert.equal(
        opt.enabled,
        true,
        `Expected grade ${opt.key} to be enabled with expanded dataset`
      );
    }
  });

  it("sorts subjects in the fixed BEEd priority order, followed by extra subjects alphabetically", () => {
    const options = getSubjectOptions(null, MATATAG_DATA);
    const subjectNames = options.map((o) => o.name);

    // Fixed order first
    assert.deepEqual(
      subjectNames.slice(0, FIXED_BEED_SUBJECT_ORDER.length),
      [...FIXED_BEED_SUBJECT_ORDER]
    );

    // Other subjects sorted alphabetically
    const remainder = subjectNames.slice(FIXED_BEED_SUBJECT_ORDER.length);
    assert.deepEqual(remainder, [
      "Kindergarten",
      "Language",
      "Makabansa",
      "Reading and Literacy",
    ]);
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
    assert.equal(
      formatSecondaryGradesNote([4, 5, 6, 7, 8, 9, 10]),
      "This PDF also covers Grades 7, 8, 9, 10"
    );
    assert.equal(formatSecondaryGradesNote([1, 2, 3, 4, 5, 6]), null);
  });
});

describe("MATATAG Curriculum Reference Hub - Filter, Search & Deduplication Logic", () => {
  it("prefers official documents over mirror duplicates when filtering by grade", () => {
    // Grade 4 has both official English (grades [4, 7]) and mirror English (grades [2..10])
    const grade4English = filterGuides(MATATAG_DATA.documents, "4", "English");
    assert.equal(grade4English.length, 1);
    assert.equal(grade4English[0].id, "english-grades-4-7");
    assert.equal(grade4English[0].sourceType, "official");

    // Grade 2 English only exists in mirror
    const grade2English = filterGuides(MATATAG_DATA.documents, "2", "English");
    assert.equal(grade2English.length, 1);
    assert.equal(grade2English[0].id, "mirror-english-grades-2-10");
    assert.equal(grade2English[0].sourceType, "mirror");

    // Grade 4 MAPEH: official PE and Health covers 4; mirror PE and Health is hidden; mirror Music & Arts is preserved!
    const grade4Mapeh = filterGuides(MATATAG_DATA.documents, "4", "MAPEH");
    const mapehIds = grade4Mapeh.map((d) => d.id);
    assert.ok(mapehIds.includes("pe-and-health-grades-4-7"), "Must include official PE and Health");
    assert.ok(mapehIds.includes("mirror-music-and-arts-grades-4-10"), "Must include mirror Music & Arts");
    assert.equal(
      mapehIds.includes("mirror-pe-and-health-grades-4-10"),
      false,
      "Must hide mirror PE and Health duplicate"
    );
  });

  it("always sorts official documents before mirror documents", () => {
    const allGuides = filterGuides(MATATAG_DATA.documents, null, null, null);
    let seenMirror = false;
    for (const doc of allGuides) {
      if (doc.sourceType === "mirror") {
        seenMirror = true;
      } else if (seenMirror) {
        assert.fail(
          `Found official document ${doc.id} after a mirror document in list`
        );
      }
    }
  });

  it("searchCompetencies returns empty list on empty data and finds synthetic items", () => {
    const results = searchCompetencies(MATATAG_DATA.documents, null, null, "number");
    assert.deepEqual(results, []);

    const syntheticDocs: MatatagDocument[] = [
      {
        id: "mock-math-1",
        title: "Mock Math Guide",
        subject: "Mathematics",
        grades: [1, 2],
        url: "https://www.deped.gov.ph/wp-content/uploads/mock-math.pdf",
        localPath: null,
        source: "DepEd",
        sourceType: "official",
        supportsCourses: ["ELEMATP"],
        competencies: [
          {
            id: "comp-1",
            grade: 1,
            learningCompetency: "Counts from 1 to 100",
            code: "M1NS-Ia-1",
          },
        ],
      },
    ];

    const found = searchCompetencies(syntheticDocs, "1", "Mathematics", "counts");
    assert.equal(found.length, 1);
    assert.equal(found[0].competency.id, "comp-1");
  });
});

describe("MATATAG Curriculum Reference Hub - Official and Mirror URL Validators", () => {
  it("isOfficialDepedUrl accepts valid https www.deped.gov.ph URLs and rejects bad cases", () => {
    assert.equal(
      isOfficialDepedUrl(
        "https://www.deped.gov.ph/wp-content/uploads/MATATAG-Mathematics-CG-Grades1-4-and-7.pdf"
      ),
      true
    );
    assert.equal(
      isOfficialDepedUrl("https://www.deped.gov.ph/matatagcurriculumk147/"),
      true
    );

    // Rejections
    assert.equal(isOfficialDepedUrl("http://www.deped.gov.ph/uploads/math.pdf"), false);
    assert.equal(isOfficialDepedUrl("https://deped.gov.ph/uploads/math.pdf"), false);
    assert.equal(isOfficialDepedUrl("https://www.deped.gov.ph.evil.com/fake.pdf"), false);
    assert.equal(isOfficialDepedUrl("https://www.deped.gov.ph@evil.com/fake.pdf"), false);
    assert.equal(isOfficialDepedUrl("https://user:pass@www.deped.gov.ph/fake.pdf"), false);
    assert.equal(isOfficialDepedUrl("https://www.deped.gov.ph:8080/fake.pdf"), false);
    assert.equal(isOfficialDepedUrl("javascript:alert(1)"), false);
    assert.equal(isOfficialDepedUrl("data:text/html,evil"), false);
  });

  it("isAllowedMirrorUrl accepts valid mirror URLs and exact guide page", () => {
    assert.equal(
      isAllowedMirrorUrl(
        "https://matatagcurriculum.com/wp-content/uploads/2024/11/MATATAG-Curriculum-Grade-1-10-Maths.pdf"
      ),
      true
    );
    assert.equal(
      isAllowedMirrorUrl(
        "https://matatagcurriculum.com/wp-content/uploads/2024/11/MATATAG-Curriculum-Guide-Kindergarten.PDF"
      ),
      true
    );
    assert.equal(
      isAllowedMirrorUrl(
        "https://matatagcurriculum.com/matatag-curriculum-guide/"
      ),
      true
    );
    assert.equal(
      isAllowedMirrorUrl(
        "https://matatagcurriculum.com/matatag-curriculum-guide"
      ),
      true
    );
    assert.equal(
      isAllowedMirrorUrl(
        "https://matatagcurriculum.com:443/matatag-curriculum-guide/"
      ),
      true
    );
  });

  it("isAllowedMirrorUrl rejects invalid hosts, look-alikes, credentials, non-pdf or wrong paths", () => {
    assert.equal(
      isAllowedMirrorUrl("http://matatagcurriculum.com/wp-content/uploads/2024/11/math.pdf"),
      false
    );
    assert.equal(
      isAllowedMirrorUrl("https://matatagcurriculum.com.evil.com/wp-content/uploads/2024/11/math.pdf"),
      false
    );
    assert.equal(
      isAllowedMirrorUrl("https://matatagcurriculum.com@evil.com/wp-content/uploads/2024/11/math.pdf"),
      false
    );
    assert.equal(
      isAllowedMirrorUrl("https://user:pass@matatagcurriculum.com/wp-content/uploads/2024/11/math.pdf"),
      false
    );
    assert.equal(
      isAllowedMirrorUrl("https://matatagcurriculum.com:8080/wp-content/uploads/2024/11/math.pdf"),
      false
    );
    assert.equal(
      isAllowedMirrorUrl("https://matatagcurriculum.com/wp-content/uploads/2024/12/math.pdf"),
      false
    );
    assert.equal(
      isAllowedMirrorUrl("https://matatagcurriculum.com/wp-content/uploads/2024/11/math.exe"),
      false
    );
    assert.equal(isAllowedMirrorUrl("https://matatagcurriculum.com/about/"), false);
    assert.equal(isAllowedMirrorUrl("javascript:alert(1)"), false);
    assert.equal(isAllowedMirrorUrl(""), false);
  });

  it("isAllowedGuideUrl validates based on document sourceType", () => {
    const officialDoc: MatatagDocument = {
      id: "doc-off",
      title: "Official",
      subject: "Math",
      grades: [1],
      url: "https://www.deped.gov.ph/wp-content/uploads/math.pdf",
      localPath: null,
      source: "DepEd",
      sourceType: "official",
      supportsCourses: [],
      competencies: [],
    };
    const mirrorDoc: MatatagDocument = {
      id: "doc-mir",
      title: "Mirror",
      subject: "Math",
      grades: [1],
      url: "https://matatagcurriculum.com/wp-content/uploads/2024/11/math.pdf",
      localPath: null,
      source: "matatagcurriculum.com",
      sourceType: "mirror",
      supportsCourses: [],
      competencies: [],
    };

    assert.equal(isAllowedGuideUrl(officialDoc), true);
    assert.equal(isAllowedGuideUrl(mirrorDoc), true);

    // Swap URLs with invalid ones
    assert.equal(
      isAllowedGuideUrl({ ...officialDoc, url: mirrorDoc.url }),
      false
    );
    assert.equal(
      isAllowedGuideUrl({ ...mirrorDoc, url: officialDoc.url }),
      false
    );
  });
});

describe("MATATAG Curriculum Reference Hub - Badge Helper & JSON Data Integrity", () => {
  it("getDocumentSourceBadgeInfo correctly distinguishes official vs mirror badges", () => {
    const officialDoc: MatatagDocument = {
      id: "doc-off",
      title: "Official",
      subject: "Math",
      grades: [1],
      url: "https://www.deped.gov.ph/wp-content/uploads/math.pdf",
      localPath: null,
      source: "DepEd",
      sourceType: "official",
      supportsCourses: [],
      competencies: [],
    };
    const mirrorDoc: MatatagDocument = {
      id: "doc-mir",
      title: "Mirror",
      subject: "Math",
      grades: [1],
      url: "https://matatagcurriculum.com/wp-content/uploads/2024/11/math.pdf",
      localPath: null,
      source: "matatagcurriculum.com (unofficial copy)",
      sourceType: "mirror",
      supportsCourses: [],
      competencies: [],
    };

    const offInfo = getDocumentSourceBadgeInfo(officialDoc);
    assert.equal(offInfo.isMirror, false);
    assert.equal(offInfo.buttonLabel, "Open official PDF");
    assert.equal(offInfo.badgeText, "Source: DepEd");

    const mirInfo = getDocumentSourceBadgeInfo(mirrorDoc);
    assert.equal(mirInfo.isMirror, true);
    assert.equal(mirInfo.buttonLabel, "Open unofficial copy");
    assert.equal(
      mirInfo.badgeText,
      "Unofficial copy: matatagcurriculum.com, not affiliated with DepEd"
    );
    assert.equal(
      mirInfo.disclaimer,
      "Check the official DepEd page for the latest version."
    );
  });

  it("all documents have unique IDs, sourceType, non-empty grades, and competencies array", () => {
    const docs = getMatatagDocuments();
    assert.equal(docs.length, 17, "Expected 17 documents (6 official + 11 mirror)");

    const ids = docs.map((d) => d.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, "All document IDs must be unique");

    for (const doc of docs) {
      assert.ok(doc.id && doc.id.trim().length > 0, "ID must be non-empty");
      assert.ok(
        doc.sourceType === "official" || doc.sourceType === "mirror",
        `Document ${doc.id} must have valid sourceType`
      );
      assert.ok(
        Array.isArray(doc.grades) && doc.grades.length > 0,
        `Document ${doc.id} must have non-empty grades`
      );
      assert.ok(
        Array.isArray(doc.competencies),
        `Document ${doc.id} must have competencies array`
      );
    }
  });

  it("every official doc passes isOfficialDepedUrl and every mirror doc passes isAllowedMirrorUrl", () => {
    const docs = getMatatagDocuments();
    for (const doc of docs) {
      if (doc.sourceType === "official") {
        assert.equal(
          isOfficialDepedUrl(doc.url),
          true,
          `Official doc ${doc.id} URL (${doc.url}) must pass isOfficialDepedUrl`
        );
      } else {
        assert.equal(
          isAllowedMirrorUrl(doc.url),
          true,
          `Mirror doc ${doc.id} URL (${doc.url}) must pass isAllowedMirrorUrl`
        );
      }
    }
  });

  it("supportsCourses uses only allowed CDM BEEd course codes", () => {
    const docs = getMatatagDocuments();
    const allowed = new Set<string>(BEED_ALLOWED_COURSE_CODES);

    for (const doc of docs) {
      for (const courseCode of doc.supportsCourses) {
        assert.ok(
          allowed.has(courseCode),
          `Document ${doc.id} has invalid courseCode ${courseCode}. Allowed: ${Array.from(allowed).join(", ")}`
        );
      }
    }
  });
});
