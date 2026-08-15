"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Mail, Phone, BookOpen, Loader2 } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import UserAvatar from "@/components/common/UserAvatar";

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
    return () => { cancelled = true; };
  }, [userId]);

  // Calculate position after mount/load
  useEffect(() => {
    const cardWidth = 320;
    const cardHeight = 360;
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

  // Click outside to close
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // Only close if we didn't click on the anchor itself (which would toggle it back open)
        // We assume the anchor might have its own click handler, but just in case:
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Escape key to close
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const roleLabel = user?.role === "PROFESSOR" || user?.role === "TEACHER"
    ? "Instructor"
    : user?.role === "ADMIN"
    ? "Admin"
    : "Student";

  if (!mounted) return null;

  return createPortal(
    <div
      ref={cardRef}
      className={`absolute z-[9999] w-80 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] shadow-2xl transition-all duration-150 ease-out ${
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
            className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="xl"
              color={theme.colors.primary}
            />
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              aria-label="Close profile card"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Name + role */}
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">{user.name}</h3>
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
            {user.uniqueId && user.role !== "STUDENT" && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
                <span className="font-mono">{user.uniqueId}</span>
              </>
            )}
          </div>

          {user.department && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-[#8B92A5]">{user.department}</p>
          )}
          {user.yearLevel && user.role === "STUDENT" && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-[#8B92A5]">{user.yearLevel}</p>
          )}

          {/* Divider */}
          <hr className="my-3 border-slate-100 dark:border-white/5" />

          {/* Contact info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#8B92A5]">
              <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#8B92A5]">
                <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.bio && (
              <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#8B92A5]">
                <BookOpen className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{user.bio}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="my-3 border-slate-100 dark:border-white/5" />

          {/* View Full Profile */}
          <Link
            href={`/${instituteCode}/users/${user.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
            style={{ color: theme.colors.primary }}
            onClick={onClose}
          >
            View Full Profile
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>,
    document.body
  );
}
