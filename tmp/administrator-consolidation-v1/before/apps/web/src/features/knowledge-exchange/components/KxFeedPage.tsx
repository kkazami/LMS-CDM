"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquarePlus,
  Tag,
  Bookmark,
  Shield,
  FileQuestion,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import KxPostCard from "./KxPostCard";
import KxSearchBar from "./KxSearchBar";
import KxFilterBar from "./KxFilterBar";
import type { FilterTab, SortOption } from "./KxFilterBar";
import KxPagination from "./KxPagination";
import KxDeleteConfirmModal from "./KxDeleteConfirmModal";
import type { KxPostItem } from "../types";

interface KxFeedPageProps {
  instituteCode: string;
  userRole?: string;
  currentUserId?: string;
  initialTag?: string;
  initialCourseId?: string;
}

export default function KxFeedPage({
  instituteCode,
  userRole = "STUDENT",
  currentUserId,
  initialTag,
  initialCourseId,
}: KxFeedPageProps) {
  const [posts, setPosts] = useState<KxPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [activeSort, setActiveSort] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const roleUpper = userRole.toUpperCase();
  const isStaff =
    roleUpper === "ADMIN" ||
    roleUpper === "PROFESSOR" ||
    roleUpper === "INSTRUCTOR" ||
    roleUpper === "TEACHER";
  const isAdmin = roleUpper === "ADMIN";

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const handleConfirmDeletePost = async () => {
    if (!deletingPostId) return;
    const res = await fetch(`/api/knowledge-exchange/posts/${deletingPostId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to delete post.");
    }
    const id = deletingPostId;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeletingPostId(null);
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      params.set("sort", activeSort);
      params.set("page", String(currentPage));
      if (searchQuery) {
        params.set("search", searchQuery);
        params.set("q", searchQuery);
      }
      if (selectedTag) params.set("tag", selectedTag);
      if (initialCourseId) params.set("courseId", initialCourseId);

      const res = await fetch(`/api/knowledge-exchange/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeSort, currentPage, searchQuery, selectedTag, initialCourseId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortOption) => {
    setActiveSort(sort);
    setCurrentPage(1);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Knowledge Exchange
            </h1>
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/20">
              ICS Exclusive
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Collaborative academic Q&A for computer science and engineering
            students, instructors, and researchers.
          </p>
        </div>

        {/* Action Button */}
        <Link
          href={`/${instituteCode}/knowledge-exchange/ask`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold shadow-md shadow-orange-500/20 transition-all cursor-pointer shrink-0"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Ask Question</span>
        </Link>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-medium border-b border-slate-200/80 dark:border-white/5 pb-2">
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={`/${instituteCode}/knowledge-exchange`}
            className="text-orange-600 dark:text-orange-400 font-semibold"
          >
            Questions
          </Link>
          <Link
            href={`/${instituteCode}/knowledge-exchange/tags`}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Tags</span>
          </Link>
          <Link
            href={`/${instituteCode}/knowledge-exchange/bookmarks`}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Bookmarks</span>
          </Link>
          <Link
            href={`/${instituteCode}/knowledge-exchange/my-posts`}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            My Posts
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <Link
              href={`/${instituteCode}/knowledge-exchange/moderation`}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Moderation</span>
            </Link>
          )}
          {isAdmin && (
            <Link
              href={`/${instituteCode}/knowledge-exchange/admin`}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Admin De-anonymize
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <KxSearchBar
          initialValue={searchQuery}
          onSearch={handleSearch}
          placeholder="Search questions by keyword, algorithm, error message, or concept..."
        />
      </div>

      {/* Active Filter Indicators */}
      {selectedTag && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Filtered by tag:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/20">
            #{selectedTag}
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="hover:text-orange-800 dark:hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {/* Filter Tabs & Sort Controls */}
      <KxFilterBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activeSort={activeSort}
        onSortChange={handleSortChange}
      />

      {/* Posts List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="text-xs">Loading Knowledge Exchange...</span>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <KxPostCard
              key={post.id}
              post={post}
              instituteCode={instituteCode}
              currentUserId={currentUserId}
              onDelete={isAdmin ? (id) => setDeletingPostId(id) : undefined}
            />
          ))}

          {/* Pagination */}
          <KxPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] p-8 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-400">
            <FileQuestion className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No questions found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No discussions match "${searchQuery}". Try refining your keywords or searching general tags.`
              : "No questions match the current filter. Be the first to ask!"}
          </p>
          <div className="pt-2">
            <Link
              href={`/${instituteCode}/knowledge-exchange/ask`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors shadow-xs"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Ask a Question</span>
            </Link>
          </div>
        </div>
      )}

      {/* Delete Post Modal */}
      <KxDeleteConfirmModal
        isOpen={Boolean(deletingPostId)}
        onClose={() => setDeletingPostId(null)}
        onConfirm={handleConfirmDeletePost}
        title="Delete Question"
        description="Are you sure you want to delete this question? This will remove the entire discussion thread and all associated answers from the knowledge exchange feed."
        itemType="post"
        itemName={posts.find((p) => p.id === deletingPostId)?.title}
        confirmLabel="Delete Question"
      />
    </div>
  );
}
