"use client";

import { Suspense, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import type { EnrolledCourseSummary } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import NavigationProgress from "@/components/layout/NavigationProgress";
import Toaster from "@/components/common/Toast";
import { AvatarProvider } from "@/lib/avatar-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ChatbotProvider } from "@/lib/chatbot-context";
import ChatbotWidget from "@/components/common/ChatbotWidget";
import type { InstituteTheme } from "@/lib/theme";

interface DashboardLayoutProps {
  instituteCode: string;
  instituteName: string;
  userName: string;
  userRole: string;
  studentNumber?: string | null;
  avatarUrl?: string | null;
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
  avatarUrl,
  theme,
  isEligibleForActivities,
  enrolledCourses,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isStudent = userRole.toUpperCase() === "STUDENT";

  const layoutContent = (
    <div
      className="min-h-screen bg-canvas text-primary-theme transition-colors duration-200"
      style={{
        "--focus-ring": theme.colors.primary,
      } as React.CSSProperties}
    >
      {/* Navigation Progress Bar */}
      <Suspense fallback={null}>
        <NavigationProgress color={theme.colors.primary} />
      </Suspense>

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
            avatarUrl={avatarUrl ?? null}
            instituteCode={instituteCode}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="p-4 lg:p-8">
            <AvatarProvider initialAvatarUrl={avatarUrl ?? null}>
              {children}
            </AvatarProvider>
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster />

      {/* Chatbot Widget — STUDENT role only */}
      {isStudent && <ChatbotWidget theme={theme} />}
    </div>
  );

  return (
    <ThemeProvider>
      {isStudent ? (
        <ChatbotProvider>{layoutContent}</ChatbotProvider>
      ) : (
        layoutContent
      )}
    </ThemeProvider>
  );
}