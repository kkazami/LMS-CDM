import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import ArchivedCoursesClient from "./client";

export default async function ArchivedCoursesPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const theme = getInstituteTheme(institute);
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    redirect(`/${institute}/courses`);
  }

  const instituteRecord = await db.institute.findUnique({ where: { code: institute } });
  if (!instituteRecord) redirect(`/${institute}`);

  const where =
    role === "PROFESSOR"
      ? { instructorId: session.user.id, instituteId: instituteRecord.id, isArchived: true }
      : { instituteId: instituteRecord.id, isArchived: true };

  const archivedCourses = await db.course.findMany({
    where,
    include: {
      instructor: { select: { name: true } },
      _count: { select: { enrollments: { where: { status: "APPROVED" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const courses = archivedCourses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    section: c.section,
    subject: c.subject,
    room: c.room,
    instructorName: c.instructor?.name ?? null,
    enrolledCount: c._count.enrollments,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
      <ArchivedCoursesClient
        courses={courses}
        instituteCode={institute}
        theme={theme}
      />
    </div>
  );
}
