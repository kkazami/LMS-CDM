"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  ListTodo,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  BarChart2,
  PlusSquare,
  Users,
  FileText,
  ShieldCheck,
  HardDrive,
  Library,
  Archive,
  FlaskConical,
  Code2,
  Terminal,
  ChevronDown,
  ChevronRight,
  PenTool,
  Settings,
  HelpCircle,
  MessageSquareQuote,
  NotebookPen,
  Video,
  X,
  LifeBuoy,
  Gamepad2,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";
import type { InstituteTheme } from "@/lib/theme";
import { getNavigationPath } from "@/lib/navigation-path";


import type { ComponentType } from "react";

interface NavLink {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface EnrolledCourseSummary {
  id: string;
  title: string;
  code: string;
}

interface SidebarProps {
  instituteCode: string;
  theme: InstituteTheme;
  userRole: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  /** When true, renders the "Interactive Labs" nav entry. Must be completely absent from DOM when false. */
  isEligibleForActivities?: boolean;
  /** When true, renders the "Knowledge Exchange" nav entry. Must be completely absent from DOM when false. */
  isEligibleForKnowledgeExchange?: boolean;
  /** When true, renders the "Quiz Arena" nav entry for IBE. */
  isEligibleForArena?: boolean;
  /** When true, renders the "Practicum" nav entry (ITE students and instructors only). */
  isEligibleForPracticum?: boolean;
  /** When true, renders the "Meetings" nav entry (ITE students and instructors only). */
  isEligibleForMeetings?: boolean;
  /** Enrolled courses for the student to render under the "My Courses" accordion. */
  enrolledCourses?: EnrolledCourseSummary[];
}

/** Sidebar link ID for "My Courses" — used to detect the accordion item. */
const MY_COURSES_KEY = "my-courses";

export const getStudentLinks = (code: string): (NavLink & { key?: string })[] => [
  { label: "Dashboard", href: `/${code}/students`, icon: LayoutDashboard },
  { label: "My Courses", href: `/${code}/courses`, icon: BookOpen, key: MY_COURSES_KEY },
  { label: "Learning Materials", href: `/${code}/learning-materials`, icon: Library },
  { label: "Announcements", href: `/${code}/announcements`, icon: Megaphone },
  { label: "Grades", href: `/${code}/grades`, icon: GraduationCap },
  { label: "Tasks", href: `/${code}/tasks`, icon: ListTodo },
  { label: "Flashcards", href: `/${code}/flashcards`, icon: FlashcardIcon },
  { label: "Leaderboards", href: `/${code}/leaderboards`, icon: Trophy },
];

/**
 * Shared ITE student navigation destinations for Sidebar and FocusFloatingBar.
 */
export function getIteStudentNavLinks(
  code: string,
  options?: { isEligibleForPracticum?: boolean; isEligibleForMeetings?: boolean }
): NavLink[] {
  const base = getStudentLinks(code).map(({ key, ...item }) => item);
  const includeMeetings = options?.isEligibleForMeetings ?? (code.toLowerCase() === "ite");
  const includePracticum = options?.isEligibleForPracticum ?? true;
  const list = [...base];
  if (includeMeetings) {
    list.push({ label: "Meetings", href: `/${code}/meetings`, icon: Video });
  }
  if (includePracticum) {
    list.push({ label: "Practicum", href: `/${code}/practicum`, icon: NotebookPen });
  }
  return list;
}

const getProfessorLinks = (code: string): (NavLink & { key?: string })[] => [
  { label: "Dashboard", href: `/${code}/teachers`, icon: LayoutDashboard },
  { label: "My Classes", href: `/${code}/courses`, icon: BookOpen, key: MY_COURSES_KEY },
  { label: "Gradebooks", href: `/${code}/gradebooks`, icon: FileSpreadsheet },
  { label: "Archived Classes", href: `/${code}/courses/archived`, icon: Archive },
  ...(code === "ics" ? [{ label: "Organizational Chart", href: `/${code}/organization`, icon: Network }] : []),

  { label: "Student Analytics", href: `/${code}/analytics`, icon: BarChart2 },
  { label: "Manage Leaderboard", href: `/${code}/manage-leaderboard`, icon: Trophy },
];

const getAdminLinks = (code: string): NavLink[] => [
  { label: "Dashboard", href: `/${code}/admin`, icon: LayoutDashboard },
  { label: "Course Management", href: `/${code}/admin/courses`, icon: Library },
  { label: "Account Management", href: `/${code}/accounts`, icon: Users },
  ...(code === "ics" ? [{ label: "Faculty & Program Heads", href: `/${code}/admin/faculty`, icon: Network }] : []),
  { label: "Audit Logs", href: `/${code}/logs`, icon: FileText },
  { label: "Security Tools", href: `/${code}/security`, icon: ShieldCheck },
  { label: "Database Management", href: `/${code}/admin/database`, icon: HardDrive },
  { label: "Support Tickets", href: `/${code}/admin/support-tickets`, icon: LifeBuoy },
  { label: "Settings", href: `/${code}/settings`, icon: Settings },
  { label: "Help", href: `/${code}/help`, icon: HelpCircle },
];

function getLinks(instituteCode: string, role: string): (NavLink & { key?: string })[] {
  const r = role.toUpperCase();
  if (r === "PROFESSOR" || r === "TEACHER") return getProfessorLinks(instituteCode);
  if (r === "ADMIN") return getAdminLinks(instituteCode);
  return getStudentLinks(instituteCode);
}

export default function Sidebar({
  instituteCode,
  theme,
  userRole,
  isCollapsed,
  onToggleCollapse,
  isMobileDrawer = false,
  onCloseMobileDrawer,
  isEligibleForActivities,
  isEligibleForKnowledgeExchange,
  isEligibleForArena,
  isEligibleForPracticum,
  isEligibleForMeetings,
  enrolledCourses,
}: SidebarProps) {
  const pathname = getNavigationPath(usePathname(), instituteCode);
  const [isMyCoursesOpen, setIsMyCoursesOpen] = useState(false);

  const isStudent = userRole.toUpperCase() === "STUDENT";
  const isProfessor = userRole.toUpperCase() === "PROFESSOR" || userRole.toUpperCase() === "TEACHER";

  // Build link list identically on both server and client (avoids hydration mismatch)
  let links = getLinks(instituteCode, userRole);

  if (isEligibleForActivities) {
    if (isProfessor) {
      links = [
        ...links,
        { label: "CodeLab", href: `/${instituteCode}/activities/codelab`, icon: Code2 },
        { label: "CodeLab Analytics", href: `/${instituteCode}/activities/codelab/instructor`, icon: Terminal },
      ];
    } else if (isStudent) {
      links = [
        ...links,
        { label: "CodeLab", href: `/${instituteCode}/activities/codelab`, icon: Code2 },
      ];
    }
  }

  const meetingsEligible =
    (isEligibleForMeetings ?? (instituteCode.toLowerCase() === "ite")) && (isStudent || isProfessor);
  if (meetingsEligible) {
    links = [...links, { label: "Meetings", href: `/${instituteCode}/meetings`, icon: Video }];
  }

  if (isEligibleForPracticum && (isStudent || isProfessor)) {
    links = [...links, { label: "Practicum", href: `/${instituteCode}/practicum`, icon: NotebookPen }];
  }

  if (isEligibleForKnowledgeExchange) {
    links = [
      ...links,
      {
        label: "Knowledge Exchange",
        href: `/${instituteCode}/knowledge-exchange`,
        icon: MessageSquareQuote,
      },
    ];
  }

  if ((isEligibleForArena || instituteCode.toLowerCase() === "ibe") && (isStudent || isProfessor)) {
    links = [
      ...links,
      {
        label: "Quiz Arena",
        href: `/${instituteCode}/arena`,
        icon: Gamepad2,
      },
    ];
  }

  if (isStudent && instituteCode.toLowerCase() === "ibe") {
    links = [
      ...links,
      {
        label: "Financial Statement Generator",
        href: `/${instituteCode}/financial-statements`,
        icon: FileSpreadsheet,
      },
    ];
  }


  // Find the active link by getting the longest href that matches the current pathname
  const activeLink = [...links]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (link) => pathname === link.href || pathname.startsWith(link.href + "/")
    );

