import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import Link from "next/link";
import { BookOpen, BookMarked, Layers, ArrowRight, Folder, ChevronRight } from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    institute: string;
  }>;
}

export default async function LearningMaterialsPage({ params }: Props) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = session.user.role.toUpperCase();
  const theme = getInstituteTheme(institute);
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
    <div className="page-enter pb-12">
      {/* Anti-Slop Academic Library Hero */}
      <div
        className="hero-noise relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs transition-colors"
        style={{
          borderLeft: `4px solid ${theme.colors.primary}`,
          background: `radial-gradient(ellipse at 25% 45%, ${theme.colors.primary}15 0%, transparent 70%), var(--bg-surface, #FFFFFF)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide uppercase"
              style={{
                backgroundColor: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
              }}
            >
              <BookMarked className="h-3.5 w-3.5" />
              <span>Academic Library</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] mb-2">
              Learning Materials
            </h1>
            <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-[#8B92A5] leading-relaxed">
              Access your course modules, handouts, and curriculum documents. Study at your own pace with our interactive document viewer.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] text-slate-700 dark:text-[#F0F2F8]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <span className="font-mono tabular-nums">{courses.length}</span> {courses.length === 1 ? "Class Enrolled" : "Classes Enrolled"}
            </span>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] py-24 text-center shadow-xs">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-[#181B26] mb-6 ring-8 ring-slate-50/50 dark:ring-white/5">
            <Folder className="h-10 w-10 text-slate-400 dark:text-[#8B92A5]" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">No Materials Yet</h3>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm">
            You don't have access to any course learning materials at this time. Check back once your classes begin!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-extrabold text-slate-900 dark:text-[#F0F2F8] tracking-tight">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
              }}
            >
              <BookOpen className="h-5 w-5" />
            </span>
            All Enrolled Courses
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const hasCover = Boolean(course.coverImage);
              return (
                <div
                  key={course.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/10"
                >
                  {/* Header Banner Block with Customizable Image or Flat Accent Surface */}
                  <div
                    className="relative h-28 p-4 text-white flex flex-col justify-between bg-cover bg-center transition-all"
                    style={
                      hasCover
                        ? { backgroundImage: `url("${course.coverImage}")` }
                        : {
                            backgroundColor: "var(--bg-surface, #1A1D27)",
                            borderLeft: `4px solid ${theme.colors.primary}`,
                          }
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                    {/* Top row: Code badge & Material Count */}
                    <div className="relative z-20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wide bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0">
                          {course.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/90 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded border border-white/20">
                        <Folder className="h-3.5 w-3.5" />
                        <span className="font-mono tabular-nums">{course.materialCount}</span> Modules
                      </div>
                    </div>

                    {/* Course Title */}
                    <div className="relative z-10">
                      <h3 className="text-base font-bold text-white drop-shadow-sm line-clamp-1">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body & Footer */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div className="space-y-1 text-xs text-slate-500 dark:text-[#8B92A5]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="truncate">Prof. {course.instructor?.name || "Unassigned"}</span>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600 dark:text-[#8B92A5]">
                        Learning Materials
                      </span>
                      <Link
                        href={`/${institute}/learning-materials/${course.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
                        style={{ color: theme.colors.primary }}
                      >
                        <span>View Materials</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}