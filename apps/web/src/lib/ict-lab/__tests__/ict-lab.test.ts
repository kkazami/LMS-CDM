import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateIctLabAccess, isEligibleForIctLabSidebar } from "../guard";
import { loadHardwarePartsData, loadLanCableData } from "../data-loader";
import {
  MAX_PLAYGROUND_BYTES,
  PLAYGROUND_IFRAME_CSP,
  PLAYGROUND_POSTMESSAGE_SOURCE,
  HARDWARE_PART_BOUNDING_BOXES,
  findOverlappingBoundingBoxes,
  assertAllHardwarePartsHaveSvgDrawing,
  buildLanToolImageAlt,
  buildPlaygroundSrcdoc,
  classifyIteProgram,
  computeProjectByteSize,
  createInitialLanToolPreviewState,
  generateHardwareQuizQuestions,
  getLanToolPreviewNeighbors,
  getNextTrappedFocusIndex,
  isBecedProgram,
  isBeedProgram,
  isBsedScienceProgram,
  isBtledIctProgram,
  parseIctModule,
  reduceLanToolPreviewState,
  simulateCableTester,
  validatePreviewMessageEvent,
} from "../rules";
import { PLAYGROUND_EXAMPLES, DEFAULT_EXAMPLE } from "../examples";
import { HARDWARE_SVG_PART_IDS } from "../../../components/ict-lab/HardwareExplorerTab";
import {
  ICT_MODULE_THEMES,
  sampleShapePoints,
  CODE_PLAYGROUND_SHAPE,
  HARDWARE_EXPLORER_SHAPE,
  LAN_CABLE_GUIDE_SHAPE,
} from "../particle-shapes";
import {
  stepParticles,
  isSettled,
  type ParticleState,
  type TargetPoint,
} from "../particle-physics";
import {
  createInitialHoverState,
  nextHoverState,
  LEAVE_GRACE_PERIOD_MS,
  type HoverMachineState,
} from "../hover-machine";
import { ICT_LAB_MODULE_IDS } from "../types";

describe("BTLED ICT Lab - Access Guard", () => {
  it("allows only ITE students in the BTLEd ICT program and denies ITE instructors, admins, and non-BTLED ITE students", async () => {
    const instructorDecision = await evaluateIctLabAccess({
      userId: "inst-1",
      userRole: "PROFESSOR",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ isBtledIct: false, programCode: null }),
    });
    assert.equal(instructorDecision.allowed, false);
    assert.equal(instructorDecision.reason, "NOT_STUDENT");

    const adminDecision = await evaluateIctLabAccess({
      userId: "admin-1",
      userRole: "ADMIN",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ isBtledIct: false, programCode: null }),
    });
    assert.equal(adminDecision.allowed, false);
    assert.equal(adminDecision.reason, "NOT_STUDENT");

    const becedStudentDecision = await evaluateIctLabAccess({
      userId: "stu-beced",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ isBtledIct: false, programCode: "BECEd" }),
    });
    assert.equal(becedStudentDecision.allowed, false);
    assert.equal(becedStudentDecision.reason, "NOT_BTLED_ICT");

    const btledStudentDecision = await evaluateIctLabAccess({
      userId: "stu-btled",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ isBtledIct: true, programCode: "BTLEd ICT" }),
    });
    assert.equal(btledStudentDecision.allowed, true);
    assert.equal(btledStudentDecision.role, "STUDENT");
    assert.equal(btledStudentDecision.programCode, "BTLEd ICT");
  });

  it("denies non-ITE users and non-ITE routes", async () => {
    const icsUserOnIteRoute = await evaluateIctLabAccess({
      userId: "stu-ics",
      userRole: "STUDENT",
      userInstituteCode: "ics",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ isBtledIct: true, programCode: "BTLEd ICT" }),
    });
    assert.equal(icsUserOnIteRoute.allowed, false);
    assert.equal(icsUserOnIteRoute.reason, "NOT_ITE_USER");

    const ibeUserOnIteRoute = await isEligibleForIctLabSidebar({
      userId: "stu-ibe",
      userRole: "STUDENT",
      userInstituteCode: "ibe",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ isBtledIct: true, programCode: "BTLEd ICT" }),
    });
    assert.equal(ibeUserOnIteRoute, false);

    const iteUserOnIcsRoute = await evaluateIctLabAccess({
      userId: "stu-ite",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ics",
      resolveStudentProgram: async () => ({ isBtledIct: true, programCode: "BTLEd ICT" }),
    });
    assert.equal(iteUserOnIcsRoute.allowed, false);
    assert.equal(iteUserOnIcsRoute.reason, "NOT_ITE_ROUTE");
  });
});

