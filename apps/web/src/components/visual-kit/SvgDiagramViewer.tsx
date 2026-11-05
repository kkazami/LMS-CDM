"use client";

import React, { useId } from "react";
import { useTheme } from "@/lib/theme-context";
import { Check, X, Zap, Power } from "lucide-react";
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

  const { w, h } = diagram.viewBox;

  // Render generic shape
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

      {/* Main SVG Container */}
      <div className="relative w-full aspect-[4/3] max-h-[560px] p-2 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-full select-none"
          role="img"
          aria-label={diagram.title}
        >
          <defs>
            {/* Glow filter for active selections and closed circuit */}
            <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Canvas background subtle rect */}
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
              {/* Radiating light rays */}
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

          {/* Anchor Markers */}
          {diagram.parts.map((part, index) => {
            const markerNum = index + 1;
            const isSelected = selectedPartId === part.id;
            const studentAnswer = labelAnswers[part.id];
            const hasAnswer = Boolean(studentAnswer);
            const isCorrect = scoreResults[part.id];

            // Marker visual styling based on mode and scoring
            let markerBg = isDark ? "#1e293b" : "#ffffff";
            let markerBorder = isDark ? "#475569" : "#94a3b8";
            let markerText = isDark ? "#f8fafc" : "#0f172a";

            if (mode === "explore") {
              if (isSelected) {
                markerBg = "#f59e0b"; // amber
                markerBorder = "#b45309";
                markerText = "#ffffff";
              }
            } else {
              // Label It Mode
              if (isSubmitted) {
                if (isCorrect) {
                  markerBg = "#16a34a"; // green
                  markerBorder = "#15803d";
                  markerText = "#ffffff";
                } else {
                  markerBg = "#dc2626"; // red
                  markerBorder = "#b91c1c";
                  markerText = "#ffffff";
                }
              } else if (isSelected) {
                markerBg = "#2563eb"; // blue
                markerBorder = "#1d4ed8";
                markerText = "#ffffff";
              } else if (hasAnswer) {
                markerBg = isDark ? "#0f766e" : "#ccfbf1";
                markerBorder = isDark ? "#14b8a6" : "#0d9488";
                markerText = isDark ? "#ffffff" : "#0f766e";
              }
            }

            return (
              <g
                key={`marker-${part.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Marker ${markerNum}: ${part.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPart(part.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectPart(part.id);
                  }
                }}
                className="cursor-pointer group focus:outline-none"
              >
                {/* Active marker outer halo */}
                {isSelected && (
                  <circle
                    cx={part.anchor.x}
                    cy={part.anchor.y}
                    r={18}
                    fill="none"
                    stroke={mode === "explore" ? "#f59e0b" : "#3b82f6"}
                    strokeWidth={2.5}
                    className="animate-pulse"
                  />
                )}

                {/* Marker Circle */}
                <circle
                  cx={part.anchor.x}
                  cy={part.anchor.y}
                  r={12}
                  fill={markerBg}
                  stroke={markerBorder}
                  strokeWidth={2}
                  filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.25))"
                  className="transition-colors duration-150 group-hover:scale-110"
                />

                {/* Marker Number or Status Icon */}
                {mode === "label" && isSubmitted ? (
                  isCorrect ? (
                    <text
                      x={part.anchor.x}
                      y={part.anchor.y + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight="bold"
                    >
                      ✓
                    </text>
                  ) : (
                    <text
                      x={part.anchor.x}
                      y={part.anchor.y + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight="bold"
                    >
                      ✕
                    </text>
                  )
                ) : (
                  <text
                    x={part.anchor.x}
                    y={part.anchor.y + 3.5}
                    textAnchor="middle"
                    fill={markerText}
                    fontSize={10}
                    fontWeight="bold"
                  >
                    {markerNum}
                  </text>
                )}

                {/* In Label mode: Answer Badge below marker if assigned */}
                {mode === "label" && studentAnswer && (
                  <g>
                    <rect
                      x={part.anchor.x - 45}
                      y={part.anchor.y + 15}
                      width={90}
                      height={18}
                      rx={4}
                      fill={isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)"}
                      stroke={
                        isSubmitted
                          ? isCorrect
                            ? "#16a34a"
                            : "#dc2626"
                          : isDark
                          ? "#334155"
                          : "#cbd5e1"
                      }
                      strokeWidth={1}
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.15))"
                    />
                    <text
                      x={part.anchor.x}
                      y={part.anchor.y + 27}
                      textAnchor="middle"
                      fill={isDark ? "#e2e8f0" : "#1e293b"}
                      fontSize={9}
                      fontWeight="600"
                    >
                      {studentAnswer.length > 15
                        ? `${studentAnswer.slice(0, 14)}…`
                        : studentAnswer}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Helper Legend / Hint footer */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {mode === "explore"
            ? "Click on any anatomical part or numbered marker to inspect its function and pedagogy tips."
            : "Select a numbered marker, then choose the matching anatomical label from the word bank."}
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {diagram.parts.length} components
        </span>
      </div>
    </div>
  );
}

