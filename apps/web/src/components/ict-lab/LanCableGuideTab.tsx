"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Cable,
  CheckCircle2,
  XCircle,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  Wrench,
  Activity,
  Info,
  Play,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { LanCableData, LanWire } from "@/lib/ict-lab/types";
import { simulateCableTester } from "@/lib/ict-lab/rules";

export interface LanCableGuideTabProps {
  data: LanCableData;
}

/**
 * Resolves the primary color hex and optional stripe hex for a wire ID using `data.palette`.
 */
function resolveWireColors(
  wire: LanWire,
  palette: Record<string, string>
): { baseHex: string; stripeHex: string | null } {
  const pairHex = palette[wire.pair] ?? "#64748b";
  const whiteHex = palette.white ?? "#FFFFFF";
  if (wire.striped) {
    return { baseHex: whiteHex, stripeHex: pairHex };
  }
  return { baseHex: pairHex, stripeHex: null };
}

interface WireSwatchProps {
  wire: LanWire;
  palette: Record<string, string>;
  pinNumber?: number;
  heightClass?: string;
}

function WireVisualSwatch({
  wire,
  palette,
  pinNumber,
  heightClass = "h-8",
}: WireSwatchProps) {
  const { baseHex, stripeHex } = resolveWireColors(wire, palette);
  const backgroundStyle: React.CSSProperties = stripeHex
    ? {
        backgroundImage: `repeating-linear-gradient(135deg, ${baseHex} 0px, ${baseHex} 7px, ${stripeHex} 7px, ${stripeHex} 14px)`,
      }
    : {
        backgroundColor: baseHex,
      };

  return (
    <div className="flex items-center gap-2.5">
      {typeof pinNumber === "number" && (
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 dark:bg-blue-600 font-mono text-xs font-bold text-white">
          {pinNumber}
        </span>
      )}
      <div
        className={`w-14 shrink-0 rounded-md border border-slate-400 dark:border-white/25 shadow-inner ${heightClass}`}
        style={backgroundStyle}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-primary-theme">{wire.label}</p>
        <p className="text-[10px] font-medium text-secondary-theme">
          {wire.striped ? `White + ${wire.pair} stripe` : `Solid ${wire.pair}`} (Pair: {wire.pair})
        </p>
      </div>
    </div>
  );
}

