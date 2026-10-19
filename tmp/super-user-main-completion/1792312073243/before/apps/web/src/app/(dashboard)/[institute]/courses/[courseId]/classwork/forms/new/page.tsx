import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import NewFormClient from "./client";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
  }>;
}

export default async function NewFormPage({ params }: PageProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const theme = getInstituteTheme(institute);

  return (
    <NewFormClient
      courseId={courseId}
      instituteCode={institute}
      theme={theme}
    />
  );
}
