"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, Settings, User, Shield, HelpCircle, LogOut } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

type TopbarProps = {
  theme: InstituteTheme;
  instituteName: string;
  userName: string;
  userRole: string;
  instituteCode: string;
  notificationCount?: number;
  onOpenMobileMenu?: () => void;
};

export default function Topbar({
  theme,
  instituteName,
  userName,
  userRole,
  instituteCode,
  notificationCount = 3,
  onOpenMobileMenu,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      router.push(`/login?institute=${instituteCode}`);
      router.refresh();
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
    assignments: "Assignments",
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
    logs: "Logs",
    backup: "Backup & Recovery",
    security: "Security Tools",
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
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-md border border-gray-200 p-2 text-gray-700 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {instituteName}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-[#2C2727]">
              {dynamicTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden w-full max-w-xl items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              placeholder="Search courses, notes, or peers..."
              onFocus={(e) => {
                e.currentTarget.parentElement!.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
                e.currentTarget.parentElement!.style.borderColor = theme.colors.ring;
              }}
              onBlur={(e) => {
                e.currentTarget.parentElement!.style.boxShadow = "none";
                e.currentTarget.parentElement!.style.borderColor = "#E5E7EB";
              }}
            />
          </div>

          <Link
            href={`/${instituteCode}/settings`}
            className="relative rounded-md border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>

          <button
            className="relative rounded-md border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 ? (
              <span
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {notificationCount}
              </span>
            ) : null}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-[#2C2727]">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</p>
              </div>
              <div
                className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Link
                  href={`/${instituteCode}/profile`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="mr-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  Profile
                </Link>
                <Link
                  href={`/${instituteCode}/privacy`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Shield className="mr-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  Privacy
                </Link>
                <Link
                  href={`/${instituteCode}/help`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <HelpCircle className="mr-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  Help
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="mr-3 h-4 w-4 text-red-500" aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}