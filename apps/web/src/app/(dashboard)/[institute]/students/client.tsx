"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  ClipboardList,
  BookOpenCheck,
  ChevronRight,
  User,
  MapPin,
  CheckCircle2,
  GraduationCap,
  Plus,
  KeyRound,
  Compass,
  Flame,
  Zap,
  CheckSquare,
  Code2,
  Trophy,
  Gamepad2,
  Sparkles,
} from "lucide-react";
import StudentCalendar from "@/components/calendar/StudentCalendar";
import type { CalendarEvent } from "@/lib/lms-types";
import type { ClassSchedule } from "@/lib/student-calendar";
import type { InstituteTheme } from "@/lib/theme";
import JoinCourseModal from "@/components/courses/JoinCourseModal";
import CourseCardMenu from "@/components/courses/CourseCardMenu";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import CourseReorderButtons from "@/components/dashboard/CourseReorderButtons";
import { unenrollFromCourse, reorderCourseCards } from "../courses/actions";
import { TypingBanner } from "@/components/motion/TypingBanner";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { ExpRing } from "@/components/dashboard/ExpRing";
import { StatPill } from "@/components/dashboard/StatPill";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import StudentParticipationCard from "@/components/institute/ite/StudentParticipationCard";
import StudentFocusCard from "@/components/focus/StudentFocusCard";
import StudentSuggestionsCard from "@/components/guidance/StudentSuggestionsCard";
import { computeLevelInfo } from "@/lib/gamification/exp-engine";
import { classifyDueDate, splitOverdue, type DueStatus } from "@/lib/dashboard/due-dates";
import { getWelcomeBannerPortalLabel } from "@/lib/ite/search/search-filter";

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
  calendar: { events: CalendarEvent[]; schedules: ClassSchedule[] };
  userId: string;
  today: string;
  dueSoonItems: DueSoonItem[];
  serverNow: string;
  exp?: number;
  streakCurrent?: number;
  /** Real leaderboard rank within the institute; null = unranked (no EXP yet). */
  rank: number | null;
  /** The student's join requests still waiting for instructor approval. */
  pendingJoinCount: number;
  /** Whether the CodeLab / interactive activities suite is available to this user. */
  showCodeLab?: boolean;
  typingSessionKey?: string;
  greeting: string;
}

/** Max overdue rows listed on the dashboard; the rest are reachable from the To-do page. */
const MAX_OVERDUE_SHOWN = 5;

const BADGE_CLASS: Record<DueStatus, string> = {
  overdue: "bg-[#EF4444] text-white font-bold",
  today: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  tomorrow: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20",
  upcoming: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#94A3B8]",
};

