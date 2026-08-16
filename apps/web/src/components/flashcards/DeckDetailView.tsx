"use client";

import { useState, useEffect } from "react";
import type { FlashcardCard, FlashcardDeck } from "@/lib/lms-types";
import CardEditorModal from "./CardEditorModal";
import StudyMode from "./StudyMode";
import ProgressRing from "./ProgressRing";
import {
  ArrowLeft,
  Plus,
  Play,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";

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

  const handleDeleteSelected = async () => {
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

  const handleDeleteCard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this flashcard?")) return;
    
    try {
      const res = await fetch(`/api/flashcards/cards?ids=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete card");

      setCards((prev) => prev.filter((c) => c.id !== id));
      onDeckUpdated({
        ...deck,
        cardCount: Math.max(0, cards.length - 1),
      });
    } catch {
      // Handle error silently or show a toast
    }
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

  const percentage = deck.cardCount > 0 ? Math.round((deck.correctCount / deck.cardCount) * 100) : 0;

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
    <div className="page-enter pb-12">
      {/* Premium Hero Header */}
      <div
        className="relative mb-8 overflow-hidden rounded-4xl p-8 text-white shadow-lg sm:p-10"
        style={{ backgroundColor: deck.color }}
      >
        {/* Decorative Background Elements */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-black opacity-10 blur-2xl" />

        <div className="relative z-10">
          <button
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
            All Flashcards
          </button>

          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-inner sm:h-20 sm:w-20">
                <FlashcardIcon className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: deck.color }} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm sm:text-4xl">
                  {deck.title}
                </h1>
                {deck.description && (
                  <p className="mt-2 max-w-xl text-sm font-medium text-white/90 sm:text-base">
                    {deck.description}
                  </p>
                )}
                {deck.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {deck.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur-md sm:p-5">
              <ProgressRing
                percentage={percentage}
                size={80}
                strokeWidth={6}
                color="white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="mb-8 flex flex-wrap items-center gap-3 px-1">
        <button
          onClick={() => setStudyMode(true)}
          disabled={cards.length === 0}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          style={{ backgroundColor: deck.color }}
        >
          <Play className="h-5 w-5 fill-current" />
          Study Now
        </button>

        <button
          onClick={() => {
            setEditingCard(null);
            setEditorOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] px-5 py-3 text-sm font-bold text-slate-700 dark:text-[#F0F2F8] shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-[#181B26] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </button>

        <div className="flex-1" />

        {batchMode ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-1.5 shadow-xs">
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-[#8B92A5] shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-[#181B26] hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
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
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] py-24 text-center shadow-xs">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-[#181B26] shadow-xs ring-1 ring-slate-100 dark:ring-white/5">
            <AlertCircle className="h-8 w-8 text-slate-400 dark:text-[#8B92A5]" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">No cards in this flashcard</h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-[#8B92A5]">
            Get started by adding your first flashcard. The more cards you add, the better your study sessions will be.
          </p>
          <button
            onClick={() => {
              setEditingCard(null);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            style={{ backgroundColor: deck.color }}
          >
            <Plus className="h-4 w-4" />
            Add First Card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, index) => {
            const status = card.progress?.status ?? "unseen";
            const statusColors: Record<string, { bg: string; text: string; label: string; border: string }> = {
              correct: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", label: "Mastered", border: "bg-emerald-500" },
              incorrect: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400", label: "Needs Review", border: "bg-rose-500" },
              unseen: { bg: "bg-slate-100 dark:bg-[#1E2132]", text: "text-slate-600 dark:text-[#8B92A5]", label: "Unseen", border: "bg-slate-300 dark:bg-slate-600" },
            };
            const statusInfo = statusColors[status] ?? statusColors.unseen;

            return (
              <div
                key={card.id}
                className="group relative flex items-center gap-4 rounded-2xl bg-white dark:bg-[#141721] p-5 shadow-xs border border-slate-200/80 dark:border-white/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10"
                style={{
                  animation: `staggerFadeIn 0.3s ease-out ${index * 50}ms both`,
                }}
              >
                {/* Status Indicator Bar */}
                <div
                  className={`absolute left-0 top-1/2 h-1/2 w-1.5 -translate-y-1/2 rounded-r-full ${statusInfo.border}`}
                />

                {/* Batch checkbox */}
                {batchMode && (
                  <button
                    onClick={() => toggleSelect(card.id)}
                    className="shrink-0 pl-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {selectedIds.has(card.id) ? (
                      <CheckSquare className="h-5 w-5 text-[#F97316]" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                )}

                {/* Index & Content */}
                <div className={`flex flex-1 min-w-0 items-center gap-4 ${!batchMode ? "pl-2" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#181B26] text-sm font-bold text-slate-400 dark:text-[#8B92A5] border border-slate-100 dark:border-white/5">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
                      {card.front}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-[#8B92A5]">
                      {card.back}
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}
                >
                  {statusInfo.label}
                </span>

                {/* Action buttons */}
                {!batchMode && (
                  <div className="shrink-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setEditorOpen(true);
                      }}
                      className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-orange-500/10 hover:text-[#F97316] cursor-pointer"
                      title="Edit Card"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 cursor-pointer"
                      title="Delete Card"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
