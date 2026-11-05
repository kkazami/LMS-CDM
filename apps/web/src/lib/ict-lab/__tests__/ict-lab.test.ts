import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateIctLabAccess, isEligibleForIctLabSidebar } from "../guard";
import { loadHardwarePartsData, loadLanCableData } from "../data-loader";
import {
  MAX_PLAYGROUND_BYTES,
  MAX_PLAYGROUND_PROJECTS_PER_STUDENT,
  PLAYGROUND_IFRAME_CSP,
  PLAYGROUND_POSTMESSAGE_SOURCE,
  assertAllHardwarePartsHaveSvgDrawing,
  buildPlaygroundSrcdoc,
  checkProjectCountLimit,
  checkProjectOwnership,
  classifyIteProgram,
  generateHardwareQuizQuestions,
  isBecedProgram,
  isBeedProgram,
  isBsedScienceProgram,
  isBtledIctProgram,
  simulateCableTester,
  validatePlaygroundProjectInput,
  validatePreviewMessageEvent,
} from "../rules";
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

describe("BTLED ICT Lab - Code Playground Validation, Ownership & postMessage Security", () => {
  it("enforces title length (1..80) and 100 KB combined size limit", () => {
    const emptyTitle = validatePlaygroundProjectInput({
      title: "   ",
      html: "<p>Hello</p>",
      css: "",
      js: "",
    });
    assert.equal(emptyTitle.ok, false);

    const longTitle = validatePlaygroundProjectInput({
      title: "a".repeat(81),
      html: "",
      css: "",
      js: "",
    });
    assert.equal(longTitle.ok, false);

    const validSmall = validatePlaygroundProjectInput({
      title: "My Webpage",
      html: "<h1>Hello</h1>",
      css: "h1 { color: blue; }",
      js: "console.log('ready');",
    });
    assert.equal(validSmall.ok, true);

    const oversized = validatePlaygroundProjectInput({
      title: "Too Large",
      html: "x".repeat(MAX_PLAYGROUND_BYTES + 1),
      css: "",
      js: "",
    });
    assert.equal(oversized.ok, false);
  });

  it("enforces max 30 projects per student and strict ownership", () => {
    assert.equal(checkProjectCountLimit(0).ok, true);
    assert.equal(checkProjectCountLimit(MAX_PLAYGROUND_PROJECTS_PER_STUDENT - 1).ok, true);
    assert.equal(checkProjectCountLimit(MAX_PLAYGROUND_PROJECTS_PER_STUDENT).ok, false);

    assert.equal(checkProjectOwnership("student-1", "student-1"), true);
    assert.equal(checkProjectOwnership("student-1", "student-2"), false);
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
  });

  it("builds srcdoc with restrictive Content-Security-Policy meta tag", () => {
    const doc = buildPlaygroundSrcdoc("<h1>Hi</h1>", "body{}", "console.log(1)");
    assert.ok(doc.includes(PLAYGROUND_IFRAME_CSP));
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