describe("BTLED ICT Lab - ITE Program Matchers", () => {
  it("matches exact prisma/seed.ts program codes and names for BTLEd ICT, BECEd, BEEd, and BSEd Science", () => {
    assert.equal(isBtledIctProgram("BTLEd ICT"), true);
    assert.equal(
      isBtledIctProgram("Bachelor of Technology and Livelihood Education Major in ICT"),
      true
    );
    assert.equal(isBtledIctProgram("BECEd"), false);
    assert.equal(isBtledIctProgram("BEEd"), false);
    assert.equal(isBtledIctProgram("BSEd SCIENCE"), false);

    assert.equal(isBecedProgram("BECEd"), true);
    assert.equal(isBecedProgram("Bachelor of Early Childhood Education"), true);

    assert.equal(isBeedProgram("BEEd"), true);
    assert.equal(isBeedProgram("Bachelor of Elementary Education"), true);

    assert.equal(isBsedScienceProgram("BSEd SCIENCE"), true);
    assert.equal(
      isBsedScienceProgram("Bachelor of Secondary Education Major in Science"),
      true
    );

    assert.equal(classifyIteProgram("BTLEd ICT"), "BTLED_ICT");
    assert.equal(classifyIteProgram("BECEd"), "BECED");
    assert.equal(classifyIteProgram("BEEd"), "BEED");
    assert.equal(classifyIteProgram("BSEd SCIENCE"), "BSED_SCIENCE");
  });
});

describe("BTLED ICT Lab - Code Playground Practice Sandbox & postMessage Security", () => {
  it("enforces 100 KB total size cap and computes UTF-8 byte length correctly", () => {
    assert.equal(computeProjectByteSize("", "", ""), 0);
    const smallSize = computeProjectByteSize("<h1>Hi</h1>", "body{}", "console.log(1)");
    assert.ok(smallSize > 0 && smallSize < MAX_PLAYGROUND_BYTES);
    assert.equal(MAX_PLAYGROUND_BYTES, 100 * 1024);

    const oversizedString = "x".repeat(MAX_PLAYGROUND_BYTES + 1);
    assert.ok(computeProjectByteSize(oversizedString, "", "") > MAX_PLAYGROUND_BYTES);
  });

  it("provides 4 static starter snippets that have html, css, and js and remain under the size cap", () => {
    assert.equal(PLAYGROUND_EXAMPLES.length, 4);
    assert.ok(DEFAULT_EXAMPLE);
    assert.equal(DEFAULT_EXAMPLE.id, "hello-world");

    const expectedIds = ["hello-world", "button-counter", "css-card", "loop-array"];
    for (const ex of PLAYGROUND_EXAMPLES) {
      assert.ok(expectedIds.includes(ex.id), `Unexpected snippet id ${ex.id}`);
      assert.ok(typeof ex.title === "string" && ex.title.length > 0);
      assert.ok(typeof ex.description === "string" && ex.description.length > 0);
      assert.ok(typeof ex.html === "string");
      assert.ok(typeof ex.css === "string");
      assert.ok(typeof ex.js === "string");

      const size = computeProjectByteSize(ex.html, ex.css, ex.js);
      assert.ok(size < MAX_PLAYGROUND_BYTES, `Example ${ex.id} exceeds size limit: ${size} bytes`);
      assert.ok(size > 0, `Example ${ex.id} must have non-empty content`);
    }
  });

  it("validates postMessage source strictly against iframe.contentWindow and formats plain text", () => {
    const fakeIframeWindow = { name: "preview-frame" };
    const otherWindow = { name: "attacker-frame" };

    // Wrong source window -> rejected
    const spoofed = validatePreviewMessageEvent(
      {
        source: otherWindow,
        data: {
          source: PLAYGROUND_POSTMESSAGE_SOURCE,
          level: "log",
          args: ["hello"],
        },
      },
      fakeIframeWindow
    );
    assert.equal(spoofed, null);

    // Matching source window + structured payload -> accepted as plain text
    const valid = validatePreviewMessageEvent(
      {
        source: fakeIframeWindow,
        data: {
          source: PLAYGROUND_POSTMESSAGE_SOURCE,
          level: "warn",
          args: ["<img src=x onerror=alert(1)>", { count: 2 }],
          timestamp: 123456,
        },
      },
      fakeIframeWindow
    );
    assert.notEqual(valid, null);
    assert.equal(valid?.level, "warn");
    assert.equal(valid?.text, '<img src=x onerror=alert(1)> {"count":2}');

    // Opaque origin "null" from sandbox="allow-scripts" iframe -> accepted
    const validWithNullOrigin = validatePreviewMessageEvent(
      {
        source: fakeIframeWindow,
        origin: "null",
        data: {
          source: PLAYGROUND_POSTMESSAGE_SOURCE,
          level: "error",
          args: ["Uncaught ReferenceError: foo is not defined"],
          timestamp: 123457,
        },
      },
      fakeIframeWindow
    );
    assert.notEqual(validWithNullOrigin, null);
    assert.equal(validWithNullOrigin?.level, "error");
    assert.equal(validWithNullOrigin?.text, "Uncaught ReferenceError: foo is not defined");

    // Malicious untrusted origin -> rejected
    const rejectedUntrustedOrigin = validatePreviewMessageEvent(
      {
        source: fakeIframeWindow,
        origin: "https://malicious-site.com",
        data: {
          source: PLAYGROUND_POSTMESSAGE_SOURCE,
          level: "log",
          args: ["spoofed message"],
        },
      },
      fakeIframeWindow
    );
    assert.equal(rejectedUntrustedOrigin, null);
  });

  it("builds srcdoc with restrictive Content-Security-Policy meta tag and console error bridge", () => {
    const doc = buildPlaygroundSrcdoc("<h1>Hi</h1>", "body{}", "console.log(1)");
    assert.ok(doc.includes(PLAYGROUND_IFRAME_CSP));
    assert.ok(doc.includes("window.__cdmReportError"));
    assert.ok(doc.indexOf("<script>\n(function()") < doc.indexOf("<script>\ntry {"));
  });

  it("generates preview srcdoc with unescaped student JavaScript placed after HTML body, bridge loaded before, and inline script CSP", () => {
    const studentHtml = '<h1>Hi</h1><button id="plus">Add</button><p id="msg"></p>';
    const studentJs =
      'let count=0; document.getElementById("plus").addEventListener("click",()=>{count++;document.getElementById("msg").textContent="Count: "+count;console.log("count =",count);}); console.log("Script loaded");';

    // 1. Without nonce (standard / standalone)
    const doc = buildPlaygroundSrcdoc(studentHtml, "body { margin: 0; }", studentJs, 42);

    // CSP permits inline scripts and keeps default-src 'none' (no network access)
    assert.ok(doc.includes("default-src 'none'"));
    assert.ok(doc.includes("script-src 'unsafe-inline'"));
    assert.ok(doc.includes("style-src 'unsafe-inline'"));

    // Bridge script exists in <head> before student code
    const bridgeIndex = doc.indexOf('var SOURCE = "cdm-ict-playground";');
    const htmlBodyIndex = doc.indexOf(studentHtml);
    const studentJsIndex = doc.indexOf(studentJs);

    assert.ok(bridgeIndex !== -1, "Bridge script must be present");
    assert.ok(htmlBodyIndex !== -1, "Student HTML markup must be present");
    assert.ok(studentJsIndex !== -1, "Student JS code must be present in unescaped form");

    // Execution order: Bridge in <head> -> HTML body elements -> Student script
    assert.ok(bridgeIndex < htmlBodyIndex, "Bridge script must load before HTML elements");
    assert.ok(htmlBodyIndex < studentJsIndex, "Student script must be placed after HTML body elements");

    // Student code is embedded unescaped inside <script>
    assert.ok(doc.includes(`<script>\ntry {\n${studentJs}\n} catch (__err)`));

    // 2. With request nonce (Next.js strict-dynamic CSP compatibility)
    const docWithNonce = buildPlaygroundSrcdoc(studentHtml, "", studentJs, 43, "test-nonce-xyz");
    assert.ok(docWithNonce.includes('nonce="test-nonce-xyz"'));
    assert.ok(docWithNonce.includes("'nonce-test-nonce-xyz'"));
    assert.ok(docWithNonce.includes(`<script nonce="test-nonce-xyz">\ntry {\n${studentJs}`));
  });
});

