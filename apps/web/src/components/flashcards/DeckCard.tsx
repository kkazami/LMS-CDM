"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import type { FlashcardDeck } from "@/lib/lms-types";
import FlashcardIcon from "@/components/icons/FlashcardIcon";
import DeckProgress from "./DeckProgress";
import { iconButton, panel } from "./styles";

interface DeckCardProps {
  deck: FlashcardDeck;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

export default function DeckCard({ deck, onClick, onDelete }: DeckCardProps) {
  return (
    <article id={`flashcard-deck-${deck.id}`} className={`relative flex min-w-0 flex-col p-4 hover:border-(--focus-ring) sm:p-5 ${panel}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-secondary-theme">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-canvas text-primary-theme">
            <FlashcardIcon aria-hidden="true" className="size-5" />
            <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-(--bg-surface)" style={{ backgroundColor: deck.color }} />
          </span>
          {deck.courseTitle && <span className="truncate" title={deck.courseTitle}>{deck.courseTitle}</span>}
        </span>
        {onDelete && (
          <button type="button" onClick={() => onDelete(deck.id)} className={`relative z-10 hover:text-rose-600 ${iconButton}`} aria-label={`Delete deck: ${deck.title}`}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-primary-theme">
        <button type="button" onClick={onClick} className="cursor-pointer text-left [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-2xl">
          {deck.title}
        </button>
      </h2>
      {deck.description && <p className="mt-1 line-clamp-2 text-sm/6 text-secondary-theme [overflow-wrap:anywhere]">{deck.description}</p>}
      {deck.tags.length > 0 && (
        <ul aria-label="Tags" className="mt-3 flex min-w-0 flex-wrap gap-1.5 text-xs text-secondary-theme">
          {deck.tags.slice(0, 3).map((tag, index) => <li key={index} className="max-w-full truncate rounded-md bg-canvas px-2 py-1" title={tag}>{tag}</li>)}
          {deck.tags.length > 3 && <li className="rounded-md bg-canvas px-2 py-1">+{deck.tags.length - 3}</li>}
        </ul>
      )}
      <div className="mt-auto pt-5">
        <div className="border-t border-theme pt-4">
          <DeckProgress total={deck.cardCount} mastered={deck.correctCount} />
          <p aria-hidden="true" className="mt-4 flex items-center justify-between text-sm font-semibold text-primary-theme">Open deck <ArrowRight className="size-4" /></p>
        </div>
      </div>
    </article>
  );
}
