"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  KeyRound,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Globe,
  Monitor,
  Check,
  Info,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { UserRole } from "@/lib/admin-types";

interface SecurityToolsClientProps {
  theme: InstituteTheme;
  instituteCode: string;
}

interface SecurityOverview {
  instituteCode: string;
  activeSessionsCount: number;
  suspendedAccountsCount: number;
  totalUsersCount: number;
  pinProtectedUsersCount: number;
  pinAdoptionRate: number;
  recentSecurityEventsCount: number;
}

interface SecurityPolicies {
  sessionIdleTimeoutMinutes: number;
  sessionAbsoluteExpiryDays: number;
  sessionTouchIntervalMinutes: number;
  rateLimits: {
    loginAccountMax: number;
    loginAccountWindowMinutes: number;
    loginIpMax: number;
    loginIpWindowMinutes: number;
    passwordResetMax: number;
    passwordResetWindowMinutes: number;
    fileUploadMax: number;
    fileUploadWindowMinutes: number;
  };
}

interface ActiveSessionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  userIsActive: boolean;
  hasSecurityPin: boolean;
  instituteCode: string;
  instituteName: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrentSession: boolean;
  isIdle: boolean;
}

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName?: string;
  targetId: string;
  targetName?: string;
  action: string;
  ipAddress: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AccountSearchResult {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  activationStatus?: string;
}

