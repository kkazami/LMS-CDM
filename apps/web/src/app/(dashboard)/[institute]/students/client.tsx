"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  ClipboardList,
  BookOpenCheck,
  ChevronRight,
  User,
  MapPin,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Plus,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import JoinCourseModal from "@/components/courses/JoinCourseModal";
import CourseCardMenu from "@/components/courses/CourseCardMenu";
import { unenrollFromCourse, reorderCourseCards } from "../courses/actions";

interface EnrolledCourse {
  id: string;
  title: string;
  code: string;
  section: string;
  room: string;
  description: string;
  coverImage?: string;
  instructorName: string | null;
}

interface DueSoonItem {
  id: string;
  title: string;
  type: "ASSIGNMENT" | "QUIZ" | string;
  dueDate: string; // ISO string for client serialization
  courseId: string;
  courseTitle: string;
  courseCode: string;
  courseSection: string;
}

interface StudentDashboardClientProps {
  userName: string;
  instituteName: string;
  instituteCode: string;
  theme: InstituteTheme;
  initialCourses: EnrolledCourse[];
  dueSoonItems: DueSoonItem[];
  serverNow: string;
}

function formatRelativeDueDate(
  dueDateIso: string,
  serverNowIso: string
): { label: string; status: "overdue" | "today" | "soon" | "upcoming" } {
  const dueDate = new Date(dueDateIso);
  const now = new Date(serverNowIso);

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

export default function StudentDashboardClient({
  userName,
  instituteName,
  instituteCode,
  theme,
  initialCourses,
  dueSoonItems,
  serverNow,
}: StudentDashboardClientProps) {
  const [courses, setCourses] = useState<EnrolledCourse[]>(initialCourses);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [confirmUnenroll, setConfirmUnenroll] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  // ─── Drag and Drop Reordering ───
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragItemRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverRef.current = index;
  }

  function handleDrop() {
    if (dragItemRef.current === null || dragOverRef.current === null) return;
    if (dragItemRef.current === dragOverRef.current) return;

    const reordered = [...courses];
    const [dragged] = reordered.splice(dragItemRef.current, 1);
    reordered.splice(dragOverRef.current, 0, dragged);

    setCourses(reordered);
    dragItemRef.current = null;
    dragOverRef.current = null;

    // Persist new order to server
    startTransition(async () => {
      await reorderCourseCards(
        reordered.map((c) => c.id),
        instituteCode,
        true
      );
    });
  }

  const handleUnenroll = (courseId: string) => {
    startTransition(async () => {
      const result = await unenrollFromCourse(courseId, instituteCode);
      if (result.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      }
      setConfirmUnenroll(null);
    });
  };

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto page-enter">
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
              <span>{instituteName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {userName}! 👋
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

            <div className="flex items-center gap-2.5">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `${theme.colors.primary}1A`,
                  color: theme.colors.primary,
                }}
              >
                {courses.length} {courses.length === 1 ? "Class" : "Classes"}
              </span>

              {/* Add Class Button — opens JoinCourseModal directly on dashboard */}
              <button
                type="button"
                onClick={() => setJoinModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90 shadow-sm cursor-pointer"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Class</span>
              </button>
            </div>
          </div>

          {/* Drag and drop hint */}
          {courses.length > 1 && (
            <p className="text-xs text-gray-400">
              Drag cards to reorder • changes are saved automatically
            </p>
          )}

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No Enrolled Classes Yet</h3>
              <p className="mt-1 text-xs text-gray-500 mb-4">
                You are not currently enrolled in any approved courses for this institute.
              </p>
              <button
                type="button"
                onClick={() => setJoinModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Plus className="h-4 w-4" />
                <span>Join a Class Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course, index) => {
                const hasCover = Boolean(course.coverImage);
                return (
                  <div
                    key={course.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-gray-300 cursor-grab active:cursor-grabbing select-none"
                    style={{
                      animation: `staggerFadeIn 0.2s ease-out both`,
                      animationDelay: `${Math.min(index, 10) * 40}ms`,
                    }}
                  >
                    {/* Header Banner Block with Customizable Image */}
                    <div
                      className="relative h-28 p-4 text-white flex flex-col justify-between bg-cover bg-center transition-all"
                      style={
                        hasCover
                          ? { backgroundImage: `url("${course.coverImage}")` }
                          : { background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)` }
                      }
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                      {/* Top row: Code badge & Section + 3-dots Menu */}
                      <div className="relative z-20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0">
                            {course.code}
                          </span>
                          {course.section && (
                            <span className="text-xs font-medium text-white/90 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded truncate border border-white/20">
                              {course.section}
                            </span>
                          )}
                        </div>

                        {/* 3-Dots Menu */}
                        <CourseCardMenu
                          courseId={course.id}
                          isStudent={true}
                          isArchived={false}
                          onUnenroll={() => setConfirmUnenroll(course.id)}
                        />
                      </div>

                      {/* Course Title Link inside Header */}
                      <div className="relative z-10">
                        <h3 className="text-base font-bold text-white drop-shadow-sm line-clamp-1">
                          <Link
                            href={`/${instituteCode}/courses/${course.id}`}
                            className="hover:underline"
                            draggable={false}
                          >
                            {course.title}
                          </Link>
                        </h3>
                      </div>
                    </div>

                    {/* Card Body & Footer */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div className="space-y-1 text-xs text-gray-500">
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

                      {/* Actions Footer */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <Link
                          href={`/${instituteCode}/courses/${course.id}/classwork`}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                          draggable={false}
                        >
                          Classwork
                        </Link>
                        <Link
                          href={`/${instituteCode}/courses/${course.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
                          style={{ color: theme.colors.primary }}
                          draggable={false}
                        >
                          <span>Go to Course</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                {dueSoonItems.map((item, idx) => {
                  const isAssignment = item.type === "ASSIGNMENT";
                  const Icon = isAssignment ? ClipboardList : BookOpenCheck;
                  const relative = formatRelativeDueDate(item.dueDate, serverNow);

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
                      href={`/${instituteCode}/courses/${item.courseId}/classwork/${item.id}`}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                      style={{
                        animation: `staggerFadeIn 0.2s ease-out both`,
                        animationDelay: `${Math.min(idx, 10) * 40}ms`,
                      }}
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
                href={`/${instituteCode}/assignments`}
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

      {/* Join Course Modal */}
      <JoinCourseModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        theme={theme}
        instituteCode={instituteCode}
      />

      {/* Unenroll confirmation modal dialog */}
      {confirmUnenroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setConfirmUnenroll(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unenroll from course?</h3>
            <p className="text-xs text-gray-500 mb-6">
              You will lose access to all course materials and your submission history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmUnenroll(null)}
                className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUnenroll(confirmUnenroll)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Unenrolling..." : "Unenroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
