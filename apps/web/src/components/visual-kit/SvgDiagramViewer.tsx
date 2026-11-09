"use client";

import React, { useId, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme-context";
import {
  Check,
  X,
  Zap,
  Power,
  ExternalLink,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import type { Diagram, Shape } from "@/lib/visual-kit/types";

export interface SvgDiagramViewerProps {
  diagram: Diagram;
  mode: "explore" | "label";
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  selectedExtraId?: string | null;
  onSelectExtra?: (extraId: string) => void;
  labelAnswers?: Record<string, string | null>;
  isSubmitted?: boolean;
  scoreResults?: Record<string, boolean>;
  circuitClosed?: boolean;
  onToggleCircuit?: () => void;
  fullscreenSidebar?: React.ReactNode;
}

export default function SvgDiagramViewer({
  diagram,
  mode,
  selectedPartId,
  onSelectPart,
  selectedExtraId,
  onSelectExtra,
  labelAnswers = {},
  isSubmitted = false,
  scoreResults = {},
  circuitClosed = true,
  onToggleCircuit,
  fullscreenSidebar,
}: SvgDiagramViewerProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";
  const glowFilterId = useId();

  // Fullscreen and Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFullscreenSidebarOpen, setIsFullscreenSidebarOpen] = useState<boolean>(true);

  // Compute numerical aspect ratio (width / height)
  const aspect = React.useMemo(() => {
    if (diagram.aspectRatio) {
      const parts = diagram.aspectRatio.split("/").map(Number);
      if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
        return parts[0] / parts[1];
      }
    }
    if (diagram.viewBox?.w && diagram.viewBox?.h) {
      return diagram.viewBox.w / diagram.viewBox.h;
    }
    return 4 / 3;
  }, [diagram.aspectRatio, diagram.viewBox]);

  // Stage dimensions: sized by height (min(available height, containerWidth / aspect)), width = height * aspect
  const [stageBox, setStageBox] = useState<{ width: number; height: number }>(() => {
    if (typeof window === "undefined") {
      return { width: 600, height: 450 };
    }
    const availH = Math.max(420, Math.round(window.innerHeight * 0.7));
    const containerW = Math.min(
      850,
      Math.max(300, window.innerWidth > 1024 ? 650 : window.innerWidth - 32)
    );
    const h = Math.min(availH, containerW / aspect);
    return {
      width: Math.round(h * aspect),
      height: Math.round(h),
    };
  });

  const viewerWrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const diagramContentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Calculate and update stage size whenever aspect ratio, container dimensions, or fullscreen changes
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateStageSize = () => {
      const computed = window.getComputedStyle(el);
      const paddingX =
        (parseFloat(computed.paddingLeft) || 0) +
        (parseFloat(computed.paddingRight) || 0);
      const paddingY =
        (parseFloat(computed.paddingTop) || 0) +
        (parseFloat(computed.paddingBottom) || 0);

      const rawWidth = el.clientWidth || window.innerWidth;
      const rawHeight = el.clientHeight || window.innerHeight;

      const containerWidth = isFullscreen
        ? Math.max(100, rawWidth - paddingX)
        : Math.max(100, Math.min(850, rawWidth - paddingX));

      let availHeight: number;
      if (isFullscreen) {
        availHeight = Math.max(300, rawHeight - paddingY);
      } else {
        availHeight = Math.max(420, Math.round(window.innerHeight * 0.7));
      }

      const height = Math.min(availHeight, containerWidth / aspect);
      const width = Math.round(height * aspect);
      const finalHeight = Math.round(height);

      setStageBox({ width, height: finalHeight });
    };

    updateStageSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateStageSize();
      });
      ro.observe(el);
    }

    window.addEventListener("resize", updateStageSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateStageSize);
    };
  }, [aspect, isFullscreen, isFullscreenSidebarOpen]);

  // Reset zoom and pan whenever active diagram changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [diagram.id]);

  // Handle Fullscreen events and Esc key listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isDocFs);
      if (!isDocFs) {
        // Return body overflow to normal
        document.body.style.overflow = "";
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        document.body.style.overflow = "";
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Lock body scroll when fullscreen is active (whether native or fallback overlay)
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Fullscreen toggle handler with API + overlay fallback
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
      setIsFullscreen(false);
      document.body.style.overflow = "";
    } else {
      setIsFullscreen(true);
      if (viewerWrapperRef.current && document.fullscreenEnabled) {
        try {
          await viewerWrapperRef.current.requestFullscreen();
        } catch {
          // Fallback overlay applies via isFullscreen state
        }
      }
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom handler: ctrl/meta wheel in normal view, or any wheel in fullscreen
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || isFullscreen) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setZoom((prev) => {
        const next = Math.min(3, Math.max(1, Math.round((prev + delta) * 100) / 100));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Pointer drag panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || zoom <= 1) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const container = viewportRef.current;
    let maxPanX = 140;
    let maxPanY = 100;
    if (container) {
      const cWidth = container.clientWidth;
      const cHeight = container.clientHeight;
      maxPanX = Math.max(40, ((cWidth * zoom) - cWidth) / 2 + 50);
      maxPanY = Math.max(30, ((cHeight * zoom) - cHeight) / 2 + 40);
    }

    const nextX = Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.panX + deltaX));
    const nextY = Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.panY + deltaY));
    setPan({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Sanitize label targets on mobile/responsive: ensure minimum tap target and shrink rather than overlap
  const sanitizedLabelTargets = React.useMemo(() => {
    if (!diagram.labelTargets || diagram.labelTargets.length === 0) return [];
    const list = diagram.labelTargets.map((t) => ({ ...t, box: { ...t.box } }));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const xOverlap = Math.max(
          0,
          Math.min(a.box.x + a.box.w, b.box.x + b.box.w) - Math.max(a.box.x, b.box.x)
        );
        const yOverlap = Math.max(
          0,
          Math.min(a.box.y + a.box.h, b.box.y + b.box.h) - Math.max(a.box.y, b.box.y)
        );
        if (xOverlap > 0 && yOverlap > 0) {
          if (a.box.y < b.box.y) {
            a.box.h = Math.max(0, b.box.y - a.box.y);
          } else {
            b.box.h = Math.max(0, a.box.y - b.box.y);
          }
        }
      }
    }
    return list;
  }, [diagram.labelTargets]);

  const { w, h } = diagram.viewBox;

  // Dev-only calibration click logger (guarded against production)
  const handleCalibrationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (process.env.NODE_ENV === "production" || zoom > 1 || isDragging) return;
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
      strokeWidth:
        isPartSelected && mode === "explore"
          ? (shape.strokeWidth ?? 2) + 1.5
          : shape.strokeWidth,
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

  // Fullscreen Container Classes (Standard layout vs Fixed Overlay)
  const wrapperClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-slate-950 flex flex-col w-screen h-screen overflow-hidden text-slate-100"
    : "relative w-full rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs flex flex-col";

  return (
    <div ref={viewerWrapperRef} className={wrapperClasses}>
      {/* =========================================================================
          TOOLBAR & CONTROLS BAR (Circuit toggle + Zoom & Fullscreen Toolbar)
          ========================================================================= */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-100/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-2">
        {/* Left: Circuit Toggle or Diagram Mode Title */}
        <div className="flex items-center gap-2 min-w-0">
          {diagram.supportsCircuitToggle && onToggleCircuit ? (
            <div className="flex items-center gap-2">
              <Zap
                className={`h-4 w-4 shrink-0 ${
                  circuitClosed ? "text-amber-500 animate-pulse" : "text-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={onToggleCircuit}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  circuitClosed
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Power className="h-3 w-3" />
                <span className="truncate">
                  {circuitClosed ? "Switch CLOSED (Active)" : "Switch OPEN (Inactive)"}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
              <span className="font-semibold text-slate-800 dark:text-white truncate">
                {diagram.title}
              </span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
                {diagram.parts.length} components
              </span>
            </div>
          )}
        </div>

        {/* Right: Diagram Toolbar (Zoom in, Zoom out, 1x Reset, Fullscreen) */}
        <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-0.5 shadow-2xs">
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in (+)"
            disabled={zoom >= 3}
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out (-)"
            disabled={zoom <= 1}
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          {zoom > 1 && (
            <button
              type="button"
              aria-label="Reset zoom to 100%"
              title="Reset zoom (1x)"
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-all flex items-center gap-0.5 cursor-pointer"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
          )}

          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 my-auto mx-0.5" />

          {/* Fullscreen Inspector Sidebar Toggle (only visible in fullscreen) */}
          {isFullscreen && fullscreenSidebar && (
            <button
              type="button"
              aria-label={
                isFullscreenSidebarOpen
                  ? "Hide inspector panel"
                  : "Show inspector panel"
              }
              title={
                isFullscreenSidebarOpen
                  ? "Hide inspector panel"
                  : "Show inspector panel"
              }
              onClick={() => setIsFullscreenSidebarOpen(!isFullscreenSidebarOpen)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isFullscreenSidebarOpen
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {isFullscreenSidebarOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" />
              ) : (
                <PanelRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEWPORT & CANVAS WRAPPER (Zoom, Pan Dragging, Aspect Ratio)
          ========================================================================= */}
      <div className={`relative w-full flex-1 flex overflow-hidden ${isFullscreen ? "min-h-0" : ""}`}>
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full flex-1 overflow-hidden bg-slate-50/70 dark:bg-slate-900/60 p-2 sm:p-4 flex items-center justify-center select-none touch-none ${
            isFullscreen ? "min-h-0" : "min-h-[420px]"
          } ${
            zoom > 1
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-default"
          }`}
        >
          {/* Zoom notification indicator pill */}
          {zoom > 1 && (
            <div className="absolute top-2 left-2 z-20 pointer-events-none px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-semibold backdrop-blur-xs flex items-center gap-1 shadow-xs">
              <span>{Math.round(zoom * 100)}%</span>
              <span className="text-slate-300 font-normal">
                • Drag to pan
              </span>
            </div>
          )}

          {/* Main Transformed Container (Both Illustration AND Hotspot Overlays share this exact transform) */}
          <div
            ref={diagramContentRef}
            onClick={handleCalibrationClick}
            className="relative mx-auto select-none rounded-xl overflow-hidden transition-transform duration-75 will-change-transform"
            style={{
              width: `${stageBox.width}px`,
              height: `${stageBox.height}px`,
              maxWidth: "100%",
              aspectRatio: diagram.aspectRatio ?? "4/3",
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {diagram.imageSrc ? (
              /* =========================================================================
                 PROFESSIONAL LICENSED 2D ILLUSTRATION RENDERER
                 ========================================================================= */
              <div
                {...(diagram.id === "water-cycle" ? { "data-keep-white": "true" } : {})}
                className={`relative w-full h-full flex items-center justify-center ${
                  diagram.id === "water-cycle"
                    ? "bg-white dark:bg-slate-950"
                    : "bg-slate-100/90 dark:bg-slate-900/80"
                }`}
              >
                <Image
                  src={diagram.imageSrc}
                  alt={diagram.imageAlt ?? diagram.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 850px"
                  className={`object-contain select-none pointer-events-none transition-[filter] duration-200 ${
                    diagram.id === "digestive-system"
                      ? "dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.22)]"
                      : ""
                  }`}
                  priority
                  unoptimized
                />

                {/* Cover Patches for Label It Mode to conceal printed anatomical/process text */}
                {mode === "label" && diagram.coverBoxes && diagram.coverBoxes.length > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none z-10"
                    aria-hidden="true"
                    data-testid="diagram-cover-boxes"
                  >
                    {diagram.coverBoxes.map((box, bIdx) => (
                      <div
                        key={`cover-box-${bIdx}`}
                        className="absolute rounded bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-2xs"
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.w}%`,
                          height: `${box.h}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* =========================================================================
                 VECTOR REDRAW / INTERACTIVE SIMULATION RENDERER
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
                Hotspot markers counter-scale by 1/zoom so their tap targets remain readable
                ========================================================================= */}
            <div className="absolute inset-0 pointer-events-none z-20">
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
                    {/* Counter-scale wrapper ensures markers maintain crisp standard tap size under zoom */}
                    <div
                      style={{
                        transform: `scale(${1 / zoom})`,
                        transformOrigin: "center center",
                      }}
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
                  </div>
                );
              })}
            </div>

            {/* =========================================================================
                CLICKABLE PRINTED ANATOMICAL LABELS (EXPLORE MODE ONLY)
                ========================================================================= */}
            {mode === "explore" && sanitizedLabelTargets.length > 0 && (
              <div
                className="absolute inset-0 pointer-events-none z-20"
                data-testid="diagram-label-targets"
              >
                {sanitizedLabelTargets.map((target, idx) => {
                  const isPartMapped = Boolean(target.partId);
                  const isSelected = isPartMapped
                    ? selectedPartId === target.partId
                    : selectedExtraId === target.extra;

                  const selectedBorder = isPartMapped
                    ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-400/50"
                    : "border-sky-500 bg-sky-500/15 ring-2 ring-sky-400/50";

                  return (
                    <button
                      key={`label-target-${idx}-${target.label}`}
                      type="button"
                      aria-label={`${target.label} - show details`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (target.partId) {
                          onSelectPart(target.partId);
                        } else if (target.extra && onSelectExtra) {
                          onSelectExtra(target.extra);
                        }
                      }}
                      style={{
                        left: `${target.box.x}%`,
                        top: `${target.box.y}%`,
                        width: `${target.box.w}%`,
                        height: `${target.box.h}%`,
                        minHeight: "24px",
                      }}
                      className={`absolute pointer-events-auto rounded-md transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 border ${
                        isSelected
                          ? selectedBorder
                          : "border-transparent hover:border-sky-400/80 hover:bg-sky-500/10 dark:hover:border-sky-400/70 dark:hover:bg-sky-500/15"
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            FULLSCREEN COLLAPSIBLE INSPECTOR SIDEBAR (Desktop) / BOTTOM SHEET (Mobile)
            ========================================================================= */}
        {isFullscreen && fullscreenSidebar && isFullscreenSidebarOpen && (
          <aside
            aria-label="Fullscreen Inspector & Tools"
            className="w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/95 backdrop-blur-md overflow-y-auto p-4 max-h-[45vh] lg:max-h-none z-30 transition-all text-slate-100"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {mode === "explore" ? "Inspector Details" : "Labeling Challenge"}
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreenSidebarOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                title="Collapse sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {fullscreenSidebar}
          </aside>
        )}
      </div>

      {/* =========================================================================
          COMPACT ATTRIBUTION FOOTER DIRECTLY UNDER DIAGRAM
          ========================================================================= */}
      {diagram.attribution && !isFullscreen && (
        <div className="px-3.5 py-1.5 bg-slate-50/90 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Info className="h-3 w-3 text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">
                {diagram.attribution.sourceTitle}
              </strong>{" "}
              {diagram.attribution.licenseName && diagram.attribution.licenseUrl ? (
                <>
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
                  {diagram.attribution.viaText && `via ${diagram.attribution.viaText}`}
                </>
              ) : (
                <span>• {diagram.attribution.author}</span>
              )}
            </span>
          </div>
          {diagram.attribution.notes && (
            <span className="text-[10px] italic text-slate-400">
              {diagram.attribution.notes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