  const handleMyCoursesToggle = () => {
    setIsMyCoursesOpen((prev) => !prev);
  };

  const handleMyCoursesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMyCoursesToggle();
    }
  };

  const handleLinkClick = () => {
    if (isMobileDrawer && onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  return (
    <aside
      className={`dashboard-sidebar ${
        isMobileDrawer
          ? "flex h-full w-full shrink-0 border-r flex-col overflow-y-auto bg-white dark:bg-[#12151E] border-slate-200/80 dark:border-white/5 shadow-2xl"
          : `hidden h-screen border-r flex-col lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:z-30 lg:flex transition-all duration-300 ease-in-out overflow-hidden bg-white dark:bg-[#12151E] border-slate-200/80 dark:border-white/5 shadow-xs ${
              isCollapsed ? "w-18" : "w-72"
            }`
      }`}
    >
      {/* Header with logo + collapse toggle */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-200/80 dark:border-white/5 bg-transparent px-4 gap-2">
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${
            !isMobileDrawer && isCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Link
            href={`/${instituteCode}`}
            onClick={handleLinkClick}
            className="flex items-center gap-2 group"
          >
            <Image src="/images/cdm-logo.png" alt="" width={30} height={30} className="shrink-0" />
            <span
              className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] tracking-tight whitespace-nowrap transition-colors"
            >
              CdM LMS
            </span>
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0 bg-(--brand-gold)"
            />
          </Link>
        </div>

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B92A5] dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B92A5] dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>

      {/* Scrollable Nav */}
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {links.map((item) => {
          const Icon = item.icon;
          const active = activeLink?.href === item.href;
          const itemKey = "key" in item ? item.key : undefined;

          // Render "My Courses" as an accordion for students and professors
          if ((isStudent || isProfessor) && itemKey === MY_COURSES_KEY) {
            const isSubActive =
              (pathname === `/${instituteCode}/courses` ||
                pathname.startsWith(`/${instituteCode}/courses/`)) &&
              !pathname.startsWith(`/${instituteCode}/courses/archived`);

            return (
              <div key={item.href} id="sidebar-my-courses-accordion">
                {/* Accordion header */}
                <div
                  role="button"
                  tabIndex={0}
                  id="sidebar-my-courses-toggle"
                  aria-expanded={isMyCoursesOpen}
                  onClick={handleMyCoursesToggle}
                  onKeyDown={handleMyCoursesKeyDown}
                  className={`group flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all cursor-pointer select-none ${
                    isSubActive && !isMyCoursesOpen
                      ? "border-l-[3px] font-semibold rounded-r-xl rounded-l-none"
                      : "border-l-[3px] border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] rounded-xl"
                  }`}
                  style={
                    isSubActive && !isMyCoursesOpen
                      ? {
                          borderColor: theme.colors.primary,
                          backgroundColor: `${theme.colors.primary}1A`,
                          color: "var(--institute-ink)",
                        }
                      : undefined
                  }
                >
                  <Icon className="h-5 w-5 shrink-0 group-hover:scale-105 transition-transform duration-150" />
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 flex-1 min-w-0 ${
                      isCollapsed ? "w-0 opacity-0" : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                  {!isCollapsed && (
                    <span className="shrink-0">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 text-slate-400 dark:text-[#555C72] ${
                          isMyCoursesOpen ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                    </span>
                  )}
                </div>

                {/* Accordion content */}
                {!isCollapsed && (
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isMyCoursesOpen ? `${((enrolledCourses?.length ?? 0) + 2) * 44}px` : "0px",
                      opacity: isMyCoursesOpen ? 1 : 0,
                    }}
                  >
                    <div className="flex flex-col gap-0.5 mt-1">
                      {/* To-do sub-link (Students only) */}
                      {isStudent && (
                        <Link
                          id="sidebar-my-courses-todo"
                          href={`/${instituteCode}/assignments`}
                          onClick={handleLinkClick}
                          className={`flex items-center gap-2 rounded-xl pl-8 pr-3 py-2 text-xs font-medium transition-colors ${
                            pathname === `/${instituteCode}/assignments` ||
                            pathname.startsWith(`/${instituteCode}/assignments/`)
                              ? "font-semibold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/5 dark:hover:text-[#F0F2F8]"
                          }`}
                          style={
                            pathname === `/${instituteCode}/assignments` ||
                            pathname.startsWith(`/${instituteCode}/assignments/`)
                              ? {
                                  backgroundColor: `${theme.colors.primary}1A`,
                                  color: "var(--institute-ink)",
                                }
                              : undefined
                          }
                        >
                          <ClipboardCheck className="h-4 w-4 shrink-0" />
                          <span className="truncate">To-do</span>
                        </Link>
                      )}

                      {/* Enrolled course sub-links */}
                      {enrolledCourses?.map((course) => {
                        const courseHref = `/${instituteCode}/courses/${course.id}`;
                        const isCourseActive =
                          pathname === courseHref || pathname.startsWith(courseHref + "/");

                        return (
                          <Link
                            key={course.id}
                            id={`sidebar-course-${course.id}`}
                            href={courseHref}
                            onClick={handleLinkClick}
                            className={`flex items-center gap-2 rounded-xl pl-8 pr-3 py-2 text-xs font-medium transition-colors ${
                              isCourseActive
                                ? "font-semibold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/5 dark:hover:text-[#F0F2F8]"
                            }`}
                            style={
                              isCourseActive
                                ? {
                                    backgroundColor: `${theme.colors.primary}1A`,
                                    color: "var(--institute-ink)",
                                  }
                                : undefined
                            }
                          >
                            <BookOpen className="h-4 w-4 shrink-0" />
                            <span className="truncate">{course.code}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Regular flat nav link
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              aria-current={active ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "border-l-[3px] font-semibold rounded-r-xl rounded-l-none"
                  : "border-l-[3px] border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] rounded-xl"
              }`}
              style={
                active
                  ? {
                      borderColor: theme.colors.primary,
                      backgroundColor: `${theme.colors.primary}1A`,
                      color: "var(--institute-ink)",
                    }
                  : undefined
              }
            >
              <Icon className="h-5 w-5 shrink-0 group-hover:scale-105 transition-transform duration-150" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0" : "opacity-100"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
