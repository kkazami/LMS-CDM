"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, ShieldAlert, Search, ExternalLink } from "lucide-react";
import type { KxDeanonymizedPostItem } from "../types";
import { formatRelativeTime } from "../utils";

interface KxDeanonymizationTableProps {
  initialPosts: KxDeanonymizedPostItem[];
  instituteCode: string;
}

export default function KxDeanonymizationTable({
  initialPosts,
  instituteCode,
}: KxDeanonymizationTableProps) {
  const [search, setSearch] = useState("");

  const filtered = initialPosts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.name.toLowerCase().includes(search.toLowerCase()) ||
      p.author.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.author.studentNumber &&
        p.author.studentNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Admin De-anonymization Table
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Confidential audit tool for administrators. Correlates anonymous aliases
          with verified student and instructor credentials to prevent harassment
          and academic misconduct.
        </p>
      </div>

      {/* Filter / Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by real name, email, student number, or post title..."
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 shadow-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Post Title</th>
                <th className="px-4 py-3">Public Alias</th>
                <th className="px-4 py-3">Real Author Name</th>
                <th className="px-4 py-3">Student / Employee ID</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">View Post</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-purple-500/[0.02] transition-colors"
                >
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                    {item.title}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 italic">
                    {item.anonymousAlias}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                    {item.author.name}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-purple-600 dark:text-purple-400">
                    {item.author.studentNumber || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    {item.author.email}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-semibold">
                      {item.author.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                    {formatRelativeTime(item.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/${instituteCode}/knowledge-exchange/post/${item.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-xs">
            No anonymous posts found.
          </div>
        )}
      </div>
    </div>
  );
}
