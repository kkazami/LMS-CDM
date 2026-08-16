"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpNumberProps {
  /** Target value */
  value: number;
  /** Optional suffix appended after the number (e.g. "%" or "ms") */
  suffix?: string;
  /** Optional prefix (e.g. "$") */
  prefix?: string;
  /** Duration of the count-up animation in ms. Default: 1200 */
  duration?: number;
  /** CSS class for the wrapping span */
  className?: string;
  /** Number of decimal places. Default: 0 */
  decimals?: number;
}

export default function CountUpNumber({
  value,
  suffix = "",
  prefix = "",
  duration = 1200,
  className = "",
  decimals = 0,
}: CountUpNumberProps) {
  const [displayed, setDisplayed] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Trigger when element enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Count-up animation using requestAnimationFrame
  useEffect(() => {
    if (!hasStarted) return;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(parseFloat((eased * value).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [hasStarted, value, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}{displayed.toFixed(decimals)}{suffix}
    </span>
  );
}
