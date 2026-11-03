import { requireFormAccess, scheduledForm } from '@/lib/forms/access';
import ScheduledFormNotice from '@/components/forms/renderer/ScheduledFormNotice';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/page.tsx", await params);

  const { institute, courseId, formId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const scheduled = await scheduledForm(session.user, courseId, formId);
  if (scheduled?.opensAt) return <ScheduledFormNotice institute={institute} courseId={courseId} title={scheduled.title} formType={scheduled.formType} opensAt={scheduled.opensAt.toISOString()} closesAt={scheduled.closesAt?.toISOString() ?? null} />;
  try { await requireFormAccess(session.user, courseId, formId, false); } catch { redirect(`/${institute}/courses/${courseId}/classwork`); }
  const role = canonicalRole(session.user.role);
  const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

  if (isInstructor) {
    redirect(`/${institute}/courses/${courseId}/classwork/forms/${formId}/builder`);
  } else {
    redirect(`/${institute}/courses/${courseId}/classwork/forms/${formId}/respond`);
  }
}
