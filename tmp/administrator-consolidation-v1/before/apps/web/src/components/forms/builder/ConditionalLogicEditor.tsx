"use client";

import { GitBranch, X } from "lucide-react";
import type { FormQuestionData } from "@/types/forms";

interface ConditionalLogicEditorProps {
  currentQuestionId: string;
  previousQuestions: FormQuestionData[];
  showIfQuestionId?: string | null;
  showIfAnswer?: string | null;
  onChange: (rule: { showIfQuestionId: string | null; showIfAnswer: string | null }) => void;
}

export default function ConditionalLogicEditor({
  currentQuestionId,
  previousQuestions,
  showIfQuestionId,
  showIfAnswer,
  onChange,
}: ConditionalLogicEditorProps) {
  // Only questions before this one that have options can be branch triggers
  const validTriggers = previousQuestions.filter(
    (q) =>
      q.id !== currentQuestionId &&
      q.questionType !== "SECTION_HEADER" &&
      ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "SHORT_ANSWER"].includes(q.questionType)
  );

  const activeTrigger = validTriggers.find((q) => q.id === showIfQuestionId);
  const options = activeTrigger?.config?.options || [];

  return (
    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/30 text-xs space-y-2.5">
      <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branching & Conditional Visibility</span>
        </div>
        {showIfQuestionId && (
          <button
            type="button"
            onClick={() => onChange({ showIfQuestionId: null, showIfAnswer: null })}
            className="text-[11px] text-slate-500 hover:text-rose-500 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Clear rule</span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-600 dark:text-[#8B92A5]">
        Only display this question when the respondent selects a specific answer on a prior question.
      </p>

      {validTriggers.length === 0 ? (
        <div className="text-[11px] text-slate-400 italic">
          No eligible prior questions found. Add a multiple choice or checkbox question above first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
              If respondent answers:
            </label>
            <select
              value={showIfQuestionId || ""}
              onChange={(e) => {
                const qId = e.target.value || null;
                const nextQ = validTriggers.find((q) => q.id === qId);
                const firstOpt = nextQ?.config?.options?.[0]?.id || "";
                onChange({
                  showIfQuestionId: qId,
                  showIfAnswer: firstOpt,
                });
              }}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
            >
              <option value="">-- Always Show (No condition) --</option>
              {validTriggers.map((q, idx) => (
                <option key={q.id} value={q.id}>
                  Q{idx + 1}: {q.prompt.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>

          {showIfQuestionId && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                Equals specific answer:
              </label>
              {options.length > 0 ? (
                <select
                  value={showIfAnswer || ""}
                  onChange={(e) =>
                    onChange({
                      showIfQuestionId,
                      showIfAnswer: e.target.value,
                    })
                  }
                  className="w-full text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                >
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.text}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={showIfAnswer || ""}
                  onChange={(e) =>
                    onChange({
                      showIfQuestionId,
                      showIfAnswer: e.target.value,
                    })
                  }
                  placeholder="Expected answer text..."
                  className="w-full text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
