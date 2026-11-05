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
    <div className="mx-auto max-w-7xl space-y-5">
      {/* ITE Blue Header Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <GraduationCap className="h-4 w-4" />
              <span>ITE Portal • {programCode ?? "BTLEd ICT"}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              BTLED ICT Interactive Lab
            </h1>
            <p className="max-w-2xl text-xs text-blue-100 sm:text-sm">
              Welcome, <strong className="font-semibold text-white">{studentName}</strong>. Practice
              web programming in the sandboxed Code Playground, inspect 2D desktop computer
              architecture, and master RJ45 T568A/T568B UTP cabling.
            </p>
          </div>
        </div>
      </header>

      {/* Accessible 3-Tab Switcher */}
      <div
        role="tablist"
        aria-label="ICT Lab sections"
        className="grid grid-cols-1 gap-2.5 rounded-xl border border-theme bg-surface p-2 shadow-sm sm:grid-cols-3"
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
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-theme bg-elevated text-primary-theme hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              <div
                className={`rounded-lg p-2 ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
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
        {activeTab === "playground" && <CodePlaygroundTab />}
        {activeTab === "hardware" && <HardwareExplorerTab data={hardwareData} />}
        {activeTab === "lan-cable" && <LanCableGuideTab data={lanCableData} />}
      </div>
    </div>
  );
}
