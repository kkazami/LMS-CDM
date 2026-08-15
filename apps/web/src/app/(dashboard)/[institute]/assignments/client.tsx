"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  BookOpenCheck,
  ClipboardCheck,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

// ─── Interfaces ───

interface TodoItem {
  id: string;
  title: string;
  type: "ASSIGNMENT" | "QUIZ" | string;
  dueDate: string | null;
  createdAt: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  courseSection: string;
  instructorName: string | null;
}

interface EnrolledCourse {
  id: string;
  title: string;
  code: string;
}

interface TodoClientProps {
  items: {
    noDueDate: TodoItem[];
    thisWeek: TodoItem[];
    nextWeek: TodoItem[];
    later: TodoItem[];
    done: TodoItem[];
  };
  enrolledCourses: EnrolledCourse[];
  instituteCode: string;
  theme: InstituteTheme;
  /** ISO string of the server's current timestamp, used for overdue calculations. */
  serverNow: string;
}

// ─── Helpers ───

function formatPostedDate(isoString: string): string {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return `Posted ${date.toLocaleDateString("en-US", options)}`;
}

function formatDueDate(isoString: string): string {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `Due ${date.toLocaleDateString("en-US", options)}`;
}

/**
 * Determines badge color based on due date relative to server timestamp.
 * Returns "red" if overdue, "amber" if due this week, otherwise "default".
 */
function getDueBadgeVariant(
  dueDateIso: string,
  serverNow: string
): "red" | "amber" | "default" {
  const dueDate = new Date(dueDateIso).getTime();
  const now = new Date(serverNow).getTime();

  if (dueDate < now) return "red";

  // Check if due within the next 7 days
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  if (dueDate - now < oneWeekMs) return "amber";

  return "default";
}

/**
 * Generates a soft tint background and text color from a hex primary color.
 * E.g. #2563EB → bg with 15% opacity, text at full opacity.
 */
function getIconColors(primaryHex: string): { bg: string; text: string } {
  return {
    bg: `${primaryHex}1A`, // ~10% opacity
    text: primaryHex,
  };
}

// ─── Section Component ───

interface SectionProps {
  id: string;
  label: string;
  items: TodoItem[];
  theme: InstituteTheme;
  instituteCode: string;
  serverNow: string;
  defaultOpen: boolean;
}

function TodoSection({
  id,
  label,
  items,
  theme,
  instituteCode,
  serverNow,
  defaultOpen,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const iconColors = getIconColors(theme.colors.primary);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div id={id} className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-4 sm:p-5 shadow-xs mb-3">
      {/* Section Header */}
      <div
        id={`${id}-header`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">{label}</h2>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${theme.colors.primary}1A`,
              color: theme.colors.primary,
            }}
          >
            {items.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-[#F0F2F8] transition-colors" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-[#F0F2F8] transition-colors" />
        )}
      </div>

      {/* Section Content — animated expand/collapse */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isOpen ? `${items.length * 120 + 20}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="pt-3 space-y-1.5">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-[#555C72] py-2">
              No items in this section.
            </p>
          ) : (
            items.map((item) => {
              const isAssignment = item.type === "ASSIGNMENT";
              const IconComponent = isAssignment ? ClipboardList : BookOpenCheck;

              const dueBadgeVariant = item.dueDate
                ? getDueBadgeVariant(item.dueDate, serverNow)
                : null;

              const dueBadgeBg =
                id === "section-done"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : dueBadgeVariant === "red"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    : dueBadgeVariant === "amber"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]";

              return (
                <Link
                  key={item.id}
                  id={`todo-item-${item.id}`}
                  href={`/${instituteCode}/courses/${item.courseId}/classwork/${item.id}`}
                  className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group/item border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                >
                  {/* Icon avatar */}
                  <div
                    className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0"
                    style={{
                      backgroundColor: iconColors.bg,
                      color: iconColors.text,
                    }}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate group-hover/item:text-[#F97316] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5] truncate mt-0.5">
                      {item.courseCode}
                      {item.courseSection ? ` • ${item.courseSection}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-[#555C72] mt-0.5">
                      {formatPostedDate(item.createdAt)}
                    </p>
                  </div>

                  {/* Due date / Status badge */}
                  {id === "section-done" ? (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${dueBadgeBg}`}>
                      Submitted
                    </span>
                  ) : item.dueDate ? (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${dueBadgeBg}`}
                    >
                      {formatDueDate(item.dueDate)}
                    </span>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function TodoClient({
  items,
  enrolledCourses,
  instituteCode,
  theme,
  serverNow,
}: TodoClientProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  // Filter items by selected course
  const filteredItems = useMemo(() => {
    if (selectedCourseId === "all") return items;

    const filterBucket = (bucket: TodoItem[]): TodoItem[] =>
      bucket.filter((item) => item.courseId === selectedCourseId);

    return {
      noDueDate: filterBucket(items.noDueDate),
      thisWeek: filterBucket(items.thisWeek),
      nextWeek: filterBucket(items.nextWeek),
      later: filterBucket(items.later),
      done: filterBucket(items.done),
    };
  }, [items, selectedCourseId]);

  const totalFiltered =
    filteredItems.noDueDate.length +
    filteredItems.thisWeek.length +
    filteredItems.nextWeek.length +
    filteredItems.later.length +
    filteredItems.done.length;

  const sections: { id: string; label: string; items: TodoItem[] }[] = [
    { id: "section-no-due-date", label: "No due date", items: filteredItems.noDueDate },
    { id: "section-this-week", label: "This week", items: filteredItems.thisWeek },
    { id: "section-next-week", label: "Next week", items: filteredItems.nextWeek },
    { id: "section-later", label: "Later", items: filteredItems.later },
    { id: "section-done", label: "Completed", items: filteredItems.done },
  ];

  return (
    <div className="max-w-4xl mx-auto page-enter space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">To-do</h1>
        <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
          Assignments and quizzes across your enrolled courses
        </p>
      </div>

      {/* Filter Bar */}
      <div>
        <select
          id="todo-course-filter"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full sm:w-auto min-w-[220px] px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-slate-800 dark:text-[#F0F2F8] cursor-pointer shadow-xs outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316]"
        >
          <option value="all">All classes</option>
          {enrolledCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Empty State */}
      {totalFiltered === 0 ? (
        <div
          id="todo-empty-state"
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-8 shadow-xs text-center"
        >
          <ClipboardCheck className="h-16 w-16 text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-[#F0F2F8] mb-1">
            You&apos;re all caught up!
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5]">
            No assignments or quizzes are pending.
          </p>
        </div>
      ) : (
        /* Deadline Sections */
        <div className="space-y-4">
          {sections.map((section) => (
            <TodoSection
              key={section.id}
              id={section.id}
              label={section.label}
              items={section.items}
              theme={theme}
              instituteCode={instituteCode}
              serverNow={serverNow}
              defaultOpen={section.items.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
