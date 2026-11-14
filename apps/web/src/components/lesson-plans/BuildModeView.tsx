"use client";

import React, { useState } from "react";
import type {
  LessonPlanFormValues,
  LessonPlanFramework,
} from "@/lib/lesson-plans/types";
import { MAX_FIELD_LENGTH } from "@/lib/lesson-plans/rules";
import {
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

interface BuildModeViewProps {
  framework: LessonPlanFramework;
  formValues: LessonPlanFormValues;
  lastSavedAt: string | null;
  onUpdateHeader: (field: keyof LessonPlanFormValues["headers"], value: string) => void;
  onUpdateStage: (stageId: string, value: string) => void;
  onLoadSample: () => void;
  onClearDraft: () => void;
  validationErrors: Record<string, string>;
}

export default function BuildModeView({
  framework,
  formValues,
  lastSavedAt,
  onUpdateHeader,
  onUpdateStage,
  onLoadSample,
  onClearDraft,
  validationErrors,
}: BuildModeViewProps) {
  const [confirmingSample, setConfirmingSample] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  function hasAnyCustomText(): boolean {
    const h = formValues.headers;
    const hasHeader = Boolean(
      h.subject ||
        h.gradeLevel ||
        h.topic ||
        h.learningCompetency ||
        h.learningObjectives ||
        h.materials
    );
    const hasStage = Object.values(formValues.stages).some((v) => Boolean(v?.trim()));
    return hasHeader || hasStage;
  }

  function handleSampleClick() {
    if (hasAnyCustomText()) {
      setConfirmingSample(true);
    } else {
      onLoadSample();
    }
  }

  function handleClearClick() {
    if (hasAnyCustomText()) {
      setConfirmingClear(true);
    } else {
      onClearDraft();
    }
  }

  return (
    <div className="space-y-6">
      {/* Draft Status & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-theme bg-surface px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Save className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-primary-theme">
            Draft saved on this device only
          </span>
          {lastSavedAt && (
            <span className="text-muted-theme">
              • {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {confirmingSample ? (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 p-1 rounded-lg border border-amber-300 dark:border-amber-700">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 px-1">
                Overwrite draft?
              </span>
              <button
                type="button"
                onClick={() => {
                  setConfirmingSample(false);
                  onLoadSample();
                }}
                className="rounded bg-amber-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer"
              >
                Yes, Load
              </button>
              <button
                type="button"
                onClick={() => setConfirmingSample(false)}
                className="rounded border border-theme px-2 py-0.5 text-xs font-medium text-secondary-theme hover:bg-elevated cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSampleClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme hover:border-blue-400 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Load sample</span>
            </button>
          )}

          {confirmingClear ? (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-lg border border-red-300 dark:border-red-700">
              <span className="text-[11px] font-semibold text-red-800 dark:text-red-200 px-1">
                Clear all fields?
              </span>
              <button
                type="button"
                onClick={() => {
                  setConfirmingClear(false);
                  onClearDraft();
                }}
                className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
              >
                Yes, Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="rounded border border-theme px-2 py-0.5 text-xs font-medium text-secondary-theme hover:bg-elevated cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClearClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1.5 text-xs font-semibold text-secondary-theme hover:text-red-600 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear draft</span>
            </button>
          )}
        </div>
      </div>

      {validationErrors["_total"] && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 text-xs font-semibold text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationErrors["_total"]}</span>
        </div>
      )}

      {/* Section 1: Lesson Header Fields */}
      <div className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-theme pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-theme">
            1. Lesson Information &amp; Context
          </h3>
          <p className="text-xs text-secondary-theme">
            Identify the curriculum topic, grade level, and instructional parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="field-topic"
              className="block text-xs font-semibold text-primary-theme mb-1"
            >
              Topic / Lesson Title <span className="text-red-500">*</span>
            </label>
            <input
              id="field-topic"
              type="text"
              value={formValues.headers.topic}
              onChange={(e) => onUpdateHeader("topic", e.target.value)}
              placeholder="e.g., Plant Roots and Water Absorption"
              className="w-full rounded-xl border border-theme bg-elevated px-3 py-2 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="field-subject"
              className="block text-xs font-semibold text-primary-theme mb-1"
            >
              Subject / Learning Area <span className="text-red-500">*</span>
            </label>
            <input
              id="field-subject"
              type="text"
              value={formValues.headers.subject}
              onChange={(e) => onUpdateHeader("subject", e.target.value)}
              placeholder="e.g., Elementary Science"
              className="w-full rounded-xl border border-theme bg-elevated px-3 py-2 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="field-grade"
              className="block text-xs font-semibold text-primary-theme mb-1"
            >
              Grade / Year Level <span className="text-red-500">*</span>
            </label>
            <input
              id="field-grade"
              type="text"
              value={formValues.headers.gradeLevel}
              onChange={(e) => onUpdateHeader("gradeLevel", e.target.value)}
              placeholder="e.g., Grade 4 / Year 1"
              className="w-full rounded-xl border border-theme bg-elevated px-3 py-2 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="field-date"
              className="block text-xs font-semibold text-primary-theme mb-1"
            >
              Teaching Date
            </label>
            <input
              id="field-date"
              type="date"
              value={formValues.headers.date}
              onChange={(e) => onUpdateHeader("date", e.target.value)}
              className="w-full rounded-xl border border-theme bg-elevated px-3 py-2 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="field-prepared-by"
              className="block text-xs font-semibold text-primary-theme mb-1"
            >
              Prepared By (Pre-Service Teacher Name)
            </label>
            <input
              id="field-prepared-by"
              type="text"
              value={formValues.headers.preparedBy}
              onChange={(e) => onUpdateHeader("preparedBy", e.target.value)}
              placeholder="e.g., Juan Dela Cruz"
              className="w-full rounded-xl border border-theme bg-elevated px-3 py-2 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="field-competency"
                className="text-xs font-semibold text-primary-theme"
              >
                Learning Competency (Curriculum Standard)
              </label>
              <span className="text-[11px] font-mono text-muted-theme">
                {formValues.headers.learningCompetency.length}/{MAX_FIELD_LENGTH}
              </span>
            </div>
            <textarea
              id="field-competency"
              rows={3}
              value={formValues.headers.learningCompetency}
              onChange={(e) => onUpdateHeader("learningCompetency", e.target.value)}
              placeholder="State the curricular standard or official competency code and description..."
              className="w-full rounded-xl border border-theme bg-elevated p-2.5 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="field-objectives"
                className="text-xs font-semibold text-primary-theme"
              >
                Specific Learning Objectives (Measurable Targets)
              </label>
              <span className="text-[11px] font-mono text-muted-theme">
                {formValues.headers.learningObjectives.length}/{MAX_FIELD_LENGTH}
              </span>
            </div>
            <textarea
              id="field-objectives"
              rows={3}
              value={formValues.headers.learningObjectives}
              onChange={(e) => onUpdateHeader("learningObjectives", e.target.value)}
              placeholder="1. By the end of the lesson, learners will...&#10;2. Learners will demonstrate..."
              className="w-full rounded-xl border border-theme bg-elevated p-2.5 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="field-materials"
                className="text-xs font-semibold text-primary-theme"
              >
                Instructional Materials &amp; Resources
              </label>
              <span className="text-[11px] font-mono text-muted-theme">
                {formValues.headers.materials.length}/{MAX_FIELD_LENGTH}
              </span>
            </div>
            <textarea
              id="field-materials"
              rows={2}
              value={formValues.headers.materials}
              onChange={(e) => onUpdateHeader("materials", e.target.value)}
              placeholder="List equipment, worksheets, manipulatives, digital tools, or textbooks..."
              className="w-full rounded-xl border border-theme bg-elevated p-2.5 text-xs text-primary-theme focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Framework Stages Form */}
      <div className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-6">
        <div className="border-b border-theme pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-theme">
            2. Instructional Procedure ({framework.name})
          </h3>
          <p className="text-xs text-secondary-theme">
            Draft your step-by-step procedure according to each stage of the {framework.name}.
          </p>
        </div>

        <div className="space-y-6">
          {framework.stages.map((stage, idx) => {
            const content = formValues.stages[stage.id] ?? "";
            const currentLen = content.length;
            const isOver = currentLen > MAX_FIELD_LENGTH;
            const errorMsg = validationErrors[`stage_${stage.id}`];

            return (
              <div
                key={stage.id}
                className="rounded-xl border border-theme bg-elevated/30 p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-theme/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-primary-theme">
                      {stage.name}
                    </h4>
                  </div>
                  <span className="text-xs text-muted-theme italic">
                    {stage.purpose}
                  </span>
                </div>

                {/* Helper Box: Guide Questions */}
                <div className="rounded-lg bg-surface border border-theme/80 p-3 space-y-1 text-xs text-secondary-theme">
                  <div className="flex items-center gap-1.5 font-semibold text-primary-theme">
                    <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Guiding Questions for this stage:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-secondary-theme pl-1">
                    {stage.guideQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>

                {/* Stage Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor={`stage-input-${stage.id}`}
                      className="text-xs font-semibold text-primary-theme"
                    >
                      Instructional Procedure Content
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        isOver
                          ? "text-red-600 font-bold"
                          : "text-muted-theme"
                      }`}
                    >
                      {currentLen.toLocaleString()} / {MAX_FIELD_LENGTH.toLocaleString()}
                    </span>
                  </div>

                  <textarea
                    id={`stage-input-${stage.id}`}
                    rows={6}
                    value={content}
                    onChange={(e) => onUpdateStage(stage.id, e.target.value)}
                    placeholder={`Describe teacher actions, learner activities, questions, and formative checks for ${stage.name}...`}
                    className={`w-full rounded-xl border p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 ${
                      isOver
                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-100"
                        : "border-theme bg-surface text-primary-theme focus:border-blue-500 focus:ring-blue-500"
                    } resize-y`}
                  />

                  {errorMsg && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {errorMsg}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

