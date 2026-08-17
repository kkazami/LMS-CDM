"use client";

import type { InstituteTheme } from "@/lib/theme";
import Badge from "@/components/common/Badge";
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

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-10 md:py-10 bg-cover bg-center shadow-lg"
      style={
        hasCover
          ? { backgroundImage: `url("${course.coverImage}")` }
          : { background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)` }
      }
    >
      {/* Dark overlay for text readability when there's an image */}
      {hasCover ? (
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20 z-0" />
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black/10 blur-3xl" />
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        </>
      )}

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
