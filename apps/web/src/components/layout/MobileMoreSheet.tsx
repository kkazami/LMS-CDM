"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  BookOpen,
  CheckSquare,
  Trophy,
  Award,
  BarChart2,
  Archive,
  PlusSquare,
  ShieldCheck,
  Users,
  FileText,
  Library,
  Flame,
  type LucideIcon,
} from "lucide-react";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  instituteCode: string;
  primaryColor: string;
  userRole: string;
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
}: MobileMoreSheetProps) {
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
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

  const studentItems: NavItem[] = [
    { label: "Flashcards", href: `/${instituteCode}/flashcards`, icon: Flame, description: "Daily review decks" },
    { label: "Materials", href: `/${instituteCode}/learning-materials`, icon: BookOpen, description: "Academic library" },
    { label: "Tasks", href: `/${instituteCode}/tasks`, icon: CheckSquare, description: "Personal planner" },
    { label: "Leaderboards", href: `/${instituteCode}/leaderboards`, icon: Trophy, description: "Institute standings" },
    { label: "Achievements", href: `/${instituteCode}/achievements`, icon: Award, description: "Badges and EXP" },
  ];

  const teacherItems: NavItem[] = [
    { label: "Analytics", href: `/${instituteCode}/analytics`, icon: BarChart2, description: "Student telemetry" },
    { label: "Leaderboard", href: `/${instituteCode}/manage-leaderboard`, icon: Trophy, description: "Manage rankings" },
    { label: "Create Tasks", href: `/${instituteCode}/create-tasks`, icon: PlusSquare, description: "Assign activities" },
    { label: "Archived", href: `/${instituteCode}/courses/archived`, icon: Archive, description: "Previous courses" },
  ];

  const adminItems: NavItem[] = [
    { label: "Courses", href: `/${instituteCode}/admin/courses`, icon: Library, description: "All classes" },
    { label: "Accounts", href: `/${instituteCode}/accounts`, icon: Users, description: "Users & students" },
    { label: "Permissions", href: `/${instituteCode}/accounts/permissions`, icon: ShieldCheck, description: "Role matrix" },
    { label: "Audit Logs", href: `/${instituteCode}/logs`, icon: FileText, description: "System events" },
  ];

  const items = isStudent ? studentItems : isProfessor ? teacherItems : adminItems;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      {/* Backdrop scrim */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className="fixed inset-x-0 bottom-0 z-10 max-h-[85vh] flex flex-col rounded-t-[28px] border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Handle bar + Header */}
        <div className="px-5 pt-3 pb-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto absolute top-2.5 left-1/2 -translate-x-1/2" />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] mt-1">
              Explore Lumina
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
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Grid */}
        <div className="flex-1 overflow-y-auto p-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex flex-col p-3 rounded-2xl border transition-all cursor-pointer min-h-[72px] active:scale-[0.98] ${
                    isActive
                      ? "border-transparent bg-slate-100/90 dark:bg-white/10"
                      : "border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-[#1A1D27] hover:bg-slate-100/70 dark:hover:bg-white/[0.07]"
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: primaryColor,
                          color: primaryColor,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <div
                      className="p-1.5 rounded-xl shrink-0"
                      style={{
                        backgroundColor: isActive ? `${primaryColor}25` : undefined,
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: isActive ? primaryColor : undefined }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">
                      {item.label}
                    </span>
                  </div>
                  {item.description && (
                    <span className="text-[10px] text-slate-500 dark:text-[#8B92A5] line-clamp-1">
                      {item.description}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
