"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface NavigationProgressProps {
  /** The institute theme's primary color (e.g. "#E97451" for orange). */
  color: string;
}

/**
 * A thin progress bar at the very top of the viewport that sweeps
 * left-to-right during Next.js route navigations. Similar in feel
 * to YouTube's red bar or GitHub's blue bar.
 */
export default function NavigationProgress({ color }: NavigationProgressProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On route change → complete the bar
  useEffect(() => {
    if (visible) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setProgress(100);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Start bar on any link click (capture phase)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;

      // Don't restart if already running
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);

      setProgress(10);
      setVisible(true);

      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 85;
          }
          return p + Math.random() * 8;
        });
      }, 300);
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuenow={Math.round(progress)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        height: "3px",
        width: `${progress}%`,
        backgroundColor: color,
        transition:
          progress === 100
            ? "width 0.2s ease-out, opacity 0.3s ease 0.2s"
            : "width 0.3s ease",
        opacity: progress === 100 ? 0 : 1,
        borderRadius: "0 2px 2px 0",
        boxShadow: `0 0 8px ${color}88`,
      }}
    />
  );
}