describe("BTLED ICT Lab - Hardware Explorer Data & SVG Completeness", () => {
  it("verifies all 12 parts in hardware-parts.json have matching SVG drawing IDs", () => {
    const hw = loadHardwarePartsData();
    assert.equal(hw.parts.length, 12);

    // Must not throw when all 12 SVG part IDs are provided
    assert.doesNotThrow(() => {
      assertAllHardwarePartsHaveSvgDrawing(hw.parts, HARDWARE_SVG_PART_IDS);
    });

    // Must throw loudly if any part ID is missing from the SVG set
    assert.throws(() => {
      assertAllHardwarePartsHaveSvgDrawing(
        hw.parts,
        HARDWARE_SVG_PART_IDS.filter((id) => id !== "cmos-battery")
      );
    }, /cmos-battery/);
  });

  it("ensures no two discrete component hit areas overlap in the 2D diagram", () => {
    const overlaps = findOverlappingBoundingBoxes(HARDWARE_PART_BOUNDING_BOXES);
    assert.deepEqual(overlaps, [], `Overlapping parts detected: ${JSON.stringify(overlaps)}`);
  });

  it("ensures every part id in hardware-parts.json has a valid rendered hit area with non-zero dimensions", () => {
    const hw = loadHardwarePartsData();
    const boxMap = new Map(HARDWARE_PART_BOUNDING_BOXES.map((b) => [b.id, b]));
    for (const part of hw.parts) {
      const box = boxMap.get(part.id);
      assert.ok(box, `Part ${part.id} must have a defined bounding box`);
      assert.ok(box.width > 0, `Part ${part.id} must have positive width`);
      assert.ok(box.height > 0, `Part ${part.id} must have positive height`);
    }
  });

  it("generates 10 quiz questions from hardware-parts.json for both quiz modes", () => {
    const hw = loadHardwarePartsData();
    const clickRound = generateHardwareQuizQuestions(hw.parts, "CLICK_THE_PART", 10);
    assert.equal(clickRound.length, 10);
    assert.equal(clickRound[0]?.options.length, 0);

    const nameRound = generateHardwareQuizQuestions(hw.parts, "NAME_THE_PART", 10);
    assert.equal(nameRound.length, 10);
    for (const q of nameRound) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options.includes(q.partName));
    }
  });
});

