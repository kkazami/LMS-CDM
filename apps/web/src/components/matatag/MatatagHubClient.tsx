"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  CompetencyItem,
  MatatagData,
  MatatagDocument,
} from "@/lib/matatag/types";
import { BEED_COURSE_DESCRIPTIONS } from "@/lib/matatag/types";
import {
  filterGuides,
  formatSecondaryGradesNote,
  getDocumentSourceBadgeInfo,
  getGradeOptions,
  getSubjectOptions,
  isAllowedGuideUrl,
  isAllowedMirrorUrl,
  isOfficialDepedUrl,
  searchCompetencies,
} from "@/lib/matatag/rules";

interface MatatagHubClientProps {
  institute: string;
  studentName: string;
  programCode: string;
  programName?: string;
  initialData: MatatagData;
}

export default function MatatagHubClient({
  institute,
  studentName,
  programCode,
  programName,
  initialData,
}: MatatagHubClientProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"guides" | "competencies">("guides");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const gradeSelectId = useId();
  const subjectSelectId = useId();
  const searchInputId = useId();

  const gradeOptions = useMemo(
    () => getGradeOptions(initialData),
    [initialData]
  );

  const subjectOptions = useMemo(
    () => getSubjectOptions(selectedGrade, initialData),
    [selectedGrade, initialData]
  );

  const filteredGuides = useMemo(
    () =>
      filterGuides(
        initialData.documents,
        selectedGrade || null,
        selectedSubject || null,
        searchQuery || null
      ),
    [initialData.documents, selectedGrade, selectedSubject, searchQuery]
  );

  const matchedCompetencies = useMemo(
    () =>
      searchCompetencies(
        initialData.documents,
        selectedGrade || null,
        selectedSubject || null,
        searchQuery || null
      ),
    [initialData.documents, selectedGrade, selectedSubject, searchQuery]
  );

  const hasActiveFilters = Boolean(selectedGrade || selectedSubject || searchQuery);

  const handleResetFilters = () => {
    setSelectedGrade("");
    setSelectedSubject("");
    setSearchQuery("");
  };

  const handleCopyCompetency = async (comp: CompetencyItem) => {
    const textToCopy = comp.code
      ? `[${comp.code}] ${comp.learningCompetency}`
      : comp.learningCompetency;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(comp.id);
      setTimeout(() => setCopiedId((curr) => (curr === comp.id ? null : curr)), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  const primarySourcePage = initialData.sourcePages?.find(
    (p) => (p.sourceType ?? "official") === "official"
  );
  const isSourcePageValid = isOfficialDepedUrl(primarySourcePage?.url);

  const mirrorSourcePage = initialData.sourcePages?.find(
    (p) => p.sourceType === "mirror"
  );
  const isMirrorSourceValid = isAllowedMirrorUrl(mirrorSourcePage?.url);

  return (
    <div className="space-y-6 pb-12">
      {/* ── HERO BANNER ── */}
      <section
        aria-labelledby="matatag-hub-heading"
        className="relative overflow-hidden rounded-2xl border border-theme bg-surface p-6 sm:p-8 shadow-xs"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-surface pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{programCode}</span>
              </span>
              <span className="text-xs font-medium text-secondary-theme">
                {programName || "Bachelor of Elementary Education"}
              </span>
            </div>

            <Link
              href={`/${institute}/lesson-plans`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Plan a lesson</span>
            </Link>
          </div>

          <div>
            <h1
              id="matatag-hub-heading"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary-theme"
            >
              MATATAG Curriculum Reference Hub
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm sm:text-base text-secondary-theme leading-relaxed">
              Official DepEd MATATAG curriculum guides, learning competencies, and
              elementary teaching references curated for Colegio de Montalban BEEd pre-service teachers.
            </p>
          </div>

          {/* Official DepEd & Mirror Disclaimer Banner */}
          <div
            role="note"
            aria-label="Official DepEd and mirror reference notice"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 sm:px-4 text-xs text-blue-900 dark:text-blue-200"
          >
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">
                Official DepEd documents are opened from deped.gov.ph. Documents marked Unofficial copy come from a third-party site that is not affiliated with DepEd. Not hosted by this LMS.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {primarySourcePage && isSourcePageValid && (
                <a
                  href={primarySourcePage.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  <span>DepEd K-1-4-7 Portal</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
              {mirrorSourcePage && isMirrorSourceValid && (
                <a
                  href={mirrorSourcePage.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300 hover:underline text-[11px]"
                >
                  <span>Mirror Index</span>
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTROLS & FILTER BAR ── */}
      <section
        aria-label="Curriculum filters"
        className="rounded-2xl border border-theme bg-surface p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-theme pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary-theme">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span>Filter references</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Grade Selector (Strictly Elementary: Kindergarten to Grade 6) */}
          <div className="space-y-1.5">
            <label
              htmlFor={gradeSelectId}
              className="block text-xs font-semibold text-primary-theme"
            >
              Elementary Grade
            </label>
            <select
              id={gradeSelectId}
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="">All Elementary Grades (K - 6)</option>
              {gradeOptions.map((opt) => (
                <option
                  key={opt.key}
                  value={opt.key}
                  disabled={!opt.enabled}
                >
                  {opt.label} {opt.enabled ? "" : "(Not added yet)"}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor={subjectSelectId}
              className="block text-xs font-semibold text-primary-theme"
            >
              Subject
            </label>
            <select
              id={subjectSelectId}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full h-10 rounded-xl border border-theme bg-elevated px-3 text-xs sm:text-sm text-primary-theme outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="">All Subjects</option>
              {subjectOptions.map((subj) => (
                <option
                  key={subj.name}
                  value={subj.name}
                  disabled={!subj.enabled}
                >
                  {subj.name} {subj.enabled ? "" : "(Not added yet)"}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label
              htmlFor={searchInputId}
              className="block text-xs font-semibold text-primary-theme"
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-theme pointer-events-none" />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, or course..."
                className="w-full h-10 rounded-xl border border-theme bg-elevated pl-9 pr-8 text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search text"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary-theme hover:text-primary-theme"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── TAB NAVIGATION ── */}
      <div className="flex border-b border-theme" role="tablist" aria-label="Reference Hub Sections">
        <button
          type="button"
          role="tab"
          id="tab-guides"
          aria-selected={activeTab === "guides"}
          aria-controls="panel-guides"
          tabIndex={activeTab === "guides" ? 0 : -1}
          onClick={() => setActiveTab("guides")}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "guides"
              ? "text-blue-600 dark:text-blue-400"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Curriculum Guides</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "guides"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {filteredGuides.length}
          </span>
          {activeTab === "guides" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-competencies"
          aria-selected={activeTab === "competencies"}
          aria-controls="panel-competencies"
          tabIndex={activeTab === "competencies" ? 0 : -1}
          onClick={() => setActiveTab("competencies")}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "competencies"
              ? "text-blue-600 dark:text-blue-400"
              : "text-secondary-theme hover:text-primary-theme"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Learning Competencies</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "competencies"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "bg-elevated text-secondary-theme"
            }`}
          >
            {matchedCompetencies.length}
          </span>
          {activeTab === "competencies" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
      </div>

      {/* ── TAB 1: CURRICULUM GUIDES ── */}
      {activeTab === "guides" && (
        <section
          id="panel-guides"
          role="tabpanel"
          aria-labelledby="tab-guides"
          className="space-y-4"
        >
          {filteredGuides.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-theme mb-3" />
              <h2 className="text-base font-bold text-primary-theme">
                No curriculum guides match your selection
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-secondary-theme max-w-md">
                Try selecting a different elementary grade or subject, or clear the search query.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-elevated border border-theme px-3.5 py-2 text-xs font-semibold text-primary-theme hover:bg-surface transition"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filteredGuides.map((doc: MatatagDocument) => {
                const isUrlValid = isAllowedGuideUrl(doc);
                const secondaryNote = formatSecondaryGradesNote(doc.grades);
                const elementaryGrades = doc.grades.filter((g) => g < 7);
                const badgeInfo = getDocumentSourceBadgeInfo(doc);

                return (
                  <article
                    key={doc.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                      badgeInfo.isMirror
                        ? "border-amber-500/30 hover:border-amber-500/60"
                        : "border-theme hover:border-blue-500/50"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                          {doc.subject}
                        </span>

                        {badgeInfo.isMirror ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>{badgeInfo.badgeText}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-theme bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-theme">
                            {badgeInfo.badgeText}
                          </span>
                        )}
                      </div>

                      {/* Mirror disclaimer line */}
                      {badgeInfo.isMirror && badgeInfo.disclaimer && (
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 italic">
                          {badgeInfo.disclaimer}
                        </p>
                      )}

                      {/* Title */}
                      <h2 className="text-base sm:text-lg font-bold text-primary-theme leading-snug">
                        {doc.title}
                      </h2>

                      {/* Elementary Grades Covered */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-secondary-theme">
                          <span className="font-semibold text-primary-theme">
                            Grades:
                          </span>
                          {elementaryGrades.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center rounded-md bg-elevated border border-theme px-2 py-0.5 text-[11px] font-semibold text-primary-theme"
                            >
                              {g === 0 ? "Kindergarten" : `Grade ${g}`}
                            </span>
                          ))}
                        </div>

                        {/* Secondary note if document covers Grade 7 or higher */}
                        {secondaryNote && (
                          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-theme">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>{secondaryNote}</span>
                          </p>
                        )}
                      </div>

                      {/* Course alignments: Useful for */}
                      {doc.supportsCourses && doc.supportsCourses.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-secondary-theme">
                            Useful for CDM BEEd courses:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {doc.supportsCourses.map((code) => {
                              const desc =
                                BEED_COURSE_DESCRIPTIONS[
                                  code as keyof typeof BEED_COURSE_DESCRIPTIONS
                                ];
                              return (
                                <span
                                  key={code}
                                  title={desc}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
                                >
                                  <span>{code}</span>
                                  {desc && (
                                    <span className="text-[10px] font-normal opacity-85 hidden sm:inline">
                                      — {desc}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-theme">
                      {isUrlValid ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition focus-visible:outline-2 cursor-pointer ${
                            badgeInfo.isMirror
                              ? "bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-amber-600"
                              : "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600"
                          }`}
                        >
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{badgeInfo.buttonLabel}</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          URL validation failed
                        </span>
                      )}

                      {primarySourcePage && isSourcePageValid && (
                        <a
                          href={primarySourcePage.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-theme hover:text-primary-theme transition px-2 py-1"
                        >
                          <span>DepEd Source</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── TAB 2: LEARNING COMPETENCIES ── */}
      {activeTab === "competencies" && (
        <section
          id="panel-competencies"
          role="tabpanel"
          aria-labelledby="tab-competencies"
          className="space-y-4"
        >
          {matchedCompetencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-theme bg-surface p-8 sm:p-12 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h2 className="text-base font-bold text-primary-theme">
                  Competency lists are being added
                </h2>
                <p className="text-xs sm:text-sm text-secondary-theme leading-relaxed">
                  Competency lists for this selection are being added. Open the official curriculum guide in the meantime.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("guides")}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>View Curriculum Guides</span>
                </button>

                {primarySourcePage && isSourcePageValid && (
                  <a
                    href={primarySourcePage.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-theme bg-elevated px-4 py-2 text-xs font-bold text-primary-theme hover:bg-surface transition"
                  >
                    <span>DepEd Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {matchedCompetencies.map(({ competency, documentTitle, documentSubject }) => {
                const isCopied = copiedId === competency.id;

                return (
                  <article
                    key={competency.id}
                    className="rounded-xl border border-theme bg-surface p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                          {documentSubject}
                        </span>
                        <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 text-xs font-semibold text-primary-theme">
                          {competency.grade === 0 || String(competency.grade).toLowerCase() === "k"
                            ? "Kindergarten"
                            : `Grade ${competency.grade}`}
                        </span>
                        {competency.quarter && (
                          <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 text-xs text-secondary-theme">
                            Quarter {competency.quarter}
                          </span>
                        )}
                        {competency.domain && (
                          <span className="rounded-md border border-theme bg-elevated px-2 py-0.5 text-xs text-secondary-theme">
                            {competency.domain}
                          </span>
                        )}
                        {competency.code && (
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {competency.code}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCompetency(competency)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1 text-xs font-semibold text-primary-theme hover:bg-surface transition cursor-pointer"
                        aria-label={`Copy competency ${competency.code || ""}`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-primary-theme leading-relaxed">
                      {competency.learningCompetency}
                    </p>

                    {(competency.contentStandard || competency.performanceStandard) && (
                      <div className="space-y-1 pt-2 border-t border-theme text-xs text-secondary-theme">
                        {competency.contentStandard && (
                          <p>
                            <span className="font-semibold text-primary-theme">Content Standard:</span>{" "}
                            {competency.contentStandard}
                          </p>
                        )}
                        {competency.performanceStandard && (
                          <p>
                            <span className="font-semibold text-primary-theme">Performance Standard:</span>{" "}
                            {competency.performanceStandard}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
