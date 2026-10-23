"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  BookOpen,
  CheckSquare,
  Trophy,
  Award,
  BarChart2,
  Archive,
  PlusSquare,
  Network,
  ShieldCheck,
  Users,
  FileText,
  Library,
  Flame,
  User,
  Settings,
  LogOut,
  HardDrive,
  HelpCircle,
  Terminal,
  ChevronRight,
  Code2,
  MessageSquareQuote,
  Gamepad2,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { triggerNativeHaptic, logoutFromNative } from "@/lib/mobile-bridge";
import { getNavigationPath } from "@/lib/navigation-path";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  instituteCode: string;
  primaryColor: string;
  userRole: string;
  userName?: string;
  avatarUrl?: string | null;
  isEligibleForActivities?: boolean;
  isEligibleForKnowledgeExchange?: boolean;
  isEligibleForArena?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export default function MobileMoreSheet({
  isOpen,
  onClose,
  instituteCode,
  primaryColor,
  userRole,
  userName = "User",
  avatarUrl = null,
  isEligibleForActivities,
  isEligibleForKnowledgeExchange,
  isEligibleForArena,
}: MobileMoreSheetProps) {
  const pathname = getNavigationPath(usePathname(), instituteCode);
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const role = userRole.toUpperCase();
  const isStudent = role === "STUDENT";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER";

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const controls = sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); previousFocus?.focus(); };
  }, [isOpen, onClose]);

  const studentItems: NavItem[] = [
    { label: "Flashcards", href: `/${instituteCode}/flashcards`, icon: Flame, description: "Daily review decks" },
    { label: "Materials", href: `/${instituteCode}/learning-materials`, icon: BookOpen, description: "Academic library" },
    { label: "Tasks", href: `/${instituteCode}/tasks`, icon: CheckSquare, description: "Personal planner" },
    { label: "Leaderboards", href: `/${instituteCode}/leaderboards`, icon: Trophy, description: "Institute standings" },
    { label: "Achievements", href: `/${instituteCode}/achievements`, icon: Award, description: "Badges and EXP" },
  ];

  const teacherItems: NavItem[] = [
    { label: "Archived Classes", href: `/${instituteCode}/courses/archived`, icon: Archive, description: "Review previous classes" },
    ...(instituteCode === "ics" ? [{ label: "Organizational Chart", href: `/${instituteCode}/organization`, icon: Network, description: "Program faculty & classes" }] : []),
    { label: "Student Analytics", href: `/${instituteCode}/analytics`, icon: BarChart2, description: "Class progress and performance" },
    { label: "Manage Leaderboard", href: `/${instituteCode}/manage-leaderboard`, icon: Trophy, description: "Manage institute rankings" },
    { label: "Create Tasks", href: `/${instituteCode}/create-tasks`, icon: PlusSquare, description: "Assign activities" },
  ];

  const adminItems: NavItem[] = [
    { label: "Courses", href: `/${instituteCode}/admin/courses`, icon: Library, description: "All classes" },
    { label: "Accounts", href: `/${instituteCode}/accounts`, icon: Users, description: "Users & students" },
    ...(instituteCode === "ics" ? [{ label: "Faculty & Program Heads", href: `/${instituteCode}/admin/faculty`, icon: Users, description: "BSIT and BSCpE faculty" }] : []),
    { label: "Audit Logs", href: `/${instituteCode}/logs`, icon: FileText, description: "System events" },
    { label: "Backup & Recovery", href: `/${instituteCode}/backup`, icon: HardDrive, description: "Protect and restore data" },
    { label: "Security Tools", href: `/${instituteCode}/security`, icon: ShieldCheck, description: "Review account security" },
    { label: "Help", href: `/${instituteCode}/help`, icon: HelpCircle, description: "Support and guidance" },
  ];

  const handleLogout = async () => {
    triggerNativeHaptic("medium");
    setLoggingOut(true);
    try {
      logoutFromNative();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    onClose();
    router.push(`/login?institute=${instituteCode}&force=true`);
  };

  const items: NavItem[] = [
    ...(isEligibleForActivities && (isStudent || isProfessor)
      ? [{ label: "CodeLab", href: `/${instituteCode}/activities/codelab`, icon: Code2, description: "Coding practice" }] : []),
    ...(isEligibleForActivities && isProfessor
      ? [{ label: "CodeLab Analytics", href: `/${instituteCode}/activities/codelab/instructor`, icon: Terminal, description: "Submissions and coding progress" }] : []),
    ...(isEligibleForKnowledgeExchange
      ? [{ label: "Knowledge Exchange", href: `/${instituteCode}/knowledge-exchange`, icon: MessageSquareQuote, description: "Questions & discussions" }] : []),
    ...(isEligibleForArena || instituteCode.toLowerCase() === "ibe"
      ? [{ label: "Quiz Arena", href: `/${instituteCode}/arena`, icon: Gamepad2, description: isProfessor ? "Host live interactive quizzes" : "Live interactive quiz battles" }] : []),
    ...(isStudent && instituteCode.toLowerCase() === "ibe"
      ? [{ label: "Financial Statement Generator", href: `/${instituteCode}/financial-statements`, icon: FileSpreadsheet, description: "Create and manage accounting reports" }] : []),
    ...(isStudent ? studentItems : isProfessor ? teacherItems : adminItems),
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 lg:hidden">
      {/* Backdrop scrim */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 touch-manipulation"
        onClick={onClose}
        onTouchEnd={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className="mobile-more-sheet fixed inset-x-0 bottom-0 z-10 max-h-[90dvh] flex flex-col rounded-t-3xl border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] shadow-2xl overflow-hidden"
      >
        {/* Handle bar + Header */}
        <div className="px-5 pt-3 pb-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto absolute top-2.5 left-1/2 -translate-x-1/2" />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] mt-1">
              {isStudent ? "Explore CdM LMS" : isProfessor ? "Instructor tools" : "Administration"}
            </h2>
            <span
              className="mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {instituteCode.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-11 min-w-11 flex items-center justify-center touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="p-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UserAvatar
                name={userName}
                avatarUrl={avatarUrl}
                size="sm"
                color={primaryColor}
                className="h-10 w-10 shrink-0 text-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">
                  {userName}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8B92A5] truncate">
                  {userRole}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/${instituteCode}/profile`}
                onClick={() => {
                  triggerNativeHaptic("light");
                  onClose();
                }}
                className="rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors min-h-11 min-w-11 flex items-center justify-center active:scale-95"
                title="Profile"
                aria-label="Profile"
              >
                <User className="w-4 h-4" />
              </Link>
              <Link
                href={`/${instituteCode}/settings`}
                onClick={() => {
                  triggerNativeHaptic("light");
                  onClose();
                }}
                className="rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors min-h-11 min-w-11 flex items-center justify-center active:scale-95"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Grid */}
        <nav aria-label="Additional navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          <div className={isStudent ? "grid grid-cols-2 gap-2.5" : "divide-y divide-slate-100 dark:divide-white/5"}>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && !items.some(other => other.href !== item.href && other.href.startsWith(item.href + "/") && pathname.startsWith(other.href)));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    triggerNativeHaptic("light");
                    onClose();
                  }}
                  className={`${isStudent ? "flex flex-col p-3 rounded-2xl border min-h-18" : "flex items-center gap-3 px-3 py-3 rounded-xl min-h-16"} transition-colors duration-150 cursor-pointer touch-manipulation ${
                    isActive
                      ? "border-transparent bg-slate-100/90 dark:bg-white/10"
                      : `${isStudent ? "border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-[#1A1D27]" : ""} hover:bg-slate-100/70 dark:hover:bg-white/[0.07]`
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: primaryColor,
                          color: "var(--institute-ink)",
                        }
                      : undefined
                  }
                >
                  <div className={`flex gap-2 min-w-0 flex-1 ${isStudent ? "items-center mb-1" : "items-start"}`}>
                    <div
                      className="p-0.5 rounded-xl shrink-0"
                      style={{
                        backgroundColor: isActive ? `${primaryColor}25` : undefined,
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: isActive ? "var(--institute-ink)" : undefined }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`${isStudent ? "text-xs" : "text-sm"} font-semibold text-slate-900 dark:text-[#F0F2F8] leading-snug wrap-break-word`}>{item.label}</span>
                      {!isStudent && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>}
                    </div>
                  </div>
                  {isStudent && item.description && (
                    <span className="text-[10px] text-slate-500 dark:text-[#8B92A5] truncate">
                      {item.description}
                    </span>
                  )}
                  {!isStudent && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Sign Out / Switch Account */}
        <div className="p-4 pt-2 pb-[calc(24px+env(safe-area-inset-bottom,0px))] border-t border-slate-100 dark:border-white/5 shrink-0">
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/20 transition-all cursor-pointer active:scale-[0.98] min-h-12 touch-manipulation"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? "Signing Out..." : "Sign Out / Switch Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
