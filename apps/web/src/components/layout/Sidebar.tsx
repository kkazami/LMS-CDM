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
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
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
  { label: "Leaderboards", href: `/${code}/leaderboards`, icon: Trophy },
];

const getProfessorLinks = (code: string): (NavLink & { key?: string })[] => [
  { label: "Dashboard", href: `/${code}/teachers`, icon: LayoutDashboard },
  { label: "My Classes", href: `/${code}/courses`, icon: BookOpen, key: MY_COURSES_KEY },
  { label: "Archived Classes", href: `/${code}/courses/archived`, icon: Archive },
  { label: "Learning Materials", href: `/${code}/learning-materials`, icon: BookOpen },
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

  // Build the link list, then conditionally append Interactive Labs if eligible.
  // The entry is NOT rendered at all (absent from DOM) for ineligible users.
  const baseLinks = getLinks(instituteCode, userRole);
  const links = isEligibleForActivities
    ? [...baseLinks, { label: "Interactive Labs", href: `/${instituteCode}/activities`, icon: FlaskConical }]
    : baseLinks;

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
      className={`hidden h-screen shrink-0 border-r flex-col lg:sticky lg:top-0 lg:self-start lg:flex transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "w-[72px]" : "w-72"}`}
      style={{ backgroundColor: theme.colors.sidebar, borderColor: theme.colors.sidebarMuted }}
    >
      {/* Header with logo + collapse toggle always visible */}
      <div
        className="flex items-center h-16 shrink-0 border-b px-3 gap-2"
        style={{ borderColor: theme.colors.sidebarMuted }}
      >
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${
            isCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Link href={`/${instituteCode}`} className="flex items-center gap-2">
            <span className="text-xl font-semibold text-white whitespace-nowrap hover:text-gray-200 transition-colors">Lumina LMS</span>
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: theme.colors.primary }}
            />
          </Link>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
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
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none"
                  style={{
                    backgroundColor: isSubActive && !isMyCoursesOpen ? theme.colors.sidebarMuted : "transparent",
                    color: isSubActive ? theme.colors.primary : "#E5E7EB",
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
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
                        className={`h-4 w-4 transition-transform duration-200 ${
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
                      maxHeight: isMyCoursesOpen ? `${((enrolledCourses?.length ?? 0) + 2) * 40}px` : "0px",
                      opacity: isMyCoursesOpen ? 1 : 0,
                    }}
                  >
                    <div className="flex flex-col gap-0.5 mt-1">
                      {/* To-do sub-link (Students only) */}
                      {isStudent && (
                        <Link
                          id="sidebar-my-courses-todo"
                          href={`/${instituteCode}/assignments`}
                          className="flex items-center gap-2.5 rounded-md pl-8 pr-3 py-2 text-xs font-medium transition-colors"
                          style={{
                            backgroundColor:
                              pathname === `/${instituteCode}/assignments` ||
                              pathname.startsWith(`/${instituteCode}/assignments/`)
                                ? theme.colors.sidebarMuted
                                : "transparent",
                            color:
                              pathname === `/${instituteCode}/assignments` ||
                              pathname.startsWith(`/${instituteCode}/assignments/`)
                                ? theme.colors.primary
                                : "#D1D5DB",
                          }}
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
                            className="flex items-center gap-2.5 rounded-md pl-8 pr-3 py-2 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: isCourseActive
                                ? theme.colors.sidebarMuted
                                : "transparent",
                              color: isCourseActive ? theme.colors.primary : "#D1D5DB",
                            }}
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
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? theme.colors.sidebarMuted : "transparent",
                color: active ? theme.colors.primary : "#E5E7EB",
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
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