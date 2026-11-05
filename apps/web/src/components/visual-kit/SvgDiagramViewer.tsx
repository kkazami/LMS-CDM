"use client";

import React, { useId, useRef } from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme-context";
import { Check, X, Zap, Power, ExternalLink, Info } from "lucide-react";
import type { Diagram, Part, Shape } from "@/lib/visual-kit/types";

export interface SvgDiagramViewerProps {
  diagram: Diagram;
  mode: "explore" | "label";
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  labelAnswers?: Record<string, string | null>;
  isSubmitted?: boolean;
  scoreResults?: Record<string, boolean>;
  circuitClosed?: boolean;
  onToggleCircuit?: () => void;
}

export default function SvgDiagramViewer({
  diagram,
  mode,
  selectedPartId,
  onSelectPart,
  labelAnswers = {},
  isSubmitted = false,
  scoreResults = {},
  circuitClosed = true,
  onToggleCircuit,
}: SvgDiagramViewerProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const glowFilterId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const { w, h } = diagram.viewBox;

  // Dev-only calibration click logger (guarded against production)
  const handleCalibrationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (process.env.NODE_ENV === "production") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    console.log(`[VisualKit Calibration] x: ${x}%, y: ${y}%`);
  };

  // Render generic shape for fallback/interactive vector redraws
  const renderShape = (shape: Shape, key: string, isPartSelected = false) => {
    const isCircuitLightBulb =
      diagram.id === "simple-electric-circuit" &&
      key.includes("light-bulb-load");

    let fill = shape.fill;
    let stroke = shape.stroke;
    let opacity = shape.opacity ?? 1;

    // Dark-mode adjustments for default card/subtle fills
    if (fill === "var(--card-subtle, #f8fafc)") {
      fill = isDark ? "#1e293b" : "#f8fafc";
    } else if (fill === "var(--card-subtle, #f1f5f9)") {
      fill = isDark ? "#1e293b" : "#f1f5f9";
    }

    if (stroke === "var(--border-subtle, #cbd5e1)") {
      stroke = isDark ? "#475569" : "#cbd5e1";
    } else if (stroke === "var(--border-subtle, #e2e8f0)") {
      stroke = isDark ? "#334155" : "#e2e8f0";
    }

    // Circuit interactive overrides
    if (diagram.id === "simple-electric-circuit" && !circuitClosed) {
      if (isCircuitLightBulb && shape.type === "circle") {
        fill = isDark ? "#334155" : "#cbd5e1";
        stroke = isDark ? "#475569" : "#94a3b8";
      }
      if (key.includes("current-direction-flow")) {
        stroke = isDark ? "#475569" : "#94a3b8";
        opacity = 0.35;
      }
    }

    // Selected highlight in explore mode
    if (isPartSelected && mode === "explore") {
      stroke = "#f59e0b"; // vibrant amber accent
    }

    const commonProps = {
      fill: fill ?? "none",
      stroke: stroke ?? "none",
      strokeWidth: isPartSelected && mode === "explore" ? (shape.strokeWidth ?? 2) + 1.5 : shape.strokeWidth,
      strokeDasharray: shape.strokeDasharray,
      strokeLinecap: shape.strokeLinecap,
      opacity,
      transform: shape.transform,
      className: shape.className,
    };

    switch (shape.type) {
      case "circle":
        return <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} />;
      case "ellipse":
        return (
          <ellipse
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            {...commonProps}
          />
        );
      case "rect":
        return (
          <rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.rx ?? 0}
            {...commonProps}
          />
        );
      case "line":
        return (
          <line
            key={key}
            x1={shape.x1}
            y1={shape.y1}
            x2={shape.x2}
            y2={shape.y2}
            {...commonProps}
          />
        );
      case "polygon":
        return <polygon key={key} points={shape.points} {...commonProps} />;
      case "path":
        return <path key={key} d={shape.d} {...commonProps} />;
      case "text":
        return (
          <text
            key={key}
            x={shape.x}
            y={shape.y}
            fontSize={shape.fontSize}
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight="bold"
            {...commonProps}
            fill={fill ?? (isDark ? "#f8fafc" : "#0f172a")}
          >
            {shape.text}
          </text>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col">
      {/* Top Banner with Circuit Toggle (if supported) */}
      {diagram.supportsCircuitToggle && onToggleCircuit && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Zap
              className={`h-4 w-4 ${
                circuitClosed ? "text-amber-500 animate-pulse" : "text-slate-400"
              }`}
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Interactive Circuit Switch
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleCircuit}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              circuitClosed
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Power className="h-3 w-3" />
            <span>{circuitClosed ? "Switch CLOSED (Active)" : "Switch OPEN (Inactive)"}</span>
          </button>
        </div>
      )}

      {/* Main Illustration & Hotspots Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleCalibrationClick}
        className="relative w-full overflow-hidden bg-slate-50 dark:bg-slate-900/60 p-2 sm:p-4 flex items-center justify-center min-h-[300px]"
      >
        <div
          className="relative w-full max-w-[850px] mx-auto select-none rounded-xl overflow-hidden"
          style={{ aspectRatio: diagram.aspectRatio ?? "4/3" }}
        >
          {diagram.imageSrc ? (
            /* =========================================================================
               PROFESSIONAL LICENSED 2D ILLUSTRATION RENDERER
               Rendered via Next/Image (sanitized, scripts cannot run)
               ========================================================================= */
            <div className="relative w-full h-full bg-white dark:bg-slate-950 flex items-center justify-center">
              <Image
                src={diagram.imageSrc}
                alt={diagram.imageAlt ?? diagram.title}
                fill
                sizes="(max-width: 768px) 100vw, 850px"
                className="object-contain select-none pointer-events-none"
                priority
                unoptimized
              />
            </div>
          ) : (
            /* =========================================================================
               VECTOR REDRAW / INTERACTIVE SIMULATION RENDERER
               Used for custom interactive circuits and verified vector redraws
               ========================================================================= */
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="w-full h-full select-none"
              role="img"
              aria-label={diagram.title}
            >
              <defs>
                <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <rect
                x={0}
                y={0}
                width={w}
                height={h}
                fill={isDark ? "#090d16" : "#fafafa"}
                rx={12}
              />

              {/* Circuit-closed glow effect around light bulb */}
              {diagram.id === "simple-electric-circuit" && circuitClosed && (
                <g className="transition-opacity duration-300">
                  <circle
                    cx={490}
                    cy={210}
                    r={50}
                    fill="rgba(250, 204, 21, 0.25)"
                    filter={`url(#${glowFilterId})`}
                  />
                  <circle
                    cx={490}
                    cy={210}
                    r={68}
                    fill="rgba(250, 204, 21, 0.12)"
                  />
                  <line x1={490} y1={140} x2={490} y2={125} stroke="#eab308" strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={540} y1={160} x2={555} y2={148} stroke="#eab308" strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={560} y1={210} x2={575} y2={210} stroke="#eab308" strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={440} y1={160} x2={425} y2={148} stroke="#eab308" strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={420} y1={210} x2={405} y2={210} stroke="#eab308" strokeWidth={2.5} strokeLinecap="round" />
                </g>
              )}

              {/* Background Decorations */}
              {diagram.decorations.map((deco, idx) =>
                renderShape(deco, `deco-${idx}`)
              )}

              {/* Circuit Switch Interactive Lever */}
              {diagram.id === "simple-electric-circuit" && (
                <g className="transition-transform duration-200">
                  {circuitClosed ? (
                    <line
                      x1={275}
                      y1={80}
                      x2={325}
                      y2={80}
                      stroke="#22c55e"
                      strokeWidth={5}
                      strokeLinecap="round"
                    />
                  ) : (
                    <line
                      x1={275}
                      y1={80}
                      x2={315}
                      y2={54}
                      stroke="#94a3b8"
                      strokeWidth={5}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              )}

              {/* Diagram Parts (Shapes) */}
              {diagram.parts.map((part) => {
                if (!part.shape) return null;
                const isSelected = selectedPartId === part.id;
                const shapes = Array.isArray(part.shape) ? part.shape : [part.shape];

                return (
                  <g
                    key={part.id}
                    role="button"
                    tabIndex={0}
                    aria-label={part.name}
                    onClick={() => onSelectPart(part.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectPart(part.id);
                      }
                    }}
                    className="cursor-pointer transition-transform duration-150 focus:outline-none"
                  >
                    {shapes.map((s, sIdx) =>
                      renderShape(s, `${part.id}-${sIdx}`, isSelected)
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* =========================================================================
              ACCESSIBLE NUMBERED HOTSPOT BUTTON OVERLAY
              Positions accurately scale with container width (x%, y%)
              ========================================================================= */}
          <div className="absolute inset-0 pointer-events-none">
            {diagram.parts.map((part, index) => {
              const markerNum = index + 1;
              const isSelected = selectedPartId === part.id;
              const studentAnswer = labelAnswers[part.id];
              const hasAnswer = Boolean(studentAnswer);
              const isCorrect = scoreResults[part.id];

              let markerBg = isDark
                ? "bg-slate-900 text-slate-100 border-slate-600"
                : "bg-white text-slate-900 border-slate-400";

              if (mode === "explore") {
                if (isSelected) {
                  markerBg = "bg-amber-500 text-white border-amber-600 ring-4 ring-amber-400/40";
                }
              } else {
                // Label It Mode
                if (isSubmitted) {
                  if (isCorrect) {
                    markerBg = "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/30";
                  } else {
                    markerBg = "bg-rose-600 text-white border-rose-700 ring-2 ring-rose-500/30";
                  }
                } else if (isSelected) {
                  markerBg = "bg-sky-600 text-white border-sky-700 ring-4 ring-sky-400/40";
                } else if (hasAnswer) {
                  markerBg = isDark
                    ? "bg-teal-700 text-teal-100 border-teal-500"
                    : "bg-teal-600 text-white border-teal-700";
                }
              }

              return (
                <div
                  key={`hotspot-${part.id}`}
                  style={{
                    left: `${part.anchor.x}%`,
                    top: `${part.anchor.y}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                >
                  <button
                    type="button"
                    role="button"
                    aria-label={`Marker ${markerNum}: ${part.name}`}
                    onClick={() => onSelectPart(part.id)}
                    className={`relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-bold border-2 shadow-md transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-500 ${markerBg}`}
                  >
                    {mode === "label" && isSubmitted ? (
                      isCorrect ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <X className="h-3.5 w-3.5 stroke-[3]" />
                      )
                    ) : (
                      <span>{markerNum}</span>
                    )}
                  </button>

                  {/* Label It Mode: Assigned badge below marker */}
                  {mode === "label" && studentAnswer && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 pointer-events-none whitespace-nowrap z-20">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold shadow-xs border ${
                          isSubmitted
                            ? isCorrect
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700"
                              : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700"
                            : "bg-white/95 text-slate-800 border-slate-300 dark:bg-slate-900/95 dark:text-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {studentAnswer.length > 14
                          ? `${studentAnswer.slice(0, 13)}…`
                          : studentAnswer}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attribution & Provenance Footer */}
      {diagram.attribution && (
        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">
                {diagram.attribution.sourceTitle}
              </strong>{" "}
              by {diagram.attribution.author} • Licensed under{" "}
              <a
                href={diagram.attribution.licenseUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-sky-600 dark:hover:text-sky-400 inline-flex items-center gap-0.5"
              >
                <span>{diagram.attribution.licenseName}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              via {diagram.attribution.viaText}
            </span>
          </div>
          {diagram.attribution.notes && (
            <span className="text-[10px] italic text-slate-400">
              {diagram.attribution.notes}
            </span>
          )}
        </div>
      )}

      {/* Helper Legend / Hint footer */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {mode === "explore"
            ? "Click any numbered hotspot button on the illustration to inspect its physiological mechanism and teaching tips."
            : "Select a numbered hotspot, then click its corresponding scientific label from the word bank."}
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {diagram.parts.length} components
        </span>
      </div>
    </div>
  );
}
