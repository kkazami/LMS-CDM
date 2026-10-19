"use client";

import { useEffect, useRef, useState } from "react";

interface ExpProgressRingProps {
  percent: number;       // 0–100
  level: number;
  tierIcon: string;
  tierColor?: string;    // Tailwind CSS color class or hex
  size?: number;         // diameter in px, default 120
}

export default function ExpProgressRing({
  percent,
  level,
  tierIcon,
  size = 120,
}: ExpProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setAnimatedPercent(percent))
          );
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [percent]);

  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-white/5"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F97316"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1000ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl leading-none select-none">{tierIcon}</span>
        <span className="text-lg font-black text-slate-900 dark:text-[#F0F2F8] leading-none mt-1">
          {level}
        </span>
      </div>
    </div>
  );
}
