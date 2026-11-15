import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  RUBRIC_MAX_BYTES,
  RUBRIC_MIME_BY_EXTENSION,
  UPLOAD_RULES,
  allowedContentTypes,
  blobPathnameFromUrl,
  canManagePlacementRubric,
  canResubmit,
  canViewPlacementRubric,
  getBlobStoreId,
  getExtension,
  isOwnBlobUrl,
  isValidUploadPathname,
  parseVideoLink,
  placementRoleFor,
  placementRubricAccessFor,
  sanitizeRubricFileName,
  statusAfterFeedback,
  statusAfterResubmit,
  summarizeGroups,
  toYouTubeEmbedUrl,
  totalPendingReview,
  validateRubricSignature,
  validateRubricUpload,
  validateUpload,
} from "../rules";
import {
  HttpError,
  PRACTICUM_DB_MISSING_PRIVILEGES_MESSAGE,
  PRACTICUM_DB_NOT_MIGRATED_MESSAGE,
  PRACTICUM_DB_TIMEOUT_MESSAGE,
  PRACTICUM_INTERNAL_ERROR_MESSAGE,
  PRACTICUM_RUBRIC_TRANSACTION_OPTIONS,
  classifyPracticumApiError,
  errorResponse,
  isPracticumDatabaseNotMigratedError,
  isPracticumMissingPrivilegesError,
  isPracticumTransactionTimeoutError,
} from "../http";
import { createPlacementSchema, createSubmissionSchema, feedbackSchema } from "../schemas";

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

describe("placement rubric validation", () => {
  it("accepts PDF, DOC, DOCX, XLS, XLSX up to RUBRIC_MAX_BYTES (4 MB)", () => {
    assert.equal(RUBRIC_MAX_BYTES, 4 * MB);
    assert.deepEqual(
      validateRubricUpload("rubric.pdf", RUBRIC_MIME_BY_EXTENSION.pdf, 1 * MB),
      { ok: true }
    );
    assert.deepEqual(
      validateRubricUpload("rubric.doc", RUBRIC_MIME_BY_EXTENSION.doc, 2 * MB),
      { ok: true }
    );
    assert.deepEqual(
      validateRubricUpload("rubric.DOCX", RUBRIC_MIME_BY_EXTENSION.docx, 3 * MB),
      { ok: true }
    );
    assert.deepEqual(
      validateRubricUpload("rubric.xls", RUBRIC_MIME_BY_EXTENSION.xls, 2 * MB),
      { ok: true }
    );
    assert.deepEqual(
      validateRubricUpload("rubric.XLSX", RUBRIC_MIME_BY_EXTENSION.xlsx, RUBRIC_MAX_BYTES),
      { ok: true }
    );
  });

  it("rejects wrong extensions and mismatched MIME types", () => {
    assert.equal(validateRubricUpload("photo.png", "image/png", 1 * MB).ok, false);
    assert.equal(validateRubricUpload("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", 1 * MB).ok, false);
    assert.equal(validateRubricUpload("video.mp4", "video/mp4", 1 * MB).ok, false);
    assert.equal(validateRubricUpload("rubric.pdf.exe", "application/pdf", 1 * MB).ok, false);
    assert.equal(validateRubricUpload("rubric.pdf", "text/html", 1 * MB).ok, false);
    assert.equal(validateRubricUpload("rubric.pdf", RUBRIC_MIME_BY_EXTENSION.xlsx, 1 * MB).ok, false);
    assert.equal(validateRubricUpload("", "application/pdf", 1 * MB).ok, false);
  });

  it("rejects files over RUBRIC_MAX_BYTES (4 MB) and empty (0-byte) files", () => {
    assert.equal(validateRubricUpload("rubric.pdf", RUBRIC_MIME_BY_EXTENSION.pdf, RUBRIC_MAX_BYTES + 1).ok, false);
    assert.equal(validateRubricUpload("rubric.pdf", RUBRIC_MIME_BY_EXTENSION.pdf, 0).ok, false);
    assert.equal(validateRubricUpload("rubric.docx", RUBRIC_MIME_BY_EXTENSION.docx, -10).ok, false);
  });

  it("validates real magic-byte signatures for PDF, DOCX, XLSX, DOC and XLS, and rejects mismatched files", () => {
    const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"
    const validZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]); // "PK\x03\x04..."
    const validOle2 = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]); // OLE2 header
    const plainText = new TextEncoder().encode("Hello world, this is plain text");

    // Valid signatures pass
    assert.deepEqual(validateRubricSignature("rubric.pdf", validPdf), { ok: true });
    assert.deepEqual(validateRubricSignature("rubric.docx", validZip), { ok: true });
    assert.deepEqual(validateRubricSignature("rubric.xlsx", validZip), { ok: true });
    assert.deepEqual(validateRubricSignature("rubric.doc", validOle2), { ok: true });
    assert.deepEqual(validateRubricSignature("rubric.xls", validOle2), { ok: true });

    // A text file renamed .pdf fails
    assert.equal(validateRubricSignature("rubric.pdf", plainText).ok, false);

    // A .docx (ZIP) renamed .pdf fails
    assert.equal(validateRubricSignature("rubric.pdf", validZip).ok, false);

    // Cross-format mismatches and empty bytes fail
    assert.equal(validateRubricSignature("rubric.docx", validPdf).ok, false);
    assert.equal(validateRubricSignature("rubric.doc", validZip).ok, false);
    assert.equal(validateRubricSignature("rubric.pdf", new Uint8Array(0)).ok, false);
  });

  it("sanitizes stored rubric file names safely", () => {
    assert.equal(sanitizeRubricFileName("C:\\fakepath\\My Grading Rubric (2026).pdf"), "My Grading Rubric _2026.pdf");
    assert.equal(sanitizeRubricFileName("../../etc/passwd.docx"), "passwd.docx");
    assert.equal(sanitizeRubricFileName("   .pdf"), "rubric.pdf");
  });
});

