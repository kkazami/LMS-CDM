"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Clock,
  ChevronRight,
  MapPin,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  UserCheck,
  Check,
  CheckCheck,
  X,
  Plus,
  Compass,
  Share2,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import CourseCardMenu from "@/components/courses/CourseCardMenu";
import CustomizeCourseModal from "@/components/courses/CustomizeCourseModal";
import InstructorCreateCourseModal from "@/components/courses/InstructorCreateCourseModal";
import InstructorEditCourseModal from "@/components/courses/InstructorEditCourseModal";
import Button from "@/components/common/Button";
import { archiveCourse, reorderCourseCards } from "../courses/actions";
import { approveEnrollment, declineEnrollment, approveAllPending } from "../courses/[courseId]/people/actions";
import { TypingBanner } from "@/components/motion/TypingBanner";
import { StatPill } from "@/components/dashboard/StatPill";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";

interface TaughtCourse {
  id: string;
  title: string;
  code: string;
  section: string;
  subject: string;
  room: string;
  description?: string;
  coverImage?: string;
  enrolledCount: number;
  pendingCount: number;
  pendingWorkCount?: number;
}

export interface PendingClassWork {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  section: string;
  pendingCount: number;
}

interface PendingRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  requestedAt: string;
}

interface TeacherDashboardClientProps {
  userName: string;
  instituteName: string;
  instituteCode: string;
  theme: InstituteTheme;
  initialCourses: TaughtCourse[];
  initialPendingRequests: PendingRequest[];
  initialPendingWorkClasses?: PendingClassWork[];
  totalPendingWorkCount?: number;
  typingSessionKey?: string;
}

