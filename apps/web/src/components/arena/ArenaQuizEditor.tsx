"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Eye,
  Save,
  Send,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import ArenaQuizPreviewModal from "@/components/arena/ArenaQuizPreviewModal";
import ArenaConfirmModal from "@/components/arena/ArenaConfirmModal";
import {
  ARENA_PALETTE,
  type ArenaQuestionConfig,
  type ArenaScoringMethod,
} from "@/types/arena";

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface ArenaQuizEditorProps {
  instituteCode: string;
  initialQuiz?: {
    id?: string;
    title?: string;
    description?: string | null;
    courseId?: string | null;
    defaultTimeLimitSeconds?: number;
    scoringMethod?: ArenaScoringMethod;
    enableIntegrityMonitoring?: boolean;
    shuffleQuestions?: boolean;
    shuffleAnswers?: boolean;
    showLeaderboardAfterEach?: boolean;
    questions?: ArenaQuestionConfig[];
  };
  courses?: CourseOption[];
}

export default function ArenaQuizEditor({
  instituteCode,
  initialQuiz,
  courses = [],
}: ArenaQuizEditorProps) {
  const router = useRouter();

  // Quiz Meta
  const [title, setTitle] = useState(initialQuiz?.title || "");
  const [description, setDescription] = useState(initialQuiz?.description || "");
  const [courseId, setCourseId] = useState(initialQuiz?.courseId || "");
  const [defaultTimeLimitSeconds, setDefaultTimeLimitSeconds] = useState(
    initialQuiz?.defaultTimeLimitSeconds || 20
  );
  const [scoringMethod, setScoringMethod] = useState<ArenaScoringMethod>(
    initialQuiz?.scoringMethod || "SPEED_BASED"
  );
  const [enableIntegrityMonitoring, setEnableIntegrityMonitoring] = useState(
    false
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    initialQuiz?.shuffleQuestions || false
  );
  const [shuffleAnswers, setShuffleAnswers] = useState(
    initialQuiz?.shuffleAnswers || false
  );
  const [showLeaderboardAfterEach, setShowLeaderboardAfterEach] = useState(
    initialQuiz?.showLeaderboardAfterEach ?? true
  );

  // Questions
  const [questions, setQuestions] = useState<ArenaQuestionConfig[]>(
    initialQuiz?.questions && initialQuiz.questions.length > 0
      ? initialQuiz.questions
      : [
          {
            questionText: "",
            questionType: "MULTIPLE_CHOICE",
            timeLimitSeconds: 20,
            basePoints: 1000,
            speedBonusEnabled: true,
            explanation: "",
            orderIndex: 0,
            choices: [
              { choiceText: "", isCorrect: true, colorIndex: 0, orderIndex: 0 },
              { choiceText: "", isCorrect: false, colorIndex: 1, orderIndex: 1 },
              { choiceText: "", isCorrect: false, colorIndex: 2, orderIndex: 2 },
              { choiceText: "", isCorrect: false, colorIndex: 3, orderIndex: 3 },
            ],
          },
        ]
  );

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-App Confirmation / Notice Modal State
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

  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  const updateActiveQuestion = (patch: Partial<ArenaQuestionConfig>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[activeQuestionIndex] = { ...copy[activeQuestionIndex], ...patch };
      return copy;
    });
  };

  const handleAddQuestion = (type: "MULTIPLE_CHOICE" | "TRUE_FALSE" = "MULTIPLE_CHOICE") => {
    const newQ: ArenaQuestionConfig = {
      questionText: "",
      questionType: type,
      timeLimitSeconds: defaultTimeLimitSeconds,
      basePoints: 1000,
      speedBonusEnabled: true,
      explanation: "",
      orderIndex: questions.length,
      choices:
        type === "TRUE_FALSE"
          ? [
              { choiceText: "True", isCorrect: true, colorIndex: 1, orderIndex: 0 },
              { choiceText: "False", isCorrect: false, colorIndex: 0, orderIndex: 1 },
            ]
          : [
              { choiceText: "", isCorrect: true, colorIndex: 0, orderIndex: 0 },
              { choiceText: "", isCorrect: false, colorIndex: 1, orderIndex: 1 },
              { choiceText: "", isCorrect: false, colorIndex: 2, orderIndex: 2 },
              { choiceText: "", isCorrect: false, colorIndex: 3, orderIndex: 3 },
            ],
    };

    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
    setShowExplanation(false);
  };

  const handleBatchAddQuestions = (count: number, type: "MULTIPLE_CHOICE" | "TRUE_FALSE" = "MULTIPLE_CHOICE") => {
    if (questions.length + count > 100) {
      setConfirmDialog({
        open: true,
        title: "Question Limit Reached",
        description: `A quiz can have at most 100 questions. You currently have ${questions.length} questions.`,
        confirmLabel: "Understood",
        variant: "warning",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, open: false })),
      });
      return;
    }

    const newBatch: ArenaQuestionConfig[] = [];
    const startIndex = questions.length;

    for (let i = 0; i < count; i++) {
      newBatch.push({
        questionText: "",
        questionType: type,
        timeLimitSeconds: defaultTimeLimitSeconds,
        basePoints: 1000,
        speedBonusEnabled: true,
        explanation: "",
        orderIndex: startIndex + i,
        choices:
          type === "TRUE_FALSE"
            ? [
                { choiceText: "True", isCorrect: true, colorIndex: 1, orderIndex: 0 },
                { choiceText: "False", isCorrect: false, colorIndex: 0, orderIndex: 1 },
              ]
            : [
                { choiceText: "", isCorrect: true, colorIndex: 0, orderIndex: 0 },
                { choiceText: "", isCorrect: false, colorIndex: 1, orderIndex: 1 },
                { choiceText: "", isCorrect: false, colorIndex: 2, orderIndex: 2 },
                { choiceText: "", isCorrect: false, colorIndex: 3, orderIndex: 3 },
              ],
      });
    }

    setQuestions((prev) => [...prev, ...newBatch]);
    setActiveQuestionIndex(startIndex);
    setShowExplanation(false);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const cloned: ArenaQuestionConfig = {
      ...target,
      questionText: target.questionText ? `${target.questionText} (Copy)` : "",
      choices: target.choices.map((c) => ({ ...c })),
      orderIndex: questions.length,
    };
    setQuestions((prev) => [...prev, cloned]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      setConfirmDialog({
        open: true,
        title: "Cannot Delete Question",
        description: "A quiz must have at least one question slide.",
        confirmLabel: "Understood",
        variant: "warning",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, open: false })),
      });
      return;
    }

    const target = questions[idx];
    const hasContent = Boolean(target.questionText.trim() || target.choices.some((c) => c.choiceText.trim()));

    if (hasContent) {
      setConfirmDialog({
        open: true,
        title: `Delete Question #${idx + 1}?`,
        description: "Are you sure you want to remove this question? All written text and choices for this question will be discarded.",
        itemName: target.questionText ? target.questionText : `Question Slide #${idx + 1}`,
        confirmLabel: "Delete Question",
        variant: "danger",
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          const updated = questions.filter((_, i) => i !== idx);
          setQuestions(updated);
          setActiveQuestionIndex(Math.max(0, idx - 1));
        },
      });
      return;
    }

    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, idx - 1));
  };

  const handleMoveQuestion = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setQuestions(updated);
    setActiveQuestionIndex(targetIdx);
  };

  const handleChoiceTextChange = (choiceIdx: number, text: string) => {
    if (!activeQuestion) return;
    const choices = [...activeQuestion.choices];
    choices[choiceIdx] = { ...choices[choiceIdx], choiceText: text };
    updateActiveQuestion({ choices });
  };

  const handleSetCorrectChoice = (choiceIdx: number) => {
    if (!activeQuestion) return;
    const choices = activeQuestion.choices.map((c, i) => ({
      ...c,
      isCorrect: i === choiceIdx,
    }));
    updateActiveQuestion({ choices });
  };

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please give your quiz a title.");
      setSettingsOpen(true);
      return;
    }

    if (questions.length === 0) {
      setErrorMessage("Please add at least one question to the quiz.");
      return;
    }

    if (status === "PUBLISHED") {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText.trim()) {
          setActiveQuestionIndex(i);
          setErrorMessage(`Question #${i + 1} is empty. Please enter question text.`);
          return;
        }

        const filledChoices = q.choices.filter((c) => c.choiceText.trim().length > 0);
        if (filledChoices.length < 2) {
          setActiveQuestionIndex(i);
          setErrorMessage(
            `Question #${i + 1} needs at least 2 answer options.`
          );
          return;
        }

        const hasCorrect = q.choices.some(
          (c) => c.isCorrect && c.choiceText.trim().length > 0
        );
        if (!hasCorrect) {
          setActiveQuestionIndex(i);
          setErrorMessage(
            `Question #${i + 1} does not have a correct answer selected.`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        courseId: courseId || null,
        status,
        defaultTimeLimitSeconds,
        scoringMethod,
        enableIntegrityMonitoring,
        shuffleQuestions,
        shuffleAnswers,
        showLeaderboardAfterEach,
        questions: questions.map((q, qIdx) => ({
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          timeLimitSeconds: q.timeLimitSeconds,
          basePoints: q.basePoints,
          speedBonusEnabled: q.speedBonusEnabled,
          explanation: q.explanation?.trim() || null,
          orderIndex: qIdx,
          choices: q.choices.map((c, cIdx) => ({
            choiceText: c.choiceText.trim(),
            isCorrect: c.isCorrect,
            colorIndex: c.colorIndex ?? cIdx % 4,
            orderIndex: cIdx,
          })),
        })),
      };

      const url = initialQuiz?.id
        ? `/api/arena/quizzes/${initialQuiz.id}`
        : `/api/arena/quizzes`;
      const method = initialQuiz?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ? `${data.message} (${data.error})` : data.message || "Failed to save quiz");
      }

      router.push(`/${instituteCode}/arena`);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styling schemes for Option A, B, C, D choice cards
  const choiceCardStyles = [
    {
      gradient: "bg-[#141A29]",
      border: "border-indigo-500/40",
      badge: "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30",
      shape: "A",
      name: "Option A",
    },
    {
      gradient: "bg-[#112322]",
      border: "border-teal-500/40",
      badge: "bg-teal-500/20 text-teal-200 border border-teal-500/30",
      shape: "B",
      name: "Option B",
    },
    {
      gradient: "bg-[#261E16]",
      border: "border-amber-500/40",
      badge: "bg-amber-500/20 text-amber-200 border border-amber-500/30",
      shape: "C",
      name: "Option C",
    },
    {
      gradient: "bg-[#22162B]",
      border: "border-purple-500/40",
      badge: "bg-purple-500/20 text-purple-200 border border-purple-500/30",
      shape: "D",
      name: "Option D",
    },
  ];

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION & ACTION BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Back & Title input */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href={`/${instituteCode}/arena`}
            title="Back to Arena Hub"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter Quiz Title Here..."
              className="w-full bg-transparent text-base sm:text-lg font-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden truncate"
            />
            <p className="text-[11px] text-slate-400 font-medium">
              {courseId
                ? courses.find((c) => c.id === courseId)?.title || "Linked to Course"
                : "General Quiz (No course link)"}
            </p>
          </div>
        </div>

        {/* Right: Actions (Settings, Preview, Save, Publish) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Settings className="w-3.5 h-3.5 text-amber-500" />
            <span>Settings</span>
            {false && enableIntegrityMonitoring && (
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave("DRAFT")}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave("PUBLISHED")}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-sm shadow-amber-500/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Quiz</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN WORKSPACE: SLIDES + QUESTION CANVAS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT: Slim Slide Navigator (3 cols) ── */}
        <aside className="lg:col-span-3 space-y-3">
          <div className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Questions ({questions.length})
              </span>
              <span className="text-[11px] font-bold text-amber-500">
                Slide #{activeQuestionIndex + 1}
              </span>
            </div>

            {/* Slide Cards */}
            <div className="space-y-1.5 max-h-130 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isActive = idx === activeQuestionIndex;
                const correctChoice = q.choices.find((c) => c.isCorrect);
                const palIndex = correctChoice?.colorIndex ?? 0;
                const correctPal = ARENA_PALETTE[palIndex % 4];

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveQuestionIndex(idx);
                      setShowExplanation(Boolean(q.explanation));
                    }}
                    className={`group relative p-3 rounded-xl border cursor-pointer transition select-none flex items-center justify-between gap-2.5 ${
                      isActive
                        ? "border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white ring-2 ring-amber-500/20"
                        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isActive
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">
                          {q.questionText || "Untitled Question"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                          <span>{q.questionType === "TRUE_FALSE" ? "T/F" : "MC"}</span>
                          <span>•</span>
                          <span>{q.timeLimitSeconds}s</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-bold text-amber-500">
                            {correctPal.symbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick slide controls */}
                    <div
                      className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 hover:text-white disabled:opacity-20"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, "down")}
                        disabled={idx === questions.length - 1}
                        title="Move Down"
                        className="p-1 hover:text-white disabled:opacity-20"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(idx)}
                        title="Duplicate"
                        className="p-1 hover:text-amber-400"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        title="Delete"
                        className="p-1 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Slide Button */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => handleAddQuestion("MULTIPLE_CHOICE")}
                className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 4 Choices</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion("TRUE_FALSE")}
                className="py-2 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-xs flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ True / False</span>
              </button>
            </div>

            {/* Quick Batch Add (+5 / +10 Questions) */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
                Batch Quick Add:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchAddQuestions(5, "MULTIPLE_CHOICE")}
                  className="py-2 px-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center gap-1 transition border border-indigo-500/20 active:scale-95 shadow-2xs"
                  title="Quickly add 5 questions at once"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+5 Questions</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchAddQuestions(10, "MULTIPLE_CHOICE")}
                  className="py-2 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-black text-xs flex items-center justify-center gap-1 transition border border-purple-500/20 active:scale-95 shadow-2xs"
                  title="Quickly add 10 questions at once"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+10 Questions</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT: Main Question Canvas (9 cols - Wide & Spacious) ── */}
        <main className="lg:col-span-9 space-y-4">
          <div className="bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 p-5 sm:p-7 rounded-3xl shadow-sm space-y-6">
            {/* Top Toolbar: Quick Question Configuration */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
              {/* Question Type selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    updateActiveQuestion({
                      questionType: "MULTIPLE_CHOICE",
                      choices:
                        activeQuestion.choices.length === 4
                          ? activeQuestion.choices
                          : [
                              { choiceText: "", isCorrect: true, colorIndex: 0, orderIndex: 0 },
                              { choiceText: "", isCorrect: false, colorIndex: 1, orderIndex: 1 },
                              { choiceText: "", isCorrect: false, colorIndex: 2, orderIndex: 2 },
                              { choiceText: "", isCorrect: false, colorIndex: 3, orderIndex: 3 },
                            ],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeQuestion?.questionType === "MULTIPLE_CHOICE"
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateActiveQuestion({
                      questionType: "TRUE_FALSE",
                      choices: [
                        { choiceText: "True", isCorrect: true, colorIndex: 1, orderIndex: 0 },
                        { choiceText: "False", isCorrect: false, colorIndex: 0, orderIndex: 1 },
                      ],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeQuestion?.questionType === "TRUE_FALSE"
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  True / False
                </button>
              </div>

              {/* Time limit & Points Quick Pickers */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Timer */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Time:</span>
                  <div className="flex items-center gap-1">
                    {[10, 20, 30, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateActiveQuestion({ timeLimitSeconds: sec })}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                          activeQuestion?.timeLimitSeconds === sec
                            ? "bg-amber-500 text-slate-950 font-black"
                            : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Points */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Points:</span>
                  <div className="flex items-center gap-1">
                    {[500, 1000, 2000].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => updateActiveQuestion({ basePoints: pts })}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                          activeQuestion?.basePoints === pts
                            ? "bg-emerald-500 text-white font-black"
                            : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {pts}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Textarea (Large, clean, central presentation) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Question #{activeQuestionIndex + 1}
              </label>
              <textarea
                rows={3}
                value={activeQuestion?.questionText || ""}
                onChange={(e) => updateActiveQuestion({ questionText: e.target.value })}
                placeholder="Type your question here (e.g., Which financial statement shows a company's financial position at a specific point in time?)..."
                className="w-full p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-slate-900 dark:text-white placeholder-slate-400 text-lg sm:text-xl font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 leading-relaxed resize-y"
              />
            </div>

            {/* Answer Choices (Kahoot Style Cards) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Answer Choices
                </span>
                <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Click checkmark to select the correct answer
                </span>
              </div>

              <div
                className={`grid gap-3.5 ${
                  activeQuestion?.questionType === "TRUE_FALSE"
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {activeQuestion?.choices.map((choice, cIdx) => {
                  const style = choiceCardStyles[cIdx % 4];
                  const isCorrect = choice.isCorrect;

                  return (
                    <div
                      key={cIdx}
                      className={`relative rounded-2xl p-4 transition-all duration-200 shadow-md ${style.gradient} border ${
                        isCorrect
                          ? "ring-4 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-[#12151F] shadow-lg"
                          : "opacity-95 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Shape Symbol */}
                        <div className="w-10 h-10 rounded-xl bg-black/20 text-white flex items-center justify-center text-xl font-black shrink-0 drop-shadow-sm select-none">
                          {style.shape}
                        </div>

                        {/* Choice Text Input */}
                        <input
                          type="text"
                          value={choice.choiceText}
                          onChange={(e) => handleChoiceTextChange(cIdx, e.target.value)}
                          placeholder={
                            activeQuestion.questionType === "TRUE_FALSE"
                              ? cIdx === 0
                                ? "True"
                                : "False"
                              : `Add Answer ${cIdx + 1}...`
                          }
                          className="flex-1 bg-transparent text-white placeholder-white/60 text-base font-extrabold focus:outline-hidden"
                        />

                        {/* Correct Answer Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleSetCorrectChoice(cIdx)}
                          title={isCorrect ? "Correct Answer" : "Mark as Correct"}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition shrink-0 select-none ${
                            isCorrect
                              ? "bg-white text-emerald-700 shadow-md scale-105"
                              : "bg-black/25 text-white/70 hover:bg-white/20 hover:text-white"
                          }`}
                        >
                          <Check className={`w-4 h-4 stroke-3 ${isCorrect ? "text-emerald-600" : ""}`} />
                          <span>{isCorrect ? "Correct" : "Pick"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Answer Explanation (Collapsible) */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              {!showExplanation && !activeQuestion?.explanation ? (
                <button
                  type="button"
                  onClick={() => setShowExplanation(true)}
                  className="text-xs font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1.5 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>+ Add explanation for students after question ends (Optional)</span>
                </button>
              ) : (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Answer Explanation (Revealed when time expires)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        updateActiveQuestion({ explanation: "" });
                        setShowExplanation(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activeQuestion?.explanation || ""}
                    onChange={(e) => updateActiveQuestion({ explanation: e.target.value })}
                    placeholder="e.g. The balance sheet shows assets, liabilities, and equity at a specific date..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. QUIZ SETTINGS SLIDE-OVER DRAWER
      ───────────────────────────────────────────────────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#12151F] border-l border-slate-200 dark:border-white/10 h-full p-6 overflow-y-auto space-y-6 shadow-2xl animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Quiz Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quiz Title */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Entrepreneurship Strategy Sprint"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of this interactive challenge..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Course Link */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Course Link (Gradebook Sync)
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">No Course (General Quiz)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Anti-Cheating Integrity Monitoring removed */}
            <div className="hidden">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-orange-600 dark:text-orange-400">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Anti-Cheating Integrity Monitoring</span>
                  </div>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block mt-1 leading-snug">
                    Detects student tab switches and clipboard copy/paste during live game questions. Highlighted in instructor quiz reports.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableIntegrityMonitoring}
                  onChange={(e) => setEnableIntegrityMonitoring(e.target.checked)}
                  className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500 mt-1 cursor-pointer"
                />
              </label>
            </div>

            {/* Game Options */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Gameplay Options
              </span>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Shuffle Questions</span>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Shuffle Answer Choices</span>
                <input
                  type="checkbox"
                  checked={shuffleAnswers}
                  onChange={(e) => setShuffleAnswers(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Show Leaderboard After Each Question</span>
                <input
                  type="checkbox"
                  checked={showLeaderboardAfterEach}
                  onChange={(e) => setShowLeaderboardAfterEach(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Done button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      {previewOpen && (
        <ArenaQuizPreviewModal
          title={title || "Quiz Preview"}
          questions={questions}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Accessible In-App Confirmation / Notice Modal */}
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
    </div>
  );
}
