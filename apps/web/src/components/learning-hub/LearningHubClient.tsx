"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Clock,
  Compass,
  ExternalLink,
  Filter,
  Globe,
  GraduationCap,
  Layers,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  EXTERNAL_COURSE_CATALOG,
  IBE_SUBJECT_CATEGORIES,
  LEARNING_PROVIDERS,
  filterAndSortCatalog,
} from "@/lib/learning-hub/catalog";
import type {
  CertificateAvailability,
  CourseLinkType,
  IbeSubjectCategory,
  LearningProviderId,
  StudentLearningRecord,
} from "@/lib/learning-hub/types";

interface LearningHubClientProps {
  instituteCode: string;
  initialRecords: StudentLearningRecord[];
  studentName: string;
}

type HubTab = "PROVIDERS" | "CATALOG";

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
      ? "w-12 h-12 rounded-xl"
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

const LINK_TYPE_META: Record<
  CourseLinkType,
  { label: string; buttonLabel: string; badgeClass: string }
> = {
  VERIFIED_COURSE: {
    label: "Verified Course Page",
    buttonLabel: "Start Course",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  },
  PROVIDER_CATEGORY: {
    label: "Official Category / Search",
    buttonLabel: "Explore Official Catalog",
    badgeClass:
      "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",
  },
  PROVIDER_HOMEPAGE: {
    label: "Official Provider Portal",
    buttonLabel: "Visit Official Portal",
    badgeClass:
      "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300",
  },
};

const CERT_BADGE_META: Record<
  CertificateAvailability,
  { shortLabel: string; badgeClass: string }
> = {
  FREE_VERIFIED: {
    shortLabel: "Free Certificate (Verified)",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  },
  PAID_OR_CONDITIONAL: {
    shortLabel: "Paid / Conditional Certificate",
    badgeClass:
      "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  },
  UNVERIFIED: {
    shortLabel: "Certificate Policy Unverified",
    badgeClass:
      "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export default function LearningHubClient({
  studentName,
}: LearningHubClientProps) {
  const [activeTab, setActiveTab] = useState<HubTab>("PROVIDERS");

  // Catalog filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<IbeSubjectCategory | "ALL">("ALL");
  const [selectedProvider, setSelectedProvider] = useState<LearningProviderId | "ALL">("ALL");
  const [selectedCertFilter, setSelectedCertFilter] = useState<CertificateAvailability | "ALL">("ALL");
  const [selectedLinkType, setSelectedLinkType] = useState<CourseLinkType | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"RECOMMENDED" | "TITLE_ASC" | "DURATION_ASC">("RECOMMENDED");

  const filteredCourses = useMemo(
    () =>
      filterAndSortCatalog({
        search: searchQuery,
        subject: selectedSubject,
        providerId: selectedProvider,
        certificateAvailability: selectedCertFilter,
        linkType: selectedLinkType,
        sortBy,
      }),
    [
      searchQuery,
      selectedSubject,
      selectedProvider,
      selectedCertFilter,
      selectedLinkType,
      sortBy,
    ]
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedSubject !== "ALL" ||
    selectedProvider !== "ALL" ||
    selectedCertFilter !== "ALL" ||
    selectedLinkType !== "ALL" ||
    sortBy !== "RECOMMENDED";

  function resetCatalogFilters() {
    setSearchQuery("");
    setSelectedSubject("ALL");
    setSelectedProvider("ALL");
    setSelectedCertFilter("ALL");
    setSelectedLinkType("ALL");
    setSortBy("RECOMMENDED");
  }

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 p-6 sm:p-8 shadow-lg">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            IBE Student Exclusive • External Courses & Certificates
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            IBE Learning Hub
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Welcome,{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-300">
              {studentName}
            </span>
            . Discover verified business, accounting, finance, HR, and marketing courses and launch courses directly on their official websites.
          </p>
        </div>

        {/* Navigation Tabs (Official Providers first, Course Catalog second) */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("PROVIDERS")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === "PROVIDERS"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            {LEARNING_PROVIDERS.length} Official Providers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === "CATALOG"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Compass className="w-4 h-4" />
            Course Catalog ({EXTERNAL_COURSE_CATALOG.length})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: 7 OFFICIAL PROVIDERS ─── */}
      {activeTab === "PROVIDERS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LEARNING_PROVIDERS.map((provider) => {
            const providerCourses = EXTERNAL_COURSE_CATALOG.filter(
              (c) => c.providerId === provider.id
            );
            return (
              <div
                key={provider.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-xs hover:border-amber-500/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ProviderLogo providerId={provider.id} size="lg" />
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                          {provider.name}
                        </h3>
                        <a
                          href={provider.homepageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline truncate block"
                        >
                          {provider.homepageUrl}
                        </a>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold shrink-0">
                      {providerCourses.length} Curated Entries
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {provider.description}
                  </p>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-white">
                      Certificate Policy:
                    </strong>{" "}
                    {provider.certificatePolicyNote}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      setActiveTab("CATALOG");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    View {provider.shortName} Courses in Hub
                  </button>
                  <a
                    href={provider.homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                  >
                    <span>Visit {provider.shortName} Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 2: COURSE CATALOG ─── */}
      {activeTab === "CATALOG" && (
        <div className="space-y-6">
          {/* Quick Provider Filter Strip */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Filter by Official Provider (7 Platforms)
              </span>
              {selectedProvider !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedProvider("ALL")}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Show All Providers
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedProvider("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  selectedProvider === "ALL"
                    ? "bg-amber-500 text-slate-950 border-amber-500"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                All 7 Providers ({EXTERNAL_COURSE_CATALOG.length})
              </button>
              {LEARNING_PROVIDERS.map((provider) => {
                const count = EXTERNAL_COURSE_CATALOG.filter(
                  (c) => c.providerId === provider.id
                ).length;
                const active = selectedProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() =>
                      setSelectedProvider(active ? "ALL" : provider.id)
                    }
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      active
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <ProviderLogo providerId={provider.id} size="sm" />
                    <span>
                      {provider.name} ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Multi-Filter Controls */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Box */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by course title, topic, or keyword (e.g., accounting, SEO, HR)..."
                  aria-label="Search courses"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Subject Filter */}
              <div>
                <select
                  value={selectedSubject}
                  onChange={(e) =>
                    setSelectedSubject(e.target.value as IbeSubjectCategory | "ALL")
                  }
                  aria-label="Filter by IBE subject"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All 12 IBE Subjects</option>
                  {IBE_SUBJECT_CATEGORIES.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Certificate Filter */}
              <div>
                <select
                  value={selectedCertFilter}
                  onChange={(e) =>
                    setSelectedCertFilter(
                      e.target.value as CertificateAvailability | "ALL"
                    )
                  }
                  aria-label="Filter by certificate availability"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Certificate Policies</option>
                  <option value="FREE_VERIFIED">
                    Free Certificate (Verified)
                  </option>
                  <option value="PAID_OR_CONDITIONAL">
                    Paid / Conditional Certificate
                  </option>
                  <option value="UNVERIFIED">
                    Certificate Policy Unverified
                  </option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "RECOMMENDED"
                        | "TITLE_ASC"
                        | "DURATION_ASC"
                    )
                  }
                  aria-label="Sort courses"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="RECOMMENDED">
                    Sort: Verified Courses First
                  </option>
                  <option value="TITLE_ASC">Sort: Title (A–Z)</option>
                  <option value="DURATION_ASC">
                    Sort: Duration (Shortest Verified)
                  </option>
                </select>
              </div>
            </div>

            {/* Link Type Pills & Filter Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Destination Type:
                </span>
                {(
                  [
                    { id: "ALL", label: "All Links" },
                    { id: "VERIFIED_COURSE", label: "Verified Individual Courses" },
                    { id: "PROVIDER_CATEGORY", label: "Official Category / Search Pages" },
                    { id: "PROVIDER_HOMEPAGE", label: "Official Provider Portals" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedLinkType(item.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      selectedLinkType === item.id
                        ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {filteredCourses.length}
                  </strong>{" "}
                  of {EXTERNAL_COURSE_CATALOG.length} entries
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetCatalogFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  No courses match your current filters
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Try clearing your search keyword or switching the IBE subject or provider filter to explore all available courses.
                </p>
              </div>
              <button
                type="button"
                onClick={resetCatalogFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All Filters
              </button>
            </div>
          ) : (
            /* Course Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCourses.map((course) => {
                const linkMeta = LINK_TYPE_META[course.linkType];
                const certMeta = CERT_BADGE_META[course.certificateAvailability];

                return (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-amber-500/40 transition shadow-xs"
                  >
                    <div className="space-y-3">
                      {/* Top Badges: Provider + Link Type */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                          <ProviderLogo providerId={course.providerId} size="sm" />
                          <span>{course.providerName}</span>
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${linkMeta.badgeClass}`}
                        >
                          {linkMeta.label}
                        </span>
                      </div>

                      {/* Subject Category Label */}
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>{course.subject}</span>
                      </div>

                      {/* Course Title & Description */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      {/* Metadata Grid: Duration, Format */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>
                            <strong>Duration:</strong>{" "}
                            {course.durationLabel ?? "Not specified by provider"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                          <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span className="truncate">
                            <strong>Format:</strong>{" "}
                            {course.learningFormat ?? "Online"}
                          </span>
                        </div>
                      </div>

                      {/* Certificate & Pricing Strip */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${certMeta.badgeClass}`}
                        >
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          {course.certificateConditionLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          {course.pricingLabel}
                        </span>
                      </div>

                      {/* Official URL display + Fallback URL */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="truncate max-w-full font-mono">
                          Official URL: {course.officialUrl}
                        </span>
                        {course.officialUrl !== course.fallbackUrl && (
                          <a
                            href={course.fallbackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                          >
                            Provider Home ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-start">
                      <a
                        href={course.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-xs"
                      >
                        <span>{linkMeta.buttonLabel}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