export default function SecurityToolsClient({ theme, instituteCode }: SecurityToolsClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "accounts" | "audit" | "policies">("overview");

  // Notification state
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Overview data
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [policies, setPolicies] = useState<SecurityPolicies | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("all");

  // Account search state
  const [accountQuery, setAccountQuery] = useState("");
  const [accountResults, setAccountResults] = useState<AccountSearchResult[]>([]);
  const [accountSearchLoading, setAccountSearchLoading] = useState(false);

  // Security audit trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Modals state
  const [singleRevokeSession, setSingleRevokeSession] = useState<ActiveSessionItem | null>(null);
  const [userRevokeTarget, setUserRevokeTarget] = useState<{ userId: string; userName: string; email: string } | null>(null);
  const [showInstituteRevokeModal, setShowInstituteRevokeModal] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [statusTarget, setStatusTarget] = useState<{ id: string; name: string; email: string; isActive: boolean } | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Auto-dismiss notifications after 6 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await fetch(`/api/admin/security/overview?institute=${encodeURIComponent(instituteCode)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load security overview.");
      }
      const data = await res.json();
      setOverview(data.overview);
      setPolicies(data.policies);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Error fetching security metrics.");
    } finally {
      setOverviewLoading(false);
    }
  }, [instituteCode]);

  // Fetch Active Sessions
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const params = new URLSearchParams({
        page: sessionPage.toString(),
        pageSize: "15",
        institute: instituteCode,
      });
      if (sessionSearch) params.set("search", sessionSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/security/sessions?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load sessions.");
      }
      const data = await res.json();
      setSessions(data.data || []);
      setSessionTotal(data.total || 0);
      setSessionTotalPages(data.totalPages || 1);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Error fetching sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionPage, sessionSearch, roleFilter, statusFilter, instituteCode]);

  // Fetch Security Audit Logs
  const fetchSecurityAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?pageSize=25`);
      if (res.ok) {
        const data = await res.json();
        const securityActions = [
          "ACCOUNT_SUSPENSION",
          "ACCOUNT_REACTIVATION",
          "PASSWORD_RESET",
          "SESSION_REVOCATION",
          "ROLE_CHANGE",
          "PERMISSION_CHANGE",
        ];
        const filtered = (data.data || []).filter((l: AuditLogEntry) =>
          securityActions.some((prefix) => l.action.startsWith(prefix))
        );
        setAuditLogs(filtered);
      }
    } catch {
      // Non-blocking
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "sessions") {
      fetchSessions();
    } else if (activeTab === "audit") {
      fetchSecurityAudit();
    }
  }, [activeTab, fetchSessions, fetchSecurityAudit]);

  // Handle Account Search
  const searchAccounts = async (query: string) => {
    setAccountQuery(query);
    if (!query.trim() || query.length < 2) {
      setAccountResults([]);
      return;
    }
    setAccountSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&pageSize=10`);
      if (res.ok) {
        const data = await res.json();
        setAccountResults(data.data || []);
      }
    } catch {
      // non-blocking
    } finally {
      setAccountSearchLoading(false);
    }
  };

  // Revoke Single Session Action
  const handleRevokeSingle = async () => {
    if (!singleRevokeSession) return;
    setActionInProgress(true);
    try {
      const res = await fetch("/api/admin/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: singleRevokeSession.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke session.");

      setNotification({ type: "success", message: "Session revoked successfully." });
      setSingleRevokeSession(null);
      fetchSessions();
      fetchOverview();
    } catch (err) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Error revoking session." });
    } finally {
      setActionInProgress(false);
    }
  };

  // Revoke All User Sessions Action
  const handleRevokeUserSessions = async () => {
    if (!userRevokeTarget) return;
    setActionInProgress(true);
    try {
      const res = await fetch("/api/admin/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userRevokeTarget.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke user sessions.");

      setNotification({ type: "success", message: data.message || "All user sessions revoked." });
      setUserRevokeTarget(null);
      fetchSessions();
      fetchOverview();
    } catch (err) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Error revoking user sessions." });
    } finally {
      setActionInProgress(false);
    }
  };

  // Emergency Revoke All Institute Sessions Action
  const handleInstituteWideRevoke = async () => {
    if (typedConfirmation.trim().toUpperCase() !== "REVOKE ALL") {
      setNotification({ type: "error", message: 'Please type "REVOKE ALL" exactly to confirm.' });
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch("/api/admin/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteWide: true,
          confirmation: typedConfirmation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke all institute sessions.");

      setNotification({ type: "success", message: data.message || "All institute sessions terminated." });
      setShowInstituteRevokeModal(false);
      setTypedConfirmation("");
      fetchSessions();
      fetchOverview();
    } catch (err) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Error during emergency lockout." });
    } finally {
      setActionInProgress(false);
    }
  };

  // Suspend or Reactivate Account Action
  const handleToggleAccountStatus = async () => {
    if (!statusTarget) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(statusTarget.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !statusTarget.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update account status.");

      setNotification({ type: "success", message: data.message });
      setStatusTarget(null);
      fetchOverview();
      if (accountQuery) searchAccounts(accountQuery);
      if (activeTab === "sessions") fetchSessions();
    } catch (err) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Failed to change status." });
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl text-white shadow-sm"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Security Tools
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor security threats, inspect active sessions, and enforce institute access control for {theme.name}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchOverview();
              if (activeTab === "sessions") fetchSessions();
              if (activeTab === "audit") fetchSecurityAudit();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 shadow-sm transition"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            Refresh
          </button>
          <button
            onClick={() => setShowInstituteRevokeModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency Lockout
          </button>
        </div>
      </div>

      {/* ─── Notification Banner ─── */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 shadow-sm border ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Navigation Tabs ─── */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 space-x-1 sm:space-x-4">
        {[
          { id: "overview", label: "Overview & Threats", icon: ShieldCheck },
          { id: "sessions", label: "Active Sessions", icon: Clock },
          { id: "accounts", label: "Account Access & Lock", icon: Users },
          { id: "audit", label: "Security Audit Trail", icon: FileText },
          { id: "policies", label: "Security Policies & Limits", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 px-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                isActive
                  ? "border-current text-gray-900 dark:text-white font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              style={{ color: isActive ? theme.colors.primary : undefined }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "sessions" && sessionTotal > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {sessionTotal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW & THREATS ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {overviewLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              ))}
            </div>
          ) : overviewError ? (
            <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-center text-red-600 dark:text-red-400">
              <p className="font-semibold">Unable to load security metrics</p>
              <p className="text-sm mt-1">{overviewError}</p>
            </div>
          ) : overview ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Active Sessions
                    </span>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {overview.activeSessionsCount}
                    </span>
                    <span className="text-xs text-gray-500">logged in now</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Suspended Accounts
                    </span>
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {overview.suspendedAccountsCount}
                    </span>
                    <span className="text-xs text-gray-500">accounts locked</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Security PIN Adoption
                    </span>
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {overview.pinAdoptionRate}%
                    </span>
                    <span className="text-xs text-gray-500">
                      ({overview.pinProtectedUsersCount}/{overview.totalUsersCount} users)
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Security Events (7d)
                    </span>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {overview.recentSecurityEventsCount}
                    </span>
                    <span className="text-xs text-gray-500">logged actions</span>
                  </div>
                </div>
              </div>

              {/* Status and Diagnostics Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      Institute Security Posture & Safeguards
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Operational
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    This institute console continuously enforces server-side role boundaries, dual sliding-window
                    rate limits against bruteforce attacks, and immutable audit logs. All admin mutations are
                    strictly scoped to <strong>{theme.name}</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Session Idle Window</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {policies?.sessionIdleTimeoutMinutes ?? 30} minutes
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Auto-expires sessions when inactive</div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Anti-Bruteforce Lockout</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {policies?.rateLimits.loginAccountMax ?? 5} attempts / {policies?.rateLimits.loginAccountWindowMinutes ?? 15}m
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Persistent database-backed limit</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm space-y-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-500" />
                    Quick Actions
                  </h2>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("sessions")}
                      className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-between"
                    >
                      <span>Review Active Sessions</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => setActiveTab("accounts")}
                      className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-between"
                    >
                      <span>Manage Suspended Accounts</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => setActiveTab("audit")}
                      className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-between"
                    >
                      <span>Inspect Security Audit Log</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ─── TAB 2: ACTIVE SESSIONS ─── */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="flex flex-1 w-full md:w-auto items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name or email..."
                  value={sessionSearch}
                  onChange={(e) => {
                    setSessionSearch(e.target.value);
                    setSessionPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setSessionPage(1);
                }}
                className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="INSTRUCTOR">Instructors</option>
                <option value="ADMIN">Admins</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSessionPage(1);
                }}
                className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white"
              >
                <option value="all">Active & Idle</option>
                <option value="active">Active Only</option>
                <option value="idle">Idle Only</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 self-end md:self-center">
              Total Active Sessions: <strong>{sessionTotal}</strong>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {sessionsLoading ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                Loading active sessions...
              </div>
            ) : sessionsError ? (
              <div className="p-8 text-center text-red-600 dark:text-red-400">
                <p className="font-semibold">{sessionsError}</p>
                <button
                  onClick={fetchSessions}
                  className="mt-3 text-xs underline font-medium text-red-700 dark:text-red-300"
                >
                  Retry Loading
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700 dark:text-gray-300">No matching active sessions</p>
                <p className="text-xs text-gray-400 mt-1">There are no currently active sessions matching the filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Device</th>
                      <th className="py-3 px-4">Last Seen</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            {s.userName}
                            {s.isCurrentSession && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{s.userEmail}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              s.userRole === "ADMIN"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                : s.userRole === "INSTRUCTOR"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                            }`}
                          >
                            {s.userRole}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {s.isIdle ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                              Idle
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                          {s.ipAddress}
                        </td>

                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={s.userAgent}>
                          {s.userAgent.slice(0, 45)}
                        </td>

                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(s.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() =>
                              setUserRevokeTarget({
                                userId: s.userId,
                                userName: s.userName,
                                email: s.userEmail,
                              })
                            }
                            disabled={s.isCurrentSession}
                            className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Revoke all active sessions for this user"
                          >
                            All User
                          </button>
                          <button
                            onClick={() => setSingleRevokeSession(s)}
                            disabled={s.isCurrentSession}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded border border-red-200 dark:border-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Revoke this specific session"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {sessionTotalPages > 1 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {sessionPage} of {sessionTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                    disabled={sessionPage <= 1}
                    className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))}
                    disabled={sessionPage >= sessionTotalPages}
                    className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: ACCOUNT ACCESS & SUSPENSION ─── */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Account Access & Suspension Control
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Lookup any user in {theme.name} to inspect security status or execute an immediate account suspension.
                Suspending an account automatically purges all of its active sessions.
              </p>
            </div>

            <div className="relative max-w-lg">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user name or email in your institute..."
                value={accountQuery}
                onChange={(e) => searchAccounts(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            {accountSearchLoading ? (
              <div className="p-6 text-center text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
                Searching accounts...
              </div>
            ) : accountResults.length > 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Name & Email</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Access Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {accountResults.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.isActive ? (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                              Suspended
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              setStatusTarget({
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                isActive: u.isActive,
                              })
                            }
                            className={`px-3 py-1 text-xs font-medium rounded border transition ${
                              u.isActive
                                ? "text-red-600 dark:text-red-400 border-red-300 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            }`}
                          >
                            {u.isActive ? "Suspend Access" : "Reactivate Access"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : accountQuery.length >= 2 ? (
              <p className="text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-center">
                No accounts found matching "{accountQuery}" in this institute.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── TAB 4: SECURITY AUDIT TRAIL ─── */}
      {activeTab === "audit" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security Event Ledger</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Immutable audit trail of security-sensitive operations recorded within {theme.name}.
              </p>
            </div>
            <button
              onClick={fetchSecurityAudit}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {auditLoading ? (
            <div className="p-8 text-center text-gray-400">Loading audit trail...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No security audit events recorded recently.</div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Admin</th>
                    <th className="py-2.5 px-4">Target User</th>
                    <th className="py-2.5 px-4">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-2.5 px-4 text-xs text-gray-500 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-gray-900 dark:text-white">
                        {log.adminName || log.adminId}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                        {log.targetName || log.targetId}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono text-gray-500">
                        {log.ipAddress || "Internal"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: SYSTEM POLICIES & LIMITS ─── */}
      {activeTab === "policies" && policies && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Session Lifecycle Configuration
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Idle Session Expiry</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.sessionIdleTimeoutMinutes} minutes
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Absolute Session Lifetime</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.sessionAbsoluteExpiryDays} days
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Session Activity Touch Interval</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.sessionTouchIntervalMinutes} minute
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-500" />
              Runtime Rate Limiting Limits
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Account Login Limit</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.rateLimits.loginAccountMax} per {policies.rateLimits.loginAccountWindowMinutes}m
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">IP Login Limit (Anti-Spray)</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.rateLimits.loginIpMax} per {policies.rateLimits.loginIpWindowMinutes}m
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Password Reset Limit</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.rateLimits.passwordResetMax} per {policies.rateLimits.passwordResetWindowMinutes}m
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">File Upload Limit</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {policies.rateLimits.fileUploadMax} per {policies.rateLimits.fileUploadWindowMinutes}m
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Single Session Revoke ─── */}
      {singleRevokeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revoke Session</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to terminate this active session for{" "}
              <strong>{singleRevokeSession.userName}</strong> ({singleRevokeSession.userEmail})?
              The user will be immediately logged out on that device.
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-1 font-mono">
              <div>IP: {singleRevokeSession.ipAddress}</div>
              <div>Device: {singleRevokeSession.userAgent.slice(0, 50)}...</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSingleRevokeSession(null)}
                disabled={actionInProgress}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeSingle}
                disabled={actionInProgress}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {actionInProgress ? "Revoking..." : "Revoke Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: All User Sessions Revoke ─── */}
      {userRevokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revoke All User Sessions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This will immediately revoke <strong>all</strong> active sessions across all devices for{" "}
              <strong>{userRevokeTarget.userName}</strong> ({userRevokeTarget.email}).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUserRevokeTarget(null)}
                disabled={actionInProgress}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeUserSessions}
                disabled={actionInProgress}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {actionInProgress ? "Revoking..." : "Revoke All Sessions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Emergency Institute Lockout (Typed Confirmation) ─── */}
      {showInstituteRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-red-200 dark:border-red-900/60 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">Emergency Institute Lockout</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This action will terminate <strong>every active session</strong> across <strong>{theme.name}</strong>.
              All students, faculty, and other administrators will be forced to log in again. Your current session will remain active.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Type <span className="font-mono text-red-600 font-bold">REVOKE ALL</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="REVOKE ALL"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowInstituteRevokeModal(false);
                  setTypedConfirmation("");
                }}
                disabled={actionInProgress}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleInstituteWideRevoke}
                disabled={actionInProgress || typedConfirmation.trim().toUpperCase() !== "REVOKE ALL"}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionInProgress ? "Revoking..." : "Execute Lockout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Account Status Toggle (Suspend / Reactivate) ─── */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {statusTarget.isActive ? "Suspend Account" : "Reactivate Account"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {statusTarget.isActive
                ? `Are you sure you want to suspend ${statusTarget.name} (${statusTarget.email})? They will be immediately blocked from logging in, and all active sessions will be revoked.`
                : `Are you sure you want to restore access for ${statusTarget.name} (${statusTarget.email})?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStatusTarget(null)}
                disabled={actionInProgress}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleAccountStatus}
                disabled={actionInProgress}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  statusTarget.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionInProgress ? "Processing..." : statusTarget.isActive ? "Suspend Account" : "Reactivate Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
