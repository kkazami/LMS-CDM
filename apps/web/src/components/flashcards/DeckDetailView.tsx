"use client";

import { useState, useEffect } from "react";
import type { FlashcardCard, FlashcardDeck } from "@/lib/lms-types";
import CardEditorModal from "./CardEditorModal";
import StudyMode from "./StudyMode";
import DeckProgress from "./DeckProgress";
import { iconButton, panel, primaryButton, secondaryButton } from "./styles";
import Modal from "@/components/common/Modal";
import {
  ArrowLeft,
  Plus,
  Play,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";

const CARD_STATUS = {
  correct: { label: "Mastered", className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" },
  incorrect: { label: "Needs Review", className: "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300" },
  unseen: { label: "Unseen", className: "bg-canvas text-secondary-theme" },
};

interface DeckDetailViewProps {
  deck: FlashcardDeck;
  onBack: () => void;
  onDeckUpdated: (deck: FlashcardDeck) => void;
}

export default function DeckDetailView({
  deck,
  onBack,
  onDeckUpdated,
}: DeckDetailViewProps) {
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardCard | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // Delete confirmation modals
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  const fetchCards = async () => {
    try {
      const res = await fetch(`/api/flashcards/cards?deckId=${deck.id}`);
      if (!res.ok) throw new Error("Failed to load cards");
      const data = await res.json();
      setCards(data);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [deck.id]);

  const handleCardSaved = (saved: FlashcardCard) => {
    setCards((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [...prev, saved];
    });

    // Update deck card count
    onDeckUpdated({
      ...deck,
      cardCount: cards.length + (cards.find((c) => c.id === saved.id) ? 0 : 1),
    });
  };

  const confirmDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);

    try {
      const ids = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/flashcards/cards?ids=${ids}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete cards");

      setCards((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setBatchMode(false);
      setConfirmBatchDelete(false);

      onDeckUpdated({
        ...deck,
        cardCount: cards.length - selectedIds.size,
      });
    } catch {
      // Handle error
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmBatchDelete(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;
    setDeleting(true);
    
    try {
      const res = await fetch(`/api/flashcards/cards?ids=${cardToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete card");

      setCards((prev) => prev.filter((c) => c.id !== cardToDelete));
      setCardToDelete(null);
      
      onDeckUpdated({
        ...deck,
        cardCount: Math.max(0, cards.length - 1),
      });
    } catch {
      // Handle error silently or show a toast
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCard = (id: string) => {
    setCardToDelete(id);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cards.map((c) => c.id)));
    }
  };

  // Study Mode view
  if (studyMode) {
    return (
      <StudyMode
        deckId={deck.id}
        deckTitle={deck.title}
        deckColor={deck.color}
        onExit={() => {
          setStudyMode(false);
          fetchCards(); // Refresh progress
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-secondary-theme hover:text-primary-theme">
        <ArrowLeft aria-hidden="true" className="size-4" />
        All Flashcards
      </button>
      <header className={`mb-6 ${panel}`}>
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-canvas text-primary-theme">
              <FlashcardIcon aria-hidden="true" className="size-6" />
              <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-(--bg-surface)" style={{ backgroundColor: deck.color }} />
            </span>
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <h1 className="text-2xl font-bold tracking-tight text-primary-theme sm:text-3xl">{deck.title}</h1>
              {deck.courseTitle && <p className="mt-1 text-sm font-medium text-secondary-theme">{deck.courseTitle}</p>}
              {deck.description && <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm/6 text-secondary-theme">{deck.description}</p>}
              {deck.tags.length > 0 && (
                <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-1.5 text-xs text-secondary-theme">
                  {deck.tags.map((tag, index) => <li key={index} className="max-w-full rounded-md bg-canvas px-2 py-1">{tag}</li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="w-full border-t border-theme pt-4 sm:w-52 sm:shrink-0 sm:border-t-0 sm:pt-0">
            <DeckProgress total={loading ? deck.cardCount : cards.length} mastered={loading ? deck.correctCount : cards.filter(card => card.progress?.status === "correct").length} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-theme px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setStudyMode(true)} disabled={cards.length === 0} className={primaryButton}>
            <Play aria-hidden="true" className="size-4" /> Study Now
          </button>
          <button type="button" onClick={() => { setEditingCard(null); setEditorOpen(true); }} className={secondaryButton}>
            <Plus aria-hidden="true" className="size-4" /> Add Card
          </button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-primary-theme">Cards</h2>
        {batchMode ? (
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-theme bg-surface p-1">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {selectedIds.size === cards.length ? (
                <CheckSquare className="h-4 w-4 text-[#F97316]" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              Select All
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
            <button
              onClick={() => {
                setBatchMode(false);
                setSelectedIds(new Set());
              }}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setBatchMode(true)}
            disabled={cards.length === 0}
            className={secondaryButton}
          >
            <CheckSquare className="h-4 w-4 text-slate-400" />
            Batch Edit
          </button>
        )}
      </div>

      {/* Card list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className={`flex flex-col items-center px-4 py-12 text-center ${panel}`}>
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-[#181B26] shadow-xs ring-1 ring-slate-100 dark:ring-white/5">
            <AlertCircle className="h-8 w-8 text-slate-400 dark:text-[#8B92A5]" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">No cards in this deck</h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-[#8B92A5]">
            Get started by adding your first flashcard. The more cards you add, the better your study sessions will be.
          </p>
          <button
            onClick={() => {
              setEditingCard(null);
              setEditorOpen(true);
            }}
            className={primaryButton}
          >
            <Plus className="h-4 w-4" />
            Add First Card
          </button>
        </div>
      ) : (
        <ol className={panel}>
          {cards.map((card, index) => {
            const status = card.progress?.status ?? "unseen";
            const statusInfo = CARD_STATUS[status] ?? CARD_STATUS.unseen;

            return (
              <li key={card.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-theme px-4 py-3 not-first:border-t sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5">
                {batchMode ? (
                  <input type="checkbox" checked={selectedIds.has(card.id)} onChange={() => toggleSelect(card.id)} aria-label={`Select card ${index + 1}`} className="mt-2 size-4 accent-(--action-bg) sm:mt-0" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-lg bg-canvas text-xs font-semibold tabular-nums text-secondary-theme">{index + 1}</span>
                )}
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p className="whitespace-pre-wrap text-sm/6 font-semibold text-primary-theme">{card.front}</p>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm/6 text-secondary-theme">{card.back}</p>
                </div>
                <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-1 sm:col-start-3 sm:justify-end">
                  <span className={`mr-1 rounded-md px-2 py-1 text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                  {!batchMode && (
                    <>
                      <button type="button" onClick={() => { setEditingCard(card); setEditorOpen(true); }} className={iconButton} aria-label={`Edit card ${index + 1}`}>
                        <Edit3 aria-hidden="true" className="size-4" />
                      </button>
                      <button type="button" onClick={() => handleDeleteCard(card.id)} className={`${iconButton} hover:text-rose-600`} aria-label={`Delete card ${index + 1}`}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Card Editor Modal */}
      <CardEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingCard(null);
        }}
        deckId={deck.id}
        editingCard={editingCard}
        onSaved={handleCardSaved}
      />

      {/* Delete Single Card Modal */}
      <Modal
        open={!!cardToDelete}
        title="Delete Flashcard"
        onClose={() => {
          if (!deleting) setCardToDelete(null);
        }}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-[#8B92A5]">
            Are you sure you want to delete this flashcard? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCardToDelete(null)}
              disabled={deleting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteCard}
              disabled={deleting}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete Card"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal
        open={confirmBatchDelete}
        title="Delete Multiple Flashcards"
        onClose={() => {
          if (!deleting) setConfirmBatchDelete(false);
        }}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-[#8B92A5]">
            Are you sure you want to delete {selectedIds.size} flashcards? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmBatchDelete(false)}
              disabled={deleting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteSelected}
              disabled={deleting}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Deleting..." : `Delete ${selectedIds.size} Cards`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
