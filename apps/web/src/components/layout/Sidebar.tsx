"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
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
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

type NavLink = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type SidebarProps = {
  instituteCode: string;
  theme: InstituteTheme;
  userRole: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

const getStudentLinks = (code: string): NavLink[] => [
  { label: "Dashboard", href: `/${code}/students`, icon: LayoutDashboard },
  { label: "My Courses", href: `/${code}/courses`, icon: BookOpen },
  { label: "Announcements", href: `/${code}/announcements`, icon: Megaphone },
  { label: "Assignments", href: `/${code}/assignments`, icon: ClipboardList },
  { label: "Tasks", href: `/${code}/tasks`, icon: ListTodo },
  { label: "Leaderboards", href: `/${code}/leaderboards`, icon: Trophy },
];

const getProfessorLinks = (code: string): NavLink[] => [
  { label: "Dashboard", href: `/${code}/teachers`, icon: LayoutDashboard },
  { label: "My Classes", href: `/${code}/classes`, icon: GraduationCap },
  { label: "Student Analytics", href: `/${code}/analytics`, icon: BarChart2 },
  { label: "Create Tasks", href: `/${code}/create-tasks`, icon: PlusSquare },
  { label: "Manage Leaderboard", href: `/${code}/manage-leaderboard`, icon: Trophy },
];

const getAdminLinks = (code: string): NavLink[] => [
  { label: "Dashboard", href: `/${code}/admin`, icon: LayoutDashboard },
  { label: "Account Management", href: `/${code}/accounts`, icon: Users },
  { label: "Logs", href: `/${code}/logs`, icon: FileText },
  { label: "Backup & Recovery", href: `/${code}/backup`, icon: HardDrive },
  { label: "Security Tools", href: `/${code}/security`, icon: ShieldCheck },
];

function getLinks(instituteCode: string, role: string): NavLink[] {
  const r = role.toUpperCase();
  if (r === "PROFESSOR" || r === "TEACHER") return getProfessorLinks(instituteCode);
  if (r === "ADMIN") return getAdminLinks(instituteCode);
  return getStudentLinks(instituteCode);
}

export default function Sidebar({ instituteCode, theme, userRole, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const links = getLinks(instituteCode, userRole);

  return (
    <aside
      className={`hidden h-screen shrink-0 border-r flex-col lg:flex transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "w-[72px]" : "w-72"}`}
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
          <span className="text-xl font-semibold text-white whitespace-nowrap">Lumina LMS</span>
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: theme.colors.primary }}
          />
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
          const active =
            pathname === item.href ||
            (item.href !== `/${instituteCode}` && pathname.startsWith(item.href));

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