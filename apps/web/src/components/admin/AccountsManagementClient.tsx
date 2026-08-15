"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserCheck,
  UserX,
  Pencil,
  KeyRound,
  ShieldAlert,
  Users,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { LMSUser, PaginatedResponse } from "@/lib/admin-types";
import UserProfileModal from "./UserProfileModal";
import BulkImportModal from "./BulkImportModal";
import ResetPasswordModal from "./ResetPasswordModal";
import RoleChangeModal from "./RoleChangeModal";

type Tab = "students" | "instructors";

interface AccountsManagementClientProps {
  theme: InstituteTheme;
  instituteCode: string;
}

export default function AccountsManagementClient({
  theme,
  instituteCode,
}: AccountsManagementClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [users, setUsers] = useState<LMSUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingUser, setEditingUser] = useState<LMSUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<LMSUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<LMSUser | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const roleParam = activeTab === "students" ? "STUDENT" : "INSTRUCTOR";
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        role: roleParam,
        instituteCode,
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      const data: PaginatedResponse<LMSUser> = await res.json();
      setUsers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Fetch users error:", err);
      showToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, search, statusFilter, instituteCode, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when switching tabs or searching
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, statusFilter]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Toggle Status ───
  async function handleToggleStatus(user: LMSUser) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast(data.message);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status.", "error");
    }
    setActionMenuUser(null);
  }

  // Close action menu on outside click
  useEffect(() => {
    function handleClick() {
      setActionMenuUser(null);
    }
    if (actionMenuUser) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [actionMenuUser]);

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "students", label: "Student Directory", icon: GraduationCap },
    { key: "instructors", label: "Instructor Directory", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] max-w-md rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Account Management</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8B92A5]">
            Create, manage, and administer user accounts across the institute.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-slate-100/70 dark:bg-white/[0.03] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                  : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
              }`}
            >
              <Icon className="h-4 w-4" style={isActive ? { color: theme.colors.primary } : undefined} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#8B92A5]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 dark:placeholder:text-[#555C72] focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-[#F0F2F8] outline-none cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <span className="text-sm font-medium text-slate-400 dark:text-[#555C72]">
          {total} {total === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02]">
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-[#8B92A5] uppercase text-xs tracking-wider">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-[#8B92A5] uppercase text-xs tracking-wider">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-[#8B92A5] uppercase text-xs tracking-wider">
                  {activeTab === "students" ? "Student No." : "Employee ID"}
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-[#8B92A5] uppercase text-xs tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-[#8B92A5] uppercase text-xs tracking-wider">Created</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-[#8B92A5] uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-white/5">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-[#555C72]">
                    No {activeTab === "students" ? "students" : "instructors"} found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white shadow-xs"
                          style={{ backgroundColor: user.isActive ? theme.colors.primary : "#9CA3AF" }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-[#F0F2F8]">{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-[#8B92A5]">{user.email}</td>

                    {/* Unique ID / Student Number */}
                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 dark:bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-700 dark:text-[#8B92A5] border border-slate-200/60 dark:border-white/5">
                        {activeTab === "students" 
                          ? (user.studentNumber || "—") 
                          : (user.uniqueId || "—")}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3.5 text-slate-500 dark:text-[#8B92A5] text-xs">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuUser(actionMenuUser === user.id ? null : user.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 dark:text-[#8B92A5] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-[#F0F2F8] cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {actionMenuUser === user.id && (
                          <div
                            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22263A] py-1 shadow-xl text-slate-700 dark:text-[#F0F2F8]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setActionMenuUser(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-medium"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit Profile
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-medium"
                            >
                              {user.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 text-rose-500" />
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Suspend Account</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Reactivate Account</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setResetPasswordUser(user);
                                setActionMenuUser(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-medium"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Reset Password
                            </button>
                            <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                            <button
                              onClick={() => {
                                setRoleChangeUser(user);
                                setActionMenuUser(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-medium"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Change Role
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
              Page {page} of {totalPages} · {total} total records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 dark:text-[#8B92A5] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      pageNum === page
                        ? "text-white shadow-xs"
                        : "text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                    style={pageNum === page ? { backgroundColor: theme.colors.primary } : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 dark:text-[#8B92A5] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <UserProfileModal
        open={showCreateModal}
        mode="create"
        theme={theme}
        instituteCode={instituteCode}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchUsers();
          setShowCreateModal(false);
        }}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <UserProfileModal
          open={true}
          mode="edit"
          theme={theme}
          instituteCode={instituteCode}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(msg) => {
            showToast(msg);
            fetchUsers();
            setEditingUser(null);
          }}
        />
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        open={showBulkModal}
        theme={theme}
        instituteCode={instituteCode}
        onClose={() => setShowBulkModal(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchUsers();
          setShowBulkModal(false);
        }}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={!!resetPasswordUser}
        theme={theme}
        user={resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        onSuccess={(msg) => {
          showToast(msg);
          setResetPasswordUser(null);
        }}
      />

      {/* Role Change Modal */}
      <RoleChangeModal
        open={!!roleChangeUser}
        theme={theme}
        user={roleChangeUser}
        onClose={() => setRoleChangeUser(null)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchUsers();
          setRoleChangeUser(null);
        }}
      />
    </div>
  );
}
