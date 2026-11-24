import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowRight, Folder } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    institute: string;
  }>;
}

export default async function LearningMaterialsPage({ params }: Props) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/learning-materials/page.tsx", await params);

  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = session.user.role.toUpperCase();
  const userId = session.user.id;

  // Resolve institute
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
  });
  if (!instituteRecord) redirect(`/login?institute=${institute}`);

  // If professor, redirect to a different view or courses page
  if (role === "PROFESSOR" || role === "TEACHER" || role === "ADMIN") {
    // For now, redirect professors to their courses page to manage materials
    redirect(`/${institute}/courses`);
  }

  // 1. Fetch Student Enrolled Courses with Material Count
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId: userId,
      status: "APPROVED",
      course: {
        instituteId: instituteRecord.id,
        isArchived: false,
      },
    },
    include: {
      course: {
        include: {
          syllabusItems: {
            where: { type: "MATERIAL" },
            select: { id: true },
          },
          instructor: { select: { name: true } },
        },
      },
    },
    orderBy: { displayOrderIndex: "asc" },
  });

  const courses = enrollments.map((e) => ({
    ...e.course,
    materialCount: e.course.syllabusItems.length,
  }));

  return (
    <div className="page-enter mx-auto max-w-6xl pb-12">
      <header className="mb-6 border-b border-theme pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-primary-theme sm:text-3xl">Learning Materials</h1>
        <p className="mt-1 text-sm/6 text-secondary-theme">Find modules and handouts for your courses.</p>
      </header>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-theme bg-surface px-4 py-12 text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-xl bg-canvas text-primary-theme">
            <Folder aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-lg font-semibold text-primary-theme">No Materials Yet</h2>
          <p className="mt-1 max-w-sm text-sm/6 text-secondary-theme">
            You don&apos;t have access to any course learning materials at this time. Check back once your classes begin!
          </p>
        </div>
      ) : (
        <section aria-labelledby="enrolled-courses-heading">
          <h2 id="enrolled-courses-heading" className="mb-4 text-lg font-semibold text-primary-theme">
            All Enrolled Courses
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/${institute}/learning-materials/${course.id}`}
                aria-labelledby={`material-course-${course.id}`}
                className="flex min-w-0 cursor-pointer flex-col rounded-2xl border border-theme bg-surface p-5 hover:border-(--focus-ring)"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-secondary-theme">
                  <span className="rounded-md bg-canvas px-2 py-1 [overflow-wrap:anywhere]">{course.code}</span>
                  <span>{course.materialCount} {course.materialCount === 1 ? "module" : "modules"}</span>
                </div>
                <h3 id={`material-course-${course.id}`} className="text-lg font-semibold tracking-tight text-primary-theme [overflow-wrap:anywhere]">
                  {course.title}
                </h3>
                <p className="mt-1 text-sm/6 text-secondary-theme [overflow-wrap:anywhere]">
                  Prof. {course.instructor?.name || "Unassigned"}
                </p>
                <div className="mt-auto pt-5" aria-hidden="true">
                  <span className="flex items-center justify-between gap-2 border-t border-theme pt-4 text-sm font-semibold text-primary-theme">
                    View Materials <ArrowRight className="size-4 shrink-0" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
