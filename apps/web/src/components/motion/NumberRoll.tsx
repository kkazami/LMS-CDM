"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface NumberRollProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function NumberRoll({
  value,
  duration = 0.8,
  className,
  suffix = "",
  prefix = "",
}: NumberRollProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion) {
      node.textContent = `${prefix}${value}${suffix}`;
      prevValueRef.current = value;
      return;
    }

    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = to;

    if (from === to) {
      node.textContent = `${prefix}${value}${suffix}`;
      return;
    }

    const controls = animate(from, to, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate(v) {
        node.textContent = `${prefix}${Math.round(v)}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [value, duration, prefix, suffix, prefersReducedMotion]);

  return (
    <span
      ref={ref}
      className={`font-mono tabular-nums ${className ?? ""}`}
      aria-live="polite"
      aria-label={`${prefix}${value}${suffix}`}
    >
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
