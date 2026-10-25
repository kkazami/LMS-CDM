import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/admin-types";
import ArenaQuizEditor from "@/components/arena/ArenaQuizEditor";

export const dynamic = "force-dynamic";

export default async function CreateArenaQuizPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = normalizeRole(session.user.role as string);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}/arena`);
  }

  // Fetch courses taught by instructor or belonging to institute
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  const courses = instituteRecord
    ? await db.course.findMany({
        where: {
          instituteId: instituteRecord.id,
          isArchived: false,
          ...(role === "ADMIN" ? {} : { instructorId: session.user.id }),
        },
        select: { id: true, title: true, code: true },
        orderBy: { code: "asc" },
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ArenaQuizEditor instituteCode={institute} courses={courses} />
    </div>
  );
}
