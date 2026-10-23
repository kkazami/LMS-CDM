import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  UPLOAD_RULES,
  allowedContentTypes,
  blobPathnameFromUrl,
  canResubmit,
  getBlobStoreId,
  getExtension,
  isOwnBlobUrl,
  isValidUploadPathname,
  parseVideoLink,
  placementRoleFor,
  statusAfterFeedback,
  statusAfterResubmit,
  summarizeGroups,
  toYouTubeEmbedUrl,
  totalPendingReview,
  validateUpload,
} from "../rules";
import { createSubmissionSchema, feedbackSchema } from "../schemas";

const MB = 1024 * 1024;

describe("validateUpload: type and size by submission type", () => {
  it("lesson plans accept PDF and DOCX up to 10 MB", () => {
    assert.deepEqual(validateUpload("LESSON_PLAN", "plan.pdf", "application/pdf", 1 * MB), { ok: true });
    assert.deepEqual(
      validateUpload(
        "LESSON_PLAN",
        "plan.DOCX",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        10 * MB
      ),
      { ok: true }
    );
  });

  it("lesson plans reject images, videos and over-size files", () => {
    assert.equal(validateUpload("LESSON_PLAN", "photo.png", "image/png", 1 * MB).ok, false);
    assert.equal(validateUpload("LESSON_PLAN", "clip.mp4", "video/mp4", 1 * MB).ok, false);
    assert.equal(validateUpload("LESSON_PLAN", "plan.pdf", "application/pdf", 10 * MB + 1).ok, false);
  });

  it("portfolio evidence accepts PDF, PNG, JPG, JPEG up to 10 MB", () => {
    for (const [name, type] of [
      ["a.pdf", "application/pdf"],
      ["a.png", "image/png"],
      ["a.jpg", "image/jpeg"],
      ["a.jpeg", "image/jpeg"],
    ]) {
      assert.deepEqual(validateUpload("PORTFOLIO_EVIDENCE", name, type, 5 * MB), { ok: true }, name);
    }
    assert.equal(validateUpload("PORTFOLIO_EVIDENCE", "a.docx", undefined, 1 * MB).ok, false);
    assert.equal(validateUpload("PORTFOLIO_EVIDENCE", "a.png", "image/png", 11 * MB).ok, false);
  });

  it("demo videos accept MP4, WEBM, MOV up to 200 MB (well above the 4.5 MB route limit)", () => {
    assert.deepEqual(validateUpload("DEMO_VIDEO", "lesson.mp4", "video/mp4", 150 * MB), { ok: true });
    assert.deepEqual(validateUpload("DEMO_VIDEO", "lesson.webm", "video/webm", 200 * MB), { ok: true });
    assert.deepEqual(validateUpload("DEMO_VIDEO", "lesson.mov", "video/quicktime", 20 * MB), { ok: true });
    assert.equal(validateUpload("DEMO_VIDEO", "lesson.mp4", "video/mp4", 200 * MB + 1).ok, false);
    assert.equal(validateUpload("DEMO_VIDEO", "lesson.avi", "video/x-msvideo", 1 * MB).ok, false);
    assert.equal(UPLOAD_RULES.DEMO_VIDEO.maxBytes > 4.5 * MB, true);
  });

  it("rejects a mismatched content type, empty files and extension-less names", () => {
    assert.equal(validateUpload("LESSON_PLAN", "plan.pdf", "text/html", 1 * MB).ok, false);
    assert.equal(validateUpload("LESSON_PLAN", "plan.pdf", "application/pdf", 0).ok, false);
    assert.equal(validateUpload("LESSON_PLAN", "plan", "application/pdf", 1).ok, false);
    assert.equal(validateUpload("LESSON_PLAN", "plan.pdf.exe", "application/pdf", 1).ok, false);
  });

  it("name-only validation passes when type and size are not known yet", () => {
    assert.deepEqual(validateUpload("DEMO_VIDEO", "a.mp4"), { ok: true });
  });

  it("allowedContentTypes are deduplicated per type", () => {
    assert.deepEqual(allowedContentTypes("PORTFOLIO_EVIDENCE").sort(), ["application/pdf", "image/jpeg", "image/png"]);
    assert.deepEqual(allowedContentTypes("DEMO_VIDEO").sort(), ["video/mp4", "video/quicktime", "video/webm"]);
  });

  it("getExtension handles paths and case", () => {
    assert.equal(getExtension("practicum/p1/My.File.MP4"), "mp4");
    assert.equal(getExtension("noext"), "");
  });
});

