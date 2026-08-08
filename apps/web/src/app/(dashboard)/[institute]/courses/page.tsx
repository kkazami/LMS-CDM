import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const role = session.user.role.toUpperCase();
  if (role === "STUDENT") {
    redirect(`/${institute}/students`);
  } else {
    redirect(`/${institute}/teachers`);
  }
}
