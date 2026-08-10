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
          <div className="inline-block rounded-full ring-4 ring-white">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="xl"
              color={user.coverColor}
            />
          </div>
        </div>

        {/* Name + Role */}
        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: `${theme.colors.primary}1A`,
              color: theme.colors.primary,
            }}
          >
            {roleLabel}
          </span>
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          <span>{user.institute.name}</span>
          {user.department && (
            <>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{user.department}</span>
            </>
          )}
          {isStudent && user.yearLevel && (
            <>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{user.yearLevel}</span>
            </>
          )}
          {isStudent && user.studentNumber && (
            <>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span className="font-mono text-xs">{user.studentNumber}</span>
            </>
          )}
          {!isStudent && user.uniqueId && (
            <>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span className="font-mono text-xs">{user.uniqueId}</span>
            </>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="mt-8 px-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          <BookOpen className="h-4 w-4" />
          About
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {user.bio || "No bio added yet."}
          </p>

          <hr className="border-gray-100" />

          <div className="grid gap-2">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
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
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          {isStudent ? (
            <GraduationCap className="h-4 w-4" />
          ) : (
            <Briefcase className="h-4 w-4" />
          )}
          {courseLabel}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-400">No courses to display.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/${instituteCode}/courses/${course.id}/stream`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <span className="font-semibold" style={{ color: theme.colors.primary }}>
                    {course.code}
                  </span>
                  <span className="text-gray-400">·</span>
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