export default function LanCableGuideTab({ data }: LanCableGuideTabProps) {
  const wiresById = useMemo(() => {
    const map = new Map<string, LanWire>();
    for (const w of data.wires) {
      map.set(w.id, w);
    }
    return map;
  }, [data.wires]);

  const t568a = useMemo(
    () => data.standards.find((s) => s.id === "T568A") ?? data.standards[0]!,
    [data.standards]
  );
  const t568b = useMemo(
    () => data.standards.find((s) => s.id === "T568B") ?? data.standards[1] ?? data.standards[0]!,
    [data.standards]
  );

  // ─── Section (a): Standards View Mode ───────────────────────────────────────
  const [standardsViewMode, setStandardsViewMode] = useState<"BOTH" | "T568A" | "T568B">("BOTH");

  // ─── Section (b): Wiring Practice State ─────────────────────────────────────
  const [practiceStandardId, setPracticeStandardId] = useState<string>("T568B");
  const targetStandard =
    data.standards.find((s) => s.id === practiceStandardId) ?? t568b;

  const [practiceWireIds, setPracticeWireIds] = useState<string[]>(() => [
    "orange",
    "white-orange",
    "green",
    "white-blue",
    "blue",
    "white-green",
    "brown",
    "white-brown",
  ]);
  const [draggedSlotIdx, setDraggedSlotIdx] = useState<number | null>(null);
  const [selectedSwapSlotIdx, setSelectedSwapSlotIdx] = useState<number | null>(null);
  const [practiceChecked, setPracticeChecked] = useState<boolean>(false);

  const shufflePracticeWires = () => {
    const copy = data.wires.map((w) => w.id);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    setPracticeWireIds(copy);
    setPracticeChecked(false);
    setSelectedSwapSlotIdx(null);
  };

  const swapPracticeSlots = (idxA: number, idxB: number) => {
    if (idxA < 0 || idxA >= 8 || idxB < 0 || idxB >= 8 || idxA === idxB) return;
    setPracticeWireIds((prev) => {
      const next = [...prev];
      const temp = next[idxA]!;
      next[idxA] = next[idxB]!;
      next[idxB] = temp;
      return next;
    });
    setPracticeChecked(false);
  };

  const practiceResults = useMemo(() => {
    return targetStandard.pins.map((expectedPin, idx) => {
      const placedWireId = practiceWireIds[idx] ?? "";
      const isCorrect = placedWireId === expectedPin.wire;
      return {
        pin: expectedPin.pin,
        placedWireId,
        expectedWireId: expectedPin.wire,
        isCorrect,
      };
    });
  }, [targetStandard, practiceWireIds]);

  const practiceScore = useMemo(
    () => practiceResults.filter((r) => r.isCorrect).length,
    [practiceResults]
  );

  // ─── Section (c): Crimping Steps Stepper State ──────────────────────────────
  const [activeCrimpIdx, setActiveCrimpIdx] = useState<number>(0);
  const activeCrimpStep = data.crimpingSteps[activeCrimpIdx] ?? data.crimpingSteps[0]!;

  // ─── Section (d): Cable Tester Simulator State ──────────────────────────────
  const [endAPreset, setEndAPreset] = useState<"T568B" | "T568A" | "CUSTOM">("T568B");
  const [endBPreset, setEndBPreset] = useState<"T568B" | "T568A" | "CUSTOM">("T568B");

  const [endAPinWires, setEndAPinWires] = useState<string[]>(() =>
    t568b.pins.map((p) => p.wire)
  );
  const [endBPinWires, setEndBPinWires] = useState<string[]>(() =>
    t568b.pins.map((p) => p.wire)
  );
  const [simulatedOpenPin, setSimulatedOpenPin] = useState<number | null>(null);
  const [simulatedShortPair, setSimulatedShortPair] = useState<[number, number] | null>(null);

  const [isTestingAnim, setIsTestingAnim] = useState<boolean>(false);
  const [activeLedStepIdx, setActiveLedStepIdx] = useState<number>(0);

  const applyEndAPreset = (preset: "T568B" | "T568A") => {
    setEndAPreset(preset);
    const std = preset === "T568A" ? t568a : t568b;
    setEndAPinWires(std.pins.map((p) => p.wire));
  };

  const applyEndBPreset = (preset: "T568B" | "T568A") => {
    setEndBPreset(preset);
    const std = preset === "T568A" ? t568a : t568b;
    setEndBPinWires(std.pins.map((p) => p.wire));
  };

  const swapTesterEndPins = (end: "A" | "B", idx1: number, idx2: number) => {
    if (idx1 < 0 || idx1 >= 8 || idx2 < 0 || idx2 >= 8) return;
    if (end === "A") {
      setEndAPreset("CUSTOM");
      setEndAPinWires((prev) => {
        const next = [...prev];
        const tmp = next[idx1]!;
        next[idx1] = next[idx2]!;
        next[idx2] = tmp;
        return next;
      });
    } else {
      setEndBPreset("CUSTOM");
      setEndBPinWires((prev) => {
        const next = [...prev];
        const tmp = next[idx1]!;
        next[idx1] = next[idx2]!;
        next[idx2] = tmp;
        return next;
      });
    }
  };

  const testerResult = useMemo(() => {
    return simulateCableTester({
      endAPins: endAPinWires,
      endBPins: endBPinWires,
      openPins: simulatedOpenPin ? [simulatedOpenPin] : [],
      shortedPinPair: simulatedShortPair,
      cableTypes: data.cableTypes,
      faults: data.faults,
    });
  }, [
    endAPinWires,
    endBPinWires,
    simulatedOpenPin,
    simulatedShortPair,
    data.cableTypes,
    data.faults,
  ]);

  // Animate 8 LED steps sequentially when testing is active
  useEffect(() => {
    if (!isTestingAnim) return;
    const timer = window.setInterval(() => {
      setActiveLedStepIdx((prev) => (prev + 1) % 8);
    }, 480);
    return () => window.clearInterval(timer);
  }, [isTestingAnim]);

  const handleRunCableTest = () => {
    setActiveLedStepIdx(0);
    setIsTestingAnim(true);
  };

  const currentTesterStep = testerResult.steps[activeLedStepIdx] ?? testerResult.steps[0]!;

  const standardsToDisplay =
    standardsViewMode === "BOTH"
      ? data.standards
      : data.standards.filter((s) => s.id === standardsViewMode);

  return (
    <div className="space-y-6">
      {/* ─── SECTION (a): T568A & T568B WIRING STANDARDS ─── */}
      <section
        aria-labelledby="lan-standards-heading"
        className="rounded-xl border border-theme bg-surface p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme pb-4">
          <div>
            <h3 id="lan-standards-heading" className="flex items-center gap-2 text-base font-bold text-primary-theme">
              <Cable className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              1. RJ45 Color Standards (T568A &amp; T568B)
            </h3>
            <p className="mt-1 text-xs text-secondary-theme">{data.pinOrientationNote}</p>
          </div>

          <div className="inline-flex rounded-lg border border-theme bg-elevated p-1" role="group" aria-label="Standards view toggle">
            {(["BOTH", "T568A", "T568B"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStandardsViewMode(mode)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  standardsViewMode === mode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-secondary-theme hover:text-primary-theme"
                }`}
              >
                {mode === "BOTH" ? "Side-by-Side (Both)" : mode}
              </button>
            ))}
          </div>
        </div>

        {/* RJ45 Plugs Side-by-Side Diagram */}
        <div
          className={`mt-4 grid grid-cols-1 gap-5 ${
            standardsToDisplay.length > 1 ? "lg:grid-cols-2" : "lg:grid-cols-1"
          }`}
        >
          {standardsToDisplay.map((std) => (
            <div
              key={std.id}
              className="rounded-xl border border-theme bg-elevated p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                  {std.name} Standard
                </span>
                <span className="text-xs font-medium text-secondary-theme">
                  Clip facing down • Pin 1 (left) → Pin 8 (right)
                </span>
              </div>

              {/* Custom SVG RJ45 Plug Pin Header */}
              <svg
                viewBox="0 0 420 110"
                className="mb-3 h-auto w-full rounded-lg border border-theme bg-surface p-2"
                role="img"
                aria-label={`${std.name} RJ45 8-pin color arrangement`}
              >
                <defs>
                  {data.wires
                    .filter((w) => w.striped)
                    .map((w) => {
                      const { baseHex, stripeHex } = resolveWireColors(w, data.palette);
                      return (
                        <pattern
                          key={`${std.id}-pat-${w.id}`}
                          id={`${std.id}-pat-${w.id}`}
                          width="8"
                          height="8"
                          patternTransform="rotate(45 0 0)"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect width="8" height="8" fill={baseHex} />
                          <rect width="4" height="8" fill={stripeHex ?? "#000"} />
                        </pattern>
                      );
                    })}
                </defs>

                {/* RJ45 Transparent Plug Body */}
                <rect
                  x="30"
                  y="8"
                  width="360"
                  height="94"
                  rx="8"
                  fill="#f8fafc"
                  stroke="#64748b"
                  strokeWidth="2"
                />

                {std.pins.map((pinEntry, idx) => {
                  const wire = wiresById.get(pinEntry.wire);
                  if (!wire) return null;
                  const x = 52 + idx * 41;
                  const fillAttr = wire.striped
                    ? `url(#${std.id}-pat-${wire.id})`
                    : data.palette[wire.pair] ?? "#64748b";
                  return (
                    <g key={pinEntry.pin}>
                      {/* Gold contact finger at top */}
                      <rect
                        x={x + 6}
                        y="14"
                        width="16"
                        height="18"
                        rx="2"
                        fill="#eab308"
                        stroke="#a16207"
                        strokeWidth="1"
                      />
                      {/* Wire jacket entering pin channel */}
                      <rect
                        x={x + 3}
                        y="34"
                        width="22"
                        height="44"
                        rx="3"
                        fill={fillAttr}
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      {/* Pin number badge */}
                      <text
                        x={x + 14}
                        y="93"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="800"
                        fill="#0f172a"
                      >
                        P{pinEntry.pin}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Accessible Pin 1-8 Table with visible stripes, text labels, and pin numbers */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {std.pins.map((pinEntry) => {
                  const wire = wiresById.get(pinEntry.wire);
                  if (!wire) return null;
                  return (
                    <div
                      key={pinEntry.pin}
                      className="rounded-lg border border-theme bg-surface px-2.5 py-2"
                    >
                      <WireVisualSwatch
                        wire={wire}
                        palette={data.palette}
                        pinNumber={pinEntry.pin}
                        heightClass="h-6"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cable Types Reference Table from lan-cable.json */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-theme">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-theme bg-elevated text-secondary-theme">
              <tr>
                <th className="px-4 py-2.5 font-bold">Cable Type</th>
                <th className="px-4 py-2.5 font-bold">Wiring Rule</th>
                <th className="px-4 py-2.5 font-bold">Used For</th>
                <th className="px-4 py-2.5 font-bold">Tester Pin Pairs (End A → End B)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-surface">
              {data.cableTypes.map((ct) => (
                <tr key={ct.id}>
                  <td className="px-4 py-3 font-bold text-primary-theme">{ct.name}</td>
                  <td className="px-4 py-3 text-secondary-theme">{ct.wiring}</td>
                  <td className="px-4 py-3 text-secondary-theme">{ct.usedFor}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-blue-700 dark:text-blue-300">
                    {ct.testerPattern.map(([a, b]) => `${a}-${b}`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── SECTION (b): INTERACTIVE WIRING PRACTICE ─── */}
      <section
        aria-labelledby="lan-practice-heading"
        className="rounded-xl border border-theme bg-surface p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme pb-4">
          <div>
            <h3 id="lan-practice-heading" className="text-base font-bold text-primary-theme">
              2. Wiring Practice (Order Pins 1 to 8)
            </h3>
            <p className="mt-0.5 text-xs text-secondary-theme">
              Drag and drop wires, click two slots to swap them, or use the keyboard Move Left /
              Move Right buttons to arrange pins 1–8 for <strong className="text-primary-theme">{targetStandard.name}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-theme bg-elevated p-1">
              {data.standards.map((std) => (
                <button
                  key={std.id}
                  type="button"
                  onClick={() => {
                    setPracticeStandardId(std.id);
                    setPracticeChecked(false);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    practiceStandardId === std.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-secondary-theme hover:text-primary-theme"
                  }`}
                >
                  Target: {std.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={shufflePracticeWires}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle
            </button>

            <button
              type="button"
              onClick={() => setPracticeChecked(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Check Order
            </button>
          </div>
        </div>

        {/* 8 Interactive Pin Slots */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {practiceWireIds.map((wireId, slotIdx) => {
            const wire = wiresById.get(wireId);
            const result = practiceResults[slotIdx];
            const expectedWire = result ? wiresById.get(result.expectedWireId) : null;
            const isSelectedForSwap = selectedSwapSlotIdx === slotIdx;

            if (!wire || !result) return null;

            let cardBorder = "border-theme bg-elevated";
            if (isSelectedForSwap) {
              cardBorder = "border-blue-500 bg-blue-50/60 dark:bg-blue-500/15 ring-2 ring-blue-500/20";
            } else if (practiceChecked) {
              cardBorder = result.isCorrect
                ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/15"
                : "border-red-400 bg-red-50/60 dark:bg-red-500/15";
            }

            return (
              <div
                key={`slot-${slotIdx + 1}`}
                draggable
                onDragStart={() => setDraggedSlotIdx(slotIdx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedSlotIdx !== null && draggedSlotIdx !== slotIdx) {
                    swapPracticeSlots(draggedSlotIdx, slotIdx);
                  }
                  setDraggedSlotIdx(null);
                }}
                className={`flex flex-col justify-between rounded-xl border p-3 transition ${cardBorder}`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-slate-900 dark:bg-blue-600 px-2 py-0.5 font-mono text-xs font-bold text-white">
                      Pin {slotIdx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={slotIdx === 0}
                        onClick={() => swapPracticeSlots(slotIdx, slotIdx - 1)}
                        className="rounded border border-slate-300 dark:border-white/15 bg-surface p-1 text-secondary-theme hover:bg-slate-100 dark:hover:bg-white/10 hover:text-primary-theme disabled:opacity-35 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Move Pin ${slotIdx + 1} wire left`}
                        title="Move left"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={slotIdx === 7}
                        onClick={() => swapPracticeSlots(slotIdx, slotIdx + 1)}
                        className="rounded border border-slate-300 dark:border-white/15 bg-surface p-1 text-secondary-theme hover:bg-slate-100 dark:hover:bg-white/10 hover:text-primary-theme disabled:opacity-35 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Move Pin ${slotIdx + 1} wire right`}
                        title="Move right"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSwapSlotIdx === null) {
                        setSelectedSwapSlotIdx(slotIdx);
                      } else if (selectedSwapSlotIdx === slotIdx) {
                        setSelectedSwapSlotIdx(null);
                      } else {
                        swapPracticeSlots(selectedSwapSlotIdx, slotIdx);
                        setSelectedSwapSlotIdx(null);
                      }
                    }}
                    className="w-full rounded-lg border border-theme bg-surface p-2.5 text-left transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Pin ${slotIdx + 1}: currently ${wire.label}. Click to select or swap.`}
                  >
                    <WireVisualSwatch wire={wire} palette={data.palette} heightClass="h-7" />
                  </button>
                </div>

                {practiceChecked && (
                  <div className="mt-2.5 border-t border-theme pt-2 text-xs">
                    {result.isCorrect ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Correct ({wire.label})
                      </span>
                    ) : (
                      <div className="text-red-800 dark:text-red-200">
                        <span className="inline-flex items-center gap-1 font-bold text-red-700 dark:text-red-300">
                          <XCircle className="h-3.5 w-3.5" />
                          Wrong wire
                        </span>
                        <p className="mt-0.5 text-[11px]">
                          Belongs here: <strong>{expectedWire?.label ?? result.expectedWireId}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {practiceChecked && (
          <div
            role="status"
            className={`mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${
              practiceScore === 8
                ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                : "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200"
            }`}
          >
            <span>
              {practiceScore === 8
                ? `Perfect! All 8 pins match ${targetStandard.name}.`
                : `You got ${practiceScore} of 8 pins right for ${targetStandard.name}. Check the red pins above to see which wire belongs in each slot.`}
            </span>
            <button
              type="button"
              onClick={shufflePracticeWires}
              className="rounded-lg border border-theme bg-surface px-3 py-1 text-xs font-bold text-primary-theme shadow-sm hover:bg-elevated"
            >
              New Shuffle Round
            </button>
          </div>
        )}
      </section>

      {/* ─── SECTION (c): CRIMPING STEPS STEPPER & TOOLS ─── */}
      <section
        aria-labelledby="lan-crimping-heading"
        className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      >
        {/* Interactive 9-Step Crimping Stepper */}
        <div className="flex flex-col justify-between rounded-xl border border-theme bg-surface p-5 shadow-sm lg:col-span-7">
          <div>
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <h3 id="lan-crimping-heading" className="text-base font-bold text-primary-theme">
                3. Step-by-Step Cable Crimping Guide
              </h3>
              <span className="rounded-full bg-blue-50 dark:bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                Step {activeCrimpStep.step} of {data.crimpingSteps.length}
              </span>
            </div>

            {/* Step Pill Selector */}
            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Crimping steps">
              {data.crimpingSteps.map((s, idx) => (
                <button
                  key={s.step}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeCrimpIdx}
                  onClick={() => setActiveCrimpIdx(idx)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    idx === activeCrimpIdx
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-theme bg-elevated text-primary-theme hover:bg-slate-200/70 dark:hover:bg-white/10"
                  }`}
                >
                  {s.step}
                </button>
              ))}
            </div>

            {/* Step SVG Illustration + Title & Detail */}
            <div className="mt-4 rounded-xl border border-theme bg-elevated p-4">
              <div className="mb-3 flex items-center justify-center rounded-lg border border-theme bg-surface p-3">
                <svg
                  viewBox="0 0 420 110"
                  className="h-24 w-full max-w-[380px]"
                  role="img"
                  aria-label={`Illustration for Step ${activeCrimpStep.step}: ${activeCrimpStep.title}`}
                >
                  {/* Step-specific visual diagram */}
                  <rect x="10" y="10" width="400" height="90" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
                  {/* Outer blue UTP cable jacket */}
                  <rect x="28" y="38" width="140" height="34" rx="6" fill="#2563EB" />
                  <text x="98" y="59" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
                    UTP Cat5e/Cat6
                  </text>
                  {/* 8 colored inner wires fan-out */}
                  {[
                    "#F58220",
                    "#2E9B3F",
                    "#1E6FD9",
                    "#7A4B2A",
                    "#F58220",
                    "#2E9B3F",
                    "#1E6FD9",
                    "#7A4B2A",
                  ].map((hex, i) => (
                    <line
                      key={i}
                      x1="168"
                      y1={42 + i * 3.5}
                      x2="265"
                      y2={30 + i * 7}
                      stroke={hex}
                      strokeWidth="3"
                    />
                  ))}
                  {/* RJ45 plug / Crimp / Tester target box on right */}
                  <rect
                    x="265"
                    y="24"
                    width="120"
                    height="62"
                    rx="6"
                    fill="#dbeafe"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                  />
                  <text
                    x="325"
                    y="52"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill="#1e3a8a"
                  >
                    Step {activeCrimpStep.step}
                  </text>
                  <text
                    x="325"
                    y="68"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="#1d4ed8"
                  >
                    {activeCrimpStep.title}
                  </text>
                </svg>
              </div>

              <h4 className="text-sm font-bold text-primary-theme">
                Step {activeCrimpStep.step}: {activeCrimpStep.title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-secondary-theme">
                {activeCrimpStep.detail}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-theme pt-3">
            <button
              type="button"
              disabled={activeCrimpIdx === 0}
              onClick={() => setActiveCrimpIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous Step
            </button>
            <button
              type="button"
              disabled={activeCrimpIdx === data.crimpingSteps.length - 1}
              onClick={() =>
                setActiveCrimpIdx((i) => Math.min(data.crimpingSteps.length - 1, i + 1))
              }
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Next Step
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tools Needed List from lan-cable.json */}
        <div className="rounded-xl border border-theme bg-surface p-5 shadow-sm lg:col-span-5">
          <h3 className="flex items-center gap-2 border-b border-theme pb-3 text-base font-bold text-primary-theme">
            <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Required Tools &amp; Materials ({data.tools.length})
          </h3>
          <ul className="mt-3 space-y-2.5">
            {data.tools.map((tool) => (
              <li
                key={tool.id}
                className="rounded-lg border border-theme bg-elevated p-3"
              >
                <p className="text-xs font-bold text-primary-theme">{tool.name}</p>
                <p className="mt-0.5 text-xs text-secondary-theme">{tool.use}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── SECTION (d): CABLE TESTER SIMULATOR ─── */}
      <section
        aria-labelledby="lan-tester-heading"
        className="rounded-xl border border-theme bg-surface p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme pb-4">
          <div>
            <h3 id="lan-tester-heading" className="flex items-center gap-2 text-base font-bold text-primary-theme">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              4. Interactive LAN Cable Tester Simulator
            </h3>
            <p className="mt-0.5 text-xs text-secondary-theme">
              Configure End A and End B (preset T568A/T568B or swap pins manually), optionally
              simulate an Open or Short fault, and press <strong className="text-primary-theme">Test Cable</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunCableTest}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Test Cable
            </button>
            {isTestingAnim && (
              <button
                type="button"
                onClick={() => setIsTestingAnim(false)}
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-2 text-xs font-semibold text-primary-theme hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Pause LED Loop
              </button>
            )}
          </div>
        </div>

        {/* End A, End B, and Fault Injection Controls */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* End A Configuration */}
          <div className="rounded-xl border border-theme bg-elevated p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-primary-theme">End A (Main Unit)</span>
              <div className="inline-flex rounded-md border border-theme bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => applyEndAPreset("T568A")}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    endAPreset === "T568A" ? "bg-blue-600 text-white" : "text-secondary-theme"
                  }`}
                >
                  T568A
                </button>
                <button
                  type="button"
                  onClick={() => applyEndAPreset("T568B")}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    endAPreset === "T568B" ? "bg-blue-600 text-white" : "text-secondary-theme"
                  }`}
                >
                  T568B
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {endAPinWires.map((wId, idx) => {
                const w = wiresById.get(wId);
                return (
                  <div
                    key={`endA-${idx}`}
                    className="flex items-center justify-between rounded-md border border-theme bg-surface px-2.5 py-1 text-xs"
                  >
                    <span className="font-mono text-[11px] font-bold text-primary-theme">
                      Pin {idx + 1}: {w?.label ?? wId}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => swapTesterEndPins("A", idx, idx - 1)}
                        className="rounded border border-theme bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-secondary-theme hover:text-primary-theme disabled:opacity-30"
                        aria-label={`Move End A Pin ${idx + 1} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === 7}
                        onClick={() => swapTesterEndPins("A", idx, idx + 1)}
                        className="rounded border border-theme bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-secondary-theme hover:text-primary-theme disabled:opacity-30"
                        aria-label={`Move End A Pin ${idx + 1} down`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* End B Configuration */}
          <div className="rounded-xl border border-theme bg-elevated p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-primary-theme">End B (Remote Unit)</span>
              <div className="inline-flex rounded-md border border-theme bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => applyEndBPreset("T568A")}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    endBPreset === "T568A" ? "bg-blue-600 text-white" : "text-secondary-theme"
                  }`}
                >
                  T568A
                </button>
                <button
                  type="button"
                  onClick={() => applyEndBPreset("T568B")}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    endBPreset === "T568B" ? "bg-blue-600 text-white" : "text-secondary-theme"
                  }`}
                >
                  T568B
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {endBPinWires.map((wId, idx) => {
                const w = wiresById.get(wId);
                return (
                  <div
                    key={`endB-${idx}`}
                    className="flex items-center justify-between rounded-md border border-theme bg-surface px-2.5 py-1 text-xs"
                  >
                    <span className="font-mono text-[11px] font-bold text-primary-theme">
                      Pin {idx + 1}: {w?.label ?? wId}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => swapTesterEndPins("B", idx, idx - 1)}
                        className="rounded border border-theme bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-secondary-theme hover:text-primary-theme disabled:opacity-30"
                        aria-label={`Move End B Pin ${idx + 1} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === 7}
                        onClick={() => swapTesterEndPins("B", idx, idx + 1)}
                        className="rounded border border-theme bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-secondary-theme hover:text-primary-theme disabled:opacity-30"
                        aria-label={`Move End B Pin ${idx + 1} down`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fault Simulation & LED Sequencer */}
          <div className="flex flex-col justify-between rounded-xl border border-theme bg-elevated p-4 text-primary-theme">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  8-LED Sequencer (Pin {currentTesterStep.pinA})
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((stepIdx) => (
                    <button
                      key={stepIdx}
                      type="button"
                      onClick={() => {
                        setIsTestingAnim(false);
                        setActiveLedStepIdx(stepIdx);
                      }}
                      className={`h-5 w-5 rounded text-[10px] font-bold ${
                        activeLedStepIdx === stepIdx
                          ? "bg-blue-600 text-white"
                          : "border border-theme bg-surface text-secondary-theme hover:text-primary-theme"
                      }`}
                      title={`Inspect Pin ${stepIdx + 1} pulse`}
                    >
                      {stepIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dual 8-LED Bar (Main & Remote) */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-theme bg-surface p-3">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase text-secondary-theme">
                    Main Tester LEDs
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((pinNum) => {
                      const isLit = currentTesterStep.ledsA.includes(pinNum);
                      return (
                        <div
                          key={`ledA-${pinNum}`}
                          className={`flex flex-col items-center rounded border py-1.5 font-mono text-xs font-bold ${
                            isLit
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                              : "border-theme bg-elevated text-secondary-theme"
                          }`}
                        >
                          {pinNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase text-secondary-theme">
                    Remote Tester LEDs
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((pinNum) => {
                      const isLit = currentTesterStep.ledsB.includes(pinNum);
                      return (
                        <div
                          key={`ledB-${pinNum}`}
                          className={`flex flex-col items-center rounded border py-1.5 font-mono text-xs font-bold ${
                            isLit
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                              : "border-theme bg-elevated text-secondary-theme"
                          }`}
                        >
                          {pinNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fault Injection Controls (Open / Short) */}
              <div className="space-y-2 border-t border-theme pt-3 text-xs">
                <div>
                  <label htmlFor="sim-open-select" className="block text-[11px] font-semibold text-primary-theme">
                    Simulate Open Wire (Uncrimped Pin):
                  </label>
                  <select
                    id="sim-open-select"
                    value={simulatedOpenPin ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSimulatedOpenPin(val);
                      if (val !== null) setSimulatedShortPair(null);
                    }}
                    className="mt-1 w-full rounded border border-slate-300 dark:border-white/15 bg-surface px-2.5 py-1 text-xs text-primary-theme [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="">None (All 8 pins make contact)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        Open on Pin {p} (LED {p} stays dark)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sim-short-select" className="block text-[11px] font-semibold text-primary-theme">
                    Simulate Shorted Wires (Two Pins Touching):
                  </label>
                  <select
                    id="sim-short-select"
                    value={simulatedShortPair ? `${simulatedShortPair[0]}-${simulatedShortPair[1]}` : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        setSimulatedShortPair(null);
                        return;
                      }
                      const [p1, p2] = raw.split("-").map(Number);
                      if (p1 && p2) {
                        setSimulatedShortPair([p1, p2]);
                        setSimulatedOpenPin(null);
                      }
                    }}
                    className="mt-1 w-full rounded border border-slate-300 dark:border-white/15 bg-surface px-2.5 py-1 text-xs text-primary-theme [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="">None (No short circuit)</option>
                    <option value="1-2">Short Pin 1 &amp; Pin 2</option>
                    <option value="3-6">Short Pin 3 &amp; Pin 6</option>
                    <option value="4-5">Short Pin 4 &amp; Pin 5</option>
                    <option value="7-8">Short Pin 7 &amp; Pin 8</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pin-to-Pin Mapping Summary Pills */}
            <div className="mt-3 border-t border-theme pt-2.5">
              <p className="text-[10px] font-semibold uppercase text-secondary-theme">
                Pin-to-Pin Mapping (End A → End B):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {testerResult.steps.map((st, idx) => (
                  <span
                    key={st.pinA}
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      idx === activeLedStepIdx ? "ring-2 ring-blue-500 " : ""
                    }${
                      st.status === "ok"
                        ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                        : "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/15 text-red-800 dark:text-red-200"
                    }`}
                  >
                    {st.mappingLabel}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Classification Result Banner + Fault Reference Cards */}
        <div className="mt-4 rounded-xl border border-theme bg-elevated p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary-theme">
                Cable Tester Diagnosis
              </span>
              <h4 className="mt-0.5 text-base font-bold text-primary-theme">
                {testerResult.classification === "straight-through" &&
                  `✅ ${testerResult.matchedCableType?.name ?? "Straight-Through Cable"}`}
                {testerResult.classification === "crossover" &&
                  `✅ ${testerResult.matchedCableType?.name ?? "Crossover Cable"}`}
                {testerResult.classification === "miswire" &&
                  `⚠️ ${testerResult.matchedFault?.name ?? "Miswire"}`}
                {testerResult.classification === "open" &&
                  `❌ ${testerResult.matchedFault?.name ?? "Open"}`}
                {testerResult.classification === "short" &&
                  `❌ ${testerResult.matchedFault?.name ?? "Short"}`}
              </h4>
              <p className="mt-1 text-xs text-secondary-theme">
                {testerResult.matchedCableType
                  ? `${testerResult.matchedCableType.wiring} — Used for: ${testerResult.matchedCableType.usedFor}`
                  : testerResult.matchedFault?.meaning}
              </p>
            </div>
          </div>

          {testerResult.wrongPins.length > 0 && (
            <div className="mt-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 p-3 text-xs text-red-900 dark:text-red-200">
              <p className="font-bold">Detected Pin Issues ({testerResult.wrongPins.length}):</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {testerResult.wrongPins.map((wp) => (
                  <li key={wp.pinA}>{wp.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* All 4 Fault Definitions from lan-cable.json (including Split Pair) */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {data.faults.map((fault) => (
              <div
                key={fault.id}
                className="rounded-lg border border-theme bg-surface p-3 text-xs"
              >
                <p className="flex items-center gap-1.5 font-bold text-primary-theme">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  {fault.name}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-secondary-theme">{fault.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GOOD TO KNOW BOX (facts[] from lan-cable.json) ─── */}
      <section
        aria-labelledby="lan-facts-heading"
        className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 p-5"
      >
        <h3
          id="lan-facts-heading"
          className="flex items-center gap-2 text-sm font-bold text-blue-950 dark:text-blue-200"
        >
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Good to Know
        </h3>
        <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.facts.map((fact, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 rounded-lg border border-theme bg-surface px-3.5 py-2.5 text-xs text-primary-theme shadow-sm"
            >
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {idx + 1}
              </span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
