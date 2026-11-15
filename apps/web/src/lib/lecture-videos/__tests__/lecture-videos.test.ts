import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateLectureVideosAccess } from "../guard";
import {
  DRIVE_NOT_TRACKED_NOTE,
  DRIVE_SHARING_NOTE,
  LECTURE_ALLOWED_EXTENSIONS,
  LECTURE_ALLOWED_MIME_TYPES,
  LECTURE_DB_NOT_MIGRATED_MESSAGE,
  LECTURE_DURATION_TOLERANCE_SECONDS,
  LECTURE_MAX_BYTES,
  LECTURE_MAX_MB,
  LECTURE_SOURCE_LABELS,
  LECTURE_SOURCE_TYPES,
  LECTURE_STREAM_CHUNK_BYTES,
  LECTURE_UNEXPECTED_ERROR_MESSAGE,
  accumulateWatchedStep,
  buildFacultyLectureProgressReport,
  buildGoogleDriveLectureEmbedUrl,
  buildLectureBlobPathname,
  buildYouTubeLectureEmbedUrl,
  canActorAssignLectureToCourse,
  canActorViewLecture,
  canActorViewLectureProgress,
  canManageLecture,
  canUploadLecture,
  canViewLectureProgressTable,
  canWriteStudentLectureProgress,
  classifyLectureVideoApiError,
  doesInstructorTeachCourse,
  filterAndSortFacultyProgressRows,
  filterVisibleLecturesForActor,
  formatCourseSubjectLabel,
  isApprovedCourseEnrollment,
  isLectureDatabaseNotMigratedError,
  isOwnLectureBlobUrl,
  isValidLectureUploadPathname,
  parseExternalLectureUrl,
  parseGoogleDriveLectureUrl,
  parseHttpByteRange,
  parseYouTubeLectureUrl,
  resolveStreamableUploadLecture,
  validateAndMergeLectureProgress,
  validateLectureMetadata,
  validateLectureSignature,
  validateLectureUpload,
  type CourseEnrollmentCheckRecord,
  type IteStudentIdentity,
  type LectureCourseAccessTarget,
} from "../lectures";

