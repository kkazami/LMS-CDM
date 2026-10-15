"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  Loader2,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { RiskReason } from "@/lib/ite/risk-service";
import type { EngagementTrend, DailyActivityPoint } from "@/lib/ite/engagement-service";

// ─── Types ─────────────────────────────────────────────────────────────────

interface StudentRow {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  engagementScore: number;
  trend: EngagementTrend;
  lastActivityAt: string | null;
  overdueCount: number;
  gradeAvg: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  reasons: RiskReason[];
  dailySeries: DailyActivityPoint[];
  computedAt: string | null;
}

interface Kpis {
  activeThisWeek: number;
  avgEngagement: number;
  highCount: number;
  mediumCount: number;
}

interface CourseDaily { date: string; count: number }

interface ParticipationData {
  students: StudentRow[];
  kpis: Kpis;
  courseDaily: CourseDaily[];
  computedAt: string | null;
}

interface Props {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  theme: InstituteTheme;
  instituteCode: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) {
  if (level === "HIGH")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
        <AlertTriangle className="h-3 w-3" /> High
      </span>
    );
  if (level === "MEDIUM")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
        <AlertCircle className="h-3 w-3" /> Medium
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
      <CheckCircle className="h-3 w-3" /> Low
    </span>
  );
}

function TrendIcon({ trend }: { trend: EngagementTrend }) {
  if (trend === "UP") return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === "DOWN") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