describe("BTLED ICT Lab - LAN Cable Tester Classification", () => {
  const lanData = loadLanCableData();
  const t568aWires = lanData.standards.find((s) => s.id === "T568A")!.pins.map((p) => p.wire);
  const t568bWires = lanData.standards.find((s) => s.id === "T568B")!.pins.map((p) => p.wire);

  it("classifies T568B+T568B and T568A+T568A as straight-through", () => {
    const resB = simulateCableTester({
      endAPins: t568bWires,
      endBPins: t568bWires,
      cableTypes: lanData.cableTypes,
      faults: lanData.faults,
    });
    assert.equal(resB.classification, "straight-through");
    assert.equal(resB.wrongPins.length, 0);
    assert.equal(resB.steps.map((s) => s.mappingLabel).join(","), "1-1,2-2,3-3,4-4,5-5,6-6,7-7,8-8");

    const resA = simulateCableTester({
      endAPins: t568aWires,
      endBPins: t568aWires,
      cableTypes: lanData.cableTypes,
      faults: lanData.faults,
    });
    assert.equal(resA.classification, "straight-through");
  });

  it("classifies T568A+T568B as crossover", () => {
    const resCross = simulateCableTester({
      endAPins: t568aWires,
      endBPins: t568bWires,
      cableTypes: lanData.cableTypes,
      faults: lanData.faults,
    });
    assert.equal(resCross.classification, "crossover");
    assert.equal(resCross.wrongPins.length, 0);
    assert.equal(
      resCross.steps.map((s) => s.mappingLabel).join(","),
      "1-3,2-6,3-1,4-4,5-5,6-2,7-7,8-8"
    );
  });

  it("classifies swapped wires as miswire and lists the wrong pins", () => {
    const miswiredEndB = [...t568bWires];
    // Swap pins 1 and 2 on End B
    const tmp = miswiredEndB[0]!;
    miswiredEndB[0] = miswiredEndB[1]!;
    miswiredEndB[1] = tmp;

    const resMiswire = simulateCableTester({
      endAPins: t568bWires,
      endBPins: miswiredEndB,
      cableTypes: lanData.cableTypes,
      faults: lanData.faults,
    });
    assert.equal(resMiswire.classification, "miswire");
    assert.equal(resMiswire.matchedFault?.id, "miswire");
    assert.deepEqual(
      resMiswire.wrongPins.map((w) => w.pinA),
      [1, 2]
    );
  });

  it("classifies an open pin as open and a shorted pair as short", () => {
    const resOpen = simulateCableTester({
      endAPins: t568bWires,
      endBPins: t568bWires,
      openPins: [4],
      cableTypes: lanData.cableTypes,
      faults: lanData.faults,
    });
    assert.equal(resOpen.classification, "open");
    assert.equal(resOpen.matchedFault?.id, "open");
    assert.deepEqual(resOpen.openPins, [4]);

    const resShort = simulateCableTester({
      endAPins: t568bWires,
      endBPins: t568bWires,
      shortedPinPair: [1, 2],
      cableTypes: lanData.cableTypes,
      faults: lanData.faults,
    });
    assert.equal(resShort.classification, "short");
    assert.equal(resShort.matchedFault?.id, "short");
    assert.deepEqual(resShort.shortedPins, [1, 2]);
  });
});

