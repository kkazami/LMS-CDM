"use client";

import type { InstituteTheme } from "@/lib/theme";
import { BookOpen, MapPin, User } from "lucide-react";

interface CourseHeaderProps {
  course: {
    title: string;
    code: string;
    courseCode: string;
    section: string;
    subject: string;
    room: string;
    coverImage?: string | null;
    instructor: { name: string } | null;
  };
  theme: InstituteTheme;
}

export default function CourseHeader({ course, theme }: CourseHeaderProps) {
  const hasCover = Boolean(course.coverImage);

  if (hasCover) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-10 md:py-10 bg-cover bg-center shadow-md"
        style={{ backgroundImage: `url("${course.coverImage}")` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20 z-0" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white md:text-3xl truncate">
                {course.title}
              </h1>
              <p className="mt-1 text-white/80 text-sm">
                {course.code} • {course.subject}
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center rounded-lg bg-white/20 px-3 py-1.5 font-mono text-sm font-bold text-white backdrop-blur-sm">
                {course.courseCode}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/90">
            {course.section && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {course.section}
              </span>
            )}
            {course.room && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {course.room}
              </span>
            )}
            {course.instructor && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {course.instructor.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 border-l-4 shadow-sm"
      style={{ borderLeftColor: theme.colors.primary }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono uppercase tracking-wider"
              style={{
                backgroundColor: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
              }}
            >
              {course.code}
            </span>
            {course.subject && (
              <span className="text-xs font-medium text-slate-500 dark:text-[#8B92A5]">
                {course.subject}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8] md:text-3xl truncate">
            {course.title}
          </h1>
        </div>
        <div className="shrink-0">
          <span
            className="inline-flex items-center rounded-xl px-3.5 py-1.5 font-mono text-sm font-bold shadow-2xs"
            style={{
              backgroundColor: `${theme.colors.primary}14`,
              color: theme.colors.primary,
              border: `1px solid ${theme.colors.primary}30`,
            }}
          >
            Code: {course.courseCode}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-[#94A3B8]">
        {course.section && (
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>Section {course.section}</span>
          </span>
        )}
        {course.room && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>{course.room}</span>
          </span>
        )}
        {course.instructor && (
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>{course.instructor.name}</span>
          </span>
        )}
      </div>
    </div>
  );
}
