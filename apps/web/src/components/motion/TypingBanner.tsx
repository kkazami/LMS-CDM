"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface TypingBannerProps {
  text: string;
  speed?: number;
  sessionKey?: string;
  className?: string;
}

function useShouldSkipAnimation(sessionKey: string): boolean {
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
      try {
        const alreadyTyped = sessionStorage.getItem(sessionKey) === "true";
        const prefersReduced =
          window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
          false;
        return Boolean(alreadyTyped || prefersReduced);
      } catch {
        return false;
      }
    },
    () => false
  );
}

export function TypingBanner({
  text,
  speed = 38,
  sessionKey = "lumina_typed_greeting",
  className,
}: TypingBannerProps) {
  const shouldSkipAnimation = useShouldSkipAnimation(sessionKey);

  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (shouldSkipAnimation) {
      setDisplayed(text);
      setShowCursor(false);
      return;
    }

    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        try {
          sessionStorage.setItem(sessionKey, "true");
        } catch {
          // ignore sessionStorage unavailable in restricted environments
        }
        timeoutId = setTimeout(() => setShowCursor(false), 900);
      }
    }, speed);

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [text, speed, shouldSkipAnimation, sessionKey]);

  const currentText = shouldSkipAnimation ? text : displayed;
  const currentCursor = shouldSkipAnimation ? false : showCursor;

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true" suppressHydrationWarning>
        {currentText}
      </span>
      {currentCursor && (
        <span
          className="inline-block w-[2px] ml-[2px] align-middle animate-blink"
          style={{ height: "0.9em", backgroundColor: "currentColor" }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

