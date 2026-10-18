"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  History,
  Flag,
  Share2,
  Sparkles,
  Loader2,
  MessageSquare,
  Lock,
  Pin,
  CheckCircle,
  AlertCircle,
  Trash2,
  GitBranch,
} from "lucide-react";
import { CodeViewer } from "./github/CodeViewer";
import { CIStatusBadge } from "./github/CIStatusBadge";
import { RepoLinkerModal } from "./github/RepoLinkerModal";
import { marked } from "marked";
import KxVoteButton from "./KxVoteButton";
import KxBookmarkButton from "./KxBookmarkButton";
import KxTagBadge from "./KxTagBadge";
import KxUserCard from "./KxUserCard";
import KxAnswerCard from "./KxAnswerCard";
import KxCommentThread from "./KxCommentThread";
import KxFlagModal from "./KxFlagModal";
import KxDeleteConfirmModal from "./KxDeleteConfirmModal";
import KxAcademicIntegrityBanner from "./KxAcademicIntegrityBanner";
import KxRichTextEditor from "./KxRichTextEditor";
import KxAnonymousToggle from "./KxAnonymousToggle";
import KxLatexRenderer from "./KxLatexRenderer";
import KxCodeBlock from "./KxCodeBlock";
import type { KxPostItem, KxAnswerItem } from "../types";
import { KX_VALIDATION } from "../constants";
import { sanitizeKxHtml } from "../utils";

interface KxPostDetailProps {
  post: KxPostItem;
  instituteCode: string;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
}

