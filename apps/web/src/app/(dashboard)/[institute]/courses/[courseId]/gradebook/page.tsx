import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { getGradebookData } from "./actions";
import GradebookClient from "./client";
import { AccessError } from '@/lib/super-user-v1/actor';

interface Props {
  params: Promise<{ institute: string; courseId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function GradebookPage({ params, searchParams }: Props) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/gradebook/page.tsx", await params);

  const { institute, courseId } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?institute=${institute}`);

  const role = session.user.role.toUpperCase();
  if (!['PROFESSOR', 'TEACHER', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
    redirect(`/${institute}/courses/${courseId}`);
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, instituteId: true },
  });

  if (!course) redirect(`/${institute}/courses`);

  let data;
  try { data = await getGradebookData(courseId, Number((await searchParams).page || 1)); }
  catch (error) {
    if (!(error instanceof AccessError) || ![400, 422].includes(error.status)) throw error;
    return <section role="alert" className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Gradebook</h1><p>{error.message}</p>
      <a className="mr-5 underline" href={`/${institute}/courses/${courseId}/gradebook`}>First page</a>
      <a className="underline" href={`/api/courses/${courseId}/gradebook/export`}>Export complete CSV</a>
    </section>;
  }
  const theme = getInstituteTheme(institute);

  return (
    <GradebookClient
      key={data.pagination.page}
      data={data}
      courseId={courseId}
      courseTitle={course.title}
      instituteCode={institute}
      theme={theme}
    />
  );
}
