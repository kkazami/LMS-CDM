import { cache } from "react";
import { db } from "@/lib/db";
import { rankFromCounts } from "@/lib/gamification/rank";

/**
 * Request-scoped (React cache) dashboard queries, so the dashboard layout and the page
 * share one institute lookup and one enrollment query instead of repeating them.
 */

export const getInstituteByCode = cache(async (code: string) =>
  db.institute.findUnique({
    where: { code: code.toLowerCase() },
    select: { id: true, name: true, code: true },
  })
);

export const getStudentEnrollments = cache(async (studentId: string, instituteId: string) =>
  db.enrollment.findMany({
    where: {
      studentId,
      status: "APPROVED",
      course: { instituteId, isArchived: false },
    },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
          room: true,
          description: true,
          coverImage: true,
          instructor: { select: { name: true } },
        },
      },
    },
    orderBy: { displayOrderIndex: "asc" },
  })
);

/**
 * The student's real leaderboard rank by EXP among active students of the same institute,
 * ordered like the leaderboard page (EXP desc, studentId asc). null = unranked (no EXP).
 */
export async function getStudentRank(
  studentId: string,
  instituteId: string,
  exp: number
): Promise<number | null> {
  if (exp <= 0) return null;

  const sameInstitute = { student: { instituteId, role: "STUDENT", isActive: true } };
  const [higher, tiedLower] = await Promise.all([
    db.gamificationProfile.count({ where: { ...sameInstitute, exp: { gt: exp } } }),
    db.gamificationProfile.count({ where: { ...sameInstitute, exp, studentId: { lt: studentId } } }),
  ]);
  return rankFromCounts(exp, higher, tiedLower);
}