<<<<<<< HEAD
describe("BTLED ICT Lab - Required Tools & Materials Data, SVG Assets & Preview Behavior", () => {
  const lanData = loadLanCableData();
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const webPublicDir = path.resolve(testDir, "../../../../public");

  it("ensures every tool item in lan-cable.json has a non-empty id, name, short description (use), and image path", () => {
    assert.equal(lanData.tools.length, 6);

    const expectedToolNames = [
      "UTP cable",
      "RJ45 connector (plug)",
      "Cable stripper",
      "Cutter or snips",
      "Crimping tool",
      "LAN cable tester",
    ];
    assert.deepEqual(
      lanData.tools.map((t) => t.name),
      expectedToolNames
    );

    const seenIds = new Set<string>();
    const seenImages = new Set<string>();

    for (const tool of lanData.tools) {
      assert.ok(tool.id.trim().length > 0, "Tool id must be non-empty");
      assert.ok(tool.name.trim().length > 0, "Tool name must be non-empty");
      assert.ok(tool.use.trim().length > 0, "Tool short description (use) must be non-empty");
      assert.ok(tool.image.trim().length > 0, "Tool image path must be non-empty");
      assert.ok(
        tool.image.startsWith("/images/ict-lab/tools/"),
        `Tool image path ${tool.image} must be under /images/ict-lab/tools/`
      );

      assert.ok(!seenIds.has(tool.id), `Duplicate tool id: ${tool.id}`);
      seenIds.add(tool.id);

      assert.ok(!seenImages.has(tool.image), `Duplicate tool image: ${tool.image}`);
      seenImages.add(tool.image);

      const altText = buildLanToolImageAlt(tool);
      assert.ok(altText.includes(tool.name));
      assert.ok(altText.includes(tool.use));
    }
  });

  it("verifies every referenced tool image file exists on disk under public/ and is a safe, non-empty SVG", () => {
    for (const tool of lanData.tools) {
      const relativePublicPath = tool.image.replace(/^\/+/, "");
      const diskPath = path.join(webPublicDir, relativePublicPath);
      assert.equal(
        fs.existsSync(diskPath),
        true,
        `Referenced tool image does not exist on disk: ${diskPath}`
      );

      const content = fs.readFileSync(diskPath, "utf8");
      assert.ok(content.trim().length > 100, `SVG file ${tool.image} is empty or too short`);
      assert.ok(content.includes("<svg"), `File ${tool.image} must contain <svg`);
      assert.ok(content.includes("</svg>"), `File ${tool.image} must contain </svg>`);
      assert.equal(/<script\b/i.test(content), false, `SVG ${tool.image} must not contain <script>`);
      assert.equal(
        /<foreignObject\b/i.test(content),
        false,
        `SVG ${tool.image} must not contain <foreignObject>`
      );
      assert.equal(
        /\bon[a-z]+\s*=/i.test(content),
        false,
        `SVG ${tool.image} must not contain inline event handlers`
      );
    }
  });

  it("opens preview on click, cycles Previous/Next across all 6 tools, closes on Esc/X/outside click, and restores focus to the clicked item", () => {
    const total = lanData.tools.length;
    let state = createInitialLanToolPreviewState();
    assert.equal(state.activeIndex, null);

    // Click item index 2 ("Cable stripper") -> opens preview at index 2
    state = reduceLanToolPreviewState(state, { type: "OPEN", index: 2 }, total);
    assert.equal(state.activeIndex, 2);
    assert.equal(state.openedFromIndex, 2);
    assert.equal(state.restoreFocusIndex, null);

    // Next / ArrowRight moves to index 3, then Previous / ArrowLeft moves back to index 2
    state = reduceLanToolPreviewState(state, { type: "NEXT" }, total);
    assert.equal(state.activeIndex, 3);
    assert.equal(state.openedFromIndex, 2, "openedFromIndex stays anchored to the originally clicked item");

    state = reduceLanToolPreviewState(state, { type: "KEYDOWN", key: "ArrowRight" }, total);
    assert.equal(state.activeIndex, 4);

    // Press Escape -> closes preview and restores focus to originally clicked index 2
    state = reduceLanToolPreviewState(state, { type: "KEYDOWN", key: "Escape" }, total);
    assert.equal(state.activeIndex, null);
    assert.equal(state.restoreFocusIndex, 2);

    // Open at index 0 and wrap backwards with PREV to index 5
    state = reduceLanToolPreviewState(state, { type: "OPEN", index: 0 }, total);
    assert.equal(state.activeIndex, 0);
    state = reduceLanToolPreviewState(state, { type: "PREV" }, total);
    assert.equal(state.activeIndex, 5);
    assert.deepEqual(getLanToolPreviewNeighbors(total, 5), {
      prevIndex: 4,
      nextIndex: 0,
    });

    // Backdrop click closes and restores focus to index 0
    state = reduceLanToolPreviewState(state, { type: "BACKDROP_CLICK" }, total);
    assert.equal(state.activeIndex, null);
    assert.equal(state.restoreFocusIndex, 0);

    // Focus trap cycling for Tab and Shift+Tab across 3 dialog buttons (Close, Previous, Next)
    assert.equal(getNextTrappedFocusIndex(0, 3, false), 1);
    assert.equal(getNextTrappedFocusIndex(2, 3, false), 0);
    assert.equal(getNextTrappedFocusIndex(0, 3, true), 2);
    assert.equal(getNextTrappedFocusIndex(1, 3, true), 0);
  });
});

