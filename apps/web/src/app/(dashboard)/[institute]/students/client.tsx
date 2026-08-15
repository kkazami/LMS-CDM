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

function getCourseCategoryColor(code: string): { border: string; badgeBg: string; badgeText: string } {
  const upper = code.toUpperCase();
  if (upper.includes("CS") || upper.includes("ELECT") || upper.includes("PROG")) {
    return { border: "#3B82F6", badgeBg: "rgba(59, 130, 246, 0.15)", badgeText: "#60A5FA" };
  }
  if (upper.includes("SYS") || upper.includes("ADMIN") || upper.includes("NET")) {
    return { border: "#10B981", badgeBg: "rgba(16, 185, 129, 0.15)", badgeText: "#34D399" };
  }
  if (upper.includes("IAA") || upper.includes("IS") || upper.includes("DATA") || upper.includes("SEC")) {
    return { border: "#8B5CF6", badgeBg: "rgba(139, 92, 246, 0.15)", badgeText: "#A78BFA" };
  }
  if (upper.includes("MATH") || upper.includes("STAT") || upper.includes("CALC")) {
    return { border: "#F59E0B", badgeBg: "rgba(245, 158, 11, 0.15)", badgeText: "#FCD34D" };
  }
  return { border: "#F97316", badgeBg: "rgba(249, 115, 22, 0.15)", badgeText: "#FB923C" };
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
        {/* ─── 1. Welcome Banner ─── */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-950/20"
          style={{
            background: "linear-gradient(135deg, #C2410C 0%, #F97316 50%, #FB923C 100%)",
          }}
        >
          {/* Subtle Grain / Texture Overlay */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-3 text-white border border-white/20">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{instituteName}</span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-black tracking-tight"
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" }}
              >
                Welcome back, {userName}! 👋
              </h1>
              <p
                className="mt-1 text-sm sm:text-base text-white/90 font-medium"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)" }}
              >
                Here is your academic overview for this week.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 2. Main Grid: Enrolled Courses & Due Soon ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Enrolled Classes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-[#F97316]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8]">
                    My Enrolled Classes
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                    Courses you are currently participating in
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-[#F97316]">
                  {courses.length} {courses.length === 1 ? "Class" : "Classes"}
                </span>

                {/* Add Class Button */}
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Class</span>
                </button>
              </div>
            </div>

            {/* Drag and drop hint */}
            {courses.length > 1 && (
              <p className="text-xs text-slate-400 dark:text-[#555C72]">
                Drag cards to reorder • changes are saved automatically
              </p>
            )}

            {courses.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-8 text-center shadow-xs">
                <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-[#555C72] mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8]">
                  No Enrolled Classes Yet
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-[#8B92A5] mb-4">
                  You are not currently enrolled in any approved courses for this institute.
                </p>
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] shadow-xs transition-all cursor-pointer"
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
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] shadow-xs overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20 cursor-grab active:cursor-grabbing select-none"
                      style={{
                        animation: `staggerFadeIn 0.2s ease-out both`,
                        animationDelay: `${Math.min(index, 10) * 40}ms`,
                      }}
                    >
                      {/* Header Banner Block with Customizable / Institute Theme Image */}
                      <div
                        className="relative h-28 p-4 text-white flex flex-col justify-between bg-cover bg-center transition-all"
                        style={
                          hasCover
                            ? { backgroundImage: `url("${course.coverImage}")` }
                            : { background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)` }
                        }
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                        {/* Top Badges & 3-dots Menu */}
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
                          <h3 className="text-base font-bold text-white drop-shadow-xs line-clamp-1">
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
                        <div className="space-y-1.5 text-xs text-slate-500 dark:text-[#8B92A5]">
                          {course.instructorName && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400 dark:text-[#555C72] shrink-0" />
                              <span className="truncate">{course.instructorName}</span>
                            </div>
                          )}
                          {course.room && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-[#555C72] shrink-0" />
                              <span className="truncate">{course.room}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                          <Link
                            href={`/${instituteCode}/courses/${course.id}/classwork`}
                            className="text-xs font-medium text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8] transition-colors"
                            draggable={false}
                          >
                            Classwork
                          </Link>
                          <Link
                            href={`/${instituteCode}/courses/${course.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline transition-colors"
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

          {/* ─── 3. Right 1 Column: Due Soon / Pending Tasks ─── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-[#F97316]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8]">
                    Due Soon
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                    Next 7 days deadline
                  </p>
                </div>
              </div>
              {dueSoonItems.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {dueSoonItems.length} Pending
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-4 shadow-xs space-y-3">
              {dueSoonItems.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F0F2F8]">
                    All caught up!
                  </p>
                  <p className="text-xs text-slate-400 dark:text-[#555C72] mt-0.5">
                    No classwork due in the next 7 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dueSoonItems.map((item, idx) => {
                    const isAssignment = item.type === "ASSIGNMENT";
                    const Icon = isAssignment ? ClipboardList : BookOpenCheck;
                    const relative = formatRelativeDueDate(item.dueDate, serverNow);

                    let badgeClass = "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#8B92A5]";
                    if (relative.status === "overdue") {
                      badgeClass = "bg-[#EF4444] text-white font-bold";
                    } else if (relative.status === "today") {
                      badgeClass = "bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30";
                    } else if (relative.status === "soon") {
                      badgeClass = "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20";
                    }

                    return (
                      <Link
                        key={item.id}
                        href={`/${instituteCode}/courses/${item.courseId}/classwork/${item.id}`}
                        className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200 dark:hover:border-[rgba(255,255,255,0.07)] transition-all"
                        style={{
                          animation: `staggerFadeIn 0.2s ease-out both`,
                          animationDelay: `${Math.min(idx, 10) * 40}ms`,
                        }}
                      >
                        <div className="p-2 rounded-lg shrink-0 mt-0.5 bg-orange-500/10 text-[#F97316]">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider truncate">
                              {item.courseCode} {item.courseSection ? `• ${item.courseSection}` : ""}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}
                            >
                              {relative.label}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-[#F0F2F8] group-hover:text-[#F97316] transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] text-right">
                <Link
                  href={`/${instituteCode}/assignments`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:underline"
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
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setConfirmUnenroll(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#22263A] rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-[rgba(255,255,255,0.1)] text-slate-900 dark:text-[#F0F2F8]">
            <h3 className="text-lg font-bold mb-2">Unenroll from course?</h3>
            <p className="text-xs text-slate-500 dark:text-[#8B92A5] mb-6">
              You will lose access to all course materials and your submission history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmUnenroll(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.1)] py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUnenroll(confirmUnenroll)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
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
