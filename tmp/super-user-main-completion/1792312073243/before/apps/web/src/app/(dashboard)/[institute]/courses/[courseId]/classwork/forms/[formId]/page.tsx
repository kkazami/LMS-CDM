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
