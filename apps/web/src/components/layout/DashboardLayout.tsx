"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import type { EnrolledCourseSummary } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { InstituteTheme } from "@/lib/theme";

interface DashboardLayoutProps {
  instituteCode: string;
  instituteName: string;
  userName: string;
  userRole: string;
  studentNumber?: string | null;
  theme: InstituteTheme;
  /** Whether this user qualifies for ICS Interactive Activities. Controls sidebar entry visibility. */
  isEligibleForActivities?: boolean;
  /** Enrolled courses for student sidebar accordion. */
  enrolledCourses?: EnrolledCourseSummary[];
  children: React.ReactNode;
}

export default function DashboardLayout({
  instituteCode,
  instituteName,
  userName,
  userRole,
  studentNumber,
  theme,
  isEligibleForActivities,
  enrolledCourses,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <div className="flex items-start">
        <Sidebar 
          instituteCode={instituteCode} 
          theme={theme}
          userRole={userRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isEligibleForActivities={isEligibleForActivities}
          enrolledCourses={enrolledCourses}
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
                isEligibleForActivities={isEligibleForActivities}
                enrolledCourses={enrolledCourses}
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
            studentNumber={studentNumber}
            instituteCode={instituteCode}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}