"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { InstituteTheme } from "@/lib/theme";

type DashboardLayoutProps = {
  instituteCode: string;
  instituteName: string;
  userName: string;
  userRole: string;
  theme: InstituteTheme;
  children: React.ReactNode;
};

export default function DashboardLayout({
  instituteCode,
  instituteName,
  userName,
  userRole,
  theme,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <div className="flex">
        <Sidebar 
          instituteCode={instituteCode} 
          theme={theme}
          userRole={userRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative z-50 flex">
              <Sidebar 
                instituteCode={instituteCode} 
                theme={theme}
                userRole={userRole}
                isCollapsed={false}
              />
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <Topbar
            theme={theme}
            instituteName={instituteName}
            userName={userName}
            userRole={userRole}
            instituteCode={instituteCode}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}