"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  MousePointerClick,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import type {
  Diagram,
  ScienceArea,
  BestScoresPayload,
  BestScoreRecord,
} from "@/lib/visual-kit/types";
import {
  deserializeBestScores,
  parseVisualKitTopic,
  scoreLabelingAnswers,
  serializeBestScores,
  shufflePartNames,
} from "@/lib/visual-kit/rules";
import { ParticleLogoCanvas } from "@/components/ict-lab/ParticleLogoCanvas";
import { getVisualKitTopicTheme } from "@/lib/visual-kit/topic-themes";
import {
  createInitialHoverState,
  nextHoverState,
  LEAVE_GRACE_PERIOD_MS,
  type HoverMachineState,
} from "@/lib/ict-lab/hover-machine";
import type { Point2D } from "@/lib/ict-lab/particle-shapes";
import SvgDiagramViewer from "./SvgDiagramViewer";

const LOCAL_STORAGE_KEY = "visual_kit_best_scores";

interface VisualKitClientProps {
  institute: string;
  studentName: string;
  programCode: string;
  programName?: string;
  initialDiagrams: Diagram[];
}

// Topic icon and area styling details
function getTopicIconDetails(diagramId: string, area: ScienceArea) {
  switch (diagramId) {
    case "human-heart":
      return {
        icon: HeartPulse,
        tileBg:
          "from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/50",
        idleClass: "visualkit-heart-beat",
        hoverClass: "group-hover:visualkit-heart-beat",
        selectedRing:
          "ring-2 ring-rose-500/70 shadow-rose-500/10 dark:shadow-rose-950/40",
      };
    case "digestive-system":
      return {
        icon: Apple,
        tileBg:
          "from-orange-500/20 to-amber-500/10 text-orange-600 dark:text-orange-400 border-orange-200/80 dark:border-orange-800/50",
        idleClass: "visualkit-apple-wobble",
        hoverClass: "group-hover:visualkit-apple-wobble",
        selectedRing:
          "ring-2 ring-orange-500/70 shadow-orange-500/10 dark:shadow-orange-950/40",
      };
    case "animal-cell":
      return {
        icon: Atom,
        tileBg:
          "from-teal-500/20 to-emerald-500/10 text-teal-600 dark:text-teal-400 border-teal-200/80 dark:border-teal-800/50",
        idleClass: "visualkit-atom-spin",
        hoverClass: "group-hover:visualkit-atom-spin",
        selectedRing:
          "ring-2 ring-teal-500/70 shadow-teal-500/10 dark:shadow-teal-950/40",
      };
    case "plant-photosynthesis":
    case "plant-structure":
      return {
        icon: Sprout,
        tileBg:
          "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50",
        idleClass: "visualkit-plant-sway",
        hoverClass: "group-hover:visualkit-plant-sway",
        selectedRing:
          "ring-2 ring-emerald-500/70 shadow-emerald-500/10 dark:shadow-emerald-950/40",
      };
    case "water-cycle":
      return {
        icon: CloudRain,
        tileBg:
          "from-sky-500/20 to-indigo-500/10 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/50",
        idleClass: "visualkit-rain-drip",
        hoverClass: "group-hover:visualkit-rain-drip",
        selectedRing:
          "ring-2 ring-sky-500/70 shadow-sky-500/10 dark:shadow-sky-950/40",
      };
    case "simple-electric-circuit":
      return {
        icon: Zap,
        tileBg:
          "from-amber-500/20 to-yellow-500/10 text-amber-500 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/50",
        idleClass: "visualkit-zap-flicker",
        hoverClass: "group-hover:visualkit-zap-flicker",
        selectedRing:
          "ring-2 ring-amber-500/70 shadow-amber-500/10 dark:shadow-amber-950/40",
      };
    default:
      return {
        icon: FlaskConical,
        tileBg:
          "from-sky-500/20 to-indigo-500/10 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/50",
        idleClass: "visualkit-flask-tilt",
        hoverClass: "group-hover:visualkit-flask-tilt",
        selectedRing:
          "ring-2 ring-sky-500/70 shadow-sky-500/10 dark:shadow-sky-950/40",
      };
  }
}

interface VisualKitHubCardProps {
  diagram: Diagram;
  bestScore?: BestScoreRecord;
  pathname: string;
}

