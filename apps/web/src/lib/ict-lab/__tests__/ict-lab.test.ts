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
