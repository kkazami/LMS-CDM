"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import type { FlashcardCard, FlashcardStudyStats } from "@/lib/lms-types";
import FocusButton from "@/components/focus/FocusButton";
import { panel, primaryButton, secondaryButton } from "./styles";
import { BADGES_EARNED_EVENT } from "@/lib/gamification/badge-links";
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

const reviewStatuses = {
  finished: { label: "Finished", color: "bg-emerald-600 dark:bg-emerald-400" },
  retry: { label: "Retry", color: "bg-rose-600 dark:bg-rose-400" },
  confirm: { label: "Confirm", color: "bg-blue-600 dark:bg-blue-400" },
  unseen: { label: "Unseen", color: "bg-slate-300 dark:bg-slate-600" },
} as const;

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
  const params = useParams();
  const institute = (params?.institute as string) || "";
  const isIte = institute.toLowerCase() === "ite";

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
  const sessionSize = useRef(0);
  const awaitingConfirmation = useRef(new Set<string>());
  const ratedThisReveal = useRef(false);
  const pendingProgress = useRef(Promise.resolve());
  const flipTimer = useRef<number | undefined>(undefined);

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
      } catch (err) {
        console.warn("Failed to load cards", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId]);

  // Trigger session completion EXP grant when study finishes
  useEffect(() => {
    if (phase === "summary") {
      const cardsReviewed = new Set(sessionResults.map(result => result.cardId)).size;
      if (cardsReviewed < 3) return;
      const elapsedSeconds = Math.max(5, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      let active = true;
      pendingProgress.current.then(() => fetch("/api/flashcards/complete-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId,
          cardsReviewed,
          durationSeconds: elapsedSeconds,
        }),
      }))
        .then((r) => r.json())
        .then((data) => {
          if (data.success) window.dispatchEvent(new Event(BADGES_EARNED_EVENT));
          if (active && data.grantedExp > 0) {
            setExpEarned(data.grantedExp);
          }
        })
        .catch(() => {});
      return () => { active = false; };
    }
  }, [phase, deckId, sessionResults]);

  useEffect(() => () => window.clearTimeout(flipTimer.current), [phase]);

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
      sessionSize.current = list.length;
      sessionStartTimeRef.current = Date.now();
      awaitingConfirmation.current.clear();
      setExpEarned(null);
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
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        // Progress is not critical — swallow the error silently
      }
    },
    []
  );

  // ── Advance to the next card ──
  const advance = useCallback(
    (isCorrect: boolean, cardId: string, requeue?: FlashcardCard) => {
      const updatedResults = [...sessionResults, { cardId, correct: isCorrect }];
      setSessionResults(updatedResults);

      const next = currentIndex + 1;
      const queue = requeue ? [...sessionCards, requeue] : sessionCards;
      if (requeue) setSessionCards(queue);
      if (next >= queue.length) {
        setPhase("summary");
        return;
      }

      setCurrentIndex(next);
      prepareCard(next, studyMode, queue);
    },
    [currentIndex, sessionCards, sessionResults, studyMode, prepareCard]
  );

  // ── Flashcard: flip reveal ──
  const handleReveal = useCallback(() => {
    if (flashState !== "viewing" || isFlipping) return;
    setIsFlipping(true);
    flipTimer.current = window.setTimeout(() => {
      ratedThisReveal.current = false;
      setFlashState("revealed");
      setIsFlipping(false);
    }, 300);
  }, [flashState, isFlipping]);

  // ── Flashcard: 4-level self-rating ──
  const handleFlashRating = useCallback(
    (level: 1 | 2 | 3 | 4) => {
      if (!currentCard || flashState !== "revealed" || ratedThisReveal.current) return;
      ratedThisReveal.current = true;
      const isCorrect = level >= 3;
      const confirmed = awaitingConfirmation.current.delete(currentCard.id);
      if (isCorrect && !confirmed) awaitingConfirmation.current.add(currentCard.id);

      pendingProgress.current = pendingProgress.current.then(() =>
        recordProgress(currentCard.id, isCorrect ? "knew_it" : "still_learning")
      );
      advance(isCorrect, currentCard.id, isCorrect && confirmed ? undefined : currentCard);
    },
    [currentCard, flashState, recordProgress, advance]
  );

  // ── Multiple choice: select answer ──
  const handleChoiceSelect = useCallback(
    async (choice: MultipleChoiceOption) => {
      if (choiceAnswered || !currentCard) return;
      setSelectedLabel(choice.label);
      setChoiceAnswered(true);
      await recordProgress(
        currentCard.id,
        choice.isCorrect ? "knew_it" : "still_learning"
      );
    },
    [choiceAnswered, currentCard, recordProgress]
  );

  // ── True/False: answer ──
  const handleTfAnswer = useCallback(
    async (answer: boolean) => {
      if (tfAnswered || !currentCard || !tfQuestion) return;
      setTfAnswer(answer);
      setTfAnswered(true);
      const isCorrect = answer === tfQuestion.correctAnswer;
      await recordProgress(
        currentCard.id,
        isCorrect ? "knew_it" : "still_learning"
      );
    },
    [tfAnswered, currentCard, tfQuestion, recordProgress]
  );

  // ── Keyboard shortcuts (flashcard mode only) ──
  useEffect(() => {
    if (phase !== "studying" || studyMode !== "flashcard") return;
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]'))) return;
      if (e.key === " " && flashState === "viewing" && !(e.target instanceof HTMLElement && e.target.closest('button, a'))) {
        e.preventDefault();
        handleReveal();
      } else if (flashState === "revealed") {
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
      } else if (e.key.toLowerCase() === "h" && flashState === "viewing") {
        e.preventDefault();
        setShowHint(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, studyMode, flashState, handleReveal, handleFlashRating]);

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
      },
      {
        id: "true-false",
        icon: <ToggleLeft className="h-7 w-7" />,
        title: "True or False",
        desc: "Is the statement correct? Quick-fire decision making.",
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
          <h2 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-primary-theme sm:text-3xl">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: deckColor }} />
            <span className="[overflow-wrap:anywhere]">{deckTitle}</span>
          </h2>
          <p className="mt-2 text-sm text-secondary-theme">Choose how you want to study.</p>

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
              className={`flex min-w-0 flex-col items-start p-4 text-left hover:border-(--focus-ring) sm:p-5 ${panel}`}
            >
              <span className="mb-3 grid size-10 place-items-center rounded-lg bg-canvas text-primary-theme">{m.icon}</span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F0F2F8] mb-2">
                {m.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5] leading-relaxed">
                {m.desc}
              </p>
              <div
                className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-primary-theme"
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
    const incorrectCardsForRetry = allCards.filter((c) =>
      incorrectCardIds.has(c.id)
    );

    return (
      <div className="mx-auto max-w-lg page-enter">
        <div className={`overflow-hidden ${panel}`}>
          <div className="border-b border-theme bg-canvas px-5 py-6 text-center">
            <Trophy aria-hidden="true" className="mx-auto mb-3 size-7 text-primary-theme" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">
              Session Complete!
            </h2>
            <p className="mt-1 text-slate-500 dark:text-[#8B92A5] font-medium">
              {deckTitle}
            </p>

            {expEarned !== null && expEarned > 0 && (
              <div className={`mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black animate-in zoom-in-95 ${
                isIte
                  ? "bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400"
                  : "bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400"
              }`}>
                <span>✨</span>
                <span>+{expEarned} EXP Earned!</span>
              </div>
            )}

          </div>

          {/* Stats */}
          <div className="px-8 py-6 space-y-6">
            <div className="text-center">
              <div
                className="text-4xl font-bold tabular-nums text-primary-theme"
              >
                {accuracy}%
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#8B92A5]">
                Accuracy
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
              {[
                { label: "Attempts", value: total, color: "text-slate-900 dark:text-[#F0F2F8]" },
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
          <div className="space-y-3 border-t border-theme bg-canvas px-4 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={onExit}
                className={`flex-1 ${secondaryButton}`}
              >
                Back to Deck
              </button>
              <button
                onClick={() => startSession(studyMode)}
                className={`flex-1 ${primaryButton}`}
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

  const remainingCards = sessionCards.length - currentIndex;
  const topBarEl = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <button
        onClick={() => setPhase("mode-select")}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-secondary-theme hover:text-primary-theme"
      >
        <ArrowLeft className="h-4 w-4" />
        {modeLabelMap[studyMode]}
      </button>
      <div className="flex items-center gap-3">
        <FocusButton
          contextType="FLASHCARDS"
          refId={deckId}
          title={deckTitle}
        />
        <span className="text-sm font-bold text-slate-500 dark:text-[#8B92A5] bg-slate-100 dark:bg-[#1E2132] px-3.5 py-1 rounded-full border border-slate-200/60 dark:border-white/5">
          {studyMode === 'flashcard' ? `${remainingCards} left` : `${currentIndex + 1} / ${sessionCards.length}`}
        </span>
      </div>
    </div>
  );

  const progressBarEl = (
    <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-(--border-color)">
      <div
        className="h-full rounded-full bg-(--action-bg) motion-safe:transition-[width]"
        style={{
          width: `${(1 - remainingCards / Math.max(1, sessionSize.current)) * 100}%`,
        }}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MODE: FLASHCARD
  // ─────────────────────────────────────────────────────────────────────────

  if (studyMode === "flashcard" && currentCard) {
    const isRevealed = flashState === "revealed";
    const latestRatings = new Map(sessionResults.map(({ cardId, correct }) => [cardId, correct] as const));
    const queuedIds = new Set(sessionCards.slice(currentIndex).map(({ id }) => id));
    const progress = sessionCards.slice(0, sessionSize.current).map(({ id }) => {
      const rating = latestRatings.get(id);
      let status: keyof typeof reviewStatuses = "unseen";
      if (!queuedIds.has(id)) status = "finished";
      else if (rating === false) status = "retry";
      else if (rating === true) status = "confirm";
      return { id, status };
    });
    const confidentOutcome = latestRatings.get(currentCard.id) === true ? "Finish card" : "Confirm later";

    const ratingLevels: {
      level: 1 | 2 | 3 | 4;
      icon: React.ReactNode;
      label: string;
      key: string;
      tone: string;
    }[] = [
      {
        level: 1,
        icon: <Frown className="h-5 w-5" />,
        label: "Forgot",
        key: "1",
        tone: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70",
      },
      {
        level: 2,
        icon: <Meh className="h-5 w-5" />,
        label: "Hard",
        key: "2",
        tone: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70",
      },
      {
        level: 3,
        icon: <Smile className="h-5 w-5" />,
        label: "Good",
        key: "3",
        tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70",
      },
      {
        level: 4,
        icon: <ThumbsUp className="h-5 w-5" />,
        label: "Easy",
        key: "4",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70",
      },
    ];

    return (
      <div className="mx-auto max-w-3xl pb-10">
        {topBarEl}
        <section aria-label="Session progress" className="mb-5 rounded-2xl border border-theme bg-surface px-4 py-3 sm:px-6">
          <h2 className="mb-3 text-base font-semibold text-primary-theme [overflow-wrap:anywhere]">{deckTitle}</h2>
          <ol aria-label="Flashcard progress" role="list" className="flex flex-wrap gap-x-1.5 gap-y-2 py-1 sm:gap-x-2">
            {progress.map(({ id, status }, index) => {
              const active = id === currentCard.id;
              const { label, color } = reviewStatuses[status];
              return (
                <li
                  key={id}
                  aria-current={active ? "step" : undefined}
                  title={`Card ${index + 1}: ${label}${active ? " (current)" : ""}`}
                  className={`h-2 min-w-3 max-w-10 flex-1 basis-3 rounded-full sm:min-w-4 sm:basis-4 ${color} ${active ? "outline-2 outline-offset-1 outline-(--text-primary)" : ""}`}
                >
                  <span className="sr-only">Card {index + 1}: {label}</span>
                </li>
              );
            })}
          </ol>
          <ul role="list" aria-label="Progress totals" aria-live="polite" aria-atomic="true" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-secondary-theme">
            {Object.entries(reviewStatuses).map(([status, { label, color }]) => (
              <li key={status} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${color}`} />
                {progress.filter(card => card.status === status).length} {label}
              </li>
            ))}
          </ul>
        </section>

        <div className="mb-5 [perspective:1200px]">
          <div
            className="grid min-h-64 grid-cols-1 [transform-style:preserve-3d] motion-safe:transition-transform motion-safe:duration-300 sm:min-h-72"
            style={{ transform: isRevealed || isFlipping ? "rotateY(180deg)" : undefined }}
            onClick={!isRevealed ? handleReveal : undefined}
          >
            <div aria-hidden={isRevealed} className={`col-start-1 row-start-1 flex min-w-0 flex-col overflow-hidden [backface-visibility:hidden] ${panel}`}>
              <div className="border-b border-theme px-4 py-2.5 text-sm font-semibold text-secondary-theme sm:px-6">Question</div>
              <div className="grid flex-1 place-content-center gap-4 p-5 text-center sm:p-8">
                <p className="mx-auto max-w-prose whitespace-pre-wrap text-xl/8 font-semibold text-primary-theme [overflow-wrap:anywhere] sm:text-3xl/10">{currentCard.front}</p>
                {currentCard.attachments?.map((attachment, index) => attachment.type === "image" && attachment.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={index} src={attachment.url} alt={attachment.label || "Question visual"} className="mx-auto max-h-56 max-w-full rounded-xl border border-theme object-contain" onError={event => { event.currentTarget.hidden = true; }} />
                ) : null)}
              </div>
            </div>
            <div aria-hidden={!isRevealed} className={`col-start-1 row-start-1 flex min-w-0 flex-col overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] ${panel}`}>
              <div className="border-b border-theme bg-canvas px-4 py-2.5 text-sm font-semibold text-secondary-theme sm:px-6">Answer</div>
              <div className="grid flex-1 place-content-center p-5 text-center sm:p-8">
                <p className="mx-auto max-w-prose whitespace-pre-wrap text-xl/8 font-semibold text-primary-theme [overflow-wrap:anywhere] sm:text-3xl/10">{currentCard.back}</p>
              </div>
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
                  H
                </span>
              </button>
            )}
          </div>
        )}

        {/* Rating buttons (revealed) / Reveal button (viewing) */}
        {isRevealed ? (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="space-y-1 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">How well did you know this?</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Two Good or Easy ratings in a row finish a card.</p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {ratingLevels.map((r) => (
                <button
                  key={r.level}
                  onClick={() => handleFlashRating(r.level)}
                  type="button"
                  className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 ${r.tone}`}
                >
                  <span aria-hidden="true">{r.icon}</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {r.label}
                    <kbd aria-hidden="true" className="rounded border border-current px-1 font-sans text-[11px]">
                      {r.key}
                    </kbd>
                  </span>
                  <span className="text-xs">
                    {r.level < 3 ? "Retry later" : confidentOutcome}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={handleReveal}
              disabled={isFlipping}
              className={primaryButton}
            >
              <Eye aria-hidden="true" className="size-4" />
              Reveal Answer
              <kbd className="ml-1 rounded border border-current px-1.5 py-0.5 font-sans text-xs">
                Space
              </kbd>
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
    return (
      <div className="mx-auto max-w-3xl pb-10">
        {topBarEl}
        {progressBarEl}

        {/* Question card */}
        <div
          className={`mb-4 p-4 sm:p-6 ${panel}`}
        >
          <span
            className="mb-2 inline-block text-sm font-semibold text-secondary-theme"
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
            const correct = choiceAnswered && choice.isCorrect;
            const incorrect = choiceAnswered && selectedLabel === choice.label && !choice.isCorrect;
            const resultStyle = correct
              ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200"
              : incorrect
                ? "border-rose-600 bg-rose-50 text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200"
                : "border-theme bg-surface text-primary-theme enabled:hover:bg-canvas";

            return (
              <button type="button" key={choice.label} onClick={() => handleChoiceSelect(choice)} disabled={choiceAnswered} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${resultStyle}`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-canvas text-sm font-semibold text-secondary-theme">{choice.label}</span>
                <span className="min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">{choice.text}</span>
                {correct && <CheckCircle2 aria-label="Correct answer" role="img" className="size-5 shrink-0" />}
                {incorrect && <XCircle aria-label="Incorrect answer" role="img" className="size-5 shrink-0" />}
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
              className={primaryButton}
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
    const optionStyle = (answer: boolean) => {
      if (!tfAnswered) return "border-theme bg-surface text-primary-theme hover:bg-canvas";
      if (answer === tfQuestion.correctAnswer) return "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200";
      if (answer === tfAnswer) return "border-rose-600 bg-rose-50 text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200";
      return "border-theme bg-surface text-secondary-theme";
    };

    const isCorrect = tfAnswered && tfAnswer === tfQuestion.correctAnswer;

    return (
      <div className="mx-auto max-w-3xl pb-10">
        {topBarEl}
        {progressBarEl}

        {/* Card with question + statement */}
        <div
          className={`mb-4 p-4 sm:p-6 ${panel}`}
        >
          <span
            className="mb-2 inline-block text-sm font-semibold text-secondary-theme"
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
            className={`min-h-11 flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${optionStyle(true)}`}
          >
            ✓ TRUE
          </button>
          <button
            onClick={() => handleTfAnswer(false)}
            disabled={tfAnswered}
            className={`min-h-11 flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${optionStyle(false)}`}
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
                className={primaryButton}
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