function VisualKitHubCard({ diagram, bestScore, pathname }: VisualKitHubCardProps) {
  const [isActive, setIsActive] = useState(false);
  const hoverMachineRef = useRef<HoverMachineState>(createInitialHoverState());
  const pointerPosRef = useRef<Point2D | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const theme = useMemo(() => getVisualKitTopicTheme(diagram.id), [diagram.id]);
  const topicDetails = getTopicIconDetails(diagram.id, diagram.area);
  const TopicIcon = topicDetails.icon;

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

  const handlePointerLeave = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
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
      href={`${pathname}?topic=${diagram.id}`}
      aria-label={`${diagram.title} - ${diagram.parts.length} components`}
      draggable={false}
      onDragStart={(e: React.DragEvent) => e.preventDefault()}
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
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-xs select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 touch-pan-y ${theme.cardBorderHoverClass} ${theme.cardShadowHoverClass} ${theme.focusRingClass}`}
    >
      {/* Interactive Particle Logo Canvas (aria-hidden, z-0 background layer) */}
      <ParticleLogoCanvas
        theme={theme}
        particleCount={120}
        isHovered={isActive}
        pointerPosRef={pointerPosRef}
      />

      {/* Foreground Content (relative z-10, non-draggable, pointer-events-none) */}
      <div className="relative z-10 flex flex-1 flex-col justify-between select-none pointer-events-none">
        <div className="space-y-4">
          {/* Top Row: Icon Container & Area Tag */}
          <div className="flex items-center justify-between">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${topicDetails.tileBg} border shadow-2xs transition-all duration-200 ${theme.iconTileHoverClass}`}
            >
              <TopicIcon
                className={`h-6 w-6 inline-block ${topicDetails.idleClass}`}
                aria-hidden="true"
              />
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {diagram.area}
            </span>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h2
              className={`text-lg font-bold text-slate-900 dark:text-white transition-colors sm:text-xl ${theme.titleHoverClass}`}
            >
              {diagram.title}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {diagram.parts.length} labeled structures
            </p>
          </div>

          {/* Description */}
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
            {diagram.summary}
          </p>

          {/* Badges / Best Score */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {bestScore ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Trophy className="h-3 w-3" />
                Best: {bestScore.score}/{bestScore.total} ({bestScore.percentage}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Not tested yet
              </span>
            )}
            {diagram.extraStructures && diagram.extraStructures.length > 0 && (
              <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                +{diagram.extraStructures.length} related
              </span>
            )}
          </div>
        </div>

        {/* Bottom Action CTA */}
        <div
          className={`mt-6 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold shadow-xs select-none pointer-events-none transition-colors ${theme.buttonClass}`}
        >
          <span>Explore Topic</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function VisualKitClientContent({
  institute,
  studentName,
  programCode,
  programName,
  initialDiagrams,
}: VisualKitClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTopic = searchParams.get("topic");
  const activeTopicId = parseVisualKitTopic(rawTopic, initialDiagrams);

  // Active diagram resolved from URL query param (null = Hub view)
  const currentDiagram = useMemo(() => {
    if (!activeTopicId) return null;
    return initialDiagrams.find((d) => d.id === activeTopicId) ?? null;
  }, [activeTopicId, initialDiagrams]);

  // Topic View State (active when currentDiagram !== null)
  const [mode, setMode] = useState<"explore" | "label">("explore");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null);

  // Inspector Accordion state (single open section at a time)
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState<boolean>(false);
  const [isRelatedStructuresOpen, setIsRelatedStructuresOpen] =
    useState<boolean>(false);

  // Circuit simulation state
  const [circuitClosed, setCircuitClosed] = useState<boolean>(true);

  // Label It Mode State
  const [hardMode, setHardMode] = useState<boolean>(false);
  const [labelAnswers, setLabelAnswers] = useState<
    Record<string, string | null>
  >({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showingAnswers, setShowingAnswers] = useState<boolean>(false);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [bestScores, setBestScores] = useState<
    Record<string, BestScoreRecord>
  >({});

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Manage view transition: smooth scroll to top and focus view heading
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

    if (activeTopicId && headingRef.current) {
      headingRef.current.focus();
    }
  }, [activeTopicId]);

  // Reset view state whenever active topic changes
  useEffect(() => {
    setMode("explore");
    setSelectedPartId(null);
    setSelectedExtraId(null);
    setIsSubmitted(false);
    setShowingAnswers(false);
    setLabelAnswers({});
    setOpenSection(null);
    setIsRelatedStructuresOpen(false);
  }, [activeTopicId]);

  // Load best scores from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = deserializeBestScores(raw);
      setBestScores(parsed.scores);
    } catch {
      // ignore
    }
  }, []);

  // Sync Word Bank whenever currentDiagram or hardMode changes
  useEffect(() => {
    if (!currentDiagram) return;
    const allTopicParts = initialDiagrams.flatMap((d) => d.parts);
    const bank = shufflePartNames(currentDiagram.parts, {
      hardMode,
      area: currentDiagram.area,
      allTopicParts,
    });
    setWordBank(bank);
    setLabelAnswers({});
    setIsSubmitted(false);
    setShowingAnswers(false);
    setSelectedExtraId(null);
  }, [currentDiagram, hardMode, initialDiagrams]);

  // Selected Part object (null if no marker currently selected)
  const activePart = useMemo(() => {
    if (!currentDiagram || !selectedPartId) return null;
    return (
      currentDiagram.parts.find((p) => p.id === selectedPartId) ?? null
    );
  }, [currentDiagram, selectedPartId]);

  // Selected Extra Structure (if reference-only printed label is clicked)
  const activeExtra = useMemo(() => {
    if (!currentDiagram || !selectedExtraId) return null;
    return (
      currentDiagram.extraStructures?.find((e) => e.id === selectedExtraId) ??
      null
    );
  }, [currentDiagram, selectedExtraId]);

  // Total labeled components across all loaded diagrams
  const totalLabeledComponents = useMemo(() => {
    return initialDiagrams.reduce((acc, d) => acc + d.parts.length, 0);
  }, [initialDiagrams]);

  // Compute scoring evaluation
  const scoreData = useMemo(() => {
    if (!currentDiagram) return null;
    return scoreLabelingAnswers(labelAnswers, currentDiagram.parts);
  }, [currentDiagram, labelAnswers]);

  // Handle assigning an answer from word bank to currently selected part
  const handleAssignWord = (word: string) => {
    if (!selectedPartId || isSubmitted) return;

    setLabelAnswers((prev) => ({
      ...prev,
      [selectedPartId]: word,
    }));

    // Auto-advance to the next unassigned part marker
    if (currentDiagram) {
      const unassigned = currentDiagram.parts.find(
        (p) => p.id !== selectedPartId && !labelAnswers[p.id]
      );
      if (unassigned) {
        setSelectedPartId(unassigned.id);
      }
    }
  };

  // Check answers action
  const handleCheckAnswers = () => {
    if (!scoreData || !currentDiagram) return;
    setIsSubmitted(true);

    // Save best score if better or first time
    const currentBest = bestScores[currentDiagram.id];
    if (!currentBest || scoreData.score > currentBest.score) {
      const newRecord: BestScoreRecord = {
        score: scoreData.score,
        total: scoreData.total,
        percentage: scoreData.percentage,
        completedAt: new Date().toISOString(),
      };
      const updated = {
        ...bestScores,
        [currentDiagram.id]: newRecord,
      };
      setBestScores(updated);
      try {
        const payload: BestScoresPayload = { version: 1, scores: updated };
        localStorage.setItem(LOCAL_STORAGE_KEY, serializeBestScores(payload));
      } catch {
        // ignore
      }
    }
  };

  // Reset labeling challenge
  const handleResetChallenge = () => {
    if (!currentDiagram) return;
    const allTopicParts = initialDiagrams.flatMap((d) => d.parts);
    const bank = shufflePartNames(currentDiagram.parts, {
      hardMode,
      area: currentDiagram.area,
      allTopicParts,
    });
    setWordBank(bank);
    setLabelAnswers({});
    setIsSubmitted(false);
    setShowingAnswers(false);
    setSelectedPartId(null);
  };

  // Reveal correct answers
  const handleShowAnswers = () => {
    if (!currentDiagram) return;
    setShowingAnswers(true);
    const correctMap: Record<string, string> = {};
    for (const p of currentDiagram.parts) {
      correctMap[p.id] = p.name;
    }
    setLabelAnswers(correctMap);
  };

  // Toggle single accordion section
  const handleToggleSection = (sectionName: string) => {
    setOpenSection((prev) => (prev === sectionName ? null : sectionName));
  };

  // Render Collapsible Related Structures Reference Glossary
  const renderRelatedStructuresAccordion = () => {
    if (
      !currentDiagram ||
      !currentDiagram.extraStructures ||
      currentDiagram.extraStructures.length === 0
    ) {
      return null;
    }

    return (
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
        <button
          type="button"
          id="accordion-header-related-structures"
          aria-expanded={isRelatedStructuresOpen}
          aria-controls="accordion-panel-related-structures"
          onClick={() => setIsRelatedStructuresOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Info className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              Related structures ({currentDiagram.extraStructures.length})
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              • Reference glossary
            </span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              isRelatedStructuresOpen
                ? "rotate-180 text-sky-600 dark:text-sky-400"
                : ""
            }`}
          />
        </button>
        {isRelatedStructuresOpen && (
          <div
            id="accordion-panel-related-structures"
            role="region"
            aria-labelledby="accordion-header-related-structures"
            className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Supplementary anatomical features and layers referenced in pre-service science curricula:
            </p>
            <div className="space-y-2">
              {currentDiagram.extraStructures.map((extra) => {
                const isSelected = selectedExtraId === extra.id;
                return (
                  <div
                    key={extra.id}
                    onClick={() => {
                      setSelectedExtraId(extra.id);
                      setSelectedPartId(null);
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-sky-500/80 bg-sky-50/70 dark:bg-sky-950/40 shadow-xs"
                        : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {extra.name}
                      </span>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                        Reference
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {extra.definition}
                    </p>
                    {extra.where && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                        Location: {extra.where}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Component Details Card & Accordions
  const renderInspectorContent = () => {
    if (!currentDiagram) return null;

    if (!activePart && !activeExtra) {
      return (
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <MousePointerClick className="h-4 w-4 text-sky-500" />
            <span>Select a Component</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Click any numbered circular marker on the schematic to inspect its anatomical definition, biological function, classroom talking points, and common student misconceptions.
          </p>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
              Quick Select ({currentDiagram.parts.length} components):
            </div>
            <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-1">
              {currentDiagram.parts.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPartId(p.id);
                    setSelectedExtraId(null);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                >
                  {idx + 1}. {p.name}
                </button>
              ))}
            </div>
          </div>

          {renderRelatedStructuresAccordion()}
        </div>
      );
    }

    if (activeExtra) {
      return (
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Related Structure Reference
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeExtra.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedExtraId(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear selection"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <strong className="text-slate-900 dark:text-slate-200 block text-[11px]">
                Definition:
              </strong>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                {activeExtra.definition}
              </p>
            </div>
            {activeExtra.where && (
              <div>
                <strong className="text-slate-900 dark:text-slate-200 block text-[11px]">
                  Where to locate:
                </strong>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5 italic">
                  {activeExtra.where}
                </p>
              </div>
            )}
          </div>

          {renderRelatedStructuresAccordion()}
        </div>
      );
    }

    if (!activePart) return null;

    const partIndex = currentDiagram.parts.findIndex((p) => p.id === activePart.id) + 1;

    return (
      <div className="space-y-3">
        {/* Component Title & 1-Sentence Primary Function */}
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold">
                {partIndex}
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {activePart.name}
              </h2>
            </div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Part {partIndex} of {currentDiagram.parts.length}
            </span>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Primary Function
            </div>
            <p className="mt-1 text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {activePart.function}
            </p>
          </div>
        </div>

        {/* Accordion 1: How It Works / Detailed Mechanism */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <button
            type="button"
            id="accordion-header-mechanism"
            aria-expanded={openSection === "mechanism"}
            aria-controls="accordion-panel-mechanism"
            onClick={() => handleToggleSection("mechanism")}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              How it works (Physiological Mechanism)
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                openSection === "mechanism" ? "rotate-180 text-sky-600 dark:text-sky-400" : ""
              }`}
            />
          </button>
          {openSection === "mechanism" && (
            <div
              id="accordion-panel-mechanism"
              role="region"
              aria-labelledby="accordion-header-mechanism"
              className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
            >
              {activePart.details}
            </div>
          )}
        </div>

        {/* Accordion 2: Pre-service Teaching Tip */}
        {activePart.teachingTip && (
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <button
              type="button"
              id="accordion-header-teaching"
              aria-expanded={openSection === "teaching"}
              aria-controls="accordion-panel-teaching"
              onClick={() => handleToggleSection("teaching")}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Pre-service Teaching Tip
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  openSection === "teaching"
                    ? "rotate-180 text-amber-600 dark:text-amber-400"
                    : ""
                }`}
              />
            </button>
            {openSection === "teaching" && (
              <div
                id="accordion-panel-teaching"
                role="region"
                aria-labelledby="accordion-header-teaching"
                className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20"
              >
                {activePart.teachingTip}
              </div>
            )}
          </div>
        )}

        {/* Facts & Misconceptions Accordion */}
        {(activePart.funFact || activePart.commonMisconception) && (
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <button
              type="button"
              id="accordion-header-facts"
              aria-expanded={openSection === "facts"}
              aria-controls="accordion-panel-facts"
              onClick={() => handleToggleSection("facts")}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Did You Know &amp; Misconceptions
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  openSection === "facts"
                    ? "rotate-180 text-sky-600 dark:text-sky-400"
                    : ""
                }`}
              />
            </button>
            {openSection === "facts" && (
              <div
                id="accordion-panel-facts"
                role="region"
                aria-labelledby="accordion-header-facts"
                className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs leading-relaxed"
              >
                {activePart.funFact && (
                  <div className="p-2.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 text-sky-900 dark:text-sky-200">
                    <span className="font-semibold block text-[11px] mb-0.5">
                      Did you know?
                    </span>
                    {activePart.funFact}
                  </div>
                )}
                {activePart.commonMisconception && (
                  <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 text-rose-900 dark:text-rose-200">
                    <span className="font-semibold block text-[11px] mb-0.5">
                      Common Student Misconception:
                    </span>
                    {activePart.commonMisconception}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapsed Related Structures Reference Glossary */}
        {renderRelatedStructuresAccordion()}
      </div>
    );
  };

  // Render Label It Mode Panel
  const renderLabelItPanel = () => {
    if (!currentDiagram) return null;

    return (
      <div className="space-y-3">
        {/* Word Bank Card */}
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Word Bank
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedPartId
                  ? `Assigning marker #${
                      currentDiagram.parts.findIndex(
                        (p) => p.id === selectedPartId
                      ) + 1
                    }:`
                  : "Tap a marker on the diagram to assign a term:"}
              </p>
            </div>
            {hardMode && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                +2 Distractors
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {wordBank.map((word) => {
              const assignedPartId = Object.entries(labelAnswers).find(
                ([_, val]) => val === word
              )?.[0];
              const isAssigned = Boolean(assignedPartId);

              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => handleAssignWord(word)}
                  disabled={isSubmitted || isAssigned || !selectedPartId}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isAssigned
                      ? "bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : !selectedPartId
                      ? "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 opacity-70 cursor-not-allowed"
                      : "bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 shadow-2xs hover:scale-[1.02] cursor-pointer"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        {/* Marker Assignments Status List */}
        <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assignments ({Object.keys(labelAnswers).length}/
              {currentDiagram.parts.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Click row to select
            </span>
          </div>

          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
            {currentDiagram.parts.map((p, idx) => {
              const isSelected = selectedPartId === p.id;
              const assigned = labelAnswers[p.id];
              const isCorrect = scoreData?.results[p.id];

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPartId(p.id)}
                  className={`flex items-center justify-between p-1.5 px-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/40"
                      : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                        isSubmitted
                          ? isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-rose-500 text-white"
                          : assigned
                          ? "bg-teal-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {assigned ? (
                        <span>{assigned}</span>
                      ) : (
                        <span className="text-slate-400 italic">
                          Click to assign...
                        </span>
                      )}
                    </span>
                  </div>

                  {assigned && !isSubmitted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLabelAnswers((prev) => {
                          const copy = { ...prev };
                          delete copy[p.id];
                          return copy;
                        });
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-500 p-0.5"
                      title="Clear term"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const currentTopicDetails = currentDiagram
    ? getTopicIconDetails(currentDiagram.id, currentDiagram.area)
    : null;
  const CurrentTopicIcon = currentTopicDetails?.icon ?? FlaskConical;
  const currentBestScore = currentDiagram ? bestScores[currentDiagram.id] : null;

  return (
    <div className="space-y-5">
      {/* Visual Kit Keyframe Styles (honors prefers-reduced-motion) */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes visualkitElectronOrbit1 {
            0% { transform: rotate(0deg) scaleY(1); }
            100% { transform: rotate(360deg) scaleY(1); }
          }
          @keyframes visualkitElectronOrbit2 {
            0% { transform: rotate(60deg) scaleY(1); }
            100% { transform: rotate(420deg) scaleY(1); }
          }
          @keyframes visualkitElectronOrbit3 {
            0% { transform: rotate(120deg) scaleY(1); }
            100% { transform: rotate(480deg) scaleY(1); }
          }
          .visualkit-electron-orbit-1 { animation: visualkitElectronOrbit1 4.5s linear infinite; }
          .visualkit-electron-orbit-2 { animation: visualkitElectronOrbit2 5.5s linear infinite; }
          .visualkit-electron-orbit-3 { animation: visualkitElectronOrbit3 6.5s linear infinite; }

          @keyframes visualkitNucleusPulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          .visualkit-nucleus-pulse { animation: visualkitNucleusPulse 2.8s ease-in-out infinite; will-change: transform, opacity; }

          @keyframes visualkitNucleusGlow {
            0%, 100% { transform: scale(1); opacity: 0.45; }
            50% { transform: scale(1.22); opacity: 0.75; }
          }
          .visualkit-nucleus-glow { animation: visualkitNucleusGlow 2.8s ease-in-out infinite; will-change: transform, opacity; }

          @keyframes visualkitBubbleRise1 {
            0% { transform: translateY(0px) scale(0.8); opacity: 0; }
            30% { opacity: 0.85; }
            100% { transform: translateY(-16px) scale(1.1); opacity: 0; }
          }
          @keyframes visualkitBubbleRise2 {
            0% { transform: translateY(0px) scale(0.8); opacity: 0; }
            30% { opacity: 0.85; }
            100% { transform: translateY(-18px) scale(1.1); opacity: 0; }
          }
          @keyframes visualkitBubbleRise3 {
            0% { transform: translateY(0px) scale(0.8); opacity: 0; }
            30% { opacity: 0.85; }
            100% { transform: translateY(-14px) scale(1.1); opacity: 0; }
          }
          @keyframes visualkitBubbleRise4 {
            0% { transform: translateY(0px) scale(0.8); opacity: 0; }
            30% { opacity: 0.85; }
            100% { transform: translateY(-17px) scale(1.1); opacity: 0; }
          }
          .visualkit-bubble-1 { animation: visualkitBubbleRise1 2.8s ease-out infinite; will-change: transform, opacity; }
          .visualkit-bubble-2 { animation: visualkitBubbleRise2 3.1s ease-out 0.7s infinite; will-change: transform, opacity; }
          .visualkit-bubble-3 { animation: visualkitBubbleRise3 2.5s ease-out 1.4s infinite; will-change: transform, opacity; }
          .visualkit-bubble-4 { animation: visualkitBubbleRise4 2.9s ease-out 2.1s infinite; will-change: transform, opacity; }

          @keyframes visualkitMoleculeFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-4px) rotate(6deg); }
          }
          .visualkit-molecule-float { animation: visualkitMoleculeFloat 4.2s ease-in-out infinite; will-change: transform; }

          @keyframes visualkitMoleculeFloatAlt {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(4px) rotate(-5deg); }
          }
          .visualkit-molecule-float-alt { animation: visualkitMoleculeFloatAlt 3.8s ease-in-out 0.5s infinite; will-change: transform; }

          @keyframes visualkitFlaskTilt {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(8deg); }
          }
          .visualkit-flask-tilt {
            display: inline-block;
            animation: visualkitFlaskTilt 2.8s ease-in-out infinite;
            transform-origin: center bottom;
            will-change: transform;
          }

          @keyframes visualkitStatFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          .visualkit-stat-float {
            display: inline-block;
            animation: visualkitStatFloat 2.6s ease-in-out infinite;
            will-change: transform;
          }
          .visualkit-stat-float-delayed {
            display: inline-block;
            animation: visualkitStatFloat 2.6s ease-in-out 0.8s infinite;
            will-change: transform;
          }

          @keyframes visualkitEyeBlink {
            0%, 88%, 100% { transform: scaleY(1); }
            94% { transform: scaleY(0.12); }
          }
          .visualkit-eye-blink {
            display: inline-block;
            animation: visualkitEyeBlink 3.4s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform;
          }

          @keyframes visualkitSparkleTwinkle {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
            50% { transform: scale(1.22) rotate(15deg); opacity: 1; }
          }
          .visualkit-sparkle-twinkle {
            display: inline-block;
            animation: visualkitSparkleTwinkle 2.4s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          @keyframes visualkitHeartBeat {
            0%, 100% { transform: scale(1); }
            14% { transform: scale(1.18); }
            28% { transform: scale(1); }
            42% { transform: scale(1.15); }
            56% { transform: scale(1); }
          }
          .visualkit-heart-beat {
            display: inline-block;
            animation: visualkitHeartBeat 1.6s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform;
          }

          @keyframes visualkitAppleWobble {
            0%, 100% { transform: rotate(0deg) translateY(0px); }
            25% { transform: rotate(-9deg) translateY(-2px); }
            75% { transform: rotate(9deg) translateY(-2px); }
          }
          .visualkit-apple-wobble {
            display: inline-block;
            animation: visualkitAppleWobble 2.2s ease-in-out infinite;
            transform-origin: center bottom;
            will-change: transform;
          }

          @keyframes visualkitAtomSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.12); }
            100% { transform: rotate(360deg) scale(1); }
          }
          .visualkit-atom-spin {
            display: inline-block;
            animation: visualkitAtomSpin 6s linear infinite;
            transform-origin: center center;
            will-change: transform;
          }

          @keyframes visualkitPlantSway {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(8deg); }
          }
          .visualkit-plant-sway {
            display: inline-block;
            animation: visualkitPlantSway 2.6s ease-in-out infinite;
            transform-origin: center bottom;
            will-change: transform;
          }

          @keyframes visualkitRainDrip {
            0% { transform: translateY(-3px) scale(0.9); opacity: 0.5; }
            50% { transform: translateY(1px) scale(1.12); opacity: 1; }
            100% { transform: translateY(4px) scale(0.85); opacity: 0.3; }
          }
          .visualkit-rain-drip {
            display: inline-block;
            animation: visualkitRainDrip 1.8s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          @keyframes visualkitZapFlicker {
            0%, 100% { transform: scale(1); opacity: 0.85; filter: drop-shadow(0 0 0 rgba(245,158,11,0)); }
            25% { transform: scale(1.18); opacity: 1; filter: drop-shadow(0 0 6px rgba(245,158,11,0.6)); }
            50% { transform: scale(1.05); opacity: 0.9; }
            75% { transform: scale(1.22); opacity: 1; filter: drop-shadow(0 0 8px rgba(245,158,11,0.8)); }
          }
          .visualkit-zap-flicker {
            display: inline-block;
            animation: visualkitZapFlicker 1.9s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform, opacity, filter;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .visualkit-electron-orbit-1,
          .visualkit-electron-orbit-2,
          .visualkit-electron-orbit-3,
          .visualkit-nucleus-pulse,
          .visualkit-nucleus-glow,
          .visualkit-bubble-1,
          .visualkit-bubble-2,
          .visualkit-bubble-3,
          .visualkit-bubble-4,
          .visualkit-molecule-float,
          .visualkit-molecule-float-alt,
          .visualkit-flask-tilt,
          .visualkit-stat-float,
          .visualkit-stat-float-delayed,
          .visualkit-eye-blink,
          .visualkit-sparkle-twinkle,
          .visualkit-heart-beat,
          .visualkit-apple-wobble,
          .visualkit-atom-spin,
          .visualkit-plant-sway,
          .visualkit-rain-drip,
          .visualkit-zap-flicker {
            animation: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          VIEW A: HUB VIEW (When ?topic= is missing, empty, or invalid)
          ========================================================================= */}
      {!currentDiagram && (
        <div className="space-y-6">
          {/* Retained Hero Header */}
          <section
            aria-labelledby="visual-kit-heading"
            className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/25 to-blue-50/20 p-4 sm:p-6 shadow-2xs dark:border-white/10 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950"
          >
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Text Content */}
              <div className="space-y-1.5 max-w-xl min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-sky-900 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                    <FlaskConical
                      className="h-3 w-3 text-sky-600 dark:text-sky-400 visualkit-flask-tilt inline-block"
                      aria-hidden="true"
                    />
                    BSEd Science
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300">
                    <GraduationCap className="h-3 w-3 text-slate-500" />
                    {programName ?? "Secondary Education"}
                  </span>
                </div>

                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  id="visual-kit-heading"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white outline-none"
                >
                  Interactive Visual Learning Kit
                </h1>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Interactive 2D anatomical schematics, biological ultrastructures, and physical processes for pre-service science teaching and self-check mastery.
                </p>
              </div>

              {/* Middle: Decorative Animated Science Scene */}
              <div
                className="hidden lg:flex shrink-0 items-center justify-center pointer-events-none select-none px-2 opacity-60 hover:opacity-85 transition-opacity scale-90"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 200 130"
                  className="w-36 xl:w-44 h-auto max-h-24 overflow-visible select-none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <radialGradient id="visualkitNucleusGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="visualkitFlaskLiquid" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                  </defs>

                  <g className="visualkit-molecule-float" style={{ transformOrigin: "22px 35px" }}>
                    <polygon
                      points="22,26 29,30 29,39 22,43 15,39 15,30"
                      fill="none"
                      className="stroke-teal-500/40 dark:stroke-teal-400/50"
                      strokeWidth="1.2"
                    />
                    <circle cx="22" cy="26" r="1.5" className="fill-teal-600 dark:fill-teal-300" />
                    <circle cx="29" cy="39" r="1.5" className="fill-cyan-600 dark:fill-cyan-300" />
                    <circle cx="15" cy="39" r="1.5" className="fill-sky-600 dark:fill-sky-300" />
                  </g>

                  <g className="visualkit-molecule-float-alt" style={{ transformOrigin: "165px 25px" }}>
                    <line x1="160" y1="25" x2="172" y2="22" className="stroke-indigo-400/40 dark:stroke-indigo-400/50" strokeWidth="1.5" />
                    <circle cx="160" cy="25" r="2.5" className="fill-indigo-600 dark:fill-indigo-400" />
                    <circle cx="172" cy="22" r="2" className="fill-sky-600 dark:fill-sky-400" />
                  </g>

                  <g transform="translate(75, 68) rotate(0) scale(1, 0.38)">
                    <circle cx="0" cy="0" r="38" fill="none" className="stroke-cyan-600/30 dark:stroke-cyan-400/40" strokeWidth="1.5" />
                    <g className="visualkit-electron-orbit-1" style={{ transformOrigin: "0px 0px" }}>
                      <circle cx="38" cy="0" r="3.5" className="fill-cyan-600 dark:fill-cyan-300" />
                    </g>
                  </g>

                  <g transform="translate(75, 68) rotate(60) scale(1, 0.38)">
                    <circle cx="0" cy="0" r="38" fill="none" className="stroke-sky-600/30 dark:stroke-sky-400/40" strokeWidth="1.5" />
                    <g className="visualkit-electron-orbit-2" style={{ transformOrigin: "0px 0px" }}>
                      <circle cx="38" cy="0" r="3.5" className="fill-sky-600 dark:fill-sky-300" />
                    </g>
                  </g>

                  <g transform="translate(75, 68) rotate(120) scale(1, 0.38)">
                    <circle cx="0" cy="0" r="38" fill="none" className="stroke-teal-600/30 dark:stroke-teal-400/40" strokeWidth="1.5" />
                    <g className="visualkit-electron-orbit-3" style={{ transformOrigin: "0px 0px" }}>
                      <circle cx="38" cy="0" r="3.5" className="fill-teal-600 dark:fill-teal-300" />
                    </g>
                  </g>

                  <circle cx="75" cy="68" r="14" fill="url(#visualkitNucleusGlow)" className="visualkit-nucleus-glow" style={{ transformOrigin: "75px 68px" }} />
                  <circle cx="75" cy="68" r="6" className="fill-amber-500 dark:fill-amber-400 visualkit-nucleus-pulse" style={{ transformOrigin: "75px 68px" }} />

                  <g transform="translate(0, 0)">
                    <path
                      d="M 143 44 L 153 44 M 145 44 L 145 54 L 133 88 C 131 92 134 96 138 96 L 158 96 C 162 96 165 92 163 88 L 151 54 L 151 44"
                      fill="none"
                      className="stroke-slate-600/50 dark:stroke-slate-400/50"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 136 78 C 142 76 154 80 160 78 L 162 88 C 163 92 161 95 157 95 L 139 95 C 135 95 133 92 134 88 Z"
                      fill="url(#visualkitFlaskLiquid)"
                      opacity="0.85"
                    />
                    <circle cx="145" cy="88" r="2.2" className="fill-cyan-200 dark:fill-cyan-100 visualkit-bubble-1" style={{ transformOrigin: "145px 88px" }} />
                    <circle cx="152" cy="84" r="1.8" className="fill-cyan-200 dark:fill-cyan-100 visualkit-bubble-2" style={{ transformOrigin: "152px 84px" }} />
                    <circle cx="142" cy="80" r="2.5" className="fill-teal-200 dark:fill-teal-100 visualkit-bubble-3" style={{ transformOrigin: "142px 80px" }} />
                  </g>
                </svg>
              </div>

              {/* Right: Stat Chips */}
              <div className="flex flex-row lg:flex-col gap-2.5 w-full sm:w-auto shrink-0">
                <div className="flex-1 sm:flex-initial sm:min-w-[140px] rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 px-3 py-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                    <span>Interactive Topics</span>
                    <Layers className="h-3 w-3 text-sky-600 dark:text-sky-400 visualkit-stat-float" aria-hidden="true" />
                  </div>
                  <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                    {initialDiagrams.length} Diagrams
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {totalLabeledComponents} components
                  </div>
                </div>

                <div className="flex-1 sm:flex-initial sm:min-w-[140px] rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 px-3 py-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                    <span>Pre-service</span>
                    <GraduationCap className="h-3 w-3 text-sky-600 dark:text-sky-400 visualkit-stat-float-delayed" aria-hidden="true" />
                  </div>
                  <div className="mt-0.5 text-base font-bold text-sky-700 dark:text-sky-400">
                    K to 12
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    DepEd Science aligned
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Hub: ONLY Topic Choice Cards in a 3-Col / 2-Col / 1-Col Grid */}
          <main aria-label="Visual Learning Topics" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {initialDiagrams.map((d) => (
              <VisualKitHubCard
                key={d.id}
                diagram={d}
                bestScore={bestScores[d.id]}
                pathname={pathname}
              />
            ))}
          </main>
        </div>
      )}

      {/* =========================================================================
          VIEW B: FULL-PAGE TOPIC VIEW (When ?topic=<id> is valid)
          ========================================================================= */}
      {currentDiagram && (
        <div className="space-y-4">
          {/* Top Navigation Bar: Back to Visual Kit Button, Topic Info & Best Score */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3.5">
              <Link
                href={pathname}
                aria-label="Back to Visual Kit Hub"
                className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-150 hover:border-sky-400 dark:hover:border-sky-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Back to Visual Kit</span>
                <span className="sm:hidden">Back</span>
              </Link>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${currentTopicDetails?.tileBg} border shadow-2xs`}
                >
                  <CurrentTopicIcon
                    className={`h-5 w-5 ${currentTopicDetails?.idleClass}`}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white outline-none focus:ring-0 sm:text-xl"
                  >
                    {currentDiagram.title}
                  </h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {currentDiagram.area} • {currentDiagram.parts.length} components
                  </p>
                </div>
              </div>
            </div>

            {/* Badges / Best Score */}
            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              {currentBestScore && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Trophy className="h-3.5 w-3.5" />
                  Best: {currentBestScore.score}/{currentBestScore.total} ({currentBestScore.percentage}%)
                </span>
              )}
              <span className="rounded-md border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/40 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-300">
                BSEd Science
              </span>
            </div>
          </div>

          {/* Main Full-Width Topic Workspace (Diagram ~60% on Left, Inspector/WordBank ~40% on Right) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Interactive Diagram (~60%, 7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Mode Switcher Banner Directly Above Diagram */}
              <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                <div className="inline-flex rounded-lg bg-white dark:bg-slate-950 p-0.5 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("explore");
                      setSelectedExtraId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      mode === "explore"
                        ? "bg-sky-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5 visualkit-eye-blink inline-block" />
                    Explore &amp; Teach
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("label");
                      setSelectedExtraId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      mode === "label"
                        ? "bg-sky-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 visualkit-sparkle-twinkle inline-block" />
                    Label It
                  </button>
                </div>

                {mode === "label" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHardMode(!hardMode)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        hardMode
                          ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                          : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300"
                      }`}
                      title="Hard mode injects 2 scientific distractors into the word bank"
                    >
                      <Flame className="h-3 w-3 text-amber-500" />
                      Hard Mode {hardMode ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetChallenge}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      title="Reset labeling challenge"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* SVG Diagram Viewer with Height-based Sizing, Zoom, Fullscreen & Counter-scaled Hotspots */}
              <SvgDiagramViewer
                diagram={currentDiagram}
                mode={mode}
                selectedPartId={selectedPartId}
                onSelectPart={(partId) => {
                  setSelectedPartId(partId);
                  setSelectedExtraId(null);
                }}
                selectedExtraId={selectedExtraId}
                onSelectExtra={(extraId) => {
                  setSelectedExtraId(extraId);
                  setSelectedPartId(null);
                }}
                labelAnswers={labelAnswers}
                isSubmitted={isSubmitted}
                scoreResults={scoreData?.results ?? {}}
                circuitClosed={circuitClosed}
                onToggleCircuit={() => setCircuitClosed(!circuitClosed)}
                fullscreenSidebar={
                  mode === "explore"
                    ? renderInspectorContent()
                    : renderLabelItPanel()
                }
              />

              {/* Label Mode Action Controls */}
              {mode === "label" && (
                <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {scoreData?.isComplete
                        ? "All components assigned! Ready to check."
                        : `Assigned ${Object.keys(labelAnswers).length} of ${
                            currentDiagram.parts.length
                          } labels.`}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetChallenge}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>

                      {!isSubmitted ? (
                        <button
                          type="button"
                          onClick={handleCheckAnswers}
                          disabled={Object.keys(labelAnswers).length === 0}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Check Answers
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleShowAnswers}
                          disabled={showingAnswers}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 transition-all cursor-pointer"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          Show Answers
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submission Score Feedback Alert */}
                  {isSubmitted && scoreData && (
                    <div
                      className={`p-3 rounded-lg border ${
                        scoreData.percentage === 100
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                          : scoreData.percentage >= 70
                          ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200"
                          : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4" />
                          <span className="font-bold text-xs">
                            Score: {scoreData.score} / {scoreData.total} (
                            {scoreData.percentage}%)
                          </span>
                        </div>
                        {bestScores[currentDiagram.id] && (
                          <span className="text-[10px] font-medium opacity-80">
                            Best: {bestScores[currentDiagram.id].score}/
                            {bestScores[currentDiagram.id].total}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed">
                        {scoreData.percentage === 100
                          ? "Outstanding mastery! You accurately identified every structure."
                          : scoreData.percentage >= 70
                          ? "Great attempt! Review the red markers on the schematic, then try again."
                          : "Keep practicing! Review the details tab in Explore Mode to reinforce each component's location and function."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Inspector Details or Word Bank (~40%, 5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {mode === "explore" ? (
                <div className="space-y-3">
                  {/* Component Inspector Card & Accordions */}
                  {renderInspectorContent()}

                  {/* Use in Your Lesson Card: Discussion Questions */}
                  <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Use in Your Lesson
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Classroom Prompts
                      </span>
                    </div>

                    {/* Collapsible Discussion Questions Accordion */}
                    <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                      <button
                        type="button"
                        id="accordion-header-discussion"
                        aria-expanded={isDiscussionOpen}
                        aria-controls="accordion-panel-discussion"
                        onClick={() => setIsDiscussionOpen(!isDiscussionOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-hidden"
                      >
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Thought-Provoking Discussion Questions (3)
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                            isDiscussionOpen
                              ? "rotate-180 text-sky-600 dark:text-sky-400"
                              : ""
                          }`}
                        />
                      </button>

                      {isDiscussionOpen && (
                        <div
                          id="accordion-panel-discussion"
                          role="region"
                          aria-labelledby="accordion-header-discussion"
                          className="px-3 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                            {currentDiagram.discussionQuestions.map((q, qIdx) => (
                              <li key={qIdx}>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* Visible Lesson Planner Navigation Button */}
                    <Link
                      href={`/${institute}/lesson-plans`}
                      className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/70 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-semibold transition-all shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Plan a Lesson with this Topic</span>
                    </Link>
                  </div>
                </div>
              ) : (
                renderLabelItPanel()
              )}
            </div>
          </section>

          {/* Collapsible Attribution & Provenance Disclosure */}
          <section aria-labelledby="visual-kit-credits-heading">
            <details className="group rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 transition-all shadow-2xs">
              <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span id="visual-kit-credits-heading">
                    Image Credits &amp; Provenance ({currentDiagram.title})
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  The Visual Learning Kit features scientific illustrations vetted under Public Domain and Creative Commons Attribution licenses, alongside original schematics created for interactive learning.
                </p>
                <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentDiagram.title}
                  </div>
                  {currentDiagram.attribution ? (
                    <div className="text-slate-500 dark:text-slate-400 space-y-0.5">
                      {currentDiagram.attribution.sourceUrl ? (
                        <div>
                          Source:{" "}
                          <a
                            href={currentDiagram.attribution.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sky-600 dark:text-sky-400 underline inline-flex items-center gap-0.5"
                          >
                            <span>{currentDiagram.attribution.sourceTitle}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      ) : (
                        <div>Source: {currentDiagram.attribution.sourceTitle}</div>
                      )}
                      <div>Author: {currentDiagram.attribution.author}</div>
                      {currentDiagram.attribution.licenseName &&
                      currentDiagram.attribution.licenseUrl ? (
                        <div>
                          License:{" "}
                          <a
                            href={currentDiagram.attribution.licenseUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline font-medium hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            {currentDiagram.attribution.licenseName}
                          </a>{" "}
                          {currentDiagram.attribution.viaText &&
                            `via ${currentDiagram.attribution.viaText}`}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">
                      Original illustration by the CdM LMS team.
                    </div>
                  )}
                </div>
              </div>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}

function VisualKitLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-44 w-full animate-pulse rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-72 w-full animate-pulse rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40"
          />
        ))}
      </div>
    </div>
  );
}

export default function VisualKitClient(props: VisualKitClientProps) {
  return (
    <Suspense fallback={<VisualKitLoadingSkeleton />}>
      <VisualKitClientContent {...props} />
    </Suspense>
  );
}
