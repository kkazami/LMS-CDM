"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, AlertTriangle } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface MobileBlockerProps {
  theme?: InstituteTheme;
}

export default function MobileBlocker({ theme }: MobileBlockerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkViewport = () => {
      // Screens below 768px (standard mobile viewports) are blocked
      setIsMobile(window.innerWidth < 768);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  if (!mounted || !isMobile) return null;

  const accentColor = theme?.colors?.primary || "#3B82F6";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6">
      <div className="max-w-md w-full bg-white dark:bg-[#12151E] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 mb-5">
          <Smartphone className="w-8 h-8 text-amber-500" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Desktop or Tablet Required</span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Form Creation is Not Supported on Mobile
        </h2>

        <p className="text-sm text-slate-600 dark:text-[#8B92A5] leading-relaxed mb-6">
          The LMS Form Builder requires a wider workspace with drag-and-drop capabilities. Please access this page from a <strong>PC, laptop, or tablet in landscape mode</strong> to build or edit forms.
        </p>

        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-xs text-slate-500 dark:text-[#8B92A5]">
          <Monitor className="w-4 h-4 text-slate-400" />
          <span>Recommended minimum screen width: <strong>768px</strong></span>
        </div>
      </div>
    </div>
  );
}
