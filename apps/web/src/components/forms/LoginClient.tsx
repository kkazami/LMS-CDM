"use client";

import { useState, useEffect, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChartNoAxesCombined, ClipboardList, Megaphone, ShieldCheck, UserCheck } from "lucide-react";
import LoginForm from "@/components/forms/LoginForm";
import { INSTITUTES } from "@/components/common/InstituteSelector";
import UserAvatar from "@/components/common/UserAvatar";
import { PolicyLink } from "@/components/legal/PolicyNavigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isDesktopAdmin as isDesktopAdminCheck } from "@/lib/electron-detect";
import { triggerNativeHaptic, logoutFromNative } from "@/lib/mobile-bridge";
import type { InstituteCode } from "@/lib/theme";
import styles from "./login.module.css";

type ExistingUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  instituteCode: string;
} | null;

type LoginClientProps = {
  initialInstituteCode?: string;
  initialIsDesktopAdmin?: boolean;
  existingUser?: ExistingUser;
};

const features = [
  { icon: BookOpen, lead: "Find your", emphasis: "focus.", description: "Classes, modules, and everything in between." },
  { icon: ClipboardList, lead: "Put ideas into", emphasis: "practice.", description: "Assignments and activities that move you forward." },
  { icon: ChartNoAxesCombined, lead: "See how far you’ve", emphasis: "come.", description: "Your grades. Your progress. Your next step." },
  { icon: Megaphone, lead: "Stay in the", emphasis: "loop.", description: "Updates from the people you learn with." },
];

