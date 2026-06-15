"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { InstituteTheme } from "@/lib/theme";

type DashboardLayoutProps = {
  instituteCode: string;
  instituteName: string;
  pageTitle: string;
  userName: string;
  theme: InstituteTheme;
  children: React.ReactNode;
};

export default function DashboardLayout({
  instituteCode,
  instituteName,
  pageTitle,
  userName,
  theme,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <div className="flex">
        <Sidebar instituteCode={instituteCode} theme={theme} />

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative z-50">
              <Sidebar instituteCode={instituteCode} theme={theme} />
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <Topbar
            theme={theme}
            instituteName={instituteName}
            pageTitle={pageTitle}
            userName={userName}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}