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
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-40"
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
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </button>

        <div className="flex-1" />

        {batchMode ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {selectedIds.size === cards.length ? (
                <CheckSquare className="h-4 w-4 text-indigo-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
              Select All
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={() => {
                setBatchMode(false);
                setSelectedIds(new Set());
              }}
              className="rounded-lg px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setBatchMode(true)}
            disabled={cards.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40"
          >
            <CheckSquare className="h-4 w-4 text-gray-400" />
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
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50/50 py-24 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900">No cards in this flashcard</h3>
          <p className="mb-6 max-w-sm text-sm text-gray-500">
            Get started by adding your first flashcard. The more cards you add, the better your study sessions will be.
          </p>
          <button
            onClick={() => {
              setEditingCard(null);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95"
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
              correct: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Mastered", border: "bg-emerald-500" },
              incorrect: { bg: "bg-red-50", text: "text-red-700", label: "Needs Review", border: "bg-red-500" },
              unseen: { bg: "bg-gray-100", text: "text-gray-600", label: "Unseen", border: "bg-gray-300" },
            };
            const statusInfo = statusColors[status] ?? statusColors.unseen;

            return (
              <div
                key={card.id}
                className="group relative flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-gray-300"
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
                    className="shrink-0 pl-2 text-gray-400 transition-colors hover:text-gray-600"
                  >
                    {selectedIds.has(card.id) ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                )}

                {/* Index & Content */}
                <div className={`flex flex-1 min-w-0 items-center gap-4 ${!batchMode ? "pl-2" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-sm font-bold text-gray-400 ring-1 ring-gray-100">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-base font-bold text-gray-900">
                      {card.front}
                    </p>
                    <p className="mt-1 truncate text-sm text-gray-500">
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
                      className="rounded-xl p-2.5 text-gray-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                      title="Edit Card"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="rounded-xl p-2.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600"
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
