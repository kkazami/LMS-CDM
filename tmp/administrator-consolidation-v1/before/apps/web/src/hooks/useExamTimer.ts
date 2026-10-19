"use client";

import { useState, useEffect, useRef } from "react";

export function useExamTimer(
  deadlineAt: string | Date | null | undefined,
  onExpire: () => void
) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => {
    if (!deadlineAt) return null;
    const diff = Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!deadlineAt) return;

    const interval = setInterval(() => {
      const remaining = Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        setSecondsLeft(0);
        onExpireRef.current();
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineAt]);

  return secondsLeft;
}
