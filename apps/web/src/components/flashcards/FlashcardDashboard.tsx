"use client";

import { useState, useMemo } from "react";
import type { FlashcardDeck } from "@/lib/lms-types";
import DeckCard from "./DeckCard";
import DeckDetailView from "./DeckDetailView";
import Modal from "@/components/common/Modal";
import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";

import type { InstituteTheme } from "@/lib/theme";

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface FlashcardDashboardProps {
  instituteCode: string;
  initialDecks: FlashcardDeck[];
  courseOptions: CourseOption[];
  theme: InstituteTheme;
}

const DECK_COLORS = [
  // Deep, High Contrast, & Visually Distinct
  "#0f172a", // Slate 900 (Dark Grey/Black)
  "#1e3a8a", // Blue 900 (Deep Blue)
  "#4c1d95", // Violet 900 (Deep Purple)
  "#831843", // Pink 900 (Deep Rose)
  "#7f1d1d", // Red 900 (Deep Red)
  "#7c2d12", // Orange 900 (Deep Rust)
  "#713f12", // Yellow 900 (Deep Gold/Bronze)
  "#14532d", // Green 900 (Deep Forest)
  "#164e63", // Cyan 900 (Deep Teal)
];

export default function FlashcardDashboard({
  instituteCode,
  initialDecks,
  courseOptions,
  theme,
}: FlashcardDashboardProps) {
  const [decks, setDecks] = useState<FlashcardDeck[]>(initialDecks);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // New deck form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newColor, setNewColor] = useState(DECK_COLORS[0]);
  const [newCourseId, setNewCourseId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Filtered decks
  const filteredDecks = useMemo(() => {
    let result = decks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filterCourse) {
      result = result.filter((d) => d.courseId === filterCourse);
    }

    return result;
  }, [decks, searchQuery, filterCourse]);

  const handleCreateDeck = async () => {
    if (!newTitle.trim()) {
      setCreateError("Deck title is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const tags = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/flashcards/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          tags,
          color: newColor,
          courseId: newCourseId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create deck.");
      }

      const deck = await res.json();
      setDecks((prev) => [deck, ...prev]);
      setCreateOpen(false);
      resetCreateForm();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewTags("");
    setNewColor(DECK_COLORS[0]);
    setNewCourseId("");
    setCreateError(null);
  };

  const handleDeleteDeck = async (id: string) => {
    if (!confirm("Are you sure you want to delete this flashcard? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/flashcards/decks?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete deck");
      setDecks((prev) => prev.filter((d) => d.id !== id));
      if (activeDeck?.id === id) setActiveDeck(null);
    } catch {
      // Handle error
    }
  };

  const handleDeckUpdated = (updated: FlashcardDeck) => {
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    if (activeDeck?.id === updated.id) setActiveDeck(updated);
  };

  const refreshDecks = async () => {
    try {
      const res = await fetch("/api/flashcards/decks");
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch {
      // Ignore
    }
  };

  // Deck detail view
  if (activeDeck) {
    return (
      <div className="page-enter">
        <DeckDetailView
          deck={activeDeck}
          onBack={() => {
            setActiveDeck(null);
            // Refresh decks to get updated stats
            refreshDecks();
          }}
          onDeckUpdated={handleDeckUpdated}
        />
      </div>
    );
  }


  // Main deck grid
  return (
    <div className="page-enter pb-12">
      {/* Anti-Slop Study Center Hero */}
      <div
        className="hero-noise relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs transition-colors"
        style={{
          borderLeft: `4px solid ${theme.colors.primary}`,
          background: `radial-gradient(ellipse at 25% 45%, ${theme.colors.primary}15 0%, transparent 70%), var(--bg-surface, #FFFFFF)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide uppercase"
              style={{
                backgroundColor: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
              }}
            >
              <FlashcardIcon className="h-3.5 w-3.5" />
              <span>Study Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] mb-2">
              Flashcards
            </h1>
            <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-[#8B92A5] leading-relaxed">
              Master your subjects faster. Create custom decks, practice with spaced repetition, and track your progress in real-time.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setCreateOpen(true)}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span>Create New Flashcard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-[#8B92A5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your flashcards by title, topic, or tags..."
            className="w-full min-h-[48px] rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] py-3.5 pl-14 pr-12 text-sm font-medium text-slate-900 dark:text-[#F0F2F8] shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-[#8B92A5] focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 dark:bg-[#1E2132] p-1.5 text-slate-500 dark:text-[#8B92A5] transition-colors hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-2xl border px-6 text-sm font-bold transition-all shadow-xs cursor-pointer ${
            showFilters || filterCourse
              ? ""
              : "border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-[#181B26] hover:border-slate-300 dark:hover:border-white/10"
          }`}
          style={
            showFilters || filterCourse
              ? {
                  borderColor: `${theme.colors.primary}40`,
                  backgroundColor: `${theme.colors.primary}1A`,
                  color: theme.colors.primary,
                }
              : undefined
          }
        >
          <SlidersHorizontal className="h-5 w-5" />
          Filters
          {filterCourse && (
            <span
              className="ml-1.5 flex h-2 w-2 rounded-full shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-8 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex-1 min-w-62.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] mb-2">
                Filter by Course
              </label>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] px-4 py-3 text-sm font-medium text-slate-700 dark:text-[#F0F2F8] shadow-xs transition-all focus:bg-white dark:focus:bg-[#1E2132] focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20 cursor-pointer"
              >
                <option value="">All Courses</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>
            {filterCourse && (
              <button
                onClick={() => setFilterCourse("")}
                className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
                style={{ color: theme.colors.primary }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deck grid */}
      {filteredDecks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] py-24 text-center mt-4 shadow-xs">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl shadow-inner"
            style={{
              backgroundColor: `${theme.colors.primary}1A`,
              color: theme.colors.primary,
            }}
          >
            <FlashcardIcon className="h-10 w-10" />
          </div>
          <h3 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8]">
            {searchQuery || filterCourse ? "No flashcards found" : "No flashcards yet"}
          </h3>
          <p className="mb-8 max-w-md text-base text-slate-500 dark:text-[#8B92A5]">
            {searchQuery || filterCourse
              ? "We couldn't find any flashcards matching your search. Try adjusting your filters or search query."
              : "You haven't created any flashcards yet. Get started by creating your first flashcard and mastering your courses!"}
          </p>
          {!searchQuery && !filterCourse && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[44px]"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Plus className="h-5 w-5" />
              Create Your First Flashcard
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {filteredDecks.map((deck, index) => (
            <div
              key={deck.id}
              style={{
                animation: `staggerFadeIn 0.3s ease-out ${index * 60}ms both`,
              }}
            >
              <DeckCard
                deck={deck}
                onClick={() => setActiveDeck(deck)}
                onDelete={handleDeleteDeck}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Deck Modal */}
      <Modal
        open={createOpen}
        title="Create New Flashcard"
        onClose={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
      >
        <div className="space-y-6">
          {createError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-500 shadow-xs">
              {createError}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] p-5 sm:p-6">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Flashcard Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Midterms Prep, Vocabulary..."
                className="w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-3 text-sm font-medium text-slate-900 dark:text-[#F0F2F8] shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of this flashcard..."
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-3 text-sm font-medium text-slate-900 dark:text-[#F0F2F8] shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Tags <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="e.g., Midterms, Chapter 5, Vocabulary"
                className="w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-3 text-sm font-medium text-slate-900 dark:text-[#F0F2F8] shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Course <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(Optional)</span>
              </label>
              <select
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-3 text-sm font-medium text-slate-700 dark:text-[#F0F2F8] shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20 cursor-pointer"
              >
                <option value="">No course linked</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] p-5 sm:p-6">
            <label className="mb-4 block text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-3">
              {DECK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`h-10 w-10 rounded-full border-[3px] transition-all duration-300 cursor-pointer ${
                    newColor === c
                      ? "border-slate-900 dark:border-white scale-110 shadow-lg"
                      : "border-transparent hover:scale-110 hover:shadow-md"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateDeck}
              disabled={creating}
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer min-h-[44px]"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {creating ? "Creating..." : "Create Flashcard"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
