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
    instructor: { name: string } | null;
  };
  theme: InstituteTheme;
}

export default function CourseHeader({ course, theme }: CourseHeaderProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-6 py-8 md:px-10 md:py-10"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover})`,
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-10"
        style={{ backgroundColor: "#fff" }}
      />
      <div
        className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full opacity-10"
        style={{ backgroundColor: "#fff" }}
      />

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
