import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
  }>;
}

export default async function FormHubPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/page.tsx");

  const { institute, courseId, formId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  const isInstructor = role === "PROFESSOR" || role === "TEACHER" || role === "ADMIN";

  if (isInstructor) {
    redirect(`/${institute}/courses/${courseId}/classwork/forms/${formId}/builder`);
  } else {
    redirect(`/${institute}/courses/${courseId}/classwork/forms/${formId}/respond`);
  }
}
