"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Trophy, Megaphone, MoreHorizontal, BarChart2 } from "lucide-react";

interface MobileBottomNavProps {
  instituteCode: string;
  primaryColor: string;
  userRole: string;
}

export default function MobileBottomNav({ instituteCode, primaryColor, userRole }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isStudent = userRole.toUpperCase() === "STUDENT";

  const studentTabs = [
    { name: "Dashboard", href: `/${instituteCode}/students`, icon: LayoutDashboard },
    { name: "Courses", href: `/${instituteCode}/courses`, icon: BookOpen },
    { name: "Grades", href: `/${instituteCode}/grades`, icon: Trophy },
    { name: "Alerts", href: `/${instituteCode}/announcements`, icon: Megaphone },
    { name: "More", href: `/${instituteCode}/settings`, icon: MoreHorizontal },
  ];

  const teacherTabs = [
    { name: "Dashboard", href: `/${instituteCode}/teachers`, icon: LayoutDashboard },
    { name: "Classes", href: `/${instituteCode}/courses`, icon: BookOpen },
    { name: "Analytics", href: `/${instituteCode}/analytics`, icon: BarChart2 },
    { name: "Alerts", href: `/${instituteCode}/announcements`, icon: Megaphone },
    { name: "More", href: `/${instituteCode}/settings`, icon: MoreHorizontal },
  ];

  const tabs = isStudent ? studentTabs : teacherTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-[#1A1D27]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center min-h-[56px] px-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-1 p-2 active:scale-95 transition-transform"
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
  );
}
