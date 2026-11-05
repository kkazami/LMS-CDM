import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canDeleteSubmission, validateUpload } from "../rules";

describe("Practicum lesson plan upload & deletion rules", () => {
  it("validates allowed lesson plan file types (PDF, DOC, DOCX, PPT, PPTX) and size limits", () => {
    assert.deepEqual(
      validateUpload("LESSON_PLAN", "plan.pdf", "application/pdf", 1024),
      { ok: true }
    );
    assert.deepEqual(
      validateUpload("LESSON_PLAN", "plan.doc", "application/msword", 2048),
      { ok: true }
    );
    assert.deepEqual(
      validateUpload(
        "LESSON_PLAN",
        "plan.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        2048
      ),
      { ok: true }
    );
    assert.deepEqual(
      validateUpload("LESSON_PLAN", "slides.ppt", "application/vnd.ms-powerpoint", 2048),
      { ok: true }
    );
    assert.deepEqual(
      validateUpload(
        "LESSON_PLAN",
        "slides.pptx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        2048
      ),
      { ok: true }
    );

    const overLimit = validateUpload(
      "LESSON_PLAN",
      "huge.pdf",
      "application/pdf",
      11 * 1024 * 1024
    );
    assert.equal(overLimit.ok, false);
    if (!overLimit.ok) {
      assert.equal(overLimit.reason, "File too large (max 10 MB)");
    }

    const wrongType = validateUpload("LESSON_PLAN", "script.exe", "application/x-msdownload", 512);
    assert.equal(wrongType.ok, false);
  });

  it("allows deleting lesson plans only while status is SUBMITTED", () => {
    assert.equal(canDeleteSubmission("SUBMITTED"), true);
    assert.equal(canDeleteSubmission("APPROVED"), false);
    assert.equal(canDeleteSubmission("NEEDS_REVISION"), false);
  });
});
