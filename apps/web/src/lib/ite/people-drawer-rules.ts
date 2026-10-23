export type UserRole = "STUDENT" | "PROFESSOR" | "TEACHER" | "ADMIN" | string;
export type TargetRole = "STUDENT" | "PROFESSOR" | "TEACHER" | "ADMIN" | "classmate" | "instructor" | string;

export interface DrawerPermissionParams {
  userRole: UserRole;
  targetRole: TargetRole;
  instituteCode: string;
  action?: "row_click" | "message_button";
}

/**
 * Pure decision: determines whether the private comment/feedback drawer can be opened.
 *
 * Rules:
 * - In ITE, students cannot open a feedback drawer about classmates (neither row click nor button).
 * - In ITE, students clicking an instructor row does nothing unintentionally;
 *   only an explicit "message_button" action opens the drawer to message their instructor.
 * - In ITE, instructors and admins can open the drawer for students via row click or message button.
 * - Non-ITE (ICS/IBE) preserves standard behavior (instructors/admins can open for students; students cannot open for classmates).
 */
export function canOpenFeedbackDrawer({
  userRole,
  targetRole,
  instituteCode,
  action = "row_click",
}: DrawerPermissionParams): boolean {
  const normUserRole = (userRole || "").toUpperCase();
  const normTarget = (targetRole || "").toUpperCase();
  const isIte = (instituteCode || "").toLowerCase() === "ite";
  const isStudent = normUserRole === "STUDENT";
  const isInstructorOrAdmin = normUserRole === "PROFESSOR" || normUserRole === "TEACHER" || normUserRole === "ADMIN";

  if (isIte) {
    if (isStudent) {
      const isTargetInstructor = normTarget === "PROFESSOR" || normTarget === "TEACHER" || normTarget === "INSTRUCTOR";
      // Student messaging instructor is only permitted via explicit message button
      if (isTargetInstructor && action === "message_button") {
        return true;
      }
      // Classmate clicks, or clicking instructor row directly, never open the drawer
      return false;
    }

    if (isInstructorOrAdmin) {
      // Instructors/admins manage students
      const isTargetStudent = normTarget === "STUDENT" || normTarget === "CLASSMATE";
      return isTargetStudent;
    }

    return false;
  }

  // ICS / IBE standard behavior
  if (isInstructorOrAdmin) {
    return normTarget === "STUDENT" || normTarget === "CLASSMATE";
  }
  return false;
}

export interface FeedbackDrawerCopy {
  displayName: string;
  subtitle: string;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  inputPlaceholder: string;
}

/**
 * Pure helper: resolves drawer labels and placeholder copy depending on whether
 * an instructor is giving feedback to a student or a student is messaging an instructor.
 */
export function getFeedbackDrawerCopy({
  userRole,
  targetRole,
  targetName,
  instituteCode,
}: {
  userRole: UserRole;
  targetRole?: TargetRole;
  targetName?: string | null;
  instituteCode?: string;
}): FeedbackDrawerCopy {
  const normUserRole = (userRole || "").toUpperCase();
  const normTarget = (targetRole || "").toUpperCase();
  const isIte = (instituteCode || "").toLowerCase() === "ite";
  const isStudentToInstructor =
    normUserRole === "STUDENT" &&
    (normTarget === "PROFESSOR" || normTarget === "TEACHER" || normTarget === "INSTRUCTOR");

  const displayName = (targetName && targetName.trim()) || (isStudentToInstructor ? "Instructor" : "Student");

  if (isStudentToInstructor) {
    return {
      displayName,
      subtitle: isIte ? "Private message channel with instructor" : "Private message channel",
      emptyStateTitle: "No messages yet",
      emptyStateSubtitle: "Send a private message to your instructor",
      inputPlaceholder: "Write a message to your instructor...",
    };
  }

  return {
    displayName,
    subtitle: "Private feedback channel",
    emptyStateTitle: "No messages yet",
    emptyStateSubtitle: "Send private feedback about this student's progress",
    inputPlaceholder: "Write private feedback...",
  };
}

export interface CourseCommentContext {
  id: string;
  instructorId: string | null;
  isArchived: boolean;
  instituteCode?: string | null;
}

export interface PrivateCommentAccessParams {
  userId: string;
  userRole: UserRole;
  targetUserId: string;
  course: CourseCommentContext | null;
  enrollmentStatus?: string | null;
}

export interface CommentAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Pure authorization decision for reading or sending private comments.
 *
 * Rules:
 * - Both user identity and target identity must be provided and cannot be identical.
 * - Course must exist.
 * - ADMIN is allowed across courses (including archived).
 * - Instructors (PROFESSOR / TEACHER) are allowed only for courses where course.instructorId === userId (including archived, matching HEAD).
 * - Students are allowed ONLY in the ITE institute (loaded from DB course.instituteCode), ONLY when course is NOT archived,
 *   ONLY when actively enrolled (status === "APPROVED"), and ONLY when messaging or reading their own thread with the
 *   course instructor (targetUserId === course.instructorId).
 * - Non-ITE students (ICS / IBE) or students messaging classmates or non-instructors are denied.
 */
export function evaluatePrivateCommentAccess({
  userId,
  userRole,
  targetUserId,
  course,
  enrollmentStatus,
}: PrivateCommentAccessParams): CommentAccessResult {
  if (!userId || !targetUserId) {
    return { allowed: false, reason: "Missing participant identity" };
  }

  if (userId === targetUserId) {
    return { allowed: false, reason: "Self-messaging is not permitted" };
  }

  if (!course) {
    return { allowed: false, reason: "Course not found" };
  }

  const normUserRole = (userRole || "").toUpperCase();
  const effectiveInstitute = (course.instituteCode || "").toLowerCase();

  // Course owner / instructor: allowed when course.instructorId === userId (any role, matching HEAD)
  if (course.instructorId && course.instructorId === userId) {
    return { allowed: true };
  }

  // Admin access (allowed across courses and states, matching HEAD)
  if (normUserRole === "ADMIN") {
    return { allowed: true };
  }

  // Student access: applies only when user is STUDENT
  if (normUserRole === "STUDENT") {
    // Archived courses block the student path
    if (course.isArchived) {
      return { allowed: false, reason: "Course is archived" };
    }

    // Only permitted in ITE on the server (derived strictly from DB course.instituteCode)
    if (!effectiveInstitute || effectiveInstitute !== "ite") {
      return { allowed: false, reason: "Student messaging is only supported for ITE institute" };
    }

    // Must be actively enrolled (APPROVED status only; pending, dropped, or null are rejected)
    if (enrollmentStatus !== "APPROVED") {
      return { allowed: false, reason: "Student must have an APPROVED enrollment in the course" };
    }

    // Counterpart must be the assigned course instructor
    if (!course.instructorId || targetUserId !== course.instructorId) {
      return { allowed: false, reason: "Student counterpart must be the course instructor" };
    }

    return { allowed: true };
  }

  // Non-instructor, non-admin, non-student user (e.g. instructor of another course, or other role)
  if (normUserRole === "PROFESSOR" || normUserRole === "TEACHER" || normUserRole === "INSTRUCTOR") {
    return { allowed: false, reason: "Instructor does not teach this course" };
  }

  return { allowed: false, reason: "Unauthorized: only course instructor, admin, or enrolled student" };
}

