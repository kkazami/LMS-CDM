import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { VISUAL_KIT_DIAGRAMS } from "../data";
import {
  calculateMinAnchorDistance,
  deserializeBestScores,
  getDistance,
  parseVisualKitTopic,
  scoreLabelingAnswers,
  serializeBestScores,
  shufflePartNames,
} from "../rules";
import {
  getVisualKitTopicTheme,
  DEFAULT_VISUAL_KIT_THEME,
} from "../topic-themes";
import { sampleShapePoints } from "../../ict-lab/particle-shapes";
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
      "human-heart": 11,
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

  it("ensures all hotspot anchors are within valid percent bounds (5% to 95%)", () => {
    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      for (const part of diagram.parts) {
        assert.ok(
          part.anchor.x >= 5 && part.anchor.x <= 95,
          `Anchor x out of percent bounds in ${diagram.id} for ${part.id}: ${part.anchor.x}%`
        );
        assert.ok(
          part.anchor.y >= 5 && part.anchor.y <= 95,
          `Anchor y out of percent bounds in ${diagram.id} for ${part.id}: ${part.anchor.y}%`
        );
      }
    }
  });

  it("passes anchor spacing quality check: pairwise Euclidean distance >= 6% on image canvas", () => {
    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      const minDist = calculateMinAnchorDistance(diagram);
      assert.ok(
        minDist >= 6,
        `Diagram ${diagram.id} min anchor distance ${minDist.toFixed(2)}% is less than 6%!`
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

  it("verifies illustration attribution metadata meets licensing requirements (Public Domain, CC0, CC BY)", () => {
    const allowedLicenses = ["Public domain", "CC0", "CC BY 3.0", "CC BY 4.0"];
    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      assert.ok(diagram.attribution, `Diagram ${diagram.id} must have attribution`);
      const attr = diagram.attribution;
      assert.ok(attr.sourceTitle.trim().length > 0);
      assert.ok(attr.author.trim().length > 0);
      if (attr.licenseName) {
        assert.ok(
          allowedLicenses.includes(attr.licenseName),
          `License ${attr.licenseName} for ${diagram.id} is not an allowed permissive license (Public Domain, CC0, CC BY)`
        );
        assert.ok(!attr.licenseName.includes("SA"), "CC BY-SA is strictly disallowed");
        assert.ok(!attr.licenseName.includes("NC"), "CC BY-NC is strictly disallowed");
        assert.ok(attr.sourceUrl && attr.sourceUrl.startsWith("http"));
        assert.ok(attr.licenseUrl && attr.licenseUrl.startsWith("http"));
      } else {
        assert.strictEqual(
          attr.author,
          "Original illustration by the CdM LMS team.",
          `Original drawings without external license must specify LMS team authorship`
        );
      }
    }
  });

  it("scans every static SVG in public/visual-kit/ for prohibited script, foreignObject, on*, or external url tags", () => {
    const publicDir = path.resolve(process.cwd(), "public/visual-kit");
    if (!fs.existsSync(publicDir)) return;

    const files = fs.readdirSync(publicDir).filter((f) => f.endsWith(".svg"));
    // If no static SVGs are present in public/visual-kit (now that illustrations are webp), test safely passes
    if (files.length === 0) return;

    for (const file of files) {
      const fullPath = path.join(publicDir, file);
      const content = fs.readFileSync(fullPath, "utf8");

      assert.ok(!/<script/i.test(content), `${file} must not contain <script>`);
      assert.ok(!/<foreignObject/i.test(content), `${file} must not contain <foreignObject>`);
      assert.ok(!/\son[a-z]+=/i.test(content), `${file} must not contain on* event handlers`);
      assert.ok(!/@import/i.test(content), `${file} must not contain CSS @import`);
      assert.ok(!/url\(\s*['"]?https?:/i.test(content), `${file} must not contain external url()`);

      // Verify href and xlink:href only reference local internal fragments (#id)
      const hrefMatches = content.match(/(?:href|xlink:href)=["']([^"']+)["']/gi) || [];
      for (const h of hrefMatches) {
        const val = h.split("=")[1].replace(/["']/g, "");
        assert.ok(
          val.startsWith("#") || val.startsWith("data:"),
          `${file} contains non-fragment href: ${h}`
        );
      }
    }
  });

  it("ensures image diagrams with printed labels define valid cover boxes strictly bounded within 0% to 100%", () => {
    // Diagrams with printed textbook/source labels that require concealing in Label It mode
    const diagramsNeedingCovers = ["water-cycle"];

    for (const diagramId of diagramsNeedingCovers) {
      const diagram = VISUAL_KIT_DIAGRAMS.find((d) => d.id === diagramId);
      assert.ok(diagram, `Diagram ${diagramId} must exist`);
      assert.ok(
        diagram.coverBoxes && diagram.coverBoxes.length > 0,
        `Diagram ${diagramId} must have at least one coverBox defined`
      );

      for (let i = 0; i < diagram.coverBoxes.length; i++) {
        const box = diagram.coverBoxes[i];
        assert.ok(
          box.x >= 0 && box.x <= 100,
          `Diagram ${diagramId} box ${i} (${box.label ?? ""}) x must be within 0-100: got ${box.x}`
        );
        assert.ok(
          box.y >= 0 && box.y <= 100,
          `Diagram ${diagramId} box ${i} (${box.label ?? ""}) y must be within 0-100: got ${box.y}`
        );
        assert.ok(
          box.w > 0 && box.w <= 100,
          `Diagram ${diagramId} box ${i} (${box.label ?? ""}) w must be within (0, 100]: got ${box.w}`
        );
        assert.ok(
          box.h > 0 && box.h <= 100,
          `Diagram ${diagramId} box ${i} (${box.label ?? ""}) h must be within (0, 100]: got ${box.h}`
        );
        assert.ok(
          box.x + box.w <= 100.1,
          `Diagram ${diagramId} box ${i} (${box.label ?? ""}) exceeds horizontal bounds: x+w=${box.x + box.w}`
        );
        assert.ok(
          box.y + box.h <= 100.1,
          `Diagram ${diagramId} box ${i} (${box.label ?? ""}) exceeds vertical bounds: y+h=${box.y + box.h}`
        );
      }
    }
  });

  it("validates extraStructures glossary integrity on human-heart diagram: exactly 9 entries with valid definitions", () => {
    const heart = VISUAL_KIT_DIAGRAMS.find((d) => d.id === "human-heart")!;
    assert.ok(
      !heart.coverBoxes || heart.coverBoxes.length === 0,
      "Expected heart to have no coverBoxes"
    );
    assert.ok(
      !heart.labelTargets || heart.labelTargets.length === 0,
      "Expected heart to have no labelTargets"
    );
    assert.ok(
      heart.extraStructures && heart.extraStructures.length === 9,
      "Expected exactly 9 extra structures on human-heart"
    );

    const extraIds = new Set(heart.extraStructures.map((e) => e.id));
    assert.equal(
      extraIds.size,
      heart.extraStructures.length,
      "Extra structure IDs must be unique"
    );
    for (const extra of heart.extraStructures) {
      assert.ok(extra.id.trim().length > 0, "Extra id must not be empty");
      assert.ok(extra.name.trim().length > 0, "Extra name must not be empty");
      assert.ok(
        extra.definition.trim().length > 10,
        `Extra ${extra.id} definition must be informative`
      );
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

  it("normalizes and validates topic query parameters with alias fallback support", () => {
    // Canonical topic IDs
    assert.equal(
      parseVisualKitTopic("human-heart", VISUAL_KIT_DIAGRAMS),
      "human-heart"
    );
    assert.equal(
      parseVisualKitTopic("  HUMAN-HEART  ", VISUAL_KIT_DIAGRAMS),
      "human-heart"
    );
    assert.equal(
      parseVisualKitTopic("digestive-system", VISUAL_KIT_DIAGRAMS),
      "digestive-system"
    );
    assert.equal(
      parseVisualKitTopic("animal-cell", VISUAL_KIT_DIAGRAMS),
      "animal-cell"
    );
    assert.equal(
      parseVisualKitTopic("plant-photosynthesis", VISUAL_KIT_DIAGRAMS),
      "plant-photosynthesis"
    );
    assert.equal(
      parseVisualKitTopic("water-cycle", VISUAL_KIT_DIAGRAMS),
      "water-cycle"
    );
    assert.equal(
      parseVisualKitTopic("simple-electric-circuit", VISUAL_KIT_DIAGRAMS),
      "simple-electric-circuit"
    );

    // Aliases
    assert.equal(
      parseVisualKitTopic("plant", VISUAL_KIT_DIAGRAMS),
      "plant-photosynthesis"
    );
    assert.equal(
      parseVisualKitTopic("circuit", VISUAL_KIT_DIAGRAMS),
      "simple-electric-circuit"
    );

    // Fallbacks to null (Hub view)
    assert.equal(parseVisualKitTopic(null, VISUAL_KIT_DIAGRAMS), null);
    assert.equal(parseVisualKitTopic(undefined, VISUAL_KIT_DIAGRAMS), null);
    assert.equal(parseVisualKitTopic("", VISUAL_KIT_DIAGRAMS), null);
    assert.equal(parseVisualKitTopic("   ", VISUAL_KIT_DIAGRAMS), null);
    assert.equal(parseVisualKitTopic("garbage", VISUAL_KIT_DIAGRAMS), null);
    assert.equal(parseVisualKitTopic("unknown-diagram", VISUAL_KIT_DIAGRAMS), null);
  });
});

describe("Visual Kit - Hub Particle Logo Themes & Normalized Shapes", () => {
  const hexRegex = /^#[0-9a-fA-F]{6}$/;

  it("ensures every diagram id in data.ts has a topic theme with valid hex accents and non-empty shape", () => {
    assert.equal(VISUAL_KIT_DIAGRAMS.length, 6);

    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      const theme = getVisualKitTopicTheme(diagram.id);
      assert.ok(theme, `Theme must exist for diagram id ${diagram.id}`);
      assert.equal(theme.id, diagram.id);

      // Accent color hex verification
      assert.match(
        theme.accentDark,
        hexRegex,
        `accentDark must be valid hex for ${diagram.id}`
      );
      assert.match(
        theme.accentLight,
        hexRegex,
        `accentLight must be valid hex for ${diagram.id}`
      );

      // RGB components verification
      assert.equal(theme.accentRgb.length, 3);
      for (const c of theme.accentRgb) {
        assert.ok(Number.isInteger(c) && c >= 0 && c <= 255);
      }

      // Non-empty normalized shape primitives
      assert.ok(
        theme.shape.primitives.length >= 5,
        `Shape for ${diagram.id} must have at least 5 primitives`
      );

      // Verify all primitive coordinates are bounded in [0, 1]
      for (const p of theme.shape.primitives) {
        if (p.type === "line") {
          assert.ok(p.x1 >= 0 && p.x1 <= 1, `line x1 out of bounds for ${diagram.id}`);
          assert.ok(p.y1 >= 0 && p.y1 <= 1, `line y1 out of bounds for ${diagram.id}`);
          assert.ok(p.x2 >= 0 && p.x2 <= 1, `line x2 out of bounds for ${diagram.id}`);
          assert.ok(p.y2 >= 0 && p.y2 <= 1, `line y2 out of bounds for ${diagram.id}`);
        } else if (p.type === "rect") {
          assert.ok(p.x >= 0 && p.x <= 1, `rect x out of bounds for ${diagram.id}`);
          assert.ok(p.y >= 0 && p.y <= 1, `rect y out of bounds for ${diagram.id}`);
          assert.ok(p.w > 0 && p.x + p.w <= 1, `rect width out of bounds for ${diagram.id}`);
          assert.ok(p.h > 0 && p.y + p.h <= 1, `rect height out of bounds for ${diagram.id}`);
        } else if (p.type === "circle") {
          assert.ok(p.cx >= 0 && p.cx <= 1, `circle cx out of bounds for ${diagram.id}`);
          assert.ok(p.cy >= 0 && p.cy <= 1, `circle cy out of bounds for ${diagram.id}`);
          assert.ok(p.r > 0 && p.r <= 0.5, `circle radius out of bounds for ${diagram.id}`);
        }
      }
    }
  });

  it("deterministically samples exactly N points within [0, 1] bounds for every topic shape", () => {
    const counts = [60, 120, 140];

    for (const diagram of VISUAL_KIT_DIAGRAMS) {
      const theme = getVisualKitTopicTheme(diagram.id);

      for (const count of counts) {
        const pointsA = sampleShapePoints(theme.shape, count);
        const pointsB = sampleShapePoints(theme.shape, count);

        assert.equal(
          pointsA.length,
          count,
          `sampleShapePoints must return exactly ${count} points for ${diagram.id}`
        );

        // Determinism test
        assert.deepEqual(
          pointsA,
          pointsB,
          `Sampling must be deterministic for ${diagram.id}`
        );

        // Bounds test
        for (const pt of pointsA) {
          assert.ok(
            pt.x >= 0 && pt.x <= 1,
            `Point X ${pt.x} outside [0, 1] for ${diagram.id}`
          );
          assert.ok(
            pt.y >= 0 && pt.y <= 1,
            `Point Y ${pt.y} outside [0, 1] for ${diagram.id}`
          );
        }
      }
    }
  });

  it("safely falls back to default theme for unknown or missing diagram ids", () => {
    const unknownTheme = getVisualKitTopicTheme("non-existent-topic");
    assert.equal(unknownTheme.id, DEFAULT_VISUAL_KIT_THEME.id);
    assert.match(unknownTheme.accentDark, hexRegex);
    assert.ok(unknownTheme.shape.primitives.length > 0);

    const nullTheme = getVisualKitTopicTheme(null);
    assert.equal(nullTheme.id, DEFAULT_VISUAL_KIT_THEME.id);

    const undefinedTheme = getVisualKitTopicTheme(undefined);
    assert.equal(undefinedTheme.id, DEFAULT_VISUAL_KIT_THEME.id);

    // Verify fallback points sample safely
    const points = sampleShapePoints(nullTheme.shape, 120);
    assert.equal(points.length, 120);
  });
});
