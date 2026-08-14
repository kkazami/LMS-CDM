"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FlashcardCard, FlashcardStudyStats } from "@/lib/lms-types";
import {
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Send,
  ChevronRight,
  Trophy,
  RotateCcw,
} from "lucide-react";

interface StudyModeProps {
  deckId: string;
  deckTitle: string;
  deckColor: string;
  onExit: () => void;
}

type StudyState = "answering" | "correct" | "incorrect";

interface SessionResult {
  cardId: string;
  correct: boolean;
}

export default function StudyMode({
  deckId,
  deckTitle,
  deckColor,
  onExit,
}: StudyModeProps) {
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyState, setStudyState] = useState<StudyState>("answering");
  const [answer, setAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<FlashcardStudyStats | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch study cards
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/flashcards/study?deckId=${deckId}`);
        if (!res.ok) throw new Error("Failed to load study cards");
        const data = await res.json();
        setCards(data.cards);
        setStats(data.stats);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [deckId]);

  // Focus input when ready
  useEffect(() => {
    if (studyState === "answering" && !loading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [studyState, currentIndex, loading]);

  const currentCard = cards[currentIndex] ?? null;

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentCard || submitting || !answer.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/flashcards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          answer: answer.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to check answer");

      const data = await res.json();
      setCorrectAnswer(data.correctAnswer);
      setSessionResults((prev) => [
        ...prev,
        { cardId: currentCard.id, correct: data.correct },
      ]);

      if (data.correct) {
        setStudyState("correct");
        // Auto-advance after 1.5 seconds
        setTimeout(() => {
          goToNext();
        }, 1500);
      } else {
        setStudyState("incorrect");
      }
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  }, [currentCard, answer, submitting]);

  const goToNext = useCallback(() => {
    if (currentIndex + 1 >= cards.length) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setStudyState("answering");
      setAnswer("");
      setCorrectAnswer("");
      setShowHint(false);
    }
  }, [currentIndex, cards.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && studyState === "answering" && answer.trim()) {
        e.preventDefault();
        handleSubmitAnswer();
      } else if (e.key === " " && studyState === "incorrect") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Tab" && studyState === "answering") {
        e.preventDefault();
        setShowHint(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studyState, answer, handleSubmitAnswer, goToNext]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-3 border-gray-200 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading study session...</p>
        </div>
      </div>
    );
  }

  // Empty flashcard
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
          <RotateCcw className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Empty Flashcard</h3>
        <p className="text-gray-500 text-sm">No cards to study in this flashcard.</p>
        <button
          onClick={onExit}
          className="mt-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Session summary
  if (finished) {
    const totalCards = sessionResults.length;
    const correctCount = sessionResults.filter((r) => r.correct).length;
    const incorrectCount = totalCards - correctCount;
    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

    return (
      <div className="mx-auto max-w-lg page-enter">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Header with gradient */}
          <div
            className="px-8 py-10 text-center"
            style={{
              background: `linear-gradient(135deg, ${deckColor}20, ${deckColor}08)`,
            }}
          >
            <div
              className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${deckColor}20` }}
            >
              <Trophy className="h-8 w-8" style={{ color: deckColor }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Session Complete!</h2>
            <p className="mt-2 text-gray-500">{deckTitle}</p>
          </div>

          {/* Stats */}
          <div className="px-8 py-6 space-y-4">
            {/* Accuracy ring */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold" style={{ color: deckColor }}>
                  {accuracy}%
                </div>
                <p className="text-sm text-gray-500 mt-1">Accuracy</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalCards}</div>
                <p className="text-xs text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
                <p className="text-xs text-gray-500 mt-0.5">Correct</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{incorrectCount}</div>
                <p className="text-xs text-gray-500 mt-0.5">Incorrect</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 bg-gray-50 flex items-center gap-3">
            <button
              onClick={onExit}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Flashcard
            </button>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setStudyState("answering");
                setAnswer("");
                setCorrectAnswer("");
                setShowHint(false);
                setSessionResults([]);
                setFinished(false);
              }}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: deckColor }}
            >
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active study card
  return (
    <div className="mx-auto max-w-5xl page-enter flex flex-col justify-center min-h-[calc(100vh-12rem)] pb-10 px-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </button>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-10 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${((currentIndex + (studyState !== "answering" ? 1 : 0)) / cards.length) * 100}%`,
            backgroundColor: deckColor,
          }}
        />
      </div>

      {/* Flashcard */}
      <div className="flashcard-scene mb-10 flex-1 flex flex-col justify-center">
        <div
          className={`flashcard-inner relative w-full grid ${studyState === "incorrect" ? "flipped" : ""}`}
          style={{ minHeight: "560px" }}
        >
          {/* Front face */}
          <div
            className={`flashcard-face [grid-area:1/1] rounded-3xl border-2 bg-slate-900 shadow-2xl p-10 flex flex-col items-center justify-center transition-colors ${
              studyState === "correct"
                ? "border-emerald-500 bg-emerald-950/60"
                : studyState === "incorrect"
                  ? "border-red-500/50"
                  : "border-slate-700/80 hover:border-slate-600"
            }`}
            style={
              studyState === "correct"
                ? {}
                : studyState === "answering"
                  ? { borderColor: `${deckColor}60` }
                  : {}
            }
          >
            {/* Question */}
            <div className="text-center mb-6 w-full px-4">
              <span
                className="inline-block rounded-full px-5 py-2 text-sm font-bold mb-8 uppercase tracking-widest"
                style={{
                  backgroundColor: `${deckColor}25`,
                  color: deckColor,
                }}
              >
                Question
              </span>
              <p className="text-4xl sm:text-5xl font-semibold text-white leading-tight max-w-3xl mx-auto wrap-break-word">
                {currentCard?.front}
              </p>
            </div>

            {/* Correct overlay */}
            {studyState === "correct" && (
              <div className="absolute inset-0 rounded-3xl bg-emerald-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-[fadeInUp_0.3s_ease-out] w-full px-8 text-center">
                <CheckCircle2 className="h-20 w-20 text-emerald-400" />
                <p className="text-3xl font-bold text-white">Correct!</p>
                <p className="text-lg text-emerald-200 font-medium wrap-break-word w-full">{correctAnswer}</p>
              </div>
            )}

            {/* Attachments preview */}
            {studyState === "answering" && currentCard?.attachments && currentCard.attachments.length > 0 && (
              <div className="mt-10 flex justify-center w-full">
                {currentCard.attachments.map((att, i) => (
                  att.type === "image" && att.url ? (
                    <div key={i} className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl w-full flex justify-center" style={{ maxHeight: "360px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={att.url} 
                        alt="Question Image" 
                        className="w-auto h-full max-h-90 object-contain bg-slate-800/50 rounded-xl" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>

          {/* Back face (shown on incorrect flip) */}
          <div
            className="flashcard-face flashcard-back [grid-area:1/1] rounded-3xl border-2 border-red-500/40 bg-slate-900 shadow-2xl p-10 flex flex-col items-center justify-center w-full"
          >
            <div className="text-center max-w-2xl mx-auto w-full px-4">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
              <span className="inline-block rounded-full bg-red-500/20 px-4 py-1.5 text-xs font-bold text-red-400 mb-6 uppercase tracking-widest">
                Correct Answer
              </span>
              <p className="text-3xl font-semibold text-white leading-relaxed wrap-break-word">
                {correctAnswer}
              </p>
              <p className="mt-8 text-base text-slate-400 wrap-break-word">
                Your answer: <span className="font-semibold text-red-400 line-through decoration-red-400/50 wrap-break-word">{answer}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      {studyState === "answering" && currentCard?.hint && (
        <div className="mb-8 text-center">
          {showHint ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 text-sm font-medium text-amber-800 shadow-sm">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />
              {currentCard.hint}
            </div>
          ) : (
            <button
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              <Lightbulb className="h-5 w-5" />
              Show Hint
              <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm ml-1">Tab</span>
            </button>
          )}
        </div>
      )}

      {/* Answer input (answering state) */}
      {studyState === "answering" && (
        <div 
          className="relative flex items-center p-2 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/80 transition-all duration-300 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.12)] focus-within:-translate-y-1 w-full mx-auto"
          style={{ 
            boxShadow: answer.trim() ? `0 12px 40px ${deckColor}25` : undefined,
            borderColor: answer.trim() ? `${deckColor}50` : undefined
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={submitting}
            className="flex-1 bg-transparent px-6 py-4 text-xl font-medium text-slate-900 placeholder:text-slate-500 placeholder:font-medium border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent disabled:opacity-60 w-full"
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={submitting || !answer.trim()}
            className="shrink-0 flex items-center justify-center h-14 w-14 rounded-full text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 active:scale-95"
            style={{ backgroundColor: deckColor }}
          >
            {submitting ? (
              <div className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Send className="h-6 w-6 -ml-1 mt-1" />
            )}
          </button>
        </div>
      )}

      {/* Next button (incorrect state) */}
      {studyState === "incorrect" && (
        <div className="text-center">
          <button
            onClick={goToNext}
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-medium text-white transition-all hover:shadow-lg active:scale-95"
            style={{ backgroundColor: deckColor }}
          >
            Next Card
            <ChevronRight className="h-5 w-5" />
            <span className="text-xs opacity-70 ml-1">Press Space</span>
          </button>
        </div>
      )}
    </div>
  );
}
