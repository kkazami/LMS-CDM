"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
  HardDrive,
  ShieldCheck,
  Library,
  Archive,
  FlaskConical,
  Code2,
  Terminal,
  ChevronDown,
  ChevronRight,
  PenTool,
  Settings,
  type LucideIcon,
} from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";
import type { InstituteTheme } from "@/lib/theme";

import type { ElementType } from "react";

interface NavLink {
  label: string;
  href: string;
  icon: ElementType;
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
  /** When true, renders the "Interactive Labs" nav entry. Must be completely absent from DOM when false. */
  isEligibleForActivities?: boolean;
  /** Enrolled courses for the student to render under the "My Courses" accordion. */
  enrolledCourses?: EnrolledCourseSummary[];
}

/** Sidebar link ID for "My Courses" — used to detect the accordion item. */
const MY_COURSES_KEY = "my-courses";

const getStudentLinks = (code: string): (NavLink & { key?: string })[] => [
  { label: "Dashboard", href: `/${code}/students`, icon: LayoutDashboard },
  { label: "My Courses", href: `/${code}/courses`, icon: BookOpen, key: MY_COURSES_KEY },
  { label: "Learning Materials", href: `/${code}/learning-materials`, icon: BookOpen },
  { label: "Announcements", href: `/${code}/announcements`, icon: Megaphone },
  { label: "Grades", href: `/${code}/grades`, icon: GraduationCap },
  { label: "Tasks", href: `/${code}/tasks`, icon: ListTodo },
  { label: "Flashcards", href: `/${code}/flashcards`, icon: FlashcardIcon },
  { label: "Leaderboards", href: `/${code}/leaderboards`, icon: Trophy },
];

const getProfessorLinks = (code: string): (NavLink & { key?: string })[] => [
  { label: "Dashboard", href: `/${code}/teachers`, icon: LayoutDashboard },
  { label: "My Classes", href: `/${code}/courses`, icon: BookOpen, key: MY_COURSES_KEY },
  { label: "Archived Classes", href: `/${code}/courses/archived`, icon: Archive },

  { label: "Student Analytics", href: `/${code}/analytics`, icon: BarChart2 },
  { label: "Manage Leaderboard", href: `/${code}/manage-leaderboard`, icon: Trophy },
];

const getAdminLinks = (code: string): NavLink[] => [
  { label: "Dashboard", href: `/${code}/admin`, icon: LayoutDashboard },
  { label: "Course Management", href: `/${code}/admin/courses`, icon: Library },
  { label: "Account Management", href: `/${code}/accounts`, icon: Users },
  { label: "Permissions", href: `/${code}/accounts/permissions`, icon: ShieldCheck },
  { label: "Audit Logs", href: `/${code}/logs`, icon: FileText },
  { label: "Backup & Recovery", href: `/${code}/backup`, icon: HardDrive },
  { label: "Security Tools", href: `/${code}/security`, icon: ShieldCheck },
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
  isEligibleForActivities,
  enrolledCourses,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMyCoursesOpen, setIsMyCoursesOpen] = useState(false);

  const isStudent = userRole.toUpperCase() === "STUDENT";
  const isProfessor = userRole.toUpperCase() === "PROFESSOR" || userRole.toUpperCase() === "TEACHER";

  // Build the link list, then conditionally append CodeLab if eligible.
  const baseLinks = getLinks(instituteCode, userRole);
  let links = baseLinks;

  if (isEligibleForActivities) {
    if (isProfessor) {
      links = [
        ...baseLinks,
        { label: "CodeLab", href: `/${instituteCode}/activities/codelab`, icon: Code2 },
        { label: "CodeLab Analytics", href: `/${instituteCode}/activities/codelab/instructor`, icon: Terminal },
      ];
    } else {
      links = [
        ...baseLinks,
        { label: "CodeLab", href: `/${instituteCode}/activities/codelab`, icon: Code2 },
      ];
    }
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

  return (
    <aside
      className={`hidden h-screen shrink-0 border-r flex-col lg:sticky lg:top-0 lg:self-start lg:flex transition-all duration-300 ease-in-out overflow-hidden bg-white dark:bg-[#12151E] border-slate-200/80 dark:border-white/5 shadow-xs ${
        isCollapsed ? "w-[72px]" : "w-72"
      }`}
    >
      {/* Header with logo + collapse toggle */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-200/80 dark:border-white/5 bg-transparent px-4 gap-2">
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${
            isCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Link href={`/${instituteCode}`} className="flex items-center gap-2 group">
            <span className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] tracking-tight whitespace-nowrap group-hover:text-[#F97316] transition-colors">
              Lumina LMS
            </span>
            <span
              className="h-2 w-2 rounded-full shrink-0 animate-pulse bg-[#F97316]"
            />
          </Link>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B92A5] dark:hover:bg-white/[0.05] dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        )}
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
                      ? "border-l-[3px] border-[#F97316] bg-orange-500/10 text-[#F97316] font-semibold rounded-r-xl rounded-l-none"
                      : "border-l-[3px] border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/[0.05] dark:hover:text-[#F0F2F8] rounded-xl"
                  }`}
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
                          className={`flex items-center gap-2 rounded-xl pl-8 pr-3 py-2 text-xs font-medium transition-colors ${
                            pathname === `/${instituteCode}/assignments` ||
                            pathname.startsWith(`/${instituteCode}/assignments/`)
                              ? "bg-orange-500/10 text-[#F97316] font-semibold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/[0.05] dark:hover:text-[#F0F2F8]"
                          }`}
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
                            className={`flex items-center gap-2 rounded-xl pl-8 pr-3 py-2 text-xs font-medium transition-colors ${
                              isCourseActive
                                ? "bg-orange-500/10 text-[#F97316] font-semibold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/[0.05] dark:hover:text-[#F0F2F8]"
                            }`}
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
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "border-l-[3px] border-[#F97316] bg-orange-500/10 text-[#F97316] font-semibold rounded-r-xl rounded-l-none"
                  : "border-l-[3px] border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-[#8B92A5] dark:hover:bg-white/[0.05] dark:hover:text-[#F0F2F8] rounded-xl"
              }`}
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