describe("ITE Lecture Videos - Access Control & Authorization", () => {
  it("allows ITE students of any program, plus ITE faculty and ITE admins", () => {
    const studentAccess = evaluateLectureVideosAccess({
      userId: "student-ite-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
    });
    assert.deepEqual(studentAccess, { allowed: true, role: "STUDENT" });

    for (const facultyRole of ["INSTRUCTOR", "PROFESSOR", "TEACHER"]) {
      const facAccess = evaluateLectureVideosAccess({
        userId: "faculty-ite-1",
        userRole: facultyRole,
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
      });
      assert.deepEqual(facAccess, { allowed: true, role: "INSTRUCTOR" });
    }

    const adminAccess = evaluateLectureVideosAccess({
      userId: "admin-ite-1",
      userRole: "ADMIN",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
    });
    assert.deepEqual(adminAccess, { allowed: true, role: "ADMIN" });
  });

  it("rejects non-ITE institutes (ICS, IBE), non-ITE routes, unauthenticated users, and unknown roles", () => {
    for (const otherInst of ["ics", "ibe", ""]) {
      const res = evaluateLectureVideosAccess({
        userId: "user-other-1",
        userRole: "STUDENT",
        userInstituteCode: otherInst,
        routeInstituteCode: "ite",
      });
      assert.equal(res.allowed, false);
      assert.equal(res.reason, "NOT_ITE_USER");
    }

    for (const otherRoute of ["ics", "ibe"]) {
      const res = evaluateLectureVideosAccess({
        userId: "user-ite-1",
        userRole: "STUDENT",
        userInstituteCode: "ite",
        routeInstituteCode: otherRoute,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.reason, "NOT_ITE_ROUTE");
    }

    const unauth = evaluateLectureVideosAccess({
      userId: "",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
    });
    assert.equal(unauth.allowed, false);
    assert.equal(unauth.reason, "UNAUTHENTICATED");

    const badRole = evaluateLectureVideosAccess({
      userId: "user-ite-1",
      userRole: "GUEST",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
    });
    assert.equal(badRole.allowed, false);
    assert.equal(badRole.reason, "INVALID_ROLE");
  });

  it("enforces faculty-only add/edit/delete and ownership checks", () => {
    assert.equal(
      canUploadLecture({ role: "INSTRUCTOR", instituteCode: "ite" }),
      true
    );
    assert.equal(
      canUploadLecture({ role: "PROFESSOR", instituteCode: "ite" }),
      true
    );
    assert.equal(
      canUploadLecture({ role: "ADMIN", instituteCode: "ite" }),
      true
    );
    assert.equal(
      canUploadLecture({ role: "STUDENT", instituteCode: "ite" }),
      false
    );
    assert.equal(
      canUploadLecture({ role: "INSTRUCTOR", instituteCode: "ics" }),
      false
    );
    assert.equal(
      canUploadLecture({ role: "INSTRUCTOR", instituteCode: "ibe" }),
      false
    );

    assert.equal(
      canManageLecture(
        { userId: "fac-1", role: "INSTRUCTOR", instituteCode: "ite" },
        { uploadedById: "fac-1" }
      ),
      true
    );
    assert.equal(
      canManageLecture(
        { userId: "fac-2", role: "INSTRUCTOR", instituteCode: "ite" },
        { uploadedById: "fac-1" }
      ),
      false
    );
    assert.equal(
      canManageLecture(
        { userId: "admin-1", role: "ADMIN", instituteCode: "ite" },
        { uploadedById: "fac-1" }
      ),
      true
    );
    assert.equal(
      canManageLecture(
        { userId: "stu-1", role: "STUDENT", instituteCode: "ite" },
        { uploadedById: "fac-1" }
      ),
      false
    );

    assert.equal(
      canViewLectureProgressTable({ role: "INSTRUCTOR", instituteCode: "ite" }),
      true
    );
    assert.equal(
      canViewLectureProgressTable({ role: "ADMIN", instituteCode: "ite" }),
      true
    );
    assert.equal(
      canViewLectureProgressTable({ role: "STUDENT", instituteCode: "ite" }),
      false
    );
    assert.equal(
      canViewLectureProgressTable({ role: "INSTRUCTOR", instituteCode: "ics" }),
      false
    );
  });

  it("enforces that an ITE student can only write their own progress and never another student's", () => {
    assert.deepEqual(
      canWriteStudentLectureProgress({
        userId: "student-1",
        role: "STUDENT",
        instituteCode: "ite",
      }),
      { ok: true, studentId: "student-1" }
    );
    assert.deepEqual(
      canWriteStudentLectureProgress(
        {
          userId: "student-1",
          role: "STUDENT",
          instituteCode: "ite",
        },
        "student-1"
      ),
      { ok: true, studentId: "student-1" }
    );

    const crossStudent = canWriteStudentLectureProgress(
      {
        userId: "student-1",
        role: "STUDENT",
        instituteCode: "ite",
      },
      "student-2"
    );
    assert.equal(crossStudent.ok, false);
    if (!crossStudent.ok) {
      assert.equal(crossStudent.status, 403);
      assert.match(crossStudent.reason, /another student/i);
    }

    const nonIte = canWriteStudentLectureProgress({
      userId: "student-ics",
      role: "STUDENT",
      instituteCode: "ics",
    });
    assert.equal(nonIte.ok, false);

    const facWrite = canWriteStudentLectureProgress({
      userId: "fac-1",
      role: "INSTRUCTOR",
      instituteCode: "ite",
    });
    assert.equal(facWrite.ok, false);
  });
});

describe("ITE Lecture Videos - YouTube & Google Drive URL Parsing and ID-Only Embeds", () => {
  it("defines UPLOAD, YOUTUBE, and DRIVE source types and labels", () => {
    assert.deepEqual(LECTURE_SOURCE_TYPES, ["UPLOAD", "YOUTUBE", "DRIVE"]);
    assert.deepEqual(LECTURE_SOURCE_LABELS, {
      UPLOAD: "Uploaded",
      YOUTUBE: "YouTube",
      DRIVE: "Google Drive",
    });
    assert.equal(
      DRIVE_SHARING_NOTE,
      "Set the file's sharing to 'Anyone with the link' so students can watch it."
    );
  });

  it("parses every accepted YouTube URL format and extracts the 11-char ID", () => {
    const id = "dQw4w9WgXcQ";
    const expectedEmbed =
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&enablejsapi=1";
    const expectedCanonical = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    const acceptedUrls = [
      `https://youtube.com/watch?v=${id}`,
      `https://www.youtube.com/watch?v=${id}&t=30s`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://www.youtu.be/${id}?si=abc123`,
      `https://youtube.com/embed/${id}`,
      `https://www.youtube.com/embed/${id}?rel=0`,
      `https://youtube.com/shorts/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://m.youtube.com/shorts/${id}`,
    ];

    for (const url of acceptedUrls) {
      const parsed = parseYouTubeLectureUrl(url);
      assert.equal(parsed.ok, true, `Expected ${url} to be accepted`);
      if (parsed.ok) {
        assert.equal(parsed.sourceType, "YOUTUBE");
        assert.equal(parsed.videoId, id);
        assert.equal(parsed.canonicalUrl, expectedCanonical);
        assert.equal(parsed.embedUrl, expectedEmbed);
      }
    }
  });

  it("rejects YouTube playlists, channels, non-https links, look-alike hosts, userinfo tricks, and malformed URLs", () => {
    const rejectedUrls = [
      // Plain http (https required)
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      // Playlists
      "https://www.youtube.com/playlist?list=PL1234567890",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890",
      "https://youtu.be/dQw4w9WgXcQ?list=PL1234567890",
      // Channels / handles / feed
      "https://www.youtube.com/channel/UC1234567890",
      "https://www.youtube.com/@DepEdPhilippines",
      "https://www.youtube.com/c/SomeChannel",
      "https://www.youtube.com/user/SomeUser",
      // Extra path segments
      "https://youtu.be/dQw4w9WgXcQ/extra",
      "https://www.youtube.com/embed/dQw4w9WgXcQ/extra",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ/extra",
      // Invalid ID length or characters
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/watch?v=too_long_video_id_123",
      // Look-alike / evil hosts & credential tricks
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://evil-youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com@evil.com/watch?v=dQw4w9WgXcQ",
      "https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ",
      // Non-YouTube URL or garbage
      "https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view",
      "javascript:alert(1)",
      "not a url",
      "",
    ];

    for (const url of rejectedUrls) {
      const parsed = parseYouTubeLectureUrl(url);
      assert.equal(parsed.ok, false, `Expected ${url} to be rejected`);
    }
  });

  it("parses every accepted Google Drive file link format and extracts the file ID", () => {
    const fileId = "1aBcDeFgHiJkLmNoPqRsTuVwXyZ_09-ab";
    const expectedEmbed = `https://drive.google.com/file/d/${fileId}/preview`;
    const expectedCanonical = `https://drive.google.com/file/d/${fileId}/view`;

    const acceptedUrls = [
      `https://drive.google.com/file/d/${fileId}/view`,
      `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      `https://drive.google.com/file/d/${fileId}/preview`,
      `https://drive.google.com/file/d/${fileId}`,
      `https://drive.google.com/open?id=${fileId}`,
      `https://drive.google.com/uc?id=${fileId}&export=download`,
    ];

    for (const url of acceptedUrls) {
      const parsed = parseGoogleDriveLectureUrl(url);
      assert.equal(parsed.ok, true, `Expected ${url} to be accepted`);
      if (parsed.ok) {
        assert.equal(parsed.sourceType, "DRIVE");
        assert.equal(parsed.videoId, fileId);
        assert.equal(parsed.canonicalUrl, expectedCanonical);
        assert.equal(parsed.embedUrl, expectedEmbed);
      }
    }
  });

  it("rejects Google Drive folders, Google Docs/Sheets/Slides, look-alike hosts, non-https, and malformed URLs", () => {
    const fileId = "1aBcDeFgHiJkLmNoPqRsTuVwXyZ_09-ab";
    const rejectedUrls = [
      // Plain http
      `http://drive.google.com/file/d/${fileId}/view`,
      // Drive folders
      `https://drive.google.com/drive/folders/${fileId}`,
      `https://drive.google.com/drive/u/0/folders/${fileId}`,
      // Google Docs / Sheets / Slides / Forms
      `https://docs.google.com/document/d/${fileId}/edit`,
      `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
      `https://docs.google.com/presentation/d/${fileId}/edit`,
      `https://docs.google.com/forms/d/${fileId}/viewform`,
      // Disallowed action suffix on /file/d/<ID>/...
      `https://drive.google.com/file/d/${fileId}/edit`,
      `https://drive.google.com/file/d/${fileId}/view/extra`,
      // Look-alike / evil hosts & credential tricks
      `https://drive.google.com.evil.com/file/d/${fileId}/view`,
      `https://evil-drive.google.com/file/d/${fileId}/view`,
      `https://drive.google.com@evil.com/file/d/${fileId}/view`,
      `https://user:pass@drive.google.com/file/d/${fileId}/view`,
      `https://drive.google.com:8443/file/d/${fileId}/view`,
      // Invalid / short ID
      "https://drive.google.com/file/d/short/view",
      "https://drive.google.com/open?id=short",
      // Non-Drive URL or garbage
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)",
      "not a url",
      "",
    ];

    for (const url of rejectedUrls) {
      const parsed = parseGoogleDriveLectureUrl(url);
      assert.equal(parsed.ok, false, `Expected ${url} to be rejected`);
    }
  });

  it("builds YouTube and Google Drive embed URLs strictly from validated IDs only", () => {
    assert.equal(
      buildYouTubeLectureEmbedUrl("dQw4w9WgXcQ"),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&enablejsapi=1"
    );
    assert.throws(() =>
      buildYouTubeLectureEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    );
    assert.throws(() => buildYouTubeLectureEmbedUrl("bad/../id"));

    assert.equal(
      buildGoogleDriveLectureEmbedUrl("1aBcDeFgHiJkLmNoPqRsTuVwXyZ"),
      "https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/preview"
    );
    assert.throws(() =>
      buildGoogleDriveLectureEmbedUrl(
        "https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view"
      )
    );
    assert.throws(() => buildGoogleDriveLectureEmbedUrl("short"));

    // Dispatcher
    const yt = parseExternalLectureUrl(
      "YOUTUBE",
      "https://youtu.be/dQw4w9WgXcQ"
    );
    assert.equal(yt.ok, true);
    const dr = parseExternalLectureUrl(
      "DRIVE",
      "https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view"
    );
    assert.equal(dr.ok, true);
  });

  it("rejects streaming for YOUTUBE and DRIVE link lectures (stream route 404 guard) while allowing UPLOAD lectures", () => {
    assert.equal(
      resolveStreamableUploadLecture({
        id: "lec-yt",
        sourceType: "YOUTUBE",
        storageUrl: null,
        mimeType: null,
        fileSize: null,
        fileName: null,
      }),
      null
    );
    assert.equal(
      resolveStreamableUploadLecture({
        id: "lec-drive",
        sourceType: "DRIVE",
        storageUrl: null,
        mimeType: null,
        fileSize: null,
        fileName: null,
      }),
      null
    );
    assert.deepEqual(
      resolveStreamableUploadLecture({
        id: "lec-upload",
        sourceType: "UPLOAD",
        storageUrl:
          "https://storeabc.public.blob.vercel-storage.com/ite/lecture-videos/fac_1/lecture.mp4",
        mimeType: "video/mp4",
        fileSize: 1024 * 1024,
        fileName: "lecture.mp4",
      }),
      {
        id: "lec-upload",
        storageUrl:
          "https://storeabc.public.blob.vercel-storage.com/ite/lecture-videos/fac_1/lecture.mp4",
        mimeType: "video/mp4",
        fileSize: 1024 * 1024,
        fileName: "lecture.mp4",
      }
    );
  });
});

