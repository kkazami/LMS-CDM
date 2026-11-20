"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  FileCheck2,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  PenTool,
  Search,
  Sparkles,
  Square,
  Tag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "@/components/common/Toast";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { useSpeechSynthesis } from "@/lib/wordwise/useSpeechSynthesis";
import { rankAndFilterVocabularyWords } from "@/lib/wordwise/search-ranking";
import {
  lookupGeneralEnglishWord,
  searchFreeInternetDictionary,
} from "@/lib/wordwise/general-dictionary";
import {
  WRITING_IMPROVEMENT_DISCLAIMER,
  analyzeAcademicWriting,
} from "@/lib/wordwise/writing-helper";
import type {
  VocabularyWordItem,
  WordWiseCategorySlug,
  WordWiseInitialPayload,
  WordWiseTab,
  WritingImprovementResult,
} from "@/lib/wordwise/types";

interface WordWiseHubClientProps {
  initialData: WordWiseInitialPayload;
}

const SAMPLE_WRITING_PROMPTS: readonly string[] = [
  "The study tries to find out why students prefer active learning and make sure teachers talk about the results with a lot of classes.",
  "Please back up your main argument with research data and send out the survey to help first-year students get better at academic writing.",
  "We will look into the reading results and set up a study group to deal with difficult questions.",
];

const ALPHABET_LETTERS: readonly string[] =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function difficultyBadgeStyle(difficulty: VocabularyWordItem["difficulty"]): string {
  switch (difficulty) {
    case "BEGINNER":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    case "INTERMEDIATE":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    case "ADVANCED":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
  }
}

