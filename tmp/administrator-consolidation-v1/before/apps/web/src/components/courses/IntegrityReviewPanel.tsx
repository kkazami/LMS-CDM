"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  MousePointer,
  Maximize2,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  evaluateIntegrityRisk,
  buildStudentIntegritySummaries,
  type IntegrityEventItem,
  type StudentIntegritySummary,
} from "@/lib/integrity-scoring";

interface IntegrityReviewPanelProps {
  students: Array<{ id: string; name: string; email: string }>;
  events: IntegrityEventItem[];
  itemTitle: string;
}

const EVENT_ICONS = {
  TAB_SWITCH: { icon: ExternalLink, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Tab Switch" },
  COPY_PASTE: { icon: Copy, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "Clipboard Action" },
  FULLSCREEN_EXIT: { icon: Maximize2, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Fullscreen Exit" },
  RIGHT_CLICK: { icon: MousePointer, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Right Click" },
};

function formatTimestamp(ts: Date | string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function parseMetadataDetails(metadataStr: string): string | null {
  try {
    const data = JSON.parse(metadataStr || "{}");
    const parts: string[] = [];
    if (data.durationSeconds) parts.push(`Away for ${data.durationSeconds}s`);
    if (data.action) parts.push(`Action: ${data.action}`);
    if (data.charCount) parts.push(`${data.charCount} characters`);
    if (data.targetTag) parts.push(`Target: <${data.targetTag.toLowerCase()}>`);
    return parts.length > 0 ? parts.join(" • ") : null;
  } catch {
    return null;
  }
}

export default function IntegrityReviewPanel({
  students,
  events,
  itemTitle,
}: IntegrityReviewPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState<"ALL" | "MULTIPLE" | "MINOR" | "CLEAN">("ALL");
  const [sortBy, setSortBy] = useState<"FLAGS_DESC" | "FLAGS_ASC" | "NAME">("FLAGS_DESC");
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  const summaries = useMemo(() => {
    return buildStudentIntegritySummaries(students, events);
  }, [students, events]);

  const stats = useMemo(() => {
    let clean = 0;
    let minor = 0;
    let multiple = 0;
    let totalEvents = events.length;

    for (const s of summaries) {
      if (s.riskLevel === "CLEAN") clean++;
      else if (s.riskLevel === "MINOR") minor++;
      else multiple++;
    }

    return { total: summaries.length, clean, minor, multiple, totalEvents };
  }, [summaries, events]);

  const filteredSummaries = useMemo(() => {
    return summaries
      .filter((s) => {
        if (filterRisk !== "ALL" && s.riskLevel !== filterRisk) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return s.studentName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "FLAGS_DESC") return b.totalFlags - a.totalFlags;
        if (sortBy === "FLAGS_ASC") return a.totalFlags - b.totalFlags;
        return a.studentName.localeCompare(b.studentName);
      });
  }, [summaries, filterRisk, searchQuery, sortBy]);

  const toggleStudent = (studentId: string) => {
    setExpandedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Total Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F0F2F8] mt-2">
            {stats.total}
          </p>
          <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
            {stats.totalEvents} total logged event(s)
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Clean Records
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-2">
            {stats.clean}
          </p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            0 flags recorded
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Minor Flags
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Info className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-2">
            {stats.minor}
          </p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
            1–2 flags during attempt
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Multiple Flags
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-2">
            {stats.multiple}
          </p>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">
            3+ flags recorded
          </p>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" />
        <div>
          <span className="font-semibold">Informational Proctoring Report:</span> These logs record
          client browser events (tab switches, clipboard usage, window blurs) for your review.
          Events do not automatically penalize or fail students; you retain complete discretion over
          evaluation.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#8B92A5]" />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] text-slate-900 dark:text-[#F0F2F8] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs font-semibold">
            {(["ALL", "MULTIPLE", "MINOR", "CLEAN"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilterRisk(level)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterRisk === level
                    ? "bg-white dark:bg-[#1E2132] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                    : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
                }`}
              >
                {level === "ALL" ? "All" : level === "MULTIPLE" ? "Multiple" : level === "MINOR" ? "Minor" : "Clean"}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] text-slate-700 dark:text-[#F0F2F8] focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
          >
            <option value="FLAGS_DESC">Highest Flags</option>
            <option value="FLAGS_ASC">Lowest Flags</option>
            <option value="NAME">Student Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Student Integrity List */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
        {filteredSummaries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-[#8B92A5]">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-white/10 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-[#F0F2F8]">No matching records</p>
            <p className="text-xs mt-1">Try adjusting your risk filter or search keywords.</p>
          </div>
        ) : (
          filteredSummaries.map((studentSummary) => {
            const isExpanded = Boolean(expandedStudents[studentSummary.studentId]);
            const riskMeta = evaluateIntegrityRisk(studentSummary.events);

            return (
              <div
                key={studentSummary.studentId}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
              >
                {/* Summary Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStudent(studentSummary.studentId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      toggleStudent(studentSummary.studentId);
                    }
                  }}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Student Identity */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-[#F0F2F8] shrink-0">
                      {studentSummary.studentName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-[#F0F2F8] truncate">
                        {studentSummary.studentName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-[#8B92A5] truncate">
                        {studentSummary.email}
                      </p>
                    </div>
                  </div>

                  {/* Badges and Event Breakdown */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Event Breakdown Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {studentSummary.breakdown.tabSwitches > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <ExternalLink className="w-3 h-3" />
                          {studentSummary.breakdown.tabSwitches} tab{studentSummary.breakdown.tabSwitches > 1 ? "s" : ""}
                        </span>
                      )}
                      {studentSummary.breakdown.copyPastes > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          <Copy className="w-3 h-3" />
                          {studentSummary.breakdown.copyPastes} clipboard
                        </span>
                      )}
                      {studentSummary.breakdown.rightClicks > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                          <MousePointer className="w-3 h-3" />
                          {studentSummary.breakdown.rightClicks} click{studentSummary.breakdown.rightClicks > 1 ? "s" : ""}
                        </span>
                      )}
                      {studentSummary.breakdown.fullscreenExits > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                          <Maximize2 className="w-3 h-3" />
                          {studentSummary.breakdown.fullscreenExits} exit{studentSummary.breakdown.fullscreenExits > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Overall Risk Indicator */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${riskMeta.badgeClasses}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: riskMeta.indicatorColor }}
                      />
                      {riskMeta.label}
                    </span>

                    {/* Expand Arrow */}
                    <div className="p-1 rounded-md text-slate-400 dark:text-[#8B92A5]">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Event Timeline */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 bg-slate-50/40 dark:bg-black/15 border-t border-slate-100 dark:border-white/5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                        Attempt Timeline ({studentSummary.events.length} event{studentSummary.events.length !== 1 ? "s" : ""})
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">
                        Chronological order
                      </p>
                    </div>

                    {studentSummary.events.length === 0 ? (
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Clean attempt — No tab switches, copy/pastes, or right-clicks recorded.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {studentSummary.events.map((ev, idx) => {
                          const config = EVENT_ICONS[ev.eventType as keyof typeof EVENT_ICONS] || EVENT_ICONS.TAB_SWITCH;
                          const IconComp = config.icon;
                          const detailText = parseMetadataDetails(ev.metadata);

                          return (
                            <div
                              key={ev.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border ${config.border} bg-white dark:bg-[#181B26] shadow-xs text-xs`}
                            >
                              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                <span className="font-mono text-[11px] text-slate-400 dark:text-[#8B92A5] min-w-[65px]">
                                  #{idx + 1}
                                </span>
                                <div className={`w-6 h-6 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shrink-0`}>
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">
                                    {config.label}
                                  </span>
                                  <span className="text-[11px] text-slate-400 dark:text-[#8B92A5] inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTimestamp(ev.timestamp)}
                                  </span>
                                </div>

                                {detailText && (
                                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                                    {detailText}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                                  ev.severity === "HIGH"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : ev.severity === "MEDIUM"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {ev.severity}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
