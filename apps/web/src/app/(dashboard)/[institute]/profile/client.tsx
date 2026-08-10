"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Save,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  GraduationCap,
  Briefcase,
  Palette,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { useAvatar } from "@/lib/avatar-context";
import { toast } from "@/components/common/Toast";
import UserAvatar from "@/components/common/UserAvatar";
import AvatarUploadModal from "@/components/common/AvatarUploadModal";
import Button from "@/components/common/Button";

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

interface ProfileEditClientProps {
  user: ProfileUser;
  instituteCode: string;
  theme: InstituteTheme;
}

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate", "N/A"];
const PROGRAM_OPTIONS = [
  "BSIT",
  "BSCPE",
  "BSBA HRM",
  "BS ENTREP",
  "BECEd",
  "BSEd SCIENCE",
  "BEEd",
  "BTLEd ICT",
  "GENERAL EDUCATION ACROSS INSTITUTE",
];
const COLOR_PRESETS = [
  "#1E88E5", "#E53935", "#43A047", "#FB8C00",
  "#8E24AA", "#00ACC1", "#3949AB", "#6D4C41",
];

export default function ProfileEditClient({
  user,
  instituteCode,
  theme,
}: ProfileEditClientProps) {
  const router = useRouter();
  const { avatarUrl } = useAvatar();

  // Form state
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [phone, setPhone] = useState(user.phone);
  const [department, setDepartment] = useState(user.department);
  const [yearLevel, setYearLevel] = useState(user.yearLevel);
  const [coverColor, setCoverColor] = useState(user.coverColor);
  const [customColor, setCustomColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const isStudent = user.role === "STUDENT";
  const courses = isStudent
    ? user.enrollments.map((e) => e.course)
    : user.taughtCourses;
  const courseLabel = isStudent ? "Enrolled Courses" : "Teaching";
  const roleLabel =
    user.role === "PROFESSOR" || user.role === "TEACHER"
      ? "Instructor"
      : user.role === "ADMIN"
      ? "Admin"
      : "Student";

  // Use context avatar or fallback to user.avatarUrl
  const currentAvatarUrl = avatarUrl ?? user.avatarUrl;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, phone, department, yearLevel, coverColor }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile updated!");
      router.refresh();
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cover Banner */}
      <div
        className="relative h-36 rounded-t-2xl sm:h-44 transition-colors duration-300"
        style={{
          background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)`,
        }}
      />

      {/* Avatar with camera button */}
      <div className="relative px-6">
        <div className="-mt-12 mb-4">
          <div className="relative inline-block">
            <div className="rounded-full ring-4 ring-white">
              <UserAvatar
                name={user.name}
                avatarUrl={currentAvatarUrl}
                size="xl"
                color={coverColor}
              />
            </div>
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700"
              aria-label="Change profile photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Read-only info */}
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
        </div>
      </div>

      {/* Edit Form */}
      <div className="mt-8 px-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Edit Profile
          </h2>

          {/* Name */}
          <div className="grid gap-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              placeholder="Your full name"
            />
          </div>

          {/* Bio */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="profile-bio" className="text-sm font-medium text-gray-700">
                Bio
              </label>
              <span className="text-xs text-gray-400">{bio.length}/300</span>
            </div>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none resize-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              placeholder="Tell people a little about yourself..."
            />
          </div>

          {/* Phone */}
          <div className="grid gap-1.5">
            <label htmlFor="profile-phone" className="text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              placeholder="+XX-XXX-XXXX"
            />
          </div>

          {/* Program */}
          <div className="grid gap-1.5">
            <label htmlFor="profile-department" className="text-sm font-medium text-gray-700">
              Program
            </label>
            <select
              id="profile-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="">Select program</option>
              {PROGRAM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Year Level (students only) */}
          {isStudent && (
            <div className="grid gap-1.5">
              <label htmlFor="profile-yearLevel" className="text-sm font-medium text-gray-700">
                Year Level
              </label>
              <select
                id="profile-yearLevel"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="">Select year level</option>
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cover Color */}
          <div className="grid gap-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Palette className="h-4 w-4 text-gray-400" />
              Profile Banner Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCoverColor(color)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: coverColor === color ? "#1a1a1a" : "transparent",
                  }}
                  aria-label={`Set banner color to ${color}`}
                />
              ))}
              {/* Custom hex input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onBlur={() => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                      setCoverColor(customColor);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && /^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                      setCoverColor(customColor);
                    }
                  }}
                  placeholder="#HEX"
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono outline-none transition placeholder:text-gray-400 focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="pt-2">
            <Button theme={theme} onClick={handleSave} loading={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Read-only info section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <BookOpen className="h-4 w-4" />
            Contact & Info
          </h2>

          <div className="grid gap-2">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{user.email}</span>
            </div>
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

        {/* Courses Section */}
        <div className="pb-8">
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
                  <span
                    key={course.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
                  >
                    <span className="font-semibold" style={{ color: theme.colors.primary }}>
                      {course.code}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="max-w-[140px] truncate">{course.title}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        theme={theme}
        currentAvatarUrl={currentAvatarUrl}
      />
    </div>
  );
}
