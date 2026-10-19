import type { Prisma } from "@prisma/client";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";

export function leaderboardCourseWhere(user: { id: string; instituteId: string; role: string }): Prisma.CourseWhereInput {
  const role = canonicalRole(user.role);
  return {
    instituteId: user.instituteId,
    isArchived: false,
    ...(role === "ADMIN" ? {} : role === "INSTRUCTOR" ? { instructorId: user.id }
      : role === "STUDENT" ? { enrollments: { some: { studentId: user.id, status: "APPROVED" } } }
      : { id: { in: [] } }),
  };
}

export const rankedSubmissionWhere: Prisma.StudentSubmissionWhereInput = {
  grade: { not: null },
  OR: [
    { status: { in: ["GRADED", "RETURNED"] } },
    { status: "SUBMITTED", isReturned: true },
  ],
};

export function leaderboardActivityWhere(user: { id: string; instituteId: string; role: string }): Prisma.SyllabusItemWhereInput {
  return {
    course: leaderboardCourseWhere(user),
    type: { not: "MATERIAL" },
    ...(canonicalRole(user.role) === "STUDENT" ? {
      OR: [
        { targetGroups: { none: {} } },
        { targetGroups: { some: { group: { members: { some: { studentId: user.id } } } } } },
      ],
    } : {}),
  };
}

export function leaderboardScore(grade: number, status: string, isForm: boolean, maxPoints: number | null) {
  // Form auto-grades are stored as percentages; manual grades are stored as points.
  return isForm && status === "SUBMITTED"
    ? Math.round(grade * (maxPoints ?? 100)) / 100
    : grade;
}
