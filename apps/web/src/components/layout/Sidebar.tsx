"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Settings,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

type SidebarProps = {
  instituteCode: string;
  theme: InstituteTheme;
};

const getLinks = (instituteCode: string) => [
  { label: "Dashboard", href: `/${instituteCode}`, icon: LayoutDashboard },
  { label: "My Courses", href: `/${instituteCode}/courses`, icon: BookOpen },
  { label: "Assignments", href: `/${instituteCode}/assignments`, icon: ClipboardList },
  { label: "Grades", href: `/${instituteCode}/grades`, icon: GraduationCap },
  { label: "AI Study Helper", href: `/${instituteCode}/ai-study-helper`, icon: Sparkles },
  { label: "Settings", href: `/${instituteCode}/settings`, icon: Settings },
];

export default function Sidebar({ instituteCode, theme }: SidebarProps) {
  const pathname = usePathname();
  const links = getLinks(instituteCode);

  return (
    <aside
      className="hidden h-screen w-72 shrink-0 border-r p-4 lg:block"
      style={{ backgroundColor: theme.colors.sidebar, borderColor: theme.colors.sidebarMuted }}
    >
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-white">Lumina LMS</span>
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          />
        </div>
      </div>

      <nav className="grid gap-2">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
              style={{
                backgroundColor: active ? theme.colors.sidebarMuted : "transparent",
                color: active ? theme.colors.primary : "#E5E7EB",
              }}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}