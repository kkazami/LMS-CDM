"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Code2,
  Cpu,
  Cable,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Layers,
  Wrench,
} from "lucide-react";
import type {
  HardwarePartsData,
  LanCableData,
  IctLabModuleId,
} from "@/lib/ict-lab/types";
import { parseIctModule } from "@/lib/ict-lab/rules";
import {
  ICT_MODULE_THEMES,
  type Point2D,
} from "@/lib/ict-lab/particle-shapes";
import {
  createInitialHoverState,
  nextHoverState,
  LEAVE_GRACE_PERIOD_MS,
  type HoverMachineState,
} from "@/lib/ict-lab/hover-machine";
import { ParticleLogoCanvas } from "./ParticleLogoCanvas";
import CodePlaygroundTab from "./CodePlaygroundTab";
import HardwareExplorerTab from "./HardwareExplorerTab";
import LanCableGuideTab from "./LanCableGuideTab";

export type IctLabMainTabId = IctLabModuleId;

export interface IctLabClientProps {
  studentName: string;
  programCode: string | null;
  hardwareData: HardwarePartsData;
  lanCableData: LanCableData;
  nonce?: string;
}

interface ModuleCardConfig {
  id: IctLabModuleId;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  idleAnimationClass: string;
  badges: string[];
  ctaLabel: string;
}

