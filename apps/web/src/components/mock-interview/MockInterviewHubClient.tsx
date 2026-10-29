"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  UserCheck,
  CheckCircle2,
  Award,
  Sparkles,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  History,
  FileQuestion,
  HelpCircle,
  BrainCircuit,
  ShieldCheck,
  Users,
  Handshake,
  Lightbulb,
  Shuffle,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type {
  InterviewQuestionItem,
  RecruiterScenarioItem,
  QuizQuestionItem,
  InterviewCategoryKey,
  ApplicantSelfAssessmentChecklist,
  AnswerClassification,
} from "@/lib/mock-interview/types";
import { INTERVIEW_CATEGORIES } from "@/lib/mock-interview/types";
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
}

type TabKey =
  | "OVERVIEW"
  | "CATEGORIES"
  | "QUESTION_BANK"
  | "SAVED"
  | "PROGRESS"
  | "HISTORY";

export default function MockInterviewHubClient({
  instituteCode,
  studentName,
  studentId,
  theme,
  initialAttempts = [],
  initialSavedQuestionIds = [],
}: MockInterviewHubClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("OVERVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [categoryModeView, setCategoryModeView] = useState<"ALL" | "APPLICANT" | "RECRUITER">("ALL");

  const handleStartRandomApplicantPractice = (category?: string) => {
    const pool =
      category && category !== "ALL"
        ? PREDEFINED_QUESTIONS.filter((q) => q.category === category)
        : PREDEFINED_QUESTIONS;
    if (!pool.length) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    setApplicantQuestion(pool[randomIndex]);
  };

  const handleStartRandomRecruiterScenario = (category?: string) => {
    const pool =
      category && category !== "ALL"
        ? PREDEFINED_SCENARIOS.filter((s) => s.category === category)
        : PREDEFINED_SCENARIOS;
    const targetPool = pool.length ? pool : PREDEFINED_SCENARIOS;
    const randomIndex = Math.floor(Math.random() * targetPool.length);
    setRecruiterScenario(targetPool[randomIndex]);
  };

  // Local storage / state for student's saved question IDs & attempts
  const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>(initialSavedQuestionIds);
  const [attempts, setAttempts] = useState<StoredAttemptItem[]>(initialAttempts);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] =
    useState<InterviewQuestionItem | null>(null);
  const [applicantQuestion, setApplicantQuestion] =
    useState<InterviewQuestionItem | null>(null);
  const [recruiterScenario, setRecruiterScenario] =
    useState<RecruiterScenarioItem | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [selectedAttemptForReview, setSelectedAttemptForReview] =
    useState<StoredAttemptItem | null>(null);

  // Sync / refresh saved questions & attempts from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [savedRes, progressRes] = await Promise.all([
          fetch("/api/mock-interview/saved"),
          fetch("/api/mock-interview/progress"),
        ]);
        if (savedRes.ok) {
          const sData = await savedRes.json();
          if (Array.isArray(sData.savedQuestionIds)) {
            setSavedQuestionIds(sData.savedQuestionIds);
          }
        }
        if (progressRes.ok) {
          const pData = await progressRes.json();
          if (Array.isArray(pData.recentAttempts)) {
            setAttempts(pData.recentAttempts);
          }
        }
      } catch {
        // Fallback to initial server state safely
      }
    }
    loadData();
  }, []);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return PREDEFINED_QUESTIONS.filter((q) => {
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
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  // Saved questions list
  const savedQuestions = useMemo(() => {
    return PREDEFINED_QUESTIONS.filter((q) => savedQuestionIds.includes(q.id));
  }, [savedQuestionIds]);

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
      },
    };

    setAttempts((prev) => [newAttempt, ...prev]);

    try {
      const res = await fetch("/api/mock-interview/applicant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  // Handlers for Recruiter Mode Submit
  const handleSubmitRecruiterAttempt = async (data: {
    scenarioId: string;
    selectedQuestionId: string;
    classifiedAnswer: AnswerClassification;
    selectedFollowUpId?: string;
  }) => {
    const scenario = PREDEFINED_SCENARIOS.find((s) => s.id === data.scenarioId);
    let isQuestionCorrect = false;
    let isClassificationCorrect = false;
    let isFollowUpCorrect: boolean | undefined = undefined;

    if (scenario) {
      const qOpt = scenario.questionOptions.find((q) => q.id === data.selectedQuestionId);
      isQuestionCorrect = !!qOpt?.isBest;
      const preparedAnswer = scenario.applicantAnswers[data.selectedQuestionId];
      if (preparedAnswer) {
        isClassificationCorrect = preparedAnswer.classification === data.classifiedAnswer;
      }
      if (data.selectedFollowUpId && scenario.followUpOptions) {
        const fuOpt = scenario.followUpOptions.find((f) => f.id === data.selectedFollowUpId);
        isFollowUpCorrect = !!fuOpt?.isBest;
      }
    }

    let score = 0;
    if (isQuestionCorrect) score += 35;
    if (isClassificationCorrect) score += 35;
    if (isFollowUpCorrect) score += 30;
    const maxScore = 100;

    const tempId = `rec-${Date.now()}`;
    const newAttempt: StoredAttemptItem = {
      id: tempId,
      type: "RECRUITER",
      title: scenario ? `Recruiter: ${scenario.title}` : "Recruiter Simulation",
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
        body: JSON.stringify(data),
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
      advice: scenario?.practicalAdvice || "Review recruitment standards.",
    };
  };

  // Handlers for Quiz Submit
  const handleSubmitQuiz = async (answers: Record<string, number>) => {
    let score = 0;
    const maxScore = PREDEFINED_QUIZ_QUESTIONS.length * 10;
    let correctCount = 0;

    const detailedResults = PREDEFINED_QUIZ_QUESTIONS.map((q) => {
      const selected = answers[q.id] ?? -1;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) {
        score += q.pointValue;
        correctCount += 1;
      }
      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedChoice: selected,
        correctChoice: q.correctAnswer ?? 0,
        isCorrect,
        explanation: q.explanation || "No explanation available.",
        choices: q.choices,
      };
    });

    const percentage = (score / maxScore) * 100;

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

  // Helper to determine if an applicant attempt achieved 100% score (all 5 criteria checked)
  const isApplicantAttempt100 = (checklist: any): boolean => {
    if (!checklist || typeof checklist !== "object") return false;
    const required = [
      "answersQuestion",
      "includesExample",
      "demonstratesCompetency",
      "professionalLanguage",
      "specificDetailed",
    ];
    return required.every((k) => checklist[k] === true);
  };

  // Distinct question IDs where student achieved 100% score (all 5 criteria met)
  const masteredQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const att of attempts) {
      if (att.type === "APPLICANT" && att.details?.questionId) {
        if (isApplicantAttempt100(att.details.checklist)) {
          ids.add(att.details.questionId);
        }
      }
    }
    return ids;
  }, [attempts]);

  // Distinct recruiter scenario IDs with perfect 100/100 score
  const perfectRecruiterScenarioIds = useMemo(() => {
    const ids = new Set<string>();
    for (const att of attempts) {
      if (
        att.type === "RECRUITER" &&
        att.details?.scenarioId &&
        att.score !== undefined &&
        att.maxScore !== undefined &&
        att.score >= att.maxScore &&
        att.score >= 100
      ) {
        ids.add(att.details.scenarioId);
      }
    }
    return ids;
  }, [attempts]);

  // Calculations for stats
  const totalPracticed = attempts.filter((a) => a.type === "APPLICANT").length;
  const totalRecruiterSessions = attempts.filter((a) => a.type === "RECRUITER").length;
  const quizAttempts = attempts.filter((a) => a.type === "QUIZ");
  const bestQuizScore = quizAttempts.length
    ? Math.max(...quizAttempts.map((q) => q.score || 0))
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/50 dark:border-amber-700/30 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
              <Briefcase className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span>IBE Professional Career Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Mock Interview & Career Readiness
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Welcome, <span className="font-bold text-slate-900 dark:text-white">{studentName}</span>. Practice 
              predefined interview questions, evaluate realistic candidate scenarios in Recruiter Mode, 
              and build practical confidence through deterministic, self-service feedback.
            </p>
          </div>

          {/* Quick Stat Counter */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 shrink-0 bg-white/70 dark:bg-[#141721]/80 p-3.5 rounded-2xl border border-amber-200/50 dark:border-white/5 shadow-xs backdrop-blur-xs">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Practiced
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalPracticed}
              </span>
            </div>
            <div className="text-center px-2 border-x border-slate-200 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Recruiter
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalRecruiterSessions}
              </span>
            </div>
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Best Quiz
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {bestQuizScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80 dark:border-white/10">
        {[
          { key: "OVERVIEW", label: "Dashboard Overview", icon: Sparkles },
          { key: "CATEGORIES", label: "Categories", icon: BookOpen },
          { key: "QUESTION_BANK", label: `Question Bank (${PREDEFINED_QUESTIONS.length})`, icon: FileQuestion },
          { key: "SAVED", label: `Saved Questions (${savedQuestionIds.length})`, icon: Bookmark },
          { key: "PROGRESS", label: "My Progress", icon: TrendingUp },
          { key: "HISTORY", label: `History (${attempts.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Quick Practice Launcher Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] space-y-3 shadow-xs hover:border-amber-400 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Applicant Mode Practice</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Select an interview question, draft your response, and compare it against practical model answers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleStartRandomApplicantPractice()}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{ backgroundColor: theme.colors.primary }}
                title="Start practicing a randomized interview question"
              >
                <span>Start Practice</span>
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] space-y-3 shadow-xs hover:border-blue-400 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recruiter Mode Simulation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Step into the hiring manager’s shoes. Choose questions, evaluate answers, and score candidates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleStartRandomRecruiterScenario()}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Launch a randomized recruiter evaluation scenario"
              >
                <span>Launch Recruiter Scenario</span>
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] space-y-3 shadow-xs hover:border-emerald-400 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Interview Quiz</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Test your grasp of interview etiquette, equal opportunity laws, and STAR behavioral methods.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuizOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Take {PREDEFINED_QUIZ_QUESTIONS.length}-Question Quiz</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>



          {/* Recent Practice History Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Recent Practice Attempts
            </h3>
            {attempts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Practice Attempts Yet
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Start your first Applicant Mode session, Recruiter simulation, or Quick Quiz above to begin tracking genuine progress.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.slice(0, 5).map((att) => (
                  <div
                    key={att.id}
                    onClick={() => setSelectedAttemptForReview(att)}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] flex items-center justify-between gap-3 hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        {att.type === "QUIZ" ? (
                          <Award className="w-4 h-4" />
                        ) : att.type === "RECRUITER" ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <Briefcase className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {att.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(att.date).toLocaleDateString()} &bull; {att.type}
                        </p>
                      </div>
                    </div>
                    {att.score !== undefined && (
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono shrink-0">
                        {att.score} / {att.maxScore} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: CATEGORIES ─── */}
      {activeTab === "CATEGORIES" && (
        <div className="space-y-5">
          {/* Mode Selector & Description Banner */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <BookOpen className="w-4 h-4" />
                <span>Specialized Career Categories</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Category Tracks & Mode Selection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Filter categories by track or practice questions directly in Applicant Mode or Recruiter Simulation.
              </p>
            </div>

            {/* Mode Segmented Filter */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setCategoryModeView("ALL")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  categoryModeView === "ALL"
                    ? "bg-white dark:bg-[#0E1118] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Modes
              </button>
              <button
                type="button"
                onClick={() => setCategoryModeView("APPLICANT")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  categoryModeView === "APPLICANT"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Applicant Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryModeView("RECRUITER")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  categoryModeView === "RECRUITER"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Recruiter Mode</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTERVIEW_CATEGORIES.map((cat) => {
              const questionsInCat = PREDEFINED_QUESTIONS.filter((q) => q.category === cat.key);
              const scenariosInCat = PREDEFINED_SCENARIOS.filter((s) => s.category === cat.key);
              const isRecruiterOnly = categoryModeView === "RECRUITER";
              const isApplicantOnly = categoryModeView === "APPLICANT";

              return (
                <div
                  key={cat.key}
                  className={`p-5 rounded-2xl border bg-white dark:bg-[#141721] space-y-4 shadow-xs transition-all ${
                    isRecruiterOnly
                      ? "border-blue-200 dark:border-blue-900/30 hover:border-blue-400"
                      : isApplicantOnly
                      ? "border-amber-200 dark:border-amber-900/30 hover:border-amber-400"
                      : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.accentColor }}
                        />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {cat.label}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {(categoryModeView === "ALL" || isApplicantOnly) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span>{questionsInCat.length} Applicant Qs</span>
                        </span>
                      )}
                      {(categoryModeView === "ALL" || isRecruiterOnly) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>
                            {scenariosInCat.length > 0
                              ? `${scenariosInCat.length} Recruiter Scenario${scenariosInCat.length > 1 ? "s" : ""}`
                              : "Recruiter Practice"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mode-specific context snippet */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
                    {isRecruiterOnly ? (
                      <div>
                        <span className="font-bold text-blue-600 dark:text-blue-400">Recruiter Scenario: </span>
                        {scenariosInCat.length > 0
                          ? `Simulate hiring decisions for ${scenariosInCat[0].roleOrPosition}: "${scenariosInCat[0].title}".`
                          : `Practice screening candidates and spotting weak answers in ${cat.label.toLowerCase()}.`}
                      </div>
                    ) : isApplicantOnly ? (
                      <div>
                        <span className="font-bold text-amber-600 dark:text-amber-400">Applicant Practice: </span>
                        Draft practical written answers for roles such as <span className="font-semibold text-slate-900 dark:text-white">{questionsInCat[0]?.jobPosition}</span>.
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Target Role: {questionsInCat[0]?.jobPosition}</span>
                        <span>{scenariosInCat.length > 0 ? "Includes Recruiter Scenarios" : "Applicant Questions"}</span>
                      </div>
                    )}
                  </div>

                  {/* Mode-Specific Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Applicant Mode Launch */}
                      {(categoryModeView === "ALL" || isApplicantOnly) && (
                        <button
                          type="button"
                          onClick={() => handleStartRandomApplicantPractice(cat.key)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 cursor-pointer"
                          style={{ backgroundColor: theme.colors.primary }}
                          title={`Practice a randomized question in ${cat.label} (Applicant Mode)`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Practice (Applicant)</span>
                        </button>
                      )}

                      {/* Recruiter Mode Launch */}
                      {(categoryModeView === "ALL" || isRecruiterOnly) && (
                        <button
                          type="button"
                          onClick={() => handleStartRandomRecruiterScenario(cat.key)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
                          title={`Simulate Recruiter Mode in ${cat.label}`}
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Recruiter Mode</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.key);
                        setActiveTab("QUESTION_BANK");
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Questions</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: QUESTION BANK ─── */}
      {activeTab === "QUESTION_BANK" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions, job roles, or competencies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0E1118] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0E1118] text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="ENTRY">Entry Level</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>

                {(searchQuery || selectedCategory !== "ALL" || selectedDifficulty !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("ALL");
                      setSelectedDifficulty("ALL");
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    title="Reset filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
                }`}
              >
                All Categories ({PREDEFINED_QUESTIONS.length})
              </button>
              {INTERVIEW_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.key
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  {cat.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Question List */}
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 space-y-2">
              <FileQuestion className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No matching questions found
              </p>
              <p className="text-xs text-slate-500">
                Try loosening your search keywords or resetting the category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestions.map((q) => {
                const isSaved = savedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] flex flex-col justify-between space-y-4 hover:border-amber-400/80 transition-colors shadow-xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                          {q.category.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {q.difficulty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleSave(q.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                            title={isSaved ? "Remove from saved" : "Save question"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {q.questionText}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Target Role: </span>
                        {q.jobPosition}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionForDetail(q)}
                        className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>Model Answer & Tips</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setApplicantQuestion(q)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 cursor-pointer"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        <span>Practice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}



      {/* ─── TAB 5: SAVED QUESTIONS ─── */}
      {activeTab === "SAVED" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
            Questions you have saved for personal review and independent practice. Each student's saved list is completely private.
          </div>

          {savedQuestions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 space-y-2">
              <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Saved Questions Yet
              </p>
              <p className="text-xs text-slate-500">
                Browse the Question Bank and click the bookmark icon on any question to save it here for quick access.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("QUESTION_BANK")}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Browse Question Bank
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                        {q.category.replace(/_/g, " ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(q.id)}
                        className="text-xs text-rose-500 hover:underline font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {q.questionText}
                    </h4>
                    <p className="text-xs text-slate-500">Role: {q.jobPosition}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionForDetail(q)}
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline"
                    >
                      View Tips
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplicantQuestion(q)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <span>Practice</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: MY PROGRESS ─── */}
      {activeTab === "PROGRESS" && (
        <div className="space-y-6">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                100% Mastered Questions
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {masteredQuestionIds.size} <span className="text-xs font-semibold text-slate-400 font-sans">/ {PREDEFINED_QUESTIONS.length}</span>
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                All 5 criteria satisfied
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Perfect Recruiter Evals
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {perfectRecruiterScenarioIds.size} <span className="text-xs font-semibold text-slate-400 font-sans">/ {PREDEFINED_SCENARIOS.length}</span>
              </p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                100 / 100 points scored
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Personal Best Quiz
              </span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {bestQuizScore} <span className="text-xs font-semibold text-slate-400 font-sans">pts</span>
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                {quizAttempts.length} completed
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Overall 100% Mastery
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {Math.round((masteredQuestionIds.size / PREDEFINED_QUESTIONS.length) * 100)}%
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Earned via 100% scores
              </span>
            </div>
          </div>

          {/* Category Progress Bars */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Category Practice Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Progress advances only when you achieve a <span className="font-bold text-emerald-600 dark:text-emerald-400">100% score</span> (all 5 self-assessment criteria met).
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                100% Score Required
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {INTERVIEW_CATEGORIES.map((cat) => {
                const questionsInCat = PREDEFINED_QUESTIONS.filter((q) => q.category === cat.key);
                const totalInCat = questionsInCat.length;
                const masteredInCat = questionsInCat.filter((q) => masteredQuestionIds.has(q.id)).length;
                const pct = totalInCat > 0 ? Math.min(100, Math.round((masteredInCat / totalInCat) * 100)) : 0;

                return (
                  <div key={cat.key} className="space-y-1.5 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.accentColor }}
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cat.label}
                        </span>
                        {masteredInCat === totalInCat && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                            100% Mastered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          {masteredInCat} / {totalInCat} Mastered
                        </span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? "#10b981" : cat.accentColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: HISTORY & REVIEW ─── */}
      {activeTab === "HISTORY" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
            Review every attempt you have completed. Click on any record to inspect your written answers, 
            recruiter classifications, or quiz results with full explanations.
          </div>

          {attempts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 space-y-2">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Recorded Attempts
              </p>
              <p className="text-xs text-slate-500">
                When you complete exercises, they will appear here permanently for review.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  onClick={() => setSelectedAttemptForReview(att)}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] flex items-center justify-between gap-4 hover:border-amber-400 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      {att.type === "QUIZ" ? (
                        <Award className="w-4 h-4" />
                      ) : att.type === "RECRUITER" ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <Briefcase className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {att.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(att.date).toLocaleString()} &bull; {att.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {att.score !== undefined && (
                      <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                        {att.score} / {att.maxScore} pts
                      </span>
                    )}
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      Review &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}
      <QuestionDetailModal
        question={selectedQuestionForDetail}
        isOpen={!!selectedQuestionForDetail}
        onClose={() => setSelectedQuestionForDetail(null)}
        isSaved={selectedQuestionForDetail ? savedQuestionIds.includes(selectedQuestionForDetail.id) : false}
        onToggleSave={handleToggleSave}
        onStartPractice={(q) => setApplicantQuestion(q)}
        theme={theme}
      />

      <ApplicantModeModal
        question={applicantQuestion}
        isOpen={!!applicantQuestion}
        onClose={() => setApplicantQuestion(null)}
        onSaveAttempt={handleSaveApplicantAttempt}
        theme={theme}
        onRandomizeQuestion={() => handleStartRandomApplicantPractice(applicantQuestion?.category)}
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
