"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Apple,
  Atom,
  BookOpen,
  CheckCircle2,
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
  RefreshCw,
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
  Part,
  ScienceArea,
  BestScoresPayload,
  BestScoreRecord,
} from "@/lib/visual-kit/types";
import {
  calculateMinAnchorDistance,
  deserializeBestScores,
  scoreLabelingAnswers,
  serializeBestScores,
  shufflePartNames,
} from "@/lib/visual-kit/rules";
import SvgDiagramViewer from "./SvgDiagramViewer";

const LOCAL_STORAGE_KEY = "visual_kit_best_scores";

interface VisualKitClientProps {
  institute: string;
  studentName: string;
  programCode: string;
  programName?: string;
  initialDiagrams: Diagram[];
}

export default function VisualKitClient({
  institute,
  studentName,
  programCode,
  programName,
  initialDiagrams,
}: VisualKitClientProps) {
  // Navigation / Selection State
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(
    initialDiagrams[0]?.id ?? "human-heart"
  );
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [mode, setMode] = useState<"explore" | "label">("explore");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null);

  // Circuit simulation state
  const [circuitClosed, setCircuitClosed] = useState<boolean>(true);

  // Label It Mode State
  const [hardMode, setHardMode] = useState<boolean>(false);
  const [labelAnswers, setLabelAnswers] = useState<Record<string, string | null>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showingAnswers, setShowingAnswers] = useState<boolean>(false);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [bestScores, setBestScores] = useState<Record<string, BestScoreRecord>>({});

  // Active diagram
  const currentDiagram = useMemo(() => {
    return (
      initialDiagrams.find((d) => d.id === selectedDiagramId) ??
      initialDiagrams[0]
    );
  }, [initialDiagrams, selectedDiagramId]);

  // Selected Part object
  const activePart = useMemo(() => {
    if (!currentDiagram) return null;
    if (!selectedPartId) return currentDiagram.parts[0] ?? null;
    return (
      currentDiagram.parts.find((p) => p.id === selectedPartId) ??
      currentDiagram.parts[0] ??
      null
    );
  }, [currentDiagram, selectedPartId]);

  // Selected Extra Structure (if reference-only printed label is clicked)
  const activeExtra = useMemo(() => {
    if (!currentDiagram || !selectedExtraId) return null;
    return (
      currentDiagram.extraStructures?.find((e) => e.id === selectedExtraId) ?? null
    );
  }, [currentDiagram, selectedExtraId]);

  // Total labeled components across all loaded diagrams
  const totalLabeledComponents = useMemo(() => {
    return initialDiagrams.reduce((acc, d) => acc + d.parts.length, 0);
  }, [initialDiagrams]);

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

  // Sync Word Bank whenever diagram or hardMode changes
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
    setSelectedPartId(currentDiagram.parts[0]?.id ?? null);
    setSelectedExtraId(null);
  }, [currentDiagram, hardMode, initialDiagrams]);

  // Reset state when switching diagram
  const handleSelectDiagram = (diagramId: string) => {
    setSelectedDiagramId(diagramId);
    setSelectedPartId(null);
    setSelectedExtraId(null);
    setIsSubmitted(false);
    setShowingAnswers(false);
    setLabelAnswers({});
  };

  // Filtered diagrams for topic picker
  const filteredDiagrams = useMemo(() => {
    if (selectedArea === "ALL") return initialDiagrams;
    return initialDiagrams.filter((d) => d.area === selectedArea);
  }, [initialDiagrams, selectedArea]);

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

  // Handle clearing answer for a part
  const handleClearAnswer = (partId: string) => {
    if (isSubmitted) return;
    setLabelAnswers((prev) => {
      const copy = { ...prev };
      delete copy[partId];
      return copy;
    });
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
    setSelectedPartId(currentDiagram.parts[0]?.id ?? null);
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

  // Science area badge colors
  const getAreaBadgeClass = (area: ScienceArea) => {
    switch (area) {
      case "Human anatomy":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      case "Biological systems":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      case "Physical processes":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  // Topic icon and area styling details
  const getTopicIconDetails = (diagramId: string, area: ScienceArea) => {
    switch (diagramId) {
      case "human-heart":
        return {
          icon: HeartPulse,
          tileBg: "from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/50",
          idleClass: "visualkit-heart-beat",
          hoverClass: "group-hover:visualkit-heart-beat",
          selectedRing: "ring-2 ring-rose-500/60 shadow-rose-500/10 dark:shadow-rose-950/40",
        };
      case "digestive-system":
        return {
          icon: Apple,
          tileBg: "from-rose-500/20 to-amber-500/10 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/50",
          idleClass: "visualkit-apple-wobble",
          hoverClass: "group-hover:visualkit-apple-wobble",
          selectedRing: "ring-2 ring-rose-500/60 shadow-rose-500/10 dark:shadow-rose-950/40",
        };
      case "animal-cell":
        return {
          icon: Atom,
          tileBg: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50",
          idleClass: "visualkit-atom-spin",
          hoverClass: "group-hover:visualkit-atom-spin",
          selectedRing: "ring-2 ring-emerald-500/60 shadow-emerald-500/10 dark:shadow-emerald-950/40",
        };
      case "plant-structure":
        return {
          icon: Sprout,
          tileBg: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50",
          idleClass: "visualkit-plant-sway",
          hoverClass: "group-hover:visualkit-plant-sway",
          selectedRing: "ring-2 ring-emerald-500/60 shadow-emerald-500/10 dark:shadow-emerald-950/40",
        };
      case "water-cycle":
        return {
          icon: CloudRain,
          tileBg: "from-sky-500/20 to-indigo-500/10 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/50",
          idleClass: "visualkit-rain-drip",
          hoverClass: "group-hover:visualkit-rain-drip",
          selectedRing: "ring-2 ring-sky-500/60 shadow-sky-500/10 dark:shadow-sky-950/40",
        };
      case "simple-electric-circuit":
        return {
          icon: Zap,
          tileBg: "from-amber-500/20 to-sky-500/10 text-amber-500 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/50",
          idleClass: "visualkit-zap-flicker",
          hoverClass: "group-hover:visualkit-zap-flicker",
          selectedRing: "ring-2 ring-amber-500/60 shadow-amber-500/10 dark:shadow-amber-950/40",
        };
      default:
        return {
          icon: FlaskConical,
          tileBg: "from-sky-500/20 to-indigo-500/10 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/50",
          idleClass: "visualkit-flask-tilt",
          hoverClass: "group-hover:visualkit-flask-tilt",
          selectedRing: "ring-2 ring-sky-500/60 shadow-sky-500/10 dark:shadow-sky-950/40",
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Visual Kit Scoped Motion & Animation Styles (honors prefers-reduced-motion) ── */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          /* Hero Science Scene: Atom Orbits & Electrons */
          @keyframes visualkitElectronSpin1 {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes visualkitElectronSpin2 {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes visualkitElectronSpin3 {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .visualkit-electron-orbit-1 { animation: visualkitElectronSpin1 7s linear infinite; will-change: transform; }
          .visualkit-electron-orbit-2 { animation: visualkitElectronSpin2 8.5s linear infinite; will-change: transform; }
          .visualkit-electron-orbit-3 { animation: visualkitElectronSpin3 6.2s linear infinite; will-change: transform; }

          @keyframes visualkitNucleusPulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          .visualkit-nucleus-pulse { animation: visualkitNucleusPulse 2.4s ease-in-out infinite; will-change: transform, opacity; }

          @keyframes visualkitNucleusGlow {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 0.95; }
          }
          .visualkit-nucleus-glow { animation: visualkitNucleusGlow 2.4s ease-in-out infinite; will-change: transform, opacity; }

          /* Laboratory Flask Rising Bubbles */
          @keyframes visualkitBubbleRise1 {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.85; }
            100% { transform: translateY(-34px) scale(1.1); opacity: 0; }
          }
          @keyframes visualkitBubbleRise2 {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.85; }
            100% { transform: translateY(-38px) scale(1.1); opacity: 0; }
          }
          @keyframes visualkitBubbleRise3 {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.85; }
            100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
          }
          @keyframes visualkitBubbleRise4 {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.85; }
            100% { transform: translateY(-32px) scale(1.1); opacity: 0; }
          }
          .visualkit-bubble-1 { animation: visualkitBubbleRise1 2.8s ease-out infinite; will-change: transform, opacity; }
          .visualkit-bubble-2 { animation: visualkitBubbleRise2 3.1s ease-out 0.7s infinite; will-change: transform, opacity; }
          .visualkit-bubble-3 { animation: visualkitBubbleRise3 2.5s ease-out 1.4s infinite; will-change: transform, opacity; }
          .visualkit-bubble-4 { animation: visualkitBubbleRise4 2.9s ease-out 2.1s infinite; will-change: transform, opacity; }

          /* Drifting Molecule Dots */
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

          /* Hero Chips & Stat Cards */
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

          /* Mode Switcher Tabs */
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

          /* Topic Cards Per-Topic Animated Icons (clearly visible amplitude >= 8deg, 3px, 1.12x) */
          /* 1. Human Heart: Two quick beats then pause (1.6s loop) */
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

          /* 2. Digestive System Apple: Gentle wobble (2.2s loop) */
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

          /* 3. Animal Cell Atom/Microscope: Slow rotation/orbit wobble (6s) */
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

          /* 4. Plant Sprout: Sway left and right 8 degrees from base (2.6s) */
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

          /* 5. Water Cycle CloudRain: Droplets drip down and fade (1.8s) */
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

          /* 6. Electric Circuit Zap: Flicker/zap glow pulse (1.9s) */
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
          HERO BANNER
         ========================================================================= */}
      <section
        aria-labelledby="visual-kit-heading"
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/20 p-6 shadow-sm dark:border-white/10 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 md:p-8"
      >
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Text Content & Chips */}
          <div className="space-y-3 max-w-xl xl:max-w-2xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-100/70 px-3 py-1 text-xs font-semibold text-sky-900 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                <FlaskConical className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 visualkit-flask-tilt inline-block" aria-hidden="true" />
                BSEd Science Program Tool
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300">
                <GraduationCap className="h-3 w-3 text-slate-500" />
                {programName ?? "Secondary Education (Science)"}
              </span>
            </div>

            <h1
              id="visual-kit-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl lg:text-4xl"
            >
              Interactive Visual Learning Kit
            </h1>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
              Explore interactive 2D anatomical schematics, biological
              ultrastructures, and physical processes. Use these vector diagrams
              for Junior and Senior High classroom instruction, self-check your
              mastery with the labeling word bank, and directly incorporate
              discussion prompts into your DepEd lesson plans.
            </p>
          </div>

          {/* Middle: Decorative Animated Science Scene (Hidden on <1024px; never overlaps text or stat cards) */}
          <div
            className="hidden lg:flex shrink-0 items-center justify-center pointer-events-none select-none px-2 xl:px-4"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 200 130"
              className="w-40 xl:w-48 h-auto max-h-32 overflow-visible select-none"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                {/* Nucleus warm amber glow */}
                <radialGradient id="visualkitNucleusGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>
                {/* Flask liquid cyan-to-sky gradient */}
                <linearGradient id="visualkitFlaskLiquid" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              {/* FLOATING MOLECULES / HEX-RING */}
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

              {/* Drifting bonded molecule pair */}
              <g className="visualkit-molecule-float-alt" style={{ transformOrigin: "165px 25px" }}>
                <line x1="160" y1="25" x2="172" y2="22" className="stroke-indigo-400/40 dark:stroke-indigo-400/50" strokeWidth="1.5" />
                <circle cx="160" cy="25" r="2.5" className="fill-indigo-600 dark:fill-indigo-400" />
                <circle cx="172" cy="22" r="2" className="fill-sky-600 dark:fill-sky-400" />
              </g>

              {/* ================= ATOM MODEL (Center 75, 68) ================= */}
              {/* Orbit 1 (0 deg horizontal) */}
              <g transform="translate(75, 68) rotate(0) scale(1, 0.38)">
                <circle cx="0" cy="0" r="38" fill="none" className="stroke-cyan-600/30 dark:stroke-cyan-400/40" strokeWidth="1.5" />
                <g className="visualkit-electron-orbit-1" style={{ transformOrigin: "0px 0px" }}>
                  <circle cx="38" cy="0" r="3.5" className="fill-cyan-600 dark:fill-cyan-300" />
                </g>
              </g>

              {/* Orbit 2 (60 deg tilt) */}
              <g transform="translate(75, 68) rotate(60) scale(1, 0.38)">
                <circle cx="0" cy="0" r="38" fill="none" className="stroke-sky-600/30 dark:stroke-sky-400/40" strokeWidth="1.5" />
                <g className="visualkit-electron-orbit-2" style={{ transformOrigin: "0px 0px" }}>
                  <circle cx="38" cy="0" r="3.5" className="fill-sky-600 dark:fill-sky-300" />
                </g>
              </g>

              {/* Orbit 3 (120 deg tilt) */}
              <g transform="translate(75, 68) rotate(120) scale(1, 0.38)">
                <circle cx="0" cy="0" r="38" fill="none" className="stroke-teal-600/30 dark:stroke-teal-400/40" strokeWidth="1.5" />
                <g className="visualkit-electron-orbit-3" style={{ transformOrigin: "0px 0px" }}>
                  <circle cx="38" cy="0" r="3.5" className="fill-teal-600 dark:fill-teal-300" />
                </g>
              </g>

              {/* Glowing Nucleus */}
              <circle cx="75" cy="68" r="14" fill="url(#visualkitNucleusGlow)" className="visualkit-nucleus-glow" style={{ transformOrigin: "75px 68px" }} />
              <circle cx="75" cy="68" r="6" className="fill-amber-500 dark:fill-amber-400 visualkit-nucleus-pulse" style={{ transformOrigin: "75px 68px" }} />

              {/* ================= LABORATORY FLASK (Center 148, 80) ================= */}
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
                <path
                  d="M 137 78 C 143 76 153 80 159 78"
                  fill="none"
                  className="stroke-cyan-200/60 dark:stroke-cyan-100/60"
                  strokeWidth="1.2"
                />
                <circle cx="145" cy="88" r="2.2" className="fill-cyan-200 dark:fill-cyan-100 visualkit-bubble-1" style={{ transformOrigin: "145px 88px" }} />
                <circle cx="152" cy="84" r="1.8" className="fill-cyan-200 dark:fill-cyan-100 visualkit-bubble-2" style={{ transformOrigin: "152px 84px" }} />
                <circle cx="142" cy="80" r="2.5" className="fill-teal-200 dark:fill-teal-100 visualkit-bubble-3" style={{ transformOrigin: "142px 80px" }} />
                <circle cx="149" cy="90" r="1.5" className="fill-sky-200 dark:fill-sky-100 visualkit-bubble-4" style={{ transformOrigin: "149px 90px" }} />
              </g>
            </svg>
          </div>

          {/* Right: Quick Stats Widget */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
            <div className="w-full sm:w-auto sm:min-w-[150px] rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 p-3.5 shadow-xs transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Interactive Topics
                </div>
                <Layers className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 visualkit-stat-float inline-block" aria-hidden="true" />
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {initialDiagrams.length} Diagrams
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {totalLabeledComponents} labeled components
              </div>
            </div>

            <div className="w-full sm:w-auto sm:min-w-[150px] rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 p-3.5 shadow-xs transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Pre-service Alignment
                </div>
                <GraduationCap className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 visualkit-stat-float-delayed inline-block" aria-hidden="true" />
              </div>
              <div className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-400">
                K to 12
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                DepEd Science curriculum
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TOPIC SELECTOR CARDS & AREA FILTER
         ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Filter Area:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {["ALL", "Human anatomy", "Biological systems", "Physical processes"].map(
                (area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedArea === area
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {area === "ALL" ? "All Areas" : area}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredDiagrams.length} of {initialDiagrams.length} diagrams
          </div>
        </div>

        {/* Horizontal / Grid Cards with Icon Tiles & Hover Lift */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDiagrams.map((d) => {
            const isSelected = d.id === selectedDiagramId;
            const best = bestScores[d.id];
            const topicDetails = getTopicIconDetails(d.id, d.area);
            const TopicIcon = topicDetails.icon;

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelectDiagram(d.id)}
                className={`group relative flex flex-col justify-between text-left p-4 rounded-2xl border transition-all duration-150 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 hover:-translate-y-0.5 shadow-xs ${
                  isSelected
                    ? `border-transparent bg-sky-50/70 dark:bg-sky-950/30 ${topicDetails.selectedRing} shadow-sm`
                    : "border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rounded Icon Tile (about 36px) */}
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${topicDetails.tileBg} border flex items-center justify-center shadow-2xs`}
                      >
                        <TopicIcon
                          className={`h-5 w-5 inline-block ${
                            isSelected ? topicDetails.idleClass : topicDetails.hoverClass
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <span
                        className={`inline-block truncate px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getAreaBadgeClass(
                          d.area
                        )}`}
                      >
                        {d.area}
                      </span>
                    </div>

                    {best && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Trophy className="h-3 w-3" />
                        {best.score}/{best.total}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 font-semibold text-sm text-slate-900 dark:text-white">
                    {d.title}
                  </div>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {d.summary}
                  </p>
                </div>

                <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{d.parts.length} components</span>
                  <span className="flex items-center text-sky-600 dark:text-sky-400 font-medium">
                    {isSelected ? "Active" : "Open diagram"}
                    <ChevronRight className="h-3 w-3 ml-0.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          MAIN WORKSPACE (Diagram on Left, Inspector / Word Bank on Right)
         ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Diagram (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mode Switcher Banner */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="inline-flex rounded-xl bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode("explore");
                  setSelectedExtraId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === "explore"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5 visualkit-eye-blink inline-block" />
                Explore & Teach
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("label");
                  setSelectedExtraId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === "label"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 visualkit-sparkle-twinkle inline-block" />
                Label It (Self-Check)
              </button>
            </div>

            {mode === "label" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHardMode(!hardMode)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    hardMode
                      ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                      : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300"
                  }`}
                  title="Hard mode injects 2 plausible scientific distractors into the word bank"
                >
                  <Flame className="h-3 w-3 text-amber-500" />
                  Hard Mode {hardMode ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={handleResetChallenge}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Reset labeling word bank"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* SVG Canvas Viewer */}
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
          />

          {/* Label Mode Action Controls */}
          {mode === "label" && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {scoreData?.isComplete
                    ? "All components have been assigned! Ready to check."
                    : `Assigned ${Object.keys(labelAnswers).length} of ${
                        currentDiagram.parts.length
                      } labels.`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetChallenge}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>

                  {!isSubmitted ? (
                    <button
                      type="button"
                      onClick={handleCheckAnswers}
                      disabled={Object.keys(labelAnswers).length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Check Answers
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleShowAnswers}
                      disabled={showingAnswers}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 transition-all"
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
                  className={`p-4 rounded-xl border ${
                    scoreData.percentage === 100
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                      : scoreData.percentage >= 70
                      ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200"
                      : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span className="font-bold text-sm">
                        Score: {scoreData.score} / {scoreData.total} ({scoreData.percentage}%)
                      </span>
                    </div>
                    {bestScores[currentDiagram.id] && (
                      <span className="text-[11px] font-medium opacity-80">
                        Best: {bestScores[currentDiagram.id].score}/
                        {bestScores[currentDiagram.id].total}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">
                    {scoreData.percentage === 100
                      ? "Outstanding mastery! You accurately identified every anatomical and physical structure."
                      : scoreData.percentage >= 70
                      ? "Great attempt! Review the red markers on the schematic, then try again or view the solution."
                      : "Keep practicing! Review the details tab in Explore Mode to reinforce each component's location and function."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Inspector Details or Word Bank (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {mode === "explore" ? (
            /* =========================================================================
               EXPLORE MODE: COMPONENT INSPECTOR & TEACHING TIPS
               ========================================================================= */
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {activeExtra ? (
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                        <Info className="h-3.5 w-3.5 text-sky-500" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold">
                        {currentDiagram.parts.findIndex(
                          (p) => p.id === activePart?.id
                        ) + 1}
                      </span>
                    )}
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeExtra ? activeExtra.name : activePart?.name ?? "Select a component"}
                    </h2>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {activeExtra ? "Reference Structure" : "Component Inspector"}
                  </span>
                </div>

                {activeExtra ? (
                  <div className="space-y-4 text-xs leading-relaxed" data-testid="extra-info-card">
                    {/* Notice banner */}
                    <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                        <Info className="h-4 w-4 text-sky-500 shrink-0" />
                        <span>Reference only - not part of the quiz</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExtraId(null);
                          setSelectedPartId(currentDiagram.parts[0]?.id ?? null);
                        }}
                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Inspect Quiz Components
                      </button>
                    </div>

                    {/* Definition */}
                    <div>
                      <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Definition
                      </div>
                      <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium text-sm">
                        {activeExtra.definition}
                      </p>
                    </div>

                    {/* Where to find it */}
                    {activeExtra.where && (
                      <div>
                        <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                          Where to Find It in Diagram
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300">
                          {activeExtra.where}
                        </p>
                      </div>
                    )}
                  </div>
                ) : activePart ? (
                  <div className="space-y-4 text-xs leading-relaxed">
                    {/* Primary Function */}
                    <div>
                      <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Primary Function
                      </div>
                      <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium text-sm">
                        {activePart.function}
                      </p>
                    </div>

                    {/* Scientific Details */}
                    <div>
                      <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Physiological / Physical Mechanism
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        {activePart.details}
                      </p>
                    </div>

                    {/* Pre-service Teaching Tip */}
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 text-[11px]">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Junior / Senior High Teaching Tip
                      </div>
                      <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                        {activePart.teachingTip}
                      </p>
                    </div>

                    {/* Fun Fact or Common Misconception */}
                    {activePart.funFact && (
                      <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60">
                        <div className="flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300 text-[11px]">
                          <Sparkles className="h-3.5 w-3.5" />
                          Did You Know?
                        </div>
                        <p className="mt-1 text-sky-900/90 dark:text-sky-200/90">
                          {activePart.funFact}
                        </p>
                      </div>
                    )}

                    {activePart.commonMisconception && (
                      <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300 text-[11px]">
                          <Info className="h-3.5 w-3.5" />
                          Common Student Misconception
                        </div>
                        <p className="mt-1 text-rose-900/90 dark:text-rose-200/90">
                          {activePart.commonMisconception}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs">
                    Click any numbered marker on the diagram to inspect its
                    scientific properties and teaching suggestions.
                  </p>
                )}
              </div>

              {/* Discussion Questions & Lesson Planning Bridge */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Use in Your Lesson
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Classroom Prompts</span>
                </div>

                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Thought-Provoking Discussion Questions:
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {currentDiagram.discussionQuestions.map((q, qIdx) => (
                      <li key={qIdx} className="leading-relaxed">
                        <span>{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/${institute}/lesson-plans`}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-semibold transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Plan a Lesson with this Topic</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               LABEL IT MODE: WORD BANK & MARKER ASSIGNMENT
               ========================================================================= */
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Labeling Word Bank
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select marker #{currentDiagram.parts.findIndex((p) => p.id === activePart?.id) + 1} ({activePart?.name ? "Active" : "None"}), then click a matching term below.
                    </p>
                  </div>
                  {hardMode && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      +2 Distractors
                    </span>
                  )}
                </div>

                {/* Available Word Bank Pills */}
                <div className="flex flex-wrap gap-2">
                  {wordBank.map((word) => {
                    // Check if this word is already assigned to ANY marker
                    const assignedPartId = Object.entries(labelAnswers).find(
                      ([_, val]) => val === word
                    )?.[0];
                    const isAssigned = Boolean(assignedPartId);

                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handleAssignWord(word)}
                        disabled={isSubmitted || isAssigned}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isAssigned
                            ? "bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed opacity-60"
                            : "bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 shadow-2xs hover:scale-[1.02]"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Marker Assignments Status List */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Marker Assignments ({Object.keys(labelAnswers).length}/{currentDiagram.parts.length})
                  </h3>
                  <span className="text-[10px] text-slate-400">Click to reassign</span>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {currentDiagram.parts.map((p, idx) => {
                    const isSelected = selectedPartId === p.id;
                    const assigned = labelAnswers[p.id];
                    const isCorrect = scoreData?.results[p.id];

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPartId(p.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/30"
                            : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
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
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {assigned ? (
                              assigned
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isSubmitted ? (
                            isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <span className="text-[10px] text-rose-600 font-semibold">
                                Correct: {p.name}
                              </span>
                            )
                          ) : (
                            assigned && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearAnswer(p.id);
                                }}
                                className="text-slate-400 hover:text-rose-500 p-1"
                                title="Clear assignment"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          ILLUSTRATION CREDITS & PROVENANCE SECTION
         ========================================================================= */}
      <section
        aria-labelledby="visual-kit-credits-heading"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2
            id="visual-kit-credits-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Illustration Credits &amp; Provenance
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The Visual Learning Kit features scientific illustrations vetted under Public Domain and Creative Commons Attribution licenses, alongside original schematics created for interactive learning.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {initialDiagrams.map((d) => (
            <div
              key={d.id}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-[11px] space-y-1"
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {d.title}
              </div>
              {d.attribution ? (
                <div className="text-slate-500 dark:text-slate-400 space-y-0.5">
                  {d.attribution.sourceUrl ? (
                    <div>
                      Source:{" "}
                      <a
                        href={d.attribution.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sky-600 dark:text-sky-400 underline inline-flex items-center gap-0.5"
                      >
                        <span>{d.attribution.sourceTitle}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ) : (
                    <div>Source: {d.attribution.sourceTitle}</div>
                  )}
                  <div>Author: {d.attribution.author}</div>
                  {d.attribution.licenseName && d.attribution.licenseUrl ? (
                    <div>
                      License:{" "}
                      <a
                        href={d.attribution.licenseUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline font-medium hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {d.attribution.licenseName}
                      </a>{" "}
                      {d.attribution.viaText && `via ${d.attribution.viaText}`}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-slate-400 italic">Original illustration by the CdM LMS team.</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

