import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import GradesClient from "./client";
import type { GradeRow } from "./types";

export const dynamic = "force-dynamic";

export default async function GradesPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);
  const studentId = session.user.id;

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // ── 1. Fetch student's APPROVED enrollments ──
  // Same source as Assignments page and instructor People tab
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId,
      status: "APPROVED",
      course: {
        instituteId: instituteRecord.id,
        isArchived: false,
      },
    },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
        },
      },
    },
    orderBy: { displayOrderIndex: "asc" },
  });

  const enrolledCourses = enrollments.map((e) => e.course);
  const courseIds = enrolledCourses.map((c) => c.id);

  // ── 2. Fetch GRADED submissions for this student ──
  // Only rows where the instructor has actually assigned a grade:
  //   status IN ("GRADED", "RETURNED") AND grade IS NOT NULL
  // This covers both graded-in-place and returned-with-grade flows.
  const gradedSubmissions = courseIds.length === 0
    ? []
    : await db.studentSubmission.findMany({
        where: {
          studentId,
          grade: { not: null },
          status: { in: ["GRADED", "RETURNED"] },
          syllabusItem: {
            courseId: { in: courseIds },
            type: { not: "MATERIAL" }, // only ASSIGNMENT and QUIZ
            maxPoints: { not: null },  // must have a point value
          },
        },
        select: {
          id: true,
          grade: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          syllabusItem: {
            select: {
              id: true,
              title: true,
              type: true,
              maxPoints: true,
              dueDate: true,
              courseId: true,
              course: {
                select: {
                  title: true,
                  code: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "asc" },
      });

  // ── 3. Map to GradeRow (plain serializable shape for the client) ──
  const gradeRows: GradeRow[] = gradedSubmissions.map((sub) => ({
    id: sub.id,
    syllabusItemId: sub.syllabusItem.id,
    itemTitle: sub.syllabusItem.title,
    itemType: sub.syllabusItem.type as "ASSIGNMENT" | "QUIZ",
    courseId: sub.syllabusItem.courseId,
    courseTitle: sub.syllabusItem.course.title,
    courseCode: sub.syllabusItem.course.code,
    grade: sub.grade as number,          // non-null, ensured by the where clause
    maxPoints: sub.syllabusItem.maxPoints as number, // non-null, ensured above
    gradedAt: sub.updatedAt.toISOString(),
  }));

  return (
    <GradesClient
      gradeRows={gradeRows}
      enrolledCourses={enrolledCourses}
      theme={theme}
      instituteCode={theme.code}
    />
  );
}
