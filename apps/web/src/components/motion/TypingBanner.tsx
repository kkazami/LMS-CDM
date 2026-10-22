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
  const lastSpace = currentText.lastIndexOf(" ");

  return (
    <span className={`inline-grid max-w-full align-baseline ${className ?? ""}`} aria-label={text}>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{text}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {currentText.slice(0, lastSpace + 1)}
        <span className="whitespace-nowrap">
          {currentText.slice(lastSpace + 1)}
          {currentCursor && (
            <span
              className={`inline-block ml-0.5 rounded-[1px] animate-blink ${cursorClassName ?? ""}`}
              style={{
                height: cursorHeight,
                width: cursorWidth,
                backgroundColor: cursorColor,
                verticalAlign: "-0.1em",
              }}
              aria-hidden="true"
            />
          )}
        </span>
      </span>
    </span>
  );
}

