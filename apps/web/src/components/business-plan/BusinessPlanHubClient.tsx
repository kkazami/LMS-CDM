"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Layers,
  Lock,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { calculateFinancialPlan, formatPhpCurrency } from "@/lib/business-plan/calculator";
import {
  LEARNING_TOPICS,
} from "@/lib/business-plan/learning-center";
import { BUSINESS_PLAN_TEMPLATES } from "@/lib/business-plan/templates";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import type {
  BusinessCategory,
  BusinessPlanSummary,
} from "@/lib/business-plan/types";

interface BusinessPlanHubClientProps {
  instituteCode: string;
  initialPlans: BusinessPlanSummary[];
  studentName: string;
  studentId?: string;
}

type HubTab = "learning" | "plans" | "templates";

const CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: "FOOD_BEVERAGE", label: "Food & Beverage / Café / Food Stall" },
  { value: "RETAIL", label: "Retail Store & Merchandising" },
  { value: "ONLINE_COMMERCE", label: "Online Selling / E-Commerce" },
  { value: "SERVICES", label: "Service Business (Printing, Laundry, Tutoring)" },
  { value: "HOSPITALITY_TOURISM", label: "Hospitality, Catering & Lodging" },
  { value: "CAMPUS_ENTERPRISE", label: "Student-Run / Campus Startup" },
  { value: "MANUFACTURING_PRODUCTION", label: "Light Production & Crafts" },
];

function getCategoryLabel(category: BusinessCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
}