function Sparkline({ series }: { series: DailyActivityPoint[] }) {
  if (!series || series.length === 0) return null;
  const max = Math.max(...series.map((p) => p.count), 1);
  const w = 60, h = 20;
  const pts = series.map((p, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - (p.count / max) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible opacity-80">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-blue-500"
      />
    </svg>
  );
}

function DailyChart({ data }: { data: CourseDaily[] }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-24 text-sm text-slate-400">No activity data yet</div>
  );
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${d.date}: ${d.count} active`}>
          <div
            className="w-full rounded-t transition-all bg-blue-500/70 dark:bg-blue-400/60 group-hover:bg-blue-500"
            style={{ height: `${Math.max(2, (d.count / max) * 80)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function SuggestedActions({ reasons }: { reasons: RiskReason[] }) {
  const suggestions: string[] = [];
  for (const r of reasons) {
    if (r.code === "OVERDUE_TASKS") suggestions.push("Send a reminder about overdue submissions.");
    if (r.code === "INACTIVE") suggestions.push("Check in with the student directly.");
    if (r.code === "LOW_GRADE") suggestions.push("Schedule a review session or provide extra resources.");
    if (r.code === "LOW_ENGAGEMENT") suggestions.push("Encourage participation in course materials and quizzes.");
  }
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Suggested actions:</p>
      <ul className="space-y-1">
        {[...new Set(suggestions)].map((s) => (
          <li key={s} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
            <span className="mt-0.5 text-blue-500">→</span> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRelative(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function ParticipationClient({ courseId, courseTitle, courseCode, theme, instituteCode }: Props) {
  const [data, setData] = useState<ParticipationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<"all" | "HIGH" | "MEDIUM" | "LOW">("all");
  const [sortBy, setSortBy] = useState<"name" | "engagement" | "risk" | "overdue">("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ite/courses/${courseId}/participation`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Failed to load participation data.");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`/api/ite/courses/${courseId}/risk/recalculate`, { method: "POST" });
      if (!res.ok) return;
      await fetchData();
    } finally {
      setRecalculating(false);
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const filtered = (data?.students ?? [])
    .filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterLevel === "all" || s.riskLevel === filterLevel;
      return matchSearch && matchLevel;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "engagement") cmp = a.engagementScore - b.engagementScore;
      else if (sortBy === "risk") cmp = a.riskScore - b.riskScore;
      else if (sortBy === "overdue") cmp = a.overdueCount - b.overdueCount;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortHeader = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-wide"
    >
      {label}
      {sortBy === col ? (sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5" style={{ color: theme.colors.primary }} />
            Participation Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {courseCode} · {courseTitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.computedAt && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last computed {formatRelative(data.computedAt)}
            </p>
          )}
          <button
            onClick={handleRecalculate}
            disabled={recalculating || loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
            {recalculating ? "Recalculating…" : "Recalculate now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── KPI cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="animate-pulse h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active this week", value: data.kpis.activeThisWeek, icon: Users, color: "text-blue-500" },
            { label: "Avg engagement", value: `${data.kpis.avgEngagement}/100`, icon: Activity, color: "text-emerald-500" },
            { label: "High risk", value: data.kpis.highCount, icon: AlertTriangle, color: "text-red-500" },
            { label: "Medium risk", value: data.kpis.mediumCount, icon: AlertCircle, color: "text-amber-500" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] p-4">
              <kpi.icon className={`h-4 w-4 mb-2 ${kpi.color}`} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Daily active chart ── */}
      {data && data.courseDaily.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Daily active students (last 14 days)</p>
          <DailyChart data={data.courseDaily} />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{data.courseDaily[0]?.date}</span>
            <span>{data.courseDaily[data.courseDaily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": theme.colors.primary } as React.CSSProperties}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "HIGH", "MEDIUM", "LOW"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterLevel === lvl
                  ? "border-transparent text-white"
                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
              style={filterLevel === lvl ? { backgroundColor: theme.colors.primary } : {}}
            >
              {lvl === "all" ? "All" : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Student table ── */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map((i) => (
            <div key={i} className="animate-pulse h-14 rounded-xl bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] px-6 py-12 text-center">
          <Activity className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {search || filterLevel !== "all" ? "No students match your filters." : "No enrolled students yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#161B27]">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
            <SortHeader col="name" label="Student" />
            <SortHeader col="engagement" label="Engagement" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Trend</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Last active</span>
            <SortHeader col="overdue" label="Overdue" />
            <SortHeader col="risk" label="Risk" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.map((s) => (
              <div key={s.studentId}>
                <button
                  onClick={() => setExpandedId(expandedId === s.studentId ? null : s.studentId)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: theme.colors.primary }}>
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : getInitials(s.name)}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</span>
                  </div>
                  {/* Engagement */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-white/10 rounded-full h-1.5 max-w-16">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${s.engagementScore}%`, backgroundColor: theme.colors.primary }}
                      />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{s.engagementScore}</span>
                  </div>
                  {/* Trend */}
                  <div className="flex items-center"><TrendIcon trend={s.trend} /></div>
                  {/* Last active */}
                  <span className="text-sm text-slate-500 dark:text-slate-400 self-center">{formatRelative(s.lastActivityAt)}</span>
                  {/* Overdue */}
                  <span className={`text-sm self-center font-medium ${s.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {s.overdueCount > 0 ? s.overdueCount : "—"}
                  </span>
                  {/* Risk badge */}
                  <div className="self-center"><RiskBadge level={s.riskLevel} /></div>
                </button>

                {/* ── Drawer ── */}
                {expandedId === s.studentId && (
                  <div className="px-4 pb-4 bg-slate-50/50 dark:bg-white/[0.015] border-t border-slate-100 dark:border-white/5">
                    <div className="pt-4 grid md:grid-cols-3 gap-6">
                      {/* Reasons */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Risk factors</p>
                        {s.reasons.length === 0 ? (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ No risk factors identified</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {s.reasons.map((r) => (
                              <li key={r.code} className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-medium">{r.label}:</span> {r.detail}
                              </li>
                            ))}
                          </ul>
                        )}
                        <SuggestedActions reasons={s.reasons} />
                      </div>
                      {/* 14-day sparkline */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">14-day activity</p>
                        <div className="h-16 flex items-end gap-0.5">
                          {s.dailySeries.map((p) => {
                            const max = Math.max(...s.dailySeries.map((x) => x.count), 1);
                            const pct = p.count > 0 ? Math.max(8, (p.count / max) * 64) : 2;
                            return (
                              <div key={p.date} className="flex-1 flex flex-col justify-end" title={`${p.date}: ${p.count}`}>
                                <div
                                  className={`w-full rounded-t ${p.count > 0 ? "opacity-80 dark:opacity-70" : "opacity-20"}`}
                                  style={{ height: `${pct}px`, backgroundColor: theme.colors.primary }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                          <span>{s.dailySeries[0]?.date}</span>
                          <span>{s.dailySeries[s.dailySeries.length - 1]?.date}</span>
                        </div>
                      </div>
                      {/* Grade & meta */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Details</p>
                        <dl className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-slate-500 dark:text-slate-400">Grade avg</dt>
                            <dd className="font-medium text-slate-900 dark:text-white">
                              {s.gradeAvg !== null ? `${s.gradeAvg}%` : "Not graded yet"}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500 dark:text-slate-400">Overdue tasks</dt>
                            <dd className={`font-medium ${s.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                              {s.overdueCount}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500 dark:text-slate-400">Last active</dt>
                            <dd className="font-medium text-slate-900 dark:text-white">{formatRelative(s.lastActivityAt)}</dd>
                          </div>
                          {s.computedAt && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">Assessed</dt>
                              <dd className="font-medium text-slate-900 dark:text-white">{formatRelative(s.computedAt)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No-data note ── */}
      {!loading && data && data.students.length > 0 && data.students.every((s) => s.computedAt === null) && (
        <p className="text-sm text-slate-400 text-center">
          Risk scores have not been computed yet. Click &quot;Recalculate now&quot; to generate them.
        </p>
      )}
    </div>
  );
}
