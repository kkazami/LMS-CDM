"use client";

import { useState, useEffect, useRef } from "react";
import type { FlashcardCard } from "@/lib/lms-types";
import Modal from "@/components/common/Modal";
import { ImagePlus } from "lucide-react";

interface CardEditorModalProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  /** If provided, we are editing; otherwise creating */
  editingCard?: FlashcardCard | null;
  onSaved: (card: FlashcardCard) => void;
}

export default function CardEditorModal({
  open,
  onClose,
  deckId,
  editingCard,
  onSaved,
}: CardEditorModalProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setImageUrl(base64String);
      setError(null);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (open) {
      if (editingCard) {
        setFront(editingCard.front);
        setBack(editingCard.back);
        const imgAtt = editingCard.attachments?.find((a) => a.type === "image");
        setImageUrl(imgAtt?.url || "");
      } else {
        setFront("");
        setBack("");
        setImageUrl("");
      }
      setError(null);
      setTimeout(() => frontRef.current?.focus(), 100);
    }
  }, [open, editingCard]);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      setError("Both question (front) and answer key (back) are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = editingCard ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        deckId,
        front: front.trim(),
        back: back.trim(),
        hint: "", // Send empty since we removed the field
        attachments: imageUrl.trim() ? [{ type: "image", url: imageUrl.trim(), label: "Question Image" }] : [],
      };

      if (editingCard) {
        payload.id = editingCard.id;
      }

      const res = await fetch("/api/flashcards/cards", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save card.");
      }

      const card = await res.json();
      onSaved(card);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editingCard ? "Edit Flashcard" : "New Flashcard"}
      onClose={onClose}
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Front (Question) + Image */}
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 sm:p-6">
          <label className="block text-sm font-bold text-gray-900">
            Question (Front)
          </label>
          <textarea
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Type your question here..."
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-white bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
          <div className="flex flex-col gap-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
              Optional Image
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                <ImagePlus className="h-5 w-5" />
                {imageUrl ? "Change Image" : "Upload Image"}
              </button>
              {imageUrl && (
                <button
                   type="button"
                   onClick={() => setImageUrl("")}
                   className="flex h-13 px-5 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-100"
                >
                   Remove
                </button>
              )}
            </div>
            {imageUrl.trim() && (
              <div className="mt-2 relative flex items-center justify-center rounded-xl overflow-hidden border border-gray-200 bg-gray-100/50" style={{ height: "160px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imageUrl.trim()} 
                  alt="Preview" 
                  className="w-full h-full object-contain" 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Back (Answer Key) */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 sm:p-6">
          <label className="mb-4 block text-sm font-bold text-gray-900">
            Answer Key (Back)
          </label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Type the exact answer here..."
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-white bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Saving..." : editingCard ? "Update Card" : "Add Flashcard"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