describe("placement rubric authorization", () => {
  const placement = { studentId: "stu-1", supervisorId: "prof-1" };

  it("allows the owning instructor to manage and view the rubric", () => {
    assert.equal(canManagePlacementRubric({ id: "prof-1", role: "PROFESSOR" }, placement), true);
    assert.equal(canManagePlacementRubric({ id: "prof-1", role: "INSTRUCTOR" }, placement), true);
    assert.equal(canViewPlacementRubric({ id: "prof-1", role: "PROFESSOR" }, placement), true);
    assert.equal(placementRubricAccessFor({ id: "prof-1", role: "PROFESSOR" }, placement), "supervisor");
  });

  it("allows ITE admins to manage and view the rubric", () => {
    assert.equal(canManagePlacementRubric({ id: "admin-1", role: "ADMIN" }, placement), true);
    assert.equal(canViewPlacementRubric({ id: "admin-1", role: "ADMIN" }, placement), true);
    assert.equal(placementRubricAccessFor({ id: "admin-1", role: "ADMIN" }, placement), "admin");
  });

  it("allows the assigned student teacher to view the rubric read-only, but not manage it", () => {
    assert.equal(canViewPlacementRubric({ id: "stu-1", role: "STUDENT" }, placement), true);
    assert.equal(placementRubricAccessFor({ id: "stu-1", role: "STUDENT" }, placement), "student");
    assert.equal(canManagePlacementRubric({ id: "stu-1", role: "STUDENT" }, placement), false);
  });

  it("denies another student and another instructor from viewing or managing the rubric", () => {
    assert.equal(canViewPlacementRubric({ id: "stu-2", role: "STUDENT" }, placement), false);
    assert.equal(placementRubricAccessFor({ id: "stu-2", role: "STUDENT" }, placement), null);
    assert.equal(canManagePlacementRubric({ id: "stu-2", role: "STUDENT" }, placement), false);

    assert.equal(canViewPlacementRubric({ id: "prof-2", role: "PROFESSOR" }, placement), false);
    assert.equal(placementRubricAccessFor({ id: "prof-2", role: "PROFESSOR" }, placement), null);
    assert.equal(canManagePlacementRubric({ id: "prof-2", role: "PROFESSOR" }, placement), false);
  });

  it("denies non-ITE users even if their role or id would otherwise match", () => {
    assert.equal(canViewPlacementRubric({ id: "prof-1", role: "PROFESSOR", isIte: false }, placement), false);
    assert.equal(canManagePlacementRubric({ id: "admin-1", role: "ADMIN", isIte: false }, placement), false);
    assert.equal(canViewPlacementRubric({ id: "stu-1", role: "STUDENT", isIte: false }, placement), false);
  });
});

