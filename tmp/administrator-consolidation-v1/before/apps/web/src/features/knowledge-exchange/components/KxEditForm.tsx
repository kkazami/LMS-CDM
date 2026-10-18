"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, AlertCircle, Loader2 } from "lucide-react";
import KxRichTextEditor from "./KxRichTextEditor";
import KxTagSelector from "./KxTagSelector";
import type { KxPostItem, KxTagSummary } from "../types";
import { KX_VALIDATION } from "../constants";

interface KxEditFormProps {
  post: KxPostItem;
  instituteCode: string;
  availableTags: KxTagSummary[];
}

export default function KxEditForm({
  post,
  instituteCode,
  availableTags,
}: KxEditFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    post.tags.map((t) => t.id)
  );
  const [summary, setSummary] = useState("Updated explanation and formatting");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (title.trim().length < KX_VALIDATION.MIN_TITLE_LENGTH) {
      setErrorMsg(
        `Title must be at least ${KX_VALIDATION.MIN_TITLE_LENGTH} characters.`
      );
      return;
    }

    if (body.trim().length < KX_VALIDATION.MIN_BODY_LENGTH) {
      setErrorMsg(
        `Body must be at least ${KX_VALIDATION.MIN_BODY_LENGTH} characters.`
      );
      return;
    }

    if (selectedTagIds.length < KX_VALIDATION.MIN_TAGS) {
      setErrorMsg("Please select at least one tag.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/knowledge-exchange/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          summary,
          tagIds: selectedTagIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to save edits.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/${instituteCode}/knowledge-exchange/post/${post.id}`);
      router.refresh();
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900 dark:text-white">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900 dark:text-white">
          Body <span className="text-red-500">*</span>
        </label>
        <KxRichTextEditor value={body} onChange={setBody} />
      </div>

      {/* Tags */}
      <KxTagSelector
        availableTags={availableTags}
        selectedTagIds={selectedTagIds}
        onChange={setSelectedTagIds}
      />

      {/* Revision Summary */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900 dark:text-white">
          Edit Summary
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief summary of what you changed..."
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Save Revision</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
