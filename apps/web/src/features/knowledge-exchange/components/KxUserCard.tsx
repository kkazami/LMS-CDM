"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { User, GraduationCap, Award, ShieldAlert } from "lucide-react";
import type { KxAuthorSummary } from "../types";
import { formatRelativeTime } from "../utils";
import UserMiniCard from "@/components/common/UserMiniCard";
import { getInstituteTheme } from "@/lib/get-institute-theme";

interface KxUserCardProps {
  author: KxAuthorSummary;
  createdAt?: string | Date;
  actionLabel?: string; // e.g. "asked", "answered", "commented"
  size?: "sm" | "md";
  instituteCode?: string;
  className?: string;
}

export default function KxUserCard({
  author,
  createdAt,
  actionLabel = "posted",
  size = "md",
  instituteCode: propInstituteCode,
  className = "",
}: KxUserCardProps) {
  const params = useParams();
  const instituteCode = propInstituteCode || (params?.institute as string) || "ics";
  const theme = getInstituteTheme(instituteCode);

  const [miniCardAnchor, setMiniCardAnchor] = useState<DOMRect | null>(null);
  const [miniCardAnchorEl, setMiniCardAnchorEl] = useState<HTMLElement | null>(null);

  const isAnon = Boolean(author.isAnonymous);
  // When an admin is viewing an anonymous post, author.id is populated by serializeAuthor
  const isAdminViewingAnon = isAnon && Boolean(author.id);

  const isInstructor =
    author.role?.toUpperCase() === "PROFESSOR" ||
    author.role?.toUpperCase() === "INSTRUCTOR" ||
    author.role?.toUpperCase() === "TEACHER";
  const isAdmin = author.role?.toUpperCase() === "ADMIN";

  const anonymousLabel = isInstructor
    ? "Anonymous Instructor"
    : "Anonymous Student";

  // When anonymous and not an admin viewer, show masked alias. If admin viewer, show real name.
  const displayName = isAnon && !isAdminViewingAnon ? anonymousLabel : author.name;

  const avatarSizeClasses = size === "sm" ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm";
  const canClick = Boolean(author.id);

  const handleOpenMiniCard = (e: React.MouseEvent<HTMLElement>) => {
    if (!canClick || !author.id) return;
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    setMiniCardAnchor(el.getBoundingClientRect());
    setMiniCardAnchorEl(el);
  };

  return (
    <>
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Avatar Container */}
        {canClick ? (
          <button
            type="button"
            onClick={handleOpenMiniCard}
            title={`View profile for ${displayName}`}
            className={`relative shrink-0 rounded-full flex items-center justify-center font-medium overflow-hidden select-none cursor-pointer hover:ring-2 hover:ring-orange-500/50 hover:opacity-90 transition-all focus:outline-none ${avatarSizeClasses} ${
              isInstructor
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                : isAdmin
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
            }`}
          >
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{displayName ? displayName.charAt(0).toUpperCase() : "U"}</span>
            )}
          </button>
        ) : (
          <div
            className={`relative shrink-0 rounded-full flex items-center justify-center font-medium overflow-hidden select-none ${avatarSizeClasses} ${
              isAnon
                ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                : isInstructor
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                : isAdmin
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
            }`}
          >
            {isAnon ? (
              <User className="h-4 w-4" aria-hidden="true" />
            ) : author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{displayName ? displayName.charAt(0).toUpperCase() : "U"}</span>
            )}
          </div>
        )}

        {/* Author metadata */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {canClick ? (
              <button
                type="button"
                onClick={handleOpenMiniCard}
                className={`font-medium truncate text-left text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:underline transition-colors cursor-pointer ${
                  size === "sm" ? "text-xs" : "text-sm"
                }`}
                title={`View profile for ${displayName}`}
              >
                {displayName}
              </button>
            ) : (
              <span
                className={`font-medium truncate text-slate-800 dark:text-slate-200 ${
                  size === "sm" ? "text-xs" : "text-sm"
                } ${isAnon ? "italic text-slate-500 dark:text-slate-400 select-none" : ""}`}
              >
                {displayName}
              </span>
            )}

            {/* Self identifier indicator */}
            {author.isSelf && isAnon && !isAdminViewingAnon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-medium select-none">
                You (Masked)
              </span>
            )}

            {/* Admin audit indicator for anonymous authors */}
            {isAdminViewingAnon && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium select-none"
                title={`Posted anonymously as ${author.maskedName || anonymousLabel}. Visible to Admin.`}
              >
                <ShieldAlert className="h-3 w-3" />
                <span>Anon ({author.maskedName || anonymousLabel})</span>
              </span>
            )}

            {/* Role badge for instructors / admins */}
            {isInstructor && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-medium">
                <GraduationCap className="h-3 w-3" />
                Instructor
              </span>
            )}

            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                <Award className="h-3 w-3" />
                Admin
              </span>
            )}
          </div>

          {/* Action and date */}
          {createdAt && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {actionLabel} {formatRelativeTime(createdAt)}
            </span>
          )}
        </div>
      </div>

      {/* User Mini Card Popover */}
      {miniCardAnchor && author.id && (
        <UserMiniCard
          userId={author.id}
          instituteCode={instituteCode}
          anchorRect={miniCardAnchor}
          anchorElement={miniCardAnchorEl}
          onClose={() => {
            setMiniCardAnchor(null);
            setMiniCardAnchorEl(null);
          }}
          theme={theme}
        />
      )}
    </>
  );
}