export default function WordWiseHubClient({
  initialData,
}: WordWiseHubClientProps) {
  const [activeTab, setActiveTab] = useState<WordWiseTab>("overview");

  // Core state hydrated from server (used for Word of the Day & Categories tabs)
  const [words] = useState<VocabularyWordItem[]>(initialData.words);
  // 100% Live Free Dictionary state for the Dictionary tab (Free Dictionary API + WordNet/Wiktionary)
  const [liveDictWords, setLiveDictWords] = useState<VocabularyWordItem[]>([]);
  const [categories] = useState(initialData.categories);
  const [wordOfTheDay] = useState<VocabularyWordItem>(initialData.wordOfTheDay);
  const [comparisons] = useState(initialData.comparisons);

  // Web Speech API hook
  const speech = useSpeechSynthesis();

  // Word Detail Modal state
  const [selectedWord, setSelectedWord] = useState<VocabularyWordItem | null>(
    null
  );

  // Overview Daily Check-in Activity state
  const [dailyCheckAnswer, setDailyCheckAnswer] = useState<string>("");
  const [dailyCheckSubmitted, setDailyCheckSubmitted] = useState(false);

  // Dictionary Tab state (100% Live Free Internet Dictionary)
  const [dictSearch, setDictSearch] = useState("");
  const [dictPartOfSpeech, setDictPartOfSpeech] = useState<string>("ALL");
  const [dictDifficulty, setDictDifficulty] = useState<string>("ALL");
  const [dictPage, setDictPage] = useState(1);
  const [isSearchingExternal, setIsSearchingExternal] = useState(true);
  const [comparisonSearch, setComparisonSearch] = useState("");

  // Categories Tab state
  const [activeCategorySlug, setActiveCategorySlug] =
    useState<WordWiseCategorySlug>(
      initialData.categories[0]?.slug ?? "academic-vocabulary"
    );
  const [catSearch, setCatSearch] = useState("");
  const [catDifficulty, setCatDifficulty] = useState<string>("ALL");

  // Rule-Based Academic Writing Helper state
  const [writingInput, setWritingInput] = useState<string>(
    SAMPLE_WRITING_PROMPTS[0]!
  );
  const [writingResult, setWritingResult] = useState<WritingImprovementResult>(
    () => analyzeAcademicWriting(SAMPLE_WRITING_PROMPTS[0]!)
  );
  const [writingChecking, setWritingChecking] = useState(false);
  const [copiedRewrite, setCopiedRewrite] = useState(false);

  // Filter live dictionary entries by Part of Speech & Difficulty
  const rankedDictWords = useMemo(() => {
    return liveDictWords.filter((item) => {
      if (dictPartOfSpeech !== "ALL" && item.partOfSpeech !== dictPartOfSpeech) {
        return false;
      }
      if (dictDifficulty !== "ALL" && item.difficulty !== dictDifficulty) {
        return false;
      }
      return true;
    });
  }, [liveDictWords, dictPartOfSpeech, dictDifficulty]);

  const dictTotal = rankedDictWords.length;
  const dictTotalPages = Math.max(1, Math.ceil(dictTotal / 18));
  const safeDictPage = Math.min(Math.max(1, dictPage), dictTotalPages);

  const dictItems = useMemo(() => {
    const start = (safeDictPage - 1) * 18;
    return rankedDictWords.slice(start, start + 18);
  }, [rankedDictWords, safeDictPage]);

  const dictLoading = isSearchingExternal;

  // 100% Live Free Internet Dictionary lookup (Free Dictionary API + Datamuse WordNet/Wiktionary):
  // Runs on initial open ("All"), on A–Z letter click, and on any typed search query.
  useEffect(() => {
    const q = dictSearch.trim();
    let isSubscribed = true;
    const controller = new AbortController();

    const timer = setTimeout(
      async () => {
        setIsSearchingExternal(true);
        try {
          const internetItems = await searchFreeInternetDictionary(
            q,
            controller.signal
          );
          if (isSubscribed) {
            setLiveDictWords(internetItems);
          }
        } catch {
          // Aborted or offline
        } finally {
          if (isSubscribed) {
            setIsSearchingExternal(false);
          }
        }
      },
      q.length === 0 || q.length === 1 ? 50 : 220
    );

    return () => {
      isSubscribed = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [dictSearch]);

  const openWordDetailModal = useCallback((word: VocabularyWordItem) => {
    setSelectedWord(word);
    if (word.synonyms.length === 0) {
      void lookupGeneralEnglishWord(word.word)
        .then((enriched) => {
          if (enriched) {
            setSelectedWord((prev) =>
              prev && prev.slug === word.slug ? enriched : prev
            );
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const handleRunWritingCheck = useCallback(() => {
    const trimmed = writingInput.trim();
    if (!trimmed) {
      toast.error("Please enter a sentence or paragraph to analyze.");
      return;
    }
    setWritingChecking(true);
    setWritingResult(analyzeAcademicWriting(trimmed));
    setWritingChecking(false);
  }, [writingInput]);

  const handleCopyImprovedText = useCallback(async () => {
    if (!writingResult.improvedText) return;
    try {
      await navigator.clipboard.writeText(writingResult.improvedText);
      setCopiedRewrite(true);
      toast.success("Copied formal rewrite to clipboard.");
      setTimeout(() => setCopiedRewrite(false), 2000);
    } catch {
      toast.error("Unable to copy text automatically.");
    }
  }, [writingResult.improvedText]);

  // Daily mini-activity options for Overview tab
  const dailyActivityOptions = useMemo(() => {
    const others = words
      .filter((w) => w.id !== wordOfTheDay.id)
      .slice(0, 3)
      .map((w) => w.simpleDefinition);
    return [wordOfTheDay.simpleDefinition, ...others].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [wordOfTheDay, words]);

  // Filtered words for Categories tab
  const selectedCategoryObj = useMemo(
    () =>
      categories.find((c) => c.slug === activeCategorySlug) ?? categories[0]!,
    [activeCategorySlug, categories]
  );

  const categoryWords = useMemo(() => {
    return rankAndFilterVocabularyWords(words, catSearch, {
      categorySlug: activeCategorySlug,
      difficulty: catDifficulty,
    });
  }, [activeCategorySlug, catDifficulty, catSearch, words]);

  // Filtered comparisons for Formal vs. Informal section (prefix and relevance prioritized)
  const filteredComparisons = useMemo(() => {
    const q = comparisonSearch.trim().toLowerCase();
    if (!q) return comparisons;
    return comparisons
      .map((c) => {
        let score = 999;
        const formal = c.formalAlternative.toLowerCase();
        const informal = c.informalExpression.toLowerCase();
        if (formal === q || informal === q) score = 0;
        else if (formal.startsWith(q) || informal.startsWith(q)) score = 10;
        else if (formal.includes(q) || informal.includes(q)) score = 20;
        else if (q.length >= 3 && c.whenAppropriate.toLowerCase().includes(q)) {
          score = 30;
        }
        return { item: c, score };
      })
      .filter((entry) => entry.score < 999)
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.item.formalAlternative.localeCompare(b.item.formalAlternative)
      )
      .map((entry) => entry.item);
  }, [comparisonSearch, comparisons]);

  const renderSpeakerButton = (
    clipId: string,
    textToSpeak: string,
    label: string,
    compact = false
  ) => {
    const isThisPlaying = speech.isPlaying && speech.activeClipId === clipId;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isThisPlaying) {
            speech.stop();
          } else {
            speech.speak({ clipId, text: textToSpeak });
          }
        }}
        disabled={!speech.isSupported}
        title={
          speech.isSupported
            ? isThisPlaying
              ? "Stop audio playback"
              : `${label} (${speech.rateMode === "slow" ? "0.75x Slow" : "1.0x Normal"} • Google US English)`
            : "Web Speech synthesis is not supported in this browser"
        }
        className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
          compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        } ${
          !speech.isSupported
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-[#10131B] dark:text-slate-600"
            : isThisPlaying
            ? "border-amber-500 bg-amber-500 text-slate-950"
            : "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        }`}
      >
        {isThisPlaying ? (
          <>
            <Square className="h-3 w-3 fill-current text-slate-950" />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5 text-amber-500" />
            <span>{label}</span>
          </>
        )}
      </button>
    );
  };

  const renderWordSpeedButtons = (
    clipId: string,
    textToSpeak: string,
    compact = true
  ) => {
    if (!speech.isSupported) return null;
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#10131B] p-0.5 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
        title="Select playback speed (Google US English)"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            speech.setRateMode("normal");
            speech.speak({
              clipId: `${clipId}-1x`,
              text: textToSpeak,
              rateMode: "normal",
            });
          }}
          className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
            speech.rateMode === "normal"
              ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          1.0x
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            speech.setRateMode("slow");
            speech.speak({
              clipId: `${clipId}-075x`,
              text: textToSpeak,
              rateMode: "slow",
            });
          }}
          className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
            speech.rateMode === "slow"
              ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          0.75x
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ─── Compact Header Card (Matching IBE Learning Hub UI) ─── */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                IBE WordWise
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                Live English Dictionary &amp; Academic Language Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Welcome,{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {initialData.studentName}
              </span>
              . Explore over{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                150,000+ English words
              </span>{" "}
              in the live A–Z dictionary with real IPA phonetics and audio
              pronunciation, or study{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {words.length} curated academic terms
              </span>{" "}
              across {categories.length} structured categories, daily Word of the
              Day spotlights, and interactive vocabulary practice.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <BookOpen className="w-3 h-3" />
                150,000+ Live Dictionary Words
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <Layers className="w-3 h-3 text-amber-500" />
                {categories.length} Academic Categories ({words.length} Curated Terms)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <Volume2 className="w-3 h-3 text-amber-500" />
                IPA &amp; Voice Pronunciation
              </span>
            </div>
          </div>

          {/* Compact Pronunciation Audio Bar (Hidden per request, not removed) & Action Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="hidden" aria-hidden="true">
              {speech.isSupported ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 px-3 py-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    Audio:
                  </span>
                  <button
                    type="button"
                    onClick={() => speech.setRateMode("normal")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      speech.rateMode === "normal"
                        ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    1.0x
                  </button>
                  <button
                    type="button"
                    onClick={() => speech.setRateMode("slow")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      speech.rateMode === "slow"
                        ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    0.75x
                  </button>
                  {speech.voices.length > 0 && (
                    <select
                      aria-label="Pronunciation Voice"
                      value={speech.selectedVoiceURI}
                      onChange={(e) => speech.setSelectedVoiceURI(e.target.value)}
                      className="max-w-[140px] truncate rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      {speech.voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  )}
                  {speech.isPlaying && (
                    <button
                      type="button"
                      onClick={speech.stop}
                      className="inline-flex items-center gap-1 rounded bg-rose-500/90 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-600 cursor-pointer"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      Stop
                    </button>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
                  <VolumeX className="w-3.5 h-3.5 text-amber-500" />
                  Phonetic Guides Enabled
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  activeTab === "dictionary" ? "categories" : "dictionary"
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              {activeTab === "dictionary"
                ? `Browse Categories (${categories.length})`
                : "Open Dictionary"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Clean Underline Tabs (Matching IBE Learning Hub UI) ─── */}
      <div
        role="tablist"
        aria-label="WordWise Navigation"
        className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar"
      >
        {[
          {
            id: "overview" as const,
            label: "Overview",
            icon: Compass,
          },
          {
            id: "dictionary" as const,
            label: "Dictionary",
            icon: BookOpen,
          },
          {
            id: "categories" as const,
            label: `Categories (${categories.length})`,
            icon: Layers,
          },
          {
            id: "word-of-the-day" as const,
            label: "Word of the Day",
            icon: Calendar,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          1. OVERVIEW DASHBOARD
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Word of the Day Preview + Daily Vocabulary Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Word of the Day Preview Card */}
            <div className="lg:col-span-7 rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors">
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Word of the Day • {initialData.todayDateKey}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${difficultyBadgeStyle(
                      wordOfTheDay.difficulty
                    )}`}
                  >
                    {wordOfTheDay.difficulty}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 shrink-0" />
                    {wordOfTheDay.categoryName}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {wordOfTheDay.word}
                    </h2>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {wordOfTheDay.pronunciation}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {wordOfTheDay.partOfSpeech}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {wordOfTheDay.formalDefinition}
                </p>

                {wordOfTheDay.examples[0] && (
                  <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Academic Example Sentence
                    </div>
                    <p className="text-xs italic text-slate-600 dark:text-slate-400 leading-relaxed">
                      &ldquo;{wordOfTheDay.examples[0].sentence}&rdquo;
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {wordOfTheDay.synonyms.slice(0, 4).map((syn) => (
                    <span
                      key={syn}
                      className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#10131B] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-medium"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {renderSpeakerButton(
                    `overview-wod-word-${wordOfTheDay.id}`,
                    wordOfTheDay.word,
                    "Listen to Word",
                    true
                  )}
                  {renderWordSpeedButtons(
                    `overview-wod-word-${wordOfTheDay.id}`,
                    wordOfTheDay.word,
                    true
                  )}
                  {renderSpeakerButton(
                    `overview-wod-ex-${wordOfTheDay.id}`,
                    wordOfTheDay.examples[0]?.sentence ?? wordOfTheDay.word,
                    "Listen to Example",
                    true
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("word-of-the-day")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Full Word of the Day
                </button>
              </div>
            </div>

            {/* Daily Vocabulary Activity Card */}
            <div className="lg:col-span-5 rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Daily Vocabulary Check
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Comprehension
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    Which definition matches &ldquo;{wordOfTheDay.word}&rdquo;?
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Select the accurate meaning for today&apos;s featured vocabulary term.
                  </p>
                </div>

                <div className="space-y-2">
                  {dailyActivityOptions.map((option) => {
                    const isSelected = dailyCheckAnswer === option;
                    const isCorrectOption =
                      option === wordOfTheDay.simpleDefinition;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setDailyCheckAnswer(option);
                          setDailyCheckSubmitted(true);
                        }}
                        className={`w-full rounded-lg border p-3 text-left text-xs transition-colors cursor-pointer ${
                          dailyCheckSubmitted && isCorrectOption
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-semibold"
                            : dailyCheckSubmitted &&
                              isSelected &&
                              !isCorrectOption
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                            : isSelected
                            ? "border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white"
                            : "bg-slate-50/70 hover:bg-slate-100 dark:bg-[#10131B] dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {dailyCheckSubmitted && (
                <div
                  className={`rounded-lg border p-3 text-xs ${
                    dailyCheckAnswer === wordOfTheDay.simpleDefinition
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {dailyCheckAnswer === wordOfTheDay.simpleDefinition ? (
                    <span className="font-semibold">
                      Correct! &ldquo;{wordOfTheDay.word}&rdquo; means:{" "}
                      {wordOfTheDay.simpleDefinition}
                    </span>
                  ) : (
                    <span>
                      Not quite — &ldquo;{wordOfTheDay.word}&rdquo; means:{" "}
                      <strong>{wordOfTheDay.simpleDefinition}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Category Jump Strip (Matching Learning Hub Subject Jump Strip) */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Jump Straight to an Academic &amp; Formal Category
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any category below to view curated vocabulary for essays, research papers, and formal communication.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                View All Categories →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    setActiveCategorySlug(cat.slug);
                    setActiveTab("categories");
                  }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 hover:bg-slate-100 dark:bg-[#10131B] dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-left transition-colors cursor-pointer group"
                >
                  <div className="pr-2 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                      {cat.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {cat.description}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold shrink-0">
                    {cat.wordCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          2. VOCABULARY DICTIONARY + FORMAL VS. INFORMAL + WRITING CHECKER
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "dictionary" && (
        <div className="space-y-5">
          {/* Clean Dictionary Search Control Panel */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Live Free English Dictionary</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Search any English word or browse A–Z in real time for definitions, IPA phonetics, audio pronunciation, synonyms, antonyms, and usage examples.
                </p>
              </div>
              <span className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                Live Dictionary API • 150,000+ Words
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="lg:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Search vocabulary dictionary"
                  value={dictSearch}
                  onChange={(e) => {
                    setDictSearch(e.target.value);
                    setDictPage(1);
                  }}
                  placeholder="Search any English word, academic term, definition, or synonym..."
                  className="w-full pl-10 pr-9 py-2 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
                {dictSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDictSearch("");
                      setDictPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Part of Speech Filter */}
              <div className="lg:col-span-2">
                <ResponsiveSelect<string>
                  ariaLabel="Filter by Part of Speech"
                  value={dictPartOfSpeech}
                  onChange={(val) => {
                    setDictPartOfSpeech(val);
                    setDictPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "All Parts of Speech" },
                    { value: "Noun", label: "Noun" },
                    { value: "Verb", label: "Verb" },
                    { value: "Adjective", label: "Adjective" },
                    { value: "Adverb", label: "Adverb" },
                    { value: "Phrase", label: "Phrase / Conjunction" },
                  ]}
                />
              </div>

              {/* Difficulty Filter */}
              <div className="lg:col-span-2">
                <ResponsiveSelect<string>
                  ariaLabel="Filter by Difficulty"
                  value={dictDifficulty}
                  onChange={(val) => {
                    setDictDifficulty(val);
                    setDictPage(1);
                  }}
                  align="right"
                  options={[
                    { value: "ALL", label: "All Levels" },
                    { value: "BEGINNER", label: "Beginner" },
                    { value: "INTERMEDIATE", label: "Intermediate" },
                    { value: "ADVANCED", label: "Advanced" },
                  ]}
                />
              </div>
            </div>

            {/* Alphabetical Quick Jump Strip */}
            <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                A–Z Jump:
              </span>
              <button
                type="button"
                onClick={() => {
                  setDictSearch("");
                  setDictPage(1);
                }}
                className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  !dictSearch.trim()
                    ? "bg-[#D97706] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                All
              </button>
              {ALPHABET_LETTERS.map((letter) => {
                const isActive = dictSearch.trim().toUpperCase() === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      setDictSearch(letter);
                      setDictPage(1);
                    }}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#D97706] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                    title={`Words starting with ${letter}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>
                Showing{" "}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {dictItems.length}
                </strong>{" "}
                of{" "}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {dictTotal.toLocaleString()}
                </strong>{" "}
                live dictionary entries (Page {safeDictPage} of {dictTotalPages})
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                {isSearchingExternal ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Fetching from Free English Dictionary...</span>
                  </>
                ) : (
                  <span>Live Free English Dictionary (WordNet &amp; Wiktionary)</span>
                )}
              </span>
            </div>
            {(dictSearch.trim() !== "" ||
              dictPartOfSpeech !== "ALL" ||
              dictDifficulty !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setDictSearch("");
                  setDictPartOfSpeech("ALL");
                  setDictDifficulty("ALL");
                  setDictPage(1);
                }}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Reset search filters
              </button>
            )}
          </div>

          {/* Dictionary Word Cards Grid */}
          {dictLoading ? (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] py-16 flex items-center justify-center shadow-xs">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span className="ml-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Searching vocabulary dictionary...
              </span>
            </div>
          ) : dictItems.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-10 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 text-amber-500 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No matching vocabulary entries found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Try clearing your Part of Speech or Level filter, or search any single English word.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDictSearch("");
                  setDictPartOfSpeech("ALL");
                  setDictDifficulty("ALL");
                  setDictPage(1);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dictItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold">
                        {item.partOfSpeech}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${difficultyBadgeStyle(
                          item.difficulty
                        )}`}
                      >
                        {item.difficulty}
                      </span>
                    </div>

                    {/* Category & Word Title */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 shrink-0" />
                        {item.categoryName}
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {item.word}
                        </h3>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {item.pronunciation}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-800 dark:text-slate-200">
                        Simple:
                      </strong>{" "}
                      {item.simpleDefinition}
                    </p>

                    {/* Formal Definition & Example Callout Box */}
                    <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-2.5 space-y-1.5 text-[11px]">
                      <div className="text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Formal:{" "}
                        </span>
                        {item.formalDefinition}
                      </div>
                      {item.examples[0] && (
                        <div className="italic text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/5">
                          &ldquo;{item.examples[0].sentence}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Synonyms Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {item.synonyms.slice(0, 4).map((syn) => (
                        <span
                          key={syn}
                          className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#10131B] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-medium"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {renderSpeakerButton(
                          `dict-word-${item.id}`,
                          item.word,
                          "Word",
                          true
                        )}
                        {renderSpeakerButton(
                          `dict-def-${item.id}`,
                          item.formalDefinition,
                          "Definition",
                          true
                        )}
                        {item.examples[0] &&
                          renderSpeakerButton(
                            `dict-ex-${item.id}`,
                            item.examples[0].sentence,
                            "Example",
                            true
                          )}
                      </div>
                      {renderWordSpeedButtons(
                        `dict-word-${item.id}`,
                        item.word,
                        true
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openWordDetailModal(item)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Open Detailed View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dictionary Pagination */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Showing page{" "}
              <strong className="font-mono text-slate-900 dark:text-white">
                {safeDictPage}
              </strong>{" "}
              of{" "}
              <strong className="font-mono text-slate-900 dark:text-white">
                {dictTotalPages}
              </strong>{" "}
              ({dictTotal.toLocaleString()} matching records &middot; type any word in Search to fetch from Live English Dictionary)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeDictPage <= 1}
                onClick={() => setDictPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-white/10 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={safeDictPage >= dictTotalPages}
                onClick={() =>
                  setDictPage((p) => Math.min(dictTotalPages, p + 1))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-white/10 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ─── Formal vs. Informal Vocabulary Interactive Comparison ─── */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Formal vs. Informal Vocabulary Comparison
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare everyday conversational phrases against their formal
                  academic alternatives. Click the speaker button to hear each
                  formal vocabulary word.
                </p>
              </div>
              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={comparisonSearch}
                  onChange={(e) => setComparisonSearch(e.target.value)}
                  placeholder="Filter expressions..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-4 font-semibold">
                      Informal Expression
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      Formal Alternative
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      When Formal Alternative Is Appropriate
                    </th>
                    <th className="py-3 pl-4 font-semibold">
                      Example Transformation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {filteredComparisons.map((cmp) => (
                    <tr key={cmp.id} className="align-top">
                      <td className="py-3.5 pr-4">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-semibold">
                          {cmp.informalExpression}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {cmp.formalAlternative}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {cmp.pronunciation}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {renderSpeakerButton(
                              `cmp-formal-${cmp.id}`,
                              cmp.formalAlternative,
                              "Listen",
                              true
                            )}
                            {renderWordSpeedButtons(
                              `cmp-formal-${cmp.id}`,
                              cmp.formalAlternative,
                              true
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                        {cmp.whenAppropriate}
                      </td>
                      <td className="py-3.5 pl-4 space-y-1 max-w-sm">
                        <p className="text-slate-500 line-through">
                          {cmp.informalSentence}
                        </p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {cmp.formalSentence}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Rule-Based Academic Writing Improvement ─── */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5" />
                  Rule-Based Academic Writing Improvement
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Formal &amp; Academic Style Checker
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter a draft sentence or short paragraph below to highlight
                  informal expressions and view formal academic alternatives.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_WRITING_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWritingInput(sample);
                      setWritingResult(analyzeAcademicWriting(sample));
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Sample {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 space-y-3">
                <textarea
                  rows={4}
                  value={writingInput}
                  onChange={(e) => setWritingInput(e.target.value)}
                  placeholder="Paste or type a sentence or short paragraph..."
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {writingResult.wordCount} words • Formality index:{" "}
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {writingResult.formalityScorePct}%
                    </strong>
                  </span>
                  <button
                    type="button"
                    disabled={writingChecking}
                    onClick={handleRunWritingCheck}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    Analyze Formal Style
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Suggested Formal Rewrite
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {writingResult.improvedText && (
                        <>
                          {renderSpeakerButton(
                            "writing-improved-speech",
                            writingResult.improvedText,
                            "Listen",
                            true
                          )}
                          {renderWordSpeedButtons(
                            "writing-improved-speech",
                            writingResult.improvedText,
                            true
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyImprovedText}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                      >
                        {copiedRewrite ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-amber-500" />
                            Copy Rewrite
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                    {writingResult.improvedText ||
                      "Enter text to generate a formal rewrite."}
                  </p>
                </div>

                {writingResult.suggestions.length === 0 ? (
                  <p className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3 text-xs text-slate-600 dark:text-slate-400">
                    No informal phrases matched our rule set. Your sentence
                    already avoids common conversational phrasal verbs!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {writingResult.suggestions.map((sug) => (
                      <div
                        key={sug.id}
                        className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3 text-xs space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-semibold line-through">
                            {sug.matchedText}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                            {sug.recommendedReplacement}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            (Alternatives: {sug.alternatives.join(", ")})
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          {sug.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{WRITING_IMPROVEMENT_DISCLAIMER}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          3. VOCABULARY CATEGORIES
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "categories" && (
        <div className="space-y-5">
          {/* Category Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const isSelected = cat.slug === activeCategorySlug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActiveCategorySlug(cat.slug)}
                  className={`rounded-xl border-2 p-5 text-left shadow-xs flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-amber-500 bg-white dark:bg-[#141721]"
                      : "border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] hover:border-slate-300 dark:hover:border-white/25"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Layers className="w-3 h-3" />
                          Academic Category
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {cat.name}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono font-semibold shrink-0">
                        {cat.wordCount} words
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Category Filter & Header */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Selected Vocabulary Category
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {selectedCategoryObj.name} ({categoryWords.length} words)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCategoryObj.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder={`Search in ${selectedCategoryObj.name}...`}
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="w-40">
                  <ResponsiveSelect<string>
                    ariaLabel="Category Difficulty Filter"
                    value={catDifficulty}
                    onChange={setCatDifficulty}
                    align="right"
                    options={[
                      { value: "ALL", label: "All Levels" },
                      { value: "BEGINNER", label: "Beginner" },
                      { value: "INTERMEDIATE", label: "Intermediate" },
                      { value: "ADVANCED", label: "Advanced" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Category Words Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryWords.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold">
                      {item.partOfSpeech}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${difficultyBadgeStyle(
                        item.difficulty
                      )}`}
                    >
                      {item.difficulty}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.word}
                    </h4>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {item.pronunciation}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.formalDefinition}
                  </p>

                  <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">
                      Usage:{" "}
                    </strong>
                    {item.usageContext}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {renderSpeakerButton(
                      `cat-word-${item.id}`,
                      item.word,
                      "Speak",
                      true
                    )}
                    {item.examples[0] &&
                      renderSpeakerButton(
                        `cat-ex-${item.id}`,
                        item.examples[0].sentence,
                        "Example",
                        true
                      )}
                    {renderWordSpeedButtons(
                      `cat-word-${item.id}`,
                      item.word,
                      true
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openWordDetailModal(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. WORD OF THE DAY (DETERMINISTIC DAILY SELECTION)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "word-of-the-day" && (
        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  Word of the Day • {initialData.todayDateKey}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${difficultyBadgeStyle(
                    wordOfTheDay.difficulty
                  )}`}
                >
                  {wordOfTheDay.difficulty}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white pt-1">
                {wordOfTheDay.word}
              </h2>
              <p className="font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {wordOfTheDay.pronunciation} • {wordOfTheDay.partOfSpeech} •{" "}
                <span className="text-amber-600 dark:text-amber-400 font-sans font-semibold">
                  {wordOfTheDay.categoryName}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderSpeakerButton(
                `wod-main-word-${wordOfTheDay.id}`,
                wordOfTheDay.word,
                "Listen to Word"
              )}
              {renderWordSpeedButtons(
                `wod-main-word-${wordOfTheDay.id}`,
                wordOfTheDay.word,
                false
              )}
              {renderSpeakerButton(
                `wod-main-def-${wordOfTheDay.id}`,
                wordOfTheDay.formalDefinition,
                "Listen to Definition"
              )}
              {wordOfTheDay.examples[0] &&
                renderSpeakerButton(
                  `wod-main-ex-${wordOfTheDay.id}`,
                  wordOfTheDay.examples[0].sentence,
                  "Listen to Example"
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Simple Definition
                </h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {wordOfTheDay.simpleDefinition}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Formal &amp; Academic Definition
                </h3>
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                  {wordOfTheDay.formalDefinition}
                </p>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contextual Example Sentences
                </h3>
                {wordOfTheDay.examples.map((ex, i) => (
                  <div
                    key={ex.id}
                    className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-2"
                  >
                    <p className="text-xs sm:text-sm italic text-slate-800 dark:text-slate-200 leading-relaxed">
                      &ldquo;{ex.sentence}&rdquo;
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Context: {ex.contextNote ?? "Academic & formal usage"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {renderSpeakerButton(
                          `wod-sentence-${i}-${ex.id}`,
                          ex.sentence,
                          "Play Sentence",
                          true
                        )}
                        {renderWordSpeedButtons(
                          `wod-sentence-${i}-${ex.id}`,
                          ex.sentence,
                          true
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500 shrink-0" />
                  Academic &amp; Formal Usage Guide
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {wordOfTheDay.usageContext}
                </p>
                {wordOfTheDay.formalUsageNote && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/10">
                    <strong className="text-slate-700 dark:text-slate-200">
                      Writing Tip:{" "}
                    </strong>
                    {wordOfTheDay.formalUsageNote}
                  </p>
                )}
                {wordOfTheDay.informalEquivalent && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <strong className="text-slate-700 dark:text-slate-200">
                      Replaces Informal Phrase:{" "}
                    </strong>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-semibold">
                      {wordOfTheDay.informalEquivalent}
                    </span>
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Synonyms
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {wordOfTheDay.synonyms.map((syn) => (
                      <span
                        key={syn}
                        className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold"
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Antonyms
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {wordOfTheDay.antonyms.map((ant) => (
                      <span
                        key={ant}
                        className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-semibold"
                      >
                        {ant}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VOCABULARY WORD DETAILED VIEW MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {selectedWord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedWord.word}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedWord(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <Tag className="w-3 h-3" />
                    {selectedWord.categoryName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${difficultyBadgeStyle(
                      selectedWord.difficulty
                    )}`}
                  >
                    {selectedWord.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedWord.word}
                </h2>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {selectedWord.pronunciation} • {selectedWord.partOfSpeech}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderSpeakerButton(
                `modal-word-${selectedWord.id}`,
                selectedWord.word,
                "Listen to Word"
              )}
              {renderWordSpeedButtons(
                `modal-word-${selectedWord.id}`,
                selectedWord.word,
                false
              )}
              {renderSpeakerButton(
                `modal-def-${selectedWord.id}`,
                selectedWord.formalDefinition,
                "Listen to Definition"
              )}
              {selectedWord.examples[0] &&
                renderSpeakerButton(
                  `modal-ex-${selectedWord.id}`,
                  selectedWord.examples[0].sentence,
                  "Listen to Example"
                )}
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Simple Definition
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedWord.simpleDefinition}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Formal / Academic Definition
                </h4>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  {selectedWord.formalDefinition}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Academic &amp; Formal Usage Context
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedWord.usageContext}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Example Sentences
                </h4>
                {selectedWord.examples.map((ex) => (
                  <div
                    key={ex.id}
                    className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3 italic text-slate-700 dark:text-slate-300"
                  >
                    &ldquo;{ex.sentence}&rdquo;
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Synonyms
                  </h4>
                  <p className="mt-1 text-emerald-700 dark:text-emerald-400 font-medium">
                    {selectedWord.synonyms.join(", ")}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50/80 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-3">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Antonyms
                  </h4>
                  <p className="mt-1 text-rose-700 dark:text-rose-400 font-medium">
                    {selectedWord.antonyms.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
