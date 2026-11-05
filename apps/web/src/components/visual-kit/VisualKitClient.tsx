"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Flame,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  Info,
  Lightbulb,
  MousePointerClick,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
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
  }, [currentDiagram, hardMode, initialDiagrams]);

  // Reset state when switching diagram
  const handleSelectDiagram = (diagramId: string) => {
    setSelectedDiagramId(diagramId);
    setSelectedPartId(null);
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

  return (
    <div className="space-y-6 pb-12">
      {/* =========================================================================
          HERO BANNER
         ========================================================================= */}
      <section
        aria-labelledby="visual-kit-heading"
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/20 p-6 shadow-sm dark:border-white/10 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 md:p-8"
      >
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-100/70 px-3 py-1 text-xs font-semibold text-sky-900 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                <FlaskConical className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
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

          {/* Quick Stats Widget */}
          <div className="flex flex-row lg:flex-col gap-3 shrink-0">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-xs dark:border-white/10 dark:bg-slate-850 min-w-[140px]">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Interactive Topics
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                6 Diagrams
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                53 labeled components
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-xs dark:border-white/10 dark:bg-slate-850 min-w-[140px]">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Pre-service Alignment
              </div>
              <div className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">
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

        {/* Horizontal / Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDiagrams.map((d) => {
            const isSelected = d.id === selectedDiagramId;
            const best = bestScores[d.id];

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelectDiagram(d.id)}
                className={`relative flex flex-col text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 shadow-sm ring-1 ring-sky-400/50"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getAreaBadgeClass(
                      d.area
                    )}`}
                  >
                    {d.area}
                  </span>
                  {best && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Trophy className="h-3 w-3" />
                      {best.score}/{best.total}
                    </span>
                  )}
                </div>

                <div className="mt-2 font-semibold text-sm text-slate-900 dark:text-white">
                  {d.title}
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {d.summary}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{d.parts.length} components</span>
                  <span className="flex items-center text-sky-600 dark:text-sky-400 font-medium">
                    {isSelected ? "Active" : "Open diagram"}
                    <ChevronRight className="h-3 w-3 ml-0.5" />
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
                onClick={() => setMode("explore")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === "explore"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Explore & Teach
              </button>
              <button
                type="button"
                onClick={() => setMode("label")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === "label"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MousePointerClick className="h-3.5 w-3.5" />
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
            onSelectPart={(partId) => setSelectedPartId(partId)}
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
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold">
                      {currentDiagram.parts.findIndex(
                        (p) => p.id === activePart?.id
                      ) + 1}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {activePart?.name ?? "Select a component"}
                    </h2>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Component Inspector
                  </span>
                </div>

                {activePart ? (
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
    </div>
  );
}

