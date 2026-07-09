import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import SubmissionsClient from "./client";

interface Props {
  params: Promise<{ institute: string; courseId: string; itemId: string }>;
}

export default async function SubmissionsPage({ params }: Props) {
  const { institute, courseId, itemId } = await params;

  const session = await getSession();
  if (!session) redirect(`/${institute}/login`);

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/classwork/${itemId}`);
  }

  const item = await db.syllabusItem.findUnique({
    where: { id: itemId },
    select: { id: true, title: true, maxPoints: true, courseId: true },
  });

  if (!item || item.courseId !== courseId) notFound();

  // Get all approved enrolled students
  const enrollments = await db.enrollment.findMany({
    where: { courseId, status: "APPROVED" },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { student: { name: "asc" } },
  });

  const allStudents = enrollments.map((e) => e.student);

  // Get all submissions for this item
  const submissions = await db.studentSubmission.findMany({
    where: { syllabusItemId: itemId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <SubmissionsClient
      submissions={submissions as Parameters<typeof SubmissionsClient>[0]["submissions"]}
      allStudents={allStudents}
      maxPoints={item.maxPoints}
      itemTitle={item.title}
      instituteCode={institute}
      courseId={courseId}
      itemId={itemId}
    />
  );
}
