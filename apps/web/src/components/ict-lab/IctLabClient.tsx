"use client";

import React, { useState } from "react";
import { Code2, Cpu, Cable, GraduationCap } from "lucide-react";
import type { HardwarePartsData, LanCableData } from "@/lib/ict-lab/types";
import CodePlaygroundTab from "./CodePlaygroundTab";
import HardwareExplorerTab from "./HardwareExplorerTab";
import LanCableGuideTab from "./LanCableGuideTab";

export type IctLabMainTabId = "playground" | "hardware" | "lan-cable";

export interface IctLabClientProps {
  studentName: string;
  programCode: string | null;
  hardwareData: HardwarePartsData;
  lanCableData: LanCableData;
  nonce?: string;
}

const MAIN_TABS: {
  id: IctLabMainTabId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "playground",
    label: "Code Playground",
    subtitle: "HTML, CSS & JS Live Sandbox",
    icon: Code2,
  },
  {
    id: "hardware",
    label: "Hardware Explorer",
    subtitle: "2D Interactive PC Components",
    icon: Cpu,
  },
  {
    id: "lan-cable",
    label: "LAN Cable Guide",
    subtitle: "T568A/B Wiring & Cable Tester",
    icon: Cable,
  },
];

export default function IctLabClient({
  studentName,
  programCode,
  hardwareData,
  lanCableData,
  nonce,
}: IctLabClientProps) {
  const [activeTab, setActiveTab] = useState<IctLabMainTabId>("playground");

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = MAIN_TABS[(idx + 1) % MAIN_TABS.length]!;
      setActiveTab(next.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = MAIN_TABS[(idx - 1 + MAIN_TABS.length) % MAIN_TABS.length]!;
      setActiveTab(prev.id);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-hidden pb-10">
      {/* Circuit-board blueprint backdrop: low-contrast grid + soft ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_95%)]"
      >
        {/* Soft radial glow in corner */}
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-600/10" />

        {/* Blueprint dot/grid lines: <8% dark opacity, <10% light opacity */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:28px_28px] dark:bg-[linear-gradient(to_right,rgba(96,165,250,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,165,250,0.045)_1px,transparent_1px)]" />
      </div>

      <div className="mx-auto max-w-7xl space-y-4">
        {/* ITE Blue Header Banner with Circuit Traces & Processor Glyph Artwork */}
        <header className="relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-blue-500/30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-950 dark:via-blue-900 dark:to-indigo-950 p-6 text-white shadow-sm">
          {/* Circuit Trace Pulse CSS (strictly respects prefers-reduced-motion) */}
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
            }
          `}</style>

          {/* Decorative Inline SVG Circuit Artwork */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-64 md:w-96 select-none overflow-hidden"
          >
            <svg
              viewBox="0 0 360 180"
              preserveAspectRatio="xMidYMid slice"
              className="h-full w-full opacity-35 dark:opacity-50"
            >
              {/* Circuit Bus Traces with Right-Angle Bends */}
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

              {/* Solder Pads / Component Nodes */}
              <circle cx="60" cy="145" r="3.5" fill="#93C5FD" />
              <circle cx="160" cy="85" r="3" fill="#60A5FA" />
              <circle cx="110" cy="135" r="3" fill="#93C5FD" />
              <circle cx="195" cy="95" r="3" fill="#60A5FA" />
              <circle cx="210" cy="105" r="2.5" fill="#BFDBFE" />

              {/* Integrated Circuit (CPU/IC) Chip Glyph */}
              <g transform="translate(255, 65)">
                {/* Pins - Top / Bottom */}
                <line x1="10" y1="-6" x2="10" y2="0" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="22" y1="-6" x2="22" y2="0" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="34" y1="-6" x2="34" y2="0" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="10" y1="44" x2="10" y2="50" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="22" y1="44" x2="22" y2="50" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="34" y1="44" x2="34" y2="50" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

                {/* Pins - Left / Right */}
                <line x1="-6" y1="10" x2="0" y2="10" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="-6" y1="22" x2="0" y2="22" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="-6" y1="34" x2="0" y2="34" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="44" y1="10" x2="50" y2="10" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="44" y1="22" x2="50" y2="22" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
                <line x1="44" y1="34" x2="50" y2="34" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

                {/* Package Body */}
                <rect x="0" y="0" width="44" height="44" rx="6" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2" />
                {/* Silicon Core */}
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
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              BTLED ICT Interactive Lab
            </h1>
            <p className="text-xs leading-relaxed text-blue-100 sm:text-sm">
              Welcome, <strong className="font-semibold text-white">{studentName}</strong>. Practice
              web programming in the sandboxed Code Playground, inspect 2D desktop computer
              architecture, and master RJ45 T568A/T568B UTP cabling.
            </p>
          </div>
        </header>

        {/* Dynamic Status Chip Row */}
        <div
          className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-theme bg-surface px-4 py-2.5 shadow-xs"
          aria-label="Active module summary"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary-theme">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span>Active Module:</span>
            <span className="font-bold text-primary-theme">
              {activeTab === "playground" && "Code Playground"}
              {activeTab === "hardware" && "Hardware Explorer"}
              {activeTab === "lan-cable" && "LAN Cable Guide"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-secondary-theme">
            {activeTab === "playground" && (
              <>
                <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 font-medium text-primary-theme">HTML</span>
                <span className="text-muted-theme" aria-hidden="true">•</span>
                <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 font-medium text-primary-theme">CSS</span>
                <span className="text-muted-theme" aria-hidden="true">•</span>
                <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 font-medium text-primary-theme">JavaScript</span>
                <span className="text-muted-theme" aria-hidden="true">•</span>
                <span className="rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">Sandboxed</span>
              </>
            )}
            {activeTab === "hardware" && (
              <>
                <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 font-medium text-primary-theme">
                  {hardwareData.parts.length} components
                </span>
                <span className="text-muted-theme" aria-hidden="true">•</span>
                <span className="rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                  2 quizzes
                </span>
              </>
            )}
            {activeTab === "lan-cable" && (
              <>
                <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 font-medium text-primary-theme">T568A/B</span>
                <span className="text-muted-theme" aria-hidden="true">•</span>
                <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 font-medium text-primary-theme">Crimping</span>
                <span className="text-muted-theme" aria-hidden="true">•</span>
                <span className="rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">Tester</span>
              </>
            )}
          </div>
        </div>

        {/* Refined 3-Tab Switcher with Glow, Ring, and Accent Indicator */}
        <div
          role="tablist"
          aria-label="ICT Lab sections"
          className="grid grid-cols-1 gap-2.5 rounded-xl border border-theme bg-surface p-2 shadow-xs sm:grid-cols-3"
        >
          {MAIN_TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`ict-lab-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`ict-lab-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`relative flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isSelected
                    ? "border-blue-500/60 dark:border-blue-400/50 bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:shadow-blue-900/40"
                    : "border-theme bg-elevated text-primary-theme hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                {/* Active bottom accent bar */}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-200 dark:bg-blue-300"
                  />
                )}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "border border-theme bg-surface text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">{tab.label}</p>
                  <p
                    className={`truncate text-xs font-medium ${
                      isSelected ? "text-blue-100" : "text-secondary-theme"
                    }`}
                  >
                    {tab.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      {/* Active Tab Panel */}
      <div
        id={`ict-lab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`ict-lab-tab-${activeTab}`}
      >
        {activeTab === "playground" && <CodePlaygroundTab nonce={nonce} />}
        {activeTab === "hardware" && <HardwareExplorerTab data={hardwareData} />}
        {activeTab === "lan-cable" && <LanCableGuideTab data={lanCableData} />}
      </div>
      </div>
    </div>
  );
}
