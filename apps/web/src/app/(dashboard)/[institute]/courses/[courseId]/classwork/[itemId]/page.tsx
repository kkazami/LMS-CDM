import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { logActivity } from "@/lib/ite/activity-logger";
import AssignmentDetailClient from "./client";
import { getOrCreateSubmission } from "./actions";

interface Props {
  params: Promise<{ institute: string; courseId: string; itemId: string }>;
}

export default async function AssignmentDetailPage({ params }: Props) {
  const { institute, courseId, itemId } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);

  const role = session.user.role.toUpperCase();
  const isStudent = role === "STUDENT";
  const isInstructor = role === "PROFESSOR" || role === "ADMIN";

  // Fetch syllabus item with attachments
  const item = await db.syllabusItem.findUnique({
    where: { id: itemId },
    include: {
      attachments: { orderBy: { createdAt: "asc" } },
      course: { select: { id: true, title: true, code: true } },
    },
  });

  if (!item || item.courseId !== courseId) notFound();

  // Access control: student must be enrolled
  if (isStudent) {
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
      select: { status: true },
    });
    if (!enrollment || enrollment.status !== "APPROVED") {
      redirect(`/${institute}/courses`);
    }
  }

  // Enrolled student count (for instructor)
  let enrolledCount: number | undefined;
  if (isInstructor) {
    enrolledCount = await db.enrollment.count({
      where: { courseId, status: "APPROVED" },
    });
  }

  // For students: get or create their submission
  let submission = null;
  if (isStudent && item.type !== "MATERIAL") {
    submission = await getOrCreateSubmission(itemId);
  }

  // Log activity event for ITE students (MATERIAL_VIEW or QUIZ_ATTEMPT)
  if (isStudent) {
    if (item.type === "MATERIAL") {
      after(async () => {
        try {
          await logActivity({
            userId: session.user.id,
            instituteId: (session.user as Record<string, unknown>).instituteId as string | undefined,
            courseId,
            type: "MATERIAL_VIEW",
            refId: itemId,
          });
        } catch (err) {
          console.error("[activity-logger] material view error:", err);
        }
      });
    } else if (item.type === "QUIZ") {
      after(async () => {
        try {
          await logActivity({
            userId: session.user.id,
            instituteId: (session.user as Record<string, unknown>).instituteId as string | undefined,
            courseId,
            type: "QUIZ_ATTEMPT",
            refId: itemId,
          });
        } catch (err) {
          console.error("[activity-logger] quiz attempt error:", err);
        }
      });
    }
  }

  return (
    <AssignmentDetailClient
      item={item as Parameters<typeof AssignmentDetailClient>[0]["item"]}
      submission={submission}
      isStudent={isStudent}
      isInstructor={isInstructor}
      instituteCode={institute}
      courseId={courseId}
      enrolledCount={enrolledCount}
      theme={theme}
    />
  );
}
