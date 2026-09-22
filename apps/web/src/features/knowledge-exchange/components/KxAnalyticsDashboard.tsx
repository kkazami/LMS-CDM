"use client";

import React, { useEffect, useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  Award,
  Tag,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import KxTagBadge from "./KxTagBadge";
import { KxTagSummary } from "../types";

interface AnalyticsData {
  totalPosts: number;
  totalQuestions: number;
  totalDiscussions: number;
  answeredQuestions: number;
  totalAnswers: number;
  verifiedAnswers: number;
  totalComments: number;
  totalTags: number;
  resolutionRate: number;
  topTags: KxTagSummary[];
  recentPosts: Array<{
    id: string;
    title: string;
    postType: string;
    status: string;
    voteCount: number;
    answerCount: number;
    createdAt: string;
  }>;
}

interface KxAnalyticsDashboardProps {
  institute: string;
}

export function KxAnalyticsDashboard({ institute }: KxAnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge-exchange/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading Knowledge Exchange analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
        <p className="text-sm text-destructive font-medium">{error || "No data available"}</p>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Questions</span>
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{data.totalQuestions}</div>
          <div className="text-xs text-muted-foreground">
            Discussions: <span className="font-semibold text-foreground">{data.totalDiscussions}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolution Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {data.resolutionRate}%
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{data.answeredQuestions}</span> of{" "}
            {data.totalQuestions} answered
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Answers</span>
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{data.totalAnswers}</div>
          <div className="text-xs text-muted-foreground">
            Comments: <span className="font-semibold text-foreground">{data.totalComments}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Answers</span>
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary">{data.verifiedAnswers}</div>
          <div className="text-xs text-muted-foreground">
            By ICS faculty & instructors
          </div>
        </div>
      </div>

      {/* Top Tags & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Tags */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Most Active Tags
            </h3>
            <Link
              href={`/${institute}/knowledge-exchange/tags`}
              className="text-xs text-primary hover:underline font-medium"
            >
              Browse all ({data.totalTags})
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {data.topTags.map((tag) => (
              <KxTagBadge
                key={tag.id}
                slug={tag.slug}
                name={tag.name}
                category={tag.category}
                count={tag.postCount}
                instituteCode={institute}
                className="text-xs py-1 px-2.5"
              />
            ))}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Recent Activity
          </h3>
          <div className="divide-y divide-border/60">
            {data.recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/${institute}/knowledge-exchange/post/${post.id}`}
                className="block py-2.5 first:pt-0 last:pb-0 group"
              >
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="capitalize">{post.postType.toLowerCase()}</span>
                  <span>•</span>
                  <span>{post.answerCount} answers</span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
