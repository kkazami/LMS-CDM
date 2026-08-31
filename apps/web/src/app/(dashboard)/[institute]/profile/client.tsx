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
  Flame,
  Trophy,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { InstituteTheme } from "@/lib/theme";
import { useAvatar } from "@/lib/avatar-context";
import { toast } from "@/components/common/Toast";
import UserAvatar from "@/components/common/UserAvatar";
import AvatarUploadModal from "@/components/common/AvatarUploadModal";
import Button from "@/components/common/Button";
import ExpProgressRing from "@/components/common/ExpProgressRing";
import BadgeIcon from "@/components/common/BadgeIcon";
import { computeLevelInfo, TIER_CONFIG } from "@/lib/gamification/exp-engine";
import { getBadgeById, formatBadgeName } from "@/lib/gamification/badge-catalog";

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
  gamificationProfile?: {
    exp: number;
    level: number;
    levelTier: string;
    loginStreakCurrent: number;
    loginStreakLongest: number;
    totalLoginDays: number;
    badges: { badgeRuleId: string; earnedAt: string }[];
  } | null;
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
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
          <span>{user.institute.name}</span>
        </div>
      </div>

      {/* Edit Form */}
      <div className="mt-8 px-6 space-y-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
            Edit Profile
          </h2>

          {/* Name */}
          <div className="grid gap-1.5">
            <label htmlFor="profile-name" className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Full Name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
              placeholder="Your full name"
            />
          </div>

          {/* Bio */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="profile-bio" className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
                Bio
              </label>
              <span className="text-xs text-slate-400 dark:text-[#8B92A5]">{bio.length}/300</span>
            </div>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              className="rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none resize-none transition placeholder:text-slate-400 focus:border-orange-500"
              placeholder="Tell people a little about yourself..."
            />
          </div>

          {/* Phone */}
          <div className="grid gap-1.5">
            <label htmlFor="profile-phone" className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
              placeholder="+XX-XXX-XXXX"
            />
          </div>

          {/* Program */}
          <div className="grid gap-1.5">
            <label htmlFor="profile-department" className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Program
            </label>
            <select
              id="profile-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
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
              <label htmlFor="profile-yearLevel" className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
                Year Level
              </label>
              <select
                id="profile-yearLevel"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
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
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              <Palette className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              Profile Banner Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCoverColor(color)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: color,
                    borderColor: coverColor === color ? (theme.colors.primary || "#F97316") : "transparent",
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
                  className="w-24 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
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

        {/* ── Progress & Achievements Section (Student Gamification) ── */}
        {isStudent && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                <Sparkles className="h-4 w-4 text-[#F97316]" />
                Progress & Achievements
              </h2>
              <Link
                href={`/${instituteCode}/achievements`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#F97316] hover:text-[#EA580C] transition-colors"
              >
                <span>View All Achievements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* EXP Arc & Level Progress Overview */}
            {(() => {
              const exp = user.gamificationProfile?.exp || 0;
              const levelInfo = computeLevelInfo(exp);
              const tierConfig = TIER_CONFIG[levelInfo.tier] || TIER_CONFIG.newcomer;
              const streak = user.gamificationProfile?.loginStreakCurrent || 0;
              const totalDays = user.gamificationProfile?.totalLoginDays || 0;
              const badges = user.gamificationProfile?.badges || [];

              return (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <ExpProgressRing
                      percent={levelInfo.progressPercent}
                      level={levelInfo.level}
                      tierIcon={tierConfig.icon}
                      size={110}
                    />

                    <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className={`text-base font-black ${tierConfig.color} ${tierConfig.darkColor}`}>
                          Level {levelInfo.level} · {tierConfig.label} Tier
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono font-bold">
                          {exp} Total EXP
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-[#8B92A5] font-mono">
                          <span>Progress to Level {levelInfo.level + 1}</span>
                          <span>
                            {levelInfo.currentLevelProgress} / {levelInfo.expToNextLevel} EXP ({levelInfo.progressPercent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#F97316] transition-all duration-700 ease-out"
                            style={{ width: `${levelInfo.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Streak & Total Days */}
                      <div className="flex items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-600 dark:text-[#8B92A5]">
                        <span className="inline-flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
                          <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                          {streak}-Day Login Streak
                        </span>
                        <span className="text-slate-300 dark:text-white/10">•</span>
                        <span>{totalDays} Total Login Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                        Recent Badges ({badges.length})
                      </h3>
                      <Link
                        href={`/${instituteCode}/achievements`}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-[#8B92A5] dark:hover:text-[#F0F2F8] transition-colors"
                      >
                        Browse all 60 badges →
                      </Link>
                    </div>

                    {badges.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10">
                        <Trophy className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                          No badges earned yet. Complete activities and daily logins to earn badges!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                        {badges.map((b) => {
                          const def = getBadgeById(b.badgeRuleId);
                          const name = def?.name || formatBadgeName(b.badgeRuleId);
                          const earnDate = new Date(b.earnedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });

                          return (
                            <Link
                              key={b.badgeRuleId}
                              href={`/${instituteCode}/achievements?badge=${b.badgeRuleId}`}
                              title={`View ${name} in Achievements`}
                              className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#1A1D27] border border-slate-200/80 dark:border-white/5 hover:border-orange-500/50 hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all duration-150 text-center cursor-pointer active:scale-95 shadow-xs"
                            >
                              <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 ${def?.bgColor || "bg-orange-500/10"}`}>
                                <BadgeIcon
                                  name={def?.iconName || "Trophy"}
                                  className={`w-5 h-5 ${def?.color || "text-orange-500"} ${def?.darkColor || "dark:text-orange-400"}`}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-[#F0F2F8] group-hover:text-orange-600 dark:group-hover:text-orange-400 leading-tight line-clamp-1 transition-colors">
                                {name}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-[#555C72] font-mono">
                                {earnDate}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Read-only info section */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 space-y-3 shadow-xs">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
            <BookOpen className="h-4 w-4" />
            Contact & Info
          </h2>

          <div className="grid gap-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-[#8B92A5]">
              <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-[#8B92A5]">
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

        {/* Courses Section */}
        <div className="pb-8">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] mb-3">
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
                  <span
                    key={course.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[#F0F2F8]"
                  >
                    <span className="font-bold text-[#F97316]">
                      {course.code}
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">·</span>
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
