"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Users,
  Play,
  SkipForward,
  Trophy,
  BarChart3,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  QrCode,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import ArenaLobbyQr from "@/components/arena/ArenaLobbyQr";
import ArenaConfirmModal from "@/components/arena/ArenaConfirmModal";
import { ARENA_PALETTE, type ArenaSessionStatus, type ArenaQuestionType } from "@/types/arena";

interface HostQuestionChoice {
  id: string;
  choiceText: string;
  colorIndex: number;
  orderIndex: number;
  isCorrect?: boolean;
}

interface HostQuestion {
  id: string;
  questionText: string;
  questionType: ArenaQuestionType;
  mediaUrl?: string | null;
  timeLimitSeconds: number;
  basePoints: number;
  orderIndex: number;
  choices: HostQuestionChoice[];
  explanation?: string | null;
}

interface AnswerBreakdownItem {
  participantId: string;
  nickname: string;
  choiceId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
}

interface HostParticipant {
  id: string;
  studentId: string;
  nickname: string;
  avatar?: string | null;
  score: number;
  rank: number;
  currentStreak: number;
  isConnected: boolean;
}

interface ArenaHostClientProps {
  sessionId: string;
  instituteCode: string;
}

export default function ArenaHostClient({ sessionId, instituteCode }: ArenaHostClientProps) {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [status, setStatus] = useState<ArenaSessionStatus>("LOBBY");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<HostQuestion | null>(null);
  const [currentQuestionStartedAt, setCurrentQuestionStartedAt] = useState<string | null>(null);
  const [currentQuestionDeadline, setCurrentQuestionDeadline] = useState<string | null>(null);
  const [participants, setParticipants] = useState<HostParticipant[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [answerBreakdown, setAnswerBreakdown] = useState<AnswerBreakdownItem[]>([]);
  const [enableIntegrityMonitoring, setEnableIntegrityMonitoring] = useState(false);
  const [scoringMethod, setScoringMethod] = useState("SPEED_BASED");

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const confettiTriggeredRef = useRef(false);
  const isFetchingRef = useRef(false);
  const hasAutoEndedRef = useRef(false);

  // Reset auto-ended flag when current question or status changes
  useEffect(() => {
    hasAutoEndedRef.current = false;
  }, [currentQuestionIndex, status]);

  // Poll session state every 1.5s for real-time responsiveness without overloading connection pool
  const fetchState = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch(`/api/arena/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();

      setPin(data.pin);
      setQuizTitle(data.quizTitle);
      setStatus(data.status);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setTotalQuestions(data.totalQuestions);
      setCurrentQuestion(data.currentQuestion);
      setCurrentQuestionStartedAt(data.currentQuestionStartedAt);
      setCurrentQuestionDeadline(data.currentQuestionDeadline);
      setParticipants(data.leaderboard || []);
      setAnsweredCount(data.answeredCount || 0);
      setDistribution(data.distribution || {});
      setAnswerBreakdown(data.answerBreakdown || []);
      setEnableIntegrityMonitoring(data.enableIntegrityMonitoring);
      setScoringMethod(data.scoringMethod);
    } catch (err) {
      console.warn("Poll host state error:", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    fetchState();
    if (status === "FINISHED") return;
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [fetchState, status]);

  // Local countdown timer calculation
  useEffect(() => {
    if (status !== "QUESTION_ACTIVE" || !currentQuestionDeadline) {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const deadline = new Date(currentQuestionDeadline).getTime();
      const diffSec = Math.max(0, Math.ceil((deadline - now) / 1000));
      setSecondsRemaining(diffSec);

      // Automatically end question ONCE if deadline passes
      if (diffSec <= 0 && !hasAutoEndedRef.current) {
        hasAutoEndedRef.current = true;
        handleAction("END_QUESTION");
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 500);
    return () => clearInterval(timerInterval);
  }, [status, currentQuestionDeadline]);

  // Prevent accidental page navigation / tab close while game is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== "FINISHED") {
        e.preventDefault();
        e.returnValue = "A live Quiz Arena session is in progress. Leaving will keep the game running in the background.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  // Fire celebratory confetti on podium finish
  useEffect(() => {
    if (status === "FINISHED" && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true;
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
    }
  }, [status]);

  const handleAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/arena/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (typeof data.currentQuestionIndex === "number") {
          setCurrentQuestionIndex(data.currentQuestionIndex);
          setAnsweredCount(0);
          setDistribution({});
          setAnswerBreakdown([]);
        }
        if (data.currentQuestionStartedAt) setCurrentQuestionStartedAt(data.currentQuestionStartedAt);
        if (data.currentQuestionDeadline) setCurrentQuestionDeadline(data.currentQuestionDeadline);
        if (data.currentQuestion) setCurrentQuestion(data.currentQuestion);
        if (action === "END_QUESTION" || action === "KICK_PARTICIPANT") {
          isFetchingRef.current = false;
          await fetchState();
        }
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const requestKick = (participantId: string, nickname?: string) => {
    setConfirmDialog({
      open: true,
      title: "Remove Participant?",
      description: "Remove this student from the lobby? They will be disconnected from the match.",
      itemName: nickname,
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: () => {
        handleAction("KICK_PARTICIPANT", { participantIdToKick: participantId });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const requestEndGame = (redirectToHub = false) => {
    setConfirmDialog({
      open: true,
      title: "End Live Session?",
      description: "Are you sure you want to end this live session now? All active gameplay will stop and final scores will be calculated.",
      confirmLabel: "End Game Now",
      variant: "warning",
      onConfirm: () => {
        handleAction("FINISH_GAME");
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        if (redirectToHub) {
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
      onConfirm={confirmDialog.onConfirm}
      onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
    />
  );

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${instituteCode}/arena/join?pin=${pin}`
    : `https://lumina-cdm.edu.ph/${instituteCode}/arena/join?pin=${pin}`;

  // ─────────────────────────────────────────────────────────────
  // 1. LOBBY VIEW
  // ─────────────────────────────────────────────────────────────
  if (status === "LOBBY") {
    return (
      <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 bg-linear-to-br from-[#1E112A] via-[#12151F] to-[#0A0C13] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Live Arena Lobby
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{quizTitle}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href={`/${instituteCode}/arena`}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-1.5 text-xs font-bold"
              title="Return to Dashboard (game stays running in background)"
            >
              <span>Dashboard</span>
            </Link>
            <button
              onClick={() => requestEndGame(true)}
              className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition flex items-center gap-1.5 text-xs font-bold"
              title="End Game Session"
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">End Session</span>
            </button>
            {false && enableIntegrityMonitoring && (
              <span className="px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Integrity On
              </span>
            )}
            <button
              onClick={() => setShowQrModal(true)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-1.5 text-xs font-bold"
            >
              <QrCode className="w-4 h-4 text-amber-400" /> QR Code
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center: Gigantic PIN Display */}
        <div className="relative z-10 py-10 text-center space-y-6">
          <p className="text-sm sm:text-base font-bold uppercase tracking-widest text-slate-400">
            Join at <span className="text-amber-400 underline font-black underline-offset-4">{joinUrl}</span>
          </p>

          <div className="inline-block bg-white dark:bg-[#181B26] border-2 border-amber-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-amber-500/10">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400 block mb-1">
              Game PIN
            </span>
            <span className="text-5xl sm:text-7xl font-black tracking-widest text-slate-900 dark:text-white font-mono drop-shadow-sm select-all">
              {pin || "••••••"}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-bold">
            <Users className="w-5 h-5 text-amber-400" />
            <span>
              {participants.length} Player{participants.length !== 1 ? "s" : ""} Joined
            </span>
          </div>
        </div>

        {/* Bottom Section: Connected Player Avatars & Start Button */}
        <div className="relative z-10 space-y-6">
          {/* Floating Player Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-h-48 overflow-y-auto p-4 rounded-2xl bg-black/20 border border-white/5">
            {participants.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-4 animate-pulse">
                Waiting for players to connect with PIN {pin}...
              </p>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition animate-in fade-in"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{p.nickname}</span>
                  <button
                    onClick={() => requestKick(p.id, p.nickname)}
                    className="text-slate-400 hover:text-rose-400 ml-1"
                    title="Kick player"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Start Game Action */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/${instituteCode}/arena`}
              className="text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancel & Exit
            </Link>

            <button
              onClick={() => handleAction("START_GAME")}
              disabled={loadingAction || participants.length === 0}
              className="px-8 py-4 rounded-2xl bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base flex items-center gap-2.5 transition transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-amber-500/25 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Game ({participants.length})</span>
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#181B26] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Scan to Join
                </span>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ArenaLobbyQr url={joinUrl} size={220} />

              <div>
                <p className="text-xs text-slate-400">Game PIN</p>
                <p className="text-3xl font-black text-white font-mono">{pin}</p>
              </div>
            </div>
          </div>
        )}

        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ACTIVE QUESTION VIEW (Countdown & Answer Counter)
  // ─────────────────────────────────────────────────────────────
  if (status === "QUESTION_ACTIVE" && currentQuestion) {
    const totalTime = currentQuestion.timeLimitSeconds || 20;
    const progressPercent = secondsRemaining !== null ? (secondsRemaining / totalTime) * 100 : 100;

    return (
      <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 bg-[#0D0F17] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Top Row: Question Counter & Live Answers Tally */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-sm">
              {currentQuestionIndex + 1}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Link
              href={`/${instituteCode}/arena`}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold flex items-center gap-1"
              title="Return to Dashboard (game stays running in background)"
            >
              <span>Dashboard</span>
            </Link>
            <button
              onClick={() => requestEndGame(false)}
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition text-xs font-bold flex items-center gap-1"
              title="End Game Session"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Game</span>
            </button>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 sm:px-4 py-2 rounded-xl text-white font-bold text-xs sm:text-sm">
              <Users className="w-4 h-4 text-amber-400" />
              <span>
                {answeredCount} / {participants.length}
              </span>
            </div>

            <button
              onClick={() => handleAction("END_QUESTION")}
              disabled={loadingAction}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <SkipForward className="w-4 h-4" /> Skip / Close
            </button>
          </div>
        </div>

        {/* Center: Big Question Text + Modern HUD Countdown Timer */}
        <div className="py-8 space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-indigo-500/40 bg-indigo-500/10 text-indigo-300 font-mono font-black text-3xl shadow-lg shadow-indigo-500/10 animate-pulse">
            {secondsRemaining !== null ? secondsRemaining : totalTime}
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white max-w-4xl mx-auto leading-relaxed">
            {currentQuestion.questionText}
          </h2>

          {/* Animated Countdown Progress Bar */}
          <div className="max-w-2xl mx-auto h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-indigo-500 via-teal-500 to-purple-500 transition-all duration-500 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Bottom: Modern Option Cards (Option A, B, C, D - Non-Kahoot Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentQuestion.choices.map((choice, cIdx) => {
            const pal = ARENA_PALETTE[cIdx % 4];
            return (
              <div
                key={choice.id || cIdx}
                className={`p-5 sm:p-6 rounded-2xl ${pal.bg} text-white flex items-center gap-4 shadow-xl select-none`}
              >
                <span className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-black shrink-0 text-white shadow-inner">
                  {pal.symbol}
                </span>
                <span className="text-lg sm:text-xl font-bold flex-1 leading-snug">
                  {choice.choiceText}
                </span>
              </div>
            );
          })}
        </div>

        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. QUESTION RESULT VIEW (Answer Distribution Bar Chart)
  // ─────────────────────────────────────────────────────────────
  if (status === "QUESTION_RESULT" && currentQuestion) {
    const totalResponses = answeredCount || 1;

    return (
      <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 bg-[#0D0F17] rounded-3xl border border-white/10 shadow-2xl">
        {/* Top Row */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Results & Feedback
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">{currentQuestion.questionText}</h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href={`/${instituteCode}/arena`}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold flex items-center gap-1"
              title="Return to Dashboard (game stays running in background)"
            >
              <span>Dashboard</span>
            </Link>
            <button
              onClick={() => requestEndGame(false)}
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition text-xs font-bold flex items-center gap-1"
              title="End Game Session"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Game</span>
            </button>
            <button
              onClick={() => handleAction("SHOW_LEADERBOARD")}
              disabled={loadingAction}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition"
              title="View current leaderboard standings"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => handleAction(currentQuestionIndex >= totalQuestions - 1 ? "FINISH_GAME" : "NEXT_QUESTION")}
              disabled={loadingAction}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              title="Advance to next question"
            >
              {loadingAction ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>{currentQuestionIndex >= totalQuestions - 1 ? "Finish & Podium" : "Proceed to Next Question"}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center: Live Answer Distribution Bars */}
        <div className="py-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto w-full items-end min-h-75">
          {currentQuestion.choices.map((choice, cIdx) => {
            const pal = ARENA_PALETTE[cIdx % 4];
            const count = distribution[choice.id] || 0;
            const percent = Math.round((count / totalResponses) * 100);
            const isCorrect = choice.isCorrect;

            return (
              <div key={choice.id || cIdx} className="flex flex-col items-center gap-3">
                <span className="text-lg font-black text-white">{count}</span>

                {/* Animated bar column */}
                <div className="w-full bg-white/5 rounded-2xl h-52 flex flex-col justify-end p-2 relative overflow-hidden border border-white/5">
                  <div
                    className={`w-full rounded-xl transition-all duration-700 ease-out flex items-center justify-center font-black text-xs text-white ${pal.barColor}`}
                    style={{ height: `${Math.max(14, percent)}%` }}
                  >
                    {percent > 0 && `${percent}%`}
                  </div>
                </div>

                {/* Pad Info */}
                <div
                  className={`w-full p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                    isCorrect
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black text-white shrink-0">
                    {pal.symbol}
                  </span>
                  <span className="truncate">{choice.choiceText}</span>
                  {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanation Card */}
        {currentQuestion.explanation && (
          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm font-semibold max-w-4xl mx-auto w-full mb-3">
            <span className="font-black uppercase tracking-wider block mb-0.5 text-emerald-400">
              Explanation
            </span>
            {currentQuestion.explanation}
          </div>
        )}

        {/* Student Response Breakdown (Who answered correctly) */}
        {answerBreakdown.length > 0 && (
          <div className="p-4 rounded-2xl border border-white/10 bg-white/5 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                Student Submissions ({answerBreakdown.filter((a) => a.isCorrect).length} Correct / {answerBreakdown.length} Total)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-3">
              {answerBreakdown.map((a) => (
                <div
                  key={a.participantId}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${
                    a.isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/20 bg-rose-500/5 text-slate-400"
                  }`}
                >
                  <span className="truncate">{a.nickname}</span>
                  {a.isCorrect ? (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                      +{a.pointsEarned}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-400/70 bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">
                      0 pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LEADERBOARD VIEW (Rankings & Streaks)
  // ─────────────────────────────────────────────────────────────
  if (status === "LEADERBOARD") {
    const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

    return (
      <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 bg-[#0D0F17] rounded-3xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-black text-white">Scoreboard Rankings</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href={`/${instituteCode}/arena`}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-xs font-bold flex items-center gap-1"
              title="Return to Dashboard (game stays running in background)"
            >
              <span>Dashboard</span>
            </Link>
            <button
              onClick={() => requestEndGame(false)}
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition text-xs font-bold flex items-center gap-1"
              title="End Game Session"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Game</span>
            </button>
            <button
              onClick={() => handleAction(isLastQuestion ? "FINISH_GAME" : "NEXT_QUESTION")}
              disabled={loadingAction}
              className="px-6 py-3 rounded-2xl bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20"
            >
              <span>{isLastQuestion ? "Final Podium" : "Next Question"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Players List */}
        <div className="py-6 max-w-2xl mx-auto w-full space-y-3">
          {participants.slice(0, 5).map((p, idx) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-300 transform shadow-md ${
                idx === 0
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30"
                  : idx === 1
                  ? "border-slate-300/40 bg-slate-300/5"
                  : idx === 2
                  ? "border-amber-700/40 bg-amber-700/5"
                  : "border-white/5 bg-white/2"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                    idx === 0
                      ? "bg-amber-500 text-slate-950"
                      : idx === 1
                      ? "bg-slate-300 text-slate-950"
                      : idx === 2
                      ? "bg-amber-700 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  #{idx + 1}
                </span>

                <div>
                  <p className="font-extrabold text-base text-white">{p.nickname}</p>
                  {p.currentStreak >= 2 && (
                    <span className="text-[11px] font-bold text-orange-400 inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current" /> {p.currentStreak} Answer Streak!
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-amber-400 font-mono">
                  {p.score.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">pts</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-slate-500 font-bold">
          Question {currentQuestionIndex + 1} of {totalQuestions} completed
        </div>

        {renderConfirmModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. FINISHED VIEW (Podium Celebration & Report Link)
  // ─────────────────────────────────────────────────────────────
  if (status === "FINISHED") {
    const top1 = participants[0];
    const top2 = participants[1];
    const top3 = participants[2];

    return (
      <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 bg-linear-to-b from-[#1B1429] via-[#0E101A] to-[#0A0C13] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-150 h-100 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 pt-4">
          <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Grand Finale
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 drop-shadow-md">
            Podium of Champions
          </h2>
        </div>

        {/* 3-Step Podium Pedestals */}
        <div className="relative z-10 py-8 flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto w-full">
          {/* 2nd Place */}
          {top2 && (
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-slate-300 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg border-2 border-white">
                2
              </div>
              <p className="font-extrabold text-sm text-white truncate max-w-30">
                {top2.nickname}
              </p>
              <p className="text-xs text-slate-300 font-mono font-bold">{top2.score} pts</p>
              <div className="w-full h-36 bg-linear-to-t from-slate-400/20 to-slate-400/40 rounded-t-2xl border-t-4 border-slate-300 flex items-center justify-center font-black text-2xl text-slate-300">
                2nd
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top1 && (
            <div className="flex-1 flex flex-col items-center gap-2">
              <Sparkles className="w-8 h-8 text-amber-400 animate-bounce" />
              <div className="w-16 h-16 rounded-full bg-linear-to-tr from-amber-400 to-amber-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl border-4 border-amber-200">
                👑
              </div>
              <p className="font-black text-base text-amber-300 truncate max-w-37.5">
                {top1.nickname}
              </p>
              <p className="text-sm text-amber-400 font-mono font-black">{top1.score} pts</p>
              <div className="w-full h-52 bg-linear-to-t from-amber-500/20 to-amber-500/40 rounded-t-2xl border-t-4 border-amber-400 flex items-center justify-center font-black text-4xl text-amber-400 shadow-2xl">
                1st
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3 && (
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-amber-800 text-white font-black text-lg flex items-center justify-center shadow-lg border-2 border-amber-600">
                3
              </div>
              <p className="font-extrabold text-sm text-white truncate max-w-30">
                {top3.nickname}
              </p>
              <p className="text-xs text-amber-300 font-mono font-bold">{top3.score} pts</p>
              <div className="w-full h-24 bg-linear-to-t from-amber-800/20 to-amber-800/40 rounded-t-2xl border-t-4 border-amber-700 flex items-center justify-center font-black text-2xl text-amber-600">
                3rd
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/10">
          <Link
            href={`/${instituteCode}/arena`}
            className="px-6 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition"
          >
            Back to Arena Hub
          </Link>

          <Link
            href={`/${instituteCode}/arena/reports/${sessionId}`}
            className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 transition shadow-xl shadow-amber-500/25"
          >
            <BarChart3 className="w-4 h-4" />
            <span>View Performance Report & Sync Grades</span>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
