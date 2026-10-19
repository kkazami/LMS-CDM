import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import AdminCoursesClient from "./client";

type PageProps = {
  params: Promise<{ institute: string }>;
  searchParams: Promise<{ instructor?: string }>;
};

export default async function AdminCoursesPage({ params, searchParams }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/admin/courses/page.tsx", await params);

  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role.toUpperCase() !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute },
  });

  if (!instituteRecord) {
    redirect(`/${institute}`);
  }

  const courses = await db.course.findMany({
    where: { instituteId: instituteRecord.id },
    include: {
      program: { select: { id: true, code: true, name: true, isActive: true } },
      instructor: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          enrollments: {
            where: { status: "APPROVED" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const programs = await db.academicProgram.findMany({
    where: { instituteId: instituteRecord.id, isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Course Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create courses, assign instructors, and manage join codes.
          </p>
        </div>
      </div>
      <AdminCoursesClient
        courses={courses}
        programs={programs}
        initialInstructorId={(await searchParams).instructor ?? ""}
        instituteCode={institute}
        theme={theme}
      />
    </div>
  );
}
