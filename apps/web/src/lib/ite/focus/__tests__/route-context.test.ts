import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveFocusContextFromPath } from "../route-context";
import { getIteStudentNavLinks } from "@/components/layout/Sidebar";

describe("resolveFocusContextFromPath: pure route to focus context resolution", () => {
  it("resolves quiz form respond path with courseId and formId", () => {
    const res = resolveFocusContextFromPath("/ite/courses/c101/classwork/forms/f202/respond");
    assert.deepEqual(res, {
      contextType: "QUIZ",
      courseId: "c101",
      refId: "f202",
    });
  });

  it("handles query strings, hashes, and retake parameters in quiz paths", () => {
    const res = resolveFocusContextFromPath(
      "/courses/c101/classwork/forms/f202/respond?retake=true&attempt=2#section-1"
    );
    assert.deepEqual(res, {
      contextType: "QUIZ",
      courseId: "c101",
      refId: "f202",
    });
  });

  it("resolves general quiz or classwork item path", () => {
    const res = resolveFocusContextFromPath("/ite/courses/c101/classwork/item555");
    assert.deepEqual(res, {
      contextType: "QUIZ",
      courseId: "c101",
      refId: "item555",
    });

    const resQuiz = resolveFocusContextFromPath("/ite/courses/c101/classwork/quiz/q777");
    assert.deepEqual(resQuiz, {
      contextType: "QUIZ",
      courseId: "c101",
      refId: "q777",
    });
  });

  it("resolves main classwork list as STUDY with courseId", () => {
    const res = resolveFocusContextFromPath("/ite/courses/c101/classwork");
    assert.deepEqual(res, {
      contextType: "STUDY",
      courseId: "c101",
      refId: null,
    });

    const resSlash = resolveFocusContextFromPath("/ite/courses/c101/classwork/");
    assert.deepEqual(resSlash, {
      contextType: "STUDY",
      courseId: "c101",
      refId: null,
    });
  });

  it("resolves learning materials reader screen with courseId and materialId", () => {
    const res = resolveFocusContextFromPath(
      "/ite/learning-materials/c101/mat999/read?attachmentId=att1"
    );
    assert.deepEqual(res, {
      contextType: "MATERIAL",
      courseId: "c101",
      refId: "mat999",
    });

    const resMatOnly = resolveFocusContextFromPath("/ite/learning-materials/c101/mat999");
    assert.deepEqual(resMatOnly, {
      contextType: "MATERIAL",
      courseId: "c101",
      refId: "mat999",
    });
  });

  it("resolves flashcards with deckId and without deckId", () => {
    const resDeck = resolveFocusContextFromPath("/ite/flashcards/deck888");
    assert.deepEqual(resDeck, {
      contextType: "FLASHCARDS",
      courseId: null,
      refId: "deck888",
    });

    const resIndex = resolveFocusContextFromPath("/ite/flashcards");
    assert.deepEqual(resIndex, {
      contextType: "FLASHCARDS",
      courseId: null,
      refId: null,
    });

    const resIndexQuery = resolveFocusContextFromPath("/ite/flashcards/?tab=all");
    assert.deepEqual(resIndexQuery, {
      contextType: "FLASHCARDS",
      courseId: null,
      refId: null,
    });
  });

  it("resolves course overview page as STUDY with courseId", () => {
    const res = resolveFocusContextFromPath("/ite/courses/c101");
    assert.deepEqual(res, {
      contextType: "STUDY",
      courseId: "c101",
      refId: null,
    });
  });

  it("resolves student dashboard and other general pages as STUDY with no courseId", () => {
    assert.deepEqual(resolveFocusContextFromPath("/ite/students"), {
      contextType: "STUDY",
      courseId: null,
      refId: null,
    });

    assert.deepEqual(resolveFocusContextFromPath("/ite/tasks"), {
      contextType: "STUDY",
      courseId: null,
      refId: null,
    });

    assert.deepEqual(resolveFocusContextFromPath("/"), {
      contextType: "STUDY",
      courseId: null,
      refId: null,
    });

    assert.deepEqual(resolveFocusContextFromPath(null), {
      contextType: "STUDY",
      courseId: null,
      refId: null,
    });
  });
});

describe("getIteStudentNavLinks: shared student navigation list", () => {
  it("includes all 10 standard ITE student destinations", () => {
    const links = getIteStudentNavLinks("ite");
    const labels = links.map((l) => l.label);

    assert.deepEqual(labels, [
      "Dashboard",
      "My Courses",
      "Learning Materials",
      "Announcements",
      "Grades",
      "Tasks",
      "Flashcards",
      "Leaderboards",
      "Meetings",
      "Practicum",
    ]);

    assert.equal(links[0].href, "/ite/students");
    assert.equal(links[1].href, "/ite/courses");
    assert.equal(links[8].href, "/ite/meetings");
    assert.equal(links[9].href, "/ite/practicum");
  });

  it("respects practicum exclusion option", () => {
    const links = getIteStudentNavLinks("ite", { isEligibleForPracticum: false });
    const labels = links.map((l) => l.label);
    assert.ok(!labels.includes("Practicum"));
    assert.equal(links.length, 9);
  });
});
