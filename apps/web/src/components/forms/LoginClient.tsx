"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import LoginForm from "@/components/forms/LoginForm";
import InstituteSelector from "@/components/common/InstituteSelector";
import Button from "@/components/common/Button";
import UserAvatar from "@/components/common/UserAvatar";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isDesktopAdmin as isDesktopAdminCheck } from "@/lib/electron-detect";
import { triggerNativeHaptic, logoutFromNative } from "@/lib/mobile-bridge";
import type { InstituteCode } from "@/lib/theme";
import { ShieldCheck, GraduationCap, ArrowRight, UserCheck } from "lucide-react";

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

export default function LoginClient({
  initialInstituteCode = "ics",
  initialIsDesktopAdmin = false,
  existingUser = null,
}: LoginClientProps) {
  const router = useRouter();
  const [instituteCode, setInstituteCode] = useState<InstituteCode>(
    (initialInstituteCode?.toLowerCase() as InstituteCode) || "ics"
  );

  const [isDesktopAdminMode, setIsDesktopAdminMode] = useState<boolean>(initialIsDesktopAdmin);
  const [activeUser, setActiveUser] = useState<ExistingUser>(existingUser);
  const [switching, setSwitching] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (
      !isDesktopAdminMode &&
      (isDesktopAdminCheck() ||
        new URLSearchParams(window.location.search).get("desktop") === "admin" ||
        (typeof navigator !== "undefined" && navigator.userAgent.includes("Electron")))
    ) {
      setIsDesktopAdminMode(true);
    }
  }, [isDesktopAdminMode]);

  const theme = getInstituteTheme(instituteCode);

  const handleInstituteSelect = (code: InstituteCode) => {
    setInstituteCode(code);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("institute", code);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleContinueAsExisting = () => {
    try {
      triggerNativeHaptic("light");
    } catch {
      // ignore
    }
    if (!activeUser) return;
    setContinuing(true);
    const role = activeUser.role.toUpperCase();
    const inst = activeUser.instituteCode || instituteCode;
    let target = `/${inst}`;
    if (isDesktopAdminMode || role === "ADMIN") {
      target = `/${inst}/admin`;
    } else if (role === "STUDENT") {
      target = `/${inst}/students`;
    } else if (role === "PROFESSOR" || role === "TEACHER") {
      target = `/${inst}/teachers`;
    }

    if (typeof window !== "undefined") {
      window.location.assign(target);
    } else {
      router.push(target);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      triggerNativeHaptic("medium");
    } catch {
      // ignore
    }
    setSwitching(true);
    try {
      logoutFromNative();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setActiveUser(null);
    setSwitching(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("force", "true");
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-6 py-8 sm:py-12 overflow-y-auto transition-colors duration-300"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="w-full max-w-md my-auto">
        <div className="mb-6 text-center">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm border transition-transform duration-200 hover:scale-105"
            style={{
              backgroundColor: `${theme.colors.primary}18`,
              borderColor: `${theme.colors.primary}40`,
              color: theme.colors.primary,
            }}
          >
            {isDesktopAdminMode ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <GraduationCap className="h-7 w-7" />
            )}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isDesktopAdminMode ? "CdM LMS — Desktop Console" : "CdM LMS Portal"}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {theme.name}
          </p>
        </div>

        {activeUser ? (
          <Card
            title="Welcome Back"
            description="You are currently signed into CdM LMS."
          >
            <div className="space-y-6 pt-2 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <UserAvatar
                    name={activeUser.name}
                    avatarUrl={activeUser.avatarUrl}
                    size="xl"
                    color={theme.colors.primary}
                  />
                  <div
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
                    title="Active session"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeUser.email}
                  </p>
                  <span
                    className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${theme.colors.primary}15`,
                      color: theme.colors.primary,
                    }}
                  >
                    {activeUser.role} · {activeUser.instituteCode.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href={
                    isDesktopAdminMode || activeUser?.role?.toUpperCase() === "ADMIN"
                      ? `/${activeUser?.instituteCode || instituteCode}/admin`
                      : activeUser?.role?.toUpperCase() === "STUDENT"
                      ? `/${activeUser?.instituteCode || instituteCode}/students`
                      : activeUser?.role?.toUpperCase() === "PROFESSOR" || activeUser?.role?.toUpperCase() === "TEACHER"
                      ? `/${activeUser?.instituteCode || instituteCode}/teachers`
                      : `/${activeUser?.instituteCode || instituteCode}`
                  }
                  onClick={() => {
                    try {
                      triggerNativeHaptic("light");
                    } catch {}
                    setContinuing(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] min-h-[48px] touch-manipulation cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                    color: "#FFFFFF",
                  }}
                >
                  <span>{continuing ? "Redirecting to Dashboard..." : "Continue to Dashboard"}</span>
                  {!continuing && <ArrowRight className="h-4 w-4" />}
                </Link>

                <Link
                  href={`/login?institute=${activeUser?.instituteCode || instituteCode}&force=true`}
                  onClick={() => {
                    try {
                      triggerNativeHaptic("medium");
                      logoutFromNative();
                      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                    } catch {}
                    setSwitching(true);
                  }}
                  className="w-full py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[44px] flex items-center justify-center active:scale-[0.98] touch-manipulation"
                >
                  {switching ? "Signing out..." : "Sign in with a different account"}
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card
            title={isDesktopAdminMode ? "Administrator Sign In" : "Sign In to Your Account"}
            description={
              isDesktopAdminMode
                ? `Dedicated administrator access for ${theme.name}.`
                : `Access your ${theme.name} courses and learning dashboard.`
            }
          >
            <div className="space-y-5">
              <InstituteSelector
                currentInstitute={instituteCode}
                onSelect={handleInstituteSelect}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                  <span
                    className="px-2.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${theme.colors.primary}10`,
                      borderColor: `${theme.colors.primary}30`,
                      color: theme.colors.primary,
                    }}
                  >
                    {instituteCode.toUpperCase()} Credentials
                  </span>
                </div>
              </div>

              <LoginForm
                theme={theme}
                instituteCode={instituteCode}
                isDesktopAdmin={isDesktopAdminMode}
              />
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
