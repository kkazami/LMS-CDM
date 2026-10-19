"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  Calendar,
  BookOpen,
  GraduationCap,
  Briefcase,
  Edit3,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import UserAvatar from "@/components/common/UserAvatar";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  studentNumber: string | null;
  uniqueId: string;
  avatarUrl: string | null;
  bio: string;
  phone: string;
  department: string;
  yearLevel: string;
  coverColor: string;
  createdAt: string;
  institute: { code: string; name: string };
  taughtCourses: { id: string; title: string; code: string }[];
  enrollments: { course: { id: string; title: string; code: string } }[];
}

interface PublicProfileClientProps {
  user: ProfileUser;
  isOwnProfile: boolean;
  instituteCode: string;
  theme: InstituteTheme;
}

export default function PublicProfileClient({
  user,
  isOwnProfile,
  instituteCode,
  theme,
}: PublicProfileClientProps) {
  const roleLabel =
    user.role === "PROFESSOR" || user.role === "TEACHER"
      ? "Instructor"
      : user.role === "ADMIN"
      ? "Admin"
      : "Student";

  const isStudent = user.role === "STUDENT";
  const courses = isStudent
    ? user.enrollments.map((e) => e.course)
    : user.taughtCourses;
  const courseLabel = isStudent ? "Enrolled Courses" : "Teaching";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cover Banner */}
      <div
        className="relative h-36 rounded-t-2xl sm:h-44"
        style={{
          background: `linear-gradient(135deg, ${user.coverColor}, ${user.coverColor}99)`,
        }}
      >
        {/* Edit button */}
        {isOwnProfile && (
          <Link
            href={`/${instituteCode}/profile`}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Profile
          </Link>
        )}
      </div>

      {/* Avatar overlapping banner bottom */}
      <div className="relative px-6">
        <div className="-mt-12 mb-4">
          <div className="inline-block rounded-full ring-4 ring-white dark:ring-[#141721]">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="xl"
              color={user.coverColor}
            />
          </div>
        </div>

        {/* Name + Role */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">{user.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-[#8B92A5]">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: `${theme.colors.primary}1A`,
              color: theme.colors.primary,
            }}
          >
            {roleLabel}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span>{user.institute.name}</span>
          {user.department && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>{user.department}</span>
            </>
          )}
          {isStudent && user.yearLevel && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>{user.yearLevel}</span>
            </>
          )}
          {isStudent && user.studentNumber && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-[#F0F2F8]">{user.studentNumber}</span>
            </>
          )}
          {!isStudent && user.uniqueId && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-[#F0F2F8]">{user.uniqueId}</span>
            </>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="mt-8 px-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8B92A5] mb-3">
          <BookOpen className="h-4 w-4" />
          About
        </h2>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 space-y-3 shadow-xs">
          <p className="text-sm text-slate-700 dark:text-[#F0F2F8] leading-relaxed whitespace-pre-wrap">
            {user.bio || "No bio added yet."}
          </p>

          <hr className="border-slate-100 dark:border-white/5" />

          <div className="grid gap-2">
            <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-[#8B92A5]">
              <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-[#8B92A5]">
                <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="font-mono tabular-nums">{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-[#8B92A5]">
              <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>
                Member since{" "}
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="mt-6 px-6 pb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8B92A5] mb-3">
          {isStudent ? (
            <GraduationCap className="h-4 w-4" />
          ) : (
            <Briefcase className="h-4 w-4" />
          )}
          {courseLabel}
        </h2>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
          {courses.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No courses to display.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/${instituteCode}/courses/${course.id}/stream`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <span className="font-semibold font-mono tabular-nums" style={{ color: theme.colors.primary }}>
                    {course.code}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span className="max-w-[140px] truncate">{course.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
