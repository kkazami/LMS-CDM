import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import AssignmentDetailClient from "./client";
import { getOrCreateSubmission } from "./actions";

interface Props {
  params: Promise<{ institute: string; courseId: string; itemId: string }>;
}

export default async function AssignmentDetailPage({ params }: Props) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/[itemId]/page.tsx", await params);

  const { institute, courseId, itemId } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);

  const role = session.user.role.toUpperCase();
  const isStudent = role === "STUDENT";
  const isInstructor = role === "PROFESSOR" || role === "ADMIN";

  // Fetch syllabus item with attachments and linked Form
  const item = await db.syllabusItem.findUnique({
    where: { id: itemId },
    include: {
      attachments: { orderBy: { createdAt: "asc" } },
      course: { select: { id: true, title: true, code: true } },
      form: {
        select: {
          id: true,
          status: true,
          formType: true,
          timeLimitMins: true,
          maxAttempts: true,
          scoreToKeep: true,
        },
      },
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
  let hasSubmittedForm = false;
  let canRetakeForm = false;
  let formScore: { rawScore: number; totalPoints: number } | null = null;

  if (isStudent && item.type !== "MATERIAL") {
    submission = await getOrCreateSubmission(itemId);
  }

  if (isStudent && item.form) {
    const attempts = await db.formAttempt.findMany({
      where: {
        formId: item.form.id,
        userId: session.user.id,
      },
      orderBy: { attemptNumber: "desc" },
      select: {
        id: true,
        status: true,
        rawScore: true,
        totalPoints: true,
      },
    });

    const submittedAttempts = attempts.filter(
      (a) => a.status === "SUBMITTED" || a.status === "TIMED_OUT"
    );
    hasSubmittedForm = submittedAttempts.length > 0;
    const maxAttempts = item.form.maxAttempts ?? 1;
    canRetakeForm = submittedAttempts.length > 0 && attempts.length < maxAttempts;

    if (submittedAttempts.length > 0) {
      const validScores = submittedAttempts.filter(
        (a) => a.rawScore !== null && a.totalPoints !== null
      );
      if (validScores.length > 0) {
        if (item.form.scoreToKeep === "HIGHEST") {
          const highest = [...validScores].sort(
            (a, b) => (b.rawScore ?? 0) - (a.rawScore ?? 0)
          )[0];
          formScore = {
            rawScore: highest.rawScore!,
            totalPoints: highest.totalPoints!,
          };
        } else {
          const latest = validScores[0];
          formScore = {
            rawScore: latest.rawScore!,
            totalPoints: latest.totalPoints!,
          };
        }
      } else {
        const questions = await db.formQuestion.findMany({
          where: { formId: item.form.id },
          select: { points: true },
        });
        const totalPoints = questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
        const latest = submittedAttempts[0];
        const rawScore =
          latest.rawScore ??
          (submission?.grade !== null &&
          submission?.grade !== undefined &&
          totalPoints > 0
            ? Math.round((submission.grade / 100) * totalPoints)
            : 0);
        formScore = {
          rawScore,
          totalPoints,
        };
      }
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
      hasSubmittedForm={hasSubmittedForm}
      canRetakeForm={canRetakeForm}
      formScore={formScore}
    />
  );
}
