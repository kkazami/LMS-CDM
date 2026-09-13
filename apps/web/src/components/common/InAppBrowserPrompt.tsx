"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  X,
  Share2,
  MoreHorizontal,
  Compass,
} from "lucide-react";

interface InAppDetectionResult {
  isInApp: boolean;
  appName?: string;
  isAndroid: boolean;
  isIOS: boolean;
}

function detectInAppBrowser(): InAppDetectionResult {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isInApp: false, isAndroid: false, isIOS: false };
  }

  // Never display in the official CdM LMS Mobile Application
  const win = window as unknown as { isLMSMobileApp?: boolean; __LMS_MOBILE_PLATFORM__?: string };
  if (win.isLMSMobileApp || win.__LMS_MOBILE_PLATFORM__) {
    return { isInApp: false, isAndroid: false, isIOS: false };
  }

  try {
    if (
      sessionStorage.getItem("cdm_is_mobile_app") === "true" ||
      localStorage.getItem("cdm_is_mobile_app") === "true" ||
      (typeof document !== "undefined" && document.cookie.includes("cdm_is_mobile_app=true")) ||
      sessionStorage.getItem("lumina_is_mobile_app") === "true" ||
      localStorage.getItem("lumina_is_mobile_app") === "true" ||
      (typeof document !== "undefined" && document.cookie.includes("lumina_is_mobile_app=true"))
    ) {
      return { isInApp: false, isAndroid: false, isIOS: false };
    }
  } catch {
    // ignore storage access errors
  }

  const ua = navigator.userAgent || navigator.vendor || "";
  if (/CdMLMS|LuminaLMS|LMSMobile/i.test(ua)) {
    return { isInApp: false, isAndroid: false, isIOS: false };
  }

  // Developer preview override via URL query ?preview_iab=1 or global flag
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("preview_iab") === "1" || (window as unknown as { __simulateIAB?: boolean }).__simulateIAB) {
      return { isInApp: true, appName: "In-App Browser (Preview)", isAndroid: false, isIOS: true };
    }
  } catch {
    // Ignore URL parse errors
  }

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Social & messaging embedded browsers
  if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) {
    return { isInApp: true, appName: "Facebook", isAndroid, isIOS };
  }
  if (/Instagram/i.test(ua)) {
    return { isInApp: true, appName: "Instagram", isAndroid, isIOS };
  }
  if (/Twitter|TwitterAndroid|TwitterforiPhone/i.test(ua)) {
    return { isInApp: true, appName: "X (Twitter)", isAndroid, isIOS };
  }
  if (/TikTok|musical_ly|ByteLocale|BytedanceWebview/i.test(ua)) {
    return { isInApp: true, appName: "TikTok", isAndroid, isIOS };
  }
  if (/Line\//i.test(ua)) {
    return { isInApp: true, appName: "LINE", isAndroid, isIOS };
  }
  if (/MicroMessenger/i.test(ua)) {
    return { isInApp: true, appName: "WeChat", isAndroid, isIOS };
  }
  if (/Discord/i.test(ua)) {
    return { isInApp: true, appName: "Discord", isAndroid, isIOS };
  }
  if (/Snapchat/i.test(ua)) {
    return { isInApp: true, appName: "Snapchat", isAndroid, isIOS };
  }
  if (/LinkedInApp/i.test(ua)) {
    return { isInApp: true, appName: "LinkedIn", isAndroid, isIOS };
  }
  if (/Telegram/i.test(ua)) {
    return { isInApp: true, appName: "Telegram", isAndroid, isIOS };
  }
  if (/Pinterest/i.test(ua)) {
    return { isInApp: true, appName: "Pinterest", isAndroid, isIOS };
  }

  // Generic Android WebView detection
  if (isAndroid && (/;\s*wv\b/i.test(ua) || /Version\/[\d.]+\s+Chrome/i.test(ua))) {
    return { isInApp: true, appName: "In-App Browser", isAndroid, isIOS };
  }

  // Generic iOS WebView detection (WebKit container without standard Safari / Chrome / Firefox identifiers)
  if (isIOS) {
    const isWebKit = /AppleWebKit/i.test(ua);
    const hasSafari = /Safari/i.test(ua);
    const isCriOS = /CriOS/i.test(ua);
    const isFxiOS = /FxiOS/i.test(ua);
    const isEdgiOS = /EdgiOS/i.test(ua);

    if (isWebKit && !hasSafari && !isCriOS && !isFxiOS && !isEdgiOS) {
      return { isInApp: true, appName: "In-App Browser", isAndroid, isIOS };
    }
  }

  return { isInApp: false, isAndroid, isIOS };
}

