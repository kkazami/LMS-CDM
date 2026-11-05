"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  UserCheck,
  Award,
  Sparkles,
  Search,
  Bookmark,
  BookmarkCheck,
  Play,
  RotateCcw,
  ArrowRight,
  Clock,
  History,
  FileQuestion,
  Lightbulb,
  Shuffle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type {
  InterviewQuestionItem,
  RecruiterScenarioItem,
  ApplicantSelfAssessmentChecklist,
  AnswerClassification,
} from "@/lib/mock-interview/types";
import { INTERVIEW_CATEGORIES } from "@/lib/mock-interview/types";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  AI_DAILY_LIMIT,
  AI_PROGRESS_THRESHOLD,
  checklistFromEvaluation,
  type MockInterviewAiEvaluation,
} from "@/lib/mock-interview/ai-types";
import {
  PREDEFINED_QUESTIONS,
  PREDEFINED_SCENARIOS,
  PREDEFINED_QUIZ_QUESTIONS,
} from "@/lib/mock-interview/content-bank";

import QuestionDetailModal from "./QuestionDetailModal";
import ApplicantModeModal from "./ApplicantModeModal";
import RecruiterModeModal from "./RecruiterModeModal";
import QuickQuizModal from "./QuickQuizModal";
import AttemptReviewModal, { type StoredAttemptItem } from "./AttemptReviewModal";

interface MockInterviewHubClientProps {
  instituteCode: string;
  studentName: string;
  studentId: string;
  theme: InstituteTheme;
  initialAttempts?: StoredAttemptItem[];
  initialSavedQuestionIds?: string[];
  /** True when AI evaluation is switched on and a provider is configured (server-decided). */
  aiEvaluationEnabled?: boolean;
  /** Remaining AI evaluations for today (Manila calendar day). */
  initialRemainingAiToday?: number;
}

type TabKey = "PRACTICE" | "QUESTION_BANK" | "HISTORY";

function aiScoreBadgeTone(score: number): string {
  if (score >= 70) {
    return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
  }
  if (score >= AI_PROGRESS_THRESHOLD) {
    return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50";
  }
  return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
}

