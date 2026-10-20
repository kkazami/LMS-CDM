"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/layout/Sidebar";
import type { EnrolledCourseSummary } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import NavigationProgress from "@/components/layout/NavigationProgress";
import Toaster from "@/components/common/Toast";
import { AvatarProvider } from "@/lib/avatar-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ChatbotProvider } from "@/lib/chatbot-context";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import type { InstituteTheme } from "@/lib/theme";

const ChatbotWidget = dynamic(() => import("@/components/common/ChatbotWidget"));
const BadgeToastProvider = dynamic(() => import("@/components/common/BadgeToast"));
const LoginRewardModal = dynamic(() => import("@/components/common/LoginRewardModal"));
const FloatingStudyTimer = dynamic(() => import("@/components/common/FloatingStudyTimer"));
import FocusModeProvider from "@/components/focus/FocusModeProvider";
import OfflineBootstrap from "@/components/offline/OfflineBootstrap";

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
  /** Whether this user qualifies for Knowledge Exchange. Controls sidebar entry visibility. */
  isEligibleForKnowledgeExchange?: boolean;
  /** Whether this user qualifies for the ITE Practicum module. Controls the sidebar entry. */
  isEligibleForPracticum?: boolean;
  /** Whether this user qualifies for the ITE Meetings module. Controls the sidebar entry. */
  isEligibleForMeetings?: boolean;
  /** Whether this user qualifies for ITE Focus Mode (ITE students only). */
  isEligibleForFocusMode?: boolean;
  /** Whether this user qualifies for ITE Offline Access (ITE students only). */
  isEligibleForOffline?: boolean;
  /** Enrolled courses for student sidebar accordion. */
  enrolledCourses?: EnrolledCourseSummary[];
  /** Gamification total EXP for LevelBadge */
  exp?: number;
  /** Current login streak */
  streakCurrent?: number;
  /** EXP actually granted by today's daily login reward (0 = nothing granted, modal hidden). */
  loginRewardExp?: number;
  userId?: string;
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
  isEligibleForKnowledgeExchange,
  isEligibleForPracticum,
  isEligibleForMeetings,
  isEligibleForFocusMode,
  isEligibleForOffline,
  enrolledCourses,
  exp = 0,
  streakCurrent = 0,
  loginRewardExp = 0,
  userId,
  children,
}: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStudent = userRole.toUpperCase() === "STUDENT";

  const layoutContent = (
    <div
      className="min-h-[100dvh] bg-canvas text-primary-theme transition-colors duration-200 overflow-x-clip max-w-full"
      style={{
        "--focus-ring": theme.colors.primary,
      } as React.CSSProperties}
    >
      {/* Navigation Progress Bar */}
      <Suspense fallback={null}>
        <NavigationProgress color={theme.colors.primary} />
      </Suspense>

      <div className="flex">
        <Sidebar
          instituteCode={instituteCode}
          theme={theme}
          userRole={userRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isEligibleForActivities={isEligibleForActivities}
          isEligibleForKnowledgeExchange={isEligibleForKnowledgeExchange}
          isEligibleForPracticum={isEligibleForPracticum}
          isEligibleForMeetings={isEligibleForMeetings}
          enrolledCourses={enrolledCourses}
        />

        {/* Mobile Sidebar Drawer (Slides in on burger menu click) */}
        <div
          className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
            mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!mobileOpen}
        >
          {/* Backdrop scrim */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer container */}
          <div
            className={`relative z-10 h-full max-w-[280px] w-[80vw] transition-transform duration-300 ease-in-out ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              instituteCode={instituteCode}
              theme={theme}
              userRole={userRole}
              isCollapsed={false}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setMobileOpen(false)}
              isEligibleForActivities={isEligibleForActivities}
              isEligibleForKnowledgeExchange={isEligibleForKnowledgeExchange}
              isEligibleForPracticum={isEligibleForPracticum}
              isEligibleForMeetings={isEligibleForMeetings}
              enrolledCourses={enrolledCourses}
            />
          </div>
        </div>

        <div className={`dashboard-workspace-shell min-w-0 flex-1 overflow-x-hidden max-w-full transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-72"
        }`}>
          <Topbar
            theme={theme}
            instituteName={instituteName}
            userName={userName}
            userRole={userRole}
            studentNumber={studentNumber}
            avatarUrl={avatarUrl ?? null}
            instituteCode={instituteCode}
            exp={exp}
            onOpenMobileMenu={() => setMobileOpen(true)}
            isEligibleForActivities={isEligibleForActivities}
            isEligibleForPracticum={isEligibleForPracticum}
            isEligibleForMeetings={isEligibleForMeetings}
            enrolledCourses={enrolledCourses}
          />
          <main className="px-4 py-4 lg:px-8 lg:py-8 pb-[calc(120px+env(safe-area-inset-bottom,0px))] lg:pb-8">
            <AvatarProvider initialAvatarUrl={avatarUrl ?? null}>
              {children}
            </AvatarProvider>
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        instituteCode={instituteCode}
        primaryColor={theme.colors.primary}
        userRole={userRole}
        userName={userName}
        avatarUrl={avatarUrl ?? null}
        isEligibleForActivities={isEligibleForActivities}
        isEligibleForKnowledgeExchange={isEligibleForKnowledgeExchange}
      />

      {/* Student Gamification Widgets */}
      {isStudent && (
        <>
          <BadgeToastProvider />
          {loginRewardExp > 0 && (
            <LoginRewardModal
              userId={userId}
              streakCurrent={streakCurrent}
              expEarned={loginRewardExp}
              totalExp={exp}
            />
          )}
          <FloatingStudyTimer />
        </>
      )}

      {/* CdM Assistant Chatbot Widget (Students & Faculty) */}
      <ChatbotWidget theme={theme} />
    </div>
  );

  const wrappedContent = isEligibleForFocusMode ? (
    <FocusModeProvider>{layoutContent}</FocusModeProvider>
  ) : (
    layoutContent
  );

  const offlineWrappedContent = (
    <OfflineBootstrap userId={userId} isEligible={isEligibleForOffline}>
      {wrappedContent}
    </OfflineBootstrap>
  );

  return (
    <ThemeProvider>
      <ChatbotProvider userName={userName} userRole={userRole}>
        {offlineWrappedContent}
      </ChatbotProvider>
    </ThemeProvider>
  );
}
