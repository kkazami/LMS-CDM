"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Plus,
  Play,
  Edit3,
  Trash2,
  Trophy,
  Users,
  Clock,
  Shield,
  Eye,
  BarChart3,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import ArenaQuizPreviewModal from "@/components/arena/ArenaQuizPreviewModal";
import ArenaConfirmModal from "@/components/arena/ArenaConfirmModal";
import type { ArenaQuizDetail } from "@/types/arena";

interface ArenaHubClientProps {
  instituteCode: string;
  isInstructor: boolean;
  quizzes: ArenaQuizDetail[];
  recentSessions: Array<{
    id: string;
    pin: string;
    status: string;
    createdAt: string;
    quiz: { title: string };
    _count: { participants: number };
  }>;
  studentPastGames?: Array<{
    id: string;
    score: number;
    rank: number;
    session: {
      id: string;
      pin: string;
      status?: string;
      quiz: { title: string };
      createdAt: string;
    };
  }>;
  activeSession?: {
    id: string;
    pin: string;
    status: string;
    createdAt: string;
    quiz: { title: string };
    _count: { participants: number };
  } | null;
}

export default function ArenaHubClient({
  instituteCode,
  isInstructor,
  quizzes: initialQuizzes,
  recentSessions,
  studentPastGames = [],
  activeSession,
}: ArenaHubClientProps) {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<ArenaQuizDetail[]>(initialQuizzes);
  const [sessionsList, setSessionsList] = useState(recentSessions);
  const [pastGamesList, setPastGamesList] = useState(studentPastGames);
  const [currentActiveSession, setCurrentActiveSession] = useState(activeSession);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const [pinInput, setPinInput] = useState("");
  const [joiningPin, setJoiningPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [previewQuiz, setPreviewQuiz] = useState<ArenaQuizDetail | null>(null);
  const [hostingQuizId, setHostingQuizId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"QUIZZES" | "REPORTS" | "PAST_GAMES">("QUIZZES");

  // In-App Confirmation Modal State (replaces ugly browser confirm() popups)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    itemName?: string;
    isBusy?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const requestEndSession = (sessionId: string, quizTitle?: string) => {
    setConfirmDialog({
      open: true,
      title: "End Live Session?",
      description: "Are you sure you want to end this live session now? All connected students will immediately see their final score and leaderboard podium.",
      itemName: quizTitle,
      confirmLabel: "End Live Session",
      variant: "warning",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isBusy: true }));
        setEndingSessionId(sessionId);
        try {
          const res = await fetch(`/api/arena/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "FINISH_GAME" }),
          });
          if (res.ok) {
            setCurrentActiveSession(null);
            setSessionsList((prev) =>
              prev.map((s) => (s.id === sessionId ? { ...s, status: "FINISHED" } : s))
            );
            router.refresh();
          }
        } catch (err) {
          console.error("End session error:", err);
        } finally {
          setEndingSessionId(null);
          setConfirmDialog((prev) => ({ ...prev, open: false, isBusy: false }));
        }
      },
    });
  };

  const requestDeleteSession = (sessionId: string, isInstructorMode: boolean, quizTitle?: string) => {
    setConfirmDialog({
      open: true,
      title: isInstructorMode ? "Delete Game Session?" : "Remove Game Record?",
      description: isInstructorMode
        ? "Are you sure you want to permanently delete this game session and all associated student reports? This action cannot be undone."
        : "Are you sure you want to remove this match from your recent history?",
      itemName: quizTitle,
      confirmLabel: isInstructorMode ? "Delete Session" : "Remove Record",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isBusy: true }));
        setDeletingSessionId(sessionId);
        try {
          const res = await fetch(`/api/arena/sessions/${sessionId}`, { method: "DELETE" });
          if (res.ok) {
            if (isInstructorMode) {
              setSessionsList((prev) => prev.filter((s) => s.id !== sessionId));
            } else {
              setPastGamesList((prev) => prev.filter((g) => g.session.id !== sessionId));
            }
            if (currentActiveSession?.id === sessionId) {
              setCurrentActiveSession(null);
            }
            router.refresh();
          }
        } catch (err) {
          console.error("Delete session error:", err);
        } finally {
          setDeletingSessionId(null);
          setConfirmDialog((prev) => ({ ...prev, open: false, isBusy: false }));
        }
      },
    });
  };

  const requestDismissActiveGame = (sessionId: string, quizTitle?: string) => {
    setConfirmDialog({
      open: true,
      title: "Leave Active Game?",
      description: "Are you sure you want to leave / dismiss this live game? Your current score will remain recorded.",
      itemName: quizTitle,
      confirmLabel: "Leave Game",
      variant: "warning",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isBusy: true }));
        setDeletingSessionId(sessionId);
        try {
          const res = await fetch(`/api/arena/sessions/${sessionId}`, { method: "DELETE" });
          if (res.ok) {
            setCurrentActiveSession(null);
            setPastGamesList((prev) => prev.filter((g) => g.session.id !== sessionId));
            router.refresh();
          }
        } catch (err) {
          console.error("Dismiss game error:", err);
        } finally {
          setDeletingSessionId(null);
          setConfirmDialog((prev) => ({ ...prev, open: false, isBusy: false }));
        }
      },
    });
  };

  // Quick Join Game by PIN
  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const trimmed = pinInput.trim();
    if (!trimmed) {
      setPinError("Please enter a 6-digit game PIN.");
      return;
    }

    setJoiningPin(true);
    try {
      const res = await fetch(`/api/arena/sessions/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to join game.");
      }
      router.push(`/${instituteCode}/arena/play/${data.sessionId}`);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Game not found.");
    } finally {
      setJoiningPin(false);
    }
  };

  // Host Live Game
  const handleHostLive = async (quizId: string) => {
    if (currentActiveSession) {
      setConfirmDialog({
        open: true,
        title: "Active Game Already in Progress",
        description: `You already have an active live session for "${currentActiveSession.quiz.title}" (PIN: ${currentActiveSession.pin}). Click Resume to return to your running match.`,
        itemName: `${currentActiveSession.quiz.title} • PIN: ${currentActiveSession.pin}`,
        confirmLabel: "Resume Active Match",
        cancelLabel: "Stay on Dashboard",
        variant: "info",
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          router.push(`/${instituteCode}/arena/host/${currentActiveSession.id}`);
        },
      });
      return;
    }

    setHostingQuizId(quizId);
    try {
      const res = await fetch(`/api/arena/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, mode: "LIVE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not start session.");
      }
      router.push(`/${instituteCode}/arena/host/${data.sessionId}`);
    } catch (err) {
      setConfirmDialog({
        open: true,
        title: "Failed to Host Game",
        description: err instanceof Error ? err.message : "Failed to host game.",
        confirmLabel: "Understood",
        variant: "warning",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, open: false })),
      });
    } finally {
      setHostingQuizId(null);
    }
  };

  // Delete Quiz with In-App Confirmation Modal
  const requestDeleteQuiz = (quiz: ArenaQuizDetail) => {
    setConfirmDialog({
      open: true,
      title: "Delete Quiz?",
      description: "Are you sure you want to delete this quiz? All associated questions will be permanently removed.",
      itemName: quiz.title,
      confirmLabel: "Delete Quiz",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isBusy: true }));
        try {
          const res = await fetch(`/api/arena/quizzes/${quiz.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
          }
        } catch (err) {
          console.error("Delete error:", err);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false, isBusy: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Active Live Session Alert Card */}
      {currentActiveSession && (
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-amber-50 via-orange-50 to-purple-50/60 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-purple-600/20 border-2 border-amber-400/90 dark:border-amber-500/60 p-6 sm:p-7 shadow-lg dark:shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">
                  {isInstructor ? "Live Game in Progress (You are the Host)" : "You Are Currently in a Live Game"}
                </span>
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-sm">
                  PIN: {currentActiveSession.pin}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {currentActiveSession.quiz.title}
              </h2>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {isInstructor && (
                  <>
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold">
                      <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      {currentActiveSession._count.participants} Connected Player{currentActiveSession._count.participants !== 1 ? "s" : ""}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-white/10 text-amber-900 dark:text-white border border-amber-300/60 dark:border-white/10 font-mono uppercase text-[11px] font-bold">
                  State: {currentActiveSession.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href={
                  isInstructor
                    ? `/${instituteCode}/arena/host/${currentActiveSession.id}`
                    : `/${instituteCode}/arena/play/${currentActiveSession.id}`
                }
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/25 active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{isInstructor ? "Resume Hosting Game" : "Rejoin Live Game"}</span>
              </Link>
              {isInstructor ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => requestEndSession(currentActiveSession.id, currentActiveSession.quiz.title)}
                    disabled={endingSessionId === currentActiveSession.id}
                    className="px-4 py-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 dark:border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{endingSessionId === currentActiveSession.id ? "Ending..." : "End Session"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteSession(currentActiveSession.id, true, currentActiveSession.quiz.title)}
                    disabled={deletingSessionId === currentActiveSession.id}
                    className="px-4 py-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300/80 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{deletingSessionId === currentActiveSession.id ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => requestDismissActiveGame(currentActiveSession.id, currentActiveSession.quiz.title)}
                  disabled={deletingSessionId === currentActiveSession.id}
                  className="px-4 py-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300/80 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{deletingSessionId === currentActiveSession.id ? "Leaving..." : "Leave / Dismiss Game"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 dark:bg-[#141721] border border-slate-700/60 dark:border-white/10 p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Interactive Assessment Arena
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Interactive Quiz Arena
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Real-time interactive arena for competitive classroom assessments. Host live challenges,
              test knowledge with strategic power-ups, and sync scores directly to LMS gradebooks.
            </p>
          </div>

          {/* Join Form Card (For both Students & Quick Join) */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/15 p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Gamepad2 className="w-5 h-5 text-indigo-400" />
              <span className="font-extrabold text-sm uppercase tracking-wide">
                Join Active Game
              </span>
            </div>

            <form onSubmit={handleQuickJoin} className="space-y-3">
              {!isInstructor && currentActiveSession && (
                <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="block font-bold text-white">Active Session in Progress!</span>
                    <span className="text-[11px] text-indigo-300 font-mono">PIN: {currentActiveSession.pin}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/${instituteCode}/arena/play/${currentActiveSession.id}`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Resume</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => requestDismissActiveGame(currentActiveSession.id, currentActiveSession.quiz.title)}
                      disabled={deletingSessionId === currentActiveSession.id}
                      title="Leave / Dismiss this game"
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition text-xs disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit PIN..."
                className="w-full text-center text-2xl font-mono font-black tracking-widest p-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
              />

              {pinError && (
                <p className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {pinError}
                </p>
              )}

              <button
                type="submit"
                disabled={joiningPin || !pinInput.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {joiningPin ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Enter Live Game</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Instructors */}
      {isInstructor ? (
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("QUIZZES")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "QUIZZES"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              Quiz Library ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveTab("REPORTS")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "REPORTS"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              Game History & Reports ({sessionsList.length})
            </button>
          </div>

          <Link
            href={`/${instituteCode}/arena/create`}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-3" />
            <span>Create New Quiz</span>
          </Link>
        </div>
      ) : (
        <div className="border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>My Past Arena Games</span>
          </h2>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INSTRUCTOR: QUIZ LIBRARY TAB
      ───────────────────────────────────────────────────────────── */}
      {isInstructor && activeTab === "QUIZZES" && (
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl space-y-4">
              <Gamepad2 className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-base">
                  No quizzes in your library yet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Create your first interactive Kahoot-style quiz to host live in class.
                </p>
              </div>
              <Link
                href={`/${instituteCode}/arena/create`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
              >
                <Plus className="w-4 h-4" /> Create Your First Quiz
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          quiz.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}
                      >
                        {quiz.status}
                      </span>

                      {false && quiz.enableIntegrityMonitoring && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                          <Shield className="w-3 h-3" /> Integrity
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white group-hover:text-amber-500 transition line-clamp-1">
                        {quiz.title}
                      </h3>
                      {quiz.course && (
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                          {quiz.course.code} - {quiz.course.title}
                        </p>
                      )}
                      {quiz.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3.5 h-3.5 text-amber-500" />
                        {quiz.questions?.length || quiz._count?.questions || 0} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {quiz.defaultTimeLimitSeconds}s / Q
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                    {currentActiveSession && currentActiveSession.quiz.title === quiz.title ? (
                      <Link
                        href={`/${instituteCode}/arena/host/${currentActiveSession.id}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm animate-pulse"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Live ({currentActiveSession.pin})</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleHostLive(quiz.id)}
                        disabled={hostingQuizId === quiz.id}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                      >
                        {hostingQuizId === quiz.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Host Live</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setPreviewQuiz(quiz)}
                      title="Preview Quiz"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/${instituteCode}/arena/${quiz.id}/edit`}
                      title="Edit Quiz"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => requestDeleteQuiz(quiz)}
                      title="Delete Quiz"
                      className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INSTRUCTOR: RECENT REPORTS TAB
      ───────────────────────────────────────────────────────────── */}
      {isInstructor && activeTab === "REPORTS" && (
        <div className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span>Hosted Games & Reports</span>
          </h2>

          {sessionsList.length === 0 ? (
            <p className="text-slate-400 text-xs italic py-4">
              No live games hosted yet. Launch a quiz from the library to see results!
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {sessionsList.map((s) => (
                <div
                  key={s.id}
                  className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/2 px-3 rounded-xl transition flex-wrap"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        PIN: {s.pin}
                      </span>
                      {s.status !== "FINISHED" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 animate-pulse">
                          LIVE NOW
                        </span>
                      )}
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {s.quiz.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-300">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        {s._count.participants} Students
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.status !== "FINISHED" ? (
                      <>
                        <Link
                          href={`/${instituteCode}/arena/host/${s.id}`}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume Host</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => requestEndSession(s.id, `${s.quiz.title} (PIN: ${s.pin})`)}
                          disabled={endingSessionId === s.id}
                          className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 font-bold text-xs transition"
                        >
                          End
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/${instituteCode}/arena/reports/${s.id}`}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1 transition"
                      >
                        <span>View Analytics</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => requestDeleteSession(s.id, true, `${s.quiz.title} (PIN: ${s.pin})`)}
                      disabled={deletingSessionId === s.id}
                      title="Permanently Delete Game Session"
                      className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      {/* ─────────────────────────────────────────────────────────────
          STUDENT: PAST GAMES LIST
      ───────────────────────────────────────────────────────────── */}
      {!isInstructor && (
        <div className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
          {pastGamesList.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Trophy className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                No games played yet
              </p>
              <p className="text-xs text-slate-400">
                Enter your instructor&apos;s 6-digit game PIN in the top card to join your first live quiz arena!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {pastGamesList.map((g) => (
                <div
                  key={g.id}
                  className="py-4 flex items-center justify-between gap-4 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/2 transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        g.rank === 1
                          ? "bg-amber-500 text-slate-950"
                          : g.rank === 2
                          ? "bg-slate-300 text-slate-950"
                          : g.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white"
                      }`}
                    >
                      #{g.rank}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          PIN: {g.session.pin}
                        </span>
                        {g.session.status && g.session.status !== "FINISHED" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 animate-pulse">
                            LIVE NOW
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {g.session.quiz.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {new Date(g.session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {g.session.status && g.session.status !== "FINISHED" ? (
                      <Link
                        href={`/${instituteCode}/arena/play/${g.session.id}`}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow active:scale-95 animate-pulse"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Resume / Rejoin</span>
                      </Link>
                    ) : (
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-500 font-mono">
                          {g.score.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">pts</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Preview Modal */}
      {previewQuiz && (
        <ArenaQuizPreviewModal
          title={previewQuiz.title}
          questions={previewQuiz.questions || []}
          onClose={() => setPreviewQuiz(null)}
        />
      )}

      {/* Accessible In-App Confirmation Modal */}
      <ArenaConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant}
        itemName={confirmDialog.itemName}
        isBusy={confirmDialog.isBusy}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => {
          if (!confirmDialog.isBusy) {
            setConfirmDialog((prev) => ({ ...prev, open: false }));
          }
        }}
      />
    </div>
  );
}
