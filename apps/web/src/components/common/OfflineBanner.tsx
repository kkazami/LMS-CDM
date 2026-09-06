"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      if (wasOffline) {
        // Show brief "back online" flash
        const timer = setTimeout(() => setWasOffline(false), 3000);
        return () => clearTimeout(timer);
      }
    }

    function handleOffline() {
      setIsOffline(true);
      setWasOffline(true);
    }

    // Set initial state
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setWasOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
        isOffline
          ? "bg-amber-600 text-white shadow-md"
          : "bg-emerald-600 text-white shadow-sm"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
          <span>You are currently offline. Cached learning materials remain accessible.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Connection restored. Syncing data...</span>
        </>
      )}
    </div>
  );
}
