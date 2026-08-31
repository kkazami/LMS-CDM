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
  KeyRound,
  Compass,
  Flame,
  Zap,
  Award,
  CheckSquare,
  Code2,
  Trophy,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import JoinCourseModal from "@/components/courses/JoinCourseModal";
import CourseCardMenu from "@/components/courses/CourseCardMenu";
import Button from "@/components/common/Button";
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
  exp?: number;
  streakCurrent?: number;
  level?: number;
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
  exp = 0,
  streakCurrent = 1,
  level = 1,
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

  // Quick action items for mobile and desktop quick navigation bar
  const quickActions = [
    {
      label: "Join Class",
      icon: Plus,
      onClick: () => setJoinModalOpen(true),
      highlight: true,
    },
    {
      label: "To-do",
      icon: ClipboardList,
      href: `/${instituteCode}/assignments`,
      badge: dueSoonItems.length > 0 ? `${dueSoonItems.length}` : undefined,
    },
    {
      label: "Flashcards",
      icon: Flame,
      href: `/${instituteCode}/flashcards`,
    },
    {
      label: "Tasks",
      icon: CheckSquare,
      href: `/${instituteCode}/tasks`,
    },
    {
      label: "CodeLab",
      icon: Code2,
      href: `/${instituteCode}/activities/codelab`,
    },
    {
      label: "Leaderboard",
      icon: Trophy,
      href: `/${instituteCode}/leaderboards`,
    },
  ];

  return (
    <>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto page-enter">
        {/* ─── 1. Compact Gradient Hero Banner with Full Mobile Depth ─── */}
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)`,
          }}
        >
          {/* Subtle Depth Background Overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/15" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 sm:h-96 w-72 sm:w-96 rounded-full bg-black/15 blur-3xl" />
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 sm:h-96 w-72 sm:w-96 rounded-full bg-white/15 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{instituteName} • Student Portal</span>
              </div>
              <h1
                className="text-xl sm:text-3xl font-black tracking-tight"
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.25)" }}
              >
                Welcome back, {userName}! 👋
              </h1>
              <p
                className="text-xs sm:text-base text-white/90 font-medium max-w-xl"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)" }}
              >
                Here is your academic overview, coursework, and upcoming deadlines.
              </p>
            </div>

            {/* Gamification Pills (Streak & EXP & Level) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 sm:pt-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
                <span className="text-xs font-bold whitespace-nowrap">
                  {streakCurrent} Day{streakCurrent === 1 ? "" : "s"} Streak
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 text-white shadow-xs">
                <Zap className="h-4 w-4 text-yellow-300" />
                <span className="text-xs font-bold whitespace-nowrap">
                  {exp} EXP
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <Award className="h-4 w-4 text-emerald-300" />
                <span className="text-xs font-bold whitespace-nowrap">
                  Lvl {level}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. Quick Action Bar (Horizontal Scroll on Mobile) ─── */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {quickActions.map((action) => {
            const Icon = action.icon;
            if (action.onClick) {
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs shrink-0 cursor-pointer min-h-[44px] active:scale-95 group font-medium text-xs sm:text-sm text-slate-800 dark:text-[#F0F2F8]"
                  style={
                    action.highlight
                      ? {
                          borderColor: `${theme.colors.primary}60`,
                          backgroundColor: `${theme.colors.primary}0D`,
                        }
                      : {}
                  }
                >
                  <div
                    className="p-1 rounded-lg shrink-0"
                    style={{
                      backgroundColor: `${theme.colors.primary}1A`,
                      color: theme.colors.primary,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{action.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={action.label}
                href={action.href!}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs shrink-0 cursor-pointer min-h-[44px] active:scale-95 group font-medium text-xs sm:text-sm text-slate-800 dark:text-[#F0F2F8]"
              >
                <div
                  className="p-1 rounded-lg shrink-0"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: theme.colors.primary,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span>{action.label}</span>
                {action.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {action.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ─── 3. Main Grid: Enrolled Courses & Due Soon ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left 2 Columns: Enrolled Classes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: theme.colors.primary,
                  }}
                >
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
                    My Enrolled Classes
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Courses you are currently participating in
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: theme.colors.primary,
                  }}
                >
                  {courses.length} {courses.length === 1 ? "Class" : "Classes"}
                </span>

                {/* Add Class Button with dynamic theme */}
                <Button theme={theme} onClick={() => setJoinModalOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span>Join Class</span>
                </Button>
              </div>
            </div>

            {/* Drag and drop hint */}
            {courses.length > 1 && (
              <p className="text-xs text-slate-400 dark:text-[#64748B]">
                Drag cards to reorder • changes are saved automatically
              </p>
            )}

            {courses.length === 0 ? (
              /* Enhanced 2-Step Onboarding Empty State */
              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs">
                <div className="text-center max-w-md mx-auto mb-6">
                  <div
                    className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: `${theme.colors.primary}18`,
                      color: theme.colors.primary,
                    }}
                  >
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                    Get Started with Your Courses
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">
                    You are not enrolled in any classes yet. Follow these simple steps to begin:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex items-start gap-3">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-[#F1F5F9]">
                        Get Course Code
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        Ask your professor for the 6-character class invite code.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex items-start gap-3">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-[#F1F5F9]">
                        Join Class
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        Click Join Class, enter the code, and await approval.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button theme={theme} onClick={() => setJoinModalOpen(true)}>
                    <KeyRound className="mr-1.5 h-4 w-4" />
                    <span>Enter Course Code</span>
                  </Button>
                </div>
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
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/15 cursor-grab active:cursor-grabbing select-none"
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
                        <div className="space-y-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                          {course.instructorName && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B] shrink-0" />
                              <span className="truncate">{course.instructorName}</span>
                            </div>
                          )}
                          {course.room && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B] shrink-0" />
                              <span className="truncate">{course.room}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                          <Link
                            href={`/${instituteCode}/courses/${course.id}/classwork`}
                            className="text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] transition-colors"
                            draggable={false}
                          >
                            Classwork
                          </Link>
                          <Link
                            href={`/${instituteCode}/courses/${course.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-colors"
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

          {/* ─── 4. Right 1 Column: Due Soon / Pending Tasks (Urgent Deadlines Feed) ─── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: theme.colors.primary,
                  }}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
                    Due Soon
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Next 7 days deadline
                  </p>
                </div>
              </div>
              {dueSoonItems.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {dueSoonItems.length} Pending
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-4 shadow-xs space-y-3">
              {dueSoonItems.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
                    All caught up!
                  </p>
                  <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">
                    No classwork due in the next 7 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dueSoonItems.map((item, idx) => {
                    const isAssignment = item.type === "ASSIGNMENT";
                    const Icon = isAssignment ? ClipboardList : BookOpenCheck;
                    const relative = formatRelativeDueDate(item.dueDate, serverNow);

                    let badgeClass = "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#94A3B8]";
                    if (relative.status === "overdue") {
                      badgeClass = "bg-[#EF4444] text-white font-bold animate-pulse";
                    } else if (relative.status === "today") {
                      badgeClass = "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30";
                    } else if (relative.status === "soon") {
                      badgeClass = "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20";
                    }

                    return (
                      <Link
                        key={item.id}
                        href={`/${instituteCode}/courses/${item.courseId}/classwork/${item.id}`}
                        className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all min-h-[48px]"
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
                            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider truncate">
                              {item.courseCode} {item.courseSection ? `• ${item.courseSection}` : ""}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}
                            >
                              {relative.label}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-[#F1F5F9] group-hover:text-[#F97316] transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-right">
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
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setConfirmUnenroll(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1C2030] rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9]">
            <h3 className="text-lg font-bold mb-2">Unenroll from course?</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-6">
              You will lose access to all course materials and your submission history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmUnenroll(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUnenroll(confirmUnenroll)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer min-h-[44px]"
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
