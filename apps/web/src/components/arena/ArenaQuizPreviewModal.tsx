"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { ARENA_PALETTE, type ArenaQuestionConfig } from "@/types/arena";

interface ArenaQuizPreviewModalProps {
  title: string;
  questions: ArenaQuestionConfig[];
  onClose: () => void;
}

export default function ArenaQuizPreviewModal({
  title,
  questions,
  onClose,
}: ArenaQuizPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const currentQ = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoiceId(null);
      setRevealed(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSelectedChoiceId(null);
      setRevealed(false);
    }
  };

  const handleSelectChoice = (choiceIndex: number) => {
    if (revealed) return;
    setSelectedChoiceId(`choice-${choiceIndex}`);
    setRevealed(true);
  };

  if (!currentQ) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#181B26] border border-white/10 rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-white font-bold mb-4">No questions to preview yet.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#12151F] border border-white/10 rounded-3xl max-w-3xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Interactive Preview
            </span>
            <span className="text-sm font-semibold text-white truncate max-w-xs">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-amber-400">
                <Clock className="w-3.5 h-3.5" /> {currentQ.timeLimitSeconds}s
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" /> {currentQ.basePoints} pts
              </span>
            </div>
          </div>

          <div className="bg-[#1C2030] border border-white/10 p-6 rounded-2xl text-center shadow-inner">
            <h3 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
              {currentQ.questionText || "Untitled Question"}
            </h3>
          </div>

          {/* 4 Kahoot-Style Choice Pads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentQ.choices.map((choice, cIdx) => {
              const pal = ARENA_PALETTE[cIdx % 4];
              const isSelected = selectedChoiceId === `choice-${cIdx}`;
              const isCorrect = choice.isCorrect;

              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => handleSelectChoice(cIdx)}
                  className={`p-5 rounded-2xl flex items-center gap-4 text-left transition-all duration-150 transform font-bold text-white shadow-lg select-none ${
                    pal.bg
                  } ${pal.hover} ${pal.active} ${
                    isSelected ? "ring-4 ring-white scale-[1.02]" : ""
                  } ${revealed && !isCorrect ? "opacity-40" : ""}`}
                >
                  <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-black shrink-0 text-white shadow-inner">
                    {pal.symbol}
                  </span>
                  <span className="text-base sm:text-lg flex-1 leading-snug">
                    {choice.choiceText || `Option ${cIdx + 1}`}
                  </span>
                  {revealed && isCorrect && (
                    <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer Explanation & Feedback */}
          {revealed && currentQ.explanation && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm animate-in fade-in duration-200">
              <span className="font-bold">Explanation:</span> {currentQ.explanation}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <button
            onClick={() => {
              setSelectedChoiceId(null);
              setRevealed(false);
            }}
            className="text-xs text-amber-400 font-bold hover:underline"
          >
            Reset Question
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex >= questions.length - 1}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition shadow-md"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
