"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Eye,
  Settings,
  Send,
  Plus,
  Bookmark,
  Sparkles,
  Heading,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";
import MobileBlocker from "./MobileBlocker";
import QuestionCard from "./QuestionCard";
import FormSettingsPanel from "./FormSettingsPanel";
import QuestionBankDrawer from "./QuestionBankDrawer";
import AiQuestionModal from "./AiQuestionModal";
import type { FormData, FormQuestionData, QuestionType } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface FormBuilderProps {
  initialForm: FormData;
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
}

export default function FormBuilder({
  initialForm,
  courseId,
  instituteCode,
  theme,
}: FormBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [questions, setQuestions] = useState<FormQuestionData[]>(initialForm.questions || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showBankDrawer, setShowBankDrawer] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const primaryColor = theme?.colors?.primary || "#3B82F6";

  // Reorder Drag & Drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
      ...q,
      position: idx,
    }));

    setQuestions(reordered);

    // Sync to backend
    try {
      await fetch(`/api/courses/${courseId}/forms/${form.id}/questions/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((q) => q.id) }),
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  // Add a new question
  const handleAddQuestion = async (type: QuestionType = "MULTIPLE_CHOICE") => {
    setIsSaving(true);
    try {
      const isHeader = type === "SECTION_HEADER";
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: type,
          prompt: "",
          points: isHeader ? 0 : 1,
          config:
            type === "MULTIPLE_CHOICE" || type === "CHECKBOXES" || type === "DROPDOWN" || type === "IMAGE_CHOICE"
              ? {
                  options: [
                    { id: "opt_1", text: "", isCorrect: true },
                    { id: "opt_2", text: "", isCorrect: false },
                  ],
                }
              : {},
        }),
      });

      const data = await res.json();
      if (data.question) {
        setQuestions((prev) => [...prev, data.question]);
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Update question
  const handleUpdateQuestion = useCallback(
    async (id: string, updates: Partial<FormQuestionData>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
      );

      try {
        await fetch(`/api/courses/${courseId}/forms/${form.id}/questions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        setLastSaved(new Date());
      } catch (err) {
        console.error(err);
      }
    },
    [courseId, form.id]
  );

  // Duplicate question
  const handleDuplicateQuestion = async (id: string) => {
    const target = questions.find((q) => q.id === id);
    if (!target) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: target.questionType,
          prompt: `${target.prompt} (Copy)`,
          description: target.description,
          points: target.points,
          partialCredit: target.partialCredit,
          config: target.config,
        }),
      });

      const data = await res.json();
      if (data.question) {
        setQuestions((prev) => [...prev, data.question]);
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    try {
      await fetch(`/api/courses/${courseId}/forms/${form.id}/questions/${id}`, {
        method: "DELETE",
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  // Save to question bank
  const handleSaveToBank = async (questionId: string) => {
    try {
      await fetch(`/api/question-bank/from-question/${questionId}`, {
        method: "POST",
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Import from question bank
  const handleImportFromBank = async (bankItemIds: string[]) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/questions/from-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankItemIds }),
      });
      const data = await res.json();
      if (data.questions) {
        const parsed = data.questions.map((q: any) => ({
          ...q,
          config: typeof q.config === "string" ? JSON.parse(q.config) : q.config,
        }));
        setQuestions((prev) => [...prev, ...parsed]);
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AI Insert Questions
  const handleInsertAiQuestions = async (
    newQuestions: Array<Omit<FormQuestionData, "id" | "formId" | "position">>
  ) => {
    for (const q of newQuestions) {
      try {
        const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
        const data = await res.json();
        if (data.question) {
          setQuestions((prev) => [...prev, data.question]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setLastSaved(new Date());
  };

  // Update Form Settings
  const handleSaveSettings = async (updates: Partial<FormData> & { password?: string }) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.form) {
        setForm((prev) => ({ ...prev, ...updates }));
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Publish Form
  const handlePublish = async () => {
    setIsPublishing(true);
    setValidationErrors([]);

    // Client-side pre-validation
    const clientErrors: string[] = [];
    if (!form.title || !form.title.trim()) {
      clientErrors.push("Form must have a title.");
    }

    const contentQuestions = questions.filter((q) => q.questionType !== "SECTION_HEADER");
    if (contentQuestions.length === 0) {
      clientErrors.push("Form must contain at least one question.");
    }

    questions.forEach((q, idx) => {
      const num = idx + 1;
      const isHeader = q.questionType === "SECTION_HEADER";

      if (!q.prompt || !q.prompt.trim()) {
        clientErrors.push(
          isHeader
            ? `Section Header #${num} cannot have a blank title.`
            : `Question #${num} cannot have a blank title.`
        );
      }

      if (["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "IMAGE_CHOICE"].includes(q.questionType)) {
        const options = q.config?.options || [];
        if (options.length < 2) {
          clientErrors.push(`Question #${num} must have at least 2 options.`);
        }
        const blankOpts = options.filter((opt) => !opt.text || !opt.text.trim());
        if (blankOpts.length > 0) {
          clientErrors.push(
            `Question #${num} has ${blankOpts.length} blank option(s). All options must have text.`
          );
        }
      }

      if (q.questionType === "MATRIX") {
        const rows = q.config?.matrix?.rows || [];
        const cols = q.config?.matrix?.columns || [];
        if (rows.length === 0 || cols.length === 0) {
          clientErrors.push(`Matrix question #${num} must have at least 1 row and 1 column.`);
        }
      }

      if (q.questionType === "RANKING") {
        const items = q.config?.ranking?.items || [];
        if (items.length < 2) {
          clientErrors.push(`Ranking question #${num} must have at least 2 items to rank.`);
        }
      }
    });

    if (clientErrors.length > 0) {
      setValidationErrors(clientErrors);
      setIsPublishing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationErrors(data.errors || [data.message || "Failed to publish."]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setForm((prev) => ({ ...prev, status: "PUBLISHED" }));
        router.push(`/${instituteCode}/courses/${courseId}/classwork`);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setValidationErrors(["Network error while attempting to publish."]);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] pb-32">
      {/* Mobile creation blocker */}
      <MobileBlocker theme={theme} />

      {/* Top Sticky Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/${instituteCode}/courses/${courseId}/classwork`}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Back to Classwork"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setForm((prev) => ({ ...prev, title: nextTitle }));
                    handleSaveSettings({ title: nextTitle });
                  }}
                  className="font-bold text-base sm:text-lg text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-primary focus:outline-hidden py-0.5 px-1"
                />
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {form.formType.replace("_", " ")}
                </span>
                {form.status === "PUBLISHED" && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Published
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 pl-1">
                {isSaving ? "Saving changes..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "All changes saved"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${instituteCode}/courses/${courseId}/classwork/forms/${form.id}/preview`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{form.status === "PUBLISHED" ? "Update Published" : "Publish"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        {/* Validation Errors Alert if any */}
        {validationErrors.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 text-xs space-y-1">
            <div className="font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Please resolve the following before publishing:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Top Header Card (Google Forms Style Card) */}
        <div className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden relative">
          <div
            className="h-3 w-full"
            style={{ backgroundColor: form.themeColor || primaryColor }}
          />
          <div className="p-6 sm:p-8 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {form.title}
            </h1>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => {
                const nextDesc = e.target.value;
                setForm((prev) => ({ ...prev, description: nextDesc }));
                handleSaveSettings({ description: nextDesc });
              }}
              placeholder="Form description or instructions for students..."
              className="w-full text-xs sm:text-sm text-slate-600 dark:text-[#8B92A5] bg-transparent border-0 border-b border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-primary focus:outline-hidden p-0 resize-y"
            />
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 border-t border-slate-100 dark:border-white/5">
              <span>{questions.filter((q) => q.questionType !== "SECTION_HEADER").length} Questions</span>
              <span>•</span>
              <span>
                {questions
                  .filter((q) => q.questionType !== "SECTION_HEADER")
                  .reduce((sum, q) => sum + (q.points || 0), 0)}{" "}
                Total Points
              </span>
              {form.timeLimitMins && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {form.timeLimitMins} mins time limit
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sortable Questions List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  allQuestions={questions}
                  onUpdate={handleUpdateQuestion}
                  onDuplicate={handleDuplicateQuestion}
                  onDelete={handleDeleteQuestion}
                  onSaveToBank={handleSaveToBank}
                  theme={theme}
                  showValidation={validationErrors.length > 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* Floating Bottom Action Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#1A1E2B]/95 backdrop-blur-md border border-slate-200/90 dark:border-white/15 rounded-2xl shadow-xl px-3 py-2 flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => handleAddQuestion("MULTIPLE_CHOICE")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Question</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddQuestion("SECTION_HEADER")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          title="Add Section Divider / Heading"
        >
          <Heading className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Add Section</span>
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />

        <button
          type="button"
          onClick={() => setShowBankDrawer(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          title="Insert from Question Bank"
        >
          <Bookmark className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">From Bank</span>
        </button>

        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
          title="Draft Questions with AI"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      </div>

      {/* Settings Modal */}
      <FormSettingsPanel
        form={form}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        theme={theme}
      />

      {/* Question Bank Drawer */}
      <QuestionBankDrawer
        isOpen={showBankDrawer}
        onClose={() => setShowBankDrawer(false)}
        onImport={handleImportFromBank}
        courseId={courseId}
        theme={theme}
      />

      {/* AI Question Assistant Modal */}
      <AiQuestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onInsertQuestions={handleInsertAiQuestions}
        courseId={courseId}
        theme={theme}
      />
    </div>
  );
}