describe("ITE Lecture Videos - Upload Validation & Magic-Byte Signature", () => {
  it("validates MP4 and WebM types, max 300 MB shared constant, and rejects empty or wrong files", () => {
    assert.equal(LECTURE_MAX_MB, 300);
    assert.equal(LECTURE_MAX_BYTES, 300 * 1024 * 1024);
    assert.deepEqual(LECTURE_ALLOWED_EXTENSIONS, ["mp4", "webm"]);
    assert.deepEqual(LECTURE_ALLOWED_MIME_TYPES, ["video/mp4", "video/webm"]);

    assert.deepEqual(
      validateLectureUpload("lecture1.mp4", "video/mp4", 40 * 1024 * 1024),
      { ok: true }
    );
    assert.deepEqual(
      validateLectureUpload(
        "demo.WEBM",
        "video/webm; codecs=vp9,opus",
        LECTURE_MAX_BYTES
      ),
      { ok: true }
    );

    const badExt = validateLectureUpload("slides.pptx", "application/pdf", 1024);
    assert.equal(badExt.ok, false);
    assert.match(badExt.reason ?? "", /MP4, WebM/i);

    const empty = validateLectureUpload("lecture.mp4", "video/mp4", 0);
    assert.equal(empty.ok, false);
    assert.match(empty.reason ?? "", /empty/i);

    const overLimit = validateLectureUpload(
      "huge.mp4",
      "video/mp4",
      LECTURE_MAX_BYTES + 1
    );
    assert.equal(overLimit.ok, false);
    assert.match(overLimit.reason ?? "", /300 MB/);
  });

  it("verifies MP4 ftyp and WebM EBML magic-byte signatures and rejects spoofed files", () => {
    const validMp4 = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    assert.deepEqual(validateLectureSignature("video.mp4", validMp4), {
      ok: true,
    });

    const validWebm = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81,
    ]);
    assert.deepEqual(validateLectureSignature("video.webm", validWebm), {
      ok: true,
    });

    const spoofed = new TextEncoder().encode("not-a-real-video-binary");
    assert.equal(validateLectureSignature("fake.mp4", spoofed).ok, false);
    assert.equal(validateLectureSignature("fake.webm", spoofed).ok, false);
  });

  it("validates metadata (title required, courseId required, description optional)", () => {
    const validWithCourse = validateLectureMetadata({
      title: "  Week 2: Child Development  ",
      description: "  Overview of Piaget stages  ",
      courseId: "  course-ite-101  ",
    });
    assert.deepEqual(validWithCourse, {
      ok: true,
      title: "Week 2: Child Development",
      description: "Overview of Piaget stages",
      courseId: "course-ite-101",
    });

    const validMinimal = validateLectureMetadata({
      title: "Foundations of Special Education",
      courseId: "course-ite-102",
    });
    assert.deepEqual(validMinimal, {
      ok: true,
      title: "Foundations of Special Education",
      description: null,
      courseId: "course-ite-102",
    });

    const missingTitle = validateLectureMetadata({
      title: "   ",
      courseId: "course-ite-101",
    });
    assert.equal(missingTitle.ok, false);

    const missingCourse = validateLectureMetadata({
      title: "Week 2: Child Development",
      courseId: "   ",
    });
    assert.equal(missingCourse.ok, false);
    if (!missingCourse.ok) {
      assert.match(missingCourse.reason, /select a subject/i);
    }
  });

  it("scopes Vercel Blob pathnames and URLs to ite/lecture-videos/<uploaderId>/", () => {
    const pathname = buildLectureBlobPathname("fac_123", "../Week 1 Lecture!.mp4");
    assert.equal(pathname, "ite/lecture-videos/fac_123/Week_1_Lecture_.mp4");
    assert.equal(isValidLectureUploadPathname(pathname, "fac_123"), true);
    assert.equal(isValidLectureUploadPathname(pathname, "fac_other"), false);
    assert.equal(
      isValidLectureUploadPathname(
        "ite/lecture-videos/fac_123/../secret.mp4",
        "fac_123"
      ),
      false
    );

    assert.equal(
      isOwnLectureBlobUrl(
        "https://storeabc.public.blob.vercel-storage.com/ite/lecture-videos/fac_123/Week_1.mp4",
        "storeabc",
        "fac_123"
      ),
      true
    );
    assert.equal(
      isOwnLectureBlobUrl(
        "https://storeabc.public.blob.vercel-storage.com/ite/lecture-videos/fac_other/Week_1.mp4",
        "storeabc",
        "fac_123"
      ),
      false
    );
  });
});

