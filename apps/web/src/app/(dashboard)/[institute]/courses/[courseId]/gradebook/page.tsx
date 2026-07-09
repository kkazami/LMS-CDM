import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { getGradebookData } from "./actions";
import GradebookClient from "./client";

interface Props {
  params: Promise<{ institute: string; courseId: string }>;
}

export default async function GradebookPage({ params }: Props) {
  const { institute, courseId } = await params;

  const session = await getSession();
  if (!session) redirect(`/${institute}/login`);

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}`);
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, instituteId: true },
  });

  if (!course) redirect(`/${institute}/courses`);

  const data = await getGradebookData(courseId);
  const theme = getInstituteTheme(institute);

  return (
    <GradebookClient
      data={data}
      courseId={courseId}
      courseTitle={course.title}
      instituteCode={institute}
      theme={theme}
    />
  );
}
