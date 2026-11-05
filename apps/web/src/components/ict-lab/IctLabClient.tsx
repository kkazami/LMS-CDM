"use client";

import React, { useState, useMemo } from "react";
import { useTheme } from "@/lib/theme-context";
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


/**
 * Pattern Layer A: Network Mesh 360x360 seamless tile.
 * Topology: 9 nodes (circles, router ring, switch squares) joined by 1px straight lines.
 * Monospace labels: "192.168.1.1" and "RJ45".
 * Edge alignment: Left (0, 120) meets Right (360, 120); Top (200, 0) meets Bottom (200, 360).
 */
function createNetworkMeshSvg(isDark: boolean): string {
  const strokeColor = isDark ? "rgba(147,197,253,0.16)" : "rgba(37,99,235,0.12)";
  const fillColor = isDark ? "rgba(147,197,253,0.16)" : "rgba(37,99,235,0.12)";
  const textColor = isDark ? "rgba(147,197,253,0.18)" : "rgba(37,99,235,0.14)";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
    <g stroke="${strokeColor}" stroke-width="1" fill="none">
      <path d="M0,120 L60,100 L110,60 L200,0 M110,60 L200,80 L150,160 M200,80 L270,120 L360,120 M270,120 L310,190 L240,240 L200,360 M240,240 L150,160 L140,270 L80,220 L60,100" />
      <circle cx="150" cy="160" r="7" stroke-width="1.5" />
      <circle cx="150" cy="160" r="2" fill="${fillColor}" />
      <rect x="55" y="95" width="10" height="10" rx="2" fill="${fillColor}" />
      <rect x="265" y="115" width="10" height="10" rx="2" fill="${fillColor}" />
      <circle cx="110" cy="60" r="3.5" fill="${fillColor}" />
      <circle cx="200" cy="80" r="3.5" fill="${fillColor}" />
      <circle cx="310" cy="190" r="3.5" fill="${fillColor}" />
      <circle cx="240" cy="240" r="3.5" fill="${fillColor}" />
      <circle cx="140" cy="270" r="3.5" fill="${fillColor}" />
      <circle cx="80" cy="220" r="3.5" fill="${fillColor}" />
    </g>
    <text x="165" y="155" fill="${textColor}" font-family="monospace" font-size="9" font-weight="600">192.168.1.1</text>
    <text x="278" y="140" fill="${textColor}" font-family="monospace" font-size="9" font-weight="600">RJ45</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

/**
 * Pattern Layer B: Tech Doodles 420x420 tile with 8 outline icons (stroke only, no fill):
 * </>, { }, chip, RAM stick, RJ45 plug, monitor, binary 0 1, and #.
 */
function createTechDoodlesSvg(isDark: boolean): string {
  const strokeColor = isDark ? "rgba(147,197,253,0.10)" : "rgba(37,99,235,0.09)";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
    <g stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <g transform="translate(70, 70) rotate(-8)">
        <path d="M-10,-6 L-16,0 L-10,6 M-3,8 L3,-8 M10,-6 L16,0 L10,6" />
      </g>
      <g transform="translate(280, 60) rotate(10)">
        <path d="M-8,-10 C-12,-10 -12,-6 -12,-3 C-12,0 -16,0 -16,0 C-16,0 -12,0 -12,3 C-12,6 -12,10 -8,10 M8,-10 C12,-10 12,-6 12,-3 C12,0 16,0 16,0 C16,0 12,0 12,3 C12,6 12,10 8,10" />
      </g>
      <g transform="translate(170, 160) rotate(-6)">
        <rect x="-12" y="-12" width="24" height="24" rx="3" />
        <path d="M-6,-15 V-12 M0,-15 V-12 M6,-15 V-12 M-6,12 V15 M0,12 V15 M6,12 V15 M-15,-6 H-12 M-15,0 H-12 M-15,6 H-12 M12,-6 H15 M12,0 H15 M12,6 H15" />
      </g>
      <g transform="translate(340, 210) rotate(14)">
        <rect x="-22" y="-7" width="44" height="14" rx="2" />
        <path d="M-3,7 L0,4 L3,7 M-16,-3 H-10 V3 H-16 Z M-6,-3 H0 V3 H-6 Z M4,-3 H10 V3 H4 Z M-19,7 H-7 M7,7 H19" />
      </g>
      <g transform="translate(80, 260) rotate(12)">
        <rect x="-9" y="-11" width="18" height="22" rx="2" />
        <path d="M-4,11 L-5,16 H5 L4,11 M-5,-11 V-7 M-2,-11 V-7 M2,-11 V-7 M5,-11 V-7" />
      </g>
      <g transform="translate(270, 320) rotate(-10)">
        <rect x="-13" y="-10" width="26" height="18" rx="2" />
        <path d="M0,8 V13 M-7,13 H7" />
      </g>
      <g transform="translate(160, 360) rotate(6)">
        <rect x="-14" y="-8" width="10" height="16" rx="4" />
        <path d="M9,-8 L12,-8 V8 M6,8 H15" />
      </g>
      <g transform="translate(370, 90) rotate(8)">
        <path d="M-8,-4 H8 M-8,4 H8 M-4,-8 V8 M4,-8 V8" />
      </g>
    </g>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

export default function IctLabClient({
  studentName,
  programCode,
  hardwareData,
  lanCableData,
  nonce,
}: IctLabClientProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const [activeTab, setActiveTab] = useState<IctLabMainTabId>("playground");

  const meshDataUri = useMemo(() => createNetworkMeshSvg(isDark), [isDark]);
  const doodlesDataUri = useMemo(() => createTechDoodlesSvg(isDark), [isDark]);

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
    <div className="relative -mx-4 -mt-4 lg:-mx-8 lg:-mt-8 px-4 pt-4 lg:px-8 lg:pt-8 min-h-[calc(100vh-6rem)] overflow-x-clip pb-12">
      {/* Full-width Network Mesh & Tech Doodles Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-br from-[#eef4ff] via-[#f3f7fe] to-[#f8fbff] dark:from-[#0b1020] dark:via-[#0d1428] dark:to-[#0f1730]"
      >
        {/* Slow drift animation (enabled on md+ screens, strictly respects prefers-reduced-motion) */}
        <style>{`
          @media (min-width: 768px) and (prefers-reduced-motion: no-preference) {
            @keyframes ictBackdropDrift {
              0% { transform: translate(0, 0); }
              100% { transform: translate(16px, 16px); }
            }
            .animate-ict-drift {
              animation: ictBackdropDrift 60s linear infinite alternate;
            }
          }
        `}</style>

        {/* Ambient Corner Glows: Soft blue top-left & indigo bottom-right */}
        <div className="absolute -top-32 -left-32 h-[540px] w-[540px] rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/20" />
        <div className="absolute -bottom-32 -right-32 h-[540px] w-[540px] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/20" />

        {/* Masked Pattern Layers: Soft vignette at extreme 6% edges only */}
        <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_94%,transparent_100%)]">
          {/* Pattern Layer A: Network Mesh (360x360 seamless tile) */}
          <div
            className="absolute inset-0 bg-repeat animate-ict-drift"
            style={{
              backgroundImage: `url("${meshDataUri}")`,
              backgroundSize: "360px 360px",
            }}
          />

          {/* Pattern Layer B: Tech Doodles (420x420 tile with offset) */}
          <div
            className="absolute inset-0 bg-repeat animate-ict-drift"
            style={{
              backgroundImage: `url("${doodlesDataUri}")`,
              backgroundSize: "420px 420px",
              backgroundPosition: "70px 50px",
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4">
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
