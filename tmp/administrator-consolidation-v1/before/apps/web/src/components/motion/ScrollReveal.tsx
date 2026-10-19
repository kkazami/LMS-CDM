"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: "up" | "left" | "right" | "none";
  delay?: number;
  className?: string;
  once?: boolean;
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  className,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-60px 0px" });

  const directionMap = {
    up: { hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1 } },
    left: { hidden: { x: -24, opacity: 0 }, visible: { x: 0, opacity: 1 } },
    right: { hidden: { x: 24, opacity: 0 }, visible: { x: 0, opacity: 1 } },
    none: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  };

  return (
    <motion.div
      ref={ref}
      variants={directionMap[direction]}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
