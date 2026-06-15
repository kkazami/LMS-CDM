import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import CoursesClient from "./client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
export default async function CoursesPage({
  params,
}: {
  params: { institute: string };
}) {
  const { institute } = await params;
  const theme = getInstituteTheme(institute);
  const session = await getSession();
  const role = session?.user?.role || "STUDENT";

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute },
  });

  if (!instituteRecord) {
    redirect(`/${institute}`);
  }

  // Multi-tenant isolation: strictly fetch courses only for this institute
  const courses = await db.course.findMany({
    where: { instituteId: instituteRecord.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
      </div>
      <CoursesClient 
        courses={courses} 
        instituteCode={institute} 
        theme={theme} 
        canEdit={role === "PROFESSOR" || role === "ADMIN"}
      />
    </div>
  );
}
