"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  HelpCircle,
  MessageSquare,
  Send,
  AlertCircle,
  ExternalLink,
  Loader2,
  GitBranch,
  X,
} from "lucide-react";
import { RepoLinkerModal } from "./github/RepoLinkerModal";
import KxRichTextEditor from "./KxRichTextEditor";
import KxTagSelector from "./KxTagSelector";
import KxAnonymousToggle from "./KxAnonymousToggle";
import KxCourseLinkSelector from "./KxCourseLinkSelector";
import type { CourseOption } from "./KxCourseLinkSelector";
import type { KxTagSummary, KxPostType } from "../types";
import { KX_VALIDATION } from "../constants";

interface KxAskFormProps {
  instituteCode: string;
  availableTags: KxTagSummary[];
  enrolledCourses?: CourseOption[];
  preselectedCourseId?: string | null;
}

export default function KxAskForm({
  instituteCode,
  availableTags,
  enrolledCourses = [],
  preselectedCourseId,
}: KxAskFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState<KxPostType>("QUESTION");
  const [body, setBody] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [courseId, setCourseId] = useState<string | null>(
    preselectedCourseId || null
  );
  const [syllabusItemId, setSyllabusItemId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [attachedRepo, setAttachedRepo] = useState<{
    owner: string;
    repo: string;
    branch?: string;
    filePath?: string;
    lineStart?: number;
    lineEnd?: number;
    visibility: 'cohort' | 'instructor_only' | 'anonymous';
  } | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI states
  const [isImproving, setIsImproving] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<
    Array<{ id: string; title: string; snippet: string }>
  >([]);

  // Check duplicates with 500ms debounce
  useEffect(() => {
    if (title.trim().length < 8) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch("/api/knowledge-exchange/ai/suggest-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.duplicates) {
            setDuplicates(data.duplicates);
          }
        })
        .catch(() => {
          // Graceful fallback
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [title]);

  const handleImproveWithAi = async () => {
    if (!title.trim() && !body.trim()) {
      setAiMessage("Enter at least a draft title or problem description first.");
      return;
    }

    setIsImproving(true);
    setAiMessage(null);

    try {
      const res = await fetch("/api/knowledge-exchange/ai/improve-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiMessage(data?.error || "AI features temporarily unavailable.");
      } else {
        if (data.suggestedTitle) setTitle(data.suggestedTitle);
        if (data.improvedBody) setBody(data.improvedBody);
        setAiMessage(data.explanation || "Question improved successfully!");
      }
    } catch {
      setAiMessage("Could not connect to AI service.");
    } finally {
      setIsImproving(false);
    }
  };

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
      setErrorMsg("Please select at least one relevant tag.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/knowledge-exchange/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          postType,
          isAnonymous,
          tagIds: selectedTagIds,
          courseId,
          syllabusItemId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to create post.");
        setIsSubmitting(false);
        return;
      }

      // If a GitHub repository was attached, link it to the newly created post
      if (attachedRepo && data?.post?.id) {
        try {
          const linkRes = await fetch('/api/github/repos/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...attachedRepo,
              postId: data.post.id,
            }),
          });
          if (!linkRes.ok) {
            const errData = await linkRes.json().catch(() => ({}));
            console.error('Failed to link attached GitHub repo to post:', errData);
          }
        } catch (linkErr) {
          console.error('Failed to link attached GitHub repo to post:', linkErr);
        }
      }

      // Success! Navigate to created post
      router.push(`/${instituteCode}/knowledge-exchange/post/${data.post.id}`);
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Post Type Selector */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPostType("QUESTION")}
          className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-semibold transition-all ${
            postType === "QUESTION"
              ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-xs"
              : "bg-white dark:bg-[#151924] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Ask a Question</span>
        </button>

        <button
          type="button"
          onClick={() => setPostType("DISCUSSION")}
          className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-semibold transition-all ${
            postType === "DISCUSSION"
              ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-xs"
              : "bg-white dark:bg-[#151924] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Start a Discussion</span>
        </button>
      </div>

      {/* Title Input with AI Improvement Button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-900 dark:text-white">
            Title <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleImproveWithAi}
            disabled={isImproving || (!title.trim() && !body.trim())}
            title="Refine question title and format problem description with Gemini AI"
            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-40 transition-colors"
          >
            {isImproving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Improving...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span>Improve with AI</span>
              </>
            )}
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            postType === "QUESTION"
              ? "e.g., How does time complexity differ between BFS and DFS on an adjacency list?"
              : "e.g., Discussion: Tradeoffs between monolithic and microservices architectures in capstone projects"
          }
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-orange-500/20"
        />

        {aiMessage && (
          <p className="text-xs text-purple-600 dark:text-purple-400 italic">
            ✨ {aiMessage}
          </p>
        )}

        {/* Duplicate Suggestions Accordion / Cards */}
        {duplicates.length > 0 && (
          <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <span className="font-semibold text-amber-700 dark:text-amber-400 block mb-1">
              Similar questions already asked:
            </span>
            <div className="space-y-1.5">
              {duplicates.map((dup) => (
                <a
                  key={dup.id}
                  href={`/${instituteCode}/knowledge-exchange/post/${dup.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <span className="truncate pr-2">{dup.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body Rich Text Editor */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900 dark:text-white">
          Problem Details & Context <span className="text-red-500">*</span>
        </label>
        <KxRichTextEditor value={body} onChange={setBody} />
      </div>

      {/* Tag Selector */}
      <KxTagSelector
        availableTags={availableTags}
        selectedTagIds={selectedTagIds}
        onChange={setSelectedTagIds}
      />

      {/* Course & Assessment Linking */}
      {enrolledCourses.length > 0 && (
        <KxCourseLinkSelector
          courses={enrolledCourses}
          selectedCourseId={courseId}
          selectedSyllabusItemId={syllabusItemId}
          onSelectCourse={setCourseId}
          onSelectSyllabusItem={setSyllabusItemId}
        />
      )}

      {/* GitHub Repository Attachment */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                Attach GitHub Code or Repository
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                Link code files, line ranges, or an entire repository with custom visibility controls.
              </span>
            </div>
          </div>

          {!attachedRepo ? (
            <button
              type="button"
              onClick={() => setIsRepoModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-orange-500/30 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors cursor-pointer"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Attach Repository</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAttachedRepo(null)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:underline cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {attachedRepo && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {attachedRepo.owner}/{attachedRepo.repo}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ({attachedRepo.branch || 'main'})
              </span>
              {attachedRepo.filePath && (
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 font-mono text-[11px] text-orange-600 dark:text-orange-400">
                  {attachedRepo.filePath}
                  {attachedRepo.lineStart && attachedRepo.lineEnd ? `:${attachedRepo.lineStart}-${attachedRepo.lineEnd}` : ''}
                </span>
              )}
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 capitalize">
              Visibility: {attachedRepo.visibility.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

        {/* Anonymous Posting Toggle */}
        <KxAnonymousToggle checked={isAnonymous} onChange={setIsAnonymous} />

        {/* Validation Error Message */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Action */}
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
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Publish {postType === "QUESTION" ? "Question" : "Discussion"}</span>
              </>
            )}
          </button>
        </div>
      </form>

      <RepoLinkerModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        onLinked={(linked) => {
          setAttachedRepo(linked);
          setIsRepoModalOpen(false);
        }}
      />
    </>
  );
}
