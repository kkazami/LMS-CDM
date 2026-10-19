"use client";
import { useState, type CSSProperties } from "react";
import { BookOpen, CalendarDays, Mail, Upload, UserPlus, Users } from "lucide-react";
import { withOpacity, type InstituteTheme } from "@/lib/theme";
import ImportWizard from "./ImportWizard";
import InvitationsPanel from "./InvitationsPanel";
import TermManagement from "./TermManagement";
import styles from "./roster.module.css";

const tabs = [
  { value: "students", label: "Import students", icon: Upload },
  { value: "terms", label: "School terms", icon: CalendarDays },
  { value: "courses", label: "Import classes", icon: BookOpen },
  { value: "enrollments", label: "Enroll students", icon: UserPlus },
  { value: "invitations", label: "Account invitations", icon: Mail },
];
export default function RosterOnboarding({
  instituteCode,
  theme,
  initialTab,
}: {
  instituteCode: string;
  theme: InstituteTheme;
  initialTab?: string;
}) {
  const [tab, setTab] = useState(
    tabs.some(item => item.value === initialTab) ? initialTab! : "students",
  );
  return (
    <div className={styles.page} style={{
      "--roster-accent": theme.colors.primary,
      "--roster-accent-soft": withOpacity(theme.colors.primary, 0.1),
      "--roster-accent-ink": theme.code === "ite" ? "#FFFFFF" : "#0F172A",
    } as CSSProperties}>
      <header className={styles.pageHeader}>
        <span className={styles.pageIcon}><Users size={24} aria-hidden="true" /></span>
        <div>
          <h1 className={styles.pageTitle}>Students and Classes</h1>
          <p className={styles.description}>
            Add students and classes, enroll students, and send account setup links.
          </p>
        </div>
      </header>
      <nav
        className={styles.tabs}
        aria-label="Student and class setup"
      >
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            className={styles.tab}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => setTab(value)}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      {tab === "terms" ? (
        <TermManagement />
      ) : tab === "invitations" ? (
        <InvitationsPanel />
      ) : (
        <ImportWizard
          key={tab}
          type={tab.toUpperCase() as "STUDENTS" | "COURSES" | "ENROLLMENTS"}
          instituteCode={instituteCode}
          theme={theme}
        />
      )}
    </div>
  );
}
