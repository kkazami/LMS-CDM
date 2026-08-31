"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Megaphone,
  MoreHorizontal,
  BarChart2,
  ListTodo,
  Flame,
  Award,
  Sparkles,
  Settings,
  X,
  Code2,
  GraduationCap,
} from "lucide-react";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface MobileBottomNavProps {
  instituteCode: string;
  primaryColor?: string;
  userRole?: string;
  className?: string;
}

export default function MobileBottomNav({
  instituteCode,
  primaryColor = "#2563EB",
  userRole = "STUDENT",
  className,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isStudent = userRole.toUpperCase() === "STUDENT";

  const studentTabs = [
    { label: "Dashboard", href: `/${instituteCode}/students`, icon: LayoutDashboard },
    { label: "Courses", href: `/${instituteCode}/courses`, icon: BookOpen },
    { label: "Grades", href: `/${instituteCode}/grades`, icon: Trophy },
    { label: "Alerts", href: `/${instituteCode}/announcements`, icon: Megaphone },
  ];

  const teacherTabs = [
    { label: "Dashboard", href: `/${instituteCode}/teachers`, icon: LayoutDashboard },
    { label: "Classes", href: `/${instituteCode}/courses`, icon: BookOpen },
    { label: "Analytics", href: `/${instituteCode}/analytics`, icon: BarChart2 },
    { label: "Alerts", href: `/${instituteCode}/announcements`, icon: Megaphone },
  ];

  const currentTabs = isStudent ? studentTabs : teacherTabs;

  const moreLinks = isStudent
    ? [
        { label: "Tasks", href: `/${instituteCode}/tasks`, icon: ListTodo },
        { label: "Flashcards", href: `/${instituteCode}/flashcards`, icon: Flame },
        { label: "Leaderboards", href: `/${instituteCode}/leaderboards`, icon: Award },
        { label: "CodeLab", href: `/${instituteCode}/activities/codelab`, icon: Code2 },
        { label: "Settings", href: `/${instituteCode}/settings`, icon: Settings },
      ]
    : [
        { label: "Gradebook", href: `/${instituteCode}/grades`, icon: Trophy },
        { label: "Create Tasks", href: `/${instituteCode}/create-tasks`, icon: ListTodo },
        { label: "Settings", href: `/${instituteCode}/settings`, icon: Settings },
      ];

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "bg-white/95 dark:bg-[#1A1D27]/95 bg-surface backdrop-blur-lg border-t border-slate-200/80 dark:border-white/10 border-theme",
          "pb-[env(safe-area-inset-bottom)]",
          className
        )}
      >
        <div className="flex h-14 items-center justify-around px-2">
          {currentTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex flex-1 flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 transition-transform active:scale-95 cursor-pointer select-none"
                style={{
                  color: isActive ? primaryColor : undefined,
                }}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    !isActive && "text-slate-500 dark:text-slate-400 text-muted-theme"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    isActive ? "font-bold" : "text-slate-500 dark:text-slate-400 text-muted-theme"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More Action Tab */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 transition-transform active:scale-95 text-slate-500 dark:text-slate-400 text-muted-theme cursor-pointer select-none"
            aria-label="Open more menu"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More Options Bottom Sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex flex-col w-full bg-white dark:bg-[#1A1D27] bg-surface rounded-t-2xl shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 px-4 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex w-full items-center justify-center pb-3">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 border-theme mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white text-primary-theme">
                More Actions & Utilities
              </h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 py-2">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${primaryColor}1A`,
                        color: primaryColor,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-primary-theme">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