export default function BusinessPlanHubClient({
  instituteCode,
  initialPlans,
  studentName,
  studentId = "default",
}: BusinessPlanHubClientProps) {
  const router = useRouter();
  const readerRef = useRef<HTMLDivElement>(null);

  const [plans, setPlans] = useState<BusinessPlanSummary[]>(initialPlans);
  // Default to the Learning Guide first so students study the 14 lessons sequentially
  const [activeTab, setActiveTab] = useState<HubTab>("learning");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "COMPLETED">("ALL");

  // Sequential Lesson Unlock State (persisted per student)
  const storageKey = `mp_lms_ibe_bp_lessons_${studentId}`;
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(() => {
    // If student already has saved business plans, unlock all lessons automatically
    if (initialPlans.length > 0) {
      return LEARNING_TOPICS.map((t) => t.id);
    }
    return [];
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCompletedTopicIds((prev) => {
            const merged = Array.from(new Set([...prev, ...parsed]));
            return merged;
          });
        }
      }
    } catch {
      /* ignore localStorage read errors */
    }
  }, [storageKey]);

  function saveCompletedTopics(nextIds: string[]) {
    setCompletedTopicIds(nextIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextIds));
    } catch {
      /* ignore localStorage write errors */
    }
  }

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<BusinessCategory>("FOOD_BEVERAGE");
  const [newTitle, setNewTitle] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Learning Center active topic
  const [selectedTopicId, setSelectedTopicId] = useState<string>(LEARNING_TOPICS[0]?.id ?? "");

  // Template preview modal
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    BUSINESS_PLAN_TEMPLATES[0]?.id ?? ""
  );

  // Determine which topics are unlocked:
  // Topic #1 (index 0) is always unlocked.
  // Topic #N (index i) is unlocked if Topic #(N-1) (index i-1) is in completedTopicIds.
  const isTopicUnlocked = useMemo(() => {
    const map = new Map<string, boolean>();
    LEARNING_TOPICS.forEach((topic, idx) => {
      if (idx === 0) {
        map.set(topic.id, true);
      } else {
        const prevTopic = LEARNING_TOPICS[idx - 1];
        map.set(topic.id, prevTopic ? completedTopicIds.includes(prevTopic.id) : false);
      }
    });
    return map;
  }, [completedTopicIds]);

  const allLessonsCompleted = completedTopicIds.length >= LEARNING_TOPICS.length;

  function handleCompleteTopicAndAdvance(topicId: string) {
    const currentIndex = LEARNING_TOPICS.findIndex((t) => t.id === topicId);
    const nextCompleted = completedTopicIds.includes(topicId)
      ? completedTopicIds
      : [...completedTopicIds, topicId];

    saveCompletedTopics(nextCompleted);

    // Advance to next lesson if available
    if (currentIndex >= 0 && currentIndex + 1 < LEARNING_TOPICS.length) {
      const nextTopic = LEARNING_TOPICS[currentIndex + 1];
      if (nextTopic) {
        setSelectedTopicId(nextTopic.id);
        readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (statusFilter !== "ALL" && plan.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = plan.title.toLowerCase().includes(q);
        const matchesBizName = plan.businessName.toLowerCase().includes(q);
        const matchesCat = getCategoryLabel(plan.businessCategory).toLowerCase().includes(q);
        return matchesTitle || matchesBizName || matchesCat;
      }
      return true;
    });
  }, [plans, statusFilter, searchQuery]);

  const activeTopic = useMemo(
    () => LEARNING_TOPICS.find((t) => t.id === selectedTopicId) ?? LEARNING_TOPICS[0],
    [selectedTopicId]
  );

  const activeTemplate = useMemo(
    () =>
      BUSINESS_PLAN_TEMPLATES.find((t) => t.id === selectedTemplateId) ??
      BUSINESS_PLAN_TEMPLATES[0],
    [selectedTemplateId]
  );

  async function handleCreateBlankPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!allLessonsCompleted) return;
    setIsCreating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/business-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "New Guided Business Plan",
          documentType: "BUSINESS_PLAN",
          businessCategory: newCategory,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Failed to create business plan.");
      }
      setShowCreateModal(false);
      router.push(`/${instituteCode}/business-plan/${json.plan.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create business plan.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateFromTemplate(templateId: string) {
    if (!allLessonsCompleted) return;
    setIsCreating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/business-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Failed to load sample template.");
      }
      router.push(`/${instituteCode}/business-plan/${json.plan.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load template.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDuplicatePlan(planId: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/business-plan/${planId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Failed to duplicate business plan.");
      }
      setPlans((prev) => [json.summary ?? json.plan, ...prev]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not duplicate plan.");
    }
  }

  async function handleDeletePlan(planId: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    setActionError(null);
    try {
      const res = await fetch(`/api/business-plan/${planId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Failed to delete business plan.");
      }
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete plan.");
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Compact Header + Flat Stat Strip */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Business Plan Guide
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                  allLessonsCompleted
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10"
                }`}
              >
                {allLessonsCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    All 14 Lessons Completed • Builder Unlocked
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    Lesson Progress: {completedTopicIds.length} / {LEARNING_TOPICS.length} Completed
                  </>
                )}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{studentName}</span>.{" "}
              {allLessonsCompleted
                ? "You have completed all 14 entrepreneurship guide lessons. You can now create a new Business Plan or start from any of the 6 sample templates."
                : "Read and complete each of the 14 guided lessons in order to unlock the Business Plan Builder and Sample Templates."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={!allLessonsCompleted}
              onClick={() => {
                if (!allLessonsCompleted) return;
                setActiveTab(activeTab === "templates" ? "plans" : "templates");
              }}
              title={
                allLessonsCompleted
                  ? "Browse 6 Sample Templates"
                  : `Complete all 14 lessons first (${completedTopicIds.length}/14 completed)`
              }
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                allLessonsCompleted
                  ? "border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              {allLessonsCompleted ? (
                <Layers className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              Sample Templates ({BUSINESS_PLAN_TEMPLATES.length})
            </button>
            <button
              type="button"
              disabled={!allLessonsCompleted}
              onClick={() => {
                if (!allLessonsCompleted) return;
                setShowCreateModal(true);
              }}
              title={
                allLessonsCompleted
                  ? "Create a New Business Plan"
                  : `Complete all 14 lessons first (${completedTopicIds.length}/14 completed)`
              }
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                allLessonsCompleted
                  ? "bg-[#D97706] hover:bg-amber-700 text-white cursor-pointer"
                  : "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              {allLessonsCompleted ? (
                <Plus className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              New Business Plan
            </button>
          </div>
        </div>

        {/* Flat 3-Column Stat Strip */}
        <div className="grid grid-cols-3 divide-x-2 border-t-2 border-slate-200 dark:border-white/15 divide-slate-200 dark:divide-white/15 bg-slate-50/70 dark:bg-[#10131B]">
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Lessons Completed
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {completedTopicIds.length}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {LEARNING_TOPICS.length}
              </span>
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Saved Plans
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {plans.length}
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Sample Templates
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {BUSINESS_PLAN_TEMPLATES.length}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Underline Tabs (Learning Guide is first; Plans & Templates are locked until all 14 lessons are completed) */}
      <div className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("learning")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "learning"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>
            1. Lesson Guide ({completedTopicIds.length}/{LEARNING_TOPICS.length} Unlocked)
          </span>
        </button>

        <button
          type="button"
          disabled={!allLessonsCompleted}
          onClick={() => {
            if (!allLessonsCompleted) return;
            setActiveTab("plans");
          }}
          title={
            allLessonsCompleted
              ? "Access My Business Plans"
              : "Read and complete all 14 Lesson Guide topics first to unlock My Business Plans"
          }
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors ${
            !allLessonsCompleted
              ? "border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed"
              : activeTab === "plans"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 cursor-pointer"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          }`}
        >
          {allLessonsCompleted ? (
            <FileText className="w-4 h-4" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span>2. My Business Plans ({plans.length})</span>
        </button>

        <button
          type="button"
          disabled={!allLessonsCompleted}
          onClick={() => {
            if (!allLessonsCompleted) return;
            setActiveTab("templates");
          }}
          title={
            allLessonsCompleted
              ? "Access Sample Templates"
              : "Read and complete all 14 Lesson Guide topics first to unlock Sample Templates"
          }
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors ${
            !allLessonsCompleted
              ? "border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed"
              : activeTab === "templates"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 cursor-pointer"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          }`}
        >
          {allLessonsCompleted ? (
            <Layers className="w-4 h-4" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span>3. Sample Templates ({BUSINESS_PLAN_TEMPLATES.length})</span>
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl bg-rose-500/10 border-2 border-rose-500/30 p-3.5 text-xs text-rose-700 dark:text-rose-200 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: SEQUENTIAL LEARNING GUIDE (14 STRUCTURED TOPICS + TAX CHECKLIST) */}
      {activeTab === "learning" && (
        <div ref={readerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Sequential Topic Selector */}
          <div className="lg:col-span-4 rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 space-y-3 max-h-80 lg:max-h-205 overflow-y-auto shadow-xs">
            <div className="px-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  14 Sequential Guide Lessons
                </h2>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                  {completedTopicIds.length}/{LEARNING_TOPICS.length}
                </span>
              </div>
              <svg
                className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#10131B] overflow-hidden"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width={Math.round(
                    (completedTopicIds.length / LEARNING_TOPICS.length) * 100
                  )}
                  height="6"
                  rx="3"
                  className={
                    allLessonsCompleted ? "fill-emerald-600" : "fill-amber-500"
                  }
                />
              </svg>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Read each lesson and click the completion button at the bottom to unlock the next topic.
              </p>
            </div>

            <div className="space-y-1.5">
              {LEARNING_TOPICS.map((topic) => {
                const isSelected = topic.id === activeTopic?.id;
                const unlocked = Boolean(isTopicUnlocked.get(topic.id));
                const completed = completedTopicIds.includes(topic.id);

                return (
                  <button
                    key={topic.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      if (!unlocked) return;
                      setSelectedTopicId(topic.id);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2.5 ${
                      !unlocked
                        ? "bg-slate-50/40 dark:bg-[#10131B]/50 border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70"
                        : isSelected
                        ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white cursor-pointer"
                        : "bg-slate-50/70 dark:bg-[#10131B] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          completed
                            ? "bg-emerald-600 text-white"
                            : isSelected
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {topic.number}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-snug">{topic.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {topic.relatedSubjects.join(" • ")}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : !unlocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Topic Content Reader */}
          <div className="lg:col-span-8 space-y-5">
            {activeTopic && (
              <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 dark:border-white/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Lesson #{activeTopic.number} of {LEARNING_TOPICS.length}
                      </span>
                      {completedTopicIds.includes(activeTopic.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {activeTopic.title}
                    </h2>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {activeTopic.relatedSubjects.map((subj) => (
                        <span
                          key={subj}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                        >
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Beginner-friendly Explanation & Purpose */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Beginner-Friendly Explanation
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeTopic.beginnerExplanation}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Purpose of This Section
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeTopic.purposeOfSection}
                    </p>
                  </div>
                </div>

                {/* What to Prepare & Review Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      What to Prepare
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {activeTopic.whatToPrepare.map((q) => (
                        <li key={q} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Review Checklist
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {activeTopic.reviewChecklist.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Illustrative Example */}
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4 space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Illustrative Example — {activeTopic.illustrativeExample.businessName}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {activeTopic.illustrativeExample.sampleText}
                  </p>
                </div>

                {/* Common Mistakes to Avoid */}
                <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Common Student Mistakes to Avoid
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {activeTopic.commonMistakesToAvoid.map((m) => (
                      <li key={m} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Lesson Footer Action: Complete & Unlock Next Topic */}
                <div className="pt-4 border-t-2 border-slate-200 dark:border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {activeTopic.number < LEARNING_TOPICS.length ? (
                      <>
                        Finish reading Lesson #{activeTopic.number} to unlock{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          Lesson #{activeTopic.number + 1}:{" "}
                          {LEARNING_TOPICS[activeTopic.number]?.title}
                        </strong>
                        .
                      </>
                    ) : allLessonsCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ All 14 lessons completed! You can now access My Business Plans and Sample Templates.
                      </span>
                    ) : (
                      <>
                        Complete this final lesson (#14) to unlock the{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          Business Plan Builder & Sample Templates
                        </strong>
                        .
                      </>
                    )}
                  </div>

                  {activeTopic.number < LEARNING_TOPICS.length ? (
                    <button
                      type="button"
                      onClick={() => handleCompleteTopicAndAdvance(activeTopic.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Mark as Read & Unlock Lesson #{activeTopic.number + 1}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : !allLessonsCompleted ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleCompleteTopicAndAdvance(activeTopic.id);
                        setActiveTab("plans");
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Lesson #14 & Unlock Business Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab("templates")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        Browse Sample Templates
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("plans")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        Go to My Business Plans
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SAVED BUSINESS PLANS (Only accessible once all 14 lessons are completed) */}
      {activeTab === "plans" && allLessonsCompleted && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search business plans"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by plan title, business name, or category..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <ResponsiveSelect<"ALL" | "DRAFT" | "COMPLETED">
                ariaLabel="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full md:w-44"
                align="right"
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "DRAFT", label: "Draft Only" },
                  { value: "COMPLETED", label: "Completed Only" },
                ]}
              />
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-10 text-center space-y-3 shadow-xs">
              <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-white/5 text-amber-500 flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {plans.length === 0
                  ? "No saved Business Plans yet"
                  : "No Business Plans match your filter"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Start a blank 11-step guided Business Plan or load one of the 6 pre-filled Philippine business sample templates.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Business Plan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("templates")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-amber-500" />
                  Browse 6 Sample Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((plan) => {
                const isCompleted = plan.status === "COMPLETED";

                return (
                  <div
                    key={plan.id}
                    className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                              Business Plan
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border inline-flex items-center gap-1 ${
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10"
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  Draft ({plan.completionPercentage}%)
                                </>
                              )}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                            {plan.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {plan.businessName || "Unnamed Business"} •{" "}
                            {getCategoryLabel(plan.businessCategory)}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Section Readiness ({plan.completedStepCount}/{plan.totalSteps} steps)
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {plan.completionPercentage}%
                          </span>
                        </div>
                        <svg
                          className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#10131B] overflow-hidden"
                          viewBox="0 0 100 6"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <rect
                            x="0"
                            y="0"
                            width={Math.max(4, plan.completionPercentage)}
                            height="6"
                            rx="3"
                            className={
                              plan.completionPercentage === 100
                                ? "fill-emerald-600"
                                : "fill-amber-500"
                            }
                          />
                        </svg>
                      </div>

                      {/* Metadata Mini Strip */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Category
                          </div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                            {getCategoryLabel(plan.businessCategory)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Last Updated
                          </div>
                          <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                            {new Date(plan.updatedAt).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/${instituteCode}/business-plan/${plan.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Open Builder
                        </Link>
                        <Link
                          href={`/${instituteCode}/business-plan/${plan.id}?view=preview`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-white/10 whitespace-nowrap shrink-0 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </Link>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={`/api/business-plan/${plan.id}/export?format=pdf`}
                          title="Export as PDF"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-white/10 transition-colors"
                        >
                          <Download className="w-3 h-3 text-amber-500" />
                          PDF
                        </a>
                        <a
                          href={`/api/business-plan/${plan.id}/export?format=docx`}
                          title="Export as Word (.docx)"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-white/10 transition-colors"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-sky-500" />
                          DOCX
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDuplicatePlan(plan.id)}
                          title="Duplicate Plan"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id, plan.title)}
                          title="Delete Plan"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAMPLE BUSINESS PLAN TEMPLATES (Only accessible once all 14 lessons are completed) */}
      {activeTab === "templates" && allLessonsCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Template List */}
          <div className="lg:col-span-4 space-y-2.5">
            {BUSINESS_PLAN_TEMPLATES.map((tpl) => {
              const isSelected = tpl.id === activeTemplate?.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors cursor-pointer space-y-1.5 shadow-xs ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white"
                      : "bg-white dark:bg-[#141721] border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-amber-700 dark:text-amber-300 border border-slate-200/80 dark:border-white/10">
                      {getCategoryLabel(tpl.category)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Sample Plan
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {tpl.name}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {tpl.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Template Preview & One-Click Load */}
          <div className="lg:col-span-8">
            {activeTemplate && (
              <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs">
                {(() => {
                  const fin = calculateFinancialPlan(activeTemplate.sampleData.financialPlan);
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-slate-200 dark:border-white/15 pb-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            {getCategoryLabel(activeTemplate.category)} • Complete 11-Section Sample
                          </span>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {activeTemplate.name}
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                            {activeTemplate.tagline}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isCreating}
                          onClick={() => handleCreateFromTemplate(activeTemplate.id)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          {isCreating ? "Loading..." : "Use This Template"}
                        </button>
                      </div>

                      {/* Financial Highlights of the Sample */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Startup Capital
                          </div>
                          <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                            {formatPhpCurrency(fin.totalStartupCosts)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Monthly Revenue
                          </div>
                          <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                            {formatPhpCurrency(fin.monthlySalesRevenue)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Monthly Net Income
                          </div>
                          <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatPhpCurrency(fin.monthlyNetProfit)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Year 1 Net Profit
                          </div>
                          <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatPhpCurrency(fin.annualNetProfit)}
                          </div>
                        </div>
                      </div>

                      {/* Sample Excerpts */}
                      <div className="space-y-4 text-sm">
                        <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-2">
                          <h4 className="font-bold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider">
                            Executive Summary & Concept
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                            {activeTemplate.sampleData.executiveSummary.businessConcept}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">
                            <strong className="text-slate-900 dark:text-white">Competitive Advantage:</strong>{" "}
                            {activeTemplate.sampleData.executiveSummary.competitiveAdvantage}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                            <h4 className="font-bold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider">
                              Target Market & Research
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {activeTemplate.sampleData.marketAnalysis.targetCustomers}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {activeTemplate.sampleData.marketAnalysis.marketResearchFindings}
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                            <h4 className="font-bold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider">
                              Operations & HR Summary
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {activeTemplate.sampleData.operationalPlan.productionOrServiceProcess}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {activeTemplate.sampleData.managementHrPlan.organizationalStructure}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE NEW BUSINESS PLAN MODAL */}
      {showCreateModal && allLessonsCompleted && (
        <div className="fixed inset-0 z-110 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-white/15 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Start a New Guided Business Plan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select your industry category and enter a working title for your Business Plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateBlankPlan} className="space-y-4">
              <div className="space-y-1.5">
                <div className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Business Category
                </div>
                <ResponsiveSelect<BusinessCategory>
                  ariaLabel="Business Category"
                  value={newCategory}
                  onChange={setNewCategory}
                  options={CATEGORY_OPTIONS}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-bp-title"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Working Business Plan Title
                </label>
                <input
                  id="new-bp-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Kusina Express — Campus Rice Bowl Business Plan"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreating ? "Creating..." : "Create & Open Business Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
