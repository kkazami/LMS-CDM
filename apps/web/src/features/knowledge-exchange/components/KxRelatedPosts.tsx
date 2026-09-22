"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, ThumbsUp, CheckCircle2 } from "lucide-react";
import { KxPostSummary } from "../types";

interface KxRelatedPostsProps {
  institute: string;
  posts: KxPostSummary[];
  title?: string;
  className?: string;
}

export function KxRelatedPosts({
  institute,
  posts,
  title = "Related Questions",
  className = "",
}: KxRelatedPostsProps) {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
      <div className="divide-y divide-border/60">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/${institute}/knowledge-exchange/post/${post.id}`}
            className="block py-2.5 first:pt-0 last:pb-0 group hover:opacity-90 transition-opacity"
          >
            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {post.title}
            </p>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <ThumbsUp className="w-3 h-3" />
                {post.voteCount}
              </span>
              <span
                className={`flex items-center gap-0.5 ${
                  post.status === "ANSWERED" ? "text-emerald-500 font-semibold" : ""
                }`}
              >
                {post.status === "ANSWERED" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <MessageSquare className="w-3 h-3" />
                )}
                {post.answerCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
