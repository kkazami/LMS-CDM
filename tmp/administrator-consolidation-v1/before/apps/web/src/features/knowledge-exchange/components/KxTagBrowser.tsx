"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Tag, Hash, Plus } from "lucide-react";
import KxTagBadge from "./KxTagBadge";
import KxCreateTagModal from "./KxCreateTagModal";
import type { KxTagSummary } from "../types";
import { KX_TAG_CATEGORIES } from "../constants";

interface KxTagBrowserProps {
  tags: KxTagSummary[];
  instituteCode: string;
  canCreateTag?: boolean;
  userRole?: string;
}

export default function KxTagBrowser({
  tags,
  instituteCode,
  canCreateTag = false,
  userRole = "STUDENT",
}: KxTagBrowserProps) {
  const [tagList, setTagList] = useState<KxTagSummary[]>(tags);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isInstructorOrAdmin =
    canCreateTag ||
    userRole?.toUpperCase() === "PROFESSOR" ||
    userRole?.toUpperCase() === "INSTRUCTOR" ||
    userRole?.toUpperCase() === "TEACHER" ||
    userRole?.toUpperCase() === "ADMIN";

  useEffect(() => {
    if (tags && tags.length > 0) {
      setTagList(tags);
    }
  }, [tags]);

  useEffect(() => {
    fetch("/api/knowledge-exchange/tags")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.tags && Array.isArray(data.tags)) {
          setTagList(data.tags);
        }
      })
      .catch(() => {});
  }, []);

  const handleTagCreated = (newTag: KxTagSummary) => {
    setTagList((prev) => {
      const exists = prev.some(
        (t) => t.id === newTag.id || t.slug === newTag.slug
      );
      if (exists) return prev;
      return [newTag, ...prev];
    });

    if (
      selectedCategory !== "ALL" &&
      selectedCategory !== newTag.category.toUpperCase()
    ) {
      setSelectedCategory(newTag.category.toUpperCase());
    }
  };

  const categories = ["ALL", "CPE", "IT", "TOPIC", "GENERAL"] as const;

  const filteredTags = useMemo(() => {
    return tagList.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());

      const matchesCat =
        selectedCategory === "ALL" ||
        t.category.toUpperCase() === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [tagList, search, selectedCategory]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tag className="h-6 w-6 text-orange-500" />
            <span>Tags Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore specialized topics across Computer Engineering (CpE),
            Information Technology (IT), and foundational computing topics.
          </p>
        </div>

        {isInstructorOrAdmin && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Tag</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tags by name or concept..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
              }`}
            >
              {cat === "ALL"
                ? "All Tags"
                : KX_TAG_CATEGORIES[cat as keyof typeof KX_TAG_CATEGORIES]?.label ||
                  cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredTags.map((tag) => (
          <div
            key={tag.id}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <KxTagBadge
                  slug={tag.slug}
                  name={tag.name}
                  category={tag.category}
                  instituteCode={instituteCode}
                />
                <span className="text-[11px] font-mono text-slate-400">
                  {tag.postCount} {tag.postCount === 1 ? "question" : "questions"}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {tag.description || "Topics and discussions tagged with " + tag.name}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5">
                {tag.category}
              </span>
              <Link
                href={`/${instituteCode}/knowledge-exchange?tag=${tag.slug}`}
                className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
              >
                View posts →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredTags.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-sm">
          No tags found matching &ldquo;{search}&rdquo;.
        </div>
      )}

      {/* Create Tag Modal */}
      <KxCreateTagModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTagCreated={handleTagCreated}
        instituteCode={instituteCode}
      />
    </div>
  );
}
