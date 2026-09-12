import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    const userWithInstitute = await db.user.findUnique({
      where: { id: session.user.id },
      include: { institute: true },
    });

    const instituteCode = userWithInstitute?.institute?.code || "ics";
    const role = session.user.role.toUpperCase();

    if (role === "STUDENT") {
      redirect(`/${instituteCode}/students`);
    } else if (role === "PROFESSOR" || role === "TEACHER") {
      redirect(`/${instituteCode}/teachers`);
    } else if (role === "ADMIN") {
      redirect(`/${instituteCode}/admin`);
    } else {
      redirect(`/${instituteCode}`);
    }
  }

  // No landing page yet — redirect unauthenticated visitors directly to login
  redirect("/login?institute=ics");
}
