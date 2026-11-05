"use client";

import React, { useState } from "react";
import type { LessonPlanFramework } from "@/lib/lesson-plans/types";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  Lightbulb,
  PenTool,
  Printer,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

interface LearnModeViewProps {
  framework: LessonPlanFramework;
  onSwitchToBuild: (loadSample?: boolean) => void;
  onPrintSample: () => void;
}

export default function LearnModeView({
  framework,
  onSwitchToBuild,
  onPrintSample,
}: LearnModeViewProps) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [showSamplePlan, setShowSamplePlan] = useState(false);

  const activeStage = framework.stages[activeStageIndex] ?? framework.stages[0]!;

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/15 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Pedagogical Guide • {framework.name}</span>
            </span>
          </div>
          <p className="text-xs text-secondary-theme leading-relaxed max-w-2xl">
            {framework.originNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onPrintSample}
            title="Print or Save as PDF the annotated exemplar for this framework"
            className="inline-flex items-center gap-2 rounded-xl border border-theme bg-surface px-3.5 py-2 text-xs font-semibold text-secondary-theme hover:text-primary-theme hover:bg-elevated cursor-pointer shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Print Exemplar</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchToBuild(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Open in Builder</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchToBuild(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-surface px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs transition hover:bg-elevated cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Load Sample into Builder</span>
          </button>
        </div>
      </div>

      {/* Stage Stepper Tabs */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-theme">
          Step-by-Step Instructional Sequence
        </h4>
        <div
          role="tablist"
          aria-label="Framework stages"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
        >
          {framework.stages.map((stage, idx) => {
            const isCurrent = idx === activeStageIndex;
            return (
              <button
                key={stage.id}
                role="tab"
                id={`stage-tab-${stage.id}`}
                aria-selected={isCurrent}
                aria-controls={`stage-panel-${stage.id}`}
                type="button"
                onClick={() => setActiveStageIndex(idx)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? "border-blue-500 bg-surface ring-2 ring-blue-500/20 shadow-xs"
                    : "border-theme bg-surface/70 hover:bg-elevated hover:border-theme/80"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-muted-theme">
                  <span>Stage {idx + 1}</span>
                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <div
                  className={`mt-1 text-xs font-bold line-clamp-1 ${
                    isCurrent
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-primary-theme"
                  }`}
                >
                  {stage.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Stage Detailed Card */}
      <div
        id={`stage-panel-${activeStage.id}`}
        role="tabpanel"
        aria-labelledby={`stage-tab-${activeStage.id}`}
        className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Stage {activeStageIndex + 1} of {framework.stages.length}
            </div>
            <h3 className="mt-0.5 text-xl font-extrabold text-primary-theme">
              {activeStage.name}
            </h3>
          </div>
          <div className="text-xs text-secondary-theme">
            <span>{framework.name}</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/25 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Pedagogical Purpose
          </div>
          <p className="mt-1 text-sm text-primary-theme leading-relaxed font-medium">
            {activeStage.purpose}
          </p>
        </div>

        {/* Teacher Does & Learners Do Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-theme bg-elevated/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary-theme">
              <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>What the Teacher Does</span>
            </div>
            <ul className="space-y-1.5 text-xs text-secondary-theme leading-relaxed">
              {activeStage.teacherDoes.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-theme bg-elevated/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary-theme">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>What the Learners Do</span>
            </div>
            <ul className="space-y-1.5 text-xs text-secondary-theme leading-relaxed">
              {activeStage.learnersDo.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Writing Tip & Guide Questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span>Lesson Plan Writing Tip</span>
            </div>
            <p className="text-xs text-secondary-theme leading-relaxed">
              {activeStage.writingTip}
            </p>
          </div>

          <div className="rounded-xl border border-theme bg-elevated/60 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary-theme">
              <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Guiding Reflection Questions</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-secondary-theme leading-relaxed">
              {activeStage.guideQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Annotated Practice Sample Plan Section */}
      <div className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-primary-theme">
                Annotated Exemplar Plan (Sample for Practice)
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-secondary-theme">
              Topic: <strong>{framework.samplePlan.topic}</strong> •{" "}
              {framework.samplePlan.gradeLevel} {framework.samplePlan.subject}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrintSample}
              className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-3 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Exemplar</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSamplePlan(!showSamplePlan)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-3 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme cursor-pointer"
            >
              <span>{showSamplePlan ? "Collapse Exemplar" : "Expand Exemplar"}</span>
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${
                  showSamplePlan ? "rotate-90" : ""
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => onSwitchToBuild(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>Load this into Builder</span>
            </button>
          </div>
        </div>

        {showSamplePlan && (
          <div className="space-y-4 border-t border-theme pt-4">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-theme bg-elevated/40 p-4 text-xs">
              <div>
                <span className="font-semibold text-muted-theme">Learning Competency:</span>
                <p className="mt-0.5 text-primary-theme font-medium">
                  {framework.samplePlan.learningCompetency}
                </p>
              </div>
              <div>
                <span className="font-semibold text-muted-theme">Learning Objectives:</span>
                <p className="mt-0.5 text-primary-theme font-medium whitespace-pre-line">
                  {framework.samplePlan.learningObjectives}
                </p>
              </div>
              <div>
                <span className="font-semibold text-muted-theme">Materials:</span>
                <p className="mt-0.5 text-primary-theme font-medium">
                  {framework.samplePlan.materials}
                </p>
              </div>
            </div>

            {/* Stages */}
            <div className="space-y-3">
              {framework.samplePlan.sections.map((sec, i) => (
                <div
                  key={sec.stageId}
                  className="rounded-xl border border-theme bg-surface p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Stage {i + 1}: {sec.stageName}
                    </span>
                  </div>
                  <div className="rounded-lg bg-elevated/60 p-3 text-xs text-primary-theme whitespace-pre-line font-mono leading-relaxed">
                    {sec.content}
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-500/25">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      <strong>Why it&apos;s written this way:</strong> {sec.annotation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

