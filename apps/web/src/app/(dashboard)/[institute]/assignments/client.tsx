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
    <div id={id} className="mb-2">
      {/* Section Header */}
      <div
        id={`${id}-header`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between cursor-pointer select-none border-b border-gray-200 pb-3 mb-0 group"
      >
        <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: theme.colors.primary }}
          >
            {items.length}
          </span>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          )}
        </div>
      </div>

      {/* Section Content — animated expand/collapse */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isOpen ? `${items.length * 100 + 20}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="pt-2">
          {items.map((item, idx) => {
            const isAssignment = item.type === "ASSIGNMENT";
            const IconComponent = isAssignment ? ClipboardList : BookOpenCheck;

            const dueBadgeVariant = item.dueDate
              ? getDueBadgeVariant(item.dueDate, serverNow)
              : null;

            const dueBadgeBg =
              dueBadgeVariant === "red"
                ? "bg-red-50 text-red-600"
                : dueBadgeVariant === "amber"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-gray-100 text-gray-600";

            return (
              <div key={item.id}>
                {idx > 0 && <hr className="border-gray-100" />}
                <Link
                  id={`todo-item-${item.id}`}
                  href={`/${instituteCode}/courses/${item.courseId}/classwork/${item.id}`}
                  className="flex items-center gap-4 py-4 px-4 sm:px-6 rounded-lg hover:bg-gray-50 transition-colors group/item"
                >
                  {/* Icon avatar */}
                  <div
                    className="flex items-center justify-center h-10 w-10 rounded-full shrink-0"
                    style={{
                      backgroundColor: iconColors.bg,
                      color: iconColors.text,
                    }}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.courseCode}
                      {item.courseSection ? ` • ${item.courseSection}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPostedDate(item.createdAt)}
                    </p>
                  </div>

                  {/* Due date badge */}
                  {item.dueDate && (
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${dueBadgeBg}`}
                    >
                      {formatDueDate(item.dueDate)}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
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
    };
  }, [items, selectedCourseId]);

  const totalFiltered =
    filteredItems.noDueDate.length +
    filteredItems.thisWeek.length +
    filteredItems.nextWeek.length +
    filteredItems.later.length;

  const sections: { id: string; label: string; items: TodoItem[] }[] = [
    { id: "section-no-due-date", label: "No due date", items: filteredItems.noDueDate },
    { id: "section-this-week", label: "This week", items: filteredItems.thisWeek },
    { id: "section-next-week", label: "Next week", items: filteredItems.nextWeek },
    { id: "section-later", label: "Later", items: filteredItems.later },
  ];

  return (
    <div className="max-w-4xl mx-auto page-enter">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">To-do</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assignments and quizzes across your enrolled courses
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <select
          id="todo-course-filter"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full sm:w-auto min-w-[200px] px-4 py-2.5 text-sm font-medium bg-white border rounded-full appearance-none cursor-pointer transition-all focus:outline-none focus:ring-2"
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
            // Using ring as a CSS variable for focus state
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.boxShadow = "none";
          }}
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
          className="flex flex-col items-center justify-center py-20"
        >
          <ClipboardCheck className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-1">
            You&apos;re all caught up!
          </h2>
          <p className="text-sm text-gray-400">
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
