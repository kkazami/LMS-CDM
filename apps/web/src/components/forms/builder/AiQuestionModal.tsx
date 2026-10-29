"use client";

import { useState, useRef } from "react";
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { X, Sparkles, Loader2, Check, Plus } from "lucide-react";
import type { FormQuestionData, QuestionType } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface AiQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertQuestions: (questions: Array<Omit<FormQuestionData, "id" | "formId" | "position">>) => Promise<void>;
  courseId: string;
  theme?: InstituteTheme;
}

export default function AiQuestionModal({
  isOpen,
  onClose,
  onInsertQuestions,
  courseId,
  theme,
}: AiQuestionModalProps) {
  const [content, setContent] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    "MULTIPLE_CHOICE",
    "CHECKBOXES",
    "SHORT_ANSWER",
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    Array<Omit<FormQuestionData, "id" | "formId" | "position">>
  >([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isInserting, setIsInserting] = useState(false);

  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const close = () => { if (!isGenerating && !isInserting) onClose(); };
  useDialogA11y(isOpen, close, panel);
  if (!isOpen) return null;

  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleGenerate = async () => {
    if (!content.trim()) return;
    if (isGenerating || isInserting) return;
    setError(''); setIsGenerating(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/forms/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentOrTopic: content.trim(),
          count,
          difficulty,
          questionTypes: selectedTypes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to generate questions. Try again.');
      if (data.questions) {
        setGeneratedQuestions(data.questions);
        setSelectedIndices(data.questions.map((_: unknown, i: number) => i));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request could not be completed. Your draft is kept.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleQuestion = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleInsert = async () => {
    const toInsert = generatedQuestions.filter((_, idx) => selectedIndices.includes(idx));
    if (toInsert.length === 0) return;

    if (isInserting) return;
    setError(''); setIsInserting(true);
    try {
      await onInsertQuestions(toInsert);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request could not be completed. Your draft is kept.');
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div ref={panel} role="dialog" aria-modal="true" aria-label="AI Question Assistant" tabIndex={-1} className="relative w-full max-w-2xl bg-white dark:bg-[#12151E] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {error && <p role="alert" className="p-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                AI Question Assistant
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                Generate assessment questions directly from your lecture notes or lesson topic
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close AI question assistant" disabled={isGenerating || isInserting} onClick={close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {generatedQuestions.length === 0 ? (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
                  Lesson topic, lecture text, or syllabus objectives:
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste lecture notes, study guide, or topic description here (e.g. 'Binary Search Trees: insertion, traversal algorithms, and time complexities...')"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Number of questions:
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Difficulty level:
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  >
                    <option value="EASY">Beginner / Easy</option>
                    <option value="MEDIUM">Standard / Medium</option>
                    <option value="HARD">Challenging / Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Generated Questions ({selectedIndices.length} of {generatedQuestions.length} selected):
                </span>
                <button
                  type="button"
                  onClick={() => setGeneratedQuestions([])}
                  className="text-primary hover:underline"
                >
                  Regenerate / Edit prompt
                </button>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {generatedQuestions.map((q, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleQuestion(idx)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/20 dark:bg-purple-950/20"
                          : "border-slate-200 dark:border-white/10 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            {q.questionType.replace("_", " ")}
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white pt-0.5">
                            {q.prompt}
                          </p>
                          {q.config?.options && (
                            <ul className="list-disc list-inside text-[11px] text-slate-500 pt-1 space-y-0.5">
                              {q.config.options.map((opt) => (
                                <li key={opt.id} className={opt.isCorrect ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                                  {opt.text} {opt.isCorrect && "✓"}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "border-slate-300 dark:border-white/20 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          <button
            type="button"
            aria-label="Close AI question assistant" disabled={isGenerating || isInserting} onClick={close}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          {generatedQuestions.length === 0 ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !content.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? "Drafting Questions..." : "Generate Questions"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInsert}
              disabled={selectedIndices.length === 0 || isInserting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isInserting ? "Adding..." : `Insert ${selectedIndices.length} Questions`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
