import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { isIteInstituteCode } from "@/lib/ite/ite-eligibility";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import ParticipationClient from "./client";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function ParticipationPage({ params }: PageProps) {
  const { institute, courseId } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?institute=${institute}`);

  // ITE-only — non-ITE hits 404 (not 403, so they don't know the feature exists)
  if (!isIteInstituteCode(institute)) return notFound();

  const userRole = (session.user.role as string).toUpperCase();
  const isInstructor = userRole === "PROFESSOR" || userRole === "TEACHER";
  const isAdmin = userRole === "ADMIN";

  if (!isInstructor && !isAdmin) return notFound();

  // Verify the course is an ITE course
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      code: true,
      instructorId: true,
      institute: { select: { code: true } },
    },
  });

  if (!course || !isIteInstituteCode(course.institute.code)) return notFound();

  // Instructor must own this course (admins exempt)
  const ownsThisCourse = course.instructorId === session.user.id;
  if (!isAdmin && !ownsThisCourse) return notFound();

  const theme = getInstituteTheme(institute);

  return (
    <ParticipationClient
      courseId={courseId}
      courseTitle={course.title}
      courseCode={course.code}
      theme={theme}
      instituteCode={institute}
    />
  );
}
