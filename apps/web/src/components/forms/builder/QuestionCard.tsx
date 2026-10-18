"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Copy,
  Trash2,
  BookmarkPlus,
  GitBranch,
  Image as ImageIcon,
  HelpCircle,
  Code,
  FileUp,
  Sliders,
  Settings2,
} from "lucide-react";
import QuestionTypeMenu from "./QuestionTypeMenu";
import OptionEditor from "./OptionEditor";
import ConditionalLogicEditor from "./ConditionalLogicEditor";
import type { FormOption, FormQuestionData, QuestionConfig, QuestionType } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface QuestionCardProps {
  question: FormQuestionData;
  index: number;
  allQuestions: FormQuestionData[];
  onUpdate: (id: string, updates: Partial<FormQuestionData>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveToBank: (id: string) => void;
  theme?: InstituteTheme;
  showValidation?: boolean;
}

export default function QuestionCard({
  question,
  index,
  allQuestions,
  onUpdate,
  onDuplicate,
  onDelete,
  onSaveToBank,
  theme,
  showValidation = false,
}: QuestionCardProps) {
  const [showDescription, setShowDescription] = useState(Boolean(question.description));
  const [showLogic, setShowLogic] = useState(Boolean(question.showIfQuestionId));
  const [isSavedToBank, setIsSavedToBank] = useState(Boolean(question.bankItemId));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const primaryColor = theme?.colors?.primary || "#3B82F6";
  const config = question.config || {};
  const isHeader = question.questionType === "SECTION_HEADER";

  const handleConfigUpdate = (key: string, val: unknown) => {
    onUpdate(question.id, {
      config: {
        ...config,
        [key]: val,
      },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-2xl bg-white dark:bg-[#12151E] border transition-all duration-200 ${
        isDragging
          ? "shadow-2xl ring-2 ring-primary border-primary z-30"
          : "border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs"
      }`}
    >
      {/* Top Drag Handle Accent */}
      <div className="flex items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing text-slate-300 dark:text-white/20 hover:text-slate-500 dark:hover:text-white/50 transition-colors" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5 rotate-90" />
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {/* Header: Prompt input + Type selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 w-full space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 select-none">
                {isHeader ? "Section Header" : `Q${index + 1}`}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  value={question.prompt}
                  onChange={(e) => onUpdate(question.id, { prompt: e.target.value })}
                  placeholder={isHeader ? "Section Title" : "Untitled Question"}
                  className={`w-full text-base font-semibold text-slate-900 dark:text-white bg-transparent border-b ${
                    showValidation && (!question.prompt || !question.prompt.trim())
                      ? "border-rose-400 dark:border-rose-500 placeholder:text-rose-400/70 dark:placeholder:text-rose-400/50"
                      : "border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-primary"
                  } focus:outline-hidden py-1 px-1 transition-colors`}
                />
                {showValidation && (!question.prompt || !question.prompt.trim()) && (
                  <p className="text-[11px] text-rose-500 font-medium pl-1 pt-0.5">
                    {isHeader ? "Section title cannot be blank" : "Question title cannot be blank"}
                  </p>
                )}
              </div>
            </div>

            {/* Optional sub-description */}
            {showDescription && (
              <input
                type="text"
                value={question.description || ""}
                onChange={(e) => onUpdate(question.id, { description: e.target.value })}
                placeholder="Description or instruction text (optional)..."
                className="w-full text-xs text-slate-500 dark:text-[#8B92A5] bg-transparent border-b border-transparent focus:border-slate-300 dark:focus:border-white/10 focus:outline-hidden py-0.5 px-1"
              />
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
            <QuestionTypeMenu
              value={question.questionType}
              onChange={(nextType) => {
                onUpdate(question.id, {
                  questionType: nextType,
                  points: nextType === "SECTION_HEADER" ? 0 : question.points || 1,
                  config: nextType === "MULTIPLE_CHOICE" || nextType === "CHECKBOXES" || nextType === "DROPDOWN" || nextType === "IMAGE_CHOICE"
                    ? { options: config.options || [{ id: "opt_1", text: "", isCorrect: true }, { id: "opt_2", text: "", isCorrect: false }] }
                    : config,
                });
              }}
            />
          </div>
        </div>

        {/* Media attachment display if present */}
        {question.mediaUrl && (
          <div className="relative rounded-xl overflow-hidden max-h-64 border border-slate-200 dark:border-white/10">
            {question.mediaType === "IMAGE" && (
              <img src={question.mediaUrl} alt="Question media" className="w-full object-cover max-h-64" />
            )}
            {question.mediaType === "VIDEO" && (
              <video src={question.mediaUrl} controls className="w-full max-h-64" />
            )}
          </div>
        )}

        {/* Question Type Body Customizer */}
        <div className="pt-1">
          {/* Choice Types */}
          {["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "IMAGE_CHOICE"].includes(question.questionType) && (
            <OptionEditor
              questionType={question.questionType}
              options={config.options || []}
              onChange={(newOptions) => handleConfigUpdate("options", newOptions)}
              theme={theme}
              showValidation={showValidation}
            />
          )}

          {/* Short Answer */}
          {question.questionType === "SHORT_ANSWER" && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Correct Answer Criteria:
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={(config.shortAnswer?.correctAnswers || []).join(", ")}
                  onChange={(e) => {
                    const answers = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    handleConfigUpdate("shortAnswer", {
                      ...config.shortAnswer,
                      correctAnswers: answers,
                    });
                  }}
                  placeholder="e.g. Mitochondria, mitochondria (comma-separated accepted answers)"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-[#8B92A5]">
                  <input
                    type="checkbox"
                    checked={Boolean(config.shortAnswer?.caseSensitive)}
                    onChange={(e) =>
                      handleConfigUpdate("shortAnswer", {
                        ...config.shortAnswer,
                        caseSensitive: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-primary"
                  />
                  <span>Require exact case matching</span>
                </label>
              </div>
            </div>
          )}

          {/* Paragraph */}
          {question.questionType === "PARAGRAPH" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-[#8B92A5] italic">
              Long-answer text response. Graded manually by instructor during response review.
            </div>
          )}

          {/* Linear Scale */}
          {question.questionType === "LINEAR_SCALE" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Scale range:</span>
                <select
                  value={config.linearScale?.min ?? 1}
                  onChange={(e) =>
                    handleConfigUpdate("linearScale", {
                      ...config.linearScale,
                      min: Number(e.target.value),
                    })
                  }
                  className="py-1 px-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </select>
                <span>to</span>
                <select
                  value={config.linearScale?.max ?? 5}
                  onChange={(e) =>
                    handleConfigUpdate("linearScale", {
                      ...config.linearScale,
                      max: Number(e.target.value),
                    })
                  }
                  className="py-1 px-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Low label (e.g. Strongly Disagree)"
                  value={config.linearScale?.minLabel || ""}
                  onChange={(e) =>
                    handleConfigUpdate("linearScale", {
                      ...config.linearScale,
                      minLabel: e.target.value,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
                />
                <input
                  type="text"
                  placeholder="High label (e.g. Strongly Agree)"
                  value={config.linearScale?.maxLabel || ""}
                  onChange={(e) =>
                    handleConfigUpdate("linearScale", {
                      ...config.linearScale,
                      maxLabel: e.target.value,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
                />
              </div>
            </div>
          )}

          {/* Star Rating */}
          {question.questionType === "STAR_RATING" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs flex items-center gap-3">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Stars count:</span>
              <select
                value={config.starRating?.maxStars ?? 5}
                onChange={(e) =>
                  handleConfigUpdate("starRating", {
                    maxStars: Number(e.target.value),
                  })
                }
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
              >
                <option value={3}>3 Stars</option>
                <option value={5}>5 Stars</option>
                <option value={10}>10 Stars</option>
              </select>
            </div>
          )}

          {/* Matrix / Grid */}
          {question.questionType === "MATRIX" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Rows (items to evaluate):
                  </div>
                  <textarea
                    rows={3}
                    value={(config.matrix?.rows || ["Item 1", "Item 2"]).join("\n")}
                    onChange={(e) =>
                      handleConfigUpdate("matrix", {
                        ...config.matrix,
                        rows: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    placeholder="Row per line..."
                    className="w-full p-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>
                <div>
                  <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Columns (evaluation scales):
                  </div>
                  <textarea
                    rows={3}
                    value={(config.matrix?.columns || ["Poor", "Average", "Excellent"]).join("\n")}
                    onChange={(e) =>
                      handleConfigUpdate("matrix", {
                        ...config.matrix,
                        columns: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    placeholder="Column scale per line..."
                    className="w-full p-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ranking */}
          {question.questionType === "RANKING" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs space-y-2">
              <div className="font-semibold text-slate-600 dark:text-slate-300">
                Items to Rank (one per line):
              </div>
              <textarea
                rows={3}
                value={(config.ranking?.items || [{ id: "1", text: "Item A" }, { id: "2", text: "Item B" }])
                  .map((i) => i.text)
                  .join("\n")}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").filter(Boolean);
                  handleConfigUpdate("ranking", {
                    items: lines.map((text, idx) => ({ id: `rank_${idx + 1}`, text })),
                  });
                }}
                className="w-full p-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs font-mono"
              />
            </div>
          )}

          {/* Code Answer */}
          {question.questionType === "CODE_ANSWER" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Language:</span>
                <select
                  value={config.codeAnswer?.language || "javascript"}
                  onChange={(e) =>
                    handleConfigUpdate("codeAnswer", {
                      ...config.codeAnswer,
                      language: e.target.value,
                    })
                  }
                  className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
                >
                  <option value="javascript">JavaScript / TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={config.codeAnswer?.starterCode || ""}
                onChange={(e) =>
                  handleConfigUpdate("codeAnswer", {
                    ...config.codeAnswer,
                    starterCode: e.target.value,
                  })
                }
                placeholder="// Optional starter code for the student..."
                className="w-full p-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs font-mono"
              />
            </div>
          )}

          {/* File Upload */}
          {question.questionType === "FILE_UPLOAD" && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Max size:</span>
                <select
                  value={config.fileUpload?.maxMb ?? 10}
                  onChange={(e) =>
                    handleConfigUpdate("fileUpload", {
                      ...config.fileUpload,
                      maxMb: Number(e.target.value),
                    })
                  }
                  className="py-1 px-2 rounded-lg bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-xs"
                >
                  <option value={5}>5 MB</option>
                  <option value={10}>10 MB</option>
                  <option value={25}>25 MB</option>
                  <option value={50}>50 MB</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Conditional Logic Drawer if active */}
        {showLogic && (
          <ConditionalLogicEditor
            currentQuestionId={question.id}
            previousQuestions={allQuestions.slice(0, index)}
            showIfQuestionId={question.showIfQuestionId}
            showIfAnswer={question.showIfAnswer}
            onChange={({ showIfQuestionId, showIfAnswer }) =>
              onUpdate(question.id, { showIfQuestionId, showIfAnswer })
            }
          />
        )}

        {/* Bottom Toolbar */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {/* Points input */}
            {!isHeader && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-semibold uppercase">Points:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={question.points}
                  onChange={(e) => onUpdate(question.id, { points: Number(e.target.value) || 0 })}
                  className="w-14 py-1 px-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center"
                />
              </div>
            )}

            {/* Partial credit toggle for checkboxes */}
            {question.questionType === "CHECKBOXES" && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-[#8B92A5] text-[11px]">
                <input
                  type="checkbox"
                  checked={question.partialCredit}
                  onChange={(e) => onUpdate(question.id, { partialCredit: e.target.checked })}
                  className="rounded border-slate-300 text-primary"
                />
                <span>Partial credit</span>
              </label>
            )}

            {/* Description toggle */}
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className={`text-[11px] font-medium transition-colors ${
                showDescription ? "text-primary font-semibold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {showDescription ? "Hide hint" : "+ Add hint"}
            </button>

            {/* Branching logic button */}
            {!isHeader && (
              <button
                type="button"
                onClick={() => setShowLogic(!showLogic)}
                className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  question.showIfQuestionId || showLogic
                    ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Logic</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Required Toggle */}
            {!isHeader && (
              <label className="flex items-center gap-2 cursor-pointer select-none border-r border-slate-200 dark:border-white/10 pr-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Required</span>
                <input
                  type="checkbox"
                  checked={question.isRequired}
                  onChange={(e) => onUpdate(question.id, { isRequired: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-primary relative" style={{ backgroundColor: question.isRequired ? primaryColor : undefined }}></div>
              </label>
            )}

            {/* Save to Bank */}
            <button
              type="button"
              onClick={() => {
                onSaveToBank(question.id);
                setIsSavedToBank(true);
              }}
              title="Save to Question Bank"
              className={`p-1.5 rounded-lg transition-colors ${
                isSavedToBank
                  ? "text-emerald-500 bg-emerald-500/10"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => onDuplicate(question.id)}
              title="Duplicate question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(question.id)}
              title="Delete question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
