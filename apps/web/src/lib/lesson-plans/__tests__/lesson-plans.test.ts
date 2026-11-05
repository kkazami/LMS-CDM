import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FRAMEWORKS, getFrameworkById } from "../data";
import {
  buildPlanText,
  generateFilenameSlug,
  sanitizeInput,
  validateField,
  validatePlan,
  serializeDraft,
  deserializeDraft,
  MAX_FIELD_LENGTH,
} from "../rules";
import { evaluateLessonPlanAccess } from "../guard";
import {
  getFeaturesForIteProgram,
  getAvailableSidebarToolsForIteProgram,
} from "../../ite-programs/features";
import type { LessonPlanFormValues } from "../types";

describe("Lesson Plan Builder - Registry Integration", () => {
  it("exposes Lesson Plan Builder in getFeaturesForIteProgram for all four ITE programs with available status", () => {
    const itePrograms = ["BECEd", "BEEd", "BTLEd ICT", "BSEd SCIENCE"] as const;
    for (const prog of itePrograms) {
      const features = getFeaturesForIteProgram(prog);
      const lp = features.find((f) => f.id === "lesson-plan-builder");
      assert.ok(lp, `Expected lesson-plan-builder in ${prog} features`);
      assert.equal(lp.status, "available");
      assert.equal(lp.href, "/ite/lesson-plans");
      assert.equal(lp.title, "Lesson Plan Builder");
    }
  });

  it("exposes Lesson Plan Builder in getAvailableSidebarToolsForIteProgram for all four ITE programs", () => {
    const itePrograms = ["BECEd", "BEEd", "BTLEd ICT", "BSEd SCIENCE"] as const;
    for (const prog of itePrograms) {
      const tools = getAvailableSidebarToolsForIteProgram(prog);
      const lpTool = tools.find((t) => t.id === "lesson-plan-builder");
      assert.ok(lpTool, `Expected lesson-plan-builder in ${prog} sidebar tools`);
      assert.equal(lpTool.href, "/ite/lesson-plans");
    }
  });

  it("returns no sidebar tools for non-ITE or null programs", () => {
    assert.deepEqual(getAvailableSidebarToolsForIteProgram(null), []);
    assert.deepEqual(getAvailableSidebarToolsForIteProgram(""), []);
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BSCS"), []);
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BSA"), []);
  });
});

describe("Lesson Plan Builder - Access Guard", () => {
  it("allows all four ITE student programs for role STUDENT", async () => {
    const itePrograms = ["BECEd", "BEEd", "BTLEd ICT", "BSEd SCIENCE"] as const;
    for (const prog of itePrograms) {
      const decision = await evaluateLessonPlanAccess({
        userId: "user-123",
        userRole: "STUDENT",
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
        resolveStudentProgram: async () => ({
          programCode: prog,
          programName: `Bachelor of ${prog}`,
        }),
      });
      assert.equal(decision.allowed, true);
      assert.equal(decision.role, "STUDENT");
      assert.equal(decision.programCode, prog);
    }
  });

  it("denies access to instructors and admins (students only for now)", async () => {
    const instructorDecision = await evaluateLessonPlanAccess({
      userId: "teacher-1",
      userRole: "INSTRUCTOR",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({
        programCode: "BTLEd ICT",
      }),
    });
    assert.equal(instructorDecision.allowed, false);
    assert.equal(instructorDecision.reason, "NOT_STUDENT");

    const adminDecision = await evaluateLessonPlanAccess({
      userId: "admin-1",
      userRole: "ADMIN",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({
        programCode: "BEEd",
      }),
    });
    assert.equal(adminDecision.allowed, false);
    assert.equal(adminDecision.reason, "NOT_STUDENT");
  });

  it("denies access if route or user institute is not ITE (ICS/IBE untouched)", async () => {
    const nonIteUser = await evaluateLessonPlanAccess({
      userId: "user-ics",
      userRole: "STUDENT",
      userInstituteCode: "ics",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ programCode: "BTLEd ICT" }),
    });
    assert.equal(nonIteUser.allowed, false);
    assert.equal(nonIteUser.reason, "NOT_ITE_USER");

    const nonIteRoute = await evaluateLessonPlanAccess({
      userId: "user-ite",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ibe",
      resolveStudentProgram: async () => ({ programCode: "BTLEd ICT" }),
    });
    assert.equal(nonIteRoute.allowed, false);
    assert.equal(nonIteRoute.reason, "NOT_ITE_ROUTE");
  });

  it("denies access if student does not resolve to an eligible ITE program", async () => {
    const unknownProgram = await evaluateLessonPlanAccess({
      userId: "user-unassigned",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => null,
    });
    assert.equal(unknownProgram.allowed, false);
    assert.equal(unknownProgram.reason, "NOT_ELIGIBLE_PROGRAM");
  });
});

