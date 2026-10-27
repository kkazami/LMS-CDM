"use client";

import { useState, useEffect, useRef } from "react";
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { X, Search, Bookmark, Plus, Check } from "lucide-react";
import type { QuestionBankItemData } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface QuestionBankDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (bankItemIds: string[]) => Promise<void>;
  courseId: string;
  theme?: InstituteTheme;
}

export default function QuestionBankDrawer({
  isOpen,
  onClose,
  onImport,
  courseId,
  theme,
}: QuestionBankDrawerProps) {
  const [items, setItems] = useState<QuestionBankItemData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const close = () => { if (!isImporting) onClose(); };
  useDialogA11y(isOpen, close, panel);
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    async function fetchBank() {
      setIsLoading(true); setError('');
      try {
        const res = await fetch(`/api/question-bank?courseId=${courseId}&q=${encodeURIComponent(search)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load the question bank.');
        if (data.items) {
          setItems(data.items);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load questions.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    const timer = setTimeout(() => { void fetchBank(); }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isOpen, courseId, search]);

  if (!isOpen) return null;

  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) return;
    if (isImporting) return;
    setError('');
    setIsImporting(true);
    try {
      await onImport(selectedIds);
      setSelectedIds([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import questions. Your selection is kept.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="question-bank-title" tabIndex={-1} className="w-full max-w-md bg-white dark:bg-[#12151E] h-full shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 id="question-bank-title" className="text-base font-bold text-slate-900 dark:text-white">
                Question Bank
              </h3>
              <p className="text-xs text-slate-500">Reuse saved questions</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isImporting} aria-label="Close question bank" onClick={close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p role="alert" className="p-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by prompt or keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading bank questions...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-2">
              <Bookmark className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto" />
              <p>No questions found in bank.</p>
              <p className="text-[11px] text-slate-400">
                You can save questions to the bank from any question card using the bookmark button.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-[#161A26]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {item.questionType.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.points} pt{item.points > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-white line-clamp-2">
                        {item.prompt}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-slate-300 dark:border-white/20 text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
          <span className="text-xs text-slate-500">
            {selectedIds.length} question{selectedIds.length === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            onClick={handleImport}
            disabled={selectedIds.length === 0 || isImporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>{isImporting ? "Importing..." : "Add to Form"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
