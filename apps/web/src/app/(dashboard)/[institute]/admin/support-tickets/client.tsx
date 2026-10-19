"use client";

import { useEffect, useState, useMemo } from "react";
import type { InstituteTheme } from "@/lib/theme";
import { 
  LifeBuoy, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Search, 
  AlertCircle, 
  Inbox, 
  LayoutGrid, 
  List, 
  MessageSquare, 
  Send, 
  User, 
  Tag, 
  RefreshCw,
  Sparkles,
  Pencil,
  X,
  Check,
  Shield,
  Laptop,
  GraduationCap,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { toast } from "@/components/common/Toast";
import { ReplyTicketModal } from "@/components/support/ReplyTicketModal";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
  adminReply: string | null;
  repliedAt: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

type ViewMode = "list" | "board";

const STATUS_CATEGORIES = [
  { key: "ALL", label: "All Tickets", icon: Inbox, color: "#64748B", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  { key: "OPEN", label: "Open", icon: AlertCircle, color: "#F59E0B", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { key: "RESOLVED", label: "Resolved", icon: CheckCircle2, color: "#10B981", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
] as const;

const TOPIC_ICONS: Record<string, any> = {
  TECHNICAL: Laptop,
  ACCOUNT: Shield,
  COURSE: GraduationCap,
  GENERAL: HelpCircle,
  OTHER: Tag,
};

export default function SupportTicketsClient({ theme, instituteCode }: { theme: InstituteTheme; instituteCode: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [topicFilter, setTopicFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyModalTicket, setReplyModalTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support-tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      toast.error("Error", "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  const isTicketOpen = (status: string) => status !== "RESOLVED" && status !== "CLOSED";

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      const statusLabels: Record<string, string> = {
        OPEN: "Ticket reopened to Open",
        RESOLVED: "Ticket marked as Resolved",
      };
      toast.success("Updated", statusLabels[newStatus] || "Ticket status updated.");
      
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { 
          ...t, 
          status: newStatus, 
          resolvedAt: newStatus === "RESOLVED" ? new Date().toISOString() : null,
        } : t))
      );
      if (replyModalTicket?.id === id) {
        setReplyModalTicket(null);
      }
    } catch (err) {
      toast.error("Error", "Could not update ticket.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveReply = async (id: string, text: string, alsoResolve = false) => {
    if (!text?.trim()) return;
    setUpdatingId(id);
    try {
      const payload: any = { id, adminReply: text };
      if (alsoResolve) {
        payload.status = "RESOLVED";
      }

      const res = await fetch("/api/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save reply");
      
      toast.success(
        alsoResolve ? "Replied & Resolved" : "Reply Sent", 
        alsoResolve ? "Your response was sent and ticket is resolved." : "Your response was sent to the user."
      );
      
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { 
          ...t, 
          adminReply: text, 
          repliedAt: new Date().toISOString(),
          ...(alsoResolve ? { status: "RESOLVED", resolvedAt: new Date().toISOString() } : {})
        } : t))
      );
      setReplyModalTicket(null);
    } catch (err) {
      toast.error("Error", "Could not send response.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateCategory = async (id: string, newCategory: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, category: newCategory }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      
      toast.success("Category Updated", `Changed category to ${newCategory}`);
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t))
      );
    } catch (err) {
      toast.error("Error", "Could not update category.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Status Category counts (All, Open, Resolved)
  const counts = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => isTicketOpen(t.status)).length;
    const resolved = tickets.filter(t => !isTicketOpen(t.status)).length;
    return {
      ALL: total,
      OPEN: open,
      RESOLVED: resolved,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const isOpen = isTicketOpen(t.status);
      if (statusFilter === "OPEN" && !isOpen) return false;
      if (statusFilter === "RESOLVED" && isOpen) return false;
      if (topicFilter !== "ALL" && (t.category || "GENERAL") !== topicFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchSubject = t.subject.toLowerCase().includes(query);
        const matchAuthor = t.author?.name?.toLowerCase().includes(query);
        const matchEmail = t.author?.email?.toLowerCase().includes(query);
        const matchMsg = t.message.toLowerCase().includes(query);
        if (!matchSubject && !matchAuthor && !matchEmail && !matchMsg) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, topicFilter, search]);

  const openTickets = useMemo(() => filteredTickets.filter(t => isTicketOpen(t.status)), [filteredTickets]);
  const resolvedTickets = useMemo(() => filteredTickets.filter(t => !isTicketOpen(t.status)), [filteredTickets]);

  const getStatusBadge = (status: string) => {
    const open = isTicketOpen(status);
    if (open) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Open
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        Resolved
      </span>
    );
  };

  const getTopicSelector = (ticket: Ticket, isUpdating: boolean) => {
    const key = (ticket.category || "GENERAL").toUpperCase();
    const Icon = TOPIC_ICONS[key] || Tag;
    return (
      <div className="relative inline-flex items-center">
        <select
          value={key}
          onChange={(e) => handleUpdateCategory(ticket.id, e.target.value)}
          disabled={isUpdating}
          className="appearance-none text-[11px] font-bold bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 pl-6 pr-5 py-1 rounded-lg border border-slate-200/60 dark:border-white/10 outline-none cursor-pointer transition-colors"
          title="Click to change category"
        >
          <option value="GENERAL">General</option>
          <option value="TECHNICAL">Technical</option>
          <option value="ACCOUNT">Account</option>
          <option value="COURSE">Course</option>
          <option value="OTHER">Other</option>
        </select>
        <Icon className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
      </div>
    );
  };

  const renderTicketCard = (ticket: Ticket) => {
    const isUpdating = updatingId === ticket.id;
    const isOpen = isTicketOpen(ticket.status);
    const hasReply = !!ticket.adminReply;

    return (
      <div 
        key={ticket.id} 
        className="group p-5 sm:p-6 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:border-slate-300 dark:hover:border-white/15 transition-all space-y-4"
      >
        {/* 1. Header: Status badge, Category selector, Timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getStatusBadge(ticket.status)}
            {getTopicSelector(ticket, isUpdating)}
          </div>
          
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date(ticket.createdAt).toLocaleString(undefined, { 
              month: "short", 
              day: "numeric", 
              year: "numeric",
              hour: "numeric", 
              minute: "2-digit" 
            })}
          </span>
        </div>

        {/* 2. Subject & User Message */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {ticket.subject}
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181B26] border border-slate-100 dark:border-white/5">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-[#C5CEE0] whitespace-pre-wrap leading-relaxed">
              {ticket.message}
            </p>
          </div>
        </div>

        {/* 3. Author Row */}
        <div className="flex items-center gap-2.5">
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white shadow-xs"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {ticket.author?.name ? ticket.author.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              {ticket.author?.name || "Unknown User"}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 uppercase tracking-wider">
              {ticket.author?.role || "USER"}
            </span>
            {ticket.author?.email && (
              <span className="text-xs text-slate-400 truncate">
                • {ticket.author.email}
              </span>
            )}
          </div>
        </div>

        {/* 4. Sent Admin Reply Callout (if already replied) */}
        {hasReply && (
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Admin Reply
                </span>
                {ticket.repliedAt && (
                  <span className="text-[10px] text-indigo-400">
                    • {new Date(ticket.repliedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReplyModalTicket(ticket)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                Edit Reply
              </button>
            </div>
            <p className="text-xs text-indigo-950 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed">
              {ticket.adminReply}
            </p>
          </div>
        )}

        {/* 5. Footer Action Bar - Clean 2 buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-medium text-slate-400">
            {!isOpen && ticket.resolvedAt ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolved on {new Date(ticket.resolvedAt).toLocaleDateString()}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Awaiting response
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOpen ? (
              <>
                <button
                  type="button"
                  onClick={() => setReplyModalTicket(ticket)}
                  disabled={isUpdating}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reply
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(ticket.id, "RESOLVED")}
                  disabled={isUpdating}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Mark Resolved
                </button>
              </>
            ) : (
              <>
                {!hasReply && (
                  <button
                    type="button"
                    onClick={() => setReplyModalTicket(ticket)}
                    disabled={isUpdating}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Add Note
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(ticket.id, "OPEN")}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  Re-open
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7 page-enter">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2"
            style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.primary }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Institute Helpdesk Governance</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-rose-500" />
            Support Tickets
          </h1>
          <p className="text-slate-500 dark:text-[#8B92A5] mt-1 text-sm">
            Categorized issue triage, user feedback channels, and resolution tracking.
          </p>
        </div>

        <button 
          onClick={fetchTickets}
          disabled={loading}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 transition-all shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── 2. Category Metrics Summary (All, Open, Resolved) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {STATUS_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = counts[cat.key as keyof typeof counts] || 0;
          const isSelected = statusFilter === cat.key;

          return (
            <button
              key={cat.key}
              onClick={() => setStatusFilter(cat.key)}
              className={`text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${
                isSelected
                  ? "bg-white dark:bg-[#1A1D27] shadow-md ring-2"
                  : "bg-white/80 dark:bg-[#141721] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15"
              }`}
              style={{
                borderColor: isSelected ? cat.color : undefined,
                boxShadow: isSelected ? `0 4px 20px -2px ${cat.color}20` : undefined,
                ...(isSelected ? { '--tw-ring-color': cat.color } as React.CSSProperties : {})
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`p-2.5 rounded-xl ${cat.bg}`}>
                  <Icon className="w-5 h-5" />
                </span>
                {isSelected && (
                  <span 
                    className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    Active
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {count}
              </p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
                {cat.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── 3. Controls & Filter Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2 sm:p-3 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs">
        {/* Category Status Tabs (All, Open, Resolved) */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1.5 p-1 bg-slate-100 dark:bg-[#1E2230] rounded-xl shrink-0">
          {STATUS_CATEGORIES.map((cat) => {
            const count = counts[cat.key as keyof typeof counts] || 0;
            const isSelected = statusFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setStatusFilter(cat.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isSelected ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white" : "bg-slate-200/80 text-slate-600 dark:bg-white/5 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right side: Search, Topic filter dropdown, and List/Board toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subject, user or text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1A1D27] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
            />
          </div>

          {/* Topic filter dropdown */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#1A1D27] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 cursor-pointer"
            style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
          >
            <option value="ALL">All Topics</option>
            <option value="GENERAL">General</option>
            <option value="TECHNICAL">Technical</option>
            <option value="ACCOUNT">Account</option>
            <option value="COURSE">Course</option>
            <option value="OTHER">Other</option>
          </select>

          {/* View mode toggle (List vs Board) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#1E2230] rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              title="Category Board View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "board"
                  ? "bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Main Content: List or Board View ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200 dark:border-white/5">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading institute support tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#141721] rounded-3xl border border-slate-200 dark:border-white/5 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {statusFilter === "ALL" ? "No Tickets Found" : `No ${statusFilter === "OPEN" ? "Open" : "Resolved"} Tickets`}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {search ? `No tickets match "${search}". Try adjusting your filters.` : "All inquiries in this category have been attended to!"}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* ── List Layout ── */
        <div className="space-y-4">
          {filteredTickets.map((ticket) => renderTicketCard(ticket))}
        </div>
      ) : (
        /* ── Board Layout (2 Columns: OPEN vs RESOLVED) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Column: OPEN */}
          <div className="space-y-4 bg-slate-50/50 dark:bg-[#10131c] p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Open Tickets</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {openTickets.length}
              </span>
            </div>
            {openTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center italic">No open tickets</p>
            ) : (
              <div className="space-y-3">
                {openTickets.map((ticket) => renderTicketCard(ticket))}
              </div>
            )}
          </div>

          {/* Column: RESOLVED */}
          <div className="space-y-4 bg-slate-50/50 dark:bg-[#10131c] p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Resolved Tickets</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {resolvedTickets.length}
              </span>
            </div>
            {resolvedTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center italic">No resolved tickets</p>
            ) : (
              <div className="space-y-3">
                {resolvedTickets.map((ticket) => renderTicketCard(ticket))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Centered Reply Modal ── */}
      <ReplyTicketModal
        isOpen={!!replyModalTicket}
        onClose={() => setReplyModalTicket(null)}
        ticket={replyModalTicket}
        theme={theme}
        onSaveReply={handleSaveReply}
        isUpdating={!!updatingId}
      />
    </div>
  );
}
