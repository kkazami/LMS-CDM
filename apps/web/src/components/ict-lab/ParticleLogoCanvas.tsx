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

export interface ParticleLogoCanvasProps {
  moduleId: IctLabModuleId;
  isHovered: boolean;
  pointerPos?: Point2D | null;
  pointerPosRef?: React.RefObject<Point2D | null>;
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
  pointerPosRef,
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

  // Persistent references across renders (created once per mount)
  const particlesRef = useRef<ParticleWithRadius[]>([]);
  const shapeTargetsRef = useRef<TargetPoint[]>([]);
  const restTargetsRef = useRef<TargetPoint[]>([]);
  const currentAlphaRef = useRef<number>(isDark ? 0.2 : 0.16);
  const animIdRef = useRef<number | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const isHoveredRef = useRef(isHovered);
  isHoveredRef.current = isHovered;

  const pointerPosFallbackRef = useRef<Point2D | null>(pointerPos ?? null);
  if (pointerPos !== undefined) {
    pointerPosFallbackRef.current = pointerPos;
  }

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

  // Recompute targets and clamp existing particles on container resize (never recreates particles)
  const updateDimensionsAndTargets = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(10, Math.floor(rect.width));
    const height = Math.max(10, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    dimensionsRef.current = { width, height };

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Fixed logo shape targets
    const shapeSize = Math.min(width * 0.72, height * 0.65, 230);
    const shapeOffsetX = (width - shapeSize) / 2;
    const shapeOffsetY = height * 0.46 - shapeSize / 2;

    shapeTargetsRef.current = normalizedPoints.map((pt) => ({
      x: shapeOffsetX + pt.x * shapeSize,
      y: shapeOffsetY + pt.y * shapeSize,
    }));

    // Fixed resting cluster targets
    const clusterCenterX = width * 0.84;
    const clusterCenterY = height * 0.82;
    const clusterRadius = Math.min(width, height) * 0.16;

    const newRestTargets: TargetPoint[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = i * 2.39996;
      const r = Math.sqrt(i / PARTICLE_COUNT) * clusterRadius;
      newRestTargets.push({
        x: clusterCenterX + r * Math.cos(angle),
        y: clusterCenterY + r * Math.sin(angle),
      });
    }
    restTargetsRef.current = newRestTargets;

    // Initialize particles on first mount only
    if (particlesRef.current.length === 0) {
      const initialTargets = isHoveredRef.current ? shapeTargetsRef.current : restTargetsRef.current;
      particlesRef.current = initialTargets.map((t, i) => ({
        x: t.x,
        y: t.y,
        vx: 0,
        vy: 0,
        baseRadius: 1.5 + (i % 3) * 0.6,
      }));
    } else {
      // On resize, clamp existing positions to new bounds
      for (const p of particlesRef.current) {
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));
      }
    }
  };

  // Main canvas animation effect: runs once per mount, independent of pointer moves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    updateDimensionsAndTargets(canvas, ctx);

    const [r, g, b] = theme.accentRgb;

    // Static render for reduced-motion
    const drawStatic = () => {
      const { width, height } = dimensionsRef.current;
      if (!ctx || width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const alphaBase = isDark ? 0.35 : 0.28;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alphaBase})`;

      const activeTargets = isHoveredRef.current ? shapeTargetsRef.current : restTargetsRef.current;
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
      return;
    }

    // Animation frame loop
    const render = () => {
      const { width, height } = dimensionsRef.current;
      if (!ctx || width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      const active = isHoveredRef.current;
      const currentTargets = active ? shapeTargetsRef.current : restTargetsRef.current;
      // Alpha is a CONSTANT per mode and NEVER fluctuates with mouse movement
      const targetAlpha = active ? (isDark ? 0.75 : 0.65) : isDark ? 0.2 : 0.16;

      const currentPointer = pointerPosRef?.current ?? pointerPosFallbackRef.current;

      // Pure physics step
      const nextStates = stepParticles(particlesRef.current, currentTargets, {
        stiffness: 0.09,
        damping: 0.85,
        pointerPos: active ? currentPointer : null,
        repelRadius: 50,
        repelStrength: 1.2,
        bounds: { width, height },
      });

      for (let i = 0; i < particlesRef.current.length; i++) {
        particlesRef.current[i].x = nextStates[i].x;
        particlesRef.current[i].y = nextStates[i].y;
        particlesRef.current[i].vx = nextStates[i].vx;
        particlesRef.current[i].vy = nextStates[i].vy;
      }

      // Smooth alpha transition between modes
      currentAlphaRef.current += (targetAlpha - currentAlphaRef.current) * 0.12;

      // Draw particle dots
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlphaRef.current.toFixed(3)})`;
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Constellation connector lines when logo is active
      if (active) {
        const maxDist = 26;
        const lineAlpha = (isDark ? 0.18 : 0.14) * (currentAlphaRef.current / 0.75);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha.toFixed(3)})`;

        ctx.beginPath();
        for (let i = 0; i < particlesRef.current.length; i += 2) {
          const p1 = particlesRef.current[i];
          for (let j = i + 1; j < Math.min(i + 8, particlesRef.current.length); j++) {
            const p2 = particlesRef.current[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (dist < maxDist) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      // Exact settled check: stops rAF only when every particle is on target and alpha is settled
      const settled =
        isSettled(particlesRef.current, currentTargets, { distance: 0.5, speed: 0.02 }) &&
        Math.abs(currentAlphaRef.current - targetAlpha) < 0.01;

      if (!settled && isVisible && document.visibilityState === "visible") {
        animIdRef.current = requestAnimationFrame(render);
      } else {
        animIdRef.current = null;
      }
    };

    // Wake loop helper
    const wakeLoop = () => {
      if (animIdRef.current === null && isVisible && document.visibilityState === "visible") {
        animIdRef.current = requestAnimationFrame(render);
      }
    };

    wakeLoop();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensionsAndTargets(canvas, ctx);
      wakeLoop();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isVisible) {
        wakeLoop();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    theme,
    normalizedPoints,
    isDark,
    prefersReducedMotion,
    isVisible,
  ]);

  // Separate wake-up effect on hover/focus change: never tears down canvas or particles
  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (animIdRef.current === null && isVisible && document.visibilityState === "visible") {
      // Trigger a render step
      const render = () => {
        const { width, height } = dimensionsRef.current;
        if (!ctx || width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);

        const active = isHoveredRef.current;
        const currentTargets = active ? shapeTargetsRef.current : restTargetsRef.current;
        const targetAlpha = active ? (isDark ? 0.75 : 0.65) : isDark ? 0.2 : 0.16;

        const currentPointer = pointerPosRef?.current ?? pointerPosFallbackRef.current;

        const nextStates = stepParticles(particlesRef.current, currentTargets, {
          stiffness: 0.09,
          damping: 0.85,
          pointerPos: active ? currentPointer : null,
          repelRadius: 50,
          repelStrength: 1.2,
          bounds: { width, height },
        });

        for (let i = 0; i < particlesRef.current.length; i++) {
          particlesRef.current[i].x = nextStates[i].x;
          particlesRef.current[i].y = nextStates[i].y;
          particlesRef.current[i].vx = nextStates[i].vx;
          particlesRef.current[i].vy = nextStates[i].vy;
        }

        currentAlphaRef.current += (targetAlpha - currentAlphaRef.current) * 0.12;

        const [r, g, b] = theme.accentRgb;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlphaRef.current.toFixed(3)})`;
        for (let i = 0; i < particlesRef.current.length; i++) {
          const p = particlesRef.current[i];
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (active) {
          const maxDist = 26;
          const lineAlpha = (isDark ? 0.18 : 0.14) * (currentAlphaRef.current / 0.75);
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha.toFixed(3)})`;

          ctx.beginPath();
          for (let i = 0; i < particlesRef.current.length; i += 2) {
            const p1 = particlesRef.current[i];
            for (let j = i + 1; j < Math.min(i + 8, particlesRef.current.length); j++) {
              const p2 = particlesRef.current[j];
              const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              if (dist < maxDist) {
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
              }
            }
          }
          ctx.stroke();
        }

        const settled =
          isSettled(particlesRef.current, currentTargets, { distance: 0.5, speed: 0.02 }) &&
          Math.abs(currentAlphaRef.current - targetAlpha) < 0.01;

        if (!settled && isVisible && document.visibilityState === "visible") {
          animIdRef.current = requestAnimationFrame(render);
        } else {
          animIdRef.current = null;
        }
      };

      animIdRef.current = requestAnimationFrame(render);
    }
  }, [isHovered, isDark, prefersReducedMotion, isVisible, theme]);

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