describe("Lesson Plan Builder - Frameworks Data Integrity", () => {
  it("contains exactly 4 frameworks with unique IDs (ilaw, 4as, 5es, 6es)", () => {
    assert.equal(FRAMEWORKS.length, 4);
    const ids = FRAMEWORKS.map((f) => f.id);
    assert.deepEqual(ids, ["ilaw", "4as", "5es", "6es"]);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 4);
  });

  it("verifies expected stage counts: ILAW=4, 4A's=4, 5E's=5, 6E's=6", () => {
    const ilaw = getFrameworkById("ilaw");
    assert.equal(ilaw?.stages.length, 4);

    const fourAs = getFrameworkById("4as");
    assert.equal(fourAs?.stages.length, 4);

    const fiveEs = getFrameworkById("5es");
    assert.equal(fiveEs?.stages.length, 5);

    const sixEs = getFrameworkById("6es");
    assert.equal(sixEs?.stages.length, 6);
  });

  it("verifies every stage has purpose, teacherDoes, learnersDo, writingTip, and 2 guide questions", () => {
    for (const framework of FRAMEWORKS) {
      assert.ok(framework.name.length > 0);
      assert.ok(framework.shortDescription.length > 0);
      assert.ok(framework.originNote.length > 0);

      const stageIds = new Set<string>();
      for (const stage of framework.stages) {
        assert.ok(stage.id.length > 0);
        assert.ok(!stageIds.has(stage.id), `Duplicate stage ID: ${stage.id}`);
        stageIds.add(stage.id);

        assert.ok(stage.name.length > 0);
        assert.ok(stage.purpose.length > 10, `Purpose too short for stage: ${stage.name}`);
        assert.ok(Array.isArray(stage.teacherDoes) && stage.teacherDoes.length >= 2);
        assert.ok(Array.isArray(stage.learnersDo) && stage.learnersDo.length >= 2);
        assert.ok(stage.writingTip.length > 10);
        assert.ok(
          Array.isArray(stage.guideQuestions) && stage.guideQuestions.length === 2,
          `Expected 2 guide questions for stage ${stage.name}`
        );
      }
    }
  });

  it("verifies each framework has a complete sample plan with one section per stage and annotations", () => {
    for (const framework of FRAMEWORKS) {
      const sample = framework.samplePlan;
      assert.ok(sample.title.length > 0);
      assert.ok(sample.subject.length > 0);
      assert.ok(sample.gradeLevel.length > 0);
      assert.ok(sample.topic.length > 0);
      assert.ok(sample.learningCompetency.length > 0);
      assert.ok(sample.learningObjectives.length > 0);
      assert.ok(sample.materials.length > 0);

      assert.equal(
        sample.sections.length,
        framework.stages.length,
        `Sample sections count mismatch for ${framework.id}`
      );

      for (let i = 0; i < framework.stages.length; i++) {
        const stage = framework.stages[i]!;
        const section = sample.sections[i]!;
        assert.equal(section.stageId, stage.id);
        assert.ok(section.content.length > 20);
        assert.ok(section.annotation.length > 10);
      }
    }
  });
});

