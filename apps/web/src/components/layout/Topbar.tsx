"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, Settings, User, Shield, HelpCircle, LogOut, Sun, Moon } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import UserAvatar from "@/components/common/UserAvatar";
import NotificationBell from "@/components/layout/NotificationBell";
import { useTheme } from "@/lib/theme-context";

type TopbarProps = {
  theme: InstituteTheme;
  instituteName: string;
  userName: string;
  userRole: string;
  instituteCode: string;
  studentNumber?: string | null;
  avatarUrl?: string | null;
  onOpenMobileMenu?: () => void;
};

export default function Topbar({
  theme,
  instituteName,
  userName,
  userRole,
  instituteCode,
  studentNumber,
  avatarUrl,
  onOpenMobileMenu,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { themeMode, toggleTheme } = useTheme();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = `/login?institute=${instituteCode}`;
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  let dynamicTitle = "Dashboard";
  const segment = pathname.split("/").pop();

  const titleMap: Record<string, string> = {
    // Student
    students: "Student Dashboard",
    courses: "My Courses",
    announcements: "Announcements",
    assignments: "To-do",
    tasks: "Tasks",
    leaderboards: "Leaderboards",
    // Professor
    teachers: "Teacher Dashboard",
    classes: "My Classes",
    analytics: "Student Analytics",
    "create-tasks": "Create Tasks",
    "manage-leaderboard": "Manage Leaderboard",
    // Admin
    admin: "Admin Dashboard",
    accounts: "Account Management",
    permissions: "Permission Matrix",
    logs: "Audit Logs",
    backup: "Backup & Recovery",
    security: "Security Tools",
    // Course Management
    "course-management": "Course Management",
    stream: "Stream",
    classwork: "Classwork",
    people: "People",
    // Activities
    codelab: "CodeLab Problem Bank",
    instructor: "CodeLab Analytics",
    // Shared
    settings: "Settings",
    profile: "Profile",
    privacy: "Privacy Settings",
    "learning-materials": "Learning Materials",
    help: "Help & Support",
  };

  if (segment && titleMap[segment]) {
    dynamicTitle = titleMap[segment];
  }
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-md transition-colors duration-200">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] p-2 text-slate-700 dark:text-slate-300 lg:hidden hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              {instituteName}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8]">
              {dynamicTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2.5 sm:gap-3">
          {/* Search bar */}
          <div className="hidden w-full max-w-md items-center gap-2.5 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-slate-100/80 dark:bg-[#1E2132] px-3.5 py-2 md:flex focus-within:ring-2 focus-within:ring-[#F97316]/20 focus-within:border-[#F97316] transition-all">
            <Search className="h-4 w-4 text-slate-400 dark:text-[#8B92A5]" />
            <input
              className="w-full bg-transparent text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 dark:placeholder:text-[#555C72]"
              placeholder="Search courses, notes, or peers..."
            />
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={themeMode === "dark"}
            className="relative rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95"
            title={`Switch to ${themeMode === "light" ? "Dark" : "Light"} mode`}
          >
            {themeMode === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
            )}
          </button>

          <Link
            href={`/${instituteCode}/settings`}
            className="relative rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>

          <NotificationBell theme={theme} />

          {/* User Profile Avatar with Left Separator */}
          <div className="relative pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/10" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">{userName}</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8B92A5]">
                    {userRole}
                  </p>
                  {userRole === "STUDENT" && studentNumber && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <p className="text-[11px] font-mono text-slate-500 dark:text-[#8B92A5]">{studentNumber}</p>
                    </>
                  )}
                </div>
              </div>
              <UserAvatar
                name={userName}
                avatarUrl={avatarUrl}
                size="md"
                color="#F97316"
              />
            </button>

            <div
              className={`absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#22263A] border border-slate-200 dark:border-[rgba(255,255,255,0.1)] py-1.5 shadow-xl transition-all duration-200 origin-top-right ${
                isDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
              style={{ transformOrigin: "top right" }}
            >
              <Link
                href={`/${instituteCode}/profile`}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
              >
                <User className="mr-3 h-4 w-4 text-slate-400 dark:text-[#8B92A5]" aria-hidden="true" />
                Profile
              </Link>
              <Link
                href={`/${instituteCode}/privacy`}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
              >
                <Shield className="mr-3 h-4 w-4 text-slate-400 dark:text-[#8B92A5]" aria-hidden="true" />
                Privacy
              </Link>
              <Link
                href={`/${instituteCode}/help`}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
              >
                <HelpCircle className="mr-3 h-4 w-4 text-slate-400 dark:text-[#8B92A5]" aria-hidden="true" />
                Help
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors font-semibold cursor-pointer"
              >
                <LogOut className="mr-3 h-4 w-4 text-rose-500" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}