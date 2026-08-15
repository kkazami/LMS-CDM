"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, BookOpen, MapPin, User, Users, ArchiveRestore } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { unarchiveCourse } from "../actions";

interface ArchivedCourse {
  id: string;
  code: string;
  title: string;
  section: string;
  subject: string;
  room: string;
  instructorName: string | null;
  enrolledCount: number;
}

const CARD_COLORS = [
  "linear-gradient(135deg, #78909C, #546E7A)",
  "linear-gradient(135deg, #8D9B6A, #6B7A4D)",
  "linear-gradient(135deg, #7986CB, #5C6BC0)",
  "linear-gradient(135deg, #4DB6AC, #26A69A)",
];

export default function ArchivedCoursesClient({
  courses: initialCourses,
  instituteCode,
  theme,
}: {
  courses: ArchivedCourse[];
  instituteCode: string;
  theme: InstituteTheme;
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [isPending, startTransition] = useTransition();

  function handleUnarchive(courseId: string) {
    startTransition(async () => {
      const result = await unarchiveCourse(courseId, instituteCode);
      if (result.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      }
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Archived Classes</h1>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
            {courses.length} archived course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Link
        href={`/${instituteCode}/courses`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:underline"
      >
        ← Back to active courses
      </Link>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="rounded-2xl bg-slate-100 dark:bg-white/5 p-6 mb-4">
            <Archive className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-[#F0F2F8]">No archived courses</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8B92A5]">Archived courses will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {courses.map((course, index) => {
            const bg = CARD_COLORS[index % CARD_COLORS.length];
            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs opacity-85 hover:opacity-100 transition-opacity"
              >
                {/* Card Header */}
                <div className="relative px-5 py-6" style={{ background: bg }}>
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleUnarchive(course.id)}
                      disabled={isPending}
                      title="Unarchive"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 transition-colors cursor-pointer"
                    >
                      <ArchiveRestore className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="relative z-10 pr-8">
                    <h3 className="text-base font-bold text-white truncate">{course.title}</h3>
                    <p className="mt-0.5 text-xs text-white/70">
                      {course.code}
                      {course.section ? ` • ${course.section}` : ""}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4 space-y-2">
                  {course.instructorName && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#8B92A5]">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium">{course.instructorName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#8B92A5]">
                    {course.subject && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {course.subject}
                      </span>
                    )}
                    {course.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {course.room}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {course.enrolledCount}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-[#8B92A5] bg-slate-100 dark:bg-white/5 rounded-full px-2.5 py-0.5 border border-slate-200/60 dark:border-white/5">
                      <Archive className="h-3 w-3" /> Archived
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