export default function LoginClient({
  initialInstituteCode = "ics",
  initialIsDesktopAdmin = false,
  existingUser = null,
}: LoginClientProps) {
  const [instituteCode, setInstituteCode] = useState<InstituteCode>(getInstituteTheme(initialInstituteCode).code);
  const [isDesktopAdminMode, setIsDesktopAdminMode] = useState(initialIsDesktopAdmin);
  const [activeUser, setActiveUser] = useState<ExistingUser>(existingUser);
  const [switching, setSwitching] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (!isDesktopAdminMode && (isDesktopAdminCheck() ||
      new URLSearchParams(window.location.search).get("desktop") === "admin" ||
      navigator.userAgent.includes("Electron"))) {
      setIsDesktopAdminMode(true);
    }
  }, [isDesktopAdminMode]);

  useEffect(() => { setActiveUser(existingUser); }, [existingUser]);

  const theme = getInstituteTheme(instituteCode);
  const instituteStyle = {
    "--login-institute": theme.colors.primary,
    "--login-institute-index": INSTITUTES.findIndex((institute) => institute.code === instituteCode),
  } as CSSProperties;

  function handleInstituteSelect(code: InstituteCode) {
    setInstituteCode(code);
    const url = new URL(window.location.href);
    url.searchParams.set("institute", code);
    window.history.replaceState({}, "", url.toString());
  }

  async function handleSwitchAccount() {
    try { triggerNativeHaptic("medium"); } catch { /* Native feedback is optional. */ }
    setSwitching(true);
    try {
      logoutFromNative();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Keep account switching available when the native bridge is offline.
    } finally {
      setActiveUser(null);
      setSwitching(false);
      const url = new URL(window.location.href);
      url.searchParams.set("force", "true");
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <main className={styles.page} style={instituteStyle}>
      <div className={`${styles.ambient} ${styles.sage}`} aria-hidden="true" />
      <div className={`${styles.ambient} ${styles.gold}`} aria-hidden="true" />

      <nav className={styles.navigation} aria-label="Page navigation">
        <Link href="/" className={styles.home} aria-label="Back to Landing Page">
          <ArrowLeft aria-hidden="true" />Back to home
        </Link>
      </nav>

      <div className={styles.composition}>
        <section className={styles.introduction} aria-labelledby="login-title">
          <h1 id="login-title" className={styles.headline}>Your next chapter<br /><em>starts here.</em></h1>
          <p className={styles.description}>Pick up where you left off — your classes,<br className={styles.desktopBreak} /> your community, and your next big idea.</p>
          <ul className={styles.features} aria-label="Learning management system features">
            {features.map(({ icon: Icon, lead, emphasis, description }) => (
              <li key={emphasis} className={styles.feature}>
                <span className={styles.featureIcon}><Icon aria-hidden="true" /></span>
                <div><h2>{lead} <span>{emphasis}</span></h2><p>{description}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.loginArea}>
          <section className={styles.panel} aria-labelledby="sign-in-title">
            <header className={styles.panelBrand}>
              <Image src="/images/cdm-logo.png" alt="Colegio de Montalban crest" width={64} height={64} priority />
              <h2 id="sign-in-title">{isDesktopAdminMode ? "Administrator sign in" : "Welcome back."}</h2>
              <p>{activeUser ? "You are currently signed into CdM LMS." : isDesktopAdminMode ? "Dedicated access to your desktop console." : "Sign in to your CdM learning space."}</p>
              {isDesktopAdminMode && <span className={styles.adminBadge}><ShieldCheck aria-hidden="true" />Desktop console</span>}
            </header>

            {activeUser ? (
              <div className={styles.existingSession}>
                <div className={styles.avatar}>
                  <UserAvatar name={activeUser.name} avatarUrl={activeUser.avatarUrl} size="xl" color={theme.colors.primary} />
                  <span className={styles.sessionIndicator} title="Active session"><UserCheck aria-hidden="true" /></span>
                </div>
                <div className={styles.userDetails}><h3>{activeUser.name}</h3><p>{activeUser.email}</p><span>{activeUser.role} · {activeUser.instituteCode.toUpperCase()}</span></div>
                <Link
                  href={isDesktopAdminMode || activeUser.role.toUpperCase() === "ADMIN"
                    ? `/${activeUser.instituteCode || instituteCode}/admin`
                    : activeUser.role.toUpperCase() === "STUDENT"
                      ? `/${activeUser.instituteCode || instituteCode}/students`
                      : activeUser.role.toUpperCase() === "PROFESSOR" || activeUser.role.toUpperCase() === "TEACHER"
                        ? `/${activeUser.instituteCode || instituteCode}/teachers`
                        : `/${activeUser.instituteCode || instituteCode}`}
                  onClick={() => { try { triggerNativeHaptic("light"); } catch { /* Native feedback is optional. */ } setContinuing(true); }}
                  className={styles.submit}
                >{continuing ? "Redirecting to Dashboard..." : "Continue to Dashboard"}<ArrowRight aria-hidden="true" /></Link>
                <button type="button" disabled={switching} onClick={handleSwitchAccount} className={styles.switchAccount}>{switching ? "Signing out..." : "Sign in with a different account"}</button>
              </div>
            ) : (
              <>
                <div className={styles.instituteField}>
                  <span className={styles.fieldLabel} id="login-institute-label">Select your institute</span>
                  <div className={styles.instituteTrack} role="group" aria-labelledby="login-institute-label">
                    <span className={styles.instituteSelection} aria-hidden="true" />
                    {INSTITUTES.map((institute) => <button key={institute.code} type="button" className={styles.institute} aria-pressed={instituteCode === institute.code} aria-controls="login-institute-name" onClick={() => handleInstituteSelect(institute.code)}>{institute.short}</button>)}
                  </div>
                  <p className={styles.instituteName} id="login-institute-name" aria-live="polite">{theme.name}</p>
                </div>
                <LoginForm theme={theme} instituteCode={instituteCode} isDesktopAdmin={isDesktopAdminMode} />
              </>
            )}
          </section>
          <p className={styles.cardCaption}>Colegio de Montalban · Learning Management System</p>
        </div>
      </div>

      <div className={styles.pageFooter}>
        <span>© {new Date().getFullYear()} Colegio de Montalban</span>
        <nav aria-label="Login policies and support"><PolicyLink href="/privacy">Privacy</PolicyLink><PolicyLink href="/terms">Terms</PolicyLink><PolicyLink href="/support">Support</PolicyLink></nav>
      </div>
    </main>
  );
}
