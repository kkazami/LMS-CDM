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
  X,
  Plus,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import CourseCardMenu from "@/components/courses/CourseCardMenu";
import CustomizeCourseModal from "@/components/courses/CustomizeCourseModal";
import InstructorCreateCourseModal from "@/components/courses/InstructorCreateCourseModal";
import InstructorEditCourseModal from "@/components/courses/InstructorEditCourseModal";
import Button from "@/components/common/Button";
import { archiveCourse, reorderCourseCards } from "../courses/actions";
import { approveEnrollment, declineEnrollment } from "../courses/[courseId]/people/actions";

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
}

export default function TeacherDashboardClient({
  userName,
  instituteName,
  instituteCode,
  theme,
  initialCourses,
  initialPendingRequests,
}: TeacherDashboardClientProps) {
  const [courses, setCourses] = useState<TaughtCourse[]>(initialCourses);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TaughtCourse | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [customizingCourse, setCustomizingCourse] = useState<{ id: string; title: string; coverImage?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    setPendingRequests(initialPendingRequests);
  }, [initialPendingRequests]);

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

  const handleCoverSuccess = (newCoverImage: string) => {
    if (customizingCourse) {
      setCourses((prev) =>
        prev.map((c) => (c.id === customizingCourse.id ? { ...c, coverImage: newCoverImage } : c))
      );
    }
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
              <span>{instituteName} • Teacher Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, Professor {userName}! 👨‍🏫
            </h1>
            <p className="mt-1 text-sm sm:text-base text-white/80">
              Manage your assigned classes and pending student enrollments.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Taught Courses & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: My Courses */}
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
                <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
                <p className="text-xs text-gray-500">Classes assigned to you for instruction</p>
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
              <Button theme={theme} onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </div>
          </div>

          {/* Drag and drop hint */}
          {courses.length > 1 && (
            <p className="text-xs text-gray-400">
              Drag cards to reorder • changes are saved automatically
            </p>
          )}

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm flex flex-col items-center">
              <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No Classes Assigned Yet</h3>
              <p className="mt-1 text-xs text-gray-500 mb-4 max-w-sm">
                You haven't created or been assigned any classes yet.
              </p>
              <Button theme={theme} onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Class
              </Button>
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
                          {course.pendingCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm shrink-0">
                              {course.pendingCount} pending
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
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{course.enrolledCount} enrolled student{course.enrolledCount === 1 ? "" : "s"}</span>
                        </div>
                        {course.room && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{course.room}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions Footer */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/${instituteCode}/courses/${course.id}/classwork`}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            draggable={false}
                          >
                            Classwork
                          </Link>
                          <Link
                            href={`/${instituteCode}/courses/${course.id}/gradebook`}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            draggable={false}
                          >
                            Gradebook
                          </Link>
                        </div>
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

        {/* Right 1 Column: Pending Enrollment Requests Widget */}
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
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pending Requests</h2>
                <p className="text-xs text-gray-500">Student enrollment requests</p>
              </div>
            </div>
            {pendingRequests.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {pendingRequests.length} Waiting
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-gray-800">All requests handled!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  No student requests currently pending approval.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {req.studentName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {req.courseCode} {req.studentNumber ? `• ${req.studentNumber}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req.id, req.courseId)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        title="Approve student"
                        aria-label="Approve student"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(req.id, req.courseId)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
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
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setConfirmArchive(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Archive course?</h3>
            <p className="text-xs text-gray-500 mb-6">
              Archiving removes this course from your active dashboard. You can restore it later from Archived Classes.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmArchive(null)}
                className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleArchive(confirmArchive)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50 transition-colors"
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