export default function InAppBrowserPrompt() {
  const [detection, setDetection] = useState<InAppDetectionResult | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem("lumina_iab_dismissed");
      if (dismissed === "1") {
        setIsDismissed(true);
        return;
      }
    } catch {
      // Storage access blocked in strict WebViews
    }

    const res = detectInAppBrowser();
    if (res.isInApp) {
      setDetection(res);
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setIsModalOpen(false);
    try {
      sessionStorage.setItem("lumina_iab_dismissed", "1");
    } catch {
      // Ignore
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback prompt
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    if (!detection) return;

    const currentUrl = window.location.href;

    // Android: use Chrome Intent scheme to kick open Chrome directly
    if (detection.isAndroid) {
      const cleanUrl = currentUrl.replace(/^https?:\/\//, "");
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      return;
    }

    // iOS or other: open instruction modal and copy link
    setIsModalOpen(true);
    handleCopyLink();
  }, [detection, handleCopyLink]);

  if (!detection?.isInApp || isDismissed) {
    return null;
  }

  return (
    <>
      {/* ── Top Floating Banner ── */}
      <aside
        aria-label="In-app browser recommendation"
        className="sticky top-0 z-[60] w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-md transition-all duration-300 animate-in slide-in-from-top"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="p-1 rounded-lg bg-white/15 shrink-0 flex items-center justify-center">
              <Compass className="w-4 h-4 text-amber-200 animate-spin-slow" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate text-[11px] sm:text-xs">
                <span className="hidden sm:inline font-bold">In-App Browser ({detection.appName || "Web View"}): </span>
                <span>Open in regular browser for downloads & full features.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenInBrowser}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white text-orange-900 font-bold text-[11px] sm:text-xs hover:bg-orange-50 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-orange-700" />
              <span>Open in Browser</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 sm:p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
              aria-label="Dismiss in-app browser notice"
              title="Continue in this in-app browser"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Instruction Modal (Essential for iOS / Fallback) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="iab-modal-title"
            className="relative z-10 w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 text-slate-900 dark:text-[#F0F2F8] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="iab-modal-title" className="text-base font-bold tracking-tight">
                    Open in Default Browser
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Detected: {detection.appName || "In-App Web View"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & Steps */}
            <div className="py-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                In-app browsers (like {detection.appName}) often restrict file downloads, 3D activity simulations, and session logins. For the complete CdM LMS experience:
              </p>

              {/* Step list */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-[#141721] p-3.5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    1
                  </span>
                  <p className="flex-1 leading-snug">
                    Tap the <span className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1 mx-0.5"><MoreHorizontal className="w-3.5 h-3.5 inline" /> menu</span> or <span className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1 mx-0.5"><Share2 className="w-3.5 h-3.5 inline" /> Share</span> icon in your screen&apos;s top or bottom corner.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    2
                  </span>
                  <p className="flex-1 leading-snug">
                    Select <span className="font-bold text-orange-600 dark:text-orange-400">&ldquo;Open in Safari&rdquo;</span> or <span className="font-bold text-orange-600 dark:text-orange-400">&ldquo;Open in Browser / Chrome&rdquo;</span>.
                  </p>
                </div>
              </div>

              {/* Quick Copy Link Option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22263A] hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-xs text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Link Copied! Paste in Safari or Chrome</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Current Link to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2 pb-[env(safe-area-inset-bottom)] sm:pb-0">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Continue in In-App Browser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
