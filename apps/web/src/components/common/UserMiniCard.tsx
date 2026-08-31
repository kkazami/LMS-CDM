"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Mail, Phone, BookOpen, Loader2, Flame, Trophy } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import UserAvatar from "@/components/common/UserAvatar";
import LevelBadge from "@/components/common/LevelBadge";
import { computeLevelInfo } from "@/lib/gamification/exp-engine";

interface PublicUserProfile {
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
    currentStreak: number;
    longestStreak: number;
    totalLoginDays: number;
    badges: { badgeRuleId: string; earnedAt: string }[];
  } | null;
}

interface UserMiniCardProps {
  userId: string;
  instituteCode: string;
  /** Position anchor — the popover opens relative to this */
  anchorRect: DOMRect;
  onClose: () => void;
  theme: InstituteTheme;
}

export default function UserMiniCard({
  userId,
  instituteCode,
  anchorRect,
  onClose,
  theme,
}: UserMiniCardProps) {
  const [user, setUser] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user profile on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}/public`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = (await res.json()) as { user: PublicUserProfile };
        if (!cancelled) {
          setUser(data.user);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Calculate position after mount/load
  useEffect(() => {
    const cardWidth = 320;
    const cardHeight = 420;
    const gap = 8;

    let top = window.scrollY + anchorRect.bottom + gap;
    let left = window.scrollX + anchorRect.left;

    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;

    // Flip above if it doesn't fit below AND there is more space above
    if (cardHeight > spaceBelow && spaceAbove > spaceBelow) {
      top = window.scrollY + anchorRect.top - cardHeight - gap;
    }

    // Keep within viewport horizontally
    if (anchorRect.left + cardWidth > window.innerWidth) {
      left = window.scrollX + window.innerWidth - cardWidth - 16;
    }
    if (anchorRect.left < 16) {
      left = window.scrollX + 16;
    }

    setPosition({ top, left });
    // Trigger entrance animation
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, [anchorRect]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  const roleLabel =
    user?.role === "PROFESSOR" || user?.role === "TEACHER"
      ? "Instructor"
      : user?.role === "ADMIN"
      ? "Admin"
      : "Student";

  const exp = user?.gamificationProfile?.exp || 0;
  const levelInfo = computeLevelInfo(exp);
  const streak = user?.gamificationProfile?.currentStreak || 0;
  const badgeCount = user?.gamificationProfile?.badges?.length || 0;

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${user?.name || "User"} mini profile`}
      className={`fixed z-[9999] w-[320px] rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] shadow-2xl transition-all duration-200 ease-out overflow-hidden ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : error || !user ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-500 dark:text-[#8B92A5]">Could not load profile.</p>
          <button
            onClick={onClose}
            className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : (
        <div>
          {/* Top Banner Accent */}
          <div
            className="h-12 w-full"
            style={{ backgroundColor: user.coverColor || theme.colors.primary }}
          />

          <div className="px-5 pb-5 pt-0">
            {/* Header row with Avatar offset */}
            <div className="flex items-end justify-between -mt-6 mb-2.5">
              <div className="relative p-1 rounded-full bg-white dark:bg-[#141721] ring-2 ring-[#F97316]/30">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size="xl"
                  color={theme.colors.primary}
                />
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                aria-label="Close profile card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Name + Level Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] truncate max-w-[200px]">
                {user.name}
              </h3>
              {user.role === "STUDENT" && <LevelBadge exp={exp} size="sm" />}
            </div>

            {/* Role & Student Number */}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-[#8B92A5]">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: `${theme.colors.primary}1A`,
                  color: theme.colors.primary,
                }}
              >
                {roleLabel}
              </span>
              {user.studentNumber && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
                  <span className="font-mono">{user.studentNumber}</span>
                </>
              )}
              {user.department && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
                  <span>{user.department}</span>
                </>
              )}
            </div>

            {/* Student Gamification Stats */}
            {user.role === "STUDENT" && (
              <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-[#F0F2F8]">
                    Level {levelInfo.level} · {levelInfo.tier.toUpperCase()}
                  </span>
                  <span className="font-mono text-slate-400 dark:text-[#8B92A5]">
                    {levelInfo.currentLevelProgress} / {levelInfo.expToNextLevel} EXP ({levelInfo.progressPercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F97316] transition-all duration-500"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-slate-600 dark:text-[#8B92A5]">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                    {streak} Day Streak
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {badgeCount} Badges
                  </span>
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-[#8B92A5]">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <hr className="my-3 border-slate-100 dark:border-white/5" />

            {/* View Full Profile */}
            <Link
              href={`/${instituteCode}/users/${user.id}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              style={{ color: theme.colors.primary }}
              onClick={onClose}
            >
              View Full Profile
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
