"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, Settings, User, Shield, HelpCircle, LogOut, Sun, Moon, ChevronDown, Check, Building2 } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import UserAvatar from "@/components/common/UserAvatar";
import NotificationBell from "@/components/layout/NotificationBell";
import LevelBadge from "@/components/common/LevelBadge";
import SearchModal from "@/components/layout/SearchModal";
import { useTheme } from "@/lib/theme-context";
import { triggerNativeHaptic, logoutFromNative } from "@/lib/mobile-bridge";

const ALL_INSTITUTES = [
  { code: "ics", name: "Institute of Computer Studies", short: "ICS", color: "#E06A26" },
  { code: "ibe", name: "Institute of Business and Education", short: "IBE", color: "#EAB308" },
  { code: "ite", name: "Institute of Technology and Engineering", short: "ITE", color: "#0284C7" },
];

type TopbarProps = {
  theme: InstituteTheme;
  instituteName: string;
  userName: string;
  userRole: string;
  instituteCode: string;
  studentNumber?: string | null;
  avatarUrl?: string | null;
  exp?: number;
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
  exp = 0,
  onOpenMobileMenu,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInstituteSwitcherOpen, setIsInstituteSwitcherOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const instituteSwitcherRef = useRef<HTMLDivElement>(null);
  const { themeMode, toggleTheme } = useTheme();

  const isAdmin = userRole.toUpperCase() === "ADMIN";

  function handleSwitchInstitute(targetCode: string) {
    setIsInstituteSwitcherOpen(false);
    setIsDropdownOpen(false);
    if (targetCode.toLowerCase() === instituteCode.toLowerCase()) return;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && segments[0].toLowerCase() === instituteCode.toLowerCase()) {
      segments[0] = targetCode.toLowerCase();
      router.push("/" + segments.join("/"));
    } else {
      router.push(`/${targetCode.toLowerCase()}/admin`);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns whenever route changes
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsInstituteSwitcherOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (instituteSwitcherRef.current && !instituteSwitcherRef.current.contains(event.target as Node)) {
        setIsInstituteSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    try {
      triggerNativeHaptic("light");
      logoutFromNative();
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = `/login?institute=${instituteCode}&force=true`;
    } catch (error) {
      console.error("Logout failed", error);
      window.location.href = `/login?institute=${instituteCode}&force=true`;
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] sm:bg-white/95 sm:dark:bg-[#1A1D27]/95 sm:backdrop-blur-md transition-colors duration-200 min-h-[48px] sm:min-h-[56px] flex flex-col justify-center">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-4 lg:px-8 py-1.5 sm:py-3">
        {/* Left Side: Menu + Institute Badge + Dynamic Title */}
        <div className="flex flex-1 min-w-0 items-center gap-1.5 sm:gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-lg sm:rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] p-1 sm:p-2 text-slate-700 dark:text-slate-300 lg:hidden hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center shrink-0 touch-manipulation active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Mobile Institute Badge & Title */}
          <div className="md:hidden flex items-center gap-1.5 min-w-0 flex-1">
            {isAdmin ? (
              <div className="relative" ref={instituteSwitcherRef}>
                <button
                  type="button"
                  onClick={() => setIsInstituteSwitcherOpen((prev) => !prev)}
                  className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shrink-0 shadow-xs flex items-center gap-1 active:scale-95 transition-transform"
                  style={{ backgroundColor: theme.colors.primary }}
                  aria-label="Switch institute campus"
                >
                  {instituteCode.toUpperCase()}
                  <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${isInstituteSwitcherOpen ? "rotate-180" : ""}`} />
                </button>

                {isInstituteSwitcherOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-[#22263A] border border-slate-200 dark:border-white/10 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Switch Campus
                    </div>
                    <div className="space-y-1 mt-1">
                      {ALL_INSTITUTES.map((inst) => {
                        const isCurrent = inst.code.toLowerCase() === instituteCode.toLowerCase();
                        return (
                          <button
                            key={inst.code}
                            type="button"
                            onClick={() => handleSwitchInstitute(inst.code)}
                            className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white shrink-0"
                                style={{ backgroundColor: inst.color }}
                              >
                                {inst.short}
                              </span>
                              <span className="truncate text-left text-xs">{inst.name}</span>
                            </div>
                            {isCurrent && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shrink-0 shadow-xs flex items-center"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {instituteCode.toUpperCase()}
              </span>
            )}
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8] truncate min-w-0 flex-1" title={dynamicTitle}>
              {dynamicTitle}
            </h1>
          </div>

          {/* Desktop & Tablet Title & Institute Badge / Switcher */}
          <div className="hidden md:flex items-center gap-3 min-w-0">
            {isAdmin ? (
              <div className="relative" ref={instituteSwitcherRef}>
                <button
                  type="button"
                  onClick={() => setIsInstituteSwitcherOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all shadow-xs cursor-pointer text-left group"
                  title="Click to switch institute campus"
                  aria-expanded={isInstituteSwitcherOpen}
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    {instituteCode.toUpperCase()}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5 flex items-center gap-1">
                      Campus Switcher
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-[#F0F2F8] truncate max-w-[140px] lg:max-w-[200px] leading-tight">
                      {instituteName}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${isInstituteSwitcherOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Institute Switcher Dropdown */}
                {isInstituteSwitcherOpen && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#22263A] border border-slate-200 dark:border-white/10 p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      Switch Campus Portal
                    </div>
                    <div className="space-y-1 mt-1.5">
                      {ALL_INSTITUTES.map((inst) => {
                        const isCurrent = inst.code.toLowerCase() === instituteCode.toLowerCase();
                        return (
                          <button
                            key={inst.code}
                            type="button"
                            onClick={() => handleSwitchInstitute(inst.code)}
                            className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white shrink-0"
                                style={{ backgroundColor: inst.color }}
                              >
                                {inst.short}
                              </span>
                              <span className="truncate text-left text-xs">{inst.name}</span>
                            </div>
                            {isCurrent && <Check className="h-4 w-4 text-emerald-500 shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] shadow-xs">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {instituteCode.toUpperCase()}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                    Campus
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-[#F0F2F8] truncate max-w-[140px] lg:max-w-[200px] leading-tight">
                    {instituteName}
                  </span>
                </div>
              </div>
            )}

            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 shrink-0" />

            <h1 className="text-sm lg:text-base xl:text-lg font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8] truncate max-w-[160px] lg:max-w-[240px] xl:max-w-none">
              {dynamicTitle}
            </h1>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex flex-none items-center justify-end gap-1 sm:gap-1.5 lg:gap-2.5 shrink-0">
          {/* Search bar Desktop (Wide only on xl+) */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="hidden w-full max-w-xs xl:max-w-sm 2xl:max-w-md items-center justify-between gap-2.5 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-slate-100/80 dark:bg-[#1E2132] px-3.5 py-2 xl:flex transition-all text-left cursor-pointer"
            style={{
              borderColor: undefined,
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="h-4 w-4 text-slate-400 dark:text-[#8B92A5] shrink-0" />
              <span className="text-sm text-slate-400 dark:text-[#555C72] truncate">
                Search courses, notes, or peers...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-[#8B92A5]">
              ⌘K
            </kbd>
          </button>
          
          {/* Mobile & Tablet Compact Search Button - only on sm+ to keep mobile header clean */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="hidden sm:flex xl:hidden relative rounded-lg sm:rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-1 sm:p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95 h-8 w-8 sm:h-10 sm:w-10 items-center justify-center shrink-0"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </button>

          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={themeMode === "dark"}
            className="relative rounded-lg sm:rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-1 sm:p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center shrink-0 touch-manipulation"
            title={`Switch to ${themeMode === "light" ? "Dark" : "Light"} mode`}
          >
            {themeMode === "dark" ? (
              <Sun className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-slate-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
            )}
          </button>

          {/* Settings link - visible on 2xl+ screens (always available in user menu) */}
          <Link
            href={`/${instituteCode}/settings`}
            className="hidden 2xl:flex relative rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95 h-10 w-10 items-center justify-center shrink-0 touch-manipulation"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>

          <NotificationBell theme={theme} />

          {/* User Profile Avatar with Left Separator */}
          <div className="relative pl-1 sm:pl-2 border-l border-slate-200 dark:border-white/10" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 sm:gap-2.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-0.5 sm:px-2.5 sm:py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs h-8 sm:h-10 shrink-0 touch-manipulation active:scale-95"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {/* Tablet Compact User Info (1024px - 1279px) */}
              <div className="text-right hidden lg:block xl:hidden min-w-0 max-w-[100px]">
                <p className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">{userName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8B92A5] truncate">{userRole}</p>
              </div>

              {/* Desktop Full User Info (1280px+) */}
              <div className="text-right hidden xl:block min-w-0 max-w-[150px] 2xl:max-w-[200px]">
                <div className="flex items-center justify-end gap-1.5 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] truncate">{userName}</p>
                  {userRole === "STUDENT" && <LevelBadge exp={exp} size="sm" />}
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8B92A5] shrink-0">
                    {userRole}
                  </p>
                  {userRole === "STUDENT" && studentNumber && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                      <p className="text-[11px] font-mono text-slate-500 dark:text-[#8B92A5] truncate">{studentNumber}</p>
                    </>
                  )}
                </div>
              </div>
              <UserAvatar
                name={userName}
                avatarUrl={avatarUrl}
                size="sm"
                color={theme.colors.primary}
                className="h-7 w-7 sm:h-8 sm:w-8 text-xs"
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
                href={`/${instituteCode}/settings`}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
              >
                <Settings className="mr-3 h-4 w-4 text-slate-400 dark:text-[#8B92A5]" aria-hidden="true" />
                Settings
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

              {isAdmin && (
                <div className="border-t border-slate-200 dark:border-white/10 my-1 py-1">
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Switch Campus
                  </div>
                  {ALL_INSTITUTES.map((inst) => {
                    const isCurrent = inst.code.toLowerCase() === instituteCode.toLowerCase();
                    return (
                      <button
                        key={inst.code}
                        type="button"
                        onClick={() => handleSwitchInstitute(inst.code)}
                        className={`flex items-center justify-between w-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? "text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: inst.color }}
                          />
                          {inst.short} Campus
                        </span>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors font-semibold cursor-pointer border-t border-slate-200/60 dark:border-white/5"
              >
                <LogOut className="mr-3 h-4 w-4 text-rose-500" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Command / Search Palette Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        instituteCode={instituteCode}
        theme={theme}
        userRole={userRole}
      />
    </header>
  );
}