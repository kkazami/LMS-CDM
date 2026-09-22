"use client";

import React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Eye,
  CheckCircle2,
  Lock,
  Pin,
  HelpCircle,
  Trash2,
  MessageCircle,
} from "lucide-react";
import KxTagBadge from "./KxTagBadge";
import KxUserCard from "./KxUserCard";
import KxBookmarkButton from "./KxBookmarkButton";
import KxVoteButton from "./KxVoteButton";
import type { KxPostItem } from "../types";

interface KxPostCardProps {
  post: KxPostItem;
  instituteCode: string;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
}

export default function KxPostCard({
  post,
  instituteCode,
  onDelete,
  currentUserId,
}: KxPostCardProps) {
  const isQuestion = post.postType === "QUESTION";
  const hasAccepted = post.status === "ANSWERED";
  const isAuthor = Boolean(
    (currentUserId && post.authorId && post.authorId === currentUserId) ||
    post.author?.isSelf
  );

  const initialUserVote =
    typeof post.userVote === "number"
      ? post.userVote
      : post.userVote === "UP"
      ? 1
      : post.userVote === "DOWN"
      ? -1
      : 0;

  // Clean snippet from markdown and HTML
  const snippet = post.body
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "[Image]")
    .replace(/```[\s\S]*?```/g, "[Code]")
    .replace(/\$\$[\s\S]*?\$\$/g, "[Formula]")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*`_~>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return (
    <div
      className={`group relative rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${
        post.isPinned
          ? "border-purple-500/30 bg-purple-500/[0.02]"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] hover:border-slate-300 dark:hover:border-white/20"
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Left Column: Vote Up/Down & Answers Badge */}
        <div className="flex flex-col items-center shrink-0 w-12 sm:w-14 text-center space-y-2 select-none">
          <KxVoteButton
            initialVoteCount={post.voteCount}
            initialUserVote={initialUserVote}
            postId={post.id}
            isSelf={isAuthor}
            orientation="vertical"
            size="sm"
          />

          <div
            className={`hidden sm:flex flex-col items-center px-1.5 py-1 rounded-lg border text-xs font-semibold w-full ${
              hasAccepted
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : post.answerCount > 0
                ? "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                : "border-transparent text-slate-400"
            }`}
          >
            <span className="font-mono">{post.answerCount}</span>
            <span className="text-[10px] font-normal">
              {post.answerCount === 1 ? "answer" : "answers"}
            </span>
          </div>
        </div>

        {/* Main Content Column */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Top meta badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Badge */}
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                  isQuestion
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                }`}
              >
                {post.postType}
              </span>

              {/* Pinned Badge */}
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}

              {/* Status Indicator */}
              {hasAccepted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Answered
                </span>
              )}

              {post.status === "LOCKED" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}

              {/* Course link if tied to course */}
              {post.course && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                  {post.course.code}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(post.id);
                  }}
                  title="Delete post"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Bookmark button */}
              <KxBookmarkButton
                postId={post.id}
                initialBookmarked={post.isBookmarked}
              />
            </div>
          </div>

          {/* Title */}
          <Link
            href={`/${instituteCode}/knowledge-exchange/post/${post.id}`}
            className="block group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
              {post.title}
            </h3>
          </Link>

          {/* Excerpt */}
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {snippet}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((t) => (
              <KxTagBadge
                key={t.id}
                slug={t.slug}
                name={t.name}
                category={t.category}
                size="sm"
                instituteCode={instituteCode}
              />
            ))}
          </div>

          {/* Top Answer / Top Comment Preview */}
          {(post.topAnswer || post.topComment) && (() => {
            const isAnswer = Boolean(post.topAnswer);
            const preview = post.topAnswer ?? post.topComment!;
            const rawSnippet = preview.body
              .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
              .replace(/```[\s\S]*?```/g, "")
              .replace(/\$\$[\s\S]*?\$\$/g, "")
              .replace(/<[^>]*>/g, " ")
              .replace(/[#*`_~>\[\]]/g, "")
              .replace(/\s+/g, " ")
              .trim();
            const clipped = rawSnippet.length > 120 ? rawSnippet.slice(0, 120) + "…" : rawSnippet;
            if (!clipped) return null;
            return (
              <Link
                href={`/${instituteCode}/knowledge-exchange/post/${post.id}`}
                className="block mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="rounded-xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 space-y-1 hover:border-orange-300 dark:hover:border-orange-500/30 transition-colors">
                  <div className="flex items-center gap-1.5">
                    {isAnswer ? (
                      <>
                        <MessageSquare className="h-3 w-3 text-orange-500 shrink-0" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">Top Answer</span>
                        {(post.topAnswer?.isAccepted || post.topAnswer?.isVerified) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {post.topAnswer?.isAccepted ? "Accepted" : "Verified"}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Top Comment</span>
                      </>
                    )}
                    <span className="ml-auto text-[10px] text-slate-400">{preview.author.name}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{clipped}</p>
                </div>
              </Link>
            );
          })()}

          {/* Bottom Row: Author & Mobile Stats */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            {/* Mobile Answer Count Badge */}
            <div className="flex sm:hidden items-center gap-2 text-slate-500 text-[11px]">
              <span
                className={`px-2 py-0.5 rounded font-medium border ${
                  hasAccepted
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-slate-100 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-300"
                }`}
              >
                {post.answerCount} {post.answerCount === 1 ? "answer" : "answers"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 ml-auto">
              <span className="flex items-center gap-1 text-[11px]">
                <Eye className="h-3.5 w-3.5" />
                {post.viewCount} views
              </span>

              <KxUserCard
                author={post.author}
                createdAt={post.createdAt}
                actionLabel="asked"
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
