"use client";

import React, { useState, useEffect } from "react";
import type { MorphParticle } from "./constellations";

interface DotConstellationProps {
  /** Array of morph particle pairs */
  dots: MorphParticle[];
  /** Brand color for the dots */
  color: string;
  /** Whether the card is hovered */
  isHovered: boolean;
}

export default function DotConstellation({ dots, color, isHovered }: DotConstellationProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="geometricPrecision"
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      {dots.map((pt, i) => {
        const posX = isHovered ? pt.targetX : pt.idleX;
        const posY = isHovered ? pt.targetY : pt.idleY;
        const opacity = isHovered ? 0.95 : 0.15;
        const radius = isHovered ? pt.radius * 1.05 : pt.radius * 0.85;

        return (
          <circle
            key={i}
            cx={0}
            cy={0}
            r={Math.round(radius * 100) / 100}
            fill={color}
            style={{
              transform: `translate3d(${posX}px, ${posY}px, 0)`,
              opacity,
              willChange: "transform, opacity",
              transitionProperty: "transform, opacity",
              transitionDuration: isHovered ? "650ms" : "420ms",
              transitionTimingFunction: isHovered
                ? "cubic-bezier(0.16, 1, 0.3, 1)"
                : "cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDelay: `${isHovered ? pt.delay : (i % 6) * 16}ms`,
            }}
          />
        );
      })}
    </svg>
  );
}
