import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function CourseInteriorPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/page.tsx", await params);

  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    notFound();
  }

  redirect(`/${institute}/courses/${courseId}/stream`);
}
