"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface TypingBannerProps {
  text: string;
  speed?: number;
  sessionKey?: string;
  className?: string;
  cursorColor?: string;
  cursorClassName?: string;
  cursorHeight?: string;
  cursorWidth?: string;
  keepCursor?: boolean;
}

function useShouldSkipAnimation(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => {
      if (typeof window === "undefined") return false;
      return (
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
        false
      );
    },
    () => false
  );
}

export function TypingBanner({
  text,
  speed = 38,
  sessionKey,
  className,
  cursorColor = "#FF7517",
  cursorClassName,
  cursorHeight = "1em",
  cursorWidth = "0.085em",
  keepCursor = true,
}: TypingBannerProps) {
  const shouldSkipAnimation = useShouldSkipAnimation();

  const [mounted, setMounted] = useState(false);
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear any legacy sessionStorage flags so they never persist or suppress animation
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (sessionKey) {
          sessionStorage.removeItem(sessionKey);
        }
        sessionStorage.removeItem("cdm_typed_greeting");
        sessionStorage.removeItem("cdm_faculty_typed_greeting");
        sessionStorage.removeItem("lumina_typed_greeting");
        sessionStorage.removeItem("lumina_faculty_typed_greeting");
      } catch {
        // ignore sessionStorage unavailable in restricted environments
      }
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!mounted) return;

    if (shouldSkipAnimation) {
      setDisplayed(text);
      setShowCursor(keepCursor);
      return;
    }

    setDisplayed("");
    setShowCursor(true);

    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        if (!keepCursor) {
          timeoutId = setTimeout(() => setShowCursor(false), 1200);
        }
      }
    }, speed);

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mounted, text, speed, shouldSkipAnimation, keepCursor]);

  const currentText = !mounted ? text : shouldSkipAnimation ? text : displayed;
  const currentCursor = !mounted ? false : shouldSkipAnimation ? false : (keepCursor || showCursor);

  return (
    <span className={className} aria-label={text} suppressHydrationWarning>
      <span aria-hidden="true" suppressHydrationWarning>
        {currentText}
      </span>
      {currentCursor && (
        <span
          className={`inline-block ml-1 sm:ml-1.5 rounded-[1px] animate-blink ${cursorClassName ?? ""}`}
          style={{
            height: cursorHeight,
            width: cursorWidth,
            minWidth: "3.5px",
            backgroundColor: cursorColor,
            boxShadow: `0 0 10px ${cursorColor}99`,
            verticalAlign: "-0.1em",
          }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

