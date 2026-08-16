"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, Filter, Inbox, BookOpen } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { AnnouncementItem, EnrolledCourseOption } from "./page";

interface AnnouncementsClientProps {
  announcements: AnnouncementItem[];
  enrolledCourses: EnrolledCourseOption[];
  theme: InstituteTheme;
  instituteCode: string;
}

// ── Helpers ──

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: then.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function extractTitle(content: string): string {
  // Use the first line or first sentence as a title, capped at 60 chars
  const firstLine = content.split("\n")[0].trim();
  const firstSentence = firstLine.split(/[.!?]/)[0].trim();
  const title = firstSentence || firstLine;
  return title.length > 60 ? title.slice(0, 57) + "…" : title;
}

function truncateBody(content: string, maxLen = 150): { truncated: string; isTruncated: boolean } {
  const cleaned = content.trim();
  if (cleaned.length <= maxLen) return { truncated: cleaned, isTruncated: false };
  return { truncated: cleaned.slice(0, maxLen).trimEnd() + "…", isTruncated: true };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ──

export default function AnnouncementsClient({
  announcements,
  enrolledCourses,
  theme,
  instituteCode: _instituteCode,
}: AnnouncementsClientProps) {
  const { themeMode } = useTheme();
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const isEnrolled = enrolledCourses.length > 0;

  const filteredAnnouncements =
    selectedCourseId === "all"
      ? announcements
      : announcements.filter((a) => a.courseId === selectedCourseId);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Mark as read when expanded
        setReadIds((r) => new Set(r).add(id));
      }
      return next;
    });
  };

  // ── Not enrolled empty state ──
  if (!isEnrolled) {
    return (
      <div className="max-w-4xl mx-auto page-enter">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Announcements</h1>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
            Stay updated with the latest news from your classes
          </p>
        </div>
        <div
          id="announcements-not-enrolled"
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div
            className="flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ backgroundColor: `${theme.colors.primary}1A` }}
          >
            <BookOpen className="w-10 h-10" style={{ color: theme.colors.primary }} />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-[#F0F2F8] mb-2">Not enrolled in any classes</h2>
          <p className="text-sm text-slate-400 dark:text-[#8B92A5] max-w-sm">
            Join a class using a class code to see announcements from your instructors here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto page-enter">
      {/* ── Page Header ── */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Announcements</h1>
        <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
          Stay updated with the latest news from your classes
        </p>
      </div>

      {/* ── Class Filter ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-[#8B92A5]">
          <Filter className="h-4 w-4" />
          <span>Filter by class:</span>
        </div>
        <select
          id="announcements-course-filter"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] px-3 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] focus:outline-none focus:ring-2 transition-shadow"
          style={{ 
            // @ts-expect-error CSS custom property for focus ring
            "--tw-ring-color": `${theme.colors.primary}40`,
          }}
        >
          <option value="all">All Classes ({announcements.length})</option>
          {enrolledCourses.map((c) => {
            const count = announcements.filter((a) => a.courseId === c.id).length;
            return (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* ── No announcements empty state ── */}
      {filteredAnnouncements.length === 0 ? (
        <div
          id="announcements-empty"
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-slate-100 dark:bg-white/5">
            <Inbox className="w-10 h-10 text-slate-400 dark:text-[#8B92A5]" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-[#F0F2F8] mb-2">No announcements yet</h2>
          <p className="text-sm text-slate-400 dark:text-[#8B92A5] max-w-sm">
            {selectedCourseId === "all"
              ? "Your instructors haven't posted any announcements yet. Check back later!"
              : "No announcements for this class yet. Check back later!"}
          </p>
        </div>
      ) : (
        /* ── Announcement Cards ── */
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const isExpanded = expandedIds.has(ann.id);
            const isRead = readIds.has(ann.id);
            const title = extractTitle(ann.content);
            const { truncated, isTruncated } = truncateBody(ann.content);

            return (
              <div
                key={ann.id}
                id={`announcement-${ann.id}`}
                className="rounded-xl border bg-white dark:bg-[#141721] transition-all duration-200 hover:shadow-md dark:hover:shadow-black/40"
                style={{
                  borderColor: isRead
                    ? themeMode === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "#E5E7EB"
                    : `${theme.colors.primary}40`,
                  borderLeftWidth: "4px",
                  borderLeftColor: isRead
                    ? themeMode === "dark"
                      ? "#3D4460"
                      : "#D1D5DB"
                    : theme.colors.primary,
                }}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    {/* Author avatar */}
                    {ann.authorAvatarUrl ? (
                      <img
                        src={ann.authorAvatarUrl}
                        alt={ann.authorName}
                        className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-black/5 dark:ring-white/10"
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold text-white shadow-xs"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {getInitials(ann.authorName)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Title + unread indicator */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate">
                          {title}
                        </h3>
                        {!isRead && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Meta: author, course, time */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-[#8B92A5] flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-[#D1D5DB]">{ann.authorName}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            backgroundColor:
                              themeMode === "dark"
                                ? `${theme.colors.primary}20`
                                : `${theme.colors.primary}14`,
                            color: theme.colors.primary,
                            borderColor: `${theme.colors.primary}30`,
                          }}
                        >
                          {ann.courseCode}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(ann.createdAt)}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="mt-3">
                        <p className="text-sm text-slate-700 dark:text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">
                          {isExpanded ? ann.content : truncated}
                        </p>
                      </div>

                      {/* Read more / Read less */}
                      {isTruncated && (
                        <button
                          onClick={() => toggleExpand(ann.id)}
                          className="mt-2 flex items-center gap-1 text-xs font-semibold transition-colors hover:underline"
                          style={{ color: theme.colors.primary }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" /> Read less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" /> Read more
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
