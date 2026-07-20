"use client";

import { useState } from "react";
import { X, ShieldAlert, AlertTriangle } from "lucide-react";
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#2C2727]">
            <ShieldAlert className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h3 className="text-lg font-semibold">Change User Role</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">Current Role: <strong className="uppercase">{user.role}</strong></p>
            </div>
          </div>

          <div>
            <label htmlFor="new-role" className="mb-1.5 block text-sm font-medium text-gray-700">
              Select New Role
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-300"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.ring;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {user.role !== "STUDENT" && <option value="STUDENT">Student</option>}
              {user.role !== "INSTRUCTOR" && <option value="INSTRUCTOR">Instructor</option>}
              {user.role !== "ADMIN" && <option value="ADMIN">Admin</option>}
            </select>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Changing this user's role will immediately update their access permissions and log them out of all active sessions. 
              <br className="mt-1" />
              <strong>Please re-enter your admin password to authorize this action.</strong>
            </p>
          </div>

          <div>
            <label htmlFor="admin-pass" className="mb-1.5 block text-sm font-medium text-gray-700">
              Admin Password
            </label>
            <input
              id="admin-pass"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400"
              placeholder="Confirm your password..."
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.ring;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !adminPassword}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
