"use client";

import { useState } from "react";
import { useOfflineStatus } from "./useOfflineStatus";
import { useSubmissionDraft } from "./useSubmissionDraft";
import {
  FileText,
  Link2,
  Plus,
  Trash2,
  Save,
  Clock,
  CloudOff,
  AlertCircle,
  FileEdit,
  CheckCircle2,
} from "lucide-react";

interface OfflineDraftCardProps {
  itemId: string;
  courseId: string;
  itemTitle: string;
  userId?: string;
  isPastDeadline: boolean;
  isSubmitted: boolean;
}

export default function OfflineDraftCard({
  itemId,
  courseId,
  itemTitle,
  userId,
  isPastDeadline,
  isSubmitted,
}: OfflineDraftCardProps) {
  const { online, isIteStudent, userId: contextUserId } = useOfflineStatus();
  const effectiveUserId = userId || contextUserId;

  const {
    draftText,
    setDraftText,
    draftLinks,
    setDraftLinks,
    lastSavedManila,
    hasUnsentDraft,
    isSaving,
    saveDraft,
  } = useSubmissionDraft({
    itemId,
    courseId,
    userId: effectiveUserId,
    isIteStudent,
    isSubmitted,
  });

  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [manualSavedNotice, setManualSavedNotice] = useState(false);

  if (!isIteStudent || isSubmitted) return null;

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    const title = linkTitle.trim() || linkUrl.trim();
    const updated = [...draftLinks, { url: linkUrl.trim(), fileName: title }];
    setDraftLinks(updated);
    saveDraft(draftText, updated);
    setLinkUrl("");
    setLinkTitle("");
  };

  const handleRemoveLink = (idx: number) => {
    const updated = draftLinks.filter((_, i) => i !== idx);
    setDraftLinks(updated);
    saveDraft(draftText, updated);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraftText(val);
    saveDraft(val, draftLinks);
  };

  const handleManualSave = () => {
    saveDraft(draftText, draftLinks);
    setManualSavedNotice(true);
    setTimeout(() => setManualSavedNotice(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileEdit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
            Local Submission Draft
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
          Device Draft
        </span>
      </div>

      {/* ── Offline Banner ── */}
      {!online && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <CloudOff className="h-3.5 w-3.5" />
            <span>You're offline. Drafts are saved on this device.</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Attach files after you reconnect. Connect and press Turn in before the deadline.
          </p>
          <div className="flex items-center gap-1 text-[10px] pt-1 border-t border-amber-500/20 font-medium">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>Your submission time is when it reaches the server, so connect before the deadline.</span>
          </div>
        </div>
      )}

      {/* ── Online Unsent Prompt ── */}
      {online && hasUnsentDraft && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-semibold">You have an unsent draft for {itemTitle}.</p>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
              Review your draft notes and links below, then press Turn in to submit.
            </p>
          </div>
        </div>
      )}

      {/* ── Text Notes Input ── */}
      <div className="space-y-1.5">
        <label
          htmlFor="draft-text"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Draft notes & response
        </label>
        <textarea
          id="draft-text"
          rows={3}
          value={draftText}
          onChange={handleTextChange}
          onBlur={() => saveDraft(draftText, draftLinks)}
          disabled={isPastDeadline}
          placeholder="Type your notes or response here. Automatically saved on this device..."
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
        />
      </div>

      {/* ── Draft Links ── */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Draft links (Google Drive, GitHub, etc.)
        </label>

        {draftLinks.length > 0 && (
          <div className="space-y-1.5">
            {draftLinks.map((link, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {link.fileName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                    ({link.url})
                  </span>
                </div>
                {!isPastDeadline && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isPastDeadline && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Link title (optional)"
              className="sm:w-40 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!linkUrl.trim()}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-40 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Link</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Footer / Status ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {lastSavedManila
              ? `Draft saved on this device: ${lastSavedManila} (PHT)`
              : "Draft autosaves to device"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {manualSavedNotice && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="h-3 w-3" />
              Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleManualSave}
            disabled={isSaving || isPastDeadline}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
          >
            <Save className="h-3 w-3" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}
