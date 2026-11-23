"use client";

import { useState, useEffect, useRef } from "react";
import type { FlashcardCard } from "@/lib/lms-types";
import Modal from "@/components/common/Modal";
import { ImagePlus } from "lucide-react";
import { field, primaryButton, secondaryButton } from "./styles";

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
  const [hint, setHint] = useState("");
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
        setHint(editingCard.hint || "");
        const imgAtt = editingCard.attachments?.find((a) => a.type === "image");
        setImageUrl(imgAtt?.url || "");
      } else {
        setFront("");
        setBack("");
        setHint("");
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
        hint: hint.trim(),
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
    <Modal open={open} title={editingCard ? "Edit flashcard" : "New flashcard"} onClose={onClose}>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void handleSave(); }}>
        {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-300">{error}</p>}
        <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
          <span>Question</span>
          <textarea ref={frontRef} value={front} onChange={event => setFront(event.target.value)} rows={3} className={`${field} resize-y font-normal`} />
        </label>

        <div className="space-y-2">
          <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleImageUpload} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={secondaryButton}>
              <ImagePlus aria-hidden="true" className="size-4" /> {imageUrl ? "Change image" : "Add question image"}
            </button>
            {imageUrl && <button type="button" onClick={() => setImageUrl("")} className={secondaryButton}>Remove image</button>}
          </div>
          {imageUrl.trim() && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl.trim()} alt="Question image preview" className="max-h-40 max-w-full rounded-xl border border-theme object-contain" onError={event => { event.currentTarget.hidden = true; }} />
          )}
        </div>

        <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
          <span>Answer</span>
          <textarea value={back} onChange={event => setBack(event.target.value)} rows={3} className={`${field} resize-y font-normal`} />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-primary-theme">
          <span>Hint <span className="font-normal text-secondary-theme">(optional)</span></span>
          <textarea value={hint} onChange={event => setHint(event.target.value)} rows={2} className={`${field} resize-y font-normal`} />
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-4">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Savingâ€¦" : editingCard ? "Update card" : "Add card"}
          </button>
        </div>
      </form>
    </Modal>
  );

}
