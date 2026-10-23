/**
 * apps/web/src/lib/ite/meetings/guard.ts
 *
 * Server-side authorization guards for ITE Class Meetings.
 * Ensures strict scoping: only ITE instructors who own the course and
 * approved enrolled ITE students have access.
 */

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireIteUser, checkIteEligibility, isIteInstituteCode } from "@/lib/ite/ite-eligibility";
import { HttpError } from "@/lib/practicum/http";

export interface MeetingActor {
  userId: string;
  role: "STUDENT" | "PROFESSOR";
  instituteCode: string;
  instituteId: string;
  name?: string;
}

/**
 * Server Component page guard:
 * Verifies ITE eligibility and role (STUDENT or PROFESSOR). Redirects to login if unauthenticated,
 * returns notFound() for non-ITE users, admins, super users, etc.
 */
export async function requireMeetingPageActor(institute: string): Promise<MeetingActor> {
  const result = await checkIteEligibility();
  if (!result) redirect(`/login?institute=${institute}`);
  if (!result.eligible || !isIteInstituteCode(institute)) notFound();

  const normalizedRole = result.role;
  if (normalizedRole !== "STUDENT" && normalizedRole !== "INSTRUCTOR") {
    notFound();
  }

  const role: "STUDENT" | "PROFESSOR" = normalizedRole === "INSTRUCTOR" ? "PROFESSOR" : "STUDENT";
  const sessionUser = result.session.user as { instituteId?: string; name?: string };

  return {
    userId: result.userId,
    role,
    instituteCode: result.instituteCode,
    instituteId: sessionUser.instituteId || "",
    name: sessionUser.name,
  };
}

/**
 * Ensures the request is authenticated, belongs to ITE, and has an allowed role (STUDENT or PROFESSOR).
 */
export async function requireMeetingActor(request: Request): Promise<MeetingActor> {
  const result = await requireIteUser(request);

  if (!result.eligible) {
    throw new HttpError(403, "Class Meetings are only available to ITE users.");
  }

  const normalizedRole = result.role;
  if (normalizedRole !== "STUDENT" && normalizedRole !== "INSTRUCTOR") {
    throw new HttpError(403, "Class Meetings are only accessible to students and course instructors.");
  }

  const role: "STUDENT" | "PROFESSOR" = normalizedRole === "INSTRUCTOR" ? "PROFESSOR" : "STUDENT";
  const sessionUser = result.session.user as { instituteId?: string; name?: string };

  return {
    userId: result.userId,
    role,
    instituteCode: result.instituteCode,
    instituteId: sessionUser.instituteId || "",
    name: sessionUser.name,
  };
}

/**
 * Asserts that the actor is an ITE instructor who owns the specified course.
 * Returns the course record or throws 404/403. Never leaks course existence.
 */
export async function requireOwnedCourse(courseId: string, instructorId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      code: true,
      title: true,
      instructorId: true,
      institute: {
        select: { code: true },
      },
    },
  });

  if (!course || course.institute.code.toLowerCase() !== "ite" || course.instructorId !== instructorId) {
    throw new HttpError(404, "Course not found.");
  }

  return course;
}

/**
 * Asserts that the actor has access to the specified meeting:
 * - If PROFESSOR: must be the course instructor who owns the meeting.
 * - If STUDENT: must be an approved enrolled student in the meeting's course.
 */
export async function requireMeetingWithAccess(meetingId: string, actor: MeetingActor) {
  const meeting = await db.classMeeting.findUnique({
    where: { id: meetingId },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          instructorId: true,
          institute: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!meeting || meeting.course.institute.code.toLowerCase() !== "ite") {
    throw new HttpError(404, "Meeting not found.");
  }

  if (actor.role === "PROFESSOR") {
    if (meeting.course.instructorId !== actor.userId) {
      throw new HttpError(404, "Meeting not found.");
    }
    return meeting;
  }

  // Student check: must be APPROVED enrollee
  const enrollment = await db.enrollment.findFirst({
    where: {
      courseId: meeting.courseId,
      studentId: actor.userId,
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new HttpError(404, "Meeting not found.");
  }

  return meeting;
}
