"use client";

import { useState, useMemo } from "react";
import type { FlashcardDeck } from "@/lib/lms-types";
import DeckCard from "./DeckCard";
import DeckDetailView from "./DeckDetailView";
import { field, iconButton, panel, primaryButton, secondaryButton } from "./styles";
import Modal from "@/components/common/Modal";
import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";

import type { InstituteTheme } from "@/lib/theme";
import FocusButton from "@/components/focus/FocusButton";

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
  const [newColor, setNewColor] = useState(theme.colors.primary);
  const [newCourseId, setNewCourseId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete confirmation state
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setNewColor(theme.colors.primary);
    setNewCourseId("");
    setCreateError(null);
  };

  const confirmDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/flashcards/decks?id=${deckToDelete}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete deck");
      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete));
      if (activeDeck?.id === deckToDelete) setActiveDeck(null);
      setDeckToDelete(null);
    } catch {
      // Handle error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDeck = (id: string) => {
    setDeckToDelete(id);
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
      <DeckDetailView
        deck={activeDeck}
        onBack={() => {
          setActiveDeck(null);
          refreshDecks();
        }}
        onDeckUpdated={handleDeckUpdated}
      />
    );
  }

  // Main deck grid
  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-theme pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-primary-theme sm:text-3xl">Flashcards</h1>
          <p className="mt-1 text-sm/6 text-secondary-theme">Create decks, review course material, and track your progress.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FocusButton contextType="FLASHCARDS" title="Flashcard Practice" />
          <button type="button" onClick={() => setCreateOpen(true)} className={primaryButton}>
            <Plus aria-hidden="true" className="size-4" /> New deck
          </button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-theme" />
          <input
            type="search"
            aria-label="Search decks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decks"
            className={`${field} pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden`}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className={`absolute right-0 top-0 ${iconButton}`}>
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setShowFilters(value => !value)} aria-expanded={showFilters} aria-controls="flashcard-filters" className={secondaryButton}>
          <SlidersHorizontal aria-hidden="true" className="size-4" /> Filters{filterCourse ? " (1)" : ""}
        </button>
      </div>

      <div id="flashcard-filters" hidden={!showFilters} className={`mb-5 p-4 ${panel}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-44">
            <label htmlFor="flashcard-course" className="mb-1 block text-sm font-semibold text-primary-theme">Course</label>
            <select id="flashcard-course" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={`${field} cursor-pointer`}>
              <option value="">All courses</option>
              {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.code} â€” {c.title}</option>)}
            </select>
          </div>
          {filterCourse && <button type="button" onClick={() => setFilterCourse("")} className={secondaryButton}>Clear filter</button>}
        </div>
      </div>

      {filteredDecks.length === 0 ? (
        <div className={`flex flex-col items-center px-4 py-12 text-center ${panel}`}>
          <span className="mb-4 grid size-12 place-items-center rounded-xl bg-canvas text-primary-theme"><FlashcardIcon aria-hidden="true" className="size-6" /></span>
          <h2 className="text-lg font-semibold text-primary-theme">{searchQuery || filterCourse ? "No matching decks" : "No decks yet"}</h2>
          <p className="mt-1 max-w-sm text-sm/6 text-secondary-theme">{searchQuery || filterCourse ? "Try a different search or course filter." : "Create a deck to start adding and reviewing cards."}</p>
          {!searchQuery && !filterCourse && (
            <button type="button" onClick={() => setCreateOpen(true)} className={`mt-4 ${primaryButton}`}>
              <Plus aria-hidden="true" className="size-4" /> Create a deck
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDecks.map((deck) => <DeckCard key={deck.id} deck={deck} onClick={() => setActiveDeck(deck)} onDelete={handleDeleteDeck} />)}
        </div>
      )}

      {/* Create Deck Modal */}
      <Modal
        open={createOpen}
        title="New deck"
        onClose={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
      >
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!creating) void handleCreateDeck(); }}>
          {createError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-300">{createError}</p>}
          <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
            <span>Deck title</span>
            <input type="text" required value={newTitle} onChange={event => setNewTitle(event.target.value)} className={field} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
            <span>Description <span className="font-normal text-secondary-theme">(optional)</span></span>
            <textarea value={newDescription} onChange={event => setNewDescription(event.target.value)} rows={2} className={`${field} resize-y font-normal`} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
            <span>Tags <span className="font-normal text-secondary-theme">(comma-separated)</span></span>
            <input type="text" value={newTags} onChange={event => setNewTags(event.target.value)} className={field} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
            <span>Course <span className="font-normal text-secondary-theme">(optional)</span></span>
            <select value={newCourseId} onChange={event => setNewCourseId(event.target.value)} className={`${field} cursor-pointer`}>
              <option value="">No course linked</option>
              {courseOptions.map(course => <option key={course.id} value={course.id}>{course.code} - {course.title}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-4">
            <button type="button" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={creating} className={primaryButton}>{creating ? "Creating..." : "Create deck"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deckToDelete}
        title="Delete deck"
        onClose={() => {
          if (!isDeleting) setDeckToDelete(null);
        }}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-[#8B92A5]">
            Deleting this deck permanently removes all of its cards.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeckToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteDeck}
              disabled={isDeleting}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Delete deck"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
