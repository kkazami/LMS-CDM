"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import JoinCourseModal from "@/components/courses/JoinCourseModal";
import InstructorCreateCourseModal from "@/components/courses/InstructorCreateCourseModal";
import CourseCardMenu from "@/components/courses/CourseCardMenu";
import {
  Plus,
  BookOpen,
  MapPin,
  User,
  Users,
  Clock,
} from "lucide-react";
import {
  unenrollFromCourse,
  archiveCourse,
  reorderCourseCards,
} from "./actions";

interface CourseCard {
  id: string;
  code: string;
  courseCode: string;
  title: string;
  section: string;
  subject: string;
  room: string;
  instructorName: string | null;
  enrolledCount?: number;
  displayOrderIndex?: number;
}

// Color palette for course cards (Google Classroom-inspired)
const CARD_COLORS = [
  { bg: "linear-gradient(135deg, #1E88E5, #1565C0)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #43A047, #2E7D32)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #E53935, #C62828)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #8E24AA, #6A1B9A)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #FB8C00, #EF6C00)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #00ACC1, #00838F)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #3949AB, #283593)", text: "#FFFFFF" },
  { bg: "linear-gradient(135deg, #D81B60, #AD1457)", text: "#FFFFFF" },
];

function getCardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

export default function CoursesClient({
  courses: initialCourses,
  instituteCode,
  theme,
  userRole,
  canEdit,
  pendingCount = 0,
}: {
  courses: CourseCard[];
  instituteCode: string;
  theme: InstituteTheme;
  userRole: string;
  canEdit: boolean;
  pendingCount?: number;
}) {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courses, setCourses] = useState(
    [...initialCourses].sort(
      (a, b) => (a.displayOrderIndex ?? 0) - (b.displayOrderIndex ?? 0)
    )
  );
  const [confirmUnenroll, setConfirmUnenroll] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isStudent = userRole === "STUDENT";
  const isInstructor = userRole === "PROFESSOR" || userRole === "ADMIN";

  // ─── Drag and Drop ───
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

    // Persist new order
    startTransition(async () => {
      await reorderCourseCards(
        reordered.map((c) => c.id),
        instituteCode,
        isStudent
      );
    });
  }

  // ─── Unenroll ───
  async function handleUnenroll(courseId: string) {
    const result = await unenrollFromCourse(courseId, instituteCode);
    if (result.success) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    }
    setConfirmUnenroll(null);
  }

  // ─── Archive ───
  function handleArchive(courseId: string) {
    startTransition(async () => {
      const result = await archiveCourse(courseId, instituteCode);
      if (result.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      }
    });
  }

  return (
    <>
      <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">
            {isStudent ? "My Courses" : "My Classes"}
          </h1>
          {isStudent && pendingCount > 0 && (
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8B92A5]">
              <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              {pendingCount} enrollment request{pendingCount > 1 ? "s" : ""} pending
            </p>
          )}
        </div>

        {isStudent && (
          <Button theme={theme} onClick={() => setJoinModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Join Course
          </Button>
        )}
        {userRole === "PROFESSOR" && (
          <Button theme={theme} onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        )}
      </div>

      {/* Drag-and-drop hint */}
      {courses.length > 1 && (
        <p className="text-xs text-slate-400 dark:text-[#555C72] mt-1">
          Drag cards to reorder • changes are saved automatically
        </p>
      )}

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-8 shadow-xs mt-4">
          <div className="rounded-full bg-slate-100 dark:bg-white/5 p-6 mb-4">
            <BookOpen className="h-10 w-10 text-slate-400 dark:text-[#555C72]" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-[#F0F2F8]">
            {isStudent ? "No courses yet" : "No classes yet"}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm">
            {isStudent
              ? "Join a course using a course code or browse available courses."
              : "You haven't created or been assigned any classes yet."}
          </p>
          {isStudent && (
            <Button theme={theme} onClick={() => setJoinModalOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Join Your First Course
            </Button>
          )}
          {userRole === "PROFESSOR" && (
            <Button theme={theme} onClick={() => setCreateModalOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Class
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {courses.map((course, index) => {
            const color = getCardColor(index);
            return (
              <div
                key={course.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className="group block overflow-hidden rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] shadow-xs transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.99] cursor-grab active:cursor-grabbing select-none"
                style={{
                  animation: `staggerFadeIn 0.2s ease-out both`,
                  animationDelay: `${Math.min(index, 10) * 40}ms`,
                }}
              >
                <Link
                  href={`/${instituteCode}/courses/${course.id}`}
                  className="block"
                  draggable={false}
                >
                  {/* Card Header */}
                  <div
                    className="relative px-5 py-6"
                    style={{ background: color.bg }}
                  >
                    {/* Decorative circles */}
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-2 -left-2 h-12 w-12 rounded-full bg-white/10" />

                    {/* Triple-dot menu */}
                    <div className="absolute top-3 right-3 z-10">
                      <CourseCardMenu
                        courseId={course.id}
                        isStudent={isStudent}
                        isArchived={false}
                        onUnenroll={() => setConfirmUnenroll(course.id)}
                        onArchive={() => handleArchive(course.id)}
                      />
                    </div>

                    <div className="relative z-10 pr-8">
                      <h3 className="text-lg font-bold text-white truncate">
                        {course.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-white/80">
                        {course.code}
                        {course.section ? ` • ${course.section}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 space-y-2">
                    {course.instructorName && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#8B92A5]">
                        <User className="h-3.5 w-3.5 text-slate-400 dark:text-[#555C72]" />
                        <span>{course.instructorName}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#8B92A5]">
                      {course.subject && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {course.subject}
                        </span>
                      )}
                      {course.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {course.room}
                        </span>
                      )}
                      {course.enrolledCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.enrolledCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* Join Course Modal */}
      {isStudent && (
        <JoinCourseModal
          open={joinModalOpen}
          onClose={() => setJoinModalOpen(false)}
          theme={theme}
          instituteCode={instituteCode}
        />
      )}

      {/* Instructor Create Course Modal */}
      {userRole === "PROFESSOR" && (
        <InstructorCreateCourseModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          theme={theme}
          instituteCode={instituteCode}
        />
      )}

      {/* Unenroll confirmation dialog */}
      {confirmUnenroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setConfirmUnenroll(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] shadow-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">Unenroll from course?</h2>
            <p className="text-xs text-slate-500 dark:text-[#8B92A5] mb-6">
              You'll lose access to all course materials and your submission history. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUnenroll(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] py-2.5 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnenroll(confirmUnenroll)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                Unenroll
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
