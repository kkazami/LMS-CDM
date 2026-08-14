"use client";

import type { FlashcardDeck } from "@/lib/lms-types";
import ProgressRing from "./ProgressRing";
import { BookOpen, ArrowRight, Trash2 } from "lucide-react";
import FlashcardIcon from "@/components/icons/FlashcardIcon";

interface DeckCardProps {
  deck: FlashcardDeck;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

export default function DeckCard({ deck, onClick, onDelete }: DeckCardProps) {
  const percentage = deck.cardCount > 0 ? Math.round((deck.correctCount / deck.cardCount) * 100) : 0;

  return (
    <div
      id={`flashcard-deck-${deck.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex w-full min-h-55 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-2 hover:scale-[1.02] hover:border-gray-300 hover:shadow-2xl focus:outline-none"
    >
      {/* Inner Radial Glow on Hover */}
      <div 
        className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at 100% 0%, ${deck.color}15, transparent 60%)` 
        }}
      />

      {/* Dynamic Colored Hover Shadow */}
      <div 
        className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 pointer-events-none"
        style={{ boxShadow: `0 20px 40px -12px ${deck.color}30` }}
      />

      {/* Top Accent Line */}
      <div
        className="absolute left-0 top-0 h-2 w-full transition-all duration-500 group-hover:opacity-90"
        style={{ backgroundColor: deck.color }}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Header row with Icon and Progress */}
        <div className="flex items-start justify-between gap-3 mb-4 pt-1 relative">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3" 
            style={{ backgroundColor: `${deck.color}15`, color: deck.color }}
          >
            <FlashcardIcon className="h-6 w-6" />
          </div>
          
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(deck.id);
                }}
                className="opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                title="Delete Flashcard"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <div className="flex flex-col items-center gap-1 transition-transform duration-500 group-hover:scale-105">
              <ProgressRing
                percentage={percentage}
                size={48}
                strokeWidth={4}
                color={deck.color}
              />
            </div>
          </div>
        </div>
        
        {/* Title & Description */}
        <h3 className="text-xl font-bold tracking-tight text-gray-900 transition-colors duration-300 group-hover:text-gray-700 mt-2">
          {deck.title}
        </h3>
        {deck.description && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {deck.description}
          </p>
        )}

        {/* Tags */}
        {deck.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {deck.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-300 group-hover:shadow-sm"
                style={{
                  backgroundColor: `${deck.color}15`,
                  color: deck.color,
                }}
              >
                {tag}
              </span>
            ))}
            {deck.tags.length > 3 && (
              <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                +{deck.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Stats & Animated Arrow */}
        <div className="mt-auto pt-6 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600 border border-gray-200/60 transition-colors duration-300 group-hover:bg-white group-hover:border-gray-200">
              {deck.cardCount} {deck.cardCount === 1 ? "Card" : "Cards"}
            </span>
            {deck.courseTitle && (
              <div className="flex items-center gap-1.5 truncate max-w-35 text-gray-400">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{deck.courseTitle}</span>
              </div>
            )}
          </div>

          {/* Animated Arrow that slides in on hover */}
          <div 
            className="flex items-center justify-center h-8 w-8 rounded-full opacity-0 -translate-x-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:opacity-100 group-hover:translate-x-0"
            style={{ backgroundColor: `${deck.color}20`, color: deck.color }}
          >
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
