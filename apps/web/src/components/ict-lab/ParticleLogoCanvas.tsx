"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { IctLabModuleId } from "@/lib/ict-lab/types";
import {
  ICT_MODULE_THEMES,
  sampleShapePoints,
  type Point2D,
} from "@/lib/ict-lab/particle-shapes";
import {
  stepParticles,
  isSettled,
  type ParticleState,
  type TargetPoint,
} from "@/lib/ict-lab/particle-physics";

interface ParticleLogoCanvasProps {
  moduleId: IctLabModuleId;
  isHovered: boolean;
  pointerPos: Point2D | null;
  className?: string;
}

interface ParticleWithRadius extends ParticleState {
  baseRadius: number;
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

  // Canvas animation loop and pure physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let shapeTargets: TargetPoint[] = [];
    let restTargets: TargetPoint[] = [];
    let particles: ParticleWithRadius[] = [];
    let currentAlpha = isHovered ? (isDark ? 0.75 : 0.65) : isDark ? 0.2 : 0.16;

    // Recompute particle target coordinates based on container size only (never pointer)
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

      shapeTargets = normalizedPoints.map((pt) => ({
        x: shapeOffsetX + pt.x * shapeSize,
        y: shapeOffsetY + pt.y * shapeSize,
      }));

      // Resting cluster in the bottom-right corner
      const clusterCenterX = width * 0.84;
      const clusterCenterY = height * 0.82;
      const clusterRadius = Math.min(width, height) * 0.16;

      restTargets = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = i * 2.39996;
        const r = Math.sqrt(i / PARTICLE_COUNT) * clusterRadius;
        restTargets.push({
          x: clusterCenterX + r * Math.cos(angle),
          y: clusterCenterY + r * Math.sin(angle),
        });
      }

      // Initialize particles if not already created
      if (particles.length === 0) {
        const initialTargets = isHovered ? shapeTargets : restTargets;
        particles = initialTargets.map((t, i) => ({
          x: t.x,
          y: t.y,
          vx: 0,
          vy: 0,
          baseRadius: 1.5 + (i % 3) * 0.6,
        }));
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

      const activeTargets = isHovered ? shapeTargets : restTargets;
      for (let i = 0; i < activeTargets.length; i++) {
        const t = activeTargets[i];
        const rad = 1.5 + (i % 3) * 0.6;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (prefersReducedMotion) {
      drawStatic();
      return () => {
        resizeObserver.disconnect();
      };
    }

    const render = () => {
      if (!ctx || width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      const active = isHovered;
      const currentTargets = active ? shapeTargets : restTargets;
      const targetAlpha = active ? (isDark ? 0.75 : 0.65) : isDark ? 0.2 : 0.16;

      // Pure physics step: spring toward fixed targets, damped velocity, local repel, and bounds clamp
      const nextStates = stepParticles(particles, currentTargets, {
        stiffness: 0.09,
        damping: 0.85,
        pointerPos: active ? pointerPos : null,
        repelRadius: 50,
        repelStrength: 1.2,
        bounds: { width, height },
      });

      // Update particle states preserving baseRadius
      for (let i = 0; i < particles.length; i++) {
        particles[i].x = nextStates[i].x;
        particles[i].y = nextStates[i].y;
        particles[i].vx = nextStates[i].vx;
        particles[i].vy = nextStates[i].vy;
      }

      // Alpha easing
      currentAlpha += (targetAlpha - currentAlpha) * 0.12;

      // Draw particle dots
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlpha.toFixed(3)})`;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Constellation connector lines when logo is active
      if (active) {
        const maxDist = 26;
        const lineAlpha = (isDark ? 0.18 : 0.14) * (currentAlpha / 0.75);
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

      // Settled check: stop rAF loop only when every particle is on target and alpha is settled
      const settled =
        isSettled(particles, currentTargets, { distance: 0.5, speed: 0.02 }) &&
        Math.abs(currentAlpha - targetAlpha) < 0.01;

      // Continue animation loop if not settled
      if (!settled && isVisible && document.visibilityState === "visible") {
        animId = requestAnimationFrame(render);
      } else {
        animId = null;
      }
    };

    // Trigger render loop on state change
    animId = requestAnimationFrame(render);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isVisible && !animId) {
        animId = requestAnimationFrame(render);
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