function HubModuleCard({
  card,
  pathname,
}: {
  card: ModuleCardConfig;
  pathname: string;
}) {
  const [isActive, setIsActive] = useState(false);
  const hoverMachineRef = useRef<HoverMachineState>(createInitialHoverState());
  const pointerPosRef = useRef<Point2D | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const theme = ICT_MODULE_THEMES[card.id];
  const Icon = card.icon;

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const handlePointerEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    const next = nextHoverState(
      hoverMachineRef.current,
      { type: "pointerenter" },
      Date.now()
    );
    hoverMachineRef.current = next;
    setIsActive(next.active);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (isInside) {
      // Edge jitter: cursor didn't actually exit bounds
      return;
    }

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }

    hoverMachineRef.current = nextHoverState(
      hoverMachineRef.current,
      { type: "pointerleave", insideRect: false },
      Date.now()
    );

    // 100ms grace period before reverting to resting cluster
    leaveTimerRef.current = setTimeout(() => {
      pointerPosRef.current = null;
      const next = nextHoverState(
        hoverMachineRef.current,
        { type: "grace_timeout" },
        Date.now()
      );
      hoverMachineRef.current = next;
      setIsActive(next.active);
      leaveTimerRef.current = null;
    }, LEAVE_GRACE_PERIOD_MS);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    const next = nextHoverState(
      hoverMachineRef.current,
      { type: "pointermove", insideRect: true },
      Date.now()
    );
    hoverMachineRef.current = next;
    if (!isActive && next.active) {
      setIsActive(true);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    // Preserve hover state during native browser drag gestures
    const next = nextHoverState(
      hoverMachineRef.current,
      { type: "pointercancel", insideRect: isInside },
      Date.now()
    );
    hoverMachineRef.current = next;
    setIsActive(next.active);
  };

  const handleFocus = () => {
    const next = nextHoverState(hoverMachineRef.current, { type: "focus" });
    hoverMachineRef.current = next;
    setIsActive(next.active);
  };

  const handleBlur = () => {
    const next = nextHoverState(hoverMachineRef.current, { type: "blur" });
    hoverMachineRef.current = next;
    setIsActive(next.active);
  };

  return (
    <Link
      href={`${pathname}?module=${card.id}`}
      aria-label={`${card.title} - ${card.subtitle}`}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={
        {
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserDrag: "none",
        } as React.CSSProperties
      }
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-theme bg-surface p-6 shadow-xs select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 touch-pan-y ${theme.cardBorderHoverClass} ${theme.cardShadowHoverClass} ${theme.focusRingClass}`}
    >
      {/* Interactive Particle Logo Canvas (aria-hidden, z-0 background layer) */}
      <ParticleLogoCanvas
        moduleId={card.id}
        isHovered={isActive}
        pointerPosRef={pointerPosRef}
      />

      {/* Foreground Content (relative z-10, non-draggable, pointer-events-none) */}
      <div className="relative z-10 space-y-4 select-none pointer-events-none">
        {/* Top Row: Icon Container & Type Indicator */}
        <div className="flex items-center justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-200 ${theme.iconContainerClass}`}
          >
            <span className={card.idleAnimationClass}>
              <Icon className="h-6 w-6 ict-hover-wiggle" />
            </span>
          </div>
          <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-secondary-theme">
            Module
          </span>
        </div>

        {/* Header & Subtitle */}
        <div>
          <h2
            className={`text-lg font-bold text-primary-theme transition-colors sm:text-xl ${theme.titleHoverClass}`}
          >
            {card.title}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-secondary-theme">
            {card.subtitle}
          </p>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed text-secondary-theme sm:text-sm">
          {card.description}
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {card.badges.map((badge, bIdx) => (
            <span
              key={bIdx}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${theme.badgeClass}`}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom CTA Button (relative z-10, non-draggable, pointer-events-none) */}
      <div
        className={`relative z-10 mt-6 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold shadow-xs select-none pointer-events-none transition-colors ${theme.buttonClass}`}
      >
        <span>{card.ctaLabel}</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function IctLabClientContent({
  studentName,
  programCode,
  hardwareData,
  lanCableData,
  nonce,
}: IctLabClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawModule = searchParams.get("module");
  const activeModule = parseIctModule(rawModule);

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Manage view transitions: smooth scroll to top and focus view heading
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }

    if (activeModule && headingRef.current) {
      headingRef.current.focus();
    }
  }, [activeModule]);

  const moduleConfigs: Record<IctLabModuleId, ModuleCardConfig> = {
    "code-playground": {
      id: "code-playground",
      title: "Code Playground",
      subtitle: "HTML, CSS & JS Live Sandbox",
      description:
        "Practice front-end web development with real-time preview, inline error logs, and isolated iframe execution capped at 100 KB.",
      icon: Code2,
      idleAnimationClass: "ict-icon-pulse",
      badges: ["HTML5", "CSS3", "JavaScript", "Sandboxed Iframe"],
      ctaLabel: "Open Code Playground",
    },
    "hardware-explorer": {
      id: "hardware-explorer",
      title: "Hardware Explorer",
      subtitle: "2D Interactive PC Architecture",
      description:
        "Explore an open desktop chassis in 2D, inspect motherboards, processors, and buses, and test your knowledge with interactive identification quizzes.",
      icon: Cpu,
      idleAnimationClass: "ict-icon-sway",
      badges: [
        `${hardwareData.parts.length} Components`,
        "Interactive 2D",
        "2 Quiz Modes",
      ],
      ctaLabel: "Open Hardware Explorer",
    },
    "lan-cable-guide": {
      id: "lan-cable-guide",
      title: "LAN Cable Guide",
      subtitle: "Wiring Standards & Continuity Tester",
      description:
        "Master twisted pair color codes for T568A and T568B wiring standards, step-by-step RJ45 crimping, and simulate 8-pin continuity testing.",
      icon: Cable,
      idleAnimationClass: "ict-icon-float",
      badges: ["T568A / T568B", "Crimping Guide", "Cable Tester"],
      ctaLabel: "Open Cable Guide",
    },
  };

  const currentModuleConfig = activeModule ? moduleConfigs[activeModule] : null;

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-hidden pb-10">
      {/* Circuit-board blueprint backdrop: low-contrast grid + soft ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_95%)]"
      >
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-600/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:28px_28px] dark:bg-[linear-gradient(to_right,rgba(96,165,250,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,165,250,0.045)_1px,transparent_1px)]" />
      </div>

      {/* ICT Lab Scoped Motion & Animation Styles (honors prefers-reduced-motion) */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes ictCircuitPulse1 {
            0% { stroke-dashoffset: 280; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes ictCircuitPulse2 {
            0% { stroke-dashoffset: 220; }
            100% { stroke-dashoffset: 0; }
          }
          .animate-ict-trace-1 {
            stroke-dasharray: 45 180;
            animation: ictCircuitPulse1 8s linear infinite;
          }
          .animate-ict-trace-2 {
            stroke-dasharray: 35 140;
            animation: ictCircuitPulse2 6s linear infinite;
          }

          @keyframes ictIconPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.95;
            }
            50% {
              transform: scale(1.12);
              opacity: 1;
            }
          }
          @keyframes ictIconFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
            }
          }
          @keyframes ictIconSway {
            0%, 100% {
              transform: translateY(0) rotate(-4deg);
            }
            50% {
              transform: translateY(-2px) rotate(4deg);
            }
          }
          @keyframes ictCardHoverWiggle {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(-6deg) scale(1.05); }
            75% { transform: rotate(6deg) scale(1.05); }
            100% { transform: rotate(0deg) scale(1); }
          }

          .ict-icon-pulse {
            display: inline-block;
            animation: ictIconPulse 2.8s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }
          .ict-icon-float {
            display: inline-block;
            animation: ictIconFloat 2.6s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform;
          }
          .ict-icon-sway {
            display: inline-block;
            animation: ictIconSway 3.2s ease-in-out infinite;
            transform-origin: center bottom;
            will-change: transform;
          }
          .group:hover .ict-hover-wiggle {
            animation: ictCardHoverWiggle 400ms ease-in-out;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-ict-trace-1,
          .animate-ict-trace-2,
          .ict-icon-pulse,
          .ict-icon-float,
          .ict-icon-sway,
          .ict-hover-wiggle {
            animation: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── View A: HUB VIEW (default, or invalid/missing query param) ── */}
        {!activeModule && (
          <div className="space-y-6">
            {/* ITE Blue Header Banner with Circuit Traces & Processor Glyph */}
            <header className="relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-blue-500/30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-950 dark:via-blue-900 dark:to-indigo-950 p-6 sm:p-8 text-white shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-64 md:w-96 select-none overflow-hidden"
              >
                <svg
                  viewBox="0 0 360 180"
                  preserveAspectRatio="xMidYMid slice"
                  className="h-full w-full opacity-35 dark:opacity-50"
                >
                  <path
                    d="M 360 35 H 280 V 65 H 210 V 105 H 140 V 145 H 60"
                    fill="none"
                    stroke="#93C5FD"
                    strokeWidth="1.5"
                    className="animate-ict-trace-1"
                  />
                  <path
                    d="M 360 75 H 290 V 115 H 220 V 85 H 160"
                    fill="none"
                    stroke="rgba(147, 197, 253, 0.45)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 280 0 V 45 H 230 V 85 H 175 V 135 H 110"
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="1.5"
                    className="animate-ict-trace-2"
                  />
                  <path
                    d="M 310 180 V 135 H 250 V 95 H 195"
                    fill="none"
                    stroke="rgba(147, 197, 253, 0.35)"
                    strokeWidth="1.5"
                  />
                  <circle cx="60" cy="145" r="3.5" fill="#93C5FD" />
                  <circle cx="160" cy="85" r="3" fill="#60A5FA" />
                  <circle cx="110" cy="135" r="3" fill="#93C5FD" />
                  <circle cx="195" cy="95" r="3" fill="#60A5FA" />
                  <circle cx="210" cy="105" r="2.5" fill="#BFDBFE" />

                  <g transform="translate(255, 65)">
                    <line x1="10" y1="-6" x2="10" y2="0" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="22" y1="-6" x2="22" y2="0" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="34" y1="-6" x2="34" y2="0" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="10" y1="44" x2="10" y2="50" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="22" y1="44" x2="22" y2="50" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="34" y1="44" x2="34" y2="50" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

                    <line x1="-6" y1="10" x2="0" y2="10" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="-6" y1="22" x2="0" y2="22" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="-6" y1="34" x2="0" y2="34" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="44" y1="10" x2="50" y2="10" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="44" y1="22" x2="50" y2="22" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                    <line x1="44" y1="34" x2="50" y2="34" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

                    <rect x="0" y="0" width="44" height="44" rx="6" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2" />
                    <rect x="11" y="11" width="22" height="22" rx="3" fill="#2563EB" stroke="#BFDBFE" strokeWidth="1" />
                    <text x="22" y="25" textAnchor="middle" fontSize="9" fontWeight="800" fill="#E0F2FE">ICT</text>
                  </g>
                </svg>
              </div>

              <div className="relative z-10 max-w-xl space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <GraduationCap className="h-4 w-4" />
                  <span>ITE Portal • {programCode ?? "BTLEd ICT"}</span>
                </div>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-extrabold tracking-tight outline-none sm:text-3xl"
                >
                  BTLED ICT Interactive Lab
                </h1>
                <p className="text-xs leading-relaxed text-blue-100 sm:text-sm">
                  Welcome, <strong className="font-semibold text-white">{studentName}</strong>. Choose a specialized module below to practice front-end code development, explore PC architecture in 2D, or master RJ45 network cabling.
                </p>
              </div>
            </header>

            {/* Hub: ONLY Three Choice Cards (Responsive: 1-col on mobile, 3-col on desktop) */}
            <main aria-label="ICT Lab Modules" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {(Object.keys(moduleConfigs) as IctLabModuleId[]).map((moduleId) => (
                <HubModuleCard
                  key={moduleId}
                  card={moduleConfigs[moduleId]}
                  pathname={pathname}
                />
              ))}
            </main>
          </div>
        )}

        {/* ── View B: FULL-PAGE MODULE VIEW ── */}
        {activeModule && currentModuleConfig && (
          <div className="space-y-4">
            {/* Top Navigation Bar: Back Button, Module Icon, Heading & Subtitle */}
            <div className="flex flex-col gap-3 rounded-2xl border border-theme bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3.5">
                <Link
                  href={pathname}
                  aria-label="Back to ICT Lab Hub"
                  className="group inline-flex items-center gap-1.5 rounded-xl border border-theme bg-elevated px-3 py-2 text-xs font-semibold text-secondary-theme transition-all duration-150 hover:border-blue-400 dark:hover:border-blue-500/40 hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-primary-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
                  <span className="hidden sm:inline">Back to ICT Lab</span>
                  <span className="sm:hidden">Back</span>
                </Link>

                <div className="h-6 w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <span className={currentModuleConfig.idleAnimationClass}>
                      <currentModuleConfig.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div>
                    <h1
                      ref={headingRef}
                      tabIndex={-1}
                      className="text-lg font-extrabold tracking-tight text-primary-theme outline-none focus:ring-0 sm:text-xl"
                    >
                      {currentModuleConfig.title}
                    </h1>
                    <p className="text-xs font-medium text-secondary-theme">
                      {currentModuleConfig.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Badges / Status Chips */}
              <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                {currentModuleConfig.badges.map((badge, bIdx) => (
                  <span
                    key={bIdx}
                    className="rounded-md border border-blue-200/70 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Full-width Module Workspace */}
            <main aria-label={currentModuleConfig.title} className="w-full">
              {activeModule === "code-playground" && (
                <CodePlaygroundTab nonce={nonce} />
              )}
              {activeModule === "hardware-explorer" && (
                <HardwareExplorerTab data={hardwareData} />
              )}
              {activeModule === "lan-cable-guide" && (
                <LanCableGuideTab data={lanCableData} />
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function IctLabLoadingSkeleton() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-hidden pb-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-44 w-full animate-pulse rounded-2xl bg-blue-100/50 dark:bg-blue-950/40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 w-full animate-pulse rounded-2xl border border-theme bg-surface" />
          <div className="h-80 w-full animate-pulse rounded-2xl border border-theme bg-surface" />
          <div className="h-80 w-full animate-pulse rounded-2xl border border-theme bg-surface" />
        </div>
      </div>
    </div>
  );
}

export default function IctLabClient(props: IctLabClientProps) {
  return (
    <Suspense fallback={<IctLabLoadingSkeleton />}>
      <IctLabClientContent {...props} />
    </Suspense>
  );
}
