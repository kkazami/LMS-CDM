"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Flame,
  Trophy,
  Shield,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import type { PublicLeaderboardEntry } from "@/app/api/public/leaderboard/route";

interface GamificationSectionProps {
  reducedMotion: boolean;
  brand: {
    gold: string;
    goldLight: string;
    goldSubtle: string;
    red: string;
    redDeep: string;
    green: string;
    greenLight: string;
    navy: string;
    navyLight: string;
    cream: string;
    creamDark: string;
    white: string;
    slate: string;
    slateLight: string;
  };
}

export default function GamificationSection({
  reducedMotion,
  brand,
}: GamificationSectionProps) {
  // ─── Scroll Reveal Hook ───
  const sectionRef = useRef<HTMLDivElement>(null);
  const isSectionInView = useInView(sectionRef, { once: false, amount: 0.1 });

  // Synthetic resize-nudge on mount to ensure observers measure immediately on first paint
  useEffect(() => {
    const resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(resizeTimer);
  }, []);

  // Dynamic vertical grid alignment with Mission & Vision section (seam alignment)
  const [gridOffsetY, setGridOffsetY] = useState(28);

  useEffect(() => {
    function updateGridAlignment() {
      const mv = document.getElementById("mission-vision");
      if (!mv) return;
      const mvHeight = mv.getBoundingClientRect().height;
      // repeating-linear-gradient(0deg) in MV starts at its bottom.
      // (mvHeight % 48) is the distance from the top of MV to its first line.
      // Matching this offset ensures the 48px grid flows seamlessly across the seam.
      const rem = mvHeight % 48;
      setGridOffsetY(rem);
    }
    updateGridAlignment();
    window.addEventListener("resize", updateGridAlignment);
    return () => window.removeEventListener("resize", updateGridAlignment);
  }, []);

  // Leaderboard data state
  const [leaderboardEntries, setLeaderboardEntries] = useState<PublicLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);

  // Fetch top 6 students from public leaderboard endpoint
  useEffect(() => {
    let isMounted = true;
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/public/leaderboard");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          if (Array.isArray(data.entries) && data.entries.length > 0) {
            setLeaderboardEntries(data.entries.slice(0, 6));
          } else {
            setLeaderboardEntries([]);
          }
          setLeaderboardLoading(false);
        }
      } catch (err) {
        console.error("[LEADERBOARD_CLIENT_FETCH]", err);
        if (isMounted) {
          setLeaderboardError(true);
          setLeaderboardLoading(false);
        }
      }
    }
    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Pointer Collision Grid State & References
  // ─────────────────────────────────────────────────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cellElementsRef = useRef<(HTMLDivElement | null)[]>(new Array(400).fill(null));
  const intensitiesRef = useRef<Float32Array>(new Float32Array(400));
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const segmentsQueueRef = useRef<Array<{ x0: number; y0: number; x1: number; y1: number }>>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const isTouchDeviceRef = useRef<boolean>(false);

  // Single requestAnimationFrame decay & render loop
  const runFrame = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
    lastFrameTimeRef.current = now;

    const container = gridContainerRef.current;
    if (!container) {
      rafIdRef.current = null;
      return;
    }

    const isLg = window.innerWidth >= 1024;
    const currentGridDim = isLg ? 20 : 12;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 1. Process swept segments
    if (segmentsQueueRef.current.length > 0 && width > 0 && height > 0) {
      const cellW = width / currentGridDim;
      const cellH = height / currentGridDim;
      const queue = segmentsQueueRef.current;
      segmentsQueueRef.current = [];

      for (let q = 0; q < queue.length; q++) {
        const seg = queue[q];
        const dx = seg.x1 - seg.x0;
        const dy = seg.y1 - seg.y0;
        const dist = Math.hypot(dx, dy);
        // Sub-cell step to guarantee 100% continuous coverage with no gaps
        const stepSize = Math.max(2, Math.min(cellW, cellH) * 0.35);
        const steps = Math.max(1, Math.ceil(dist / stepSize));

        for (let s = 0; s <= steps; s++) {
          const t = steps === 0 ? 0 : s / steps;
          const px = seg.x0 + dx * t;
          const py = seg.y0 + dy * t;

          const col = Math.min(currentGridDim - 1, Math.max(0, Math.floor(px / cellW)));
          const row = Math.min(currentGridDim - 1, Math.max(0, Math.floor(py / cellH)));
          const index = row * 20 + col;

          if (index >= 0 && index < 400) {
            intensitiesRef.current[index] = 1.0;
            const el = cellElementsRef.current[index];
            if (el) {
              el.style.setProperty("--lit", "1");
            }
          }
        }
      }
    }

    // 2. Progressive decay (~750ms decay rate)
    const decayRate = dt / 0.75;
    let hasActiveCells = false;

    for (let i = 0; i < 400; i++) {
      const currentVal = intensitiesRef.current[i];
      if (currentVal > 0) {
        const nextVal = Math.max(0, currentVal - decayRate);
        intensitiesRef.current[i] = nextVal;
        const el = cellElementsRef.current[i];
        if (el) {
          if (nextVal > 0.01) {
            el.style.setProperty("--lit", nextVal.toFixed(3));
            hasActiveCells = true;
          } else {
            intensitiesRef.current[i] = 0;
            el.style.setProperty("--lit", "0");
          }
        }
      }
    }

    if (hasActiveCells || segmentsQueueRef.current.length > 0) {
      rafIdRef.current = requestAnimationFrame(runFrame);
    } else {
      rafIdRef.current = null;
    }
  }, []);

  const ensureAnimationLoop = useCallback(() => {
    if (!rafIdRef.current) {
      lastFrameTimeRef.current = performance.now();
      rafIdRef.current = requestAnimationFrame(runFrame);
    }
  }, [runFrame]);

  // Pointer event handlers (always active, not gated on reveal)
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPosRef.current = { x, y };
    segmentsQueueRef.current.push({ x0: x, y0: y, x1: x, y1: y });
    ensureAnimationLoop();
  }, [reducedMotion, ensureAnimationLoop]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastPosRef.current) {
      segmentsQueueRef.current.push({
        x0: lastPosRef.current.x,
        y0: lastPosRef.current.y,
        x1: x,
        y1: y,
      });
    } else {
      segmentsQueueRef.current.push({ x0: x, y0: y, x1: x, y1: y });
    }
    lastPosRef.current = { x, y };
    ensureAnimationLoop();
  }, [reducedMotion, ensureAnimationLoop]);

  const handlePointerLeave = useCallback(() => {
    lastPosRef.current = null;
  }, []);

  // Ambient shimmer for non-hover/touch devices (no trail/shimmer if reducedMotion)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    isTouchDeviceRef.current = !mediaQuery.matches;

    if (!isTouchDeviceRef.current || reducedMotion) {
      return;
    }

    // Run subtle random shimmer pulses on non-hover devices
    const interval = setInterval(() => {
      const isLg = window.innerWidth >= 1024;
      const dim = isLg ? 20 : 12;
      const count = 2 + Math.floor(Math.random() * 3);

      for (let k = 0; k < count; k++) {
        const r = Math.floor(Math.random() * dim);
        const c = Math.floor(Math.random() * dim);
        const idx = r * 20 + c;
        intensitiesRef.current[idx] = 0.75 + Math.random() * 0.25;
        cellElementsRef.current[idx]?.style.setProperty("--lit", intensitiesRef.current[idx].toFixed(2));
      }
      ensureAnimationLoop();
    }, 1400);

    return () => clearInterval(interval);
  }, [reducedMotion, ensureAnimationLoop]);

  // Cleanup rAF loop on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // 7-day streak definitions
  const streakDays = [
    { label: "M", completed: true },
    { label: "T", completed: true },
    { label: "W", completed: true },
    { label: "T", completed: true },
    { label: "F", completed: true },
    { label: "S", completed: true },
    { label: "S", completed: false, current: true },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      style={{
        backgroundImage: [
          /* Warm amber radial glow from top-center */
          "radial-gradient(ellipse 80% 45% at 50% 0%, rgba(245,196,0,0.07) 0%, transparent 70%)",
          /* Warm amber radial glow from bottom-center (merging seamlessly with Mission & Vision top glow) */
          "radial-gradient(ellipse 80% 45% at 50% 100%, rgba(245,196,0,0.07) 0%, transparent 70%)",
          /* Graph-paper vertical lines */
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 48px)",
          /* Graph-paper horizontal lines */
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 48px)",
        ].join(", "),
        backgroundPosition: [
          "0% 0%",
          "0% 100%",
          "0px 0px",
          `0px ${gridOffsetY}px`,
        ].join(", "),
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ─── Section Header (Staggered Children 1, 2, 3) ─── */}
        <div className="mb-12 sm:mb-16">
          {/* Child 1: Eyebrow */}
          <motion.div
            className="flex items-center gap-2 mb-3"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isSectionInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: 0,
            }}
          >
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase border"
              style={{
                backgroundColor: "rgba(245, 196, 0, 0.08)",
                borderColor: "rgba(245, 196, 0, 0.28)",
                color: brand.gold,
              }}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Academic Mastery &amp; Progress
            </span>
          </motion.div>

          {/* Child 2: Heading */}
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white tracking-tight leading-[1.15]"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isSectionInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.05,
            }}
          >
            Your Dedication Measured.{" "}
            <span style={{ color: brand.gold }}>Every Milestone Rewarded.</span>
          </motion.h2>

          {/* Child 3: Subheading */}
          <motion.p
            className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isSectionInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.10,
            }}
          >
            Build daily study streaks, climb campus rank tiers, and earn verified recognition across your coursework.
          </motion.p>
        </div>

        {/* ─── Two-Column 12-col Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ════════════════════════════════════════════════════════════
              LEFT COLUMN (~5/12): Gamification Showcase (2 Cards Only)
             ════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* ── CARD 1: Daily Login Streak (Child 4) ── */}
            <motion.div
              className="relative rounded-2xl border p-6 sm:p-7 backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
              animate={
                isSectionInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reducedMotion ? 0 : 20 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.45,
                ease: "easeOut",
                delay: reducedMotion ? 0 : 0.15,
              }}
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(255, 255, 255, 0.10)",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Accent top border */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{
                  background: `linear-gradient(90deg, ${brand.gold}, rgba(245,196,0,0.2))`,
                }}
              />

              {/* Card Header with Tracked Label + Illustrative Preview Badge */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span
                    className="text-xs font-bold tracking-[0.2em] uppercase"
                    style={{ color: brand.gold }}
                  >
                    Daily Login Streak
                  </span>
                </div>

                {/* Illustrative Preview Badge matching Platform Preview convention */}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border"
                  style={{
                    backgroundColor: "rgba(245, 196, 0, 0.08)",
                    borderColor: "rgba(245, 196, 0, 0.28)",
                    color: brand.gold,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Preview
                </span>
              </div>

              {/* Big Numeral + Subtext */}
              <div className="mb-6">
                <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-2">
                  <span>14</span>
                  <span className="text-amber-400 text-2xl font-sans font-bold">🔥</span>
                </div>
                <div className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
                  consecutive days
                </div>
              </div>

              {/* Row of 7 Day Cells (M T W T F S S) */}
              <div className="grid grid-cols-7 gap-2 mb-5">
                {streakDays.map((day, idx) => {
                  if (day.completed) {
                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center justify-center py-2.5 rounded-xl border transition-colors"
                        style={{
                          backgroundColor: "rgba(245, 196, 0, 0.12)",
                          borderColor: "rgba(245, 196, 0, 0.35)",
                        }}
                      >
                        <Flame className="w-4 h-4 fill-amber-400 text-amber-400 mb-1" />
                        <span className="text-[11px] font-bold text-amber-300 font-mono">
                          {day.label}
                        </span>
                      </div>
                    );
                  }

                  // Current incomplete day: dashed outline tile
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-center py-2.5 rounded-xl border-2 border-dashed transition-colors"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        borderColor: "rgba(245, 196, 0, 0.40)",
                      }}
                    >
                      <Flame className="w-4 h-4 text-amber-500/40 mb-1" />
                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Two Status Pill Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.08]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Streak freeze equipped
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Daily EXP claimed
                </div>
              </div>
            </motion.div>

            {/* ── CARD 2: Campus Leaderboard (Child 5) ── */}
            <motion.div
              className="relative rounded-2xl border p-6 sm:p-7 backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
              animate={
                isSectionInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reducedMotion ? 0 : 20 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.45,
                ease: "easeOut",
                delay: reducedMotion ? 0 : 0.20,
              }}
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(255, 255, 255, 0.10)",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Accent top border */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{
                  background: `linear-gradient(90deg, ${brand.gold}, rgba(245,196,0,0.2))`,
                }}
              />

              {/* Card Header */}
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span
                  className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ color: brand.gold }}
                >
                  Campus Leaderboard
                </span>
              </div>

              {/* Leaderboard Content */}
              {leaderboardLoading ? (
                // 6 Loading Skeleton Rows
                <div className="space-y-2.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.05] animate-pulse"
                    />
                  ))}
                </div>
              ) : leaderboardError || leaderboardEntries.length === 0 ? (
                // Quiet unavailable state rather than throwing or zeros
                <div className="py-10 text-center rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-sm font-medium text-slate-400">
                    Leaderboard unavailable
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Student rankings update hourly based on coursework activity.
                  </p>
                </div>
              ) : (
                // 6 Real Opted-In Rows
                <div className="space-y-2">
                  {leaderboardEntries.map((student, idx) => {
                    const rank = idx + 1;
                    const isTop1 = rank === 1;
                    const isTop2 = rank === 2;
                    const isTop3 = rank === 3;
                    const isTop3Overall = rank <= 3;

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors"
                        style={{
                          backgroundColor: isTop3Overall
                            ? "rgba(245, 196, 0, 0.05)"
                            : "rgba(255, 255, 255, 0.02)",
                          borderColor: isTop3Overall
                            ? "rgba(245, 196, 0, 0.18)"
                            : "rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        {/* Rank Badge */}
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0 border"
                          style={
                            isTop1
                              ? {
                                  backgroundColor: "rgba(245, 196, 0, 0.30)",
                                  borderColor: "rgba(245, 196, 0, 0.65)",
                                  color: "#FFDE40",
                                  boxShadow: "0 0 10px rgba(245, 196, 0, 0.35)",
                                }
                              : isTop2
                              ? {
                                  backgroundColor: "rgba(245, 196, 0, 0.20)",
                                  borderColor: "rgba(245, 196, 0, 0.45)",
                                  color: "#FFDE40",
                                }
                              : isTop3
                              ? {
                                  backgroundColor: "rgba(245, 196, 0, 0.12)",
                                  borderColor: "rgba(245, 196, 0, 0.30)",
                                  color: "#FFDE40",
                                }
                              : {
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  borderColor: "rgba(255, 255, 255, 0.10)",
                                  color: "#94A3B8",
                                }
                          }
                        >
                          {rank}
                        </div>

                        {/* Student Name & Tier */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-100 truncate">
                            {student.displayName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {student.tier} Tier
                          </div>
                        </div>

                        {/* EXP Total */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold font-mono text-amber-400 tabular-nums">
                            {student.exp.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-amber-400/70 ml-1 font-sans font-bold">
                            EXP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              RIGHT COLUMN (~7/12): Pointer Collision Grid (Child 6)
             ════════════════════════════════════════════════════════════ */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
            animate={
              isSectionInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 20 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.25,
            }}
          >
            <div
              className="relative rounded-2xl border p-6 sm:p-8 backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(255, 255, 255, 0.10)",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Accent top border */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{
                  background: `linear-gradient(90deg, ${brand.gold}, rgba(245,196,0,0.2))`,
                }}
              />

              {/* Grid Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span
                      className="text-xs font-bold tracking-[0.2em] uppercase"
                      style={{ color: brand.gold }}
                    >
                      Interactive Kinetic Matrix
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Sweep your pointer across the matrix to trace real-time kinetic energy.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto">
                  <span className="hidden lg:inline">20×20 Matrix</span>
                  <span className="lg:hidden">12×12 Matrix</span>
                </div>
              </div>

              {/* ── Square Grid Wrapper with Reserved Height ── */}
              <div className="w-full max-w-[520px] mx-auto aspect-square select-none touch-none">
                <div
                  ref={gridContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerLeave={handlePointerLeave}
                  onPointerUp={handlePointerLeave}
                  onPointerCancel={handlePointerLeave}
                  className="w-full h-full grid grid-cols-12 lg:grid-cols-20 gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-2xl bg-black/40 border border-white/[0.08] cursor-crosshair relative overflow-hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {Array.from({ length: 400 }).map((_, index) => {
                    const row = Math.floor(index / 20);
                    const col = index % 20;
                    // On mobile (<lg), hide any cells outside the 12x12 boundary
                    const isOutsideMobileGrid = row >= 12 || col >= 12;

                    return (
                      <div
                        key={index}
                        ref={(el) => {
                          cellElementsRef.current[index] = el;
                        }}
                        className={`relative aspect-square rounded-[3px] border border-white/[0.08] overflow-hidden ${
                          isOutsideMobileGrid ? "max-lg:hidden" : ""
                        }`}
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.015)",
                        }}
                      >
                        {/* Lit layer driven purely by CSS custom property --lit */}
                        <div
                          className="absolute inset-0 bg-amber-400 rounded-[2px] pointer-events-none transition-none"
                          style={{
                            opacity: "var(--lit, 0)",
                            boxShadow: "0 0 14px rgba(245, 196, 0, 0.85)",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
