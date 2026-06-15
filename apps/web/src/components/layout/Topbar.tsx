"use client";

import { Bell, Menu, Search } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

type TopbarProps = {
  theme: InstituteTheme;
  instituteName: string;
  pageTitle: string;
  userName: string;
  notificationCount?: number;
  onOpenMobileMenu?: () => void;
};

export default function Topbar({
  theme,
  instituteName,
  pageTitle,
  userName,
  notificationCount = 3,
  onOpenMobileMenu,
}: TopbarProps) {
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
              {pageTitle}
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

          <button
            className="relative rounded-md border border-gray-200 bg-white p-2 text-gray-700"
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

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="text-right">
              <p className="text-sm font-medium text-[#2C2727]">{userName}</p>
              <p className="text-xs text-gray-500">Student</p>
            </div>
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}