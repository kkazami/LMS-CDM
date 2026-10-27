"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { validateFormForPublish } from '@/lib/forms/form-validator';
import MobileBlocker from "./MobileBlocker";
import QuestionCard from "./QuestionCard";
import FormSettingsPanel from "./FormSettingsPanel";
import QuestionBankDrawer from "./QuestionBankDrawer";
import AiQuestionModal from "./AiQuestionModal";
import type { FormData, FormQuestionData, QuestionType } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

function scheduleDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

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
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const pendingWrites = useRef(new Set<Promise<Response>>());
  const writeQueue = useRef(Promise.resolve());
  const failedWrites = useRef(new Set<string>());
  const checkedFetch = useCallback((url: string, init?: RequestInit) => {
    const key = url + ':' + (init?.method || 'GET');
    setIsSaving(true);
    const operation = writeQueue.current.then(async () => {
      const response = await fetch(url, init);
      if (!response.ok) {
        const data = await response.clone().json().catch(() => ({}));
        throw new Error(data.message || 'Unable to save this change. Please try again.');
      }
      failedWrites.current.delete(key);
      if (url.includes('/questions') || url.endsWith('/sections')) setForm(prev => ({ ...prev, status: prev.status === 'PUBLISHED' ? 'DRAFT' : prev.status }));
      return response;
    });
    writeQueue.current = operation.then(() => undefined, () => { failedWrites.current.add(key); });
    pendingWrites.current.add(operation);
    const settled = () => { pendingWrites.current.delete(operation); if (!pendingWrites.current.size && !patches.current.size) setIsSaving(false); };
    operation.then(settled, settled);
    return operation;
  }, []);
  const [form, setForm] = useState<FormData>(initialForm);
  const [questions, setQuestions] = useState<FormQuestionData[]>(initialForm.questions || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showBankDrawer, setShowBankDrawer] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dialog, setDialog] = useState<'errors' | 'publish' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const publishing = useRef(false);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef<Promise<boolean> | null>(null);
  const patches = useRef(new Map<string, Record<string, unknown>>());
  const failedPatches = useRef(new Map<string, Record<string, unknown>>());
  const latest = useRef({ form, questions }); latest.current = { form, questions };
  const definitionLocked = Boolean(initialForm._count?.attempts);
  const flushPatches = useCallback((): Promise<boolean> => {
    if (flushing.current) return flushing.current;
    const work = async () => {
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = null;
    do {
      const entries = [...patches.current]; patches.current.clear();
      await Promise.all(entries.map(async ([url, queued]) => {
        const fields = { ...failedPatches.current.get(url), ...queued };
        failedPatches.current.delete(url);
        try {
          await checkedFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
          failedPatches.current.delete(url);
          setLastSaved(new Date());
        } catch (error) {
          failedPatches.current.set(url, { ...fields, ...failedPatches.current.get(url) });
          setLastSaved(null);
          setValidationErrors([error instanceof Error ? error.message : 'Unable to save changes.']);
        }
      }));
      await writeQueue.current;
    } while (patches.current.size);
    if (!failedWrites.current.size) setValidationErrors([]);
    if (!pendingWrites.current.size) setIsSaving(false);
    return !failedWrites.current.size;
    };
    const operation = work(); flushing.current = operation;
    void operation.finally(() => { if (flushing.current === operation) flushing.current = null; });
    return operation;
  }, [checkedFetch]);
  const queuePatch = useCallback((url: string, fields: Record<string, unknown>) => {
    patches.current.set(url, { ...failedPatches.current.get(url), ...patches.current.get(url), ...fields });
    failedPatches.current.delete(url);
    setIsSaving(true);
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(() => { void flushPatches(); }, 500);
  }, [flushPatches]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (patches.current.size || pendingWrites.current.size || failedWrites.current.size) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); if (patchTimer.current) clearTimeout(patchTimer.current); };
  }, []);
  const retryChanges = async () => {
    for (const [url, fields] of failedPatches.current) patches.current.set(url, { ...fields, ...patches.current.get(url) });
    failedPatches.current.clear();
    await flushPatches();
  };
  const navigateSaved = async (url: string) => {
    if (await flushPatches()) router.push(url);
    else setDialog('errors');
  };
  const focusProblem = (message: string) => {
    setDialog(null);
    setTimeout(() => {
      const match = message.match(/Question #(\d+)/i);
      const headers = message.match(/Section Header #(\d+)/i);
      const question = match ? latest.current.questions.filter(q => q.questionType !== 'SECTION_HEADER')[Number(match[1]) - 1] : headers ? latest.current.questions.filter(q => q.questionType === 'SECTION_HEADER')[Number(headers[1]) - 1] : null;
      const target = question ? document.getElementById(`form-question-${question.id}`) : /date|time limit|attempt/i.test(message) ? null : document.getElementById('form-title');
      if (!target) { setShowSettings(true); return; }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (target.querySelector('input') || target).focus({ preventScroll: true });
    }, 60);
  };


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
    if (definitionLocked || isPublishing) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
      ...q,
      position: idx,
    }));

    if (!await flushPatches()) { setDialog('errors'); return; }
    setQuestions(reordered);

    // Sync to backend
    try {
      await checkedFetch(`/api/courses/${courseId}/forms/${form.id}/questions/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((q) => q.id) }),
      });
      setLastSaved(new Date());
    } catch (err) {
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
    }
  };

  // Add a new question
  const handleAddQuestion = async (type: QuestionType = "MULTIPLE_CHOICE") => {
    if (!await flushPatches()) { setDialog('errors'); return; }
    setIsSaving(true);
    try {
      const isHeader = type === "SECTION_HEADER";
      const res = await checkedFetch(`/api/courses/${courseId}/forms/${form.id}/questions`, {
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
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
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

      queuePatch(`/api/courses/${courseId}/forms/${form.id}/questions/${id}`, updates);

    },
    [courseId, form.id, queuePatch]
  );

  // Duplicate question
  const handleDuplicateQuestion = async (id: string) => {
    const target = questions.find((q) => q.id === id);
    if (!target) return;

    if (!await flushPatches()) { setDialog('errors'); return; }
    setIsSaving(true);
    try {
      const res = await checkedFetch(`/api/courses/${courseId}/forms/${form.id}/questions`, {
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
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    if (!await flushPatches()) { setDialog('errors'); return; }
    try {
      await checkedFetch(`/api/courses/${courseId}/forms/${form.id}/questions/${id}`, {
        method: "DELETE",
      });
      setQuestions(prev => prev.filter(q => q.id !== id));
      setLastSaved(new Date());
    } catch (err) {
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
    }
  };

  // Save to question bank
  const handleSaveToBank = async (questionId: string) => {
    if (!await flushPatches()) { setDialog('errors'); return false; }
    try {
      await checkedFetch(`/api/question-bank/from-question/${questionId}`, {
        method: "POST",
      });
      return true;
    } catch (err) {
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
      return false;
    }
  };

  // Import from question bank
  const handleImportFromBank = async (bankItemIds: string[]) => {
    if (!await flushPatches()) throw new Error("Resolve the pending builder changes before importing questions. If a previous insert could not be confirmed, reload to check which questions were saved.");
    try {
      const res = await checkedFetch(`/api/courses/${courseId}/forms/${form.id}/questions/from-bank`, {
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
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
      throw err;
    }
  };

  // AI Insert Questions
  const handleInsertAiQuestions = async (
    newQuestions: Array<Omit<FormQuestionData, "id" | "formId" | "position">>
  ) => {
    if (!await flushPatches()) throw new Error("Resolve the pending builder changes before inserting. If a previous insert could not be confirmed, reload to check which questions were saved before inserting again.");
    for (const q of newQuestions) {
      try {
        const res = await checkedFetch(`/api/courses/${courseId}/forms/${form.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
        const data = await res.json();
        if (data.question) {
          setQuestions((prev) => [...prev, data.question]);
        }
      } catch (err) {
        setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
        throw new Error("The insert could not be completed. Some questions may already be saved. Keep your draft and reload the builder to check before inserting again.");
      }
    }
    setLastSaved(new Date());
  };

  // Update Form Settings
  const handleSaveSettings = async (updates: Partial<FormData> & { password?: string }) => {
    const url = `/api/courses/${courseId}/forms/${form.id}`;
    // Retrying this modal's settings request is safe; retain unrelated failed edits.
    if (!failedPatches.current.has(url)) failedWrites.current.delete(url + ':PATCH');
    if (!await flushPatches()) throw new Error("Save or retry the pending changes before updating settings.");
    const res = await checkedFetch(`/api/courses/${courseId}/forms/${form.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
    const data = await res.json();
    setForm(prev => {
      const selected = Object.fromEntries(Object.keys(updates).filter(key => key !== 'password').map(key => [key, data.form[key]]));
      return { ...prev, ...selected, hasPassword: data.form.hasPassword };
    });
    setLastSaved(new Date());
  };

  // Publish Form
  const handlePublish = async () => {
    if (publishing.current) return;
    publishing.current = true;
    setDialog(null);
    setIsPublishing(true);
    if (!await flushPatches()) {
      setDialog('errors'); setIsPublishing(false); publishing.current = false; return;
    }
    const current = latest.current;
    const clientErrors = validateFormForPublish({ ...current.form, questions: current.questions }).errors;
    if (current.form.closesAt && new Date(current.form.closesAt) <= new Date()) clientErrors.push('The due date has passed. Choose a future due date in Settings.');
    if (clientErrors.length) {
      setValidationErrors(clientErrors); setDialog('errors'); setIsPublishing(false); publishing.current = false; return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationErrors(data.errors || [data.message || "Failed to publish."]);
        setDialog("errors");
      } else {
        setForm((prev) => ({ ...prev, status: "PUBLISHED" }));
        router.push(`/${instituteCode}/courses/${courseId}/classwork`);
        router.refresh();
      }
    } catch (err) {
      setLastSaved(null);
      setValidationErrors([err instanceof Error ? err.message : "Unable to save. Try again."]);
      setValidationErrors(["Publishing could not be confirmed. Your draft is saved; retry publishing to check its status."]);
      setDialog("errors");
    } finally {
      publishing.current = false;
      setIsPublishing(false);
    }
  };

  return (
    <div data-form-builder-ready={ready ? "true" : "false"} className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] pb-32">
      {/* Mobile creation blocker */}
      <MobileBlocker theme={theme} />

      {/* Top Sticky Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" disabled={!ready || isPublishing}
              onClick={() => void navigateSaved(`/${instituteCode}/courses/${courseId}/classwork`)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Back to Classwork"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <input
                  id="form-title" aria-label="Assessment title" maxLength={300} disabled={!ready || isPublishing}
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setForm((prev) => ({ ...prev, title: nextTitle }));
                    queuePatch(`/api/courses/${courseId}/forms/${form.id}`, { title: nextTitle });
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
                {validationErrors.length ? "Changes need attention" : isSaving ? "Saving changes..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "All changes saved"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" disabled={!ready || isPublishing}
              onClick={() => void navigateSaved(`/${instituteCode}/courses/${courseId}/classwork/forms/${form.id}/preview`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button
              type="button"
              disabled={!ready || isPublishing} onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setDialog('publish')}
              disabled={!ready || isPublishing}
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
        <section aria-label="Assessment setup guide" className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12151E] p-5 text-sm text-slate-700 dark:text-slate-200 space-y-3">
          <h2 className="font-bold">Prepare your assessment</h2>
          <ol className="list-decimal pl-5 space-y-1"><li>Write questions, add choices, and mark the correct answers.</li><li>Open Settings to choose the start date, due date, timer, and result visibility.</li><li>Preview the student experience, then Publish.</li></ol>
          <p>{form.opensAt ? `After publishing, students see the title immediately. Questions open ${scheduleDate(form.opensAt)} (Philippine time).` : 'After publishing, students can open the questions immediately. Set a future start date in Settings to schedule them.'} The timer starts when the student chooses Start assessment and ends no later than the due date.</p>
          {definitionLocked ? <p className="font-medium">Students have started. Questions are locked to preserve their work. You can still manage the deadline and result visibility in Settings.</p> : <p>Question edits are saved as a draft. Publish again when your changes are ready for students.</p>}
          <button type="button" disabled={!ready || isPublishing} onClick={() => setShowSettings(true)} className="rounded-lg px-4 py-2 text-white font-semibold" style={{backgroundColor: primaryColor}}>Review schedule & settings</button>
        </section>
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
              aria-label="Assessment instructions" disabled={!ready || isPublishing}
              rows={2}
              value={form.description}
              onChange={(e) => {
                const nextDesc = e.target.value;
                setForm((prev) => ({ ...prev, description: nextDesc }));
                queuePatch(`/api/courses/${courseId}/forms/${form.id}`, { description: nextDesc });
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
        <fieldset disabled={!ready || isPublishing || definitionLocked} className="min-w-0 space-y-4 disabled:opacity-70">
        <DndContext
          id={`form-builder-${form.id}`}
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
                  onDelete={setDeleteId}
                  onSaveToBank={handleSaveToBank}
                  theme={theme}
                  showValidation={validationErrors.length > 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        </fieldset>
      </main>

      {/* Floating Bottom Action Toolbar */}
      <fieldset disabled={!ready || isPublishing || definitionLocked || isSaving} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#1A1E2B]/95 backdrop-blur-md border border-slate-200/90 dark:border-white/15 rounded-2xl shadow-xl px-3 py-2 flex items-center gap-1 sm:gap-2">
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
      </fieldset>

      {validationErrors.length > 0 && <div role="alert" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[min(90vw,42rem)] rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 p-4 text-sm text-red-800 dark:text-red-100 shadow-xl">
        <p>{validationErrors[0]}</p><div className="mt-2 flex gap-4"><button type="button" onClick={() => setDialog('errors')} className="underline font-semibold">Show details</button>{failedPatches.current.size > 0 && <button type="button" disabled={isSaving} onClick={() => void retryChanges()} className="underline font-semibold">Retry saving</button>}</div>
      </div>}
      {dialog && <ConfirmDialog title={dialog === 'publish' ? 'Publish this assessment?' : 'Check this before publishing'} description={dialog === 'publish' ? (form.opensAt && new Date(form.opensAt) > new Date() ? `Students will see a scheduled notice now. Questions open ${scheduleDate(form.opensAt)} (Philippine time).` : 'Eligible students can access the questions immediately. Their timer starts only when they start an attempt.') : 'Choose an issue to go to the question or setting that needs attention. Your unsaved answers stay in this builder.'} onClose={() => setDialog(null)}>
        {dialog === 'errors' && <ul className="max-h-[45vh] overflow-y-auto space-y-2 mb-4">{validationErrors.map((message, index) => <li key={index}><button type="button" className="text-left text-sm underline" onClick={() => focusProblem(message)}>{message}</button></li>)}{failedWrites.current.size > failedPatches.current.size && <li className="text-sm">An action could not be confirmed. Keep a copy of your edits and reload to check whether it completed.</li>}</ul>}
        <div className="flex justify-end gap-3"><button type="button" className="rounded-lg px-4 py-2 border border-slate-300 dark:border-slate-600" onClick={() => setDialog(null)}>{dialog === 'publish' ? 'Keep editing' : 'Got it'}</button>{dialog === 'publish' && <button type="button" onClick={() => void handlePublish()} className="rounded-lg px-4 py-2 text-white font-semibold" style={{backgroundColor: primaryColor}}>Publish assessment</button>}</div>
      </ConfirmDialog>}
      {deleteId && <ConfirmDialog title="Delete this question?" description="This removes the question from your draft. The change cannot be undone." onClose={() => setDeleteId(null)}><div className="flex justify-end gap-3"><button type="button" onClick={() => setDeleteId(null)}>Cancel</button><button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-white" onClick={() => { const id = deleteId; setDeleteId(null); void handleDeleteQuestion(id); }}>Delete question</button></div></ConfirmDialog>}
      {/* Settings Modal */}
      {showSettings && <FormSettingsPanel
        form={form}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        theme={theme}
      />}

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