describe("BTLED ICT Lab - Module Query Parameter Parsing", () => {
  it("recognizes canonical module ids regardless of case and trimming", () => {
    assert.equal(parseIctModule("code-playground"), "code-playground");
    assert.equal(parseIctModule("  CODE-PLAYGROUND  "), "code-playground");
    assert.equal(parseIctModule("hardware-explorer"), "hardware-explorer");
    assert.equal(parseIctModule("Hardware-Explorer"), "hardware-explorer");
    assert.equal(parseIctModule("lan-cable-guide"), "lan-cable-guide");
    assert.equal(parseIctModule("LAN-CABLE-GUIDE"), "lan-cable-guide");
  });

  it("safely falls back to null for null, undefined, empty, or unknown query params", () => {
    assert.equal(parseIctModule(null), null);
    assert.equal(parseIctModule(undefined), null);
    assert.equal(parseIctModule(""), null);
    assert.equal(parseIctModule("   "), null);
    assert.equal(parseIctModule("garbage"), null);
    assert.equal(parseIctModule("playground"), null);
    assert.equal(parseIctModule("hardware"), null);
    assert.equal(parseIctModule("cable"), null);
    assert.equal(parseIctModule("unknown-module"), null);
  });
});

describe("BTLED ICT Lab - Particle Shapes & Theme Configurations", () => {
  it("defines distinctive theme configurations and mathematical shapes for all modules", () => {
    for (const moduleId of ICT_LAB_MODULE_IDS) {
      const theme = ICT_MODULE_THEMES[moduleId];
      assert.ok(theme, `Theme config must exist for module ${moduleId}`);
      assert.equal(theme.id, moduleId);
      assert.ok(theme.accentDark.startsWith("#"), "accentDark must be a hex color");
      assert.ok(theme.accentLight.startsWith("#"), "accentLight must be a hex color");
      assert.equal(theme.accentRgb.length, 3, "accentRgb must have 3 components");
      assert.ok(theme.shape.primitives.length >= 3, "Shape must have at least 3 primitives");
      assert.ok(theme.cardBorderHoverClass.length > 0);
      assert.ok(theme.iconContainerClass.length > 0);
      assert.ok(theme.buttonClass.length > 0);
    }

    // Verify distinctive primary colors
    assert.equal(ICT_MODULE_THEMES["code-playground"].accentDark, "#10b981"); // Emerald
    assert.equal(ICT_MODULE_THEMES["hardware-explorer"].accentDark, "#f59e0b"); // Amber
    assert.equal(ICT_MODULE_THEMES["lan-cable-guide"].accentDark, "#06b6d4"); // Cyan
  });

  it("deterministically samples points within [0, 1] space matching exact requested count", () => {
    const testCounts = [10, 50, 140, 180];
    const shapes = [
      { name: "code-playground", shape: CODE_PLAYGROUND_SHAPE },
      { name: "hardware-explorer", shape: HARDWARE_EXPLORER_SHAPE },
      { name: "lan-cable-guide", shape: LAN_CABLE_GUIDE_SHAPE },
    ];

    for (const { name, shape } of shapes) {
      for (const count of testCounts) {
        const points = sampleShapePoints(shape, count);
        assert.equal(
          points.length,
          count,
          `Shape ${name} must produce exactly ${count} points`
        );

        for (const pt of points) {
          assert.ok(
            pt.x >= 0 && pt.x <= 1,
            `Point x=${pt.x} out of [0, 1] in ${name}`
          );
          assert.ok(
            pt.y >= 0 && pt.y <= 1,
            `Point y=${pt.y} out of [0, 1] in ${name}`
          );
        }

        // Must be purely deterministic
        const secondRun = sampleShapePoints(shape, count);
        assert.deepEqual(
          points,
          secondRun,
          `Sampling ${name} must be 100% deterministic`
        );
      }
    }
  });

  it("handles empty shapes or zero counts gracefully", () => {
    assert.deepEqual(sampleShapePoints({ primitives: [] }, 50), []);
    assert.deepEqual(sampleShapePoints(CODE_PLAYGROUND_SHAPE, 0), []);
    assert.deepEqual(sampleShapePoints(CODE_PLAYGROUND_SHAPE, -5), []);
  });
});

