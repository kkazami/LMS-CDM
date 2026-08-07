import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Clock,
  ClipboardList,
  BookOpenCheck,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import type { InstituteTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

interface StudentDashboardProps {
  params: Promise<{
    institute: string;
  }>;
}

interface EnrolledCourse {
  id: string;
  title: string;
  code: string;
  section: string;
  room: string;
  description: string;
  instructorName: string | null;
}

interface DueSoonItem {
  id: string;
  title: string;
  type: "ASSIGNMENT" | "QUIZ" | string;
  dueDate: Date;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  courseSection: string;
}

function formatRelativeDueDate(dueDate: Date, now: Date): { label: string; status: "overdue" | "today" | "soon" | "upcoming" } {
  const dueTime = dueDate.getTime();
  const nowTime = now.getTime();
  const diffHours = (dueTime - nowTime) / (1000 * 60 * 60);

  if (dueTime < nowTime) {
    return { label: "Overdue", status: "overdue" };
  }

  const isToday =
    dueDate.getUTCDate() === now.getUTCDate() &&
    dueDate.getUTCMonth() === now.getUTCMonth() &&
    dueDate.getUTCFullYear() === now.getUTCFullYear();

  if (isToday) {
    return { label: "Due Today", status: "today" };
  }

  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  const isTomorrow =
    dueDate.getUTCDate() === tomorrow.getUTCDate() &&
    dueDate.getUTCMonth() === tomorrow.getUTCMonth() &&
    dueDate.getUTCFullYear() === tomorrow.getUTCFullYear();

  if (isTomorrow) {
    return { label: "Due Tomorrow", status: "soon" };
  }

  if (diffHours <= 7 * 24) {
    const dayName = dueDate.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label: `Due ${dayName}, ${monthDay}`, status: "upcoming" };
  }

  return {
    label: `Due ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    status: "upcoming",
  };
}

export default async function StudentDashboardPage({ params }: StudentDashboardProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme: InstituteTheme = getInstituteTheme(institute);
  const studentId = session.user.id;

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true, name: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Fetch student's approved enrolled courses
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId,
      status: "APPROVED",
      course: {
        instituteId: instituteRecord.id,
        isArchived: false,
      },
    },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
          room: true,
          description: true,
          instructor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { displayOrderIndex: "asc" },
  });

  const enrolledCourses: EnrolledCourse[] = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    code: e.course.code,
    section: e.course.section,
    room: e.course.room,
    description: e.course.description,
    instructorName: e.course.instructor?.name ?? null,
  }));

  const courseIds = enrolledCourses.map((c) => c.id);

  // 2. Fetch submissions to exclude completed classwork
  const submissions = await db.studentSubmission.findMany({
    where: {
      studentId,
      syllabusItem: { courseId: { in: courseIds } },
    },
    select: { syllabusItemId: true, status: true },
  });

  const submittedIds = new Set(
    submissions
      .filter((s) => ["SUBMITTED", "GRADED", "RETURNED"].includes(s.status))
      .map((s) => s.syllabusItemId)
  );

  // 3. Fetch classwork due in the next 7 days (or overdue and pending)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rawDueSoon = await db.syllabusItem.findMany({
    where: {
      courseId: { in: courseIds },
      type: { in: ["ASSIGNMENT", "QUIZ"] },
      id: { notIn: [...submittedIds] },
      dueDate: {
        not: null,
        lte: sevenDaysFromNow,
      },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const dueSoonItems: DueSoonItem[] = rawDueSoon.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    dueDate: item.dueDate!,
    courseId: item.course.id,
    courseTitle: item.course.title,
    courseCode: item.course.code,
    courseSection: item.course.section,
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md mb-3 text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{instituteRecord.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {session.user.name}! 👋
            </h1>
            <p className="mt-1 text-sm sm:text-base text-white/80">
              Here is your academic overview for this week.
            </p>
          </div>

        </div>
      </div>

      {/* Main Grid: Enrolled Courses & Due Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Enrolled Classes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${theme.colors.primary}1A`,
                  color: theme.colors.primary,
                }}
              >
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">My Enrolled Classes</h2>
                <p className="text-xs text-gray-500">Courses you are currently participating in</p>
              </div>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
              }}
            >
              {enrolledCourses.length} {enrolledCourses.length === 1 ? "Class" : "Classes"}
            </span>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No Enrolled Classes Yet</h3>
              <p className="mt-1 text-xs text-gray-500">
                You are not currently enrolled in any approved courses for this institute.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300"
                >
                  <div>
                    {/* Top row: Code badge & Section */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide"
                        style={{
                          backgroundColor: `${theme.colors.primary}1A`,
                          color: theme.colors.primary,
                        }}
                      >
                        {course.code}
                      </span>
                      {course.section && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {course.section}
                        </span>
                      )}
                    </div>

                    {/* Course Title */}
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {course.title}
                    </h3>

                    {/* Instructor & Room */}
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {course.instructorName && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{course.instructorName}</span>
                        </div>
                      )}
                      {course.room && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{course.room}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/${theme.code}/courses/${course.id}/classwork`}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Classwork
                    </Link>
                    <Link
                      href={`/${theme.code}/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
                      style={{ color: theme.colors.primary }}
                    >
                      <span>Go to Course</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Column: Due Soon */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${theme.colors.primary}1A`,
                  color: theme.colors.primary,
                }}
              >
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Due Soon</h2>
                <p className="text-xs text-gray-500">Next 7 days deadline</p>
              </div>
            </div>
            {dueSoonItems.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {dueSoonItems.length} Pending
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            {dueSoonItems.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-gray-800">All caught up!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  No classwork due in the next 7 days.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dueSoonItems.map((item) => {
                  const isAssignment = item.type === "ASSIGNMENT";
                  const Icon = isAssignment ? ClipboardList : BookOpenCheck;
                  const relative = formatRelativeDueDate(item.dueDate, now);

                  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";
                  if (relative.status === "overdue") {
                    badgeStyle = "bg-red-50 text-red-700 border-red-200";
                  } else if (relative.status === "today") {
                    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                  } else if (relative.status === "soon") {
                    badgeStyle = "bg-yellow-50 text-yellow-800 border-yellow-200";
                  }

                  return (
                    <Link
                      key={item.id}
                      href={`/${theme.code}/courses/${item.courseId}/classwork`}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                    >
                      <div
                        className="p-2 rounded-lg shrink-0 mt-0.5"
                        style={{
                          backgroundColor: `${theme.colors.primary}1A`,
                          color: theme.colors.primary,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                            {item.courseCode} {item.courseSection ? `• ${item.courseSection}` : ""}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeStyle}`}
                          >
                            {relative.label}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 text-center">
              <Link
                href={`/${theme.code}/assignments`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                style={{ color: theme.colors.primary }}
              >
                <span>Go to full To-do page</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
