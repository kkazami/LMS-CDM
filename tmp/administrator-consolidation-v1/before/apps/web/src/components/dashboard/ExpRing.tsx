"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface ExpRingProps {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  color: string;
  size?: number;
}

export function ExpRing({
  level,
  currentExp,
  nextLevelExp,
  color,
  size = 88,
}: ExpRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const circleRef = useRef<SVGCircleElement>(null);

  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(currentExp / (nextLevelExp || 1), 0), 1);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    if (prefersReducedMotion) {
      circle.style.strokeDashoffset = String(circumference * (1 - progress));
      return;
    }

    const controls = animate(0, progress, {
      duration: 1.1,
      delay: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate(v) {
        circle.style.strokeDashoffset = String(circumference * (1 - v));
      },
    });

    return () => controls.stop();
  }, [currentExp, nextLevelExp, circumference, progress, prefersReducedMotion]);

  return (
    <div
      role="img"
      aria-label={`Level ${level}, ${currentExp} of ${nextLevelExp} experience points`}
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={6}
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-bold font-mono tabular-nums leading-none"
          style={{ fontSize: size * 0.27, color }}
        >
          {level}
        </span>
        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
          LVL
        </span>
      </div>
    </div>
  );
}