describe("Lesson Plan Builder - Logic, Formatting & Validation", () => {
  it("buildPlanText outputs every stage heading, all header fields, and the DepEd disclaimer", () => {
    const ilaw = getFrameworkById("ilaw")!;
    const formValues: LessonPlanFormValues = {
      frameworkId: "ilaw",
      headers: {
        subject: "Science 4",
        gradeLevel: "Grade 4",
        topic: "Photosynthesis and Plant Food",
        learningCompetency: "Demonstrate that plants produce food via photosynthesis",
        learningObjectives: "1. State the requirements for photosynthesis.\n2. Label a leaf diagram.",
        materials: "Potted plant, iodine solution, beaker",
        date: "2026-11-10",
        preparedBy: "Maria Clara",
      },
      stages: {
        intentions: "State clear learning goals for leaf chemistry.",
        "learning-experience": "Students conduct iodine starch test on green leaves.",
        "assessing-learning": "5-item quick quiz on starch color indicators.",
        "ways-forward": "Enrichment report on non-green variegated leaves.",
      },
    };

    const text = buildPlanText(ilaw, formValues);
    assert.ok(text.includes("# LESSON PLAN: Photosynthesis and Plant Food"));
    assert.ok(text.includes("**Framework**: ILAW Framework"));
    assert.ok(text.includes("- **Subject**: Science 4"));
    assert.ok(text.includes("- **Grade / Year Level**: Grade 4"));
    assert.ok(text.includes("- **Prepared by**: Maria Clara"));
    assert.ok(text.includes("### Intentions"));
    assert.ok(text.includes("### Learning Experience"));
    assert.ok(text.includes("### Assessing Learning"));
    assert.ok(text.includes("### Ways Forward"));
    assert.ok(text.includes("State clear learning goals for leaf chemistry."));
    assert.ok(
      text.includes(
        "Templates for practice. Follow your instructor's required format and the latest DepEd guidelines."
      )
    );
  });

  it("enforces 4000 character length cap per field", () => {
    const okField = validateField("Valid text");
    assert.equal(okField.valid, true);

    const longText = "A".repeat(MAX_FIELD_LENGTH + 1);
    const invalidField = validateField(longText);
    assert.equal(invalidField.valid, false);
    assert.ok(invalidField.error?.includes("4,000"));
  });

  it("validates entire plan and enforces 60 KB total size cap", () => {
    const validPlan: LessonPlanFormValues = {
      frameworkId: "4as",
      headers: {
        subject: "Math",
        gradeLevel: "Grade 5",
        topic: "Fractions",
        learningCompetency: "Add fractions",
        learningObjectives: "Add like fractions",
        materials: "Fraction strips",
        date: "2026-11-05",
        preparedBy: "Teacher A",
      },
      stages: {
        activity: "Folding paper strips",
        analysis: "Comparing folded sections",
        abstraction: "Rule for common denominator",
        application: "Baking recipe problems",
      },
    };

    const check = validatePlan(validPlan);
    assert.equal(check.valid, true);
    assert.deepEqual(check.errors, {});
    assert.ok(check.totalBytes < 60 * 1024);

    // Huge plan exceeding 60 KB
    const hugePlan: LessonPlanFormValues = {
      ...validPlan,
      stages: {
        activity: "X".repeat(3500),
        analysis: "X".repeat(3500),
        abstraction: "X".repeat(3500),
        application: "X".repeat(3500),
        extra1: "X".repeat(3500),
        extra2: "X".repeat(3500),
        extra3: "X".repeat(3500),
        extra4: "X".repeat(3500),
        extra5: "X".repeat(3500),
        extra6: "X".repeat(3500),
        extra7: "X".repeat(3500),
        extra8: "X".repeat(3500),
        extra9: "X".repeat(3500),
        extra10: "X".repeat(3500),
        extra11: "X".repeat(3500),
        extra12: "X".repeat(3500),
        extra13: "X".repeat(3500),
        extra14: "X".repeat(3500),
      },
    };
    const hugeCheck = validatePlan(hugePlan);
    assert.equal(hugeCheck.valid, false);
    assert.ok(hugeCheck.errors["_total"]?.includes("60 KB"));
  });

  it("generateFilenameSlug produces safe ASCII filename and rejects traversal / slashes / non-ASCII", () => {
    const slug1 = generateFilenameSlug("Parts of a Plant", "ilaw", "txt");
    assert.equal(slug1, "lesson-plan-ilaw-parts-of-a-plant.txt");

    const slug2 = generateFilenameSlug("../../etc/passwd", "5es", "md");
    assert.equal(slug2, "lesson-plan-5es-etc-passwd.md");
    assert.ok(!slug2.includes("/"));
    assert.ok(!slug2.includes(".."));

    const slug3 = generateFilenameSlug("Special Science: 100% Filipino (Araling Panlipunan)", "4as");
    assert.equal(slug3, "lesson-plan-4as-special-science-100-filipino-araling-pan.txt");
    assert.ok(/^[a-z0-9\-.]+\.txt$/.test(slug3));

    const slugEmpty = generateFilenameSlug("", "6es");
    assert.equal(slugEmpty, "lesson-plan-6es.txt");
  });

  it("sanitizes dangerous ASCII control characters while keeping whitespace", () => {
    const dirty = "Hello\x00\x08World\x1F!\r\nLine 2\tTabbed";
    const clean = sanitizeInput(dirty);
    assert.equal(clean, "HelloWorld!\r\nLine 2\tTabbed");
  });

  it("draft serializer round-trips and rejects unknown versions or malformed JSON", () => {
    const formValues: LessonPlanFormValues = {
      frameworkId: "5es",
      headers: {
        subject: "Physics",
        gradeLevel: "Grade 8",
        topic: "Sound Waves",
        learningCompetency: "Describe sound propagation",
        learningObjectives: "Explain pitch and loudness",
        materials: "Tuning forks",
        date: "2026-11-06",
        preparedBy: "Alex Rivera",
      },
      stages: {
        engage: "Strike a tuning fork near water",
        explore: "Feel vibrations with fingertips",
        explain: "Define longitudinal waves",
        elaborate: "Compare musical instruments",
        evaluate: "Identify wave properties in diagrams",
      },
    };

    const serialized = serializeDraft(formValues);
    const restored = deserializeDraft(serialized, "5es");
    assert.ok(restored);
    assert.equal(restored.frameworkId, "5es");
    assert.equal(restored.headers.topic, "Sound Waves");
    assert.equal(restored.stages["engage"], "Strike a tuning fork near water");

    // Framework mismatch
    assert.equal(deserializeDraft(serialized, "ilaw"), null);

    // Unknown version
    const fakeVersion = JSON.stringify({
      version: 99,
      updatedAt: new Date().toISOString(),
      formValues,
    });
    assert.equal(deserializeDraft(fakeVersion), null);

    // Corrupted JSON
    assert.equal(deserializeDraft("{ not valid json"), null);
    assert.equal(deserializeDraft(null), null);
  });
});
