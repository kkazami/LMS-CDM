"use client";

import React, { useMemo, useState } from "react";
import {
  Cpu,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Link2,
  Layers,
  MousePointerClick,
  ListChecks,
} from "lucide-react";
import type { HardwarePart, HardwarePartsData } from "@/lib/ict-lab/types";
import {
  type HardwareQuizMode,
  type HardwareQuizQuestion,
  assertAllHardwarePartsHaveSvgDrawing,
  generateHardwareQuizQuestions,
} from "@/lib/ict-lab/rules";

export const HARDWARE_SVG_PART_IDS = [
  "motherboard",
  "cpu",
  "cpu-cooler",
  "ram",
  "gpu",
  "psu",
  "hdd",
  "ssd",
  "sata-cable",
  "cmos-battery",
  "case-fan",
  "nic",
] as const;

export interface HardwareExplorerTabProps {
  data: HardwarePartsData;
}

export default function HardwareExplorerTab({ data }: HardwareExplorerTabProps) {
  // Fail loudly if any part in hardware-parts.json has no SVG drawing
  useMemo(() => {
    assertAllHardwarePartsHaveSvgDrawing(data.parts, HARDWARE_SVG_PART_IDS);
  }, [data.parts]);

  const partsById = useMemo(() => {
    const map = new Map<string, HardwarePart>();
    for (const part of data.parts) {
      map.set(part.id, part);
    }
    return map;
  }, [data.parts]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of data.categories) {
      map.set(cat.id, cat.label);
    }
    return map;
  }, [data.categories]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPartId, setSelectedPartId] = useState<string>(
    data.parts[0]?.id ?? "motherboard"
  );
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  // Quiz state
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [quizMode, setQuizMode] = useState<HardwareQuizMode>("CLICK_THE_PART");
  const [clickPromptStyle, setClickPromptStyle] = useState<"function" | "name">("function");
  const [questions, setQuestions] = useState<HardwareQuizQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    chosenLabel: string;
    targetPart: HardwarePart;
  } | null>(null);
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false);

  const selectedPart = partsById.get(selectedPartId) ?? data.parts[0]!;
  const currentQuestion = questions[currentQuestionIdx] ?? null;

  const startQuiz = (mode: HardwareQuizMode) => {
    const generated = generateHardwareQuizQuestions(data.parts, mode, 10);
    setQuizMode(mode);
    setQuestions(generated);
    setCurrentQuestionIdx(0);
    setScore(0);
    setFeedback(null);
    setIsQuizFinished(false);
    setIsQuizActive(true);
    setSelectedCategory("all");
    if (mode === "NAME_THE_PART" && generated[0]) {
      setSelectedPartId(generated[0].partId);
    }
  };

  const exitQuiz = () => {
    setIsQuizActive(false);
    setFeedback(null);
    setIsQuizFinished(false);
  };

  const handleSvgPartActivate = (partId: string) => {
    setSelectedPartId(partId);

    if (isQuizActive && !isQuizFinished && quizMode === "CLICK_THE_PART" && currentQuestion && !feedback) {
      const target = partsById.get(currentQuestion.partId);
      const clicked = partsById.get(partId);
      if (!target || !clicked) return;
      const isCorrect = partId === currentQuestion.partId;
      if (isCorrect) setScore((s) => s + 1);
      setFeedback({
        correct: isCorrect,
        chosenLabel: clicked.name,
        targetPart: target,
      });
    }
  };

  const handleMultipleChoiceSelect = (optionName: string) => {
    if (!isQuizActive || isQuizFinished || quizMode !== "NAME_THE_PART" || !currentQuestion || feedback) {
      return;
    }
    const target = partsById.get(currentQuestion.partId);
    if (!target) return;
    const isCorrect = optionName === currentQuestion.partName;
    if (isCorrect) setScore((s) => s + 1);
    setFeedback({
      correct: isCorrect,
      chosenLabel: optionName,
      targetPart: target,
    });
  };

  const handleNextQuestion = () => {
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx >= questions.length) {
      setIsQuizFinished(true);
      setFeedback(null);
      return;
    }
    setCurrentQuestionIdx(nextIdx);
    setFeedback(null);
    if (quizMode === "NAME_THE_PART" && questions[nextIdx]) {
      setSelectedPartId(questions[nextIdx]!.partId);
    }
  };

  const isPartDimmed = (partId: string): boolean => {
    if (isQuizActive) return false;
    if (selectedCategory === "all") return false;
    const part = partsById.get(partId);
    return part ? part.category !== selectedCategory : false;
  };

  const isPartHighlighted = (partId: string): boolean => {
    if (isQuizActive && !isQuizFinished && currentQuestion) {
      if (quizMode === "NAME_THE_PART") {
        return currentQuestion.partId === partId;
      }
      if (feedback) {
        return currentQuestion.partId === partId;
      }
      return hoveredPartId === partId;
    }
    return selectedPartId === partId || hoveredPartId === partId;
  };

  const getPartGroupProps = (partId: string) => {
    const part = partsById.get(partId);
    const dimmed = isPartDimmed(partId);
    const active = isPartHighlighted(partId);
    return {
      id: partId,
      role: "button" as const,
      tabIndex: 0,
      "aria-label": part ? `${part.name} (${categoriesById.get(part.category) ?? part.category})` : partId,
      "aria-pressed": selectedPartId === partId,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        handleSvgPartActivate(partId);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          handleSvgPartActivate(partId);
        }
      },
      onMouseEnter: () => setHoveredPartId(partId),
      onMouseLeave: () => setHoveredPartId((prev) => (prev === partId ? null : prev)),
      onFocus: () => setHoveredPartId(partId),
      onBlur: () => setHoveredPartId((prev) => (prev === partId ? null : prev)),
      className: `cursor-pointer transition-opacity duration-200 focus:outline-none ${
        dimmed ? "opacity-25" : "opacity-100"
      }`,
      "data-part-active": active ? "true" : "false",
    };
  };

  const strokeFor = (partId: string, defaultStroke = "#475569") =>
    isPartHighlighted(partId) ? "#2563EB" : defaultStroke;

  const strokeWidthFor = (partId: string, defaultWidth = 2) =>
    isPartHighlighted(partId) ? defaultWidth + 1.5 : defaultWidth;

  return (
    <div className="space-y-4">
      {/* Top Bar: Category Filter Chips & Quiz Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme bg-surface p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter hardware parts by category">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-secondary-theme">
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Category:
          </span>
          <button
            type="button"
            disabled={isQuizActive}
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-theme bg-elevated text-primary-theme hover:bg-slate-200/70 dark:hover:bg-white/10"
            } disabled:opacity-50`}
          >
            All ({data.parts.length})
          </button>
          {data.categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                disabled={isQuizActive}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-theme bg-elevated text-primary-theme hover:bg-slate-200/70 dark:hover:bg-white/10"
                } disabled:opacity-50`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Quiz Mode Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {!isQuizActive ? (
            <>
              <button
                type="button"
                onClick={() => startQuiz("CLICK_THE_PART")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                Quiz: Click the Part
              </button>
              <button
                type="button"
                onClick={() => startQuiz("NAME_THE_PART")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ListChecks className="h-3.5 w-3.5" />
                Quiz: Name the Part
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={exitQuiz}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Exit Quiz Mode
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid: Left 2D Open Desktop Case SVG | Right Details or Quiz Panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 2D Interactive SVG Open Desktop Computer Case (Side View) */}
        <div className="flex flex-col rounded-xl border border-theme bg-surface p-4 shadow-sm lg:col-span-7">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-primary-theme">
                Open Desktop Computer Case (2D Side View)
              </h3>
              <p className="text-xs text-secondary-theme">
                Click or use Tab + Enter/Space on any hardware component to inspect it.
              </p>
            </div>
            {hoveredPartId && partsById.get(hoveredPartId) && (
              <span className="rounded-md bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                {partsById.get(hoveredPartId)!.name}
              </span>
            )}
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-theme bg-elevated p-2">
            <svg
              viewBox="0 0 820 540"
              className="h-auto max-h-[480px] w-full select-none"
              role="group"
              aria-label="Interactive 2D diagram of desktop computer internal hardware components"
            >
              {/* Outer Computer Chassis Frame */}
              <rect
                x="20"
                y="16"
                width="780"
                height="508"
                rx="16"
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="3"
              />
              {/* Inner Chassis Cavity */}
              <rect
                x="38"
                y="34"
                width="744"
                height="472"
                rx="10"
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeWidth="2"
              />
              {/* Drive Bay Column Divider (Right side of chassis) */}
              <line
                x1="545"
                y1="34"
                x2="545"
                y2="375"
                stroke="#cbd5e1"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
              {/* PSU Bottom Shroud Divider */}
              <line
                x1="38"
                y1="375"
                x2="782"
                y2="375"
                stroke="#cbd5e1"
                strokeWidth="3"
              />

              {/* 1. MOTHERBOARD */}
              <g {...getPartGroupProps("motherboard")}>
                <rect
                  x="130"
                  y="52"
                  width="380"
                  height="304"
                  rx="8"
                  fill={isPartHighlighted("motherboard") ? "#dbeafe" : "#dcfce7"}
                  stroke={strokeFor("motherboard", "#15803d")}
                  strokeWidth={strokeWidthFor("motherboard", 2.5)}
                />
                {/* PCB circuit traces decoration */}
                <path
                  d="M150 80 H230 M150 320 H340 M420 260 V335"
                  stroke="#86efac"
                  strokeWidth="2"
                />
                <text
                  x="146"
                  y="74"
                  fontSize="12"
                  fontWeight="700"
                  fill="#14532d"
                >
                  MOTHERBOARD (Main PCB)
                </text>
              </g>

              {/* 11. CASE FAN (Rear exhaust fan on left chassis wall) */}
              <g {...getPartGroupProps("case-fan")}>
                <rect
                  x="48"
                  y="76"
                  width="66"
                  height="110"
                  rx="8"
                  fill={isPartHighlighted("case-fan") ? "#bfdbfe" : "#e0f2fe"}
                  stroke={strokeFor("case-fan", "#0369a1")}
                  strokeWidth={strokeWidthFor("case-fan", 2)}
                />
                <circle
                  cx="81"
                  cy="124"
                  r="24"
                  fill="#bae6fd"
                  stroke="#0284c7"
                  strokeWidth="2"
                />
                <circle cx="81" cy="124" r="7" fill="#0369a1" />
                <line x1="81" y1="100" x2="81" y2="148" stroke="#0284c7" strokeWidth="2" />
                <line x1="57" y1="124" x2="105" y2="124" stroke="#0284c7" strokeWidth="2" />
                <text
                  x="81"
                  y="174"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#0c4a6e"
                >
                  Case Fan
                </text>
              </g>

              {/* 2. CPU (Socketed processor on motherboard) */}
              <g {...getPartGroupProps("cpu")}>
                <rect
                  x="232"
                  y="112"
                  width="92"
                  height="84"
                  rx="6"
                  fill={isPartHighlighted("cpu") ? "#bfdbfe" : "#fef3c7"}
                  stroke={strokeFor("cpu", "#b45309")}
                  strokeWidth={strokeWidthFor("cpu", 2.5)}
                />
                <rect
                  x="246"
                  y="124"
                  width="64"
                  height="46"
                  rx="3"
                  fill="#fde68a"
                  stroke="#d97706"
                  strokeWidth="1.5"
                />
                <text
                  x="278"
                  y="151"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="#78350f"
                >
                  CPU
                </text>
                <text
                  x="278"
                  y="186"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#92400e"
                >
                  Processor Socket
                </text>
              </g>

              {/* 3. CPU COOLER (Heatsink + fan unit mounted above CPU) */}
              <g {...getPartGroupProps("cpu-cooler")}>
                <rect
                  x="220"
                  y="60"
                  width="116"
                  height="44"
                  rx="6"
                  fill={isPartHighlighted("cpu-cooler") ? "#bfdbfe" : "#e2e8f0"}
                  stroke={strokeFor("cpu-cooler", "#334155")}
                  strokeWidth={strokeWidthFor("cpu-cooler", 2)}
                />
                {/* Heatsink fins */}
                <line x1="236" y1="64" x2="236" y2="100" stroke="#64748b" strokeWidth="2" />
                <line x1="250" y1="64" x2="250" y2="100" stroke="#64748b" strokeWidth="2" />
                <line x1="306" y1="64" x2="306" y2="100" stroke="#64748b" strokeWidth="2" />
                <line x1="320" y1="64" x2="320" y2="100" stroke="#64748b" strokeWidth="2" />
                <text
                  x="278"
                  y="86"
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  CPU Cooler
                </text>
              </g>

              {/* 4. RAM (DIMM slots to the right of CPU) */}
              <g {...getPartGroupProps("ram")}>
                <rect
                  x="362"
                  y="84"
                  width="118"
                  height="112"
                  rx="6"
                  fill={isPartHighlighted("ram") ? "#bfdbfe" : "#ede9fe"}
                  stroke={strokeFor("ram", "#6d28d9")}
                  strokeWidth={strokeWidthFor("ram", 2)}
                />
                {/* Four vertical DIMM sticks */}
                <rect x="376" y="96" width="14" height="72" rx="2" fill="#8b5cf6" />
                <rect x="398" y="96" width="14" height="72" rx="2" fill="#7c3aed" />
                <rect x="420" y="96" width="14" height="72" rx="2" fill="#8b5cf6" />
                <rect x="442" y="96" width="14" height="72" rx="2" fill="#7c3aed" />
                <text
                  x="421"
                  y="186"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#4c1d95"
                >
                  RAM (DIMM Slots)
                </text>
              </g>

              {/* 10. CMOS BATTERY (CR2032 coin cell on motherboard) */}
              <g {...getPartGroupProps("cmos-battery")}>
                <circle
                  cx="364"
                  cy="228"
                  r="24"
                  fill={isPartHighlighted("cmos-battery") ? "#bfdbfe" : "#f1f5f9"}
                  stroke={strokeFor("cmos-battery", "#475569")}
                  strokeWidth={strokeWidthFor("cmos-battery", 2)}
                />
                <circle cx="364" cy="228" r="16" fill="#cbd5e1" />
                <text
                  x="364"
                  y="226"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  fill="#1e293b"
                >
                  CMOS
                </text>
                <text
                  x="364"
                  y="236"
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="700"
                  fill="#334155"
                >
                  CR2032
                </text>
              </g>

              {/* 5. GPU (Graphics Card in primary PCIe x16 slot) */}
              <g {...getPartGroupProps("gpu")}>
                <rect
                  x="148"
                  y="214"
                  width="184"
                  height="64"
                  rx="7"
                  fill={isPartHighlighted("gpu") ? "#bfdbfe" : "#fee2e2"}
                  stroke={strokeFor("gpu", "#b91c1c")}
                  strokeWidth={strokeWidthFor("gpu", 2.5)}
                />
                <circle cx="188" cy="246" r="18" fill="#fecaca" stroke="#dc2626" strokeWidth="1.5" />
                <circle cx="292" cy="246" r="18" fill="#fecaca" stroke="#dc2626" strokeWidth="1.5" />
                <text
                  x="240"
                  y="243"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#7f1d1d"
                >
                  GPU
                </text>
                <text
                  x="240"
                  y="256"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="#991b1b"
                >
                  Graphics Card (PCIe)
                </text>
              </g>

              {/* 12. NIC (Network Interface Card in lower PCIe slot / rear RJ45) */}
              <g {...getPartGroupProps("nic")}>
                <rect
                  x="148"
                  y="292"
                  width="164"
                  height="46"
                  rx="6"
                  fill={isPartHighlighted("nic") ? "#bfdbfe" : "#ccfbf1"}
                  stroke={strokeFor("nic", "#0f766e")}
                  strokeWidth={strokeWidthFor("nic", 2)}
                />
                {/* Rear RJ45 port icon */}
                <rect x="156" y="302" width="24" height="24" rx="3" fill="#14b8a6" />
                <text
                  x="242"
                  y="314"
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="800"
                  fill="#134e4a"
                >
                  NIC (Network Card)
                </text>
                <text
                  x="242"
                  y="327"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="#115e59"
                >
                  RJ45 / Wi-Fi Adapter
                </text>
              </g>

              {/* 8. SSD (Solid State Drive in upper 2.5" / M.2 bay) */}
              <g {...getPartGroupProps("ssd")}>
                <rect
                  x="574"
                  y="72"
                  width="184"
                  height="86"
                  rx="8"
                  fill={isPartHighlighted("ssd") ? "#bfdbfe" : "#e0e7ff"}
                  stroke={strokeFor("ssd", "#3730a3")}
                  strokeWidth={strokeWidthFor("ssd", 2.5)}
                />
                <rect x="590" y="88" width="152" height="32" rx="4" fill="#c7d2fe" />
                <text
                  x="666"
                  y="109"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="#1e1b4b"
                >
                  SSD (Solid State Drive)
                </text>
                <text
                  x="666"
                  y="142"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#312e81"
                >
                  Flash Storage (2.5&quot; / NVMe)
                </text>
              </g>

              {/* 7. HDD (Hard Disk Drive in lower 3.5" bay) */}
              <g {...getPartGroupProps("hdd")}>
                <rect
                  x="574"
                  y="192"
                  width="184"
                  height="104"
                  rx="8"
                  fill={isPartHighlighted("hdd") ? "#bfdbfe" : "#f3e8ff"}
                  stroke={strokeFor("hdd", "#6b21a8")}
                  strokeWidth={strokeWidthFor("hdd", 2.5)}
                />
                {/* Platter circle */}
                <circle cx="622" cy="244" r="28" fill="#e9d5ff" stroke="#7e22ce" strokeWidth="2" />
                <circle cx="622" cy="244" r="8" fill="#6b21a8" />
                <text
                  x="702"
                  y="238"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="#3b0764"
                >
                  HDD
                </text>
                <text
                  x="702"
                  y="254"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#581c87"
                >
                  3.5&quot; Magnetic Drive
                </text>
              </g>

              {/* 9. SATA CABLE (Data cable linking Motherboard SATA ports to SSD & HDD) */}
              <g {...getPartGroupProps("sata-cable")}>
                {/* Cable path from motherboard right edge to SSD & HDD */}
                <path
                  d="M 488 265 C 535 265, 535 125, 574 125 M 488 285 C 535 285, 535 245, 574 245"
                  fill="none"
                  stroke={isPartHighlighted("sata-cable") ? "#2563EB" : "#ea580c"}
                  strokeWidth={isPartHighlighted("sata-cable") ? 7 : 5}
                  strokeLinecap="round"
                />
                {/* SATA connector badge */}
                <rect
                  x="456"
                  y="298"
                  width="106"
                  height="32"
                  rx="6"
                  fill={isPartHighlighted("sata-cable") ? "#bfdbfe" : "#ffedd5"}
                  stroke={strokeFor("sata-cable", "#c2410c")}
                  strokeWidth={strokeWidthFor("sata-cable", 2)}
                />
                <text
                  x="509"
                  y="318"
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="800"
                  fill="#7c2d12"
                >
                  SATA Data Cable
                </text>
              </g>

              {/* 6. PSU (Power Supply Unit in bottom shroud compartment) */}
              <g {...getPartGroupProps("psu")}>
                <rect
                  x="56"
                  y="392"
                  width="310"
                  height="98"
                  rx="8"
                  fill={isPartHighlighted("psu") ? "#bfdbfe" : "#fef9c3"}
                  stroke={strokeFor("psu", "#a16207")}
                  strokeWidth={strokeWidthFor("psu", 2.5)}
                />
                {/* PSU Fan grill */}
                <circle cx="112" cy="441" r="30" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
                <circle cx="112" cy="441" r="16" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
                <text
                  x="236"
                  y="434"
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  fill="#713f12"
                >
                  PSU (Power Supply Unit)
                </text>
                <text
                  x="236"
                  y="454"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#854d0e"
                >
                  AC → DC (24-pin ATX / 8-pin CPU / PCIe / SATA)
                </text>
              </g>

              {/* Legend / Orientation footer inside chassis */}
              <g pointerEvents="none">
                <rect x="400" y="405" width="360" height="72" rx="8" fill="#f1f5f9" stroke="#cbd5e1" />
                <text x="418" y="428" fontSize="11" fontWeight="700" fill="#334155">
                  Interactive Hardware Map ({data.parts.length} Core Parts)
                </text>
                <text x="418" y="446" fontSize="10" fill="#64748b">
                  • Click any component or use keyboard Tab + Enter/Space.
                </text>
                <text x="418" y="462" fontSize="10" fill="#64748b">
                  • Use &ldquo;Connects to&rdquo; chips on the right to trace connections.
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right Column: Component Inspector OR Interactive 10-Question Quiz */}
        <div className="flex flex-col rounded-xl border border-theme bg-surface p-5 shadow-sm lg:col-span-5">
          {!isQuizActive ? (
            /* Inspector Panel */
            <div className="flex h-full flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-theme pb-3">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      {categoriesById.get(selectedPart.category) ?? selectedPart.category}
                    </span>
                    <h3 className="mt-1.5 text-lg font-bold text-primary-theme">
                      {selectedPart.name}
                    </h3>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-500/15 p-2 text-blue-600 dark:text-blue-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Primary Function
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary-theme">
                    {selectedPart.function}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-theme">
                    How It Works &amp; Details
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-secondary-theme">
                    {selectedPart.description}
                  </p>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary-theme">
                    <Link2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Connects To ({selectedPart.connectsTo.length})
                  </h4>
                  <p className="mt-0.5 text-xs text-secondary-theme">
                    Click a connected component chip below to jump to it on the diagram:
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {selectedPart.connectsTo.map((connectedId) => {
                      const target = partsById.get(connectedId);
                      if (!target) return null;
                      return (
                        <button
                          key={connectedId}
                          type="button"
                          onClick={() => {
                            setSelectedCategory("all");
                            setSelectedPartId(target.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme transition hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                          {target.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Part Index Pills at bottom of inspector */}
              <div className="border-t border-theme pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary-theme">
                  All {data.parts.length} Parts in Diagram
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.parts.map((part) => {
                    const isSelected = part.id === selectedPart.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelectedPartId(part.id)}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "border border-theme bg-elevated text-primary-theme hover:bg-slate-200/70 dark:hover:bg-white/10"
                        }`}
                      >
                        {part.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Quiz Mode Panel */
            <div className="flex h-full flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-theme pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-primary-theme">
                        {quizMode === "CLICK_THE_PART"
                          ? "Quiz Mode: Click the Part"
                          : "Quiz Mode: Name the Part"}
                      </h3>
                      <p className="text-xs text-secondary-theme">
                        {isQuizFinished
                          ? "Round Complete"
                          : `Question ${currentQuestionIdx + 1} of ${questions.length}`}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                    Score: {score} / {questions.length}
                  </span>
                </div>

                {isQuizFinished ? (
                  <div className="mt-6 space-y-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 p-5 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-lg font-bold text-primary-theme">
                      You scored {score} out of {questions.length}!
                    </h4>
                    <p className="text-xs text-secondary-theme">
                      {score >= 8
                        ? "Great job identifying desktop computer hardware components!"
                        : "Review the component descriptions and try another round."}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => startQuiz(quizMode)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Play Again ({quizMode === "CLICK_THE_PART" ? "Click the Part" : "Name the Part"})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startQuiz(
                            quizMode === "CLICK_THE_PART" ? "NAME_THE_PART" : "CLICK_THE_PART"
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-500/30 bg-surface px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/15"
                      >
                        Switch Quiz Mode
                      </button>
                    </div>
                  </div>
                ) : (
                  currentQuestion && (
                    <div className="mt-4 space-y-4">
                      {quizMode === "CLICK_THE_PART" ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-secondary-theme">
                              Prompt Clue Type:
                            </span>
                            <div className="inline-flex rounded-lg border border-theme bg-elevated p-0.5">
                              <button
                                type="button"
                                onClick={() => setClickPromptStyle("function")}
                                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                  clickPromptStyle === "function"
                                    ? "bg-surface text-blue-700 dark:text-blue-300 shadow-sm"
                                    : "text-secondary-theme"
                                }`}
                              >
                                By Function
                              </button>
                              <button
                                type="button"
                                onClick={() => setClickPromptStyle("name")}
                                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                  clickPromptStyle === "name"
                                    ? "bg-surface text-blue-700 dark:text-blue-300 shadow-sm"
                                    : "text-secondary-theme"
                                }`}
                              >
                                By Name
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                              Click the matching part on the SVG diagram:
                            </p>
                            <p className="mt-1.5 text-sm font-bold text-primary-theme">
                              {clickPromptStyle === "function"
                                ? `“${currentQuestion.partFunction}”`
                                : currentQuestion.partName}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                              Highlighted on Diagram:
                            </p>
                            <p className="mt-1 text-xs text-secondary-theme">
                              Clue ({categoriesById.get(currentQuestion.partCategory) ?? currentQuestion.partCategory}):{" "}
                              <strong className="text-primary-theme">{currentQuestion.partFunction}</strong>
                            </p>
                          </div>

                          <div className="space-y-2" role="radiogroup" aria-label="Choose the correct part name">
                            {currentQuestion.options.map((option) => {
                              const isChosen = feedback?.chosenLabel === option;
                              const isCorrectAnswer = option === currentQuestion.partName;
                              let btnClass =
                                "border-theme bg-elevated text-primary-theme hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/10";
                              if (feedback) {
                                if (isCorrectAnswer) {
                                  btnClass =
                                    "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold";
                                } else if (isChosen && !feedback.correct) {
                                  btnClass =
                                    "border-red-400 bg-red-50 dark:bg-red-500/15 text-red-900 dark:text-red-200";
                                }
                              }
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  disabled={Boolean(feedback)}
                                  onClick={() => handleMultipleChoiceSelect(option)}
                                  className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${btnClass}`}
                                >
                                  <span>{option}</span>
                                  {feedback && isCorrectAnswer && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                  {feedback && isChosen && !feedback.correct && (
                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Immediate Feedback Box */}
                      {feedback && (
                        <div
                          role="status"
                          className={`rounded-xl border p-3.5 text-xs ${
                            feedback.correct
                              ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                              : "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 text-red-900 dark:text-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold">
                            {feedback.correct ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                Correct! ({feedback.targetPart.name})
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                Not quite — you chose &ldquo;{feedback.chosenLabel}&rdquo;. Correct answer:{" "}
                                {feedback.targetPart.name}
                              </>
                            )}
                          </div>
                          <p className="mt-1.5 text-secondary-theme">
                            <strong className="text-primary-theme">Function:</strong> {feedback.targetPart.function}
                          </p>
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            {currentQuestionIdx + 1 >= questions.length
                              ? "See Final Score"
                              : "Next Question →"}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center justify-between border-t border-theme pt-3 text-xs text-secondary-theme">
                <span>10 questions per round</span>
                <button
                  type="button"
                  onClick={() => startQuiz(quizMode)}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restart Round
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
