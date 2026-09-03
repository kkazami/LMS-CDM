"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Trophy, Megaphone, MoreHorizontal, BarChart2, Shield } from "lucide-react";
import MobileMoreSheet from "@/components/layout/MobileMoreSheet";

interface MobileBottomNavProps {
  instituteCode: string;
  primaryColor: string;
  userRole: string;
}

export default function MobileBottomNav({ instituteCode, primaryColor, userRole }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const role = userRole.toUpperCase();
  const isStudent = role === "STUDENT";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER";

  const studentTabs = [
    { name: "Dashboard", href: `/${instituteCode}/students`, icon: LayoutDashboard },
    { name: "Courses", href: `/${instituteCode}/courses`, icon: BookOpen },
    { name: "Grades", href: `/${instituteCode}/grades`, icon: Trophy },
    { name: "Alerts", href: `/${instituteCode}/announcements`, icon: Megaphone },
    { name: "More", isMore: true, icon: MoreHorizontal },
  ];

  const teacherTabs = [
    { name: "Dashboard", href: `/${instituteCode}/teachers`, icon: LayoutDashboard },
    { name: "Classes", href: `/${instituteCode}/courses`, icon: BookOpen },
    { name: "Analytics", href: `/${instituteCode}/analytics`, icon: BarChart2 },
    { name: "Alerts", href: `/${instituteCode}/announcements`, icon: Megaphone },
    { name: "More", isMore: true, icon: MoreHorizontal },
  ];

  const adminTabs = [
    { name: "Dashboard", href: `/${instituteCode}/admin`, icon: LayoutDashboard },
    { name: "Courses", href: `/${instituteCode}/admin/courses`, icon: BookOpen },
    { name: "Accounts", href: `/${instituteCode}/accounts`, icon: Trophy },
    { name: "Logs", href: `/${instituteCode}/logs`, icon: Megaphone },
    { name: "More", isMore: true, icon: MoreHorizontal },
  ];

  const tabs = isStudent ? studentTabs : isProfessor ? teacherTabs : adminTabs;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center min-h-[56px] px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.isMore) {
              const isActive = isMoreOpen;
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => setIsMoreOpen(true)}
                  className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-1 p-2 active:scale-95 transition-transform cursor-pointer"
                  style={{ color: isActive ? primaryColor : undefined }}
                  aria-label="Open more navigation options"
                  aria-expanded={isMoreOpen}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "" : "text-slate-500 dark:text-slate-400"}`}
                  />
                  <span
                    className={`text-[10px] font-medium leading-none ${isActive ? "font-bold" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    {tab.name}
                  </span>
                </button>
              );
            }

            const href = tab.href!;
            const isActive =
              href.endsWith("/courses")
                ? pathname === href || pathname.startsWith(href + "/")
                : pathname === href;

            return (
              <Link
                key={tab.name}
                href={href}
                className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-1 p-2 active:scale-95 transition-transform cursor-pointer"
                style={{ color: isActive ? primaryColor : undefined }}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "" : "text-slate-500 dark:text-slate-400"}`}
                />
                <span
                  className={`text-[10px] font-medium leading-none ${isActive ? "font-bold" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More Options Bottom Sheet */}
      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        instituteCode={instituteCode}
        primaryColor={primaryColor}
        userRole={userRole}
      />
    </>
  );
}