describe("BTLED ICT Lab - Particle Physics & Convergence", () => {
  it("converges from a deterministic start to fixed targets within 0.5px after N steps and isSettled becomes true", () => {
    const N = 50;
    let state: ParticleState[] = Array.from({ length: N }, (_, i) => ({
      x: 20 + (i * 7) % 300,
      y: 10 + (i * 11) % 300,
      vx: 0,
      vy: 0,
    }));

    const targets: TargetPoint[] = Array.from({ length: N }, (_, i) => ({
      x: 100 + ((i * 13) % 200),
      y: 80 + ((i * 17) % 200),
    }));

    // Initially not settled
    assert.equal(isSettled(state, targets), false);

    // Run 150 physics steps with canvas bounds
    for (let step = 0; step < 150; step++) {
      state = stepParticles(state, targets, {
        bounds: { width: 400, height: 400 },
      });
    }

    // Every particle must be within 0.5px of its target
    for (let i = 0; i < N; i++) {
      const dist = Math.hypot(state[i].x - targets[i].x, state[i].y - targets[i].y);
      assert.ok(
        dist <= 0.5,
        `Particle ${i} did not converge: distance = ${dist.toFixed(4)}px`
      );
    }

    assert.equal(isSettled(state, targets), true);
  });

  it("converges back to targets without permanent offset after pointer repel is applied and removed", () => {
    const N = 40;
    const targets: TargetPoint[] = Array.from({ length: N }, (_, i) => ({
      x: 150 + i * 2,
      y: 150 + i * 2,
    }));

    let state: ParticleState[] = targets.map((t) => ({ ...t, vx: 0, vy: 0 }));

    // Apply fixed pointer repel right on top of a cluster of particles for 60 steps
    const pointerPos = { x: 180, y: 180 };
    for (let step = 0; step < 60; step++) {
      state = stepParticles(state, targets, {
        pointerPos,
        repelRadius: 60,
        bounds: { width: 400, height: 400 },
      });
    }

    // While pointer is active, particles near (180, 180) are repelled away
    assert.equal(isSettled(state, targets), false);

    // Remove pointer (pointerPos: null) and run 150 steps
    for (let step = 0; step < 150; step++) {
      state = stepParticles(state, targets, {
        pointerPos: null,
        bounds: { width: 400, height: 400 },
      });
    }

    // Must completely recover with zero permanent offset
    for (let i = 0; i < N; i++) {
      const dist = Math.hypot(state[i].x - targets[i].x, state[i].y - targets[i].y);
      assert.ok(
        dist <= 0.5,
        `Particle ${i} retained permanent offset: distance = ${dist.toFixed(4)}px`
      );
    }
    assert.equal(isSettled(state, targets), true);
  });

  it("keeps particles within bounds and prevents directional y-drift during 600 continuous pointer movement steps", () => {
    const N = 50;
    const bounds = { width: 360, height: 420 };
    const targets: TargetPoint[] = Array.from({ length: N }, (_, i) => ({
      x: 80 + (i % 10) * 20,
      y: 100 + Math.floor(i / 10) * 35,
    }));

    let state: ParticleState[] = targets.map((t) => ({ ...t, vx: 0, vy: 0 }));

    let sumYOffsets = 0;

    // Simulate mouse moving back and forth along y for 600 frames
    for (let step = 0; step < 600; step++) {
      const pointerPos = {
        x: 180,
        y: 180 + Math.sin(step * 0.08) * 90,
      };

      state = stepParticles(state, targets, {
        pointerPos,
        repelRadius: 50,
        bounds,
      });

      // No particle must ever leave the canvas bounds
      for (let i = 0; i < N; i++) {
        assert.ok(state[i].x >= 0 && state[i].x <= bounds.width);
        assert.ok(state[i].y >= 0 && state[i].y <= bounds.height);
      }

      // Track mean y offset from target
      const meanYOffset =
        state.reduce((acc, p, idx) => acc + (p.y - targets[idx].y), 0) / N;
      sumYOffsets += meanYOffset;
    }

    // Mean directional drift over 600 steps must be virtually zero (no upward runaway drift)
    const averageDrift = sumYOffsets / 600;
    assert.ok(
      Math.abs(averageDrift) < 1.0,
      `Mean y-drift is too large: ${averageDrift.toFixed(4)}px`
    );
  });

  it("reports isSettled accurately based on both distance threshold and speed threshold", () => {
    const targets: TargetPoint[] = [{ x: 100, y: 100 }, { x: 200, y: 200 }];

    // Perfectly on target and zero velocity
    const settledState: ParticleState[] = [
      { x: 100, y: 100, vx: 0, vy: 0 },
      { x: 200, y: 200, vx: 0, vy: 0 },
    ];
    assert.equal(isSettled(settledState, targets), true);

    // One particle slightly outside distance threshold (0.6px > 0.5px)
    const displacedState: ParticleState[] = [
      { x: 100, y: 100, vx: 0, vy: 0 },
      { x: 200.6, y: 200, vx: 0, vy: 0 },
    ];
    assert.equal(isSettled(displacedState, targets), false);

    // Near target (dist < 0.5px) but still moving fast (speed > 0.02)
    const fastMovingState: ParticleState[] = [
      { x: 100.1, y: 100.1, vx: 0.15, vy: 0 },
      { x: 200, y: 200, vx: 0, vy: 0 },
    ];
    assert.equal(isSettled(fastMovingState, targets), false);

    // Empty list is trivially settled
    assert.equal(isSettled([], []), true);
  });

  it("converges properly when switching targets from logo to resting cluster", () => {
    const N = 40;
    const logoTargets: TargetPoint[] = Array.from({ length: N }, (_, i) => ({
      x: 120 + (i % 8) * 15,
      y: 120 + Math.floor(i / 8) * 20,
    }));
    const restTargets: TargetPoint[] = Array.from({ length: N }, (_, i) => ({
      x: 320 + Math.cos(i) * 25,
      y: 340 + Math.sin(i) * 25,
    }));

    // Start settled on logo targets
    let state: ParticleState[] = logoTargets.map((t) => ({ ...t, vx: 0, vy: 0 }));
    assert.equal(isSettled(state, logoTargets), true);

    // Switch targets to resting cluster and step
    assert.equal(isSettled(state, restTargets), false);

    for (let step = 0; step < 160; step++) {
      state = stepParticles(state, restTargets, {
        bounds: { width: 360, height: 400 },
      });
    }

    // Now settled on resting cluster
    assert.equal(isSettled(state, restTargets), true);
    for (let i = 0; i < N; i++) {
      const dist = Math.hypot(state[i].x - restTargets[i].x, state[i].y - restTargets[i].y);
      assert.ok(dist <= 0.5);
    }
  });
});

