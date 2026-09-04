"use client";

import { useState, useEffect } from "react";
import Card from "@/components/common/Card";
import RegisterForm from "@/components/forms/RegisterForm";
import InstituteSelector from "@/components/common/InstituteSelector";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isDesktopAdmin as isDesktopAdminCheck } from "@/lib/electron-detect";
import type { InstituteCode } from "@/lib/theme";
import { ShieldCheck, UserPlus } from "lucide-react";

type RegisterClientProps = {
  initialInstituteCode?: string;
  initialIsDesktopAdmin?: boolean;
};

export default function RegisterClient({
  initialInstituteCode = "ics",
  initialIsDesktopAdmin = false,
}: RegisterClientProps) {
  const [instituteCode, setInstituteCode] = useState<InstituteCode>(
    (initialInstituteCode?.toLowerCase() as InstituteCode) || "ics"
  );

  const [isDesktopAdminMode, setIsDesktopAdminMode] = useState<boolean>(initialIsDesktopAdmin);

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
              <UserPlus className="h-7 w-7" />
            )}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isDesktopAdminMode ? "Administrator Enrollment" : "Create Your Account"}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {theme.name}
          </p>
        </div>

        <Card
          title={isDesktopAdminMode ? "Register Administrator" : "Create your account"}
          description={
            isDesktopAdminMode
              ? `Create an administrative profile for ${theme.name}. No student number required.`
              : `Register for ${theme.name} and continue your learning journey.`
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
                  {instituteCode.toUpperCase()} {isDesktopAdminMode ? "Admin Profile" : "Registration"}
                </span>
              </div>
            </div>

            <RegisterForm
              theme={theme}
              instituteCode={instituteCode}
              isDesktopAdmin={isDesktopAdminMode}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
