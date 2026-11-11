"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { IctLabModuleId } from "@/lib/ict-lab/types";
import {
  ICT_MODULE_THEMES,
  sampleShapePoints,
  type Point2D,
} from "@/lib/ict-lab/particle-shapes";

interface ParticleLogoCanvasProps {
  moduleId: IctLabModuleId;
  isHovered: boolean;
  pointerPos: Point2D | null;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  alpha: number;
  targetAlpha: number;
  restX: number;
  restY: number;
  shapeX: number;
  shapeY: number;
}

const PARTICLE_COUNT = 140;

export const ParticleLogoCanvas: React.FC<ParticleLogoCanvasProps> = ({
  moduleId,
  isHovered,
  pointerPos,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const theme = useMemo(() => ICT_MODULE_THEMES[moduleId], [moduleId]);

  // Normalized shape points (deterministic, 140 points)
  const normalizedPoints = useMemo(
    () => sampleShapePoints(theme.shape, PARTICLE_COUNT),
    [theme.shape]
  );

  // Monitor theme changes (light/dark mode on <html>)
  useEffect(() => {
    const updateTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Monitor prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // IntersectionObserver to pause when card is off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry?.isIntersecting ?? true);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Canvas animation loop and physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const particles: Particle[] = [];

    // Recompute particle target coordinates based on container size
    const updateDimensionsAndPoints = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(10, Math.floor(rect.width));
      height = Math.max(10, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Logo shape bounding box centered behind text
      const shapeSize = Math.min(width * 0.72, height * 0.65, 230);
      const shapeOffsetX = (width - shapeSize) / 2;
      const shapeOffsetY = height * 0.46 - shapeSize / 2;

      // Resting cluster in the bottom-right corner
      const clusterCenterX = width * 0.84;
      const clusterCenterY = height * 0.82;
      const clusterRadius = Math.min(width, height) * 0.16;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const normPt = normalizedPoints[i] || { x: 0.5, y: 0.5 };
        const shapeX = shapeOffsetX + normPt.x * shapeSize;
        const shapeY = shapeOffsetY + normPt.y * shapeSize;

        // Golden spiral cluster at rest
        const angle = i * 2.39996;
        const r = Math.sqrt(i / PARTICLE_COUNT) * clusterRadius;
        const restX = clusterCenterX + r * Math.cos(angle);
        const restY = clusterCenterY + r * Math.sin(angle);

        if (!particles[i]) {
          particles[i] = {
            x: restX,
            y: restY,
            vx: 0,
            vy: 0,
            baseRadius: 1.5 + (i % 3) * 0.6,
            alpha: 0.18,
            targetAlpha: 0.18,
            restX,
            restY,
            shapeX,
            shapeY,
          };
        } else {
          particles[i].shapeX = shapeX;
          particles[i].shapeY = shapeY;
          particles[i].restX = restX;
          particles[i].restY = restY;
        }
      }
    };

    updateDimensionsAndPoints();

    // ResizeObserver for responsive canvas scaling
    const resizeObserver = new ResizeObserver(() => {
      updateDimensionsAndPoints();
      if (prefersReducedMotion) {
        drawStatic();
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const [r, g, b] = theme.accentRgb;

    // Static render for prefers-reduced-motion
    const drawStatic = () => {
      if (!ctx || width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const alphaBase = isDark ? 0.35 : 0.28;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alphaBase})`;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const targetX = isHovered ? p.shapeX : p.restX;
        const targetY = isHovered ? p.shapeY : p.restY;
        ctx.beginPath();
        ctx.arc(targetX, targetY, p.baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (prefersReducedMotion) {
      drawStatic();
      return () => {
        resizeObserver.disconnect();
      };
    }

    let isSettled = false;

    const render = () => {
      if (!ctx || width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      const active = isHovered || pointerPos !== null;
      const targetAlpha = active ? (isDark ? 0.75 : 0.65) : isDark ? 0.2 : 0.16;

      let maxMotion = 0;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Target position
        let tx = active ? p.shapeX : p.restX;
        let ty = active ? p.shapeY : p.restY;

        // Interactive pointer attraction/repulsion if cursor is nearby
        if (pointerPos && active) {
          const dx = pointerPos.x - p.x;
          const dy = pointerPos.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 90 && dist > 1) {
            // Gentle fluid swirl toward pointer
            const factor = ((90 - dist) / 90) * 0.12;
            tx += dx * factor;
            ty += dy * factor;
          }
        }

        // Spring / ease physics
        const ax = (tx - p.x) * 0.085;
        const ay = (ty - p.y) * 0.085;
        p.vx = (p.vx + ax) * 0.78;
        p.vy = (p.vy + ay) * 0.78;
        p.x += p.vx;
        p.y += p.vy;

        // Alpha easing
        p.alpha += (targetAlpha - p.alpha) * 0.1;

        const motion = Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(targetAlpha - p.alpha);
        if (motion > maxMotion) maxMotion = motion;

        // Draw particle dot
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Constellation connector lines when active
      if (active) {
        const maxDist = 26;
        const lineAlpha = (isDark ? 0.18 : 0.14) * (active ? 1 : 0);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha.toFixed(3)})`;

        ctx.beginPath();
        for (let i = 0; i < particles.length; i += 2) {
          const p1 = particles[i];
          for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (dist < maxDist) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      // Settled check: stop rAF loop when velocities are near zero
      if (maxMotion < 0.008) {
        if (!isSettled) {
          isSettled = true;
        }
      } else {
        isSettled = false;
      }

      // If document hidden or off-screen, don't schedule next frame
      if (isVisible && document.visibilityState === "visible") {
        if (!isSettled || active) {
          animId = requestAnimationFrame(render);
        }
      }
    };

    // Wake up loop whenever hover/pointer/visibility/theme changes
    isSettled = false;
    animId = requestAnimationFrame(render);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isVisible) {
        isSettled = false;
        if (!animId) {
          animId = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    theme,
    normalizedPoints,
    isHovered,
    pointerPos,
    isDark,
    prefersReducedMotion,
    isVisible,
  ]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden rounded-2xl ${className ?? ""}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
};

