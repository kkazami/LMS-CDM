"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  AlertTriangle,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import {
  LEARNING_TOPICS,
  SUBJECT_CONNECTIONS,
} from "@/lib/business-plan/learning-center";
import { BUSINESS_PLAN_TEMPLATES } from "@/lib/business-plan/templates";
import { calculateFinancialPlan, formatPhpCurrency } from "@/lib/business-plan/calculator";
import type {
  BusinessCategory,
  BusinessPlanSummary,
} from "@/lib/business-plan/types";

interface BusinessPlanHubClientProps {
  instituteCode: string;
  initialPlans: BusinessPlanSummary[];
  studentName: string;
}

const CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: "FOOD_BEVERAGE", label: "Food & Beverage / Café / Food Stall" },
  { value: "RETAIL", label: "Retail Store & Merchandising" },
  { value: "ONLINE_COMMERCE", label: "Online Selling / E-Commerce" },
  { value: "SERVICES", label: "Service Business (Printing, Laundry, Tutoring)" },
  { value: "HOSPITALITY_TOURISM", label: "Hospitality, Catering & Lodging" },
  { value: "CAMPUS_ENTERPRISE", label: "Student-Run / Campus Startup" },
  { value: "MANUFACTURING_PRODUCTION", label: "Light Production & Crafts" },
];

