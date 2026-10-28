"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  XCircle,
  Flame,
  Trophy,
  Clock,
  Shield,
  Sparkles,
  AlertTriangle,
  Layers,
  Snowflake,
  Zap,
} from "lucide-react";
import { ARENA_PALETTE, type ArenaSessionStatus } from "@/types/arena";
import ArenaConfirmModal from "./ArenaConfirmModal";

interface PlayerChoice {
  id: string;
  choiceText: string;
  colorIndex: number;
  orderIndex: number;
  isCorrect?: boolean;
}

interface PlayerQuestion {
  id: string;
  questionText: string;
  timeLimitSeconds: number;
  basePoints: number;
  choices: PlayerChoice[];
  explanation?: string | null;
}

interface MyAnswerRecord {
  id: string;
  choiceId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
}

interface LeaderboardEntry {
  id: string;
  studentId: string;
  nickname: string;
  score: number;
  rank: number;
  currentStreak: number;
}

interface ArenaPlayerClientProps {
  sessionId: string;
  instituteCode: string;
  currentUserId: string;
}

export default function ArenaPlayerClient({
  sessionId,
  instituteCode,
  currentUserId,
}: ArenaPlayerClientProps) {
  const router = useRouter();
  const [quizTitle, setQuizTitle] = useState("");
  const [status, setStatus] = useState<ArenaSessionStatus>("LOBBY");
  const [sessionDeleted, setSessionDeleted] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<PlayerQuestion | null>(null);
  const [currentQuestionStartedAt, setCurrentQuestionStartedAt] = useState<string | null>(null);
  const [currentQuestionDeadline, setCurrentQuestionDeadline] = useState<string | null>(null);
  const [myAnswer, setMyAnswer] = useState<MyAnswerRecord | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [enableIntegrityMonitoring, setEnableIntegrityMonitoring] = useState(false);

  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Power-Ups State (single-use per match)
  const [usedPowerUps, setUsedPowerUps] = useState<Set<string>>(new Set());
  const [activePowerUp, setActivePowerUp] = useState<"FREEZE" | "ADD_TIME" | "DOUBLE_POINTS" | null>(null);
  const [powerUpHistory, setPowerUpHistory] = useState<Record<number, string>>({});
  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(0);
  const [addedTimeSec, setAddedTimeSec] = useState(0);

  // Anti-cheating local flags tracker
  const [tabSwitchesCount, setTabSwitchesCount] = useState(0);
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);

  const confettiFiredRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastQuestionIndexRef = useRef(currentQuestionIndex);

  // Reset active power-up effects when advancing to next question (usedPowerUps remains locked)
  useEffect(() => {
    if (lastQuestionIndexRef.current !== currentQuestionIndex) {
      lastQuestionIndexRef.current = currentQuestionIndex;
      setActivePowerUp(null);
      setFreezeActive(false);
      setFreezeSecondsLeft(0);
      setAddedTimeSec(0);
    }
  }, [currentQuestionIndex]);

  // In-App Confirmation Modal State (replaces ugly browser confirm() popup)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    itemName?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const handleLeaveGame = () => {
    setConfirmDialog({
      open: true,
      title: "Leave Live Game?",
      description: "Are you sure you want to leave this game? Your recorded answers will remain saved, but you will disconnect from the active match.",
      confirmLabel: "Leave Game",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setIsLeaving(true);
        try {
          await fetch(`/api/arena/sessions/${sessionId}`, { method: "DELETE" });
          router.push(`/${instituteCode}/arena`);
        } catch (err) {
          console.error("Leave game error:", err);
          router.push(`/${instituteCode}/arena`);
        }
      },
    });
  };

  const renderConfirmModal = () => (
    <ArenaConfirmModal
      open={confirmDialog.open}
      title={confirmDialog.title}
      description={confirmDialog.description}
      confirmLabel={confirmDialog.confirmLabel}
      cancelLabel={confirmDialog.cancelLabel}
      variant={confirmDialog.variant}
      itemName={confirmDialog.itemName}
      isBusy={isLeaving}
      onConfirm={confirmDialog.onConfirm}
      onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
    />
  );

  // Poll state every 1s
  const fetchPlayerState = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch(`/api/arena/sessions/${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setSessionDeleted(true);
        }
        return;
      }
      const data = await res.json();

      setQuizTitle(data.quizTitle);
      setStatus(data.status);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.currentQuestion);
      setCurrentQuestionStartedAt(data.currentQuestionStartedAt);
      setCurrentQuestionDeadline(data.currentQuestionDeadline);
      setMyAnswer(data.myAnswer);
      setLeaderboard(data.leaderboard || []);
      setEnableIntegrityMonitoring(data.enableIntegrityMonitoring);

      // Restore selected choice if already answered previously, or reset if new question
      if (data.myAnswer?.choiceId) {
        setSelectedChoiceId(data.myAnswer.choiceId);
      } else if (data.status === "QUESTION_ACTIVE" && !data.myAnswer) {
        setSelectedChoiceId(null);
      }
    } catch (err) {
      console.warn("Poll player state error:", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    fetchPlayerState();
    if (status === "FINISHED" || sessionDeleted) return;
    const interval = setInterval(fetchPlayerState, 1500);
    return () => clearInterval(interval);
  }, [fetchPlayerState, status, sessionDeleted]);

  // Countdown timer with Freeze and Add Time integration
  useEffect(() => {
    if (status !== "QUESTION_ACTIVE" || !currentQuestionDeadline) {
      setSecondsRemaining(null);
      return;
    }

    if (freezeActive) {
      const freezeInterval = setInterval(() => {
        setFreezeSecondsLeft((prev) => {
          if (prev <= 1) {
            setFreezeActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(freezeInterval);
    }

    const updateTimer = () => {
      const now = Date.now();
      const deadline =
        new Date(currentQuestionDeadline).getTime() +
        addedTimeSec * 1000 +
        (usedPowerUps.has("FREEZE") ? 5000 : 0);
      const diffSec = Math.max(0, Math.ceil((deadline - now) / 1000));
      setSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [status, currentQuestionDeadline, freezeActive, addedTimeSec, usedPowerUps]);

  // Warn student before closing tab or navigating away while game is live
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== "FINISHED") {
        e.preventDefault();
        e.returnValue = "A live quiz session is in progress. Leaving will keep your score saved, and you can resume anytime.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  // Anti-cheating tab switch listener
  useEffect(() => {
    if (true) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchesCount((prev) => prev + 1);
        setIntegrityWarning("Tab switch detected — this attempt has been logged for instructor review.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enableIntegrityMonitoring, status]);

  // Power-Up Activation Handlers
  const handleActivateFreeze = () => {
    if (usedPowerUps.has("FREEZE") || freezeActive || status !== "QUESTION_ACTIVE" || myAnswer) return;
    setUsedPowerUps((prev) => new Set(prev).add("FREEZE"));
    setActivePowerUp("FREEZE");
    setPowerUpHistory((prev) => ({ ...prev, [currentQuestionIndex]: "FREEZE" }));
    setFreezeActive(true);
    setFreezeSecondsLeft(5);
  };

  const handleActivateAddTime = () => {
    if (usedPowerUps.has("ADD_TIME") || status !== "QUESTION_ACTIVE" || myAnswer) return;
    setUsedPowerUps((prev) => new Set(prev).add("ADD_TIME"));
    setActivePowerUp("ADD_TIME");
    setPowerUpHistory((prev) => ({ ...prev, [currentQuestionIndex]: "ADD_TIME" }));
    setAddedTimeSec((prev) => prev + 10);
  };

  const handleActivateDoublePoints = () => {
    if (usedPowerUps.has("DOUBLE_POINTS") || status !== "QUESTION_ACTIVE" || myAnswer) return;
    setUsedPowerUps((prev) => new Set(prev).add("DOUBLE_POINTS"));
    setActivePowerUp("DOUBLE_POINTS");
    setPowerUpHistory((prev) => ({ ...prev, [currentQuestionIndex]: "DOUBLE_POINTS" }));
  };

  // Submit Answer
  const handleSelectAnswer = async (choiceId: string) => {
    if (myAnswer || isSubmittingAnswer || status !== "QUESTION_ACTIVE") return;

    setSelectedChoiceId(choiceId);
    setIsSubmittingAnswer(true);

    try {
      const res = await fetch(`/api/arena/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choiceId,
          integrityFlags: tabSwitchesCount,
          powerUp: activePowerUp,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMyAnswer({
          id: "temp",
          choiceId,
          isCorrect: data.isCorrect,
          pointsEarned: data.pointsEarned,
          responseTimeMs: data.responseTimeMs || 0,
        });
        setLeaderboard((prev) =>
          prev.map((entry) =>
            entry.studentId === currentUserId
              ? {
                  ...entry,
                  score: entry.score + (data.pointsEarned || 0),
                  currentStreak: typeof data.streak === "number" ? data.streak : entry.currentStreak,
                }
              : entry
          )
        );
        if (false) setMyAnswer({ id: "unused", choiceId: null, isCorrect: false, pointsEarned: 0, responseTimeMs: 0,
        });

        if (data.isCorrect) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
          });
        }
      }
    } catch (err) {
      console.error("Answer submission error:", err);
    } finally {
      setIsSubmittingAnswer(false);
      // State already updated optimistically from POST /answer response
    }
  };

  // Find current student in leaderboard
  const myLeaderboardEntry = leaderboard.find((p) => p.studentId === currentUserId);

  // If session was ended or removed by host
  if (sessionDeleted) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center p-6 text-center bg-[#0D0F17] rounded-3xl border border-white/10 shadow-2xl space-y-4">
        <XCircle className="w-16 h-16 text-rose-400" />
        <h2 className="text-2xl font-black text-white">Session Ended or Removed</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          This game session was ended or removed by the instructor.
        </p>
        <Link
          href={`/${instituteCode}/arena`}
          className="mt-4 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow"
        >
          Return to Arena Hub
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. LOBBY SCREEN
  // ─────────────────────────────────────────────────────────────
  if (status === "LOBBY") {
    return (
      <div className="min-h-[80vh] flex flex-col justify-between items-center p-6 text-center bg-linear-to-br from-[#1C1226] via-[#12151F] to-[#0A0C13] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Top bar with Dashboard exit */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Live Arena Lobby
            </span>
            <span className="text-sm font-bold text-slate-300 truncate max-w-xs">{quizTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${instituteCode}/arena`}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold"
              title="Return to Dashboard (you can resume anytime)"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleLeaveGame}
              disabled={isLeaving}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition text-xs font-bold disabled:opacity-50"
              title="Leave and exit this game"
            >
              {isLeaving ? "Leaving..." : "Leave Game"}
            </button>
          </div>
        </div>

        <div className="my-auto py-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-amber-500/10 animate-pulse">
            🎯
          </div>

          <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            You are in the game!
          </span>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            {myLeaderboardEntry?.nickname || "Player"}
          </h1>

          <p className="text-slate-400 text-sm max-w-sm">
            Look up at the host screen! The quiz will begin as soon as the instructor starts the session.
          </p>

          {false && enableIntegrityMonitoring && (
            <div className="mt-8 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Integrity Monitoring Active</span>
            </div>
          )}
        </div>

        <div className="w-full pt-4 border-t border-white/5 text-xs text-slate-500">
          Status: Waiting for instructor to start...
        </div>
        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ACTIVE QUESTION SCREEN
  // ─────────────────────────────────────────────────────────────
  if (status === "QUESTION_ACTIVE" && currentQuestion) {
    const totalTime = currentQuestion.timeLimitSeconds || 20;
    const progressPercent = secondsRemaining !== null ? (secondsRemaining / totalTime) * 100 : 100;
    const hasSubmitted = Boolean(myAnswer || selectedChoiceId);

    return (
      <div
        className={`min-h-[85vh] flex flex-col justify-between p-4 sm:p-6 bg-[#0D0F17] rounded-3xl border shadow-2xl space-y-4 transition-all duration-300 ${
          freezeActive
            ? "border-cyan-400/60 ring-4 ring-cyan-500/30 shadow-cyan-500/20"
            : "border-white/10"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Q{currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/${instituteCode}/arena`}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold"
              title="Return to Dashboard (game stays running in background)"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleLeaveGame}
              disabled={isLeaving}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition text-xs font-bold disabled:opacity-50"
              title="Leave and exit this game"
            >
              {isLeaving ? "Leaving..." : "Leave Game"}
            </button>
            <span
              className={`px-3 py-1 rounded-xl font-mono font-bold text-xs border flex items-center gap-1.5 transition ${
                freezeActive
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 animate-pulse"
                  : "bg-white/10 text-white border-white/15"
              }`}
            >
              {freezeActive ? (
                <>
                  <Snowflake className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                  <span>FROZEN ({freezeSecondsLeft}s)</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                  <span>{secondsRemaining !== null ? `${secondsRemaining}s` : "--"}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* ─── Tactical Power-Ups Bar (Freeze, Add Time, 2x Points) ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 px-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Power-Ups (1x Per Match):</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Freeze Power-Up */}
            <button
              type="button"
              disabled={usedPowerUps.has("FREEZE") || isSubmittingAnswer || hasSubmitted || freezeActive}
              onClick={handleActivateFreeze}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                usedPowerUps.has("FREEZE")
                  ? "opacity-35 bg-white/5 text-slate-500 border border-white/5 line-through cursor-not-allowed"
                  : freezeActive
                  ? "bg-cyan-500 text-slate-950 font-black ring-2 ring-cyan-300 animate-pulse shadow-md shadow-cyan-500/30"
                  : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 active:scale-95"
              }`}
              title="Freeze countdown for 5 seconds"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Freeze (5s)</span>
            </button>

            {/* Add Time Power-Up */}
            <button
              type="button"
              disabled={usedPowerUps.has("ADD_TIME") || isSubmittingAnswer || hasSubmitted}
              onClick={handleActivateAddTime}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                usedPowerUps.has("ADD_TIME")
                  ? "opacity-35 bg-white/5 text-slate-500 border border-white/5 line-through cursor-not-allowed"
                  : activePowerUp === "ADD_TIME"
                  ? "bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300 shadow-md shadow-amber-500/30"
                  : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 active:scale-95"
              }`}
              title="Add 10 seconds to this question"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>+10s Time</span>
            </button>

            {/* 2x Double Points Power-Up */}
            <button
              type="button"
              disabled={usedPowerUps.has("DOUBLE_POINTS") || isSubmittingAnswer || hasSubmitted}
              onClick={handleActivateDoublePoints}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                usedPowerUps.has("DOUBLE_POINTS")
                  ? "opacity-35 bg-white/5 text-slate-500 border border-white/5 line-through cursor-not-allowed"
                  : activePowerUp === "DOUBLE_POINTS"
                  ? "bg-purple-600 text-white font-black ring-2 ring-purple-300 shadow-md shadow-purple-500/40 animate-pulse"
                  : "bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 active:scale-95"
              }`}
              title="Double points earned if this answer is correct"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>2x Points</span>
            </button>
          </div>
        </div>

        {/* Tactical Feedback Badges */}
        {freezeActive && (
          <div className="py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-black text-center flex items-center justify-center gap-2 animate-in fade-in">
            <Snowflake className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>❄️ FREEZE ACTIVE: Timer is paused for {freezeSecondsLeft}s! Take your time to review.</span>
          </div>
        )}
        {activePowerUp === "ADD_TIME" && !freezeActive && (
          <div className="py-2.5 px-4 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-black text-center flex items-center justify-center gap-2 animate-in fade-in">
            <Clock className="w-4 h-4 text-amber-300" />
            <span>⏱️ TIME BOOST ACTIVE: +10 Seconds extended on your question clock!</span>
          </div>
        )}
        {activePowerUp === "DOUBLE_POINTS" && (
          <div className="py-2.5 px-4 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-black text-center flex items-center justify-center gap-2 animate-in fade-in">
            <Flame className="w-4 h-4 text-purple-300" />
            <span>⚡ 2X MULTIPLIER ACTIVATED: Answer correctly to score double points on this question!</span>
          </div>
        )}

        {false && integrityWarning && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{integrityWarning}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-indigo-500 via-teal-500 to-purple-500 transition-all duration-500 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="bg-[#181B26] p-5 sm:p-6 rounded-2xl border border-white/10 text-center">
          <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
            {currentQuestion.questionText}
          </h2>
        </div>

        {/* Modern Choice Cards Grid (Option A, B, C, D - Sleek, Non-Kahoot Aesthetic) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
          {currentQuestion.choices.map((choice, cIdx) => {
            const pal = ARENA_PALETTE[cIdx % 4];
            const isSelected = (myAnswer && myAnswer.choiceId === choice.id) || selectedChoiceId === choice.id;

            return (
              <button
                key={choice.id || cIdx}
                type="button"
                disabled={hasSubmitted || isSubmittingAnswer}
                onClick={() => handleSelectAnswer(choice.id)}
                className={`p-5 sm:p-7 rounded-2xl flex items-center gap-4 text-left transition-all duration-200 transform font-semibold text-white shadow-xl select-none ${
                  pal.bg
                } ${pal.hover} ${pal.active} ${
                  isSelected ? "ring-4 ring-white ring-offset-2 ring-offset-[#0D0F17] scale-[1.02] shadow-2xl" : ""
                } ${hasSubmitted && !isSelected ? "opacity-30 grayscale-30" : ""}`}
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg sm:text-xl font-black shrink-0 text-white shadow-inner">
                  {pal.symbol}
                </span>
                <span className="text-base sm:text-lg flex-1 font-bold leading-snug">
                  {choice.choiceText}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lock-In Notice */}
        {hasSubmitted && (
          <div className="py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Answer locked in! Waiting for timer or instructor...</span>
          </div>
        )}
        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. QUESTION RESULT SCREEN (Instant Correct / Incorrect Feedback & Answer Reveal)
  // ─────────────────────────────────────────────────────────────
  if (status === "QUESTION_RESULT") {
    const hasAnswered = myAnswer !== null;
    const isCorrect = myAnswer?.isCorrect ?? false;
    const pointsEarned = myAnswer?.pointsEarned ?? 0;
    const usedPowerUp = powerUpHistory[currentQuestionIndex];
    const correctChoice = currentQuestion?.choices.find((c) => c.isCorrect);

    return (
      <div
        className={`min-h-[85vh] flex flex-col justify-between items-center p-6 text-center rounded-3xl border shadow-2xl relative overflow-hidden transition-all duration-300 ${
          isCorrect
            ? "bg-linear-to-br from-[#06331A] via-[#0D2115] to-[#0A0C13] border-emerald-500/30"
            : !hasAnswered
            ? "bg-linear-to-br from-[#2D1B08] via-[#1F140D] to-[#0A0C13] border-amber-500/30"
            : "bg-linear-to-br from-[#380E14] via-[#210D10] to-[#0A0C13] border-rose-500/30"
        }`}
      >
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{quizTitle}</span>
          <Link
            href={`/${instituteCode}/arena`}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold"
          >
            Dashboard
          </Link>
        </div>

        <div className="my-auto w-full flex flex-col items-center">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl sm:text-4xl mb-4 shadow-2xl ${
              isCorrect
                ? "bg-emerald-500 text-white shadow-emerald-500/30"
                : !hasAnswered
                ? "bg-amber-500 text-slate-950 shadow-amber-500/30"
                : "bg-rose-500 text-white shadow-rose-500/30"
            }`}
          >
            {isCorrect ? "✓" : !hasAnswered ? "⏰" : "✗"}
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white mb-1">
            {isCorrect
              ? "Awesome! Correct!"
              : !hasAnswered
              ? "Time's Up!"
              : "Incorrect"}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mb-3">
            {isCorrect
              ? "Great job! Keep the momentum going."
              : !hasAnswered
              ? "No answer was submitted before the timer expired."
              : "Keep your focus! Points can be recovered on the next question."}
          </p>

          {/* Power-up result bonus banner */}
          {usedPowerUp === "DOUBLE_POINTS" && isCorrect && (
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-black uppercase tracking-wider mb-2 animate-bounce">
              <Zap className="w-3.5 h-3.5 text-purple-300" />
              <span>2x Double Points Multiplier Applied!</span>
            </div>
          )}
          {usedPowerUp === "FREEZE" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-bold mb-2">
              <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
              <span>Freeze Power-Up Used (+5s)</span>
            </div>
          )}
          {usedPowerUp === "ADD_TIME" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold mb-2">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Time Extension Used (+10s)</span>
            </div>
          )}

          {isCorrect ? (
            <div className="space-y-1 mb-4">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                +{pointsEarned.toLocaleString()} pts
              </span>
              {myLeaderboardEntry && myLeaderboardEntry.currentStreak >= 2 && (
                <p className="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 fill-current" /> {myLeaderboardEntry.currentStreak} Answer Streak!
                </p>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-400 font-mono">
                0 pts
              </span>
            </div>
          )}

          {/* Choices Breakdown showing Correct Answer and Student's choice */}
          {currentQuestion && (
            <div className="w-full max-w-xl mx-auto my-3 space-y-2 text-left">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Question Review & Answer Key
                </span>
                {correctChoice && (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Correct choice highlighted
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {currentQuestion.choices.map((choice, cIdx) => {
                  const pal = ARENA_PALETTE[cIdx % 4];
                  const isThisCorrect = choice.isCorrect;
                  const isMyChoice = myAnswer?.choiceId === choice.id;

                  return (
                    <div
                      key={choice.id || cIdx}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition ${
                        isThisCorrect
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-500/10"
                          : isMyChoice
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
                          : "border-white/5 bg-white/3 text-slate-400 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black shrink-0 text-white shadow-inner">
                          {pal.symbol}
                        </span>
                        <span className="truncate">{choice.choiceText}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isThisCorrect && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Right Answer</span>
                          </span>
                        )}
                        {isMyChoice && !isThisCorrect && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Your Pick</span>
                          </span>
                        )}
                        {isMyChoice && isThisCorrect && (
                          <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                            You Picked This!
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentQuestion?.explanation && (
            <div className="mt-2 max-w-xl w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 font-medium text-left">
              <span className="font-bold text-white block mb-0.5">Explanation:</span>
              {currentQuestion.explanation}
            </div>
          )}
        </div>

        <div className="w-full pt-4 border-t border-white/5 text-center text-xs text-slate-500">
          Waiting for instructor to proceed to the next question...
        </div>
        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LEADERBOARD SCREEN (Rank & Score)
  // ─────────────────────────────────────────────────────────────
  if (status === "LEADERBOARD") {
    const rank = myLeaderboardEntry?.rank || 1;
    const score = myLeaderboardEntry?.score || 0;

    return (
      <div className="min-h-[85vh] flex flex-col justify-between items-center p-6 text-center bg-[#0D0F17] rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-black text-white">Scoreboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${instituteCode}/arena`}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleLeaveGame}
              disabled={isLeaving}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition text-xs font-bold disabled:opacity-50"
              title="Leave and exit this game"
            >
              {isLeaving ? "Leaving..." : "Leave Game"}
            </button>
          </div>
        </div>
        <Trophy className="w-16 h-16 text-amber-400 drop-shadow-md" />

        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400 block mb-1">
            Current Standing
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white">
            {rank === 1 ? "1st Place!" : rank === 2 ? "2nd Place!" : rank === 3 ? "3rd Place!" : `#${rank} Place`}
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-3xl inline-block shadow-inner">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
            Total Score
          </span>
          <span className="text-4xl sm:text-5xl font-black text-amber-400 font-mono">
            {score.toLocaleString()}
          </span>
        </div>

        <p className="text-slate-400 text-xs">
          Get ready for the next question on the host screen...
        </p>
        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. FINISHED SCREEN (Game Over Podium)
  // ─────────────────────────────────────────────────────────────
  if (status === "FINISHED") {
    const rank = myLeaderboardEntry?.rank || 1;
    const score = myLeaderboardEntry?.score || 0;

    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center p-6 text-center bg-linear-to-b from-[#1C1226] via-[#12151F] to-[#0A0C13] rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="text-5xl animate-bounce">🏆</div>

        <div>
          <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Game Completed
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
            Final Rank: #{rank}
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-3xl inline-block shadow-inner">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
            Final Score
          </span>
          <span className="text-4xl sm:text-5xl font-black text-amber-400 font-mono">
            {score.toLocaleString()}
          </span>
        </div>

        <Link
          href={`/${instituteCode}/arena`}
          className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20"
        >
          Return to Arena Hub
        </Link>
      </div>
    );
  }

  return null;
}
