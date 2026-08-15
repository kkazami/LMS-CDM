"use client";

import { useState } from "react";
import { X, ShieldAlert, AlertTriangle } from "lucide-react";
import Input from "@/components/common/Input";
import type { InstituteTheme } from "@/lib/theme";
import type { LMSUser } from "@/lib/admin-types";

interface RoleChangeModalProps {
  open: boolean;
  theme: InstituteTheme;
  user: LMSUser | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function RoleChangeModal({
  open,
  theme,
  user,
  onClose,
  onSuccess,
}: RoleChangeModalProps) {
  const [newRole, setNewRole] = useState(user?.role === "STUDENT" ? "INSTRUCTOR" : "STUDENT");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${user?.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole, adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      onSuccess(data.message);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setAdminPassword("");
    setError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-[#F0F2F8]">
            <ShieldAlert className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h3 className="text-lg font-bold">Change User Role</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">Current Role: <strong className="uppercase text-slate-700 dark:text-[#F0F2F8]">{user.role}</strong></p>
            </div>
          </div>

          <div>
            <label htmlFor="new-role" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Select New Role
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
            >
              {user.role !== "STUDENT" && <option value="STUDENT">Student</option>}
              {user.role !== "INSTRUCTOR" && <option value="INSTRUCTOR">Instructor</option>}
              {user.role !== "ADMIN" && <option value="ADMIN">Admin</option>}
            </select>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 flex gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
              Changing this user's role will immediately update their access permissions and log them out of all active sessions. 
              <br className="mt-1" />
              <strong>Please re-enter your admin password to authorize this action.</strong>
            </p>
          </div>

          <Input
            id="admin-pass"
            type="password"
            label="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
            theme={theme}
            placeholder="Confirm your password..."
          />

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !adminPassword}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {loading ? "Authorizing..." : "Confirm Role Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
