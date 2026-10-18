"use client";

import React, { useRef, useEffect } from "react";
import {
  Globe,
  Smartphone,
  Monitor,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { motion, useInView } from "framer-motion";

interface MultiPlatformSectionProps {
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

// Confirmed real dependencies from package.json and prisma/schema.prisma
const TECH_STACK_CHIPS = [
  "Next.js 16 (App Router)",
  "React 19",
  "TypeScript 5",
  "Tailwind CSS 4",
  "Prisma 7 (ORM)",
  "PostgreSQL",
  "Framer Motion",
  "Lucide React",
  "Monaco Editor",
  "Zod",
  "Zustand",
] as const;

export default function MultiPlatformSection({
  reducedMotion,
  brand,
}: MultiPlatformSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isSectionInView = useInView(sectionRef, { once: false, amount: 0.1 });

  // Synthetic resize-nudge on mount to ensure observers measure immediately on first paint
  useEffect(() => {
    const resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(resizeTimer);
  }, []);

  return (
    <section
      id="multi-platform"
      ref={sectionRef}
      className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      style={{ backgroundColor: "#0B0F19" }}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ─── Centered Section Header (Eyebrow, Heading, Subheading) ─── */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Eyebrow */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-3"
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
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Multi-Platform Ecosystem
            </span>
          </motion.div>

          {/* Heading */}
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
            One Unified Campus.{" "}
            <span style={{ color: brand.gold }}>Built for Every Workflow.</span>
          </motion.h2>

          {/* Subheading */}
          <motion.p
            className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isSectionInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.1,
            }}
          >
            Access your academic coursework in your browser today, with dedicated
            mobile and administrative desktop experiences currently in active development.
          </motion.p>
        </div>

        {/* ─── Three Cards Grid (1 col on mobile, 3 cols on desktop) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* ════════════════════════════════════════════════════════════
              CARD 1: Web App [Available now] — Shipped / Primary Experience
             ════════════════════════════════════════════════════════════ */}
          <motion.div
            className="relative rounded-2xl border p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:shadow-2xl"
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
              borderColor: "rgba(255, 255, 255, 0.15)",
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Top gold accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{
                background: `linear-gradient(90deg, ${brand.gold}, rgba(245,196,0,0.2))`,
              }}
            />

            <div>
              {/* Header: Icon + Status Pill */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: "rgba(245, 196, 0, 0.10)",
                    borderColor: "rgba(245, 196, 0, 0.30)",
                    color: brand.gold,
                  }}
                >
                  <Globe className="w-5 h-5" />
                </div>

                {/* Available now status pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Available now
                </span>
              </div>

              {/* Title & Gold Subtitle */}
              <div>
                <span
                  className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ color: brand.gold }}
                >
                  Primary experience
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                  Web App
                </h3>
              </div>

              {/* Factual Description */}
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                The complete Colegio de Montalban academic platform delivered directly in any modern desktop or mobile browser.
              </p>

              {/* Verified Capabilities (only features implemented in this repo) */}
              <div className="mt-5 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Shipped Features
                </div>
                {[
                  "Department portals for ICS, ITE, and IBE",
                  "Course syllabi, classwork, and interactive modules",
                  "Quiz submissions with automated integrity monitoring",
                  "Midterm & final gradebook records with GPA tracking",
                  "Campus-wide official advisories and department notices",
                ].map((cap, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Working Anchor Button to Institutes */}
            <div className="mt-7 pt-4 border-t border-white/[0.08]">
              <a
                href="#departments"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("departments")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs tracking-wider uppercase text-amber-400 border transition-all duration-200 hover:brightness-125 hover:shadow-lg active:scale-[0.98] group cursor-pointer"
                style={{
                  backgroundColor: "rgba(245, 196, 0, 0.10)",
                  borderColor: "rgba(245, 196, 0, 0.35)",
                }}
              >
                <span>Enter the portal</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════════════════
              CARD 2: Mobile App [In development] — Visually Emphasized
             ════════════════════════════════════════════════════════════ */}
          <motion.div
            className="relative rounded-2xl border p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:shadow-2xl lg:-translate-y-2"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
            animate={
              isSectionInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 20 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.22,
            }}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              borderColor: "rgba(245, 196, 0, 0.35)",
              boxShadow:
                "0 14px 40px rgba(0,0,0,0.50), 0 0 32px rgba(245, 196, 0, 0.12), inset 0 1px 0 rgba(245,196,0,0.20)",
            }}
          >
            {/* Top warm gold-red accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{
                background: `linear-gradient(90deg, ${brand.gold}, #EF4444)`,
              }}
            />

            <div>
              {/* Header: Icon + Status Pill */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: "rgba(245, 196, 0, 0.12)",
                    borderColor: "rgba(245, 196, 0, 0.35)",
                    color: brand.gold,
                  }}
                >
                  <Smartphone className="w-5 h-5" />
                </div>

                {/* In development status pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border bg-amber-500/10 border-amber-500/30 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  In development
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Native Experience
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                  Mobile App
                </h3>
              </div>

              {/* Pure CSS/Tailwind Phone Mockup (Lightweight, no images, no new deps) */}
              <div className="mt-4 w-full max-w-[250px] mx-auto rounded-[28px] border-2 border-slate-700/60 bg-[#070A11] p-3 shadow-inner select-none">
                {/* Phone Notch/Pill */}
                <div className="w-16 h-2 bg-slate-800 rounded-full mx-auto mb-2.5" />

                {/* Mini Mockup Header with Illustrative Preview Badge */}
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[10px] font-bold text-slate-300">Daily Progress</span>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border"
                    style={{
                      backgroundColor: "rgba(245, 196, 0, 0.08)",
                      borderColor: "rgba(245, 196, 0, 0.28)",
                      color: brand.gold,
                    }}
                  >
                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                    Preview
                  </span>
                </div>

                {/* Simplified Streak Card (Reusing Gamification Section language) */}
                <div className="p-2 rounded-xl bg-slate-900/90 border border-white/10 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>14-Day Streak</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">+50 EXP</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <div
                        key={i}
                        className={`h-4 rounded-md flex items-center justify-center text-[8px] font-mono font-bold ${
                          i < 6
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : "bg-white/[0.04] text-slate-500 border border-dashed border-amber-400/30"
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simplified Level & EXP Progress Bar */}
                <div className="p-2 rounded-xl bg-slate-900/90 border border-white/10">
                  <div className="flex items-center justify-between text-[9px] mb-1">
                    <span className="font-semibold text-slate-200">Level 12 Scholar</span>
                    <span className="font-mono text-amber-400 font-bold">3,450 / 5,000 EXP</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full w-[69%]" />
                  </div>
                </div>

                {/* Illustrative preview disclaimer */}
                <div className="mt-2 text-[9px] text-slate-500 italic text-center">
                  Illustrative preview — not a live account
                </div>
              </div>

              {/* Planned Capabilities Row (Chips only, not clickable) */}
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Planned Capabilities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Offline classwork sync",
                    "Push reminders & alerts",
                    "Quick quiz taker",
                    "Biometric face & fingerprint unlock",
                  ].map((chip, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-slate-300 cursor-default select-none"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Note confirming no badges / unreleased status */}
            <div className="mt-5 text-center text-[11px] text-slate-400 font-medium">
              Native iOS and Android clients currently in internal beta
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════════════════
              CARD 3: Desktop Console [Planned] — Administrative Focus
             ════════════════════════════════════════════════════════════ */}
          <motion.div
            className="relative rounded-2xl border p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:shadow-2xl opacity-85"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
            animate={
              isSectionInView
                ? { opacity: 0.85, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 20 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.29,
            }}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.90)",
              borderColor: "rgba(255, 255, 255, 0.08)",
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Top muted accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.20), rgba(255,255,255,0.05))",
              }}
            />

            <div>
              {/* Header: Icon + Status Pill */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 text-slate-300">
                  <Monitor className="w-5 h-5" />
                </div>

                {/* Planned status pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border bg-slate-500/10 border-slate-500/25 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Planned
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Administrative Workstation
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white/90 tracking-tight mt-1">
                  Desktop Console
                </h3>
              </div>

              {/* Intended Use Case */}
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Dedicated client intended for registrars, deans, and faculty administrators managing large-scale student enrollments and proctored examinations.
              </p>

              {/* Intended Capabilities (Future-facing) */}
              <div className="mt-5 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Planned Architecture
                </div>
                {[
                  "Multi-window exam proctoring with live attempt anomaly flags",
                  "Batch student enrollment processing and section allocations",
                  "Offline-resilient grade roster submission and registrar ledger sync",
                  "Bulk transcript and academic record export in official formats",
                ].map((cap, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 mt-1.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-interactive disabled roadmap indicator (no download button, no version) */}
            <div className="mt-7 pt-4 border-t border-white/[0.06]">
              <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-slate-400 border border-white/[0.08] bg-white/[0.02] select-none cursor-not-allowed">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Scheduled for Phase 3 Roadmap</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── TECH STRIP — INFINITE AUTO-SCROLL MARQUEE ─── */}
        <motion.div
          className="mt-14 pt-8 border-t border-white/[0.08]"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
          animate={
            isSectionInView
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: reducedMotion ? 0 : 16 }
          }
          transition={{
            duration: reducedMotion ? 0 : 0.45,
            ease: "easeOut",
            delay: reducedMotion ? 0 : 0.35,
          }}
        >
          {/* Subtle Section Label */}
          <div className="text-center mb-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Verified Production Technology Stack
            </span>
          </div>

          {/* Strip element with overflow-x: clip (never overflow: hidden) and gradient edge masks */}
          <div
            className="w-full select-none py-1"
            style={{
              overflowX: "clip",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
            }}
          >
            {/* CSS-only continuous compositor track */}
            <div className="tech-marquee-track">
              {/* Primary Copy */}
              <div className="tech-marquee-copy-primary flex items-center gap-2.5 sm:gap-3 pr-2.5 sm:pr-3 shrink-0">
                {TECH_STACK_CHIPS.map((tech) => (
                  <span
                    key={`tech-1-${tech}`}
                    className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium text-slate-400 bg-white/[0.03] border border-white/[0.07] select-none whitespace-nowrap"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Secondary Copy (Duplicated for seamless 0% -> -50% loop) */}
              <div
                className="tech-marquee-copy-secondary flex items-center gap-2.5 sm:gap-3 pr-2.5 sm:pr-3 shrink-0"
                aria-hidden="true"
              >
                {TECH_STACK_CHIPS.map((tech, i) => (
                  <span
                    key={`tech-2-${tech}-${i}`}
                    className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium text-slate-400 bg-white/[0.03] border border-white/[0.07] select-none whitespace-nowrap"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scoped CSS keyframe animation running on compositor thread */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes techMarqueeScroll {
                  0% {
                    transform: translate3d(0, 0, 0);
                  }
                  100% {
                    transform: translate3d(-50%, 0, 0);
                  }
                }
                .tech-marquee-track {
                  display: flex;
                  width: max-content;
                  align-items: center;
                  animation: techMarqueeScroll 35s linear infinite;
                  will-change: transform;
                }
                @media (prefers-reduced-motion: reduce) {
                  .tech-marquee-track {
                    animation: none !important;
                    transform: none !important;
                    width: 100% !important;
                    justify-content: center !important;
                    flex-wrap: wrap !important;
                  }
                  .tech-marquee-copy-secondary {
                    display: none !important;
                  }
                  .tech-marquee-copy-primary {
                    padding-right: 0 !important;
                    justify-content: center !important;
                    flex-wrap: wrap !important;
                  }
                }
              `,
            }}
          />
        </motion.div>

      </div>
    </section>
  );
}
