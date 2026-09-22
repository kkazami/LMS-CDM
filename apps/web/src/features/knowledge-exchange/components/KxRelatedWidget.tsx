"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, ExternalLink, PlusCircle, CheckCircle } from "lucide-react";
import type { KxPostItem } from "../types";

interface KxRelatedWidgetProps {
  courseId: string;
  courseCode: string;
  instituteCode?: string;
}

export default function KxRelatedWidget({
  courseId,
  courseCode,
  instituteCode = "ics",
}: KxRelatedWidgetProps) {
  const [posts, setPosts] = useState<KxPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/knowledge-exchange/posts?courseId=${courseId}&limit=5`)
      .then((res) => (res.ok ? res.json() : { posts: [] }))
      .then((data) => {
        if (isMounted) setPosts(data.posts || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-orange-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Related Discussions ({courseCode})
          </h3>
        </div>

        <Link
          href={`/${instituteCode}/knowledge-exchange/ask?courseId=${courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Ask Question</span>
        </Link>
      </div>

      {/* Post List */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Loading course discussions...
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-2.5">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/${instituteCode}/knowledge-exchange/post/${post.id}`}
              className="block p-3 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {post.title}
                </h4>
                {post.status === "ANSWERED" && (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                <span>{post.voteCount} votes</span>
                <span>{post.answerCount} answers</span>
                <span>
                  {post.isAnonymous
                    ? post.author.id
                      ? `${post.author.name} (Anon)`
                      : post.author.role?.toUpperCase() === "PROFESSOR" ||
                        post.author.role?.toUpperCase() === "INSTRUCTOR"
                      ? "Anonymous Instructor"
                      : "Anonymous Student"
                    : post.author.name}
                </span>
              </div>
            </Link>
          ))}

          <div className="pt-2 text-center">
            <Link
              href={`/${instituteCode}/knowledge-exchange?courseId=${courseId}`}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center justify-center gap-1"
            >
              <span>View all course discussions</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400 space-y-2">
          <p>No questions linked to {courseCode} yet.</p>
          <Link
            href={`/${instituteCode}/knowledge-exchange/ask?courseId=${courseId}`}
            className="text-xs text-orange-500 font-semibold hover:underline inline-block"
          >
            Be the first to start a thread →
          </Link>
        </div>
      )}
    </div>
  );
}
