"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Trophy, Megaphone, MoreHorizontal, BarChart2, Shield } from "lucide-react";
import MobileMoreSheet from "@/components/layout/MobileMoreSheet";

import { triggerNativeHaptic } from "@/lib/mobile-bridge";

interface MobileBottomNavProps {
  instituteCode: string;
  primaryColor: string;
  userRole: string;
  userName?: string;
  avatarUrl?: string | null;
}

export default function MobileBottomNav({
  instituteCode,
  primaryColor,
  userRole,
  userName,
  avatarUrl,
}: MobileBottomNavProps) {
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

  const lastToggleRef = useRef<number>(0);

  const handleMoreToggle = () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 350) return;
    lastToggleRef.current = now;
    try {
      triggerNativeHaptic("light");
    } catch {}
    setIsMoreOpen((prev) => !prev);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[90] lg:hidden bg-white dark:bg-[#1A1D27] border-t border-slate-200/80 dark:border-white/10 pb-[env(safe-area-inset-bottom)] shadow-lg">
        <div className="flex justify-around items-center min-h-[56px] px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.isMore) {
              const isActive = isMoreOpen;
              return (
                <button
                  key={tab.name}
                  id="mobile-nav-more"
                  type="button"
                  onClick={handleMoreToggle}
                  className="flex flex-col items-center justify-center flex-1 min-w-0 max-w-[80px] min-h-[44px] gap-1 py-1.5 px-0.5 active:scale-95 transition-transform cursor-pointer touch-manipulation select-none"
                  style={{ color: isActive ? primaryColor : undefined }}
                  aria-label="Open more navigation options"
                  aria-expanded={isMoreOpen}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${isActive ? "" : "text-slate-500 dark:text-slate-400"}`}
                  />
                  <span
                    className={`text-[10px] font-medium leading-tight truncate w-full text-center tracking-tight ${isActive ? "font-bold" : "text-slate-500 dark:text-slate-400"}`}
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
                className="flex flex-col items-center justify-center flex-1 min-w-0 max-w-[80px] min-h-[44px] gap-1 py-1.5 px-0.5 active:scale-95 transition-transform cursor-pointer touch-manipulation select-none"
                style={{ color: isActive ? primaryColor : undefined }}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${isActive ? "" : "text-slate-500 dark:text-slate-400"}`}
                />
                <span
                  className={`text-[10px] font-medium leading-tight truncate w-full text-center tracking-tight ${isActive ? "font-bold" : "text-slate-500 dark:text-slate-400"}`}
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
        userName={userName}
        avatarUrl={avatarUrl}
      />
    </>
  );
}
