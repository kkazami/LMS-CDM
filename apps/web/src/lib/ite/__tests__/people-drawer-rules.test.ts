import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canOpenFeedbackDrawer,
  getFeedbackDrawerCopy,
  evaluatePrivateCommentAccess,
} from "../people-drawer-rules";

describe("People Drawer Rules - canOpenFeedbackDrawer", () => {

  describe("ITE Student Permissions", () => {
    it("ITE student clicking classmate row never opens feedback drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "STUDENT",
        targetRole: "STUDENT",
        instituteCode: "ite",
        action: "row_click",
      });
      assert.equal(allowed, false);
    });

    it("ITE student clicking classmate message button does not open drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "STUDENT",
        targetRole: "STUDENT",
        instituteCode: "ite",
        action: "message_button",
      });
      assert.equal(allowed, false);
    });

    it("ITE student clicking instructor row directly does not open drawer unintentionally", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "STUDENT",
        targetRole: "PROFESSOR",
        instituteCode: "ite",
        action: "row_click",
      });
      assert.equal(allowed, false);
    });

    it("ITE student clicking explicit 'Message instructor' button opens message drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "STUDENT",
        targetRole: "PROFESSOR",
        instituteCode: "ite",
        action: "message_button",
      });
      assert.equal(allowed, true);
    });

    it("ITE student clicking explicit 'Message instructor' button works with TEACHER or INSTRUCTOR alias", () => {
      assert.equal(
        canOpenFeedbackDrawer({
          userRole: "STUDENT",
          targetRole: "TEACHER",
          instituteCode: "ite",
          action: "message_button",
        }),
        true
      );
      assert.equal(
        canOpenFeedbackDrawer({
          userRole: "STUDENT",
          targetRole: "INSTRUCTOR",
          instituteCode: "ite",
          action: "message_button",
        }),
        true
      );
    });
  });

  describe("ITE Instructor and Admin Permissions", () => {
    it("ITE instructor clicking student row opens feedback drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "PROFESSOR",
        targetRole: "STUDENT",
        instituteCode: "ite",
        action: "row_click",
      });
      assert.equal(allowed, true);
    });

    it("ITE teacher clicking student message button opens feedback drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "TEACHER",
        targetRole: "STUDENT",
        instituteCode: "ite",
        action: "message_button",
      });
      assert.equal(allowed, true);
    });

    it("ITE admin clicking student row opens feedback drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "ADMIN",
        targetRole: "STUDENT",
        instituteCode: "ite",
        action: "row_click",
      });
      assert.equal(allowed, true);
    });
  });

  describe("Non-ITE (ICS / IBE) Scopes", () => {
    it("ICS student clicking classmate row never opens feedback drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "STUDENT",
        targetRole: "STUDENT",
        instituteCode: "ics",
        action: "row_click",
      });
      assert.equal(allowed, false);
    });

    it("IBE instructor clicking student row opens feedback drawer", () => {
      const allowed = canOpenFeedbackDrawer({
        userRole: "PROFESSOR",
        targetRole: "STUDENT",
        instituteCode: "ibe",
        action: "row_click",
      });
      assert.equal(allowed, true);
    });
  });
});

