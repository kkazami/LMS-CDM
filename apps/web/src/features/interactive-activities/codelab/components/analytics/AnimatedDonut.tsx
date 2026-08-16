"use client";

import { useEffect, useRef, useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string; // Hex or CSS color string
}

interface AnimatedDonutProps {
  segments: DonutSegment[];
  /** Total size in px */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Label shown in center */
  centerLabel?: string;
  /** Value shown in center (e.g. total count) */
  centerValue?: string | number;
}

export default function AnimatedDonut({
  segments,
  size = 160,
  strokeWidth = 22,
  centerLabel = "",
  centerValue = "",
}: AnimatedDonutProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const [animated, setAnimated] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => setAnimated(true));
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let cumulativeAngle = -90; // start from top

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-white/5"
          />
          {/* Segments */}
          {total > 0 &&
            segments.map((seg, i) => {
              const fraction = seg.value / total;
              const dashLen = fraction * circumference;
              const angle = cumulativeAngle;
              cumulativeAngle += fraction * 360;

              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${animated ? dashLen : 0} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="butt"
                  transform={`rotate(${angle} ${cx} ${cy})`}
                  style={{
                    transition: `stroke-dasharray 900ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
                  }}
                />
              );
            })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-black text-slate-900 dark:text-[#F0F2F8]">{centerValue}</span>
          <span className="text-[10px] text-slate-500 dark:text-[#8B92A5] uppercase font-bold tracking-wider">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full min-w-[180px]">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-[#8B92A5]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="font-medium truncate">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono shrink-0">
              <span className="text-slate-400 dark:text-[#555C72]">({seg.value})</span>
              <span className="font-bold text-slate-900 dark:text-[#F0F2F8]">
                {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