export default function MockInterviewHubClient({
  studentName,
  theme,
  initialAttempts = [],
  initialSavedQuestionIds = [],
  aiEvaluationEnabled = false,
  initialRemainingAiToday = AI_DAILY_LIMIT,
}: MockInterviewHubClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("PRACTICE");
  const [remainingAiToday, setRemainingAiToday] = useState<number>(initialRemainingAiToday);

  // Question Bank & Answer Guide filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [savedOnlyFilter, setSavedOnlyFilter] = useState<boolean>(false);
  const [showAllAnswerGuides, setShowAllAnswerGuides] = useState<boolean>(false);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<string[]>([]);

  // History filter
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "APPLICANT" | "RECRUITER" | "QUIZ">("ALL");

  // Persistent State (Database-backed with immediate state updates)
  const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>(initialSavedQuestionIds);
  const [attempts, setAttempts] = useState<StoredAttemptItem[]>(initialAttempts);

  // Active Modals State
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] =
    useState<InterviewQuestionItem | null>(null);
  const [applicantQuestion, setApplicantQuestion] =
    useState<InterviewQuestionItem | null>(null);
  const [recruiterScenario, setRecruiterScenario] =
    useState<RecruiterScenarioItem | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [selectedAttemptForReview, setSelectedAttemptForReview] =
    useState<StoredAttemptItem | null>(null);

  const toggleExpandQuestionGuide = (questionId: string) => {
    setExpandedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const openFull36AnswerGuide = (startCategory?: string) => {
    const firstQuestion =
      startCategory && startCategory !== "ALL"
        ? PREDEFINED_QUESTIONS.find((q) => q.category === startCategory) ?? PREDEFINED_QUESTIONS[0]
        : PREDEFINED_QUESTIONS[0];
    if (firstQuestion) {
      setSelectedQuestionForDetail(firstQuestion);
    }
  };

  const handleStartRandomApplicantPractice = (category?: string) => {
    const pool =
      category && category !== "ALL"
        ? PREDEFINED_QUESTIONS.filter((q) => q.category === category)
        : PREDEFINED_QUESTIONS;

    if (pool.length === 0) return;

    const candidates =
      pool.length > 1 && applicantQuestion
        ? pool.filter((q) => q.id !== applicantQuestion.id)
        : pool;

    const randomIndex = Math.floor(Math.random() * candidates.length);
    setApplicantQuestion(candidates[randomIndex]);
  };

  const handleStartRandomRecruiterScenario = (category?: string) => {
    const pool =
      category && category !== "ALL"
        ? PREDEFINED_SCENARIOS.filter((s) => s.category === category)
        : PREDEFINED_SCENARIOS;

    const targetPool = pool.length > 0 ? pool : PREDEFINED_SCENARIOS;
    if (targetPool.length === 0) return;

    const candidates =
      targetPool.length > 1 && recruiterScenario
        ? targetPool.filter((s) => s.id !== recruiterScenario.id)
        : targetPool;

    const randomIndex = Math.floor(Math.random() * candidates.length);
    setRecruiterScenario(candidates[randomIndex]);
  };

  // Filtered Questions for Question Bank
  const filteredQuestions = useMemo(() => {
    return PREDEFINED_QUESTIONS.filter((q) => {
      if (savedOnlyFilter && !savedQuestionIds.includes(q.id)) return false;

      const matchSearch =
        searchQuery.trim() === "" ||
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.jobPosition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.competency.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategory === "ALL" || q.category === selectedCategory;
      const matchDiff =
        selectedDifficulty === "ALL" || q.difficulty === selectedDifficulty;

      return matchSearch && matchCat && matchDiff;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty, savedOnlyFilter, savedQuestionIds]);

  // Handlers for Save / Bookmark
  const handleToggleSave = async (questionId: string) => {
    const isCurrentlySaved = savedQuestionIds.includes(questionId);
    const newSaved = isCurrentlySaved
      ? savedQuestionIds.filter((id) => id !== questionId)
      : [...savedQuestionIds, questionId];

    setSavedQuestionIds(newSaved);

    try {
      await fetch("/api/mock-interview/saved", {
        method: isCurrentlySaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
    } catch {
      // Retain optimistic UI state
    }
  };

  // Handlers for Applicant Mode Save
  const handleSaveApplicantAttempt = async (data: {
    questionId: string;
    writtenAnswer: string;
    checklist: ApplicantSelfAssessmentChecklist;
    notes?: string;
    attemptId?: string;
    aiEvaluation?: MockInterviewAiEvaluation | null;
  }) => {
    const q = PREDEFINED_QUESTIONS.find((item) => item.id === data.questionId);
    const tempId = `app-${Date.now()}`;
    const newAttempt: StoredAttemptItem = {
      id: tempId,
      type: "APPLICANT",
      title: q ? q.questionText : "Applicant Practice",
      date: new Date().toISOString(),
      details: {
        writtenAnswer: data.writtenAnswer,
        checklist: data.checklist,
        notes: data.notes,
        questionId: data.questionId,
        aiEvaluation: data.aiEvaluation ?? null,
      },
    };

    setAttempts((prev) => [newAttempt, ...prev.filter((a) => !data.attemptId || a.id !== data.attemptId)]);

    try {
      const res = await fetch("/api/mock-interview/applicant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ...data, aiEvaluation: undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.attemptId) {
          setAttempts((prev) =>
            prev.map((a) => (a.id === tempId ? { ...a, id: json.attemptId } : a))
          );
        }
      }
    } catch {
      // Retain optimistic UI state
    }
  };

  // Mirror server-saved AI evaluation immediately in local state
  const handleApplicantEvaluated = (data: {
    attemptId: string;
    questionId: string;
    writtenAnswer: string;
    evaluation: MockInterviewAiEvaluation | null;
  }) => {
    const q = PREDEFINED_QUESTIONS.find((item) => item.id === data.questionId);
    const evaluated: StoredAttemptItem = {
      id: data.attemptId,
      type: "APPLICANT",
      title: q ? q.questionText : "Applicant Practice",
      date: new Date().toISOString(),
      details: {
        writtenAnswer: data.writtenAnswer,
        checklist: data.evaluation ? checklistFromEvaluation(data.evaluation) : {},
        notes: "",
        questionId: data.questionId,
        aiEvaluation: data.evaluation,
      },
    };
    setAttempts((prev) => [evaluated, ...prev.filter((a) => a.id !== data.attemptId)]);
  };

  // Handlers for Recruiter Mode Submit
  const handleSubmitRecruiterAttempt = async (data: {
    scenarioId: string;
    selectedQuestionId: string;
    classifiedAnswer: AnswerClassification;
    selectedFollowUpId?: string;
  }) => {
    const scen = PREDEFINED_SCENARIOS.find((s) => s.id === data.scenarioId);
    if (!scen) {
      throw new Error("Scenario not found");
    }

    const qObj = scen.questionOptions.find((q) => q.id === data.selectedQuestionId);
    const ansObj = scen.applicantAnswers[data.selectedQuestionId];
    const fuObj = scen.followUpOptions?.find((f) => f.id === data.selectedFollowUpId);

    const isQuestionCorrect = Boolean(qObj?.isBest);
    const isClassificationCorrect = ansObj?.classification === data.classifiedAnswer;
    const isFollowUpCorrect = fuObj ? Boolean(fuObj.isBest) : true;

    let score = 0;
    const maxScore = 100;
    if (isQuestionCorrect) score += 50;
    if (isClassificationCorrect) score += 50;

    const tempId = `rec-${Date.now()}`;
    const newAttempt: StoredAttemptItem = {
      id: tempId,
      type: "RECRUITER",
      title: `Recruiter: ${scen.title}`,
      date: new Date().toISOString(),
      score,
      maxScore,
      details: {
        scenarioId: data.scenarioId,
        selectedQuestionId: data.selectedQuestionId,
        classifiedAnswer: data.classifiedAnswer,
        isQuestionCorrect,
        isClassificationCorrect,
        isFollowUpCorrect,
      },
    };

    setAttempts((prev) => [newAttempt, ...prev]);

    try {
      const res = await fetch("/api/mock-interview/recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ...data, aiEvaluation: undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.attemptId) {
          setAttempts((prev) =>
            prev.map((a) => (a.id === tempId ? { ...a, id: json.attemptId } : a))
          );
        }
      }
    } catch {
      // Optimistic
    }

    return {
      score,
      maxScore,
      isQuestionCorrect,
      isClassificationCorrect,
      isFollowUpCorrect,
      advice: scen.practicalAdvice,
    };
  };

  // Handlers for Quiz Submit
  const handleSubmitQuiz = async (answers: Record<string, number>) => {
    let correctCount = 0;
    const detailedResults = PREDEFINED_QUIZ_QUESTIONS.map((q) => {
      const selectedChoice = answers[q.id] ?? -1;
      const correctChoice = q.correctAnswer ?? 0;
      const isCorrect = selectedChoice === correctChoice;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedChoice,
        correctChoice,
        isCorrect,
        explanation: q.explanation ?? "",
        choices: q.choices,
      };
    });

    const score = correctCount * 10;
    const maxScore = PREDEFINED_QUIZ_QUESTIONS.length * 10;
    const percentage = (correctCount / PREDEFINED_QUIZ_QUESTIONS.length) * 100;

    const tempId = `quiz-${Date.now()}`;
    const newAttempt: StoredAttemptItem = {
      id: tempId,
      type: "QUIZ",
      title: `Quick Interview Quiz (${correctCount}/${PREDEFINED_QUIZ_QUESTIONS.length})`,
      date: new Date().toISOString(),
      score,
      maxScore,
      details: {
        correctAnswers: correctCount,
        totalQuestions: PREDEFINED_QUIZ_QUESTIONS.length,
        percentage,
        answers,
      },
    };

    setAttempts((prev) => [newAttempt, ...prev]);

    try {
      const res = await fetch("/api/mock-interview/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.attemptId) {
          setAttempts((prev) =>
            prev.map((a) => (a.id === tempId ? { ...a, id: json.attemptId } : a))
          );
        }
      }
    } catch {
      // Optimistic
    }

    return {
      score,
      maxScore,
      percentage,
      correctCount,
      totalQuestions: PREDEFINED_QUIZ_QUESTIONS.length,
      detailedResults,
    };
  };

  // Stats Calculations
  const applicantAttempts = attempts.filter((a) => a.type === "APPLICANT");
  const totalPracticed = applicantAttempts.length;
  const totalRecruiterSessions = attempts.filter((a) => a.type === "RECRUITER").length;
  const quizAttempts = attempts.filter((a) => a.type === "QUIZ");
  const bestQuizScore = quizAttempts.length
    ? Math.max(...quizAttempts.map((q) => q.score || 0))
    : 0;

  const filteredHistory = useMemo(() => {
    if (historyFilter === "ALL") return attempts;
    return attempts.filter((a) => a.type === historyFilter);
  }, [attempts, historyFilter]);

  const renderAttemptRow = (att: StoredAttemptItem) => {
    const aiEval =
      att.type === "APPLICANT" && att.details?.aiEvaluation
        ? (att.details.aiEvaluation as MockInterviewAiEvaluation)
        : null;

    return (
      <button
        key={att.id}
        type="button"
        onClick={() => setSelectedAttemptForReview(att)}
        className="w-full px-4 py-3.5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-white dark:bg-[#141721] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            {att.type === "QUIZ" ? (
              <Award className="w-4 h-4" />
            ) : att.type === "RECRUITER" ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <Briefcase className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 sm:truncate leading-snug">
              {att.title}
            </p>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>
                {att.type === "APPLICANT"
                  ? "Applicant Mode"
                  : att.type === "RECRUITER"
                    ? "Recruiter Simulation"
                    : "Interview Quiz"}
              </span>
              <span>&bull;</span>
              <span>{new Date(att.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="pl-11 sm:pl-0 flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
          <div className="flex sm:hidden items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0 truncate">
            <span className="truncate">
              {att.type === "APPLICANT"
                ? "Applicant Mode"
                : att.type === "RECRUITER"
                  ? "Recruiter Simulation"
                  : "Interview Quiz"}
            </span>
            <span>&bull;</span>
            <span className="shrink-0">{new Date(att.date).toLocaleDateString()}</span>
          </div>

          {aiEval ? (
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold border font-mono whitespace-nowrap shrink-0 ${aiScoreBadgeTone(aiEval.score)}`}
            >
              {aiEval.score}/100 &middot; <span className="font-sans">{aiEval.rating}</span>
            </span>
          ) : att.score !== undefined ? (
            <span className="px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold font-mono whitespace-nowrap shrink-0 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
              {att.score} / {att.maxScore} pts
            </span>
          ) : (
            <span className="text-xs text-slate-400 shrink-0">Reviewed</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Clean Header + Flat Stat Strip (No Gradients) ─── */}
      <div className="rounded-xl bg-white dark:bg-[#141721] border-2 border-slate-200 dark:border-white/15 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Mock Interview Studio
              </h1>
              {aiEvaluationEnabled && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                    remainingAiToday > 0
                      ? "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/15"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800/50"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>
                    {remainingAiToday > 0
                      ? `AI Coach · ${remainingAiToday}/${AI_DAILY_LIMIT} left today`
                      : "0/10 AI evaluations left today · Study Guide active"}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Welcome, <span className="font-semibold text-slate-900 dark:text-white">{studentName}</span>. Practice interview questions with structured AI coaching, study all 36 predefined model answers, evaluate candidate scenarios in Recruiter Mode, and test your interview fundamentals.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openFull36AnswerGuide()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border-2 border-slate-200 dark:border-white/15 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Sample Answer Guide</span>
            </button>
          </div>
        </div>

        {/* Flat 3-Column Stat Strip */}
        <div className="grid grid-cols-3 divide-x-2 divide-slate-200 dark:divide-white/15 border-t-2 border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-[#10131B]">
          <div className="px-3 py-3 sm:px-5 sm:py-3.5">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Answers Practiced
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {totalPracticed}
            </span>
          </div>

          <div className="px-3 py-3 sm:px-5 sm:py-3.5">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Recruiter Runs
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {totalRecruiterSessions}
            </span>
          </div>

          <div className="px-3 py-3 sm:px-5 sm:py-3.5">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Best Quiz Score
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {bestQuizScore} <span className="text-xs font-sans font-normal text-slate-400">pts</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3-Tab Underline Navigation Bar ─── */}
      <div className="flex items-center gap-5 sm:gap-6 border-b-2 border-slate-200 dark:border-white/15 overflow-x-auto no-scrollbar">
        {[
          { key: "PRACTICE" as const, label: "Practice", icon: Briefcase },
          {
            key: "QUESTION_BANK" as const,
            label: `Sample Answer Guide (${PREDEFINED_QUESTIONS.length})`,
            icon: BookOpen,
          },
          { key: "HISTORY" as const, label: `History (${attempts.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer -mb-0.5 ${
                isActive
                  ? "text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              style={isActive ? { borderColor: theme.colors.primary } : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: PRACTICE ─── */}
      {activeTab === "PRACTICE" && (
        <div className="space-y-6">
          {/* Banner when student has 0 AI attempts remaining today */}
          {aiEvaluationEnabled && remainingAiToday <= 0 && (
            <div className="p-4 rounded-xl border-2 border-amber-300 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  Daily AI Evaluation Limit Reached (0 of {AI_DAILY_LIMIT} left today)
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You can still review all 36 questions and study each predefined model answer and coaching tip.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllAnswerGuides(true);
                    setActiveTab("QUESTION_BANK");
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#141721] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  View All 36 Answers Inline
                </button>
                <button
                  type="button"
                  onClick={() => openFull36AnswerGuide()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Sample Answer Guide</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Applicant Card + Secondary Mode Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Primary Card: Applicant Mode with AI Coach */}
            <div className="lg:col-span-7 p-6 rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs bg-white dark:bg-[#141721] flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Primary Mode &middot; Applicant Practice</span>
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {PREDEFINED_QUESTIONS.length} questions across 6 tracks
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Practice Interview Questions with AI Coaching
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Draft your written response to realistic job interview prompts and receive structured coaching, a 3-step answer outline, and scoring across 5 core interview criteria.
                </p>

                <div className="pt-1 flex flex-wrap gap-2">
                  {[
                    "Relevance",
                    "Clarity & Structure",
                    "Completeness",
                    "Practical Evidence",
                    "Communication Tone",
                  ].map((crit) => (
                    <span
                      key={crit}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-[#10131B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                    >
                      {crit}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleStartRandomApplicantPractice()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <span>Start Practice</span>
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Secondary Column: Recruiter Mode & Quick Quiz */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-4">
              {/* Recruiter Simulation */}
              <div className="p-5 rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs bg-white dark:bg-[#141721] flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Hiring Manager Perspective</span>
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {PREDEFINED_SCENARIOS.length} scenarios
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Recruiter Mode Simulation
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Select diagnostic interview questions and evaluate candidate responses in realistic hiring scenarios.
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleStartRandomRecruiterScenario()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <span>Launch Scenario</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Interview Quiz */}
              <div className="p-5 rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs bg-white dark:bg-[#141721] flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Award className="w-3.5 h-3.5" />
                      <span>Knowledge Check</span>
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {PREDEFINED_QUIZ_QUESTIONS.length} questions
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Interview Readiness Quiz
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Test your understanding of STAR behavioral structure, workplace ethics, and interview etiquette.
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsQuizOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <span>Start {PREDEFINED_QUIZ_QUESTIONS.length}-Question Quiz</span>
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Practice Attempts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Attempts
              </h3>
              {attempts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("HISTORY")}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>View all ({attempts.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {attempts.length === 0 ? (
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] space-y-1.5">
                <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Attempts Recorded Yet
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Start an Applicant Mode session, Recruiter simulation, or Quiz above to build your practice history.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs divide-y divide-slate-200 dark:divide-white/10 overflow-hidden">
                {attempts.slice(0, 6).map(renderAttemptRow)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: QUESTION BANK & 36-QUESTION ANSWER GUIDE ─── */}
      {activeTab === "QUESTION_BANK" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Rail: Categories & Saved Filter */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs bg-white dark:bg-[#141721] p-3 space-y-1">
              <span className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 block">
                Career Tracks
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSavedOnlyFilter(false);
                }}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  selectedCategory === "ALL" && !savedOnlyFilter
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <span>All Categories</span>
                <span className="font-mono text-[11px] opacity-80">{PREDEFINED_QUESTIONS.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setSavedOnlyFilter((prev) => !prev)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  savedOnlyFilter
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Questions</span>
                </span>
                <span className="font-mono text-[11px]">{savedQuestionIds.length}</span>
              </button>

              <div className="pt-1 mt-1 border-t border-slate-100 dark:border-white/5 space-y-0.5">
                {INTERVIEW_CATEGORIES.map((cat) => {
                  const count = PREDEFINED_QUESTIONS.filter((q) => q.category === cat.key).length;
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer text-left ${
                        isSelected
                          ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className="truncate pr-2">{cat.label}</span>
                      <span className="font-mono text-[11px] shrink-0">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Content: Search Bar, Answer Guide Toggle, and Question Rows */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-3.5 rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs bg-white dark:bg-[#141721] flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions, roles, or competencies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0E1118] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <ResponsiveSelect<string>
                  ariaLabel="Filter by difficulty level"
                  value={selectedDifficulty}
                  onChange={setSelectedDifficulty}
                  className="w-full sm:w-40"
                  options={[
                    { value: "ALL", label: "All Levels" },
                    { value: "ENTRY", label: "Entry" },
                    { value: "INTERMEDIATE", label: "Intermediate" },
                    { value: "ADVANCED", label: "Advanced" },
                  ]}
                />

                <button
                  type="button"
                  onClick={() => setShowAllAnswerGuides((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    showAllAnswerGuides
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                      : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{showAllAnswerGuides ? "Hide Predefined Answers" : "Show All Predefined Answers"}</span>
                </button>

                {(searchQuery || selectedCategory !== "ALL" || selectedDifficulty !== "ALL" || savedOnlyFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("ALL");
                      setSelectedDifficulty("ALL");
                      setSavedOnlyFilter(false);
                    }}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Reset filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] space-y-2">
                <FileQuestion className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No matching questions
                </p>
                <p className="text-xs text-slate-500">
                  Try clearing your search or switching the category filter on the left.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#141721] overflow-hidden">
                {filteredQuestions.map((q) => {
                  const isSaved = savedQuestionIds.includes(q.id);
                  const qNum = PREDEFINED_QUESTIONS.findIndex((item) => item.id === q.id) + 1;
                  const isGuideExpanded = showAllAnswerGuides || expandedQuestionIds.includes(q.id);

                  return (
                    <div
                      key={q.id}
                      className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              Q{qNum}
                            </span>
                            <span>&bull;</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {q.jobPosition}
                            </span>
                            <span>&bull;</span>
                            <span>{q.difficulty}</span>
                            <span>&bull;</span>
                            <span>{q.competency}</span>
                          </div>

                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                            {q.questionText}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSave(q.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title={isSaved ? "Remove from saved" : "Bookmark question"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpandQuestionGuide(q.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                            title="View predefined model answer & guide"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                            <span>Answer Guide</span>
                            {isGuideExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Inline Expandable Predefined Answer Guide */}
                      {isGuideExpanded && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 space-y-3 animate-in fade-in duration-150">
                          {q.situation && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              <strong className="text-slate-800 dark:text-slate-200">Scenario Context: </strong>
                              {q.situation}
                            </p>
                          )}

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                              Predefined Model Answer (How to Answer)
                            </span>
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                              {q.modelAnswer}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Coach Tip</span>
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {q.interviewTip}
                              </p>
                            </div>

                            {q.evaluationCriteria?.length > 0 && (
                              <div className="space-y-1">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                  Key Points to Include
                                </span>
                                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                                  {q.evaluationCriteria.map((crit, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{crit}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedQuestionForDetail(q)}
                              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                            >
                              Open in Sample Answer Guide &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: HISTORY & REVIEW ─── */}
      {activeTab === "HISTORY" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Select any recorded attempt to inspect your written response, AI coaching breakdown, or simulation results.
            </p>

            <div className="flex w-full sm:w-auto items-center p-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs overflow-x-auto no-scrollbar">
              {[
                { key: "ALL" as const, label: `All (${attempts.length})` },
                { key: "APPLICANT" as const, label: `Applicant (${totalPracticed})` },
                { key: "RECRUITER" as const, label: `Recruiter (${totalRecruiterSessions})` },
                { key: "QUIZ" as const, label: `Quiz (${quizAttempts.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setHistoryFilter(item.key)}
                  className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-md font-semibold whitespace-nowrap text-center transition-colors cursor-pointer ${
                    historyFilter === item.key
                      ? "bg-white dark:bg-[#141721] text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] space-y-1.5">
              <History className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No Matching Attempts
              </p>
              <p className="text-xs text-slate-500">
                Completed exercises will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 shadow-xs divide-y divide-slate-200 dark:divide-white/10 overflow-hidden">
              {filteredHistory.map(renderAttemptRow)}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}
      <QuestionDetailModal
        question={selectedQuestionForDetail}
        allQuestions={PREDEFINED_QUESTIONS}
        onSelectQuestion={(q) => setSelectedQuestionForDetail(q)}
        isOpen={!!selectedQuestionForDetail}
        onClose={() => setSelectedQuestionForDetail(null)}
        isSaved={
          selectedQuestionForDetail
            ? savedQuestionIds.includes(selectedQuestionForDetail.id)
            : false
        }
        onToggleSave={handleToggleSave}
        onStartPractice={(q) => setApplicantQuestion(q)}
        theme={theme}
      />

      <ApplicantModeModal
        question={applicantQuestion}
        isOpen={!!applicantQuestion}
        onClose={() => setApplicantQuestion(null)}
        onSaveAttempt={handleSaveApplicantAttempt}
        aiEvaluationEnabled={aiEvaluationEnabled}
        remainingAiToday={remainingAiToday}
        onRemainingAiChange={setRemainingAiToday}
        onOpenAnswerGuide={(q) => setSelectedQuestionForDetail(q)}
        onEvaluated={handleApplicantEvaluated}
        theme={theme}
        onRandomizeQuestion={() =>
          handleStartRandomApplicantPractice(applicantQuestion?.category)
        }
      />

      <RecruiterModeModal
        scenario={recruiterScenario}
        isOpen={!!recruiterScenario}
        onClose={() => setRecruiterScenario(null)}
        onSubmitAttempt={handleSubmitRecruiterAttempt}
        theme={theme}
      />

      <QuickQuizModal
        questions={PREDEFINED_QUIZ_QUESTIONS}
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onSubmitQuiz={handleSubmitQuiz}
        theme={theme}
      />

      <AttemptReviewModal
        attempt={selectedAttemptForReview}
        isOpen={!!selectedAttemptForReview}
        onClose={() => setSelectedAttemptForReview(null)}
        theme={theme}
      />
    </div>
  );
}