describe("People Drawer Rules - getFeedbackDrawerCopy", () => {
  it("provides student-to-instructor copy and never falls back to empty string or '?'", () => {
    const copy = getFeedbackDrawerCopy({
      userRole: "STUDENT",
      targetRole: "PROFESSOR",
      targetName: "Prof. Alan Turing",
      instituteCode: "ite",
    });
    assert.equal(copy.displayName, "Prof. Alan Turing");
    assert.equal(copy.subtitle, "Private message channel with instructor");
    assert.equal(copy.emptyStateSubtitle, "Send a private message to your instructor");
    assert.equal(copy.inputPlaceholder, "Write a message to your instructor...");
  });

  it("handles missing targetName by using 'Instructor' without deriving '?'", () => {
    const copy = getFeedbackDrawerCopy({
      userRole: "STUDENT",
      targetRole: "PROFESSOR",
      targetName: "",
      instituteCode: "ite",
    });
    assert.equal(copy.displayName, "Instructor");
  });

  it("provides instructor-to-student copy for private feedback channel", () => {
    const copy = getFeedbackDrawerCopy({
      userRole: "PROFESSOR",
      targetRole: "STUDENT",
      targetName: "Jane Doe",
      instituteCode: "ite",
    });
    assert.equal(copy.displayName, "Jane Doe");
    assert.equal(copy.subtitle, "Private feedback channel");
    assert.equal(copy.emptyStateSubtitle, "Send private feedback about this student's progress");
    assert.equal(copy.inputPlaceholder, "Write private feedback...");
  });

  it("handles empty student name gracefully by falling back to 'Student'", () => {
    const copy = getFeedbackDrawerCopy({
      userRole: "PROFESSOR",
      targetRole: "STUDENT",
      targetName: null,
      instituteCode: "ite",
    });
    assert.equal(copy.displayName, "Student");
  });
});