describe("practicum placement transaction timeout & error classification", () => {
  it("configures interactive rubric transactions with a 30s timeout (>= 3x Prisma's 5s default) and applies it in placement routes", () => {
    assert.equal(PRACTICUM_RUBRIC_TRANSACTION_OPTIONS.timeout, 30_000);
    assert.equal(PRACTICUM_RUBRIC_TRANSACTION_OPTIONS.maxWait, 10_000);
    assert.equal(PRACTICUM_RUBRIC_TRANSACTION_OPTIONS.timeout > 5_000, true);

    const apiRoot = path.resolve(__dirname, "../../../app/api/practicum/placements");
    const postRoute = fs.readFileSync(path.join(apiRoot, "route.ts"), "utf8");
    const patchRoute = fs.readFileSync(path.join(apiRoot, "[id]/route.ts"), "utf8");
    const rubricRoute = fs.readFileSync(path.join(apiRoot, "[id]/rubric/route.ts"), "utf8");

    assert.match(postRoute, /PRACTICUM_RUBRIC_TRANSACTION_OPTIONS/);
    assert.match(postRoute, /errorResponse\(err,\s*"\[PRACTICUM_PLACEMENTS_POST_ERROR\]"\)/);
    assert.match(patchRoute, /PRACTICUM_RUBRIC_TRANSACTION_OPTIONS/);
    assert.match(rubricRoute, /PRACTICUM_RUBRIC_TRANSACTION_OPTIONS/);
  });

  it("returns specific messages for validation, file too large, and wrong file type errors", () => {
    const zodResult = createPlacementSchema.safeParse({
      studentId: "",
      schoolName: "School",
      subject: "Math",
      gradeLevel: "Grade 6",
      schoolYear: "bad-year",
      startDate: "2026-06-01",
      endDate: "2026-10-01",
    });
    assert.equal(zodResult.success, false);
    if (!zodResult.success) {
      const classified = classifyPracticumApiError(zodResult.error);
      assert.equal(classified.kind, "VALIDATION");
      assert.equal(classified.status, 400);
      assert.match(classified.message, /studentId|schoolYear/);
    }

    const tooLarge = classifyPracticumApiError(new HttpError(413, "File too large (max 4 MB)."));
    assert.deepEqual(tooLarge, {
      kind: "FILE_TOO_LARGE",
      status: 413,
      message: "File too large (max 4 MB).",
    });

    const wrongType = classifyPracticumApiError(
      new HttpError(400, "Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX.")
    );
    assert.deepEqual(wrongType, {
      kind: "WRONG_FILE_TYPE",
      status: 400,
      message: "Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX.",
    });

    const badSignature = classifyPracticumApiError(
      new HttpError(400, "The file content does not match its .PDF extension.")
    );
    assert.deepEqual(badSignature, {
      kind: "WRONG_FILE_TYPE",
      status: 400,
      message: "The file content does not match its .PDF extension.",
    });
  });

  it("returns specific, safe messages for database-not-migrated, missing privileges, and transaction timeout errors", () => {
    const missingColumn = {
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      message: 'The column `PracticumPlacement.rubricStorageKey` does not exist in the current database.',
      meta: {
        driverAdapterError: {
          cause: {
            originalCode: "42703",
            kind: "ColumnDoesNotExist",
          },
        },
      },
    };
    assert.equal(isPracticumDatabaseNotMigratedError(missingColumn), true);
    assert.deepEqual(classifyPracticumApiError(missingColumn), {
      kind: "DATABASE_NOT_MIGRATED",
      status: 503,
      message: PRACTICUM_DB_NOT_MIGRATED_MESSAGE,
    });

    const missingPrivileges = {
      name: "PrismaClientUnknownRequestError",
      message: 'permission denied for table "PrivateAsset"',
      meta: {
        driverAdapterError: {
          cause: {
            originalCode: "42501",
            kind: "InsufficientPrivilege",
          },
        },
      },
    };
    assert.equal(isPracticumMissingPrivilegesError(missingPrivileges), true);
    assert.deepEqual(classifyPracticumApiError(missingPrivileges), {
      kind: "MISSING_PRIVILEGES",
      status: 503,
      message: PRACTICUM_DB_MISSING_PRIVILEGES_MESSAGE,
    });

    const expiredTx = {
      name: "PrismaClientKnownRequestError",
      code: "P2028",
      message:
        "Transaction API error: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 6748 ms passed since the start of the transaction.",
    };
    assert.equal(isPracticumTransactionTimeoutError(expiredTx), true);
    assert.deepEqual(classifyPracticumApiError(expiredTx), {
      kind: "TRANSACTION_TIMEOUT",
      status: 503,
      message: PRACTICUM_DB_TIMEOUT_MESSAGE,
    });
  });

  it("logs the underlying error on the server while keeping truly unknown errors generic for the user", async () => {
    const logged: unknown[][] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };
    try {
      const secretError = new Error("unexpected socket crash on internal host");
      const res = errorResponse(secretError, "[PRACTICUM_PLACEMENTS_POST_ERROR]");
      assert.equal(res.status, 500);
      const body = (await res.json()) as { error: string; message: string; code: string };
      assert.deepEqual(body, {
        error: PRACTICUM_INTERNAL_ERROR_MESSAGE,
        message: PRACTICUM_INTERNAL_ERROR_MESSAGE,
        code: "UNKNOWN",
      });
      assert.equal(logged.length, 1);
      assert.equal(logged[0][0], "[PRACTICUM_PLACEMENTS_POST_ERROR]");
      assert.equal(logged[0][1], secretError);
    } finally {
      console.error = origError;
    }
  });
});