describe("ITE Lecture Videos - Watch-Time Rules, YouTube Duration Tolerance & HTTP Range Parsing", () => {
  it("counts watched time only during normal-speed playback and ignores seeking", () => {
    assert.equal(
      accumulateWatchedStep({
        previousPositionSeconds: 10,
        currentPositionSeconds: 11,
        isPlaying: true,
        isSeeking: false,
        playbackRate: 1,
      }),
      1
    );

    assert.equal(
      accumulateWatchedStep({
        previousPositionSeconds: 10,
        currentPositionSeconds: 120,
        isPlaying: true,
        isSeeking: false,
        playbackRate: 1,
      }),
      0
    );

    assert.equal(
      accumulateWatchedStep({
        previousPositionSeconds: 10,
        currentPositionSeconds: 11,
        isPlaying: true,
        isSeeking: true,
        playbackRate: 1,
      }),
      0
    );

    assert.equal(
      accumulateWatchedStep({
        previousPositionSeconds: 10,
        currentPositionSeconds: 11,
        isPlaying: true,
        isSeeking: false,
        playbackRate: 2,
      }),
      0
    );

    assert.equal(
      accumulateWatchedStep({
        previousPositionSeconds: 30,
        currentPositionSeconds: 20,
        isPlaying: true,
      }),
      0
    );
  });

  it("marks completed at 90%, never decreases watchedSeconds, and never clears completedAt", () => {
    const firstCompleteTime = new Date("2026-11-14T02:00:00.000Z");

    const step1 = validateAndMergeLectureProgress({
      existing: null,
      input: {
        lastPositionSeconds: 90,
        watchedSeconds: 90,
        durationSeconds: 100,
      },
      lectureDurationSeconds: 100,
      sourceType: "YOUTUBE",
      now: firstCompleteTime,
    });
    assert.equal(step1.ok, true);
    if (!step1.ok) return;
    assert.equal(step1.value.isCompleted, true);
    assert.equal(step1.value.status, "COMPLETED");
    assert.equal(step1.value.percentWatched, 90);
    assert.deepEqual(step1.value.completedAt, firstCompleteTime);

    const step2 = validateAndMergeLectureProgress({
      existing: step1.value,
      input: {
        lastPositionSeconds: 15,
        watchedSeconds: 20,
        durationSeconds: 100,
      },
      lectureDurationSeconds: 100,
      sourceType: "YOUTUBE",
      now: new Date("2026-11-14T03:00:00.000Z"),
    });
    assert.equal(step2.ok, true);
    if (!step2.ok) return;
    assert.equal(step2.value.lastPositionSeconds, 15);
    assert.equal(step2.value.watchedSeconds, 90);
    assert.equal(step2.value.isCompleted, true);
    assert.deepEqual(step2.value.completedAt, firstCompleteTime);
  });

  it("keeps the first reported YouTube duration and rejects later duration reports that differ by more than 5 seconds", () => {
    assert.equal(LECTURE_DURATION_TOLERANCE_SECONDS, 5);

    // First report establishes duration = 600s when lectureDurationSeconds was initially 0
    const first = validateAndMergeLectureProgress({
      existing: null,
      input: {
        lastPositionSeconds: 30,
        watchedSeconds: 30,
        durationSeconds: 600,
      },
      lectureDurationSeconds: 0,
      sourceType: "YOUTUBE",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.value.durationSeconds, 600);

    // Subsequent report within 5s tolerance (e.g., 602s) is accepted and keeps established 600s
    const withinTolerance = validateAndMergeLectureProgress({
      existing: first.value,
      input: {
        lastPositionSeconds: 60,
        watchedSeconds: 60,
        durationSeconds: 602,
      },
      lectureDurationSeconds: 600,
      sourceType: "YOUTUBE",
    });
    assert.equal(withinTolerance.ok, true);
    if (withinTolerance.ok) {
      assert.equal(withinTolerance.value.durationSeconds, 600);
    }

    // Subsequent report differing by > 5s (e.g., student tries to spoof a 10s duration to get 100% completion) is rejected
    const spoofedShortDuration = validateAndMergeLectureProgress({
      existing: first.value,
      input: {
        lastPositionSeconds: 10,
        watchedSeconds: 10,
        durationSeconds: 10,
      },
      lectureDurationSeconds: 600,
      sourceType: "YOUTUBE",
    });
    assert.equal(spoofedShortDuration.ok, false);
    if (!spoofedShortDuration.ok) {
      assert.match(
        spoofedShortDuration.reason,
        /does not match the recorded lecture duration/i
      );
    }

    // Also rejects when lectureDurationSeconds is still 0 on lecture but existing student progress established 600s
    const spoofedAgainstExisting = validateAndMergeLectureProgress({
      existing: first.value,
      input: {
        lastPositionSeconds: 10,
        watchedSeconds: 10,
        durationSeconds: 50,
      },
      lectureDurationSeconds: 0,
      sourceType: "YOUTUBE",
    });
    assert.equal(spoofedAgainstExisting.ok, false);
  });

  it("rejects progress writes for Google Drive lectures", () => {
    const driveAttempt = validateAndMergeLectureProgress({
      existing: null,
      input: {
        lastPositionSeconds: 10,
        watchedSeconds: 10,
        durationSeconds: 100,
      },
      lectureDurationSeconds: 0,
      sourceType: "DRIVE",
    });
    assert.equal(driveAttempt.ok, false);
    if (!driveAttempt.ok) {
      assert.match(driveAttempt.reason, /Google Drive/i);
    }
  });

  it("parses HTTP byte-range headers with 8 MB chunk capping and 416 handling", () => {
    const size300Mb = 300 * 1024 * 1024;
    const openRange = parseHttpByteRange("bytes=0-", size300Mb);
    assert.equal(openRange.kind, "partial");
    if (openRange.kind === "partial") {
      assert.equal(openRange.status, 206);
      assert.equal(openRange.start, 0);
      assert.equal(openRange.end, LECTURE_STREAM_CHUNK_BYTES - 1);
      assert.equal(openRange.contentLength, LECTURE_STREAM_CHUNK_BYTES);
    }

    const pastEnd = parseHttpByteRange(`bytes=${size300Mb}-`, size300Mb);
    assert.deepEqual(pastEnd, {
      kind: "unsatisfiable",
      status: 416,
      contentRange: `bytes */${size300Mb}`,
    });
  });
});

describe("ITE Lecture Videos - Subject-Based Course Visibility, Enrollment & Co-Instructor Rules", () => {
  const course101: LectureCourseAccessTarget = {
    courseId: "course-101",
    isActive: true,
    uploadedById: "fac-1",
    course: {
      id: "course-101",
      instituteCode: "ite",
      isArchived: false,
      instructorId: "fac-1",
      instructorIds: ["fac-1", "fac-co-2"],
      enrollments: [
        { studentId: "stu-enrolled-1", status: "APPROVED" },
        { studentId: "stu-multi", status: "APPROVED" },
        { studentId: "stu-pending", status: "PENDING" },
        { studentId: "stu-dropped", status: "DROPPED" },
        { studentId: "stu-rejected", status: "REJECTED" },
        { studentId: "stu-declined", status: "DECLINED" },
      ],
    },
  };

  const course102: LectureCourseAccessTarget = {
    courseId: "course-102",
    isActive: true,
    uploadedById: "fac-3",
    course: {
      id: "course-102",
      instituteCode: "ite",
      isArchived: false,
      instructorId: "fac-3",
      enrollments: [{ studentId: "stu-multi", status: "APPROVED" }],
    },
  };

  it("formats course subject labels with code, title, and section when available", () => {
    assert.equal(
      formatCourseSubjectLabel({
        code: "EDUC 101",
        title: "Child and Adolescent Learners",
        section: "BECEd-1A",
      }),
      "EDUC 101 — Child and Adolescent Learners (BECEd-1A)"
    );
    assert.equal(
      formatCourseSubjectLabel({
        code: "EDUC 102",
        title: "Assessment in Learning 1",
        section: null,
      }),
      "EDUC 102 — Assessment in Learning 1"
    );
  });

  it("allows an enrolled (APPROVED) student to view/stream/write progress and blocks non-enrolled, pending, or dropped ITE students", () => {
    // Enrolled student (APPROVED) sees the lecture
    assert.equal(
      canActorViewLecture(
        { userId: "stu-enrolled-1", role: "STUDENT", instituteCode: "ite" },
        course101
      ),
      true
    );

    // An ITE student not enrolled in course-101 is denied (used by list, GET by ID, stream, and progress POST)
    assert.equal(
      canActorViewLecture(
        { userId: "stu-other-ite", role: "STUDENT", instituteCode: "ite" },
        course101
      ),
      false
    );

    // Pending, dropped, rejected, and declined enrollments do NOT count as enrolled
    for (const status of ["PENDING", "DROPPED", "REJECTED", "DECLINED", ""]) {
      assert.equal(isApprovedCourseEnrollment({ status }), false);
    }
    assert.equal(isApprovedCourseEnrollment({ status: "APPROVED" }), true);

    assert.equal(
      canActorViewLecture(
        { userId: "stu-pending", role: "STUDENT", instituteCode: "ite" },
        course101
      ),
      false
    );
    assert.equal(
      canActorViewLecture(
        { userId: "stu-dropped", role: "STUDENT", instituteCode: "ite" },
        course101
      ),
      false
    );
    assert.equal(
      canActorViewLecture(
        { userId: "stu-rejected", role: "STUDENT", instituteCode: "ite" },
        course101
      ),
      false
    );
  });

  it("revokes student access immediately when enrollment changes from APPROVED to DROPPED", () => {
    const beforeDrop: LectureCourseAccessTarget = {
      ...course101,
      course: {
        ...course101.course,
        enrollments: [{ studentId: "stu-1", status: "APPROVED" }],
      },
    };
    assert.equal(
      canActorViewLecture(
        { userId: "stu-1", role: "STUDENT", instituteCode: "ite" },
        beforeDrop
      ),
      true
    );

    const afterDrop: LectureCourseAccessTarget = {
      ...course101,
      course: {
        ...course101.course,
        enrollments: [{ studentId: "stu-1", status: "DROPPED" }],
      },
    };
    assert.equal(
      canActorViewLecture(
        { userId: "stu-1", role: "STUDENT", instituteCode: "ite" },
        afterDrop
      ),
      false
    );
  });

  it("shows lectures from all courses a multi-enrolled student is APPROVED in, and hides courses they are not enrolled in", () => {
    const visibleToMulti = filterVisibleLecturesForActor(
      { userId: "stu-multi", role: "STUDENT", instituteCode: "ite" },
      [course101, course102]
    );
    assert.equal(visibleToMulti.length, 2);

    const visibleToSingle = filterVisibleLecturesForActor(
      { userId: "stu-enrolled-1", role: "STUDENT", instituteCode: "ite" },
      [course101, course102]
    );
    assert.equal(visibleToSingle.length, 1);
    assert.equal(visibleToSingle[0].courseId, "course-101");

    const visibleToUnenrolled = filterVisibleLecturesForActor(
      { userId: "stu-unassigned", role: "STUDENT", instituteCode: "ite" },
      [course101, course102]
    );
    assert.equal(visibleToUnenrolled.length, 0);
  });

  it("prevents faculty from attaching or moving a lecture to a course they do not teach (403) or an archived/non-ITE course", () => {
    // Own active ITE course -> allowed
    assert.deepEqual(
      canActorAssignLectureToCourse(
        { userId: "fac-1", role: "INSTRUCTOR", instituteCode: "ite" },
        course101.course
      ),
      { ok: true }
    );

    // Another instructor's course -> 403 Forbidden
    const otherCourseAttempt = canActorAssignLectureToCourse(
      { userId: "fac-other", role: "INSTRUCTOR", instituteCode: "ite" },
      course101.course
    );
    assert.equal(otherCourseAttempt.ok, false);
    if (!otherCourseAttempt.ok) {
      assert.equal(otherCourseAttempt.status, 403);
      assert.match(otherCourseAttempt.reason, /courses you teach/i);
    }

    // Archived course -> rejected
    const archivedAttempt = canActorAssignLectureToCourse(
      { userId: "fac-1", role: "INSTRUCTOR", instituteCode: "ite" },
      { ...course101.course, isArchived: true }
    );
    assert.equal(archivedAttempt.ok, false);

    // Non-ITE course -> rejected
    const icsCourseAttempt = canActorAssignLectureToCourse(
      { userId: "admin-ite", role: "ADMIN", instituteCode: "ite" },
      { ...course101.course, instituteCode: "ics" }
    );
    assert.equal(icsCourseAttempt.ok, false);
  });

  it("allows a second instructor of the same course to view the lecture and its progress table, but NOT edit or delete it", () => {
    const coInstructor = {
      userId: "fac-co-2",
      role: "INSTRUCTOR",
      instituteCode: "ite",
    };
    const uploader = {
      userId: "fac-1",
      role: "INSTRUCTOR",
      instituteCode: "ite",
    };
    const unrelatedInstructor = {
      userId: "fac-3",
      role: "INSTRUCTOR",
      instituteCode: "ite",
    };

    assert.equal(doesInstructorTeachCourse("fac-1", course101.course), true);
    assert.equal(doesInstructorTeachCourse("fac-co-2", course101.course), true);
    assert.equal(doesInstructorTeachCourse("fac-3", course101.course), false);

    // Co-instructor can view the lecture and view its progress table
    assert.equal(canActorViewLecture(coInstructor, course101), true);
    assert.equal(canActorViewLectureProgress(coInstructor, course101), true);
    // Co-instructor CANNOT edit or delete a lecture uploaded by fac-1
    assert.equal(canManageLecture(coInstructor, course101), false);

    // Uploader can view, view progress, and manage (edit/delete)
    assert.equal(canActorViewLecture(uploader, course101), true);
    assert.equal(canActorViewLectureProgress(uploader, course101), true);
    assert.equal(canManageLecture(uploader, course101), true);

    // Unrelated instructor cannot view, view progress, or manage
    assert.equal(canActorViewLecture(unrelatedInstructor, course101), false);
    assert.equal(
      canActorViewLectureProgress(unrelatedInstructor, course101),
      false
    );
    assert.equal(canManageLecture(unrelatedInstructor, course101), false);
  });

  it("allows an ITE admin to see, assign, view progress for, and manage any active ITE lecture", () => {
    const admin = {
      userId: "admin-ite-1",
      role: "ADMIN",
      instituteCode: "ite",
    };

    assert.equal(canActorViewLecture(admin, course101), true);
    assert.equal(canActorViewLecture(admin, course102), true);
    assert.equal(canActorViewLectureProgress(admin, course101), true);
    assert.equal(canManageLecture(admin, course101), true);
    assert.equal(canManageLecture(admin, course102), true);
    assert.deepEqual(canActorAssignLectureToCourse(admin, course101.course), {
      ok: true,
    });
    assert.deepEqual(canActorAssignLectureToCourse(admin, course102.course), {
      ok: true,
    });
  });
});

describe("ITE Lecture Videos - Subject-Scoped Faculty Progress Table (UPLOAD, YOUTUBE & DRIVE)", () => {
  const sampleStudents: IteStudentIdentity[] = [
    {
      id: "stu-beced",
      name: "Ana Santos",
      studentNumber: "24-0001",
      programCode: "BECEd",
      section: "BECEd-2A",
      enrollmentStatus: "APPROVED",
    },
    {
      id: "stu-beed",
      name: "Ben Cruz",
      studentNumber: "24-0002",
      programCode: "BEEd",
      section: "BEEd-1B",
      enrollmentStatus: "APPROVED",
    },
    {
      id: "stu-btled",
      name: "Carla Reyes",
      studentNumber: "24-0003",
      programCode: "BTLEd ICT",
      section: "BTLEd-3A",
      enrollmentStatus: "APPROVED",
    },
    {
      id: "stu-bsed",
      name: "Dino Gomez",
      studentNumber: "24-0004",
      programCode: "BSEd SCIENCE",
      section: "BSEd-4A",
      enrollmentStatus: "APPROVED",
    },
  ];

  it("lists ONLY enrolled (APPROVED) students of that lecture's course, shows Not started for enrolled students who never opened it, and excludes dropped/pending/non-enrolled students even if they have old progress rows", () => {
    const mixedRoster: IteStudentIdentity[] = [
      ...sampleStudents,
      {
        id: "stu-dropped-with-old-progress",
        name: "Dropped Student",
        studentNumber: "24-0099",
        programCode: "BECEd",
        section: "BECEd-2A",
        enrollmentStatus: "DROPPED",
      },
      {
        id: "stu-pending-1",
        name: "Pending Student",
        studentNumber: "24-0100",
        programCode: "BEEd",
        section: "BEEd-1B",
        enrollmentStatus: "PENDING",
      },
    ];

    const report = buildFacultyLectureProgressReport({
      lectureId: "lec-ite-1",
      lectureTitle: "Principles of Teaching 1",
      courseId: "course-101",
      courseLabel: "EDUC 101 — Principles of Teaching 1 (Sec BECEd-2A)",
      lectureSourceType: "YOUTUBE",
      lectureDurationSeconds: 200,
      students: mixedRoster,
      progressRows: [
        {
          studentId: "stu-beced",
          lastPositionSeconds: 185,
          watchedSeconds: 185,
          durationSeconds: 200,
          completedAt: new Date("2026-11-14T04:00:00.000Z"),
          lastWatchedAt: new Date("2026-11-14T04:00:00.000Z"),
        },
        {
          studentId: "stu-btled",
          lastPositionSeconds: 80,
          watchedSeconds: 80,
          durationSeconds: 200,
          completedAt: null,
          lastWatchedAt: new Date("2026-11-14T04:15:00.000Z"),
        },
        // Old progress row for a student who was later dropped from the course
        {
          studentId: "stu-dropped-with-old-progress",
          lastPositionSeconds: 200,
          watchedSeconds: 200,
          durationSeconds: 200,
          completedAt: new Date("2026-11-10T04:00:00.000Z"),
          lastWatchedAt: new Date("2026-11-10T04:00:00.000Z"),
        },
        // Progress row for a student not in the course roster at all
        {
          studentId: "stu-not-enrolled-at-all",
          lastPositionSeconds: 190,
          watchedSeconds: 190,
          durationSeconds: 200,
          completedAt: new Date("2026-11-10T04:00:00.000Z"),
          lastWatchedAt: new Date("2026-11-10T04:00:00.000Z"),
        },
      ],
    });

    assert.equal(report.courseId, "course-101");
    assert.equal(
      report.courseLabel,
      "EDUC 101 — Principles of Teaching 1 (Sec BECEd-2A)"
    );
    assert.equal(report.lectureSourceType, "YOUTUBE");
    assert.equal(report.lectureSourceLabel, "YouTube");
    assert.equal(report.isProgressTracked, true);
    assert.equal(report.trackingNote, null);
    assert.deepEqual(report.summary, {
      total: 4,
      completed: 1,
      inProgress: 1,
      notStarted: 2,
    });

    // Dropped, pending, and non-enrolled students never appear in the course progress rows
    assert.equal(
      report.rows.some(
        (r) => r.studentId === "stu-dropped-with-old-progress"
      ),
      false
    );
    assert.equal(
      report.rows.some((r) => r.studentId === "stu-pending-1"),
      false
    );
    assert.equal(
      report.rows.some((r) => r.studentId === "stu-not-enrolled-at-all"),
      false
    );

    const beedRow = report.rows.find((r) => r.studentId === "stu-beed")!;
    assert.equal(beedRow.programCode, "BEEd");
    assert.equal(beedRow.status, "NOT_STARTED");
    assert.equal(beedRow.statusLabel, "Not started");

    const becedOnly = filterAndSortFacultyProgressRows(report.rows, {
      programFilter: "BECEd",
    });
    assert.equal(becedOnly.rows.length, 1);
    assert.deepEqual(becedOnly.summary, {
      total: 1,
      completed: 1,
      inProgress: 0,
      notStarted: 0,
    });
  });

  it("marks Google Drive lectures as 'Not tracked' (not 'Not started') and excludes them from completed/inProgress/notStarted counts", () => {
    const driveReport = buildFacultyLectureProgressReport({
      lectureId: "lec-drive-1",
      lectureTitle: "Drive Recorded Demo",
      courseId: "course-101",
      courseLabel: "EDUC 101 — Principles of Teaching 1",
      lectureSourceType: "DRIVE",
      lectureDurationSeconds: 0,
      students: sampleStudents,
      progressRows: [],
    });

    assert.equal(driveReport.courseId, "course-101");
    assert.equal(driveReport.lectureSourceType, "DRIVE");
    assert.equal(driveReport.lectureSourceLabel, "Google Drive");
    assert.equal(driveReport.isProgressTracked, false);
    assert.equal(driveReport.trackingNote, DRIVE_NOT_TRACKED_NOTE);

    // Excluded from completed / inProgress / notStarted counts
    assert.deepEqual(driveReport.summary, {
      total: 4,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
    });

    for (const row of driveReport.rows) {
      assert.equal(row.status, "NOT_TRACKED");
      assert.equal(row.statusLabel, "Not tracked");
      assert.equal(row.percentWatched, 0);
      assert.equal(row.lastWatchedAt, null);
    }

    // Filtered summary also keeps completed/inProgress/notStarted at 0
    const filtered = filterAndSortFacultyProgressRows(driveReport.rows, {
      programFilter: "BECEd",
    });
    assert.equal(filtered.rows.length, 1);
    assert.equal(filtered.rows[0].statusLabel, "Not tracked");
    assert.deepEqual(filtered.summary, {
      total: 1,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
    });
  });
});

describe("ITE Lecture Videos - POST /api/lecture-videos Error Classification", () => {
  it("returns specific, safe messages for validation (400) and not-your-course (403) failures", () => {
    const validationErr = {
      status: 400,
      message: "Please enter a valid YouTube video URL.",
    };
    assert.deepEqual(classifyLectureVideoApiError(validationErr), {
      kind: "VALIDATION",
      status: 400,
      message: "Please enter a valid YouTube video URL.",
    });

    const notYourCourseErr = {
      status: 403,
      message: "You can only assign lectures to ITE courses you teach.",
    };
    assert.deepEqual(classifyLectureVideoApiError(notYourCourseErr), {
      kind: "NOT_YOUR_COURSE",
      status: 403,
      message: "You can only assign lectures to ITE courses you teach.",
    });

    const notFoundErr = {
      status: 404,
      message: "Selected subject was not found in ITE.",
    };
    assert.deepEqual(classifyLectureVideoApiError(notFoundErr), {
      kind: "NOT_FOUND",
      status: 404,
      message: "Selected subject was not found in ITE.",
    });
  });

  it("returns a specific, safe database-not-migrated message (503) for Prisma P2021/P2022 and PostgreSQL 42P01/42703 errors", () => {
    const prismaP2021 = {
      name: "PrismaClientKnownRequestError",
      code: "P2021",
      meta: {
        modelName: "IteLectureVideo",
        driverAdapterError: {
          name: "DriverAdapterError",
          cause: {
            originalCode: "42P01",
            originalMessage: 'relation "public.IteLectureVideo" does not exist',
            kind: "TableDoesNotExist",
            table: "public.IteLectureVideo",
          },
        },
      },
      message:
        "Invalid `db.iteLectureVideo.create()` invocation:\nThe table `public.IteLectureVideo` does not exist in the current database.",
    };

    assert.equal(isLectureDatabaseNotMigratedError(prismaP2021), true);
    assert.deepEqual(classifyLectureVideoApiError(prismaP2021), {
      kind: "DATABASE_NOT_MIGRATED",
      status: 503,
      message: LECTURE_DB_NOT_MIGRATED_MESSAGE,
    });

    const prismaP2022MissingColumn = {
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      message:
        "The column `IteLectureVideo.courseId` does not exist in the current database.",
    };
    assert.equal(
      isLectureDatabaseNotMigratedError(prismaP2022MissingColumn),
      true
    );
    assert.deepEqual(classifyLectureVideoApiError(prismaP2022MissingColumn), {
      kind: "DATABASE_NOT_MIGRATED",
      status: 503,
      message: LECTURE_DB_NOT_MIGRATED_MESSAGE,
    });
  });

  it("keeps unknown errors generic ('An unexpected error occurred.') for the user", () => {
    const unexpected = new Error(
      "Connection terminated unexpectedly to internal host"
    );
    assert.equal(isLectureDatabaseNotMigratedError(unexpected), false);
    assert.deepEqual(classifyLectureVideoApiError(unexpected), {
      kind: "UNKNOWN",
      status: 500,
      message: LECTURE_UNEXPECTED_ERROR_MESSAGE,
    });
  });
});
