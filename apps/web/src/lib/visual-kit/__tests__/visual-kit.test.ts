import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VISUAL_KIT_DIAGRAMS } from "../data";
import {
  calculateMinAnchorDistance,
  deserializeBestScores,
  getDistance,
  scoreLabelingAnswers,
  serializeBestScores,
  shufflePartNames,
} from "../rules";
import { evaluateVisualKitAccess } from "../guard";
import {
  getFeaturesForIteProgram,
  getAvailableSidebarToolsForIteProgram,
} from "../../ite-programs/features";
import type { Shape } from "../types";

describe("Visual Kit - Access Control Guard", () => {
  it("allows authenticated BSEd Science students on ITE route", async () => {
    const decision = await evaluateVisualKitAccess({
      userId: "user-bsed-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({
        programCode: "BSEd SCIENCE",
        programName: "Bachelor of Secondary Education Major in Science",
      }),
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.role, "STUDENT");
    assert.equal(decision.programCode, "BSEd SCIENCE");
  });

  it("rejects non-ITE route with NOT_ITE_ROUTE", async () => {
    const decision = await evaluateVisualKitAccess({
      userId: "user-bsed-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ics",
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "NOT_ITE_ROUTE");
  });

  it("rejects non-ITE user with NOT_ITE_USER", async () => {
    const decision = await evaluateVisualKitAccess({
      userId: "user-ics-1",
      userRole: "STUDENT",
      userInstituteCode: "ibe",
      routeInstituteCode: "ite",
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "NOT_ITE_USER");
  });

  it("rejects invalid role with INVALID_ROLE", async () => {
    const decision = await evaluateVisualKitAccess({
      userId: "user-bsed-1",
      userRole: "SUPERUSER",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "INVALID_ROLE");
  });

  it("rejects instructors and admins with NOT_STUDENT", async () => {
    for (const role of ["INSTRUCTOR", "ADMIN", "PROFESSOR", "TEACHER"]) {
      const decision = await evaluateVisualKitAccess({
        userId: "user-staff-1",
        userRole: role,
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_STUDENT");
    }
  });

  it("rejects other ITE student programs (BECEd, BEEd, BTLEd ICT, null) with NOT_BSED_SCIENCE_PROGRAM", async () => {
    for (const otherProg of ["BECEd", "BEEd", "BTLEd ICT", null, "BSIT"]) {
      const decision = await evaluateVisualKitAccess({
        userId: "user-other-1",
        userRole: "STUDENT",
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
        resolveStudentProgram: async () =>
          otherProg ? { programCode: otherProg } : null,
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_BSED_SCIENCE_PROGRAM");
    }
  });
});

describe("Visual Kit - Program Registry & Tool Availability", () => {
  it("registers Interactive Visual Learning Kit strictly for BSEd Science and marks it available", () => {
    const bsedFeatures = getFeaturesForIteProgram("BSEd SCIENCE");
    const visualKit = bsedFeatures.find(
      (f) => f.id === "interactive-educational-charts"
    );

    assert.ok(visualKit, "interactive-educational-charts feature must exist for BSEd SCIENCE");
    assert.equal(visualKit.title, "Interactive Visual Learning Kit");
    assert.equal(visualKit.status, "available");
    assert.equal(visualKit.href, "/ite/visual-kit");
    assert.deepEqual(visualKit.programs, ["BSEd SCIENCE"]);

    const tools = getAvailableSidebarToolsForIteProgram("BSEd SCIENCE");
    const tool = tools.find((t) => t.id === "interactive-educational-charts");
    assert.ok(tool, "Sidebar tools must include the visual kit");
    assert.equal(tool.title, "Interactive Visual Learning Kit");
    assert.equal(tool.href, "/ite/visual-kit");
  });

  it("does not expose Interactive Visual Learning Kit to other ITE programs", () => {
    for (const prog of ["BECEd", "BEEd", "BTLEd ICT"] as const) {
      const features = getFeaturesForIteProgram(prog);
      const visualKit = features.find(
        (f) => f.id === "interactive-educational-charts"
      );
      assert.equal(
        visualKit,
        undefined,
        `Program ${prog} must not have access to visual kit`
      );

      const tools = getAvailableSidebarToolsForIteProgram(prog);
      const tool = tools.find((t) => t.id === "interactive-educational-charts");
      assert.equal(tool, undefined);
    }
  });
});

describe("Visual Kit - Diagram Data Integrity & Quality Verification", () => {
  it("contains all 6 required diagrams with expected IDs and topics", () => {
    const ids = VISUAL_KIT_DIAGRAMS.map((d) => d.id);
    assert.deepEqual(ids, [
      "human-heart",
      "digestive-system",
      "animal-cell",
      "plant-photosynthesis",
      "water-cycle",
      "simple-electric-circuit",
    ]);
  });

  it("meets or exceeds minimum component part count for each topic", () => {
    const expectedMins: Record<string, number> = {
      "human-heart": 12,
      "digestive-system": 9,
      "animal-cell": 11,
      "plant-photosynthesis": 7,
      "water-cycle": 8,
      "simple-electric-circuit": 5,
    };

    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      const min = expectedMins[diagram.id];
      assert.ok(min, `Missing expected min for ${diagram.id}`);
      assert.ok(
        diagram.parts.length >= min,
        `Diagram ${diagram.id} has ${diagram.parts.length} parts, expected at least ${min}`
      );
    }
  });

  it("ensures all anchors are inside viewBox with safe margins", () => {
    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      const { w, h } = diagram.viewBox;
      assert.ok(w > 0 && h > 0, `Invalid viewBox for ${diagram.id}`);

      for (const part of diagram.parts) {
        assert.ok(
          part.anchor.x >= 20 && part.anchor.x <= w - 20,
          `Anchor x out of bounds in ${diagram.id} for ${part.id}: ${part.anchor.x} in [20, ${w - 20}]`
        );
        assert.ok(
          part.anchor.y >= 20 && part.anchor.y <= h - 20,
          `Anchor y out of bounds in ${diagram.id} for ${part.id}: ${part.anchor.y} in [20, ${h - 20}]`
        );
      }
    }
  });

  it("passes anchor spacing quality check: pairwise Euclidean distance >= 18 units", () => {
    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      const minDist = calculateMinAnchorDistance(diagram);
      assert.ok(
        minDist >= 18,
        `Diagram ${diagram.id} min anchor distance ${minDist.toFixed(2)} is less than 18 units!`
      );
    }
  });

  it("ensures each diagram has exactly 3 discussion questions and rich pedagogical content", () => {
    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      assert.equal(
        diagram.discussionQuestions.length,
        3,
        `Diagram ${diagram.id} must have exactly 3 discussion questions`
      );

      for (const part of diagram.parts) {
        assert.ok(part.name.trim().length > 0, `Part in ${diagram.id} has empty name`);
        assert.ok(part.function.trim().length > 15, `Part ${part.id} has insufficient function text`);
        assert.ok(part.details.trim().length > 30, `Part ${part.id} has insufficient details text`);
        assert.ok(part.teachingTip.trim().length > 20, `Part ${part.id} has insufficient teaching tip`);
      }
    }
  });

  it("ensures simple-electric-circuit supports circuit toggle", () => {
    const circuit = VISUAL_KIT_DIAGRAMS.find((d) => d.id === "simple-electric-circuit");
    assert.ok(circuit);
    assert.equal(circuit.supportsCircuitToggle, true);
  });

  it("strictly prohibits forbidden SVG attributes and non-numeric geometry", () => {
    const validateShape = (shape: Shape, diagramId: string) => {
      // Must not contain script or event handler props
      const keys = Object.keys(shape);
      for (const k of keys) {
        assert.ok(
          !k.startsWith("on"),
          `Diagram ${diagramId} contains forbidden event handler attribute ${k}`
        );
      }
      assert.notEqual(
        (shape.type as string).toLowerCase(),
        "foreignobject",
        `Diagram ${diagramId} contains forbidden foreignObject tag`
      );

      // Verify numeric coordinates
      if (shape.x !== undefined) assert.ok(!Number.isNaN(shape.x));
      if (shape.y !== undefined) assert.ok(!Number.isNaN(shape.y));
      if (shape.cx !== undefined) assert.ok(!Number.isNaN(shape.cx));
      if (shape.cy !== undefined) assert.ok(!Number.isNaN(shape.cy));
      if (shape.r !== undefined) assert.ok(!Number.isNaN(shape.r));
      if (shape.width !== undefined) assert.ok(!Number.isNaN(shape.width));
      if (shape.height !== undefined) assert.ok(!Number.isNaN(shape.height));
    };

    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      for (const deco of diagram.decorations) {
        validateShape(deco, diagram.id);
      }
      for (const part of diagram.parts) {
        const shapes = Array.isArray(part.shape) ? part.shape : [part.shape];
        for (const s of shapes) {
          validateShape(s, diagram.id);
        }
      }
    }
  });
});

describe("Visual Kit - Labeling Rules, Shuffling & Scoring", () => {
  const heartDiagram = VISUAL_KIT_DIAGRAMS.find((d) => d.id === "human-heart")!;

  it("shuffles part names in standard mode without duplicates or size change", () => {
    const bank = shufflePartNames(heartDiagram.parts, { hardMode: false });
    assert.equal(bank.length, heartDiagram.parts.length);

    const originalNames = new Set(heartDiagram.parts.map((p) => p.name));
    for (const name of bank) {
      assert.ok(originalNames.has(name));
    }
    assert.equal(new Set(bank).size, heartDiagram.parts.length);
  });

  it("adds exactly 2 distractors in hard mode without duplicate names", () => {
    const bank = shufflePartNames(heartDiagram.parts, {
      hardMode: true,
      area: heartDiagram.area,
    });

    assert.equal(bank.length, heartDiagram.parts.length + 2);
    assert.equal(
      new Set(bank).size,
      bank.length,
      "Hard mode word bank must not contain duplicate names"
    );
  });

  it("correctly scores empty, partial, and perfect answer sets", () => {
    const parts = heartDiagram.parts;

    // 1. Empty answers
    const emptyScore = scoreLabelingAnswers({}, parts);
    assert.equal(emptyScore.score, 0);
    assert.equal(emptyScore.total, parts.length);
    assert.equal(emptyScore.percentage, 0);
    assert.equal(emptyScore.isComplete, false);

    // 2. Partial correct answers
    const halfAnswers: Record<string, string> = {};
    for (let i = 0; i < 5; i++) {
      halfAnswers[parts[i].id] = parts[i].name;
    }
    // Add 1 incorrect
    halfAnswers[parts[5].id] = "Wrong Answer";

    const partialScore = scoreLabelingAnswers(halfAnswers, parts);
    assert.equal(partialScore.score, 5);
    assert.equal(partialScore.total, parts.length);
    assert.equal(partialScore.isComplete, false);
    assert.equal(partialScore.results[parts[0].id], true);
    assert.equal(partialScore.results[parts[5].id], false);

    // 3. Perfect answers with case-insensitivity and trim
    const perfectAnswers: Record<string, string> = {};
    for (const p of parts) {
      perfectAnswers[p.id] = `  ${p.name.toUpperCase()}  `;
    }
    const perfectScore = scoreLabelingAnswers(perfectAnswers, parts);
    assert.equal(perfectScore.score, parts.length);
    assert.equal(perfectScore.percentage, 100);
    assert.equal(perfectScore.isComplete, true);
  });

  it("serializes and deserializes best scores with schema fallback safety", () => {
    const payload = {
      version: 1,
      scores: {
        "human-heart": {
          score: 13,
          total: 13,
          percentage: 100,
          completedAt: "2026-11-06T00:00:00.000Z",
        },
      },
    };

    const serialized = serializeBestScores(payload);
    const deserialized = deserializeBestScores(serialized);
    assert.deepEqual(deserialized, payload);

    // Malformed JSON handling
    assert.deepEqual(deserializeBestScores(null), { version: 1, scores: {} });
    assert.deepEqual(deserializeBestScores(""), { version: 1, scores: {} });
    assert.deepEqual(deserializeBestScores("invalid-json"), {
      version: 1,
      scores: {},
    });
  });
});

