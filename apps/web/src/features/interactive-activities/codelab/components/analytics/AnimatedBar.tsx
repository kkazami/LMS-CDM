"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedBarProps {
  /** 0–100 */
  percent: number;
  /** Tailwind background color class (e.g. "bg-emerald-500") */
  colorClass?: string;
  /** Height in Tailwind (e.g. "h-2", "h-3") */
  heightClass?: string;
  /** Show percentage label at the right end */
  showLabel?: boolean;
  /** Duration in ms */
  duration?: number;
}

export default function AnimatedBar({
  percent,
  colorClass = "bg-emerald-500",
  heightClass = "h-2",
  showLabel = false,
  duration = 900,
}: AnimatedBarProps) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setWidth(Math.min(Math.max(percent, 0), 100)));
          });
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [percent]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div ref={ref} className={`flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} ${colorClass} rounded-full`}
          style={{
            width: `${width}%`,
            transition: `width ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 dark:text-[#8B92A5] font-mono shrink-0">
          {percent}%
        </span>
      )}
    </div>
  );
}
