"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development or when embedded inside the mobile app WebView, disable and unregister SW
    const isMobile =
      Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) ||
      Boolean((window as unknown as { isLMSMobileApp?: boolean }).isLMSMobileApp) ||
      navigator.userAgent.includes("CdMLMS") ||
      navigator.userAgent.includes("LuminaLMS");

    if (process.env.NODE_ENV !== "production" || isMobile) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[SW] New version available, refresh to update.");
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn("[SW] Registration failed:", error);
        });
    });
  }, []);

  return null;
}
