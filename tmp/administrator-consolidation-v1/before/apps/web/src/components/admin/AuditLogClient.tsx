"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserX,
  UserCheck,
  KeyRound,
  Settings,
  Upload,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { AuditLogEntry, PaginatedResponse } from "@/lib/admin-types";

interface AuditLogClientProps {
  theme: InstituteTheme;
}

const ACTION_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  ACCOUNT_CREATED: { icon: UserCheck, color: "#10B981" },
  ACCOUNT_UPDATED: { icon: Settings, color: "#6366F1" },
  ACCOUNT_DELETED: { icon: UserX, color: "#EF4444" },
  ACCOUNT_SUSPENSION: { icon: UserX, color: "#EF4444" },
  ACCOUNT_REACTIVATION: { icon: UserCheck, color: "#10B981" },
  ROLE_CHANGE: { icon: Shield, color: "#F59E0B" },
  PASSWORD_RESET: { icon: KeyRound, color: "#8B5CF6" },
  PERMISSION_CHANGE: { icon: Shield, color: "#3B82F6" },
  BULK_IMPORT: { icon: Upload, color: "#06B6D4" },
  PERMISSION_MATRIX_UPDATE: { icon: Shield, color: "#3B82F6" },
};

function getActionDisplay(action: string) {
  // Match action prefixes (e.g., ROLE_CHANGE_TO_INSTRUCTOR matches ROLE_CHANGE)
  for (const [key, value] of Object.entries(ACTION_ICONS)) {
    if (action.startsWith(key)) return value;
  }
  return { icon: FileText, color: "#6B7280" };
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogClient({ theme }: AuditLogClientProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");

      const data: PaginatedResponse<AuditLogEntry> = await res.json();
      setLogs(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Audit Log</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8B92A5]">
          Immutable ledger of all administrative actions. This log cannot be modified or deleted.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none"
        >
          <option value="">All Actions</option>
          <option value="ACCOUNT_CREATED">Account Created</option>
          <option value="ACCOUNT_UPDATED">Account Updated</option>
          <option value="ACCOUNT_SUSPENSION">Suspension</option>
          <option value="ACCOUNT_REACTIVATION">Reactivation</option>
          <option value="ROLE_CHANGE">Role Change</option>
          <option value="PASSWORD_RESET">Password Reset</option>
          <option value="BULK_IMPORT">Bulk Import</option>
          <option value="PERMISSION_MATRIX">Permission Matrix</option>
        </select>

        <span className="text-xs text-slate-400 dark:text-[#8B92A5]">{total} entries</span>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 border-b border-slate-100 dark:border-white/5 px-6 py-4">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-50 dark:bg-white/[0.02]" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No audit entries found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {logs.map((log) => {
              const display = getActionDisplay(log.action);
              const Icon = display.icon;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                >
                  {/* Icon */}
                  <div
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${display.color}15`, color: display.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">
                        {formatActionLabel(log.action)}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-[#8B92A5]">
                        by <span className="font-semibold text-slate-700 dark:text-[#F0F2F8]">{log.adminName ?? "System"}</span>
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-[#8B92A5]">
                      <span>
                        Target: <span className="font-semibold text-slate-700 dark:text-[#F0F2F8]">{log.targetName ?? log.targetId}</span>
                      </span>
                      {log.ipAddress && log.ipAddress !== "" && (
                        <span className="rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-[#8B92A5]">
                          {log.ipAddress}
                        </span>
                      )}
                    </div>

                    {/* Metadata preview */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 rounded-xl bg-slate-50 dark:bg-[#1E2132] border border-slate-200/50 dark:border-white/5 px-3 py-2 font-mono text-[10px] text-slate-600 dark:text-[#8B92A5] max-w-full overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 0).slice(0, 200)}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-[#8B92A5]">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-600">
                      {new Date(log.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 px-6 py-3 bg-slate-50/30 dark:bg-white/[0.01]">
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] px-4 py-3 text-xs text-slate-500 dark:text-[#8B92A5]">
        This audit log is an immutable ledger. Entries cannot be edited or deleted. All timestamps are in UTC.
      </div>
    </div>
  );
}
