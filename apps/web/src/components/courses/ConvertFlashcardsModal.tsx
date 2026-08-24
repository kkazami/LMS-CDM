"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  FileText,
  Layers,
  Pencil,
  CheckCircle2,
} from "lucide-react";

interface RawCard {
  front: string;
  back: string;
}

interface ConvertFlashcardsModalProps {
  attachmentId: string;
  attachmentName: string;
  courseId: string;
  instituteCode: string;
  onClose: () => void;
}

type ModalStep = "idle" | "loading" | "preview" | "saving" | "done" | "error";

export default function ConvertFlashcardsModal({
  attachmentId,
  attachmentName,
  courseId,
  instituteCode,
  onClose,
}: ConvertFlashcardsModalProps) {
  const [step, setStep] = useState<ModalStep>("idle");
  const [cards, setCards] = useState<RawCard[]>([]);
  const [deckTitle, setDeckTitle] = useState(
    `${attachmentName.replace(/\.[^.]+$/, "")} Flashcards`
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [savedDeckId, setSavedDeckId] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // ── Generate: call the API in preview mode ──
  async function handleGenerate() {
    setStep("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/flashcards/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId, courseId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to generate flashcards.");
        setStep("error");
        return;
      }

      setCards(data.cards);
      setStep("preview");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStep("error");
    }
  }

  // ── Save: send finalized cards to the API ──
  async function handleSave() {
    if (cards.length === 0) return;
    setStep("saving");

    try {
      const res = await fetch("/api/flashcards/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachmentId,
          courseId,
          save: true,
          deckTitle,
          cards,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to save flashcard deck.");
        setStep("preview");
        return;
      }

      setSavedDeckId(data.deckId);
      setStep("done");
    } catch {
      setErrorMessage("Network error while saving. Please try again.");
      setStep("preview");
    }
  }

  // ── Card editing helpers ──
  function updateCard(index: number, field: "front" | "back", value: string) {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function deleteCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function addCard() {
    setCards((prev) => [...prev, { front: "", back: "" }]);
    setEditingIndex(cards.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 shrink-0">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
                Convert to Flashcards
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5 truncate max-w-75">
                {attachmentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Idle State ── */}
          {step === "idle" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-5">
                <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">
                Ready to Generate
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mb-6">
                We'll scan <strong>{attachmentName}</strong> and extract terms,
                definitions, and key concepts into study flashcards using
                rule-based parsing.
              </p>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Generate Flashcards
              </button>
            </div>
          )}

          {/* ── Loading State ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">
                Scanning document...
              </p>
              <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
                Extracting terms, definitions, and slide content
              </p>
            </div>
          )}

          {/* ── Error State ── */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-1">
                Could Not Generate
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mb-5">
                {errorMessage}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ── Preview State (Editable Cards) ── */}
          {(step === "preview" || step === "saving") && (
            <div>
              {/* Deck Title Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mb-1.5">
                  Deck Title
                </label>
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-4 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Enter deck title..."
                />
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#8B92A5]">
                  <Layers className="h-3.5 w-3.5" />
                  {cards.length} card{cards.length !== 1 ? "s" : ""} generated
                </span>
                {errorMessage && (
                  <span className="text-xs text-red-500">{errorMessage}</span>
                )}
              </div>

              {/* Card List */}
              <div className="space-y-3 mb-4">
                {cards.map((card, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border transition-all ${
                      editingIndex === index
                        ? "border-emerald-500/50 bg-emerald-500/3 dark:bg-emerald-500/5 shadow-sm"
                        : "border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1A1D27]"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider shrink-0">
                          Card {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditingIndex(
                                editingIndex === index ? null : index
                              )
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition cursor-pointer"
                            title="Edit card"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteCard(index)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition cursor-pointer"
                            title="Remove card"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {editingIndex === index ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                              Front (Question / Term)
                            </label>
                            <textarea
                              value={card.front}
                              onChange={(e) =>
                                updateCard(index, "front", e.target.value)
                              }
                              rows={2}
                              className="w-full rounded-lg border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 resize-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                              Back (Answer / Definition)
                            </label>
                            <textarea
                              value={card.back}
                              onChange={(e) =>
                                updateCard(index, "back", e.target.value)
                              }
                              rows={3}
                              className="w-full rounded-lg border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 resize-none transition-colors"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/60 uppercase tracking-wider">
                              Front
                            </span>
                            <p className="text-sm text-slate-800 dark:text-[#F0F2F8] mt-0.5 line-clamp-2">
                              {card.front || (
                                <span className="italic text-slate-400">
                                  Empty
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/60 uppercase tracking-wider">
                              Back
                            </span>
                            <p className="text-sm text-slate-600 dark:text-[#8B92A5] mt-0.5 line-clamp-3">
                              {card.back || (
                                <span className="italic text-slate-400">
                                  Empty
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Card button */}
              <button
                onClick={addCard}
                className="flex items-center gap-2 w-full justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 py-3 text-sm font-medium text-slate-400 dark:text-[#8B92A5] hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/2 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Card Manually
              </button>
            </div>
          )}

          {/* ── Done State ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">
                Deck Saved!
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mb-6">
                Your flashcard deck &ldquo;<strong>{deckTitle}</strong>&rdquo;
                with {cards.length} cards has been saved to your library.
              </p>
              <div className="flex gap-3">
                <a
                  href={`/${instituteCode}/flashcards`}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  <Layers className="h-4 w-4" />
                  Go to Flashcards
                </a>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — only show during preview */}
        {(step === "preview" || step === "saving") && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] shrink-0">
            <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
              Review and edit your cards before saving
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  step === "saving" ||
                  cards.length === 0 ||
                  !deckTitle.trim()
                }
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {step === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Deck ({cards.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