export default function StudentDashboardClient({
  userName,
  instituteName,
  instituteCode,
  theme,
  initialCourses,
  calendar,
  userId,
  today,
  dueSoonItems,
  serverNow,
  exp = 0,
  streakCurrent = 0,
  rank,
  pendingJoinCount,
  showCodeLab,
  typingSessionKey,
  greeting,
}: StudentDashboardClientProps) {
  const [courses, setCourses] = useState<EnrolledCourse[]>(initialCourses);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [confirmUnenroll, setConfirmUnenroll] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  const levelInfo = computeLevelInfo(exp);
  const { overdue: overdueItems, upcoming: upcomingItems } = splitOverdue(dueSoonItems, serverNow);
  const pendingDeadlineCount = dueSoonItems.length;

  // ─── Course ordering (drag and drop, or the move up/down buttons) ───
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  function persistOrder(reordered: EnrolledCourse[]) {
    setCourses(reordered);
    startTransition(async () => {
      await reorderCourseCards(
        reordered.map((c) => c.id),
        instituteCode,
        true
      );
    });
  }

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

    dragItemRef.current = null;
    dragOverRef.current = null;
    persistOrder(reordered);
  }

  function moveCourse(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= courses.length) return;
    const reordered = [...courses];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    persistOrder(reordered);
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

  function renderDueItem(item: DueSoonItem, idx: number) {
    const isAssignment = item.type === "ASSIGNMENT";
    const Icon = isAssignment ? ClipboardList : BookOpenCheck;
    const relative = classifyDueDate(item.dueDate, serverNow);

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
          <div className="flex items-center justify-between gap-1.5 mb-1 min-w-0">
            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider truncate min-w-0 flex-1">
              {item.courseCode} {item.courseSection ? `• ${item.courseSection}` : ""}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${BADGE_CLASS[relative.status]}`}
            >
              {relative.label}
            </span>
          </div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-[#F1F5F9] transition-colors line-clamp-1">
            {item.title}
          </h4>
        </div>
      </Link>
    );
  }

  const unenrollTarget = confirmUnenroll ? courses.find((c) => c.id === confirmUnenroll) : null;

  const isCodeLabVisible = instituteCode.toLowerCase() === "ics";
  const isArenaVisible = instituteCode.toLowerCase() === "ibe";

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
    ...(isCodeLabVisible
      ? [
          {
            label: "CodeLab",
            icon: Code2,
            href: `/${instituteCode}/activities/codelab`,
          },
        ]
      : []),
    ...(isArenaVisible
      ? [
          {
            label: "Quiz Arena",
            icon: Gamepad2,
            href: `/${instituteCode}/arena`,
          },
        ]
      : []),
    {
      label: "Leaderboard",
      icon: Trophy,
      href: `/${instituteCode}/leaderboards`,
    },
  ];

  return (
    <>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto page-enter">
        {/* ─── 1. Neutral Academic Hero Banner ─── */}
        <FadeIn y={20} duration={0.45}>
          <div
            className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs transition-colors"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6">
              <div className="space-y-2 max-w-xl min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {getWelcomeBannerPortalLabel(instituteCode, instituteName, false)}
                    </span>
                  </span>
                </div>

                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] wrap-break-word">
                  <TypingBanner
                    text={greeting}
                    cursorColor="#94A3B8"
                    keepCursor={false}
                    speed={28}
                    sessionKey={typingSessionKey ?? "cdm_typed_greeting"}
                  />
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] font-medium leading-relaxed">
                  You have <span className="font-bold text-slate-800 dark:text-[#F0F2F8] font-mono tabular-nums">{courses.length}</span> active {courses.length === 1 ? "course" : "courses"},{" "}
                  <span className="font-bold text-slate-800 dark:text-[#F0F2F8] font-mono tabular-nums">{overdueItems.length}</span> overdue and{" "}
                  <span className="font-bold text-slate-800 dark:text-[#F0F2F8] font-mono tabular-nums">{upcomingItems.length}</span> due in the next 7 days.
                </p>
              </div>

              {/* EXP Ring */}
              <div className="hidden sm:block self-center md:self-auto shrink-0">
                <ExpRing
                  level={levelInfo.level}
                  currentExp={levelInfo.currentLevelProgress}
                  nextLevelExp={levelInfo.expToNextLevel}
                  color={theme.colors.primary}
                  size={96}
                />
              </div>
            </div>

            {/* Bottom StatPills Row */}
            <div className="relative z-10 hidden sm:flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 px-3 sm:px-8 pb-3 sm:pb-5 pt-1 border-t border-slate-100 dark:border-white/5 overflow-x-auto scrollbar-none">
              <StatPill
                icon={Flame}
                label={`${streakCurrent} Day${streakCurrent === 1 ? "" : "s"} Streak`}
                color={theme.colors.primary}
              />
              <StatPill
                icon={Zap}
                label={`${exp} EXP`}
                color={theme.colors.primary}
              />
              <StatPill
                icon={Trophy}
                label={rank === null ? "Unranked" : `Rank #${rank}`}
                color={theme.colors.primary}
              />
            </div>
          </div>
        </FadeIn>

        {/* ─── 2. Context-Aware Quick Action Cards Grid ─── */}
        <StaggerGroup className={`grid grid-cols-2 sm:grid-cols-3 ${(isCodeLabVisible || isArenaVisible) ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-3`}>
          <StaggerItem>
            <QuickActionCard
              icon={Plus}
              label="Join Class"
              onClick={() => setJoinModalOpen(true)}
              sublabel="Enter code"
              color={theme.colors.primary}
              badge={pendingJoinCount > 0 ? `${pendingJoinCount} pending` : null}
              badgeVariant="info"
            />
          </StaggerItem>
          <StaggerItem>
            <QuickActionCard
              icon={ClipboardList}
              label="Assignments"
              href={`/${instituteCode}/assignments`}
              sublabel={
                overdueItems.length > 0 ? "Overdue work" : upcomingItems.length > 0 ? "Due soon" : "All clear"
              }
              color={theme.colors.primary}
              badge={pendingDeadlineCount > 0 ? `${pendingDeadlineCount}` : null}
              badgeVariant={overdueItems.length > 0 ? "error" : pendingDeadlineCount > 0 ? "warning" : "muted"}
            />
          </StaggerItem>
          <StaggerItem>
            <QuickActionCard
              icon={Flame}
              label="Flashcards"
              href={`/${instituteCode}/flashcards`}
              sublabel="Study decks"
              color={theme.colors.primary}
            />
          </StaggerItem>
          <StaggerItem>
            <QuickActionCard
              icon={CheckSquare}
              label="Study tasks"
              href={`/${instituteCode}/tasks`}
              sublabel="Your task list"
              color={theme.colors.primary}
            />
          </StaggerItem>
          {isCodeLabVisible && (
            <StaggerItem>
              <QuickActionCard
                icon={Code2}
                label="CodeLab"
                href={`/${instituteCode}/activities/codelab`}
                sublabel="Interactive labs"
                color={theme.colors.primary}
              />
            </StaggerItem>
          )}
          {isArenaVisible && (
            <StaggerItem>
              <QuickActionCard
                icon={Gamepad2}
                label="Quiz Arena"
                href={`/${instituteCode}/arena`}
                sublabel="Live multiplayer"
                color={theme.colors.primary}
                badge="Live"
                badgeVariant="warning"
              />
            </StaggerItem>
          )}
          <StaggerItem>
            <QuickActionCard
              icon={Trophy}
              label="Leaderboards"
              href={`/${instituteCode}/leaderboards`}
              sublabel="Top rankings"
              color={theme.colors.primary}
            />
          </StaggerItem>
        </StaggerGroup>

        <div id="calendar" className="min-w-0 scroll-mt-20">
          <StudentCalendar {...calendar} userId={userId} instituteCode={instituteCode} theme={theme} today={today} />
        </div>

        {/* ─── 2. Main Grid: Enrolled Courses & Due Soon ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left 2 Columns: Enrolled Classes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: "var(--institute-ink)",
                  }}
                >
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
                    My Enrolled Classes
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    Courses you are currently participating in
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-2.5">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: "var(--institute-ink)",
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

            {/* Reorder hint: drag on pointer devices, buttons everywhere */}
            {courses.length > 1 && (
              <>
                <p className="hidden [@media(hover:hover)]:block text-xs text-slate-500 dark:text-[#94A3B8]">
                  Drag cards or use the arrow buttons to reorder • changes are saved automatically
                </p>
                <p className="[@media(hover:hover)]:hidden text-xs text-slate-500 dark:text-[#94A3B8]">
                  Use the arrow buttons to reorder • changes are saved automatically
                </p>
              </>
            )}

            {courses.length === 0 ? (
              /* Enhanced 2-Step Onboarding Empty State */
              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs">
                <div className="text-center max-w-md mx-auto mb-6">
                  <div
                    className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: `${theme.colors.primary}18`,
                      color: "var(--institute-ink)",
                    }}
                  >
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                    Get Started with Your Courses
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-[#94A3B8]">
                    You are not enrolled in any classes yet. Follow these simple steps to begin:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/2 flex items-start gap-3">
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
                      <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-0.5">
                        Ask your professor for the 6-character class invite code.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/2 flex items-start gap-3">
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
                      <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-0.5">
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
                            : { background: "var(--course-banner)" }
                        }
                      >
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/20" />

                        {/* Top Badges & 3-dots Menu */}
                        <div className="relative z-20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-[calc(100%-44px)]">
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold tracking-wide bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0">
                              {course.code}
                            </span>
                            {course.section && (
                              <span className="text-[11px] sm:text-xs font-medium text-white/90 bg-black/30 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded truncate border border-white/20">
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
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                          {course.instructorName && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-500 dark:text-[#94A3B8] shrink-0" />
                              <span className="truncate">{course.instructorName}</span>
                            </div>
                          )}
                          {course.room && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-500 dark:text-[#94A3B8] shrink-0" />
                              <span className="truncate">{course.room}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                          <Link
                            href={`/${instituteCode}/courses/${course.id}/classwork`}
                            className="text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] transition-colors"
                            draggable={false}
                          >
                            Classwork
                          </Link>
                          <CourseReorderButtons
                            title={course.title}
                            index={index}
                            total={courses.length}
                            onMove={(direction) => moveCourse(index, direction)}
                          />
                          <Link
                            href={`/${instituteCode}/courses/${course.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-colors"
                            style={{ color: "var(--institute-ink)" }}
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

          {/* ─── 4. Right 1 Column: Due Soon / Pending Tasks & ITE Participation ─── */}
          <div className="space-y-6">
            {instituteCode.toLowerCase() === "ite" && (
              <>
                <StudentSuggestionsCard theme={theme} instituteCode={instituteCode} />
                <StudentFocusCard theme={theme} instituteCode={instituteCode} />
                <StudentParticipationCard theme={theme} instituteCode={instituteCode} />
              </>
            )}
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: "var(--institute-ink)",
                  }}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
                    Deadlines
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    Overdue work and the next 7 days
                  </p>
                </div>
              </div>
              {pendingDeadlineCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {pendingDeadlineCount} Pending
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-4 shadow-xs space-y-3">
              {pendingDeadlineCount === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
                    All caught up!
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                    Nothing overdue and no classwork due in the next 7 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueItems.length > 0 && (
                    <section aria-label="Overdue">
                      <h3 className="px-1 mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        <span>Overdue</span>
                        <span className="font-mono tabular-nums">{overdueItems.length}</span>
                      </h3>
                      <div className="space-y-2">
                        {overdueItems.slice(0, MAX_OVERDUE_SHOWN).map((item, idx) => renderDueItem(item, idx))}
                      </div>
                      {overdueItems.length > MAX_OVERDUE_SHOWN && (
                        <p className="px-1 mt-1 text-xs text-slate-600 dark:text-[#94A3B8]">
                          +{overdueItems.length - MAX_OVERDUE_SHOWN} more overdue in your To-do list.
                        </p>
                      )}
                    </section>
                  )}

                  {upcomingItems.length > 0 && (
                    <section aria-label="Due in the next 7 days">
                      <h3 className="px-1 mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
                        <span>Next 7 days</span>
                        <span className="font-mono tabular-nums">{upcomingItems.length}</span>
                      </h3>
                      <div className="space-y-2">
                        {upcomingItems.map((item, idx) => renderDueItem(item, idx))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-right">
                <Link
                  href={`/${instituteCode}/assignments`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                  style={{ color: "var(--institute-ink)" }}
                >
                  <span>Go to full To-do page</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
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
        <ConfirmDialog
          title="Unenroll from course?"
          description={`You will lose access to all course materials and your submission history${
            unenrollTarget ? ` for ${unenrollTarget.title}` : ""
          }. This action cannot be undone.`}
          onClose={() => setConfirmUnenroll(null)}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmUnenroll(null)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-11"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleUnenroll(confirmUnenroll)}
              disabled={isPending}
              className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer min-h-11"
            >
              {isPending ? "Unenrolling..." : "Unenroll"}
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
