"use client";

import React, { useState, useEffect, useId } from "react";
import { Tag, X, Plus, Loader2, AlertCircle, Sparkles } from "lucide-react";
import type { KxTagSummary } from "../types";
import { slugify } from "../utils";
import KxTagBadge from "./KxTagBadge";
import { KX_TAG_CATEGORIES } from "../constants";

interface KxCreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated: (newTag: KxTagSummary) => void;
  instituteCode?: string;
}

export default function KxCreateTagModal({
  isOpen,
  onClose,
  onTagCreated,
  instituteCode = "ics",
}: KxCreateTagModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("TOPIC");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameInputId = useId();
  const categorySelectId = useId();
  const descriptionInputId = useId();

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCategory("TOPIC");
      setDescription("");
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const previewSlug = slugify(name) || "tag-slug";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg("Tag name must be at least 2 characters long.");
      return;
    }
    if (trimmedName.length > 40) {
      setErrorMsg("Tag name cannot exceed 40 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/knowledge-exchange/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          category,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to create tag.");
        setIsSubmitting(false);
        return;
      }

      if (data?.tag) {
        onTagCreated(data.tag);
        onClose();
      }
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tag-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] shadow-2xl overflow-hidden z-10 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="create-tag-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Create New Tag
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add an academic or technical topic to organize questions & discussions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tag Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={nameInputId}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Tag Name <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {name.length}/40
              </span>
            </div>
            <input
              id={nameInputId}
              type="text"
              required
              maxLength={40}
              placeholder="e.g. Microcontrollers, Operating Systems, C++"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:focus:ring-orange-500/40 transition-all disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              Slug: #{previewSlug}
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor={categorySelectId}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Academic Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "TOPIC", label: "Core Computer Science", sub: "Algorithms, math, fundamentals" },
                  { id: "CPE", label: "Computer Engineering", sub: "Circuits, embedded, hardware" },
                  { id: "IT", label: "Information Technology", sub: "Networking, systems, web" },
                  { id: "GENERAL", label: "General & Community", sub: "Announcements, campus life" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  disabled={isSubmitting}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    category === cat.id
                      ? "border-orange-500/50 bg-orange-500/5 dark:bg-orange-500/10 ring-1 ring-orange-500/30 text-orange-600 dark:text-orange-400 font-semibold"
                      : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="font-semibold">{cat.label}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {cat.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={descriptionInputId}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length}/300
              </span>
            </div>
            <textarea
              id={descriptionInputId}
              rows={2}
              maxLength={300}
              placeholder="Briefly describe what questions or topics belong to this tag..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:focus:ring-orange-500/40 transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Live Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3 w-3 text-orange-500" />
              <span>Live Badge Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <KxTagBadge
                name={name.trim() || "Tag Preview"}
                slug={previewSlug}
                category={category}
                instituteCode={instituteCode}
              />
              <span className="text-xs text-slate-400">
                Category: {KX_TAG_CATEGORIES[category as keyof typeof KX_TAG_CATEGORIES]?.label || category}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Tag...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Tag</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
