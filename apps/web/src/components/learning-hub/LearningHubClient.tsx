"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Building2,
  ExternalLink,
  Filter,
  Globe,
  GraduationCap,
  Layers,
  Search,
  Tag,
} from "lucide-react";
import {
  EXTERNAL_COURSE_CATALOG,
  IBE_SUBJECT_CATEGORIES,
  LEARNING_PROVIDERS,
} from "@/lib/learning-hub/catalog";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import type {
  CertificateAvailability,
  CourseLinkType,
  ExternalCourseEntry,
  IbeSubjectCategory,
  LearningProvider,
  LearningProviderId,
  StudentLearningRecord,
} from "@/lib/learning-hub/types";

interface LearningHubClientProps {
  instituteCode: string;
  initialRecords: StudentLearningRecord[];
  studentName: string;
}

type ActiveTab = "providers" | "catalog";

function ProviderLogo({
  providerId,
  size = "md",
}: {
  providerId: LearningProviderId;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "sm"
      ? "w-5 h-5 rounded-md"
      : size === "lg"
      ? "w-11 h-11 rounded-lg"
      : "w-9 h-9 rounded-lg";

  switch (providerId) {
    case "HP_LIFE":
      return (
        <div
          className={`${dimensions} shrink-0 flex items-center justify-center bg-[#0096D6] text-white shadow-xs overflow-hidden`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <circle cx="24" cy="24" r="22" fill="#0096D6" />
            <text
              x="24"
              y="26"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontStyle="italic"
              fontSize="16"
            >
              hp
            </text>
            <text
              x="24"
              y="38"
              textAnchor="middle"
              fill="#E0F4FF"
              fontFamily="system-ui, sans-serif"
              fontWeight="800"
              fontSize="8.5"
              letterSpacing="1.2"
            >
              LIFE
            </text>
          </svg>
        </div>
      );

    case "SAYLOR_UNIVERSITY":
      return (
        <div
          className={`${dimensions} shrink-0 flex items-center justify-center bg-[#1B365D] text-white shadow-xs overflow-hidden`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <rect width="48" height="48" fill="#1B365D" />
            <path
              d="M24 8L37 13V24C37 32.5 31.4 38.8 24 41C16.6 38.8 11 32.5 11 24V13L24 8Z"
              fill="#0072CE"
              stroke="#93C5FD"
              strokeWidth="2"
            />
            <text
              x="24"
              y="29"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="Georgia, serif"
              fontWeight="800"
              fontSize="18"
            >
              S
            </text>
          </svg>
        </div>
      );

    case "HUBSPOT_ACADEMY":
      return (
        <div
          className={`${dimensions} shrink-0 flex items-center justify-center bg-[#FF7A59] text-white shadow-xs overflow-hidden`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <rect width="48" height="48" fill="#FF7A59" />
            <circle cx="28" cy="26" r="7" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
            <line x1="28" y1="19" x2="28" y2="11" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="28" cy="10" r="2.8" fill="#FFFFFF" />
            <line x1="22.5" y1="30.5" x2="15" y2="36" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="13.5" cy="37" r="3" fill="#FFFFFF" />
            <line x1="34" y1="22" x2="39" y2="18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <circle cx="40" cy="17" r="2.4" fill="#FFFFFF" />
          </svg>
        </div>
      );

    case "OPENLEARN":
      return (
        <div
          className={`${dimensions} shrink-0 flex items-center justify-center bg-[#003865] text-white shadow-xs overflow-hidden`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <rect width="48" height="48" fill="#003865" />
            <path
              d="M12 10H36V25C36 33 24 39 24 39C24 39 12 33 12 25V10Z"
              fill="#00A88F"
            />
            <circle cx="24" cy="21" r="6.5" fill="none" stroke="#FFFFFF" strokeWidth="3" />
            <text
              x="24"
              y="35"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="800"
              fontSize="7"
              letterSpacing="0.8"
            >
              OU
            </text>
          </svg>
        </div>
      );

    case "SANTANDER_OPEN_ACADEMY":
      return (
        <div
          className={`${dimensions} shrink-0 flex items-center justify-center bg-[#EC0000] text-white shadow-xs overflow-hidden`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <rect width="48" height="48" fill="#EC0000" />
            <path
              d="M24 10C21 15 27 18.5 23 24C20.5 20.5 18 22.5 18 26.5C18 30.5 21 33 24 33C28 33 31 29.5 31 25C31 19 25.5 15.5 24 10Z"
              fill="#FFFFFF"
            />
            <ellipse
              cx="24"
              cy="35.5"
              rx="11"
              ry="3.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      );

    case "ALISON":
      return (
        <div
          className={`${dimensions} shrink-0 flex items-center justify-center bg-[#0F172A] text-white shadow-xs overflow-hidden`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <rect width="48" height="48" fill="#0F172A" />
            <path d="M24 9L11 36H18L24 22L30 36H37L24 9Z" fill="#0091C9" />
            <path d="M17.5 27H30.5L33 32H15L17.5 27Z" fill="#8DC63F" />
            <circle cx="24" cy="14" r="3" fill="#F7941D" />
          </svg>
        </div>
      );
  }
}

export default function LearningHubClient({
  instituteCode: _instituteCode,
  initialRecords: _initialRecords,
  studentName,
}: LearningHubClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("providers");

  // Course Catalog filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<"ALL" | IbeSubjectCategory>("ALL");
  const [selectedProvider, setSelectedProvider] = useState<"ALL" | LearningProviderId>("ALL");
  const [selectedCertFilter, setSelectedCertFilter] = useState<"ALL" | CertificateAvailability>("ALL");
  const [selectedLinkFilter, setSelectedLinkFilter] = useState<"ALL" | CourseLinkType>("ALL");

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return EXTERNAL_COURSE_CATALOG.filter((course) => {
      if (selectedSubject !== "ALL" && course.subject !== selectedSubject) {
        return false;
      }
      if (selectedProvider !== "ALL" && course.providerId !== selectedProvider) {
        return false;
      }
      if (
        selectedCertFilter !== "ALL" &&
        course.certificateAvailability !== selectedCertFilter
      ) {
        return false;
      }
      if (selectedLinkFilter !== "ALL" && course.linkType !== selectedLinkFilter) {
        return false;
      }
      if (query) {
        const haystack = [
          course.title,
          course.providerName,
          course.subject,
          course.description,
          ...course.keywords,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [
    searchQuery,
    selectedSubject,
    selectedProvider,
    selectedCertFilter,
    selectedLinkFilter,
  ]);

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of IBE_SUBJECT_CATEGORIES) {
      counts[s] = EXTERNAL_COURSE_CATALOG.filter((c) => c.subject === s).length;
    }
    return counts;
  }, []);

  function handleBrowseProviderCourses(providerId: LearningProviderId) {
    setSelectedProvider(providerId);
    setSelectedSubject("ALL");
    setSelectedCertFilter("ALL");
    setSelectedLinkFilter("ALL");
    setSearchQuery("");
    setActiveTab("catalog");
  }

  function handleSelectSubjectChip(subject: "ALL" | IbeSubjectCategory) {
    setSelectedSubject(subject);
    if (activeTab !== "catalog") {
      setActiveTab("catalog");
    }
  }

  function resetCatalogFilters() {
    setSearchQuery("");
    setSelectedSubject("ALL");
    setSelectedProvider("ALL");
    setSelectedCertFilter("ALL");
    setSelectedLinkFilter("ALL");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Compact Header Card */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                IBE Learning Hub
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                External Courses & Certificates
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{studentName}</span>. Explore verified global business academies (HP LIFE, Saylor University, HubSpot Academy, OpenLearn, Santander Open Academy, Alison) mapped to your 12 IBE subjects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "providers" ? "catalog" : "providers")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              {activeTab === "providers"
                ? `Browse Course Catalog (${EXTERNAL_COURSE_CATALOG.length})`
                : `View Official Providers (${LEARNING_PROVIDERS.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Clean Underline Tabs */}
      <div className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar">
        {[
          {
            id: "providers" as const,
            label: `Official Providers (${LEARNING_PROVIDERS.length})`,
            icon: Building2,
          },
          {
            id: "catalog" as const,
            label: `Course Catalog (${EXTERNAL_COURSE_CATALOG.length})`,
            icon: BookOpen,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OFFICIAL LEARNING PROVIDERS */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          {/* Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEARNING_PROVIDERS.map((provider: LearningProvider) => {
              const providerCourseCount = EXTERNAL_COURSE_CATALOG.filter(
                (c) => c.providerId === provider.id
              ).length;

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ProviderLogo providerId={provider.id} size="lg" />
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <Globe className="w-3 h-3 text-amber-500" />
                            Official External Platform
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {provider.name}
                          </h3>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono font-semibold shrink-0">
                        {providerCourseCount} courses
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {provider.description}
                    </p>

                    <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        Certificate Policy
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {provider.certificatePolicyNote}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleBrowseProviderCourses(provider.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      Filter {providerCourseCount} Courses
                    </button>

                    <a
                      href={provider.catalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                    >
                      Visit Official Portal
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Subject Jump Strip */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Jump Straight to an IBE Subject Area
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any business subject below to view all external courses mapped to that discipline.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {IBE_SUBJECT_CATEGORIES.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => handleSelectSubjectChip(subject)}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 hover:bg-slate-100 dark:bg-[#10131B] dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate pr-2">
                    {subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold shrink-0">
                    {subjectCounts[subject] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CURATED COURSE CATALOG BY IBE SUBJECT */}
      {activeTab === "catalog" && (
        <div className="space-y-5">
          {/* Search & Multi-Filter Control Panel */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 space-y-4 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="lg:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search external courses"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, keywords (e.g., Bookkeeping, SEO, Pricing, HR)..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Provider Filter */}
              <div className="lg:col-span-3">
                <ResponsiveSelect<"ALL" | LearningProviderId>
                  ariaLabel="Filter by provider"
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  options={[
                    { value: "ALL", label: `All Providers (${LEARNING_PROVIDERS.length})` },
                    ...LEARNING_PROVIDERS.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>

              {/* Certificate Filter */}
              <div className="lg:col-span-2">
                <ResponsiveSelect<"ALL" | CertificateAvailability>
                  ariaLabel="Filter by certificate availability"
                  value={selectedCertFilter}
                  onChange={setSelectedCertFilter}
                  options={[
                    { value: "ALL", label: "All Certificates" },
                    { value: "FREE_VERIFIED", label: "Free Certificate" },
                    { value: "PAID_OR_CONDITIONAL", label: "Optional Paid Cert" },
                  ]}
                />
              </div>

              {/* Link Type Filter */}
              <div className="lg:col-span-2">
                <ResponsiveSelect<"ALL" | CourseLinkType>
                  ariaLabel="Filter by link type"
                  value={selectedLinkFilter}
                  onChange={setSelectedLinkFilter}
                  align="right"
                  options={[
                    { value: "ALL", label: "All Destination Types" },
                    { value: "VERIFIED_COURSE", label: "Direct Course Page" },
                    { value: "PROVIDER_CATEGORY", label: "Category Catalog" },
                  ]}
                />
              </div>
            </div>

            {/* Subject Area Horizontal Pills */}
            <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-500" />
                  Filter by IBE Subject Area
                </span>
                {(selectedSubject !== "ALL" ||
                  selectedProvider !== "ALL" ||
                  selectedCertFilter !== "ALL" ||
                  selectedLinkFilter !== "ALL" ||
                  searchQuery.trim() !== "") && (
                  <button
                    type="button"
                    onClick={resetCatalogFilters}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubject("ALL")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    selectedSubject === "ALL"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
                      : "bg-slate-50 dark:bg-[#10131B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  All Subjects ({EXTERNAL_COURSE_CATALOG.length})
                </button>
                {IBE_SUBJECT_CATEGORIES.map((subject) => {
                  const active = selectedSubject === subject;
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSelectedSubject(subject)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                        active
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
                          : "bg-slate-50 dark:bg-[#10131B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {subject} ({subjectCounts[subject] ?? 0})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Showing{" "}
              <strong className="font-mono text-slate-900 dark:text-white">
                {filteredCourses.length}
              </strong>{" "}
              of {EXTERNAL_COURSE_CATALOG.length} external business courses
              {selectedSubject !== "ALL" && (
                <>
                  {" "}
                  in{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {selectedSubject}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Course Cards Grid */}
          {filteredCourses.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-10 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 text-amber-500 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No matching courses found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Try clearing one of your subject, provider, or certificate filters to see more business courses.
              </p>
              <button
                type="button"
                onClick={resetCatalogFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course: ExternalCourseEntry) => (
                <div
                  key={course.id}
                  className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold">
                        <ProviderLogo providerId={course.providerId} size="sm" />
                        {course.providerName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          course.certificateAvailability === "FREE_VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                        }`}
                      >
                        {course.pricingLabel}
                      </span>
                    </div>

                    {/* Subject & Title */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 shrink-0" />
                        {course.subject}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {course.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Keywords Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {course.keywords.slice(0, 4).map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#10131B] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                    <a
                      href={course.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors"
                    >
                      Open Course on {course.providerName}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