describe("Private Comment Server Authorization - evaluatePrivateCommentAccess", () => {
  const defaultIteCourse = {
    id: "course-123",
    instructorId: "prof-alice",
    isArchived: false,
    instituteCode: "ite",
  };

  it("student own thread allowed (ITE)", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: defaultIteCourse,
      enrollmentStatus: "APPROVED",
    });
    assert.equal(result.allowed, true);
  });

  it("student other thread denied", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "student-charlie",
      course: defaultIteCourse,
      enrollmentStatus: "APPROVED",
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /instructor/i);
  });

  it("student in ICS denied", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: {
        ...defaultIteCourse,
        instituteCode: "ics",
      },
      enrollmentStatus: "APPROVED",
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /ITE institute/i);
  });

  it("student in IBE denied", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: {
        ...defaultIteCourse,
        instituteCode: "ibe",
      },
      enrollmentStatus: "APPROVED",
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /ITE institute/i);
  });

  it("student in ICS course cannot unlock the student path by any client value", () => {
    // The evaluator function signature accepts ONLY { userId, userRole, targetUserId, course, enrollmentStatus }.
    // Spoofing is impossible by construction because client instituteCode is not accepted.
    const icsCourse = {
      ...defaultIteCourse,
      instituteCode: "ics",
    };
    const result = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: icsCourse,
      enrollmentStatus: "APPROVED",
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /ITE institute/i);

    // Course with no institute is also denied
    const noInstituteCourse = {
      ...defaultIteCourse,
      instituteCode: null,
    };
    const resultNoInst = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: noInstituteCourse,
      enrollmentStatus: "APPROVED",
    });
    assert.equal(resultNoInst.allowed, false);
    assert.match(resultNoInst.reason || "", /ITE institute/i);
  });

  it("pending student denied", () => {
    const resultPending = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: defaultIteCourse,
      enrollmentStatus: "PENDING",
    });
    assert.equal(resultPending.allowed, false);
    assert.match(resultPending.reason || "", /APPROVED enrollment/i);

    const resultDropped = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: defaultIteCourse,
      enrollmentStatus: "DROPPED",
    });
    assert.equal(resultDropped.allowed, false);

    const resultNone = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: defaultIteCourse,
      enrollmentStatus: null,
    });
    assert.equal(resultNone.allowed, false);
  });

  it("non-instructor target denied", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "random-user-id",
      course: defaultIteCourse,
      enrollmentStatus: "APPROVED",
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /instructor/i);
  });

  it("instructor of another course denied", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "prof-other",
      userRole: "PROFESSOR",
      targetUserId: "student-bob",
      course: defaultIteCourse, // instructorId is "prof-alice"
      enrollmentStatus: null,
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /does not teach this course/i);
  });

  it("course instructor of this course allowed", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "prof-alice",
      userRole: "PROFESSOR",
      targetUserId: "student-bob",
      course: defaultIteCourse,
      enrollmentStatus: null,
    });
    assert.equal(result.allowed, true);
  });

  it("admin allowed across courses", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "admin-root",
      userRole: "ADMIN",
      targetUserId: "student-bob",
      course: defaultIteCourse,
      enrollmentStatus: null,
    });
    assert.equal(result.allowed, true);
  });

  it("archived course denies student path but allows instructors and admins (matching HEAD)", () => {
    const archivedCourse = {
      ...defaultIteCourse,
      isArchived: true,
    };
    // Students are blocked in archived courses
    const studentResult = evaluatePrivateCommentAccess({
      userId: "student-bob",
      userRole: "STUDENT",
      targetUserId: "prof-alice",
      course: archivedCourse,
      enrollmentStatus: "APPROVED",
    });
    assert.equal(studentResult.allowed, false);
    assert.match(studentResult.reason || "", /archived/i);

    // Instructors are allowed in archived courses (matching HEAD)
    const instructorResult = evaluatePrivateCommentAccess({
      userId: "prof-alice",
      userRole: "PROFESSOR",
      targetUserId: "student-bob",
      course: archivedCourse,
      enrollmentStatus: null,
    });
    assert.equal(instructorResult.allowed, true);

    // Admins are allowed in archived courses (matching HEAD)
    const adminResult = evaluatePrivateCommentAccess({
      userId: "admin-root",
      userRole: "ADMIN",
      targetUserId: "student-bob",
      course: archivedCourse,
      enrollmentStatus: null,
    });
    assert.equal(adminResult.allowed, true);
  });

  it("instructor with a non-PROFESSOR role who is course.instructorId is allowed (matching HEAD)", () => {
    // Role "INSTRUCTOR"
    const resultInstructor = evaluatePrivateCommentAccess({
      userId: "inst-1",
      userRole: "INSTRUCTOR",
      targetUserId: "student-bob",
      course: { ...defaultIteCourse, instructorId: "inst-1" },
      enrollmentStatus: null,
    });
    assert.equal(resultInstructor.allowed, true);

    // Role "TEACHER"
    const resultTeacher = evaluatePrivateCommentAccess({
      userId: "teacher-1",
      userRole: "TEACHER",
      targetUserId: "student-bob",
      course: { ...defaultIteCourse, instructorId: "teacher-1" },
      enrollmentStatus: null,
    });
    assert.equal(resultTeacher.allowed, true);

    // Non-standard / custom role string (e.g. "DEAN", "PROGRAM_HEAD", "STAFF") who owns the course
    const resultDean = evaluatePrivateCommentAccess({
      userId: "dean-1",
      userRole: "DEAN",
      targetUserId: "student-bob",
      course: { ...defaultIteCourse, instructorId: "dean-1" },
      enrollmentStatus: null,
    });
    assert.equal(resultDean.allowed, true);
  });

  it("non-instructor non-admin non-student is denied", () => {
    const resultGuest = evaluatePrivateCommentAccess({
      userId: "guest-user",
      userRole: "GUEST",
      targetUserId: "student-bob",
      course: defaultIteCourse, // instructorId is "prof-alice"
      enrollmentStatus: null,
    });
    assert.equal(resultGuest.allowed, false);
    assert.match(resultGuest.reason || "", /Unauthorized/i);

    const resultDeanNotInstructor = evaluatePrivateCommentAccess({
      userId: "dean-user",
      userRole: "DEAN",
      targetUserId: "student-bob",
      course: defaultIteCourse, // instructorId is "prof-alice"
      enrollmentStatus: null,
    });
    assert.equal(resultDeanNotInstructor.allowed, false);
    assert.match(resultDeanNotInstructor.reason || "", /Unauthorized/i);
  });

  it("self-messaging denied", () => {
    const result = evaluatePrivateCommentAccess({
      userId: "prof-alice",
      userRole: "PROFESSOR",
      targetUserId: "prof-alice",
      course: defaultIteCourse,
      enrollmentStatus: null,
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason || "", /Self-messaging/i);
  });
});