describe("Blob URL and pathname validation", () => {
  const storeId = "abc123xyz";
  const token = `vercel_blob_rw_${storeId}_secretpart`;
  const host = `https://${storeId}.public.blob.vercel-storage.com`;

  it("extracts the store id from a read/write token", () => {
    assert.equal(getBlobStoreId(token), storeId);
    assert.equal(getBlobStoreId("not-a-token"), null);
    assert.equal(getBlobStoreId(undefined), null);
  });

  it("accepts files of our store inside the placement folder", () => {
    assert.equal(isOwnBlobUrl(`${host}/practicum/pl_1/plan-AbC123.pdf`, storeId, "pl_1"), true);
    assert.equal(blobPathnameFromUrl(`${host}/practicum/pl_1/my%20plan.pdf`), "practicum/pl_1/my plan.pdf");
  });

  it("rejects another host, store, scheme or port", () => {
    assert.equal(isOwnBlobUrl("https://evil.example.com/practicum/pl_1/a.pdf", storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`https://other.public.blob.vercel-storage.com/practicum/pl_1/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`http://${storeId}.public.blob.vercel-storage.com/practicum/pl_1/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`https://${storeId}.public.blob.vercel-storage.com:8443/practicum/pl_1/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`https://user@${storeId}.public.blob.vercel-storage.com/practicum/pl_1/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`https://${storeId}.public.blob.vercel-storage.com.evil.com/practicum/pl_1/a.pdf`, storeId, "pl_1"), false);
  });

  it("rejects paths outside this placement or with traversal", () => {
    assert.equal(isOwnBlobUrl(`${host}/practicum/pl_2/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`${host}/uploads/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`${host}/practicum/pl_1/../pl_2/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`${host}/practicum/pl_1/%2e%2e/pl_2/a.pdf`, storeId, "pl_1"), false);
    assert.equal(isOwnBlobUrl(`${host}/practicum/pl_1/`, storeId, "pl_1"), false);
  });

  it("rejects everything when the store is unknown or the URL is garbage", () => {
    assert.equal(isOwnBlobUrl(`${host}/practicum/pl_1/a.pdf`, null, "pl_1"), false);
    assert.equal(isOwnBlobUrl("not a url", storeId, "pl_1"), false);
  });

  it("isValidUploadPathname", () => {
    assert.equal(isValidUploadPathname("practicum/pl_1/video.mp4", "pl_1"), true);
    assert.equal(isValidUploadPathname("practicum/pl_2/video.mp4", "pl_1"), false);
    assert.equal(isValidUploadPathname("practicum/pl_1/../x.mp4", "pl_1"), false);
    assert.equal(isValidUploadPathname("practicum/pl_1/", "pl_1"), false);
    assert.equal(isValidUploadPathname("practicum/pl_1/a.mp4", "pl_1/../x"), false);
  });
});

describe("video links", () => {
  it("accepts https links only", () => {
    assert.equal(parseVideoLink("https://youtu.be/dQw4w9WgXcQ").ok, true);
    assert.equal(parseVideoLink("http://example.com/v").ok, false);
    assert.equal(parseVideoLink("javascript:alert(1)").ok, false);
    assert.equal(parseVideoLink("https://user:pw@example.com/v").ok, false);
    assert.equal(parseVideoLink("").ok, false);
    assert.equal(parseVideoLink("not a link").ok, false);
  });

  it("builds a privacy-friendly YouTube embed URL, or null for other hosts", () => {
    const embed = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    assert.equal(toYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), embed);
    assert.equal(toYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), embed);
    assert.equal(toYouTubeEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"), embed);
    assert.equal(toYouTubeEmbedUrl("https://vimeo.com/12345"), null);
    assert.equal(toYouTubeEmbedUrl("https://www.youtube.com/watch?v=short"), null);
  });
});

describe("status transitions", () => {
  it("SUBMITTED can become NEEDS_REVISION or APPROVED", () => {
    assert.deepEqual(statusAfterFeedback("SUBMITTED", "NEEDS_REVISION"), { ok: true, status: "NEEDS_REVISION" });
    assert.deepEqual(statusAfterFeedback("SUBMITTED", "APPROVED"), { ok: true, status: "APPROVED" });
  });

  it("a plain comment never changes the status", () => {
    assert.deepEqual(statusAfterFeedback("SUBMITTED", "COMMENT"), { ok: true, status: "SUBMITTED" });
    assert.deepEqual(statusAfterFeedback("NEEDS_REVISION", "COMMENT"), { ok: true, status: "NEEDS_REVISION" });
  });

  it("NEEDS_REVISION waits for the student: no second decision until they resubmit", () => {
    assert.equal(statusAfterFeedback("NEEDS_REVISION", "APPROVED").ok, false);
    assert.equal(statusAfterFeedback("NEEDS_REVISION", "NEEDS_REVISION").ok, false);
  });

  it("APPROVED is final for feedback and resubmission", () => {
    for (const decision of ["COMMENT", "NEEDS_REVISION", "APPROVED"] as const) {
      assert.equal(statusAfterFeedback("APPROVED", decision).ok, false, decision);
    }
    assert.equal(statusAfterResubmit("APPROVED").ok, false);
    assert.equal(canResubmit("APPROVED"), false);
  });

  it("NEEDS_REVISION goes back to SUBMITTED on resubmit; SUBMITTED cannot be resubmitted", () => {
    assert.deepEqual(statusAfterResubmit("NEEDS_REVISION"), { ok: true, status: "SUBMITTED" });
    assert.equal(statusAfterResubmit("SUBMITTED").ok, false);
    assert.equal(canResubmit("NEEDS_REVISION"), true);
    assert.equal(canResubmit("SUBMITTED"), false);
  });
});

describe("access decisions", () => {
  const placement = { studentId: "stu-1", supervisorId: "prof-1" };

  it("the placement's student gets student access", () => {
    assert.equal(placementRoleFor({ id: "stu-1", role: "STUDENT" }, placement), "student");
  });

  it("the placement's supervisor gets supervisor access (any teacher role spelling)", () => {
    assert.equal(placementRoleFor({ id: "prof-1", role: "PROFESSOR" }, placement), "supervisor");
    assert.equal(placementRoleFor({ id: "prof-1", role: "teacher" }, placement), "supervisor");
    assert.equal(placementRoleFor({ id: "prof-1", role: "INSTRUCTOR" }, placement), "supervisor");
  });

  it("other students, other instructors and admins are denied", () => {
    assert.equal(placementRoleFor({ id: "stu-2", role: "STUDENT" }, placement), null);
    assert.equal(placementRoleFor({ id: "prof-2", role: "PROFESSOR" }, placement), null);
    assert.equal(placementRoleFor({ id: "adm-1", role: "ADMIN" }, placement), null);
  });

  it("matching ids with the wrong role are denied", () => {
    assert.equal(placementRoleFor({ id: "stu-1", role: "PROFESSOR" }, placement), null);
    assert.equal(placementRoleFor({ id: "prof-1", role: "STUDENT" }, placement), null);
    assert.equal(placementRoleFor({ id: "stu-1", role: "ADMIN" }, placement), null);
  });
});

describe("progress summaries", () => {
  it("counts per type and status", () => {
    const summary = summarizeGroups([
      { type: "LESSON_PLAN", status: "APPROVED", count: 2 },
      { type: "LESSON_PLAN", status: "SUBMITTED", count: 1 },
      { type: "DEMO_VIDEO", status: "NEEDS_REVISION", count: 3 },
      { type: "DEMO_VIDEO", status: "SUBMITTED", count: 2 },
    ]);
    assert.deepEqual(summary.LESSON_PLAN, { total: 3, approved: 2, pendingReview: 1, needsRevision: 0 });
    assert.deepEqual(summary.DEMO_VIDEO, { total: 5, approved: 0, pendingReview: 2, needsRevision: 3 });
    assert.deepEqual(summary.PORTFOLIO_EVIDENCE, { total: 0, approved: 0, pendingReview: 0, needsRevision: 0 });
    assert.equal(totalPendingReview(summary), 3);
  });

  it("is all zeros with no submissions (no NaN)", () => {
    assert.equal(totalPendingReview(summarizeGroups([])), 0);
  });
});

describe("input schemas", () => {
  const base = { placementId: "p", type: "LESSON_PLAN" as const, title: "Plan" };

  it("a submission needs exactly one of file or link", () => {
    assert.equal(createSubmissionSchema.safeParse(base).success, false);
    assert.equal(
      createSubmissionSchema.safeParse({ ...base, fileUrl: "https://x.example/a.pdf", fileName: "a.pdf" }).success,
      true
    );
    assert.equal(createSubmissionSchema.safeParse({ ...base, type: "DEMO_VIDEO", videoLink: "https://youtu.be/x" }).success, true);
    assert.equal(
      createSubmissionSchema.safeParse({
        ...base,
        fileUrl: "https://x.example/a.pdf",
        fileName: "a.pdf",
        videoLink: "https://youtu.be/x",
      }).success,
      false
    );
  });

  it("feedback validates the decision and the 0-100 integer score", () => {
    assert.equal(feedbackSchema.safeParse({ comment: "Good", decision: "APPROVED", score: 95 }).success, true);
    assert.equal(feedbackSchema.safeParse({ comment: "Good", decision: "COMMENT" }).success, true);
    assert.equal(feedbackSchema.safeParse({ comment: "Good", decision: "COMMENT", score: 101 }).success, false);
    assert.equal(feedbackSchema.safeParse({ comment: "Good", decision: "COMMENT", score: -1 }).success, false);
    assert.equal(feedbackSchema.safeParse({ comment: "Good", decision: "COMMENT", score: 80.5 }).success, false);
    assert.equal(feedbackSchema.safeParse({ comment: "   ", decision: "COMMENT" }).success, false);
    assert.equal(feedbackSchema.safeParse({ comment: "x", decision: "MAYBE" }).success, false);
  });
});
