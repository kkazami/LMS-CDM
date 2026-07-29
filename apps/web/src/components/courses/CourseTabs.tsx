"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InstituteTheme } from "@/lib/theme";
import { MessageSquare, BookOpen, Users, BarChart2, type LucideIcon } from "lucide-react";

interface CourseTabsProps {
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
  pendingCount?: number;
  isInstructor?: boolean;
}

export default function CourseTabs({
  courseId,
  instituteCode,
  theme,
  pendingCount = 0,
  isInstructor = false,
}: CourseTabsProps) {
  const pathname = usePathname();

  type Tab = { key: string; label: string; icon: LucideIcon };
  const TABS: Tab[] = [
    { key: "stream", label: "Stream", icon: MessageSquare },
    { key: "classwork", label: "Classwork", icon: BookOpen },
    { key: "people", label: "People", icon: Users },
    ...(isInstructor ? [{ key: "gradebook", label: "Gradebook", icon: BarChart2 }] : []),
  ];

  return (
    <div className="border-b border-gray-300 bg-white">
      <nav className="flex gap-0 max-w-5xl mx-auto px-4 md:px-8" aria-label="Course tabs">
        {TABS.map((tab) => {
          const href = `/${instituteCode}/courses/${courseId}/${tab.key}`;
          const isActive = pathname.includes(`/${tab.key}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={href}
              className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors"
              style={{
                color: isActive ? theme.colors.primary : "#6B7280",
                borderBottom: isActive
                  ? `3px solid ${theme.colors.primary}`
                  : "3px solid transparent",
              }}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === "people" && pendingCount > 0 && (
                <span
                  className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