describe("BTLED ICT Lab - Hover State Machine & Flicker Immunity", () => {
  it("leave followed by enter within the grace period stays hovered without toggling inactive", () => {
    let state = createInitialHoverState();
    const t0 = 1000;

    // Pointer enters
    state = nextHoverState(state, { type: "pointerenter" }, t0);
    assert.equal(state.isHovered, true);
    assert.equal(state.active, true);
    assert.equal(state.leaveTimerPending, false);

    // Pointer leave fires
    state = nextHoverState(state, { type: "pointerleave", insideRect: false }, t0 + 20);
    assert.equal(state.isHovered, true, "isHovered remains true during grace period");
    assert.equal(state.active, true);
    assert.equal(state.leaveTimerPending, true);

    // Re-enter 40ms later (well within LEAVE_GRACE_PERIOD_MS)
    state = nextHoverState(state, { type: "pointerenter" }, t0 + 60);
    assert.equal(state.isHovered, true);
    assert.equal(state.active, true);
    assert.equal(state.leaveTimerPending, false, "Grace timer is cancelled");
    assert.equal(state.leaveTimestamp, null);
  });

  it("pointercancel while inside bounds does not clear hover (native drag gesture immunity)", () => {
    let state = createInitialHoverState();
    state = nextHoverState(state, { type: "pointerenter" });

    // Native browser dragstart fires pointercancel while cursor is inside card bounds
    state = nextHoverState(state, { type: "pointercancel", insideRect: true });
    assert.equal(state.isHovered, true);
    assert.equal(state.active, true);
    assert.equal(state.leaveTimerPending, false);
  });

  it("leave alone clears hover only after the grace period expires", () => {
    let state = createInitialHoverState();
    const t0 = 2000;
    state = nextHoverState(state, { type: "pointerenter" }, t0);

    // Pointer leaves
    state = nextHoverState(state, { type: "pointerleave", insideRect: false }, t0 + 10);
    assert.equal(state.isHovered, true);
    assert.equal(state.leaveTimerPending, true);

    // Grace timer triggers after 100ms
    state = nextHoverState(state, { type: "grace_timeout" }, t0 + 10 + LEAVE_GRACE_PERIOD_MS);
    assert.equal(state.isHovered, false);
    assert.equal(state.active, false);
    assert.equal(state.leaveTimerPending, false);
  });

  it("move inside bounds always re-asserts hovered and cancels pending leave", () => {
    let state = createInitialHoverState();
    const t0 = 3000;
    state = nextHoverState(state, { type: "pointerenter" }, t0);
    state = nextHoverState(state, { type: "pointerleave", insideRect: false }, t0 + 10);
    assert.equal(state.leaveTimerPending, true);

    // Moving mouse inside bounds
    state = nextHoverState(state, { type: "pointermove", insideRect: true }, t0 + 30);
    assert.equal(state.isHovered, true);
    assert.equal(state.active, true);
    assert.equal(state.leaveTimerPending, false);
  });

  it("focus-visible forms the logo and blur clears it only if not hovered", () => {
    let state = createInitialHoverState();
    assert.equal(state.active, false);

    // Focus triggers active logo
    state = nextHoverState(state, { type: "focus" });
    assert.equal(state.isFocused, true);
    assert.equal(state.active, true);

    // Blur without hover clears active
    state = nextHoverState(state, { type: "blur" });
    assert.equal(state.isFocused, false);
    assert.equal(state.active, false);

    // Focus with active hover: blur preserves active because hovered is true
    state = nextHoverState(state, { type: "pointerenter" });
    state = nextHoverState(state, { type: "focus" });
    assert.equal(state.active, true);

    state = nextHoverState(state, { type: "blur" });
    assert.equal(state.isFocused, false);
    assert.equal(state.isHovered, true);
    assert.equal(state.active, true);
  });
});