export default function BusinessPlanHubClient({
  instituteCode,
  initialPlans,
  studentName,
}: BusinessPlanHubClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "learning" | "templates">("dashboard");
  const [plans, setPlans] = useState<BusinessPlanSummary[]>(initialPlans);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0);
  const [topicSearch, setTopicSearch] = useState<string>("");
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Record<string, boolean>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    BUSINESS_PLAN_TEMPLATES[0]?.id ?? "small-food-business"
  );

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newCategory, setNewCategory] = useState<BusinessCategory>("FOOD_BEVERAGE");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredTopics = LEARNING_TOPICS.filter((topic) => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      topic.title.toLowerCase().includes(q) ||
      topic.beginnerExplanation.toLowerCase().includes(q) ||
      topic.relatedSubjects.some((s) => s.toLowerCase().includes(q))
    );
  });

  const activeTopic =
    filteredTopics[selectedTopicIndex] ?? filteredTopics[0] ?? LEARNING_TOPICS[0];

  const activeTemplate =
    BUSINESS_PLAN_TEMPLATES.find((t) => t.id === selectedTemplateId) ??
    BUSINESS_PLAN_TEMPLATES[0];

  async function handleCreateBlankPlan(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/business-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "My Business Plan",
          businessCategory: newCategory,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create business plan.");
      }
      router.push(`/${instituteCode}/business-plan/${json.plan.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create business plan.");
      setIsCreating(false);
    }
  }

  async function handleCreateFromTemplate(templateId: string, includeSampleFinancials: boolean) {
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/business-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          includeSampleFinancials,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to start plan from template.");
      }
      router.push(`/${instituteCode}/business-plan/${json.plan.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to start from template.");
      setIsCreating(false);
    }
  }

  async function handleDuplicatePlan(id: string) {
    setBusyPlanId(id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/business-plan/${id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to duplicate plan.");
      }
      const refreshRes = await fetch("/api/business-plan");
      if (refreshRes.ok) {
        const listJson = await refreshRes.json();
        setPlans(listJson.plans ?? []);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not duplicate plan.");
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleDeletePlan(id: string, title: string) {
    if (!window.confirm(`Delete "${title}" permanently? This action cannot be undone.`)) {
      return;
    }
    setBusyPlanId(id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/business-plan/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Failed to delete plan.");
      }
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not delete plan.");
    } finally {
      setBusyPlanId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-linear-to-br from-amber-50 via-white to-amber-100/60 dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-950 border border-amber-200 dark:border-amber-500/30 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5" />
              IBE Student Exclusive • Business Plan Guide
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Business Plan Guide
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Welcome, <span className="text-amber-700 dark:text-amber-300 font-semibold">{studentName}</span>. Learn step-by-step how to craft a complete{" "}
              <strong className="text-slate-900 dark:text-white">Business Plan</strong>, compute deterministic startup & break-even financials, and export a formatted PDF or Word document.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Business Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("learning")}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-semibold text-sm transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              14-Topic Learning Center
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            My Saved Business Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("learning")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "learning"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Business Plan Learning Center (14 Lessons)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "templates"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            Sample Business Plans & Templates ({BUSINESS_PLAN_TEMPLATES.length})
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex items-center justify-between text-red-700 dark:text-red-200 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline hover:text-slate-900 dark:hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: SAVED-PLAN DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Saved Business Plans</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create, edit, validate, duplicate, preview, or export your own business plans. Only you can access your records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                Browse Sample Templates
              </button>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-5 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-2 max-w-xl mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No saved Business Plans yet</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Not sure where to start? Read the{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("learning")}
                    className="text-amber-600 dark:text-amber-400 underline font-medium cursor-pointer"
                  >
                    14-Topic Learning Center
                  </button>
                  , inspect one of our{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("templates")}
                    className="text-amber-600 dark:text-amber-400 underline font-medium cursor-pointer"
                  >
                    6 Sample Business Plan Templates
                  </button>
                  , or launch a guided blank business plan right now.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Start New Business Plan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("templates")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Explore Sample Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plans.map((plan) => {
                const isCompleted = plan.status === "COMPLETED";
                const isBusy = busyPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 p-6 flex flex-col justify-between gap-5 transition shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            Business Plan
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isCompleted
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isCompleted ? "Completed" : "Draft"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Updated {new Date(plan.updatedAt).toLocaleDateString("en-PH")}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{plan.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Venture Name:{" "}
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {plan.businessName || "Not set yet"}
                          </span>
                        </p>
                      </div>

                      {/* Completion Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400">
                            Guided Progress ({plan.completedStepCount} of {plan.totalSteps} steps ready)
                          </span>
                          <span className="font-bold text-amber-700 dark:text-amber-300">{plan.completionPercentage}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-400 transition-all"
                            style={{ width: `${Math.min(100, Math.max(4, plan.completionPercentage))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${instituteCode}/business-plan/${plan.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Continue Editing
                        </Link>
                        <Link
                          href={`/${instituteCode}/business-plan/${plan.id}?view=preview`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          Preview
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/business-plan/${plan.id}/export?format=pdf`}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
                          title="Export as PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          PDF
                        </a>
                        <a
                          href={`/api/business-plan/${plan.id}/export?format=docx`}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
                          title="Export as Word (.docx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          DOCX
                        </a>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDuplicatePlan(plan.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
                          title="Duplicate Plan"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDeletePlan(plan.id, plan.title)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-500/15 dark:bg-slate-800 dark:hover:bg-red-500/20 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
                          title="Delete Plan"
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

      {/* TAB 2: BUSINESS PLAN LEARNING CENTER (14 TOPICS) */}
      {activeTab === "learning" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Topic Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => {
                      setTopicSearch(e.target.value);
                      setSelectedTopicIndex(0);
                    }}
                    placeholder="Search 14 topics or subjects..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5 max-h-135 overflow-y-auto pr-1">
                  {filteredTopics.map((topic, idx) => {
                    const isSelected = activeTopic?.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopicIndex(idx)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold shadow"
                            : "bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60"
                        }`}
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isSelected
                              ? "bg-slate-950/20 text-slate-950"
                              : "bg-amber-500/15 dark:bg-slate-800 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          #{topic.number}
                        </span>
                        <span className="leading-snug">{topic.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Topic Lesson Detail */}
            <div className="lg:col-span-8 space-y-5">
              {activeTopic && (
                <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
                  <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold">
                        Topic {activeTopic.number} of {LEARNING_TOPICS.length}
                      </span>
                      {activeTopic.relatedSubjects.map((subj) => (
                        <span
                          key={subj}
                          className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700"
                        >
                          {subj}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{activeTopic.title}</h2>
                  </div>

                  {/* 1. Beginner-friendly explanation */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      1. Beginner-Friendly Explanation
                    </h3>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      {activeTopic.beginnerExplanation}
                    </p>
                  </div>

                  {/* 2. Purpose of the Section */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      2. Purpose of This Section
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeTopic.purposeOfSection}
                    </p>
                  </div>

                  {/* 3. What Information Students Should Prepare */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      3. What Information You Should Prepare
                    </h3>
                    <ul className="space-y-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      {activeTopic.whatToPrepare.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. Realistic Illustrative Example */}
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        4. Realistic Illustrative Example
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200">
                        Illustrative Sample Only
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeTopic.illustrativeExample.businessName}
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {activeTopic.illustrativeExample.sampleText}
                    </p>
                  </div>

                  {/* 5. Common Mistakes to Avoid */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      5. Common Mistakes to Avoid
                    </h3>
                    <ul className="space-y-2 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
                      {activeTopic.commonMistakesToAvoid.map((mistake) => (
                        <li key={mistake} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 6. Self-Review Checklist */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      6. Student Review Checklist
                    </h3>
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      {activeTopic.reviewChecklist.map((checkItem, idx) => {
                        const key = `${activeTopic.id}-${idx}`;
                        const checked = Boolean(checkedChecklistItems[key]);
                        return (
                          <label
                            key={key}
                            className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setCheckedChecklistItems((prev) => ({
                                  ...prev,
                                  [key]: !checked,
                                }))
                              }
                              className="mt-1 rounded border-slate-400 dark:border-slate-600 text-amber-500 focus:ring-amber-500"
                            />
                            <span className={checked ? "line-through text-slate-400 dark:text-slate-500" : ""}>
                              {checkItem}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Subject Integration Panel */}
              <div className="rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  How This Guide Connects to Your Core IBE Subjects
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUBJECT_CONNECTIONS.map((sc) => (
                    <div
                      key={sc.subject}
                      className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5 space-y-1"
                    >
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">{sc.subject}</div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{sc.howItConnects}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES & SAMPLE PLANS */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Academic Integrity & Sample Data Notice:</strong> All 6 templates below are{" "}
              <strong>illustrative educational examples</strong> with internally consistent financials. When you start a business plan from a template, you can choose{" "}
              <strong>Guided Structure Only (Blank Financials)</strong> so sample financial figures are never copied into your work without your explicit action.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Template Selector List */}
            <div className="lg:col-span-4 space-y-3">
              {BUSINESS_PLAN_TEMPLATES.map((tpl) => {
                const isSelected = tpl.id === activeTemplate?.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`w-full text-left rounded-2xl p-4 border transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white shadow-md"
                        : "bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                        Business Plan
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tpl.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{tpl.tagline}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected Template Preview */}
            {activeTemplate && (
              <div className="lg:col-span-8 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
                {(() => {
                  const sampleCalc = calculateFinancialPlan(activeTemplate.sampleData.financialPlan);
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold">
                              {activeTemplate.illustrativeDisclaimer}
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {activeTemplate.sampleData.businessInfo.businessName}
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{activeTemplate.tagline}</p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isCreating}
                            onClick={() => handleCreateFromTemplate(activeTemplate.id, false)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Use Guided Structure (Blank Financials)
                          </button>
                          <button
                            type="button"
                            disabled={isCreating}
                            onClick={() => handleCreateFromTemplate(activeTemplate.id, true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
                          >
                            <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            Clone Full Sample (Include Sample Numbers)
                          </button>
                        </div>
                      </div>

                      {/* Financial Snapshot of Sample */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Sample Startup Capital</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {formatPhpCurrency(sampleCalc.totalStartupCosts)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Monthly Sales Revenue</div>
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatPhpCurrency(sampleCalc.monthlySalesRevenue)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Monthly Net Profit</div>
                          <div className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                            {formatPhpCurrency(sampleCalc.monthlyNetProfit)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Break-Even Volume</div>
                          <div className="text-sm font-bold text-sky-600 dark:text-sky-300 mt-0.5">
                            {sampleCalc.breakEven.breakEvenUnits ?? "N/A"} units/mo
                          </div>
                        </div>
                      </div>

                      {/* Sample Sections Summary */}
                      <div className="space-y-4 text-sm">
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                          <h4 className="font-bold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wider">
                            Executive Summary & Concept
                          </h4>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                            {activeTemplate.sampleData.executiveSummary.businessConcept}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">
                            <strong className="text-slate-900 dark:text-white">Competitive Advantage:</strong>{" "}
                            {activeTemplate.sampleData.executiveSummary.competitiveAdvantage}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wider">
                              Target Market & Research
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {activeTemplate.sampleData.marketAnalysis.targetCustomers}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {activeTemplate.sampleData.marketAnalysis.marketResearchFindings}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wider">
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Start a New Guided Business Plan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select your industry category and enter a working title for your Business Plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateBlankPlan} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Business Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as BusinessCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Working Business Plan Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Kusina Express — Campus Rice Bowl Business Plan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
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
