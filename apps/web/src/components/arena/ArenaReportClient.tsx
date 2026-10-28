"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Download,
  BookOpen,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Award,
  Sparkles,
  BarChart2,
} from "lucide-react";
import { ARENA_PALETTE } from "@/types/arena";
import ArenaConfirmModal from "./ArenaConfirmModal";

interface ChoiceStat {
  choiceId: string;
  choiceText: string;
  isCorrect: boolean;
  colorIndex: number;
  count: number;
  percentage: number;
}

interface QuestionReport {
  questionId: string;
  questionText: string;
  questionType: string;
  orderIndex: number;
  totalAnswered: number;
  totalCorrect: number;
  successRate: number;
  avgTimeSec: string;
  choices: ChoiceStat[];
}

interface StudentReport {
  participantId: string;
  studentId: string;
  name: string;
  nickname: string;
  email: string;
  studentNumber?: string | null;
  rank: number;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  avgResponseTimeSec: string;
  integrityFlags: number;
}

interface ArenaReportClientProps {
  sessionId: string;
  instituteCode: string;
  reportData: {
    session: {
      id: string;
      pin: string;
      quizTitle: string;
      quizDescription?: string | null;
      course?: { id: string; title: string; code: string } | null;
      startedAt?: string | null;
      endedAt?: string | null;
      scoringMethod: string;
      enableIntegrityMonitoring: boolean;
    };
    stats: {
      totalStudents: number;
      totalQuestions: number;
      classAvgScore: number;
      classAvgAccuracy: number;
    };
    students: StudentReport[];
    questions: QuestionReport[];
    isHost: boolean;
  };
}

export default function ArenaReportClient({
  sessionId,
  instituteCode,
  reportData,
}: ArenaReportClientProps) {
  const { session, stats, students, questions, isHost } = reportData;

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // In-App Confirmation Modal State (replaces ugly browser confirm() / alert())
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

  const handleSyncGradebook = () => {
    if (!session.course) {
      setConfirmDialog({
        open: true,
        title: "No Course Attached",
        description: "This quiz session is not attached to an active course. Scores cannot be synchronized to a course gradebook.",
        confirmLabel: "Understood",
        variant: "info",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, open: false })),
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Sync Scores to Gradebook?",
      description: `Transfer scores for ${students.length} students directly into the course gradebook for ${session.course.code}?`,
      itemName: `${session.course.code} • ${session.course.title}`,
      confirmLabel: "Sync Gradebook",
      variant: "info",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setSyncing(true);
        setSyncMessage(null);

        try {
          const res = await fetch(`/api/arena/sessions/${sessionId}/report`, {
            method: "POST",
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Gradebook sync failed.");
          }
          setSyncMessage(data.message || "Scores successfully synchronized to course gradebook!");
        } catch (err) {
          setSyncMessage(err instanceof Error ? err.message : "Sync failed.");
        } finally {
          setSyncing(false);
        }
      },
    });
  };

  const handleExportCsv = () => {
    const headers = ["Rank", "Student Name", "Nickname", "Email", "Total Score", "Correct", "Incorrect", "Accuracy (%)", "Avg Time (s)"];
    const rows = students.map((s) => [
      s.rank,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.nickname.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      s.totalScore,
      s.correctCount,
      s.incorrectCount,
      `${s.accuracy}%`,
      s.avgResponseTimeSec,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Arena_Report_${session.pin}_${session.quizTitle.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/${instituteCode}/arena`}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                Arena Session Report
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                PIN: {session.pin}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {session.quizTitle}
            </h1>
            {session.course && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Course: {session.course.code} - {session.course.title}
              </p>
            )}
          </div>
        </div>

        {isHost && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleSyncGradebook}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <BookOpen className="w-4 h-4" />
              <span>{syncing ? "Syncing..." : "Sync to LMS Gradebook"}</span>
            </button>
          </div>
        )}
      </div>

      {syncMessage && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Participants</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalStudents}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Students completed</span>
        </div>

        <div className="bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Class Avg Score</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500 font-mono mt-2">
            {stats.classAvgScore.toLocaleString()}
          </p>
          <span className="text-xs text-slate-400 mt-1 block font-mono">pts per student</span>
        </div>

        <div className="bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Overall Accuracy</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-500 mt-2">
            {stats.classAvgAccuracy}%
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Correct response rate</span>
        </div>

        <div className="bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Questions</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalQuestions}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Assessed items</span>
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Participant Rankings & Results</span>
          </h2>
          <span className="text-xs text-slate-400 font-bold">{students.length} Total Players</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 uppercase font-black tracking-wider text-[11px]">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Player / Student</th>
                <th className="py-3 px-3 text-right">Score</th>
                <th className="py-3 px-3 text-center">Correct / Total</th>
                <th className="py-3 px-3 text-center">Accuracy</th>
                <th className="py-3 px-3 text-center">Avg Response</th>
                {false && session.enableIntegrityMonitoring && (
                  <th className="py-3 px-3 text-center">Integrity</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {students.map((s) => (
                <tr key={s.participantId} className="hover:bg-slate-50 dark:hover:bg-white/2">
                  <td className="py-3.5 px-3">
                    <span
                      className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-black text-xs ${
                        s.rank === 1
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : s.rank === 2
                          ? "bg-slate-300 text-slate-950"
                          : s.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {s.rank}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {s.nickname}
                    </p>
                    <p className="text-slate-400 text-[11px] font-semibold">{s.name}</p>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-sm text-amber-500">
                    {s.totalScore.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-500 font-extrabold">{s.correctCount}</span> /{" "}
                    {stats.totalQuestions}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                        s.accuracy >= 80
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : s.accuracy >= 50
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      }`}
                    >
                      {s.accuracy}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                    {s.avgResponseTimeSec}s
                  </td>
                  {false && session.enableIntegrityMonitoring && (
                    <td className="py-3.5 px-3 text-center">
                      {s.integrityFlags === 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Clean
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {s.integrityFlags} Flag{s.integrityFlags > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Breakdown Section */}
      <div className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-500" />
          <span>Question-by-Question Analysis</span>
        </h2>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expandedQuestion === q.questionId;
            return (
              <div
                key={q.questionId}
                className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden"
              >
                <div
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.questionId)}
                  className="p-4 bg-slate-50/50 dark:bg-white/2 hover:bg-slate-100 dark:hover:bg-white/4 cursor-pointer flex items-center justify-between gap-4 transition select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {q.questionText}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-black ${
                        q.successRate >= 70
                          ? "bg-emerald-500/10 text-emerald-500"
                          : q.successRate >= 40
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {q.successRate}% Success
                    </span>

                    <span className="text-xs text-slate-400 font-mono font-bold hidden sm:inline">
                      avg {q.avgTimeSec}s
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#181B26] space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.choices.map((c, cIdx) => {
                        const pal = ARENA_PALETTE[cIdx % 4];
                        return (
                          <div
                            key={c.choiceId}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                              c.isCorrect
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                : "border-slate-200 dark:border-white/10 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-5 h-5 rounded-md ${pal.bg} text-white flex items-center justify-center text-[10px]`}>
                                {pal.symbol}
                              </span>
                              <span className="truncate">{c.choiceText}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-slate-400">
                                {c.count} ({c.percentage}%)
                              </span>
                              {c.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessible In-App Confirmation Modal */}
      <ArenaConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant}
        itemName={confirmDialog.itemName}
        isBusy={syncing}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
