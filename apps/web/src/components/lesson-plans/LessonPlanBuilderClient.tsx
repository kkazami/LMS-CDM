"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type {
  FrameworkId,
  LessonPlanFormValues,
} from "@/lib/lesson-plans/types";
import {
  FRAMEWORKS,
  getFrameworkById,
  getDefaultFramework,
} from "@/lib/lesson-plans/data";
import {
  buildPlanText,
  generateFilenameSlug,
  getDraftStorageKey,
  serializeDraft,
  deserializeDraft,
  validatePlan,
  buildPrintablePlanData,
  parseLessonFramework,
  isDraftNonEmpty,
  type PrintablePlanData,
} from "@/lib/lesson-plans/rules";
import FrameworkPicker from "./FrameworkPicker";
import LearnModeView from "./LearnModeView";
import BuildModeView from "./BuildModeView";
import LivePreviewPane from "./LivePreviewPane";
import LessonPlanPrintPortal from "./LessonPlanPrintPortal";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Eye,
  GraduationCap,
  PenTool,
} from "lucide-react";

interface LessonPlanBuilderClientProps {
  studentName: string;
  programCode: string;
  programName?: string;
}

export default function LessonPlanBuilderClient({
  studentName,
  programCode,
}: LessonPlanBuilderClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawFramework = searchParams.get("framework");
  const rawTopic = searchParams.get("topic");

  const parsedFrameworkId = parseLessonFramework(rawFramework);

  // If ?topic=<string> is present without an explicit framework param, default to ILAW framework view with prefilled topic
  const isTopicPrefillWithoutFramework =
    !rawFramework && Boolean(rawTopic && rawTopic.trim().length > 0);
  const activeFrameworkId: FrameworkId | null =
    parsedFrameworkId ??
    (isTopicPrefillWithoutFramework ? getDefaultFramework().id : null);

  const viewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [activeMode, setActiveMode] = useState<"learn" | "build">("build");
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");
  const [copied, setCopied] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activePrintPlan, setActivePrintPlan] = useState<PrintablePlanData | null>(null);

  // Draft status check for Hub cards
  const [draftStatus, setDraftStatus] = useState<Record<string, boolean>>({});

  const refreshDraftStatus = useCallback(() => {
    if (typeof window === "undefined") return;
    const statusMap: Record<string, boolean> = {};
    for (const fw of FRAMEWORKS) {
      try {
        const raw = localStorage.getItem(getDraftStorageKey(fw.id));
        const draft = deserializeDraft(raw, fw.id);
        statusMap[fw.id] = isDraftNonEmpty(draft);
      } catch {
        statusMap[fw.id] = false;
      }
    }
    setDraftStatus(statusMap);
  }, []);

  useEffect(() => {
    refreshDraftStatus();
  }, [refreshDraftStatus, activeFrameworkId]);

  // Scroll to top and focus heading on view change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }

    if (activeFrameworkId && viewHeadingRef.current) {
      viewHeadingRef.current.focus();
    }
  }, [activeFrameworkId]);

  const framework = useMemo(
    () =>
      activeFrameworkId
        ? getFrameworkById(activeFrameworkId) ?? getDefaultFramework()
        : getDefaultFramework(),
    [activeFrameworkId]
  );

  // Initial empty form state
  const createEmptyFormValues = useCallback(
    (fwId: FrameworkId, topicOverride?: string): LessonPlanFormValues => ({
      frameworkId: fwId,
      headers: {
        subject: "",
        gradeLevel: "",
        topic: topicOverride || "",
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
    createEmptyFormValues(activeFrameworkId ?? "ilaw", rawTopic?.trim())
  );

  // Load draft from localStorage on activeFrameworkId change
  useEffect(() => {
    if (!activeFrameworkId) return;

    try {
      const storageKey = getDraftStorageKey(activeFrameworkId);
      const raw = localStorage.getItem(storageKey);
      const draft = deserializeDraft(raw, activeFrameworkId);
      if (draft) {
        if (rawTopic && rawTopic.trim().length > 0) {
          draft.headers.topic = rawTopic.trim();
        }
        setFormValues(draft);
        setLastSavedAt(new Date().toISOString());
        return;
      }
    } catch {
      // Storage unavailable or disabled
    }
    setFormValues(createEmptyFormValues(activeFrameworkId, rawTopic?.trim()));
    setLastSavedAt(null);
  }, [activeFrameworkId, rawTopic, createEmptyFormValues]);

  // Autosave to localStorage whenever formValues changes
  useEffect(() => {
    if (!activeFrameworkId) return;

    try {
      const storageKey = getDraftStorageKey(activeFrameworkId);
      const serialized = serializeDraft(formValues);
      localStorage.setItem(storageKey, serialized);
      setLastSavedAt(new Date().toISOString());
      refreshDraftStatus();
    } catch {
      // Graceful fallback if localStorage is quota-exceeded or private mode
    }
  }, [formValues, activeFrameworkId, refreshDraftStatus]);

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
    if (!activeFrameworkId) return;
    try {
      localStorage.removeItem(getDraftStorageKey(activeFrameworkId));
    } catch {
      // ignore
    }
    setFormValues(createEmptyFormValues(activeFrameworkId));
    setLastSavedAt(null);
    refreshDraftStatus();
  }, [activeFrameworkId, createEmptyFormValues, refreshDraftStatus]);

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
      const mime =
        format === "md"
          ? "text/markdown;charset=utf-8"
          : "text/plain;charset=utf-8";
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
      {/* 1. Hub View: Renders when activeFrameworkId is null */}
      {!activeFrameworkId ? (
        <div className="space-y-6">
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

          {/* Hub Framework Cards */}
          <main aria-label="Pedagogical Frameworks Hub">
            <div className="space-y-3">
              <div className="flex items-center justify-between no-print">
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary-theme">
                  Choose Pedagogical Framework
                </h2>
                <span className="text-[11px] font-medium text-muted-theme">
                  {FRAMEWORKS.length} models available
                </span>
              </div>
              <FrameworkPicker
                frameworks={FRAMEWORKS}
                pathname={pathname}
                draftStatus={draftStatus}
              />
            </div>
          </main>
        </div>
      ) : (
        /* 2. Full-Page Framework View: Renders when activeFrameworkId is valid */
        <div className="space-y-6">
          {/* Back button and view heading */}
          <div className="space-y-4">
            <div className="flex items-center justify-between no-print">
              <Link
                href={pathname}
                id="back-to-hub-btn"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group cursor-pointer"
                aria-label="Back to Lesson Plan Builder"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Lesson Plan Builder</span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme pb-4 no-print">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Pedagogical Model</span>
                  <span>•</span>
                  <span>
                    {framework.count} {framework.unitLabel}
                  </span>
                </div>
                <h1
                  ref={viewHeadingRef}
                  tabIndex={-1}
                  id="framework-view-heading"
                  className="text-2xl font-black tracking-tight text-primary-theme outline-none sm:text-3xl"
                >
                  {framework.name}
                </h1>
                <p className="text-xs text-secondary-theme max-w-3xl leading-relaxed sm:text-sm">
                  {framework.shortDescription}
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div
                role="tablist"
                aria-label="Builder view modes"
                className="inline-flex self-start sm:self-center rounded-xl border border-theme bg-surface p-1 shadow-xs"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-mode-build"
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
                  id="tab-mode-learn"
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
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          {activeMode === "build" && (
            <div className="flex lg:hidden rounded-lg border border-theme bg-surface p-1 text-xs no-print">
              <button
                type="button"
                onClick={() => setMobileTab("form")}
                className={`flex-1 px-3 py-1.5 rounded-md font-semibold text-center ${
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
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-center ${
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

          {/* Source and References Block */}
          <footer
            id="framework-source-references"
            className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3 no-print"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <BookOpen className="h-4 w-4" />
              <span>Source and References • {framework.name}</span>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <div>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  Citation:{" "}
                </strong>
                <span>{framework.sourceCitation}</span>
              </div>

              {framework.sourceLinks && framework.sourceLinks.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                  {framework.sourceLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Print reference. No online link available.
                </p>
              )}

              {framework.sourceNote && (
                <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200">
                  <strong className="font-semibold">Note: </strong>
                  <span>{framework.sourceNote}</span>
                </div>
              )}

              {framework.aiAssistanceNote && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{framework.aiAssistanceNote}</span>
                </div>
              )}
            </div>
          </footer>
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
