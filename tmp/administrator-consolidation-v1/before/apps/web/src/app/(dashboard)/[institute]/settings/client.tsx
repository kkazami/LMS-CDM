"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ChevronDown, ChevronUp, Bell, MessageSquare, BookOpen, Settings2 } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

import { UserPreferences } from "@lms/types";
import { ToggleRow } from "@/components/common/ToggleRow";
import { useTheme } from "@/lib/theme-context";
import { Moon, Sun } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
}

interface SettingsClientProps {
  instituteCode: string;
  theme: InstituteTheme;
  user: UserData;
  enrolledCourses: CourseOption[];
  taughtCourses: CourseOption[];
}

export default function SettingsClient({
  instituteCode,
  theme,
  user,
  enrolledCourses,
  taughtCourses,
}: SettingsClientProps) {
  const [preferences, setPreferences] = useState(user.preferences);
  const [saving, setSaving] = useState(false);
  const [classAccordionOpen, setClassAccordionOpen] = useState(false);
  const { themeMode, setThemeMode } = useTheme();
  const [pendingTheme, setPendingTheme] = useState(preferences.display_theme || themeMode);

  // Helper to handle boolean toggles
  const handleToggle = async (key: keyof UserPreferences, value: boolean) => {
    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: updatedPrefs }),
      });
      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error(error);
      // Revert on failure
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const isStudent = user.role === "STUDENT";
  const isProfessor = user.role === "PROFESSOR" || user.role === "INSTRUCTOR";
  const isAdmin = user.role === "ADMIN";

  const classList = isProfessor ? taughtCourses : enrolledCourses;

  // Helper to handle select inputs (strings)
  const handleSelect = async (key: keyof UserPreferences, value: string) => {
    const updatedPrefs = { ...preferences, [key]: value } as UserPreferences;
    setPreferences(updatedPrefs);
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: updatedPrefs }),
      });
      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error(error);
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    // 1. Update the actual DOM theme via context
    if (pendingTheme === "light" || pendingTheme === "dark") {
      setThemeMode(pendingTheme);
    }
    // 2. Save to database
    await handleSelect("display_theme", pendingTheme);
  };

  return (
    <div className="page-enter mx-auto max-w-4xl pb-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F0F2F8]">Settings</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-[#8B92A5]">
          Manage your account profile, privacy, and notification preferences.
        </p>
      </div>

      <div className="space-y-8">
        

        {/* 3. Display & Accessibility */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-sm overflow-hidden">
          <div className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
              <Settings2 className="h-5 w-5 text-slate-400" />
              Display
            </h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-6 max-w-lg">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">Theme Preference</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Light Mode Button */}
                  <button
                    onClick={() => setPendingTheme("light")}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-200 ${
                      pendingTheme === "light"
                        ? "border-[#1E88E5] bg-[#1E88E5]/5 dark:bg-[#1E88E5]/10 shadow-sm"
                        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#1E2132]"
                    }`}
                  >
                    <Sun className={`h-8 w-8 mb-3 ${pendingTheme === "light" ? "text-[#1E88E5]" : "text-slate-400"}`} />
                    <span className={`text-sm font-bold ${pendingTheme === "light" ? "text-[#1E88E5]" : "text-slate-600 dark:text-[#8B92A5]"}`}>Light Mode</span>
                  </button>

                  {/* Dark Mode Button */}
                  <button
                    onClick={() => setPendingTheme("dark")}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-200 ${
                      pendingTheme === "dark"
                        ? "border-[#1E88E5] bg-[#1E88E5]/5 dark:bg-[#1E88E5]/10 shadow-sm"
                        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#1E2132]"
                    }`}
                  >
                    <Moon className={`h-8 w-8 mb-3 ${pendingTheme === "dark" ? "text-[#1E88E5]" : "text-slate-400"}`} />
                    <span className={`text-sm font-bold ${pendingTheme === "dark" ? "text-[#1E88E5]" : "text-slate-600 dark:text-[#8B92A5]"}`}>Dark Mode</span>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveTheme}
                  disabled={saving || pendingTheme === preferences.display_theme}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    saving || pendingTheme === preferences.display_theme
                      ? "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30 cursor-not-allowed"
                      : "bg-[#1E88E5] text-white hover:bg-[#1E88E5]/90 shadow-sm hover:shadow"
                  }`}
                >
                  {saving ? "Saving..." : "Save Theme"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Notifications */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-sm overflow-hidden mb-12">
          <div className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
              <Bell className="h-5 w-5 text-slate-400" />
              Notifications
            </h2>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Email Group */}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-1">Email</h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] mb-4">
                These settings apply to the notifications that you receive by email.
              </p>
              
              <div className="max-w-sm mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Notification Frequency</label>
                <select
                  value={preferences.email_frequency || "immediate"}
                  onChange={(e) => handleSelect("email_frequency", e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-[#F0F2F8] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                >
                  <option value="immediate">Send Immediately</option>
                  <option value="daily_digest">Daily Digest</option>
                </select>
              </div>

              <ToggleRow 
                title="Allow email notifications" 
                isOn={preferences.email_allow_notifications ?? true}
                onToggle={(val) => handleToggle("email_allow_notifications", val)} 
              />
            </div>

            {/* Comments Group */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-4">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                Comments
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                <ToggleRow 
                  title="Comments on your posts" 
                  isOn={preferences.notif_comment_on_post ?? true}
                  onToggle={(val) => handleToggle("notif_comment_on_post", val)}
                  isDisabled={preferences.email_allow_notifications === false}
                />
                <ToggleRow 
                  title="Comments that mention you" 
                  isOn={preferences.notif_comment_mention ?? true}
                  onToggle={(val) => handleToggle("notif_comment_mention", val)}
                  isDisabled={preferences.email_allow_notifications === false}
                />
                <ToggleRow 
                  title="Private comments on work" 
                  isOn={preferences.notif_comment_private ?? true}
                  onToggle={(val) => handleToggle("notif_comment_private", val)}
                  isDisabled={preferences.email_allow_notifications === false}
                />
              </div>
            </div>

            {/* Role Specific Group */}
            {isStudent && (
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-4">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  Classes that you're enrolled in
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <ToggleRow 
                    title="Work and other posts from teachers" 
                    isOn={preferences.notif_student_teacher_posts ?? true}
                    onToggle={(val) => handleToggle("notif_student_teacher_posts", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Returned work and grades from your teachers" 
                    isOn={preferences.notif_student_returned_work ?? true}
                    onToggle={(val) => handleToggle("notif_student_returned_work", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Invitations to join classes as a student" 
                    isOn={preferences.notif_student_invitations ?? true}
                    onToggle={(val) => handleToggle("notif_student_invitations", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Due-date reminders for your work" 
                    isOn={preferences.notif_student_due_dates ?? true}
                    onToggle={(val) => handleToggle("notif_student_due_dates", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                </div>
              </div>
            )}

            {isProfessor && (
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-4">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  Classes that you teach
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <ToggleRow 
                    title="Late submissions of student work" 
                    isOn={preferences.notif_prof_late_subs ?? true}
                    onToggle={(val) => handleToggle("notif_prof_late_subs", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Resubmissions of student work" 
                    isOn={preferences.notif_prof_resubs ?? true}
                    onToggle={(val) => handleToggle("notif_prof_resubs", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Invitations to co-teach classes" 
                    isOn={preferences.notif_prof_coteach_invites ?? true}
                    onToggle={(val) => handleToggle("notif_prof_coteach_invites", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Scheduled post published or failed" 
                    isOn={preferences.notif_prof_scheduled_posts ?? true}
                    onToggle={(val) => handleToggle("notif_prof_scheduled_posts", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="New private comments from students on classwork" 
                    isOn={preferences.notif_prof_private_comments ?? true}
                    onToggle={(val) => handleToggle("notif_prof_private_comments", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                </div>
              </div>
            )}

            {isAdmin && (
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-4">
                  <Shield className="h-4 w-4 text-slate-400" />
                  System Alerts
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <ToggleRow 
                    title="New user registrations and enrollment requests" 
                    isOn={preferences.notif_admin_new_users ?? true}
                    onToggle={(val) => handleToggle("notif_admin_new_users", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="System error or critical audit log alerts" 
                    isOn={preferences.notif_admin_system_errors ?? true}
                    onToggle={(val) => handleToggle("notif_admin_system_errors", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                  <ToggleRow 
                    title="Institute-wide announcements published" 
                    isOn={preferences.notif_admin_announcements ?? true}
                    onToggle={(val) => handleToggle("notif_admin_announcements", val)}
                    isDisabled={preferences.email_allow_notifications === false}
                  />
                </div>
              </div>
            )}

          </div>
          
          {/* Class Notifications Accordion */}
          {classList.length > 0 && (
            <div className="border-t border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-[#181B26]/50">
              <button
                onClick={() => setClassAccordionOpen(!classAccordionOpen)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">Class notifications</h3>
                  <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
                    These settings apply to both your email and device notifications for each class
                  </p>
                </div>
                {classAccordionOpen ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>
              
              {classAccordionOpen && (
                <div className="px-6 pb-6 pt-2 divide-y divide-slate-100 dark:divide-white/5">
                  {classList.map((course) => (
                    <div key={course.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 shadow-sm">
                          {course.code.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                            {course.code}
                          </p>
                          <p className="text-xs font-medium text-slate-500 dark:text-[#8B92A5] truncate max-w-50 sm:max-w-md">
                            {course.title}
                          </p>
                        </div>
                      </div>
                      <ToggleRow
                        title=""
                        isOn={preferences[`notif_class_${course.id}` as keyof UserPreferences] as boolean ?? true}
                        onToggle={(val) => handleToggle(`notif_class_${course.id}` as keyof UserPreferences, val)}
                        isDisabled={preferences.email_allow_notifications === false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </section>
      </div>
    </div>
  );
}
