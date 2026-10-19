"use client";

import { useState } from "react";
import { Plus, X, Image as ImageIcon, Check, MessageSquare, AlertCircle } from "lucide-react";
import type { FormOption, QuestionType } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface OptionEditorProps {
  questionType: QuestionType;
  options: FormOption[];
  onChange: (options: FormOption[]) => void;
  theme?: InstituteTheme;
  showValidation?: boolean;
}

export default function OptionEditor({
  questionType,
  options = [],
  onChange,
  theme,
  showValidation = false,
}: OptionEditorProps) {
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const isSingleChoice = questionType === "MULTIPLE_CHOICE" || questionType === "DROPDOWN" || questionType === "IMAGE_CHOICE";
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleTextChange = (id: string, text: string) => {
    onChange(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleCorrectToggle = (id: string) => {
    if (isSingleChoice) {
      // Radio mode: uncheck others
      onChange(
        options.map((opt) => ({
          ...opt,
          isCorrect: opt.id === id,
        }))
      );
    } else {
      // Checkbox mode: toggle clicked
      onChange(
        options.map((opt) => (opt.id === id ? { ...opt, isCorrect: !opt.isCorrect } : opt))
      );
    }
  };

  const handleFeedbackChange = (id: string, feedback: string) => {
    onChange(options.map((opt) => (opt.id === id ? { ...opt, feedback } : opt)));
  };

  const handleAddOption = () => {
    const newOption: FormOption = {
      id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: "",
      isCorrect: options.length === 0, // make first option correct by default
    };
    onChange([...options, newOption]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 1) return;
    onChange(options.filter((opt) => opt.id !== id));
  };

  return (
    <div className="space-y-2.5 pt-2">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-[#8B92A5] flex items-center justify-between">
        <span>Options & Answer Key</span>
        <span className="text-[10px] font-normal lowercase text-slate-400">
          {isSingleChoice ? "click circle to mark correct" : "check boxes to mark correct"}
        </span>
      </div>

      <div className="space-y-2">
        {options.map((opt, index) => {
          const isCorrect = Boolean(opt.isCorrect);

          return (
            <div key={opt.id} className="space-y-1">
              <div className="flex items-center gap-2.5 group">
                {/* Correct answer indicator / toggle */}
                <button
                  type="button"
                  onClick={() => handleCorrectToggle(opt.id)}
                  title={isCorrect ? "Correct answer" : "Mark as correct answer"}
                  className={`w-5 h-5 shrink-0 flex items-center justify-center transition-all ${
                    isSingleChoice
                      ? `rounded-full border ${
                          isCorrect
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                            : "border-slate-300 dark:border-white/20 hover:border-slate-400 text-transparent"
                        }`
                      : `rounded-md border ${
                          isCorrect
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                            : "border-slate-300 dark:border-white/20 hover:border-slate-400 text-transparent"
                        }`
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                {/* Option text input */}
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleTextChange(opt.id, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className={`flex-1 text-sm bg-transparent border-b px-1 py-1 focus:outline-hidden transition-colors ${
                      showValidation && (!opt.text || !opt.text.trim())
                        ? "border-rose-400 dark:border-rose-500 placeholder:text-rose-400/70 dark:placeholder:text-rose-400/50"
                        : isCorrect
                        ? "border-emerald-500/60 dark:border-emerald-400/50 text-slate-900 dark:text-white font-medium"
                        : "border-slate-200 dark:border-white/10 focus:border-slate-400 text-slate-800 dark:text-slate-200"
                    }`}
                  />
                  {showValidation && (!opt.text || !opt.text.trim()) && (
                    <span className="text-[10px] font-semibold text-rose-500 shrink-0">
                      Cannot be blank
                    </span>
                  )}
                </div>

                {/* Feedback toggle button */}
                <button
                  type="button"
                  onClick={() => setActiveFeedbackId(activeFeedbackId === opt.id ? null : opt.id)}
                  title="Add per-answer feedback"
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    opt.feedback || activeFeedbackId === opt.id
                      ? "text-primary bg-primary/10"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-60 group-hover:opacity-100"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                {/* Delete option button */}
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(opt.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-60 group-hover:opacity-100"
                    title="Remove option"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Per-option feedback input row */}
              {(activeFeedbackId === opt.id || opt.feedback) && (
                <div className="pl-7 pr-2 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={opt.feedback || ""}
                      onChange={(e) => handleFeedbackChange(opt.id, e.target.value)}
                      placeholder="Add explanation/feedback for when student selects this option..."
                      className="flex-1 bg-transparent border-0 focus:outline-hidden text-slate-700 dark:text-slate-300 placeholder:text-slate-400 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add option button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleAddOption}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
          style={{ color: primaryColor }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add option</span>
        </button>
      </div>
    </div>
  );
}