export default function TeacherDashboardClient({
  userName,
  instituteName,
  instituteCode,
  theme,
  initialCourses,
  initialPendingRequests,
  initialPendingWorkClasses = [],
  totalPendingWorkCount,
  typingSessionKey,
}: TeacherDashboardClientProps) {
  const [courses, setCourses] = useState<TaughtCourse[]>(initialCourses);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TaughtCourse | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
  const [pendingWorkClasses, setPendingWorkClasses] = useState<PendingClassWork[]>(initialPendingWorkClasses);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [customizingCourse, setCustomizingCourse] = useState<{ id: string; title: string; coverImage?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    setPendingRequests(initialPendingRequests);
  }, [initialPendingRequests]);

  useEffect(() => {
    setPendingWorkClasses(initialPendingWorkClasses);
  }, [initialPendingWorkClasses]);

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
        false // isStudent = false for teachers
      );
    });
  }

  const handleArchive = (courseId: string) => {
    startTransition(async () => {
      const result = await archiveCourse(courseId, instituteCode);
      if (result.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      }
      setConfirmArchive(null);
    });
  };

  const handleApproveRequest = (enrollmentId: string, courseId: string) => {
    startTransition(async () => {
      const result = await approveEnrollment(enrollmentId, courseId, instituteCode);
      if (result.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== enrollmentId));
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, enrolledCount: c.enrolledCount + 1, pendingCount: Math.max(0, c.pendingCount - 1) }
              : c
          )
        );
      }
    });
  };

  const handleDeclineRequest = (enrollmentId: string, courseId: string) => {
    startTransition(async () => {
      const result = await declineEnrollment(enrollmentId, courseId, instituteCode);
      if (result.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== enrollmentId));
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, pendingCount: Math.max(0, c.pendingCount - 1) }
              : c
          )
        );
      }
    });
  };

  const handleApproveAllBatch = () => {
    if (pendingRequests.length === 0) return;
    startTransition(async () => {
      // Get unique course IDs from pending requests
      const uniqueCourseIds = Array.from(new Set(pendingRequests.map((r) => r.courseId)));
      for (const cId of uniqueCourseIds) {
        await approveAllPending(cId, instituteCode);
      }

      // Optimistically clear pending requests
      const approvedCountByCourse = new Map<string, number>();
      for (const req of pendingRequests) {
        approvedCountByCourse.set(req.courseId, (approvedCountByCourse.get(req.courseId) ?? 0) + 1);
      }

      setCourses((prev) =>
        prev.map((c) => {
          const approvedDelta = approvedCountByCourse.get(c.id) ?? 0;
          return approvedDelta > 0
            ? { ...c, enrolledCount: c.enrolledCount + approvedDelta, pendingCount: 0 }
            : c;
        })
      );
      setPendingRequests([]);
    });
  };

  const handleCoverSuccess = (newCoverImage: string) => {
    if (customizingCourse) {
      setCourses((prev) =>
        prev.map((c) => (c.id === customizingCourse.id ? { ...c, coverImage: newCoverImage } : c))
      );
    }
  };

  const totalStudentsEnrolled = courses.reduce((acc, c) => acc + c.enrolledCount, 0);
  const totalPendingWork =
    totalPendingWorkCount ??
    pendingWorkClasses.reduce((acc, c) => acc + c.pendingCount, 0);

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto page-enter">
        {/* ─── 1. Anti-Slop Faculty Hero Banner ─── */}
        <div
          className="hero-noise relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs transition-colors"
          style={{
            borderLeft: `4px solid ${theme.colors.primary}`,
            background: `radial-gradient(ellipse at 25% 45%, ${theme.colors.primary}15 0%, transparent 70%), var(--bg-surface, #FFFFFF)`,
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${theme.colors.primary}1A`,
                  color: theme.colors.primary,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{instituteName} • Faculty Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8]">
                <TypingBanner
                  text={`Welcome back, Professor ${userName}!`}
                  sessionKey={typingSessionKey ?? "lumina_faculty_typed_greeting"}
                />
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-[#8B92A5] leading-relaxed">
                Manage your assigned classes, syllabus, gradebook ledgers, and student enrollment requests.
              </p>
            </div>

            {/* Faculty StatPills row (no ExpRing) */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              <StatPill
                icon={BookOpen}
                label={`${courses.length} Classes`}
                color={theme.colors.primary}
              />
              <StatPill
                icon={Users}
                label={`${totalStudentsEnrolled} Students`}
                color="#10B981"
              />
              <StatPill
                icon={UserCheck}
                label={`${pendingRequests.length} Requests`}
                color={pendingRequests.length > 0 ? "#F59E0B" : "#64748B"}
              />
              <StatPill
                icon={ClipboardCheck}
                label={`${totalPendingWork} to Grade`}
                color={totalPendingWork > 0 ? "#F43F5E" : "#64748B"}
              />
            </div>
          </div>
        </div>

        {/* ─── 1b. Faculty Quick Action Cards Grid ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Instruction Controls
            </h2>
          </div>
          <StaggerGroup className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StaggerItem>
              <QuickActionCard
                icon={Plus}
                label="Add Class"
                sublabel="Provision course"
                onClick={() => setCreateModalOpen(true)}
                color={theme.colors.primary}
              />
            </StaggerItem>
            <StaggerItem>
              <QuickActionCard
                icon={GraduationCap}
                label="Gradebook"
                sublabel="Grading matrix"
                href="#pending-work"
                badge={totalPendingWork > 0 ? `${totalPendingWork} to Grade` : null}
                badgeVariant={totalPendingWork > 0 ? "warning" : "muted"}
                color="#3B82F6"
              />
            </StaggerItem>
            <StaggerItem>
              <QuickActionCard
                icon={UserCheck}
                label="Requests"
                sublabel="Enrollment queue"
                href="#pending-requests"
                badge={pendingRequests.length > 0 ? `${pendingRequests.length} New` : null}
                badgeVariant={pendingRequests.length > 0 ? "warning" : "muted"}
                color="#F59E0B"
              />
            </StaggerItem>
            <StaggerItem>
              <QuickActionCard
                icon={BarChart3}
                label="Analytics"
                sublabel="At-risk telemetry"
                href={`/${instituteCode}/analytics`}
                color="#8B5CF6"
              />
            </StaggerItem>
            <StaggerItem>
              <QuickActionCard
                icon={Share2}
                label="Broadcast"
                sublabel="Send notice"
                href={`/${instituteCode}/announcements`}
                color="#EC4899"
              />
            </StaggerItem>
            <StaggerItem>
              <QuickActionCard
                icon={Compass}
                label="CodeLab Hub"
                sublabel="Lab workspace"
                href={`/${instituteCode}/activities/codelab`}
                color="#06B6D4"
              />
            </StaggerItem>
          </StaggerGroup>
        </div>

        {/* ─── 2. Main Grid: Taught Courses & Pending Requests ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: My Courses */}
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">My Classes</h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Classes assigned to you for instruction</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: theme.colors.primary,
                  }}
                >
                  {courses.length} {courses.length === 1 ? "Class" : "Classes"}
                </span>
              </div>
            </div>

            {/* Drag and drop hint */}
            {courses.length > 1 && (
              <p className="text-xs text-slate-400 dark:text-[#64748B]">
                Drag cards to reorder • changes are saved automatically
              </p>
            )}

            {courses.length === 0 ? (
              /* Enhanced 2-Step Onboarding Empty State for Instructors */
              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-8 shadow-xs">
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
                    Set Up Your First Classroom
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">
                    You have no active courses assigned. Launch your classroom in two quick steps:
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
                        Create Course
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        Define course title, code, room, and syllabus items.
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
                        Share Invite Code
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        Students use your unique course code to request enrollment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button theme={theme} onClick={() => setCreateModalOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    <span>Create Your First Class</span>
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
                      {/* Header Banner Block with Customizable Image */}
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

                        {/* Top Badges & 3-dots Menu */}
                        <div className="relative z-20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono tabular-nums tracking-wide bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0">
                              {course.code}
                            </span>
                            {course.section && (
                              <span className="text-xs font-medium text-white/90 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded truncate border border-white/20">
                                {course.section}
                              </span>
                            )}
                            {course.pendingCount > 0 && (
                              <span className="text-[10px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs shrink-0">
                                {course.pendingCount} req
                              </span>
                            )}
                            {(course.pendingWorkCount ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs shrink-0 border border-white/20">
                                <ClipboardCheck className="h-2.5 w-2.5" />
                                {course.pendingWorkCount} to grade
                              </span>
                            )}
                          </div>

                          {/* 3-Dots Menu — Includes Customize Card for instructors */}
                          <CourseCardMenu
                            courseId={course.id}
                            isStudent={false}
                            isArchived={false}
                            onArchive={() => setConfirmArchive(course.id)}
                            onCustomizeCard={() =>
                              setCustomizingCourse({
                                id: course.id,
                                title: course.title,
                                coverImage: course.coverImage,
                              })
                            }
                            onEdit={() => setEditingCourse(course)}
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
                        <div className="space-y-1 text-xs text-slate-500 dark:text-[#94A3B8]">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B] shrink-0" />
                            <span>{course.enrolledCount} enrolled student{course.enrolledCount === 1 ? "" : "s"}</span>
                          </div>
                          {course.room && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B] shrink-0" />
                              <span className="truncate">{course.room}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/${instituteCode}/courses/${course.id}/classwork`}
                              className="text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] transition-colors"
                              draggable={false}
                            >
                              Classwork
                            </Link>
                            <Link
                              href={`/${instituteCode}/courses/${course.id}/gradebook`}
                              className="relative text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] transition-colors inline-flex items-center gap-1.5"
                              draggable={false}
                            >
                              <span>Gradebook</span>
                              {(course.pendingWorkCount ?? 0) > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  {course.pendingWorkCount}
                                </span>
                              )}
                            </Link>
                          </div>
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

          {/* ─── 3. Right 1 Column: Pending Work & Pending Enrollment Requests ─── */}
          <div className="space-y-6">
            {/* ─── 3a. Pending Work by Class Widget ─── */}
            <div className="space-y-4" id="pending-work">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: `${theme.colors.primary}1A`,
                      color: theme.colors.primary,
                    }}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">Pending Work</h2>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Submissions awaiting grading</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalPendingWork > 0 ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      {totalPendingWork} to grade
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      All graded
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-4 shadow-xs space-y-3">
                {pendingWorkClasses.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">All caught up!</p>
                    <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">
                      No student submissions currently pending grading.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingWorkClasses.map((item) => (
                      <div
                        key={item.courseId}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-all gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-800 dark:text-[#F1F5F9]">
                              {item.courseCode}
                            </span>
                            {item.section && (
                              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                                • Sec {item.section}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-700 dark:text-[#CBD5E1] truncate mt-1">
                            {item.courseTitle}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold font-mono tabular-nums px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {item.pendingCount} to grade
                          </span>
                          <Link
                            href={`/${instituteCode}/courses/${item.courseId}/gradebook`}
                            className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            title="Open Gradebook"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── 3b. Pending Enrollment Requests Widget ─── */}
            <div className="space-y-4" id="pending-requests">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: `${theme.colors.primary}1A`,
                    color: theme.colors.primary,
                  }}
                >
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">Pending Requests</h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Student enrollment requests</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingRequests.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleApproveAllBatch}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Approve all waiting students"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Approve All</span>
                    </button>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {pendingRequests.length}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-4 shadow-xs space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">All requests handled!</p>
                  <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">
                    No student requests currently pending approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-all gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-[#F1F5F9] truncate">
                          {req.studentName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                          {req.courseCode} {req.studentNumber ? `• ${req.studentNumber}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id, req.courseId)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                          title="Approve student"
                          aria-label="Approve student"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineRequest(req.id, req.courseId)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-rose-950/30 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                          title="Decline student"
                          aria-label="Decline student"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Instructor Create Course Modal */}
      <InstructorCreateCourseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        theme={theme}
        instituteCode={instituteCode}
      />

      {/* Instructor Edit Course Modal */}
      <InstructorEditCourseModal
        open={!!editingCourse}
        onClose={() => setEditingCourse(null)}
        theme={theme}
        instituteCode={instituteCode}
        course={editingCourse}
      />

      {/* Customize Course Cover Modal */}
      {customizingCourse && (
        <CustomizeCourseModal
          open={Boolean(customizingCourse)}
          onClose={() => setCustomizingCourse(null)}
          courseId={customizingCourse.id}
          courseTitle={customizingCourse.title}
          currentCoverImage={customizingCourse.coverImage}
          theme={theme}
          instituteCode={instituteCode}
          onSuccess={handleCoverSuccess}
        />
      )}

      {/* Archive Confirmation Modal */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setConfirmArchive(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1C2030] rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9]">
            <h3 className="text-lg font-bold mb-2">Archive course?</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-6">
              Archiving removes this course from your active dashboard. You can restore it later from Archived Classes.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmArchive(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleArchive(confirmArchive)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2 text-xs font-semibold hover:bg-black dark:hover:bg-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isPending ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
