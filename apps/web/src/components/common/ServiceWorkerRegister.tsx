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

    // Always unregister any legacy ITE-scoped offline service worker (/ite-sw.js) and purge its caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        if (
          reg.scope.includes("/ite") ||
          reg.active?.scriptURL.includes("ite-sw.js") ||
          reg.waiting?.scriptURL.includes("ite-sw.js") ||
          reg.installing?.scriptURL.includes("ite-sw.js")
        ) {
          void reg.unregister();
        }
      }
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith("ite-offline-")) {
            void caches.delete(key);
          }
        }
      });
    }

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

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          void registration.update();
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
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
