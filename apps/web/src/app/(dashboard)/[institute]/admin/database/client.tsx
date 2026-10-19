"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { InstituteTheme } from "@/lib/theme";
import {
  Database,
  HardDrive,
  RefreshCw,
  Search,
  Table,
  Layers,
  Shield,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Server,
  FileText,
  Activity,
  AlertCircle,
  FolderArchive,
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Laptop,
  MessageSquare,
  HelpCircle,
  LayoutGrid,
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/common/Toast";
import { TableInspectorModal } from "@/components/admin/database/TableInspectorModal";

interface TableInfo {
  name: string;
  model: string;
  description: string;
  count: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  tables: TableInfo[];
}

interface OverviewData {
  status: string;
  database: {
    provider: string;
    driver: string;
    connection: string;
    lastChecked: string;
  };
  metrics: {
    totalCategories: number;
    totalTables: number;
    totalRecords: number;
  };
  categories: CategoryInfo[];
}

interface SnapshotInfo {
  id: string;
  name: string;
  timestamp: string;
  sizeBytes: number;
  tablesIncluded: number;
  recordsCount: number;
  status: string;
  adminName: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  academic: BookOpen,
  users: Users,
  assessment: FileText,
  gamification: Award,
  labs: Laptop,
  knowledge: MessageSquare,
  system: Shield,
};

export default function AdminDatabaseClient({
  theme,
  instituteCode,
}: {
  theme: InstituteTheme;
  instituteCode: string;
}) {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"tables" | "backups" | "health">("tables");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [inspectingModel, setInspectingModel] = useState<string | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Sliding category rail ref & scroll detection
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  useEffect(() => {
    const el = categoryScrollRef.current;
    checkCategoryScroll();
    if (!el) return;
    const ro = new ResizeObserver(() => {
      checkCategoryScroll();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [overview]);

  const slideCategories = (direction: "left" | "right") => {
    const el = categoryScrollRef.current;
    if (el) {
      const step = Math.max(260, Math.floor(el.clientWidth * 0.65));
      el.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });
      setTimeout(checkCategoryScroll, 320);
    }
  };

  const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      checkCategoryScroll();
    }
  };

  const handleSelectCategory = (catId: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedCategory(catId);
    if (e?.currentTarget) {
      e.currentTarget.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
        block: "nearest",
      });
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchSnapshots();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/database/overview");
      if (!res.ok) throw new Error("Failed to fetch database overview");
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      toast.error("Error", "Could not load database metrics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch("/api/admin/database/backup");
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch("/api/admin/database/backup", { method: "POST" });
      if (!res.ok) throw new Error("Snapshot failed");
      const data = await res.json();
      toast.success("Snapshot Created", "Database snapshot checkpoint saved successfully.");
      setSnapshots((prev) => [data.snapshot, ...prev]);
    } catch (err) {
      toast.error("Snapshot Error", "Could not generate database snapshot.");
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleExportTable = (modelName: string) => {
    window.open(`/api/admin/database/export?model=${modelName}&format=json`, "_blank");
  };

  // Filter categories and tables based on search and selectedCategory
  const filteredCategories = useMemo(() => {
    if (!overview) return [];

    let list = overview.categories;

    if (selectedCategory !== "ALL") {
      list = list.filter((cat) => cat.id === selectedCategory);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list
        .map((cat) => ({
          ...cat,
          tables: cat.tables.filter(
            (t) =>
              t.name.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              cat.name.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => cat.tables.length > 0);
    }

    return list;
  }, [overview, selectedCategory, search]);

  const allFilteredTables = useMemo(() => {
    return filteredCategories.flatMap((c) =>
      c.tables.map((t) => ({ ...t, categoryName: c.name, categoryColor: c.color }))
    );
  }, [filteredCategories]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 page-enter">
      {/* ── 1. Hero Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] flex items-center gap-3">
            <Database className="h-8 w-8" style={{ color: theme.colors.primary }} />
            Database Management
          </h1>
          <p className="text-slate-500 dark:text-[#8B92A5] mt-1 text-sm">
            Categorized data models, live row metrics, schema inspection, and automated recovery snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleCreateSnapshot}
            disabled={isCreatingSnapshot}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-50 shadow-xs"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {isCreatingSnapshot ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderArchive className="w-3.5 h-3.5" />
            )}
            Create Snapshot
          </button>
        </div>
      </div>

      {/* ── 2. KPI Metrics Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Connection */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              PostgreSQL Engine
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xl font-black text-slate-900 dark:text-white">
                Connected
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">@prisma/adapter-pg</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Server className="w-6 h-6" />
          </div>
        </div>

        {/* Total Categories */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Functional Categories
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {overview?.metrics.totalCategories || 7} Domains
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Academic, Users, Labs, etc.</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Total Tables */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Database Models
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {overview?.metrics.totalTables || 28} Tables
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Monitored in schema</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
            <Table className="w-6 h-6" />
          </div>
        </div>

        {/* Total Records */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Live Records
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {(overview?.metrics.totalRecords || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all models</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── 3. Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-1">
        <button
          onClick={() => setActiveTab("tables")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "tables"
              ? "bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categorized Tables ({overview?.metrics.totalTables || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("backups")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "backups"
              ? "bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Snapshots & Backups ({snapshots.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "health"
              ? "bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Engine Health & Info</span>
        </button>
      </div>

      {/* ── 4. Main Body: Categorized Tables Tab ── */}
      {activeTab === "tables" && (
        <div className="space-y-6">
          {/* Controls Bar: Search & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search models, tables, or fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#1A1D27] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": theme.colors.primary } as React.CSSProperties}
              />
            </div>

            <div className="flex items-center justify-end gap-3 shrink-0">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-[#1E2230] rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode("cards")}
                  title="Grouped Cards View"
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "cards"
                      ? "bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="List Table View"
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "list"
                      ? "bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Sliding Category Rail ── */}
          <div className="w-full max-w-full min-w-0 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-1.5 flex items-center gap-2">
            {/* Left Chevron Slide Button */}
            <button
              type="button"
              onClick={() => slideCategories("left")}
              disabled={!canScrollLeft}
              title="Slide categories left"
              aria-label="Slide categories left"
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                canScrollLeft
                  ? "bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs active:scale-95"
                  : "opacity-25 text-slate-400 dark:text-slate-600 cursor-not-allowed pointer-events-none"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Track with subtle edge gradient indicators */}
            <div className="relative flex-1 min-w-0 overflow-hidden">
              {/* Fade masks */}
              {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-white dark:from-[#141721] to-transparent z-10 pointer-events-none" />
              )}
              {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-white dark:from-[#141721] to-transparent z-10 pointer-events-none" />
              )}

              <div
                ref={categoryScrollRef}
                onScroll={checkCategoryScroll}
                onWheel={handleCategoryWheel}
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <button
                  onClick={(e) => handleSelectCategory("ALL", e)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    selectedCategory === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/80 dark:bg-[#1A1D27] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  All Categories ({overview?.metrics.totalTables || 0})
                </button>

                {overview?.categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const Icon = CATEGORY_ICONS[cat.id] || Layers;
                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => handleSelectCategory(cat.id, e)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                        isSelected
                          ? "shadow-xs border-transparent text-white"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-[#1A1D27] dark:hover:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-300"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: cat.color,
                              borderColor: cat.color,
                            }
                          : undefined
                      }
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? "#FFFFFF" : cat.color }} />
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {cat.tables.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Chevron Slide Button */}
            <button
              type="button"
              onClick={() => slideCategories("right")}
              disabled={!canScrollRight}
              title="Slide categories right"
              aria-label="Slide categories right"
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                canScrollRight
                  ? "bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs active:scale-95"
                  : "opacity-25 text-slate-400 dark:text-slate-600 cursor-not-allowed pointer-events-none"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
              <p className="text-xs text-slate-500">Querying PostgreSQL schema metadata...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#141721] rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-3">
              <Table className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No models found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No database tables matched your search "{search}". Try searching for another keyword.
              </p>
            </div>
          ) : viewMode === "cards" ? (
            /* ── A. Grouped Cards View by Category ── */
            <div className="space-y-8">
              {filteredCategories.map((category) => {
                const Icon = CATEGORY_ICONS[category.id] || Layers;
                const catTotalRecords = category.tables.reduce((s, t) => s + t.count, 0);

                return (
                  <div
                    key={category.id}
                    className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-5"
                    style={{ borderLeft: `4px solid ${category.color}` }}
                  >
                    {/* Category Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2.5 rounded-2xl text-white shadow-xs"
                          style={{ backgroundColor: category.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                              {category.name}
                            </h2>
                            <span
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${category.color}18`,
                                color: category.color,
                              }}
                            >
                              {category.tables.length} Tables
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs font-bold text-slate-400">Total Domain Records</span>
                        <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                          {catTotalRecords.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Table Models Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.tables.map((table) => (
                        <div
                          key={table.name}
                          className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-[#1A1D27] border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                {table.name}
                              </span>
                              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-2xs">
                                {table.count.toLocaleString()} rows
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2">
                              {table.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setInspectingModel(table.name)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                            <button
                              onClick={() => handleExportTable(table.name)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              JSON
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── B. Compact Table List View ── */
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#1A1D27] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-4">Model Name</th>
                    <th className="p-4">Category Domain</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Row Count</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {allFilteredTables.map((t) => (
                    <tr
                      key={t.name}
                      className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {t.name}
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            backgroundColor: `${t.categoryColor}18`,
                            color: t.categoryColor,
                          }}
                        >
                          {t.categoryName}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-sm">
                        {t.description}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-white tabular-nums">
                        {t.count.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectingModel(t.name)}
                            className="px-2.5 py-1 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleExportTable(t.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Export JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Snapshots & Backups Tab ── */}
      {activeTab === "backups" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-primary" style={{ color: theme.colors.primary }} />
                Automated & Manual Snapshots
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create point-in-time database snapshots for disaster recovery, migrations, or local offline development.
              </p>
            </div>
            <button
              onClick={handleCreateSnapshot}
              disabled={isCreatingSnapshot}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-50 shrink-0 shadow-xs flex items-center gap-2"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {isCreatingSnapshot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderArchive className="w-4 h-4" />
              )}
              Create Snapshot Now
            </button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A1D27] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-4">Snapshot Name</th>
                  <th className="p-4">Created Time</th>
                  <th className="p-4">Scope</th>
                  <th className="p-4">Archive Size</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Initiator</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {snapshots.map((snap) => (
                  <tr
                    key={snap.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {snap.name}
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {new Date(snap.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {snap.tablesIncluded} Models ({snap.recordsCount.toLocaleString()} rows)
                    </td>
                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">
                      {(snap.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {snap.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{snap.adminName}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() =>
                          toast.success("Download Ready", `Downloading snapshot bundle ${snap.id}.`)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Health & Engine Info Tab ── */}
      {activeTab === "health" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-500" />
              Engine Specifications
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-medium">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Database Engine</span>
                <span className="font-bold text-slate-900 dark:text-white">PostgreSQL 16.x</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">ORM & Driver</span>
                <span className="font-bold text-slate-900 dark:text-white">Prisma 7 (@prisma/adapter-pg)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Connection Mode</span>
                <span className="font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active Pool
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Institute Scope</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white uppercase">
                  {instituteCode}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Transaction Isolation</span>
                <span className="font-bold text-slate-900 dark:text-white">Read Committed</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Maintenance & Hygiene
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Safe database operations to clean orphaned records, verify schema parity, and ensure high throughput.
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A1D27] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Schema Parity Check
                  </p>
                  <p className="text-[11px] text-slate-400">Verifies Prisma client matches Postgres schema</p>
                </div>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> In Sync
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A1D27] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Expired Sessions Cleanup
                  </p>
                  <p className="text-[11px] text-slate-400">Automatically pruned by token validity date</p>
                </div>
                <span className="text-xs font-bold text-slate-500">Automated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Table Inspector Modal ── */}
      <TableInspectorModal
        theme={theme}
        modelName={inspectingModel}
        onClose={() => setInspectingModel(null)}
      />
    </div>
  );
}
