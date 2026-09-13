"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { FlashcardCard, FlashcardStudyStats } from "@/lib/lms-types";
import {
  ArrowLeft,
  Lightbulb,
  Trophy,
  RotateCcw,
  Eye,
  Layers,
  ToggleLeft,
  Frown,
  Meh,
  Smile,
  ThumbsUp,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  ListChecks,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StudyModeType = "flashcard" | "multiple-choice" | "true-false";
type AppPhase = "mode-select" | "studying" | "summary";
type FlashState = "viewing" | "revealed";

interface MultipleChoiceOption {
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
}

interface TrueFalseQuestion {
  statement: string;
  /** true = the statement matches the card's actual back (correct answer is TRUE) */
  correctAnswer: boolean;
}

interface SessionResult {
  cardId: string;
  correct: boolean;
}

interface StudyModeProps {
  deckId: string;
  deckTitle: string;
  deckColor: string;
  onExit: () => void;
}

// ─── Distractor Helpers ───────────────────────────────────────────────────────

function generateChoices(
  current: FlashcardCard,
  all: FlashcardCard[]
): MultipleChoiceOption[] {
  const correct = current.back;

  // Shuffle other cards' backs and take up to 3 unique distractors
  const pool = all
    .filter((c) => c.id !== current.id && c.back.trim().length > 5)
    .map((c) => c.back)
    .sort(() => Math.random() - 0.5);

  const distractors: string[] = [];
  for (const d of pool) {
    if (distractors.length >= 3) break;
    if (d !== correct) distractors.push(d);
  }

  // Pad with word-fragment variants when there aren't enough real distractors
  if (distractors.length < 3) {
    const words = correct.split(/\s+/);
    const mid = Math.max(1, Math.floor(words.length / 2));
    const variants = [
      words.slice(0, mid).join(" ") + " (incomplete)",
      "Not " + words.slice(0, 3).join(" "),
      words.slice(mid).join(" ") + " (partial)",
    ];
    for (const v of variants) {
      if (distractors.length >= 3) break;
      if (v !== correct && !distractors.includes(v)) distractors.push(v);
    }
  }

  const options = [
    { text: correct, isCorrect: true },
    ...distractors.slice(0, 3).map((d) => ({ text: d, isCorrect: false })),
  ].sort(() => Math.random() - 0.5);

  const labels: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  return options.map((opt, i) => ({ ...opt, label: labels[i] }));
}

function generateTrueFalseQuestion(
  current: FlashcardCard,
  all: FlashcardCard[]
): TrueFalseQuestion {
  // 50-50 chance of TRUE or FALSE statement; always show TRUE if deck has < 2 cards
  const showTrue = all.length < 2 || Math.random() > 0.5;
  if (showTrue) {
    return { statement: current.back, correctAnswer: true };
  }
  const others = all.filter((c) => c.id !== current.id);
  const other = others[Math.floor(Math.random() * others.length)];
  return { statement: other.back, correctAnswer: false };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudyMode({
  deckId,
  deckTitle,
  deckColor,
  onExit,
}: StudyModeProps) {
  // ── Remote data ──
  const [allCards, setAllCards] = useState<FlashcardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FlashcardStudyStats | null>(null);
  const [expEarned, setExpEarned] = useState<number | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // ── App phase & mode ──
  const [phase, setPhase] = useState<AppPhase>("mode-select");
  const [studyMode, setStudyMode] = useState<StudyModeType>("flashcard");

  // ── Session ──
  const [sessionCards, setSessionCards] = useState<FlashcardCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Flashcard mode ──
  const [flashState, setFlashState] = useState<FlashState>("viewing");
  const [isFlipping, setIsFlipping] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // ── Multiple-choice mode ──
  const [choices, setChoices] = useState<MultipleChoiceOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [choiceAnswered, setChoiceAnswered] = useState(false);

  // ── True/False mode ──
  const [tfQuestion, setTfQuestion] = useState<TrueFalseQuestion | null>(null);
  const [tfAnswer, setTfAnswer] = useState<boolean | null>(null);
  const [tfAnswered, setTfAnswered] = useState(false);

  // ── Fetch cards from API ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/flashcards/study?deckId=${deckId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setAllCards(data.cards);
        setStats(data.stats);
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId]);

  // Trigger session completion EXP grant when study finishes
  useEffect(() => {
    if (phase === "summary" && sessionResults.length >= 3) {
      const elapsedSeconds = Math.max(5, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      fetch("/api/flashcards/complete-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId,
          cardsReviewed: sessionResults.length,
          durationSeconds: elapsedSeconds,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.grantedExp > 0) {
            setExpEarned(data.grantedExp);
          }
        })
        .catch(() => {});
    }
  }, [phase, deckId, sessionResults.length]);

  const currentCard = sessionCards[currentIndex] ?? null;

  // ── Prepare per-card data for the current mode ──
  const prepareCard = useCallback(
    (idx: number, mode: StudyModeType, list: FlashcardCard[]) => {
      const card = list[idx];
      if (!card) return;
      if (mode === "multiple-choice") {
        setChoices(generateChoices(card, list));
        setSelectedLabel(null);
        setChoiceAnswered(false);
      } else if (mode === "true-false") {
        setTfQuestion(generateTrueFalseQuestion(card, list));
        setTfAnswer(null);
        setTfAnswered(false);
      } else {
        setFlashState("viewing");
        setIsFlipping(false);
        setShowHint(false);
      }
    },
    []
  );

  // ── Start a study session ──
  const startSession = useCallback(
    (mode: StudyModeType, cardList?: FlashcardCard[]) => {
      const list = cardList ?? allCards;
      setStudyMode(mode);
      setSessionCards(list);
      setCurrentIndex(0);
      setSessionResults([]);
      prepareCard(0, mode, list);
      setPhase("studying");
    },
    [allCards, prepareCard]
  );

  // ── Record progress (fire-and-forget; never blocks navigation) ──
  const recordProgress = useCallback(
    async (cardId: string, rating: "knew_it" | "still_learning") => {
      try {
        await fetch("/api/flashcards/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, selfRating: rating }),
        });
      } catch {
        // Progress is not critical — swallow the error silently
      }
    },
    []
  );

  // ── Advance to the next card ──
  const advance = useCallback(
    (isCorrect: boolean, cardId: string) => {
      const updatedResults = [...sessionResults, { cardId, correct: isCorrect }];
      setSessionResults(updatedResults);

      const next = currentIndex + 1;
      if (next >= sessionCards.length) {
        setPhase("summary");
        return;
      }

      setCurrentIndex(next);
      prepareCard(next, studyMode, sessionCards);
    },
    [currentIndex, sessionCards, sessionResults, studyMode, prepareCard]
  );

  // ── Flashcard: flip reveal ──
  const handleReveal = useCallback(() => {
    if (flashState !== "viewing" || isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setFlashState("revealed");
      setIsFlipping(false);
    }, 300);
  }, [flashState, isFlipping]);

  // ── Flashcard: 4-level self-rating ──
  const handleFlashRating = useCallback(
    async (level: 1 | 2 | 3 | 4) => {
      if (!currentCard || submitting) return;
      setSubmitting(true);
      const isCorrect = level >= 3;
      await recordProgress(
        currentCard.id,
        isCorrect ? "knew_it" : "still_learning"
      );
      setSubmitting(false);
      advance(isCorrect, currentCard.id);
    },
    [currentCard, submitting, recordProgress, advance]
  );

  // ── Multiple choice: select answer ──
  const handleChoiceSelect = useCallback(
    async (choice: MultipleChoiceOption) => {
      if (choiceAnswered || !currentCard || submitting) return;
      setSelectedLabel(choice.label);
      setChoiceAnswered(true);
      await recordProgress(
        currentCard.id,
        choice.isCorrect ? "knew_it" : "still_learning"
      );
    },
    [choiceAnswered, currentCard, submitting, recordProgress]
  );

  // ── True/False: answer ──
  const handleTfAnswer = useCallback(
    async (answer: boolean) => {
      if (tfAnswered || !currentCard || !tfQuestion || submitting) return;
      setTfAnswer(answer);
      setTfAnswered(true);
      const isCorrect = answer === tfQuestion.correctAnswer;
      await recordProgress(
        currentCard.id,
        isCorrect ? "knew_it" : "still_learning"
      );
    },
    [tfAnswered, currentCard, tfQuestion, submitting, recordProgress]
  );

  // ── Keyboard shortcuts (flashcard mode only) ──
  useEffect(() => {
    if (phase !== "studying" || studyMode !== "flashcard") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " && flashState === "viewing") {
        e.preventDefault();
        handleReveal();
      } else if (flashState === "revealed" && !submitting) {
        const keyMap: Record<string, 1 | 2 | 3 | 4> = {
          "1": 1,
          "2": 2,
          "3": 3,
          "4": 4,
        };
        const level = keyMap[e.key];
        if (level) {
          e.preventDefault();
          handleFlashRating(level);
        }
      } else if (e.key === "Tab" && flashState === "viewing") {
        e.preventDefault();
        setShowHint(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, studyMode, flashState, submitting, handleReveal, handleFlashRating]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / empty states
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-slate-200 dark:border-white/10 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-[#8B92A5]">
            Loading study session...
          </p>
        </div>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-[#1E2132] flex items-center justify-center">
          <RotateCcw className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8]">
          No cards to study
        </h3>
        <p className="text-slate-500 dark:text-[#8B92A5] text-sm">
          Add some cards to this deck first.
        </p>
        <button
          onClick={onExit}
          className="mt-2 rounded-xl bg-slate-100 dark:bg-[#1E2132] px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-200 dark:hover:bg-[#25293C] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: MODE SELECTOR
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === "mode-select") {
    const incorrectCards = allCards.filter(
      (c) => c.progress?.status === "incorrect"
    );

    const modes: {
      id: StudyModeType;
      icon: React.ReactNode;
      title: string;
      desc: string;
      badge?: string;
    }[] = [
      {
        id: "flashcard",
        icon: <Layers className="h-7 w-7" />,
        title: "Flashcards",
        desc: "Classic flip cards. Rate your confidence after each answer.",
      },
      {
        id: "multiple-choice",
        icon: <ListChecks className="h-7 w-7" />,
        title: "Multiple Choice",
        desc: "Pick the right answer from four options. Instant feedback.",
        badge: "A B C D",
      },
      {
        id: "true-false",
        icon: <ToggleLeft className="h-7 w-7" />,
        title: "True or False",
        desc: "Is the statement correct? Quick-fire decision making.",
        badge: "T / F",
      },
    ];

    return (
      <div className="mx-auto max-w-2xl page-enter pb-12">
        {/* Back */}
        <button
          onClick={onExit}
          className="mb-8 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Deck
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="mx-auto mb-5 h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${deckColor}25` }}
          >
            <Layers className="h-8 w-8" style={{ color: deckColor }} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-[#F0F2F8]">
            {deckTitle}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-[#8B92A5] font-medium">
            Choose how you want to study
          </p>

          {/* Stats chips */}
          {stats && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-slate-100 dark:bg-[#1E2132] border border-slate-200/80 dark:border-white/5 px-4 py-1.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5]">
                📚 {stats.totalCards} cards
              </span>
              {stats.correct > 0 && (
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  ✅ {stats.correct} mastered
                </span>
              )}
              {stats.incorrect > 0 && (
                <span className="rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 px-4 py-1.5 text-sm font-bold text-rose-700 dark:text-rose-400">
                  🔄 {stats.incorrect} needs review
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => startSession(m.id)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  `${deckColor}80`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "";
              }}
              className="group relative flex flex-col items-center text-center rounded-3xl border-2 border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-7 shadow-xs transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl active:scale-95 cursor-pointer"
            >
              {m.badge && (
                <span
                  className="absolute top-3.5 right-3.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white"
                  style={{ backgroundColor: deckColor }}
                >
                  {m.badge}
                </span>
              )}
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors"
                style={{ backgroundColor: `${deckColor}15`, color: deckColor }}
              >
                {m.icon}
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F0F2F8] mb-2">
                {m.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5] leading-relaxed">
                {m.desc}
              </p>
              <div
                className="mt-5 flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ color: deckColor }}
              >
                Start <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Practice incorrect only shortcut */}
        {incorrectCards.length > 0 && (
          <button
            onClick={() => startSession("flashcard", incorrectCards)}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10 py-4 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Practice {incorrectCards.length} card
            {incorrectCards.length !== 1 ? "s" : ""} needing review
          </button>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: SESSION SUMMARY
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === "summary") {
    const total = sessionResults.length;
    const correctCount = sessionResults.filter((r) => r.correct).length;
    const incorrectCount = total - correctCount;
    const accuracy =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const incorrectCardIds = new Set(
      sessionResults.filter((r) => !r.correct).map((r) => r.cardId)
    );
    const incorrectCardsForRetry = sessionCards.filter((c) =>
      incorrectCardIds.has(c.id)
    );

    return (
      <div className="mx-auto max-w-lg page-enter">
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xl overflow-hidden">
          {/* Gradient header */}
          <div
            className="px-8 py-10 text-center"
            style={{
              background: `linear-gradient(135deg, ${deckColor}20, ${deckColor}08)`,
            }}
          >
            <div
              className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${deckColor}20` }}
            >
              <Trophy className="h-8 w-8" style={{ color: deckColor }} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">
              Session Complete!
            </h2>
            <p className="mt-1 text-slate-500 dark:text-[#8B92A5] font-medium">
              {deckTitle}
            </p>

            {expEarned !== null && expEarned > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-black animate-in zoom-in-95">
                <span>✨</span>
                <span>+{expEarned} EXP Earned!</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="px-8 py-6 space-y-6">
            <div className="text-center">
              <div
                className="text-6xl font-extrabold tabular-nums"
                style={{ color: deckColor }}
              >
                {accuracy}%
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#8B92A5]">
                Accuracy
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
              {[
                { label: "Total", value: total, color: "text-slate-900 dark:text-[#F0F2F8]" },
                { label: "Correct", value: correctCount, color: "text-emerald-500" },
                { label: "Incorrect", value: incorrectCount, color: "text-rose-500" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-0.5 font-bold uppercase tracking-wider">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 bg-slate-50 dark:bg-[#181B26] border-t border-slate-100 dark:border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onExit}
                className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-[#25293C] transition-colors cursor-pointer"
              >
                Back to Deck
              </button>
              <button
                onClick={() => startSession(studyMode)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: deckColor }}
              >
                Study Again
              </button>
            </div>

            {incorrectCardsForRetry.length > 0 && (
              <button
                onClick={() =>
                  startSession(studyMode, incorrectCardsForRetry)
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Retry {incorrectCardsForRetry.length} Incorrect
              </button>
            )}

            <button
              onClick={() => setPhase("mode-select")}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Change Study Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: STUDYING — shared top bar + progress bar
  // ─────────────────────────────────────────────────────────────────────────

  const modeLabelMap: Record<StudyModeType, string> = {
    flashcard: "Flashcards",
    "multiple-choice": "Multiple Choice",
    "true-false": "True or False",
  };

  const topBarEl = (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={() => setPhase("mode-select")}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        {modeLabelMap[studyMode]}
      </button>
      <span className="text-sm font-bold text-slate-500 dark:text-[#8B92A5] bg-slate-100 dark:bg-[#1E2132] px-3.5 py-1 rounded-full border border-slate-200/60 dark:border-white/5">
        {currentIndex + 1} / {sessionCards.length}
      </span>
    </div>
  );

  const progressBarEl = (
    <div className="mb-8 h-2 w-full rounded-full bg-slate-100 dark:bg-[#1E2132] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${((currentIndex) / sessionCards.length) * 100}%`,
          backgroundColor: deckColor,
        }}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MODE: FLASHCARD
  // ─────────────────────────────────────────────────────────────────────────

  if (studyMode === "flashcard" && currentCard) {
    const isRevealed = flashState === "revealed";

    const ratingLevels: {
      level: 1 | 2 | 3 | 4;
      icon: React.ReactNode;
      label: string;
      key: string;
      iconColor: string;
      hoverBorder: string;
      hoverBg: string;
    }[] = [
      {
        level: 1,
        icon: <Frown className="h-5 w-5" />,
        label: "Forgot",
        key: "1",
        iconColor: "text-red-500",
        hoverBorder: "hover:border-red-400 dark:hover:border-red-500/60",
        hoverBg: "hover:bg-red-50 dark:hover:bg-red-950/20",
      },
      {
        level: 2,
        icon: <Meh className="h-5 w-5" />,
        label: "Hard",
        key: "2",
        iconColor: "text-orange-500",
        hoverBorder: "hover:border-orange-400 dark:hover:border-orange-500/60",
        hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-950/20",
      },
      {
        level: 3,
        icon: <Smile className="h-5 w-5" />,
        label: "Good",
        key: "3",
        iconColor: "text-blue-500",
        hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500/60",
        hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/20",
      },
      {
        level: 4,
        icon: <ThumbsUp className="h-5 w-5" />,
        label: "Easy",
        key: "4",
        iconColor: "text-emerald-500",
        hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500/60",
        hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
      },
    ];

    return (
      <div className="mx-auto max-w-5xl page-enter flex flex-col justify-center min-h-[calc(100vh-12rem)] pb-10 px-4">
        {topBarEl}
        {progressBarEl}

        {/* 3-D Flip card */}
        <div
          className="mb-8 flex-1 flex flex-col justify-center"
          style={{ perspective: "1200px" }}
        >
          <div
            className="relative w-full transition-transform duration-500 ease-in-out cursor-pointer"
            style={{
              minHeight: "420px",
              transformStyle: "preserve-3d",
              transform:
                isRevealed || isFlipping
                  ? "rotateY(180deg)"
                  : "rotateY(0deg)",
            }}
            onClick={!isRevealed ? handleReveal : undefined}
          >
            {/* Front face */}
            <div
              className="absolute inset-0 rounded-3xl border-2 bg-slate-900 dark:bg-[#141721] shadow-2xl p-10 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                borderColor: `${deckColor}60`,
              }}
            >
              <span
                className="inline-block rounded-full px-5 py-2 text-sm font-bold mb-8 uppercase tracking-widest"
                style={{
                  backgroundColor: `${deckColor}25`,
                  color: deckColor,
                }}
              >
                Question
              </span>
              <p className="text-4xl sm:text-5xl font-semibold text-white leading-tight max-w-3xl mx-auto text-center wrap-break-word">
                {currentCard.front}
              </p>

              {/* Image attachments */}
              {currentCard.attachments?.length > 0 && (
                <div className="mt-8 flex justify-center w-full">
                  {currentCard.attachments.map((att, i) =>
                    att.type === "image" && att.url ? (
                      <div
                        key={i}
                        className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl"
                        style={{ maxHeight: "280px" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt="Question visual"
                          className="h-full max-h-72 w-auto object-contain bg-slate-800/50 rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}

              <div className="mt-10 flex items-center gap-2 text-slate-500 dark:text-slate-400 animate-pulse">
                <Eye className="h-5 w-5" />
                <span className="text-sm font-medium">Tap to reveal answer</span>
                <span className="text-xs bg-slate-800 dark:bg-[#1E2132] px-1.5 py-0.5 rounded border border-slate-700 dark:border-white/10 ml-1">
                  Space
                </span>
              </div>
            </div>

            {/* Back face */}
            <div
              className="absolute inset-0 rounded-3xl border-2 bg-slate-900 dark:bg-[#141721] shadow-2xl p-10 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                borderColor: `${deckColor}60`,
              }}
            >
              <span
                className="inline-block rounded-full px-5 py-2 text-sm font-bold mb-8 uppercase tracking-widest"
                style={{
                  backgroundColor: `${deckColor}25`,
                  color: deckColor,
                }}
              >
                Answer
              </span>
              <p className="text-3xl sm:text-4xl font-semibold text-white leading-relaxed max-w-3xl mx-auto text-center wrap-break-word">
                {currentCard.back}
              </p>
            </div>
          </div>
        </div>

        {/* Hint */}
        {flashState === "viewing" && currentCard.hint && (
          <div className="mb-6 text-center">
            {showHint ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 px-5 py-3 text-sm font-bold text-amber-800 dark:text-amber-300 shadow-xs">
                <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />
                {currentCard.hint}
              </div>
            ) : (
              <button
                onClick={() => setShowHint(true)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-500 dark:text-[#8B92A5] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Lightbulb className="h-5 w-5" />
                Show Hint
                <span className="text-xs bg-white dark:bg-[#1E2132] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 ml-1">
                  Tab
                </span>
              </button>
            )}
          </div>
        )}

        {/* Rating buttons (revealed) / Reveal button (viewing) */}
        {isRevealed ? (
          <div className="flex flex-col items-center gap-5 w-full animate-[fadeInUp_0.4s_ease-out]">
            <p className="text-sm font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider">
              How well did you know this?
            </p>
            <div className="flex items-stretch gap-3 w-full max-w-xl">
              {ratingLevels.map((r) => (
                <button
                  key={r.level}
                  onClick={() => handleFlashRating(r.level)}
                  disabled={submitting}
                  className={`flex-1 flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#141721] px-3 py-4 shadow-xs transition-all ${r.hoverBorder} ${r.hoverBg} hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer`}
                >
                  <span className={r.iconColor}>{r.icon}</span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-[#F0F2F8]">
                    {r.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#1E2132] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10">
                    {r.key}
                  </span>
                </button>
              ))}
            </div>
            {submitting && (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
                <span className="text-xs">Saving progress...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={handleReveal}
              disabled={isFlipping}
              className="inline-flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: deckColor }}
            >
              <Eye className="h-6 w-6" />
              Reveal Answer
              <span className="text-xs opacity-70 ml-1 bg-white/20 px-2 py-0.5 rounded">
                Space
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODE: MULTIPLE CHOICE
  // ─────────────────────────────────────────────────────────────────────────

  if (studyMode === "multiple-choice" && currentCard) {
    const labelColors: Record<"A" | "B" | "C" | "D", string> = {
      A: "#6366f1",
      B: "#f59e0b",
      C: "#10b981",
      D: "#ef4444",
    };

    return (
      <div className="mx-auto max-w-2xl page-enter flex flex-col min-h-[calc(100vh-12rem)] pb-10 px-4">
        {topBarEl}
        {progressBarEl}

        {/* Question card */}
        <div
          className="rounded-3xl border-2 bg-white dark:bg-[#141721] shadow-lg p-8 mb-6 text-center"
          style={{ borderColor: `${deckColor}40` }}
        >
          <span
            className="inline-block rounded-full px-4 py-1.5 text-xs font-bold mb-5 uppercase tracking-widest"
            style={{ backgroundColor: `${deckColor}15`, color: deckColor }}
          >
            Question
          </span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F0F2F8] leading-snug wrap-break-word">
            {currentCard.front}
          </p>
          {currentCard.hint && !choiceAnswered && (
            <p className="mt-4 text-sm text-slate-400 dark:text-[#8B92A5] italic">
              💡 {currentCard.hint}
            </p>
          )}
        </div>

        {/* Answer options */}
        <div className="space-y-3">
          {choices.map((choice) => {
            // Determine visual state after answer is submitted
            let borderClass =
              "border-slate-200/80 dark:border-white/5";
            let bgClass = "bg-white dark:bg-[#141721]";
            let textClass = "text-slate-800 dark:text-[#F0F2F8]";
            let opacityClass = "";
            let feedbackIcon: React.ReactNode = null;

            if (choiceAnswered) {
              if (choice.isCorrect) {
                borderClass = "border-emerald-500 dark:border-emerald-500/70";
                bgClass = "bg-emerald-50 dark:bg-emerald-950/40";
                textClass = "text-emerald-800 dark:text-emerald-300";
                feedbackIcon = (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                );
              } else if (selectedLabel === choice.label) {
                borderClass = "border-red-500 dark:border-red-500/70";
                bgClass = "bg-red-50 dark:bg-red-950/40";
                textClass = "text-red-800 dark:text-red-300";
                feedbackIcon = (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                );
              } else {
                opacityClass = "opacity-40";
              }
            }

            return (
              <button
                key={choice.label}
                onClick={() => handleChoiceSelect(choice)}
                disabled={choiceAnswered}
                onMouseEnter={(e) => {
                  if (!choiceAnswered)
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      `${deckColor}80`;
                }}
                onMouseLeave={(e) => {
                  if (!choiceAnswered)
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "";
                }}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${borderClass} ${bgClass} ${opacityClass} ${
                  !choiceAnswered
                    ? "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                    : ""
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                  style={{
                    backgroundColor: labelColors[choice.label],
                  }}
                >
                  {choice.label}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold leading-snug wrap-break-word ${textClass}`}
                >
                  {choice.text}
                </span>
                {feedbackIcon}
              </button>
            );
          })}
        </div>

        {choiceAnswered && (
          <div className="mt-8 text-center animate-[fadeInUp_0.3s_ease-out]">
            <button
              onClick={() => {
                const choice = choices.find((c) => c.label === selectedLabel);
                advance(choice?.isCorrect ?? false, currentCard.id);
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              style={{ backgroundColor: deckColor }}
            >
              Next Question
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODE: TRUE / FALSE
  // ─────────────────────────────────────────────────────────────────────────

  if (studyMode === "true-false" && currentCard && tfQuestion) {
    const getTrueBtnClass = () => {
      if (!tfAnswered)
        return "border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-[#141721] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-lg active:scale-95";
      if (tfQuestion.correctAnswer === true)
        return "bg-emerald-500 border-emerald-500 text-white shadow-lg scale-105";
      if (tfAnswer === true)
        return "bg-red-500 border-red-500 text-white opacity-80";
      return "opacity-40 border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] text-slate-400";
    };

    const getFalseBtnClass = () => {
      if (!tfAnswered)
        return "border-red-300 dark:border-red-500/40 bg-white dark:bg-[#141721] text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-500 hover:-translate-y-1 hover:shadow-lg active:scale-95";
      if (tfQuestion.correctAnswer === false)
        return "bg-emerald-500 border-emerald-500 text-white shadow-lg scale-105";
      if (tfAnswer === false)
        return "bg-red-500 border-red-500 text-white opacity-80";
      return "opacity-40 border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] text-slate-400";
    };

    const isCorrect = tfAnswered && tfAnswer === tfQuestion.correctAnswer;

    return (
      <div className="mx-auto max-w-xl page-enter flex flex-col min-h-[calc(100vh-12rem)] pb-10 px-4">
        {topBarEl}
        {progressBarEl}

        {/* Card with question + statement */}
        <div
          className="rounded-3xl border-2 bg-white dark:bg-[#141721] shadow-lg p-8 mb-8 text-center"
          style={{ borderColor: `${deckColor}40` }}
        >
          <span
            className="inline-block rounded-full px-4 py-1.5 text-xs font-bold mb-5 uppercase tracking-widest"
            style={{ backgroundColor: `${deckColor}15`, color: deckColor }}
          >
            For this question:
          </span>
          <p className="text-base font-bold text-slate-600 dark:text-[#8B92A5] leading-snug mb-5">
            {currentCard.front}
          </p>

          <div className="h-px bg-slate-100 dark:bg-white/10 mb-5" />

          <p className="text-xs font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-widest mb-4">
            Is this statement TRUE or FALSE?
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F0F2F8] leading-snug wrap-break-word">
            &ldquo;{tfQuestion.statement}&rdquo;
          </p>
        </div>

        {/* TRUE / FALSE buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => handleTfAnswer(true)}
            disabled={tfAnswered}
            className={`flex-1 rounded-3xl border-2 py-7 text-2xl font-extrabold tracking-wide transition-all cursor-pointer ${getTrueBtnClass()}`}
          >
            ✓ TRUE
          </button>
          <button
            onClick={() => handleTfAnswer(false)}
            disabled={tfAnswered}
            className={`flex-1 rounded-3xl border-2 py-7 text-2xl font-extrabold tracking-wide transition-all cursor-pointer ${getFalseBtnClass()}`}
          >
            ✗ FALSE
          </button>
        </div>

        {/* Feedback message */}
        {tfAnswered && (
          <div className="text-center space-y-2 animate-[fadeInUp_0.3s_ease-out]">
            <p
              className={`text-base font-extrabold ${
                isCorrect ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </p>
            {!isCorrect && (
              <p className="text-sm text-slate-500 dark:text-[#8B92A5]">
                The correct answer is:{" "}
                <span className="font-bold">
                  {tfQuestion.correctAnswer ? "TRUE" : "FALSE"}
                </span>
              </p>
            )}
            <div className="pt-4">
              <button
                onClick={() =>
                  advance(tfAnswer === tfQuestion.correctAnswer, currentCard.id)
                }
                className="inline-flex items-center gap-2 rounded-2xl px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                style={{ backgroundColor: deckColor }}
              >
                Next Question
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
