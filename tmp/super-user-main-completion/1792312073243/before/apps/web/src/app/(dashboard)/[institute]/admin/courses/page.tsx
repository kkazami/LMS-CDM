import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import AdminCoursesClient from "./client";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function AdminCoursesPage({ params }: PageProps) {
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
        instituteCode={institute}
        theme={theme}
      />
    </div>
  );
}