export default function KxPostDetail({
  post: initialPost,
  instituteCode,
  currentUserId,
  currentUserRole,
  currentUserAvatar,
  currentUserName,
}: KxPostDetailProps) {
  const router = useRouter();

  const [post, setPost] = useState<KxPostItem>(initialPost);
  const [answers, setAnswers] = useState<KxAnswerItem[]>(
    initialPost.answers || []
  );

  // New answer form states
  const [answerBody, setAnswerBody] = useState("");
  const [isAnonymousAnswer, setIsAnonymousAnswer] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // AI states
  const [isDraftingAnswer, setIsDraftingAnswer] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [threadSummary, setThreadSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Modals
  const [isFlagOpen, setIsFlagOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);

  // Linked GitHub repositories
  const [repoLinks, setRepoLinks] = useState<any[]>([]);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);

  React.useEffect(() => {
    if (!post?.id) return;
    fetch(`/api/github/repos/link?postId=${post.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setRepoLinks(data);
      })
      .catch((err) => console.error("Failed to load post repo links:", err));
  }, [post?.id]);

  const roleUpper = currentUserRole?.toUpperCase() || "";
  const isAdmin = roleUpper === "ADMIN";
  const isInstructorOrAdmin =
    roleUpper === "ADMIN" ||
    roleUpper === "PROFESSOR" ||
    roleUpper === "INSTRUCTOR" ||
    roleUpper === "TEACHER";

  const isAuthor = Boolean(
    currentUserId && (currentUserId === post.authorId || post.author?.isSelf)
  );

  const canDeletePost = isAdmin || isAuthor;

  const handleDeletePost = async () => {
    const res = await fetch(`/api/knowledge-exchange/posts/${post.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to delete post.");
    }
    router.push(`/${instituteCode}/knowledge-exchange`);
    router.refresh();
  };

  const isLocked = post.status === "LOCKED";
  const isClosed = post.status === "CLOSED";

  const isAssessmentLinked = Boolean(
    post.syllabusItem?.type === "QUIZ" ||
      post.syllabusItem?.type === "EXAM" ||
      post.syllabusItem?.enableIntegrityMonitoring
  );

  // Sort answers: accepted answer first, then voteCount desc
  const sortedAnswers = [...answers].sort((a, b) => {
    if (a.isAccepted && !b.isAccepted) return -1;
    if (!a.isAccepted && b.isAccepted) return 1;
    return b.voteCount - a.voteCount;
  });

  // Split post.body into code blocks vs markdown sections
  const bodyContent = useMemo(() => {
    if (!post.body) return null;
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let partIdx = 0;

    while ((match = codeBlockRegex.exec(post.body)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = post.body.substring(lastIndex, match.index);
        const parsedHtml = sanitizeKxHtml(marked.parse(textChunk, { breaks: true, gfm: true }) as string);
        parts.push(
          <div key={`md-${partIdx++}`} className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 prose-img:max-h-60 sm:prose-img:max-h-72 prose-img:max-w-xs sm:prose-img:max-w-sm prose-img:w-auto prose-img:h-auto prose-img:rounded-xl prose-img:border prose-img:border-slate-200 dark:prose-img:border-white/10 prose-img:shadow-xs prose-img:my-2.5 prose-img:cursor-zoom-in">
            <KxLatexRenderer content={parsedHtml} />
          </div>
        );
      }

      const lang = match[1] || "code";
      const code = match[2];
      parts.push(
        <KxCodeBlock key={`code-${partIdx++}`} language={lang} code={code} />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < post.body.length) {
      const remaining = post.body.substring(lastIndex);
      const parsedHtml = sanitizeKxHtml(marked.parse(remaining, { breaks: true, gfm: true }) as string);
      parts.push(
        <div key={`md-${partIdx++}`} className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
          <KxLatexRenderer content={parsedHtml} />
        </div>
      );
    }

    return parts;
  }, [post.body]);

  const handleDraftAnswerWithAi = async () => {
    setIsDraftingAnswer(true);
    setAiError(null);

    try {
      const res = await fetch("/api/knowledge-exchange/ai/draft-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          body: post.body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || "AI features temporarily unavailable.");
      } else if (data.draftAnswer) {
        setAnswerBody(data.draftAnswer);
      }
    } catch {
      setAiError("Could not connect to AI service.");
    } finally {
      setIsDraftingAnswer(false);
    }
  };

  const handleSummarizeThread = async () => {
    setIsSummarizing(true);
    setAiError(null);

    try {
      const res = await fetch("/api/knowledge-exchange/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          body: post.body,
          answers: answers.map((a) => ({
            authorName: a.isAnonymous ? "Anonymous User" : a.author.name,
            body: a.body,
            isAccepted: a.isAccepted,
            isVerified: a.isVerified,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || "Could not generate summary.");
      } else if (data.summary) {
        setThreadSummary(data.summary);
      }
    } catch {
      setAiError("Could not connect to AI service.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnswerError(null);

    if (answerBody.trim().length < KX_VALIDATION.MIN_ANSWER_LENGTH) {
      setAnswerError(
        `Answer must be at least ${KX_VALIDATION.MIN_ANSWER_LENGTH} characters.`
      );
      return;
    }

    setIsSubmittingAnswer(true);

    try {
      const res = await fetch(
        `/api/knowledge-exchange/posts/${post.id}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: answerBody,
            isAnonymous: isAnonymousAnswer,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setAnswerError(data?.error || "Failed to submit answer.");
        setIsSubmittingAnswer(false);
        return;
      }

      setAnswers((prev) => [...prev, data.answer]);
      setAnswerBody("");
      setIsAnonymousAnswer(false);
      setPost((prev) => ({
        ...prev,
        answerCount: prev.answerCount + 1,
      }));
    } catch {
      setAnswerError("A network error occurred. Please try again.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleAcceptedChanged = (answerId: string, accepted: boolean) => {
    setAnswers((prev) =>
      prev.map((a) => ({
        ...a,
        isAccepted: a.id === answerId ? accepted : false, // Only 1 accepted answer
      }))
    );
    if (accepted) {
      setPost((prev) => ({ ...prev, status: "ANSWERED" }));
    }
  };

  const handleVerifiedChanged = (answerId: string, verified: boolean) => {
    setAnswers((prev) =>
      prev.map((a) => (a.id === answerId ? { ...a, isVerified: verified } : a))
    );
  };

  const handleDeleteAnswer = (answerId: string) => {
    setDeletingAnswerId(answerId);
  };

  const handleConfirmDeleteAnswer = async () => {
    if (!deletingAnswerId) return;

    const res = await fetch(
      `/api/knowledge-exchange/answers/${deletingAnswerId}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to delete answer.");
    }

    const id = deletingAnswerId;
    setAnswers((prev) => prev.filter((a) => a.id !== id));
    setPost((prev) => ({
      ...prev,
      answerCount: Math.max(0, prev.answerCount - 1),
    }));
    setDeletingAnswerId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Back to Feed Button */}
      <div>
        <Link
          href={`/${instituteCode}/knowledge-exchange`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-3 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
      </div>

      {/* Assessment Integrity Warning Banner */}
      {isAssessmentLinked && (
        <KxAcademicIntegrityBanner
          syllabusItemTitle={post.syllabusItem?.title}
        />
      )}

      {/* Main Post Container */}
      <article className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-6 shadow-xs space-y-6">
        {/* Header Badges & Context */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Post Type Badge */}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                post.postType === "QUESTION"
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              }`}
            >
              {post.postType}
            </span>

            {/* Status Badge */}
            {post.status === "ANSWERED" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="h-3 w-3" />
                Answered
              </span>
            )}

            {post.status === "CLOSED" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                Closed
              </span>
            )}

            {post.status === "LOCKED" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}

            {post.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}

            {/* Course Link Badge */}
            {post.course && (
              <Link
                href={`/${instituteCode}/knowledge-exchange?courseId=${post.course.id}`}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-orange-500/30 transition-colors"
              >
                {post.course.code}
              </Link>
            )}

            {/* Syllabus Item Link */}
            {post.syllabusItem && post.course && (
              <Link
                href={`/${instituteCode}/courses/${post.course.id}`}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-orange-500/30 transition-colors truncate max-w-[200px]"
              >
                [{post.syllabusItem.type}] {post.syllabusItem.title}
              </Link>
            )}
          </div>

          {/* Quick Actions (Bookmark, Share, Flag) */}
          <div className="flex items-center gap-1">
            <KxBookmarkButton
              postId={post.id}
              initialBookmarked={post.isBookmarked}
              showLabel
            />

            <button
              type="button"
              onClick={() => setIsFlagOpen(true)}
              title="Report post"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Flag className="h-4 w-4" />
            </button>

            {canDeletePost && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete question"
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {post.title}
        </h1>

        {/* Author Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-1 border-t border-slate-100 dark:border-white/5">
          <KxUserCard
            author={post.author}
            createdAt={post.createdAt}
            actionLabel="asked"
          />

          {/* Revisions link, Edit link, & Delete button */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Link
              href={`/${instituteCode}/knowledge-exchange/post/${post.id}/revisions`}
              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              <span>Revisions</span>
            </Link>

            {isAuthor && (
              <button
                type="button"
                onClick={() => setIsRepoModalOpen(true)}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Attach Repo</span>
              </button>
            )}

            {isAuthor && (
              <Link
                href={`/${instituteCode}/knowledge-exchange/post/${post.id}/edit`}
                className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium hover:underline"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Link>
            )}

            {canDeletePost && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium hover:underline cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Body with Voting column */}
        <div className="flex gap-4 items-start pt-2">
          {/* Voting */}
          <KxVoteButton
            initialVoteCount={post.voteCount}
            initialUserVote={typeof post.userVote === "number" ? post.userVote : post.userVote === "UP" ? 1 : post.userVote === "DOWN" ? -1 : undefined}
            postId={post.id}
            isSelf={isAuthor}
            orientation="vertical"
          />

          {/* Markdown & Code Content */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="space-y-3">
              {bodyContent}
            </div>

            {/* Linked GitHub Repositories */}
            {repoLinks && repoLinks.length > 0 && (
              <div className="space-y-4 pt-2">
                {repoLinks.map((link) => (
                  <div
                    key={link.id}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-orange-500" />
                        <a
                          href={`https://github.com/${link.owner}/${link.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm font-semibold text-slate-900 dark:text-white hover:text-orange-500 transition-colors inline-flex items-center gap-1"
                        >
                          {link.owner}/{link.repo}
                        </a>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({link.branch || "main"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {link.ciResults && link.ciResults[0] && (
                          <CIStatusBadge
                            status={link.ciResults[0].status}
                            conclusion={link.ciResults[0].conclusion}
                            workflowName={link.ciResults[0].workflowName}
                            runUrl={link.ciResults[0].runUrl}
                          />
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 capitalize">
                          {link.visibility.replace("_", " ")}
                        </span>
                        {(isAuthor || isAdmin) && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch(`/api/github/repos/link/${link.id}`, { method: "DELETE" });
                                setRepoLinks((prev) => prev.filter((r) => r.id !== link.id));
                              } catch (err) {
                                console.error("Failed to unlink repository:", err);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Unlink repository"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {link.filePath ? (
                      <div className="mt-2">
                        <CodeViewer
                          owner={link.owner}
                          repo={link.repo}
                          filePath={link.filePath}
                          refSha={link.commitSha || link.branch}
                          lineStart={link.lineStart || undefined}
                          lineEnd={link.lineEnd || undefined}
                          repoLinkId={link.id}
                          currentUserId={currentUserId}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Whole repository linked. Click repository title to view on GitHub.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-3">
              {post.tags.map((t) => (
                <KxTagBadge
                  key={t.id}
                  slug={t.slug}
                  name={t.name}
                  category={t.category}
                  instituteCode={instituteCode}
                />
              ))}
            </div>

            {/* Question Comments */}
            <KxCommentThread
              comments={post.comments || []}
              postId={post.id}
              postAuthorId={post.authorId || undefined}
              isPostAuthor={isAuthor}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              currentUserAvatar={currentUserAvatar}
              currentUserName={currentUserName}
            />
          </div>
        </div>
      </article>

      {/* Answers Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{answers.length} Answers</span>
          </h2>

          {/* AI Thread Summary Button */}
          {answers.length >= 1 && (
            <button
              type="button"
              onClick={handleSummarizeThread}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Summarizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Summarize Thread with AI</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Display Thread Summary Card if generated */}
        {threadSummary && (
          <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-2 text-sm text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                AI Discussion Summary
              </span>
              <button
                type="button"
                onClick={() => setThreadSummary(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Dismiss
              </button>
            </div>
            <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed">
              <KxLatexRenderer
                content={sanitizeKxHtml(marked.parse(threadSummary, { breaks: true }) as string)}
              />
            </div>
          </div>
        )}

        {aiError && (
          <p className="text-xs text-purple-600 dark:text-purple-400 italic">
            ⚠️ {aiError}
          </p>
        )}

        {/* Answers List */}
        <div className="space-y-4">
          {sortedAnswers.map((answer) => (
            <KxAnswerCard
              key={answer.id}
              answer={answer}
              postAuthorId={post.authorId || undefined}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              currentUserAvatar={currentUserAvatar}
              currentUserName={currentUserName}
              onAcceptedChanged={handleAcceptedChanged}
              onVerifiedChanged={handleVerifiedChanged}
              onDeleteAnswer={handleDeleteAnswer}
            />
          ))}

          {answers.length === 0 && (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No answers yet. Know the solution? Share your knowledge below!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Answer Submission Form */}
      {isLocked ? (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>This discussion has been locked. No new replies are accepted.</span>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Your Answer
            </h3>

            {/* AI Draft Answer Button */}
            <button
              type="button"
              onClick={handleDraftAnswerWithAi}
              disabled={isDraftingAnswer}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors disabled:opacity-50"
            >
              {isDraftingAnswer ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Draft Answer with AI</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <KxRichTextEditor
              value={answerBody}
              onChange={setAnswerBody}
              placeholder="Write your answer. Explain concepts thoroughly with examples and math formulas where applicable..."
            />

            <KxAnonymousToggle
              checked={isAnonymousAnswer}
              onChange={setIsAnonymousAnswer}
            />

            {answerError && (
              <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>{answerError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingAnswer}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmittingAnswer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Post Answer</span>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Flag Modal */}
      <KxFlagModal
        isOpen={isFlagOpen}
        onClose={() => setIsFlagOpen(false)}
        postId={post.id}
        isAssessmentLinked={isAssessmentLinked}
      />

      {/* Delete Post Modal */}
      <KxDeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePost}
        title="Delete Question"
        description="Are you sure you want to delete this question? This will remove the entire discussion thread and all associated answers from the knowledge exchange feed."
        itemType="post"
        itemName={post.title}
        confirmLabel="Delete Question"
      />

      {/* Delete Answer Modal */}
      <KxDeleteConfirmModal
        isOpen={Boolean(deletingAnswerId)}
        onClose={() => setDeletingAnswerId(null)}
        onConfirm={handleConfirmDeleteAnswer}
        title="Delete Answer"
        description="Are you sure you want to delete this answer? This will remove your answer and any comments attached to it."
        itemType="post"
        itemName={answers.find((a) => a.id === deletingAnswerId)?.body}
        confirmLabel="Delete Answer"
      />

      {/* GitHub Repository Linker Modal */}
      <RepoLinkerModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        postId={post.id}
        onLinked={(newLink) => {
          setRepoLinks((prev) => [newLink, ...prev]);
          setIsRepoModalOpen(false);
        }}
      />
    </div>
  );
}
