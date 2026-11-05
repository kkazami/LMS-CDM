"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import type {
  FrameworkId,
  LessonPlanFormValues,
} from "@/lib/lesson-plans/types";
import { FRAMEWORKS, getFrameworkById } from "@/lib/lesson-plans/data";
import {
  buildPlanText,
  generateFilenameSlug,
  getDraftStorageKey,
  serializeDraft,
  deserializeDraft,
  validatePlan,
  buildPrintablePlanData,
  type PrintablePlanData,
} from "@/lib/lesson-plans/rules";
import FrameworkPicker from "./FrameworkPicker";
import LearnModeView from "./LearnModeView";
import BuildModeView from "./BuildModeView";
import LivePreviewPane from "./LivePreviewPane";
import LessonPlanPrintPortal from "./LessonPlanPrintPortal";
import { BookOpen, Eye, GraduationCap, PenTool } from "lucide-react";

interface LessonPlanBuilderClientProps {
  studentName: string;
  programCode: string;
  programName?: string;
}

export default function LessonPlanBuilderClient({
  studentName,
  programCode,
}: LessonPlanBuilderClientProps) {
  const [selectedFrameworkId, setSelectedFrameworkId] =
    useState<FrameworkId>("ilaw");
  const [activeMode, setActiveMode] = useState<"learn" | "build">("build");
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");
  const [copied, setCopied] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activePrintPlan, setActivePrintPlan] = useState<PrintablePlanData | null>(null);

  const framework = useMemo(
    () => getFrameworkById(selectedFrameworkId) ?? FRAMEWORKS[0]!,
    [selectedFrameworkId]
  );

  // Initial empty form state
  const createEmptyFormValues = useCallback(
    (fwId: FrameworkId): LessonPlanFormValues => ({
      frameworkId: fwId,
      headers: {
        subject: "",
        gradeLevel: "",
        topic: "",
        learningCompetency: "",
        learningObjectives: "",
        materials: "",
        date: new Date().toISOString().split("T")[0] ?? "",
        preparedBy: studentName,
      },
      stages: {},
    }),
    [studentName]
  );

  const [formValues, setFormValues] = useState<LessonPlanFormValues>(() =>
    createEmptyFormValues("ilaw")
  );

  // Load draft from localStorage on mount or framework change
  useEffect(() => {
    try {
      const storageKey = getDraftStorageKey(selectedFrameworkId);
      const raw = localStorage.getItem(storageKey);
      const draft = deserializeDraft(raw, selectedFrameworkId);
      if (draft) {
        setFormValues(draft);
        setLastSavedAt(new Date().toISOString());
        return;
      }
    } catch {
      // Storage unavailable or disabled
    }
    setFormValues(createEmptyFormValues(selectedFrameworkId));
    setLastSavedAt(null);
  }, [selectedFrameworkId, createEmptyFormValues]);

  // Autosave to localStorage whenever formValues changes
  useEffect(() => {
    try {
      const storageKey = getDraftStorageKey(selectedFrameworkId);
      const serialized = serializeDraft(formValues);
      localStorage.setItem(storageKey, serialized);
      setLastSavedAt(new Date().toISOString());
    } catch {
      // Graceful fallback if localStorage is quota-exceeded or private mode
    }
  }, [formValues, selectedFrameworkId]);

  // Validation
  const validation = useMemo(() => validatePlan(formValues), [formValues]);

  // Handlers for form updates
  const handleUpdateHeader = useCallback(
    (field: keyof LessonPlanFormValues["headers"], value: string) => {
      setFormValues((prev) => ({
        ...prev,
        headers: {
          ...prev.headers,
          [field]: value,
        },
      }));
    },
    []
  );

  const handleUpdateStage = useCallback((stageId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [stageId]: value,
      },
    }));
  }, []);

  // Load sample from framework
  const handleLoadSample = useCallback(() => {
    const sample = framework.samplePlan;
    const stageMap: Record<string, string> = {};
    for (const sec of sample.sections) {
      stageMap[sec.stageId] = sec.content;
    }

    setFormValues({
      frameworkId: framework.id,
      headers: {
        subject: sample.subject,
        gradeLevel: sample.gradeLevel,
        topic: sample.topic,
        learningCompetency: sample.learningCompetency,
        learningObjectives: sample.learningObjectives,
        materials: sample.materials,
        date: new Date().toISOString().split("T")[0] ?? "",
        preparedBy: studentName || "Pre-Service Teacher",
      },
      stages: stageMap,
    });
  }, [framework, studentName]);

  // Clear draft
  const handleClearDraft = useCallback(() => {
    try {
      localStorage.removeItem(getDraftStorageKey(selectedFrameworkId));
    } catch {
      // ignore
    }
    setFormValues(createEmptyFormValues(selectedFrameworkId));
    setLastSavedAt(null);
  }, [selectedFrameworkId, createEmptyFormValues]);

  // Switch to build mode with optional sample loading
  const handleSwitchToBuild = useCallback(
    (loadSample?: boolean) => {
      setActiveMode("build");
      if (loadSample) {
        handleLoadSample();
      }
    },
    [handleLoadSample]
  );

  // Export: Copy plain text / markdown
  const handleCopyText = useCallback(() => {
    const text = buildPlanText(framework, formValues);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback for browsers with restricted clipboard permission
      });
  }, [framework, formValues]);

  // Export: Download file via Blob
  const handleDownload = useCallback(
    (format: "txt" | "md") => {
      const text = buildPlanText(framework, formValues);
      const mime = format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const filename = generateFilenameSlug(
        formValues.headers.topic,
        framework.id,
        format
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [framework, formValues]
  );

  // Export: Print dialog via portal
  const handlePrintDraft = useCallback(() => {
    setActivePrintPlan(buildPrintablePlanData(framework, formValues));
  }, [framework, formValues]);

  const handlePrintSample = useCallback(() => {
    setActivePrintPlan(buildPrintablePlanData(framework, null));
  }, [framework]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Hero Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-blue-500/30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-950 dark:via-blue-900 dark:to-indigo-950 p-6 text-white shadow-sm no-print">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <GraduationCap className="h-4 w-4" />
            <span>ITE Portal • {programCode}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Lesson Plan Builder
          </h1>
          <p className="text-xs leading-relaxed text-blue-100 sm:text-sm">
            Welcome, <strong className="font-semibold text-white">{studentName}</strong>. Master
            standard pedagogical frameworks—DepEd ILAW, 4A&apos;s, 5E&apos;s, and 6E&apos;s—with
            interactive guide questions, annotated exemplars, and live exportable drafting.
          </p>
        </div>
      </header>

      {/* Framework Picker */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary-theme">
            Choose Pedagogical Framework
          </h2>
          <span className="text-[11px] font-medium text-muted-theme">
            4 models available
          </span>
        </div>
        <FrameworkPicker
          frameworks={FRAMEWORKS}
          selectedId={selectedFrameworkId}
          onSelect={(id) => setSelectedFrameworkId(id)}
        />
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme pb-4 no-print">
        <div
          role="tablist"
          aria-label="Builder view modes"
          className="inline-flex rounded-xl border border-theme bg-surface p-1 shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "build"}
            onClick={() => setActiveMode("build")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeMode === "build"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-secondary-theme hover:text-primary-theme"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Build Mode</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "learn"}
            onClick={() => setActiveMode("learn")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeMode === "learn"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-secondary-theme hover:text-primary-theme"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Learn Mode &amp; Exemplars</span>
          </button>
        </div>

        {activeMode === "build" && (
          <div className="flex lg:hidden rounded-lg border border-theme bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("form")}
              className={`px-3 py-1.5 rounded-md font-semibold ${
                mobileTab === "form"
                  ? "bg-elevated text-primary-theme shadow-2xs"
                  : "text-secondary-theme"
              }`}
            >
              Form Editor
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold ${
                mobileTab === "preview"
                  ? "bg-elevated text-primary-theme shadow-2xs"
                  : "text-secondary-theme"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview &amp; Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Mode Content */}
      {activeMode === "learn" ? (
        <LearnModeView
          framework={framework}
          onSwitchToBuild={handleSwitchToBuild}
          onPrintSample={handlePrintSample}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Form Editor Pane */}
          <div
            className={`space-y-6 ${
              mobileTab === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            <BuildModeView
              framework={framework}
              formValues={formValues}
              lastSavedAt={lastSavedAt}
              onUpdateHeader={handleUpdateHeader}
              onUpdateStage={handleUpdateStage}
              onLoadSample={handleLoadSample}
              onClearDraft={handleClearDraft}
              validationErrors={validation.errors}
            />
          </div>

          {/* Live Preview & Export Pane */}
          <div
            className={`space-y-6 lg:sticky lg:top-4 ${
              mobileTab === "form" ? "hidden lg:block" : "block"
            }`}
          >
            <LivePreviewPane
              framework={framework}
              formValues={formValues}
              copied={copied}
              onCopyText={handleCopyText}
              onDownload={handleDownload}
              onPrint={handlePrintDraft}
            />
          </div>
        </div>
      )}

      {/* Print-only Portal mounted directly under document.body */}
      {activePrintPlan && (
        <LessonPlanPrintPortal
          planData={activePrintPlan}
          onPrinted={() => setActivePrintPlan(null)}
        />
      )}
    </div>
  );
}

