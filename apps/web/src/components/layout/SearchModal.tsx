"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  BookOpen,
  ClipboardList,
  Flame,
  Code2,
  Trophy,
  CheckSquare,
  Settings,
  User,
  HelpCircle,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Users,
  Shield,
  ShieldCheck,
  HardDrive,
  FileText,
  Library,
  GraduationCap,
  Megaphone,
  BarChart2,
  Archive,
  Terminal,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  instituteCode: string;
  theme: InstituteTheme;
  userRole?: string;
  enrolledCourses?: { id: string; title: string; code: string }[];
}

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Administration" | "Navigation" | "Courses" | "Activities" | "Tools";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function SearchModal({
  isOpen,
  onClose,
  instituteCode,
  theme,
  userRole,
  enrolledCourses = [],
}: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const role = (userRole || "STUDENT").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER" || role === "INSTRUCTOR";

  // Build searchable items list strictly filtered by the active user role
  const defaultItems: SearchItem[] = [];

  if (isAdmin) {
    defaultItems.push(
      {
        id: "admin-dashboard",
        title: "Admin Dashboard",
        subtitle: "System overview, active sessions, and quick metrics",
        category: "Administration",
        href: `/${instituteCode}/admin`,
        icon: LayoutDashboard,
      },
      {
        id: "admin-courses",
        title: "Course Management",
        subtitle: "Create, configure, and oversee institute courses",
        category: "Administration",
        href: `/${instituteCode}/admin/courses`,
        icon: Library,
      },
      {
        id: "admin-accounts",
        title: "Account Management",
        subtitle: "Manage students, instructors, and administrator accounts",
        category: "Administration",
        href: `/${instituteCode}/accounts`,
        icon: Users,
      },
      {
        id: "admin-permissions",
        title: "Permissions Matrix",
        subtitle: "Role-based access control and privilege assignments",
        category: "Administration",
        href: `/${instituteCode}/accounts/permissions`,
        icon: ShieldCheck,
      },
      {
        id: "admin-logs",
        title: "Audit Logs",
        subtitle: "Security events, admin activities, and system audit trail",
        category: "Administration",
        href: `/${instituteCode}/logs`,
        icon: FileText,
      },
      {
        id: "admin-backup",
        title: "Backup & Recovery",
        subtitle: "Database snapshots, automated backups, and restoration",
        category: "Administration",
        href: `/${instituteCode}/backup`,
        icon: HardDrive,
      },
      {
        id: "admin-security",
        title: "Security Controls",
        subtitle: "Session policies, IP rules, and security enforcement",
        category: "Administration",
        href: `/${instituteCode}/security`,
        icon: Shield,
      },
      {
        id: "admin-settings",
        title: "System Settings",
        subtitle: "Institute branding, preferences, and system config",
        category: "Tools",
        href: `/${instituteCode}/settings`,
        icon: Settings,
      },
      {
        id: "admin-help",
        title: "Help & Documentation",
        subtitle: "Administrator manuals, guides, and technical support",
        category: "Tools",
        href: `/${instituteCode}/help`,
        icon: HelpCircle,
      }
    );
  } else if (isProfessor) {
    defaultItems.push(
      {
        id: "prof-dashboard",
        title: "Teacher Dashboard",
        subtitle: "Class overview, grading queue, and teaching schedule",
        category: "Navigation",
        href: `/${instituteCode}/teachers`,
        icon: LayoutDashboard,
      },
      {
        id: "prof-courses",
        title: "My Classes",
        subtitle: "Active classes, syllabus, and course rosters",
        category: "Courses",
        href: `/${instituteCode}/courses`,
        icon: BookOpen,
      },
      {
        id: "prof-archived",
        title: "Archived Classes",
        subtitle: "Past semester records and archived courses",
        category: "Courses",
        href: `/${instituteCode}/courses/archived`,
        icon: Archive,
      },
      {
        id: "prof-materials",
        title: "Learning Materials",
        subtitle: "Course handouts, reference documents, and notes",
        category: "Navigation",
        href: `/${instituteCode}/learning-materials`,
        icon: BookOpen,
      },
      {
        id: "prof-announcements",
        title: "Announcements",
        subtitle: "Broadcast notices and updates to classes",
        category: "Navigation",
        href: `/${instituteCode}/announcements`,
        icon: Megaphone,
      },
      {
        id: "prof-analytics",
        title: "Student Analytics",
        subtitle: "Performance metrics, completion rates, and learning insights",
        category: "Activities",
        href: `/${instituteCode}/analytics`,
        icon: BarChart2,
      },
      {
        id: "prof-leaderboard",
        title: "Manage Leaderboard",
        subtitle: "Class gamification standings, EXP points, and rewards",
        category: "Activities",
        href: `/${instituteCode}/manage-leaderboard`,
        icon: Trophy,
      },
      {
        id: "prof-codelab",
        title: "CodeLab Analytics",
        subtitle: "Student code submission telemetry and execution metrics",
        category: "Activities",
        href: `/${instituteCode}/activities/codelab/instructor`,
        icon: Terminal,
      },
      {
        id: "prof-settings",
        title: "Account Settings",
        subtitle: "Instructor profile, preferences, and notifications",
        category: "Tools",
        href: `/${instituteCode}/settings`,
        icon: Settings,
      },
      {
        id: "prof-help",
        title: "Help & Support",
        subtitle: "Teaching documentation, FAQs, and contact help",
        category: "Tools",
        href: `/${instituteCode}/help`,
        icon: HelpCircle,
      }
    );
  } else {
    // Student
    defaultItems.push(
      {
        id: "nav-dashboard",
        title: "Student Dashboard",
        subtitle: "Overview, coursework, and upcoming deadlines",
        category: "Navigation",
        href: `/${instituteCode}/students`,
        icon: Sparkles,
      },
      {
        id: "nav-courses",
        title: "My Courses",
        subtitle: "View all enrolled classes and syllabus",
        category: "Courses",
        href: `/${instituteCode}/courses`,
        icon: BookOpen,
      },
      {
        id: "nav-materials",
        title: "Learning Materials",
        subtitle: "Class handouts, lecture notes, and syllabus PDFs",
        category: "Courses",
        href: `/${instituteCode}/learning-materials`,
        icon: BookOpen,
      },
      {
        id: "nav-announcements",
        title: "Announcements",
        subtitle: "Institute notices and course updates",
        category: "Navigation",
        href: `/${instituteCode}/announcements`,
        icon: Megaphone,
      },
      {
        id: "nav-grades",
        title: "Grades & Performance",
        subtitle: "GPA tracker, assignment scores, and feedback",
        category: "Navigation",
        href: `/${instituteCode}/grades`,
        icon: GraduationCap,
      },
      {
        id: "nav-assignments",
        title: "To-do & Assignments",
        subtitle: "Upcoming homework, quizzes, and project deadlines",
        category: "Navigation",
        href: `/${instituteCode}/assignments`,
        icon: ClipboardList,
      },
      {
        id: "nav-flashcards",
        title: "Study Flashcards",
        subtitle: "AI-generated flashcards and active recall decks",
        category: "Activities",
        href: `/${instituteCode}/flashcards`,
        icon: Flame,
      },
      {
        id: "nav-tasks",
        title: "Personal Tasks",
        subtitle: "Kanban board and task tracker",
        category: "Activities",
        href: `/${instituteCode}/tasks`,
        icon: CheckSquare,
      },
      {
        id: "nav-codelab",
        title: "CodeLab Interactive IDE",
        subtitle: "Multi-language online coding exercises",
        category: "Activities",
        href: `/${instituteCode}/activities/codelab`,
        icon: Code2,
      },
      {
        id: "nav-leaderboard",
        title: "Leaderboards & EXP",
        subtitle: "Academic rank and gamification standings",
        category: "Activities",
        href: `/${instituteCode}/leaderboards`,
        icon: Trophy,
      },
      {
        id: "nav-profile",
        title: "Profile & Badges",
        subtitle: "View your student avatar and unlocked achievements",
        category: "Tools",
        href: `/${instituteCode}/profile`,
        icon: User,
      },
      {
        id: "nav-settings",
        title: "Account Settings",
        subtitle: "Preferences, appearance, and notifications",
        category: "Tools",
        href: `/${instituteCode}/settings`,
        icon: Settings,
      },
      {
        id: "nav-help",
        title: "Help & Support",
        subtitle: "Guides, FAQs, and contact support",
        category: "Tools",
        href: `/${instituteCode}/help`,
        icon: HelpCircle,
      }
    );
  }

  const courseItems: SearchItem[] = (!isAdmin && enrolledCourses.length > 0)
    ? enrolledCourses.map((c) => ({
        id: `course-${c.id}`,
        title: c.title,
        subtitle: `Course Code: ${c.code}`,
        category: "Courses",
        href: `/${instituteCode}/courses/${c.id}`,
        icon: BookOpen,
      }))
    : [];

  const allItems = [...defaultItems, ...courseItems];

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase())) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  function handleSelect(href: string) {
    onClose();
    router.push(href);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-xl bg-white dark:bg-[#1A1D27] sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3 sm:py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isAdmin
                ? "Search admin directories, tools, audit..."
                : isProfessor
                ? "Search classes, grading, tools..."
                : "Search courses, assignments, tools..."
            }
            className="flex-1 bg-transparent text-base sm:text-sm font-medium text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400 dark:placeholder:text-[#555C72] outline-none min-h-[44px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {isAdmin
                  ? "Try searching for accounts, logs, courses, or settings."
                  : isProfessor
                  ? "Try searching for classes, grading, or tools."
                  : "Try searching for courses, assignments, or features."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all text-left group cursor-pointer min-h-[48px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${theme.colors.primary}1A`,
                        color: theme.colors.primary,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] group-hover:text-[#F97316] transition-colors truncate">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-[#8B92A5] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                      {item.category}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info on desktop */}
        <div className="hidden sm:flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-[11px] text-slate-400 dark:text-slate-500">
          <span>Navigate with 1-tap</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
