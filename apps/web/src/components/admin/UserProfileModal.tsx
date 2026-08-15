"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { LMSUser } from "@/lib/admin-types";

interface UserProfileModalProps {
  open: boolean;
  mode: "create" | "edit";
  theme: InstituteTheme;
  instituteCode: string;
  user?: LMSUser;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function UserProfileModal({
  open,
  mode,
  theme,
  instituteCode,
  user,
  onClose,
  onSuccess,
}: UserProfileModalProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [uniqueId, setUniqueId] = useState(user?.uniqueId ?? "");
  const [studentNumber, setStudentNumber] = useState(user?.studentNumber ?? "");
  const [role, setRole] = useState(user?.role ?? "STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTempPassword("");

    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, uniqueId, studentNumber, role, instituteCode }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (data.temporaryPassword) {
          setTempPassword(data.temporaryPassword);
          return; // Don't close yet — show the password
        }

        onSuccess("User created successfully.");
      } else {
        const res = await fetch(`/api/admin/users/${user?.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, uniqueId, studentNumber }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        onSuccess("User updated successfully.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // If we're showing the temp password after creation
  if (tempPassword) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Account Created</h3>
            <button
              onClick={() => {
                setTempPassword("");
                onSuccess("User created successfully.");
              }}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Temporary Password</p>
              <p className="mt-1 text-[11px] text-amber-600/90 dark:text-amber-300/80">
                This password is shown only once. Share it securely with the user.
              </p>
              <div className="mt-3 rounded-xl bg-white dark:bg-[#1E2132] px-3 py-2 font-mono text-sm text-slate-900 dark:text-[#F0F2F8] border border-amber-500/30 text-center font-bold tracking-wider">
                {tempPassword}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                setTempPassword("");
                onSuccess("User created. Password copied to clipboard.");
              }}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              Copy & Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
            {mode === "create" ? "Create New User" : "Edit User Profile"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="user-name" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Full Name
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-email" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              Institutional Email
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
              placeholder="e.g. jdelacruz@university.edu"
            />
          </div>

          {/* Unique ID */}
          <div>
            <label htmlFor="user-uniqueid" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
              {role === "STUDENT" ? "Student ID / Internal Reference" : "Employee / User ID"}
            </label>
            <input
              id="user-uniqueid"
              type="text"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
              placeholder="e.g. 24-00123 or EMP-042"
            />
          </div>

          {role === "STUDENT" && (
            <div>
              <label htmlFor="user-studentnumber" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
                Official Student Number
              </label>
              <input
                id="user-studentnumber"
                type="text"
                value={studentNumber}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^\d-]/g, "");
                  if (val.length === 2 && !val.includes("-") && e.target.value.length > studentNumber.length) {
                    val = val + "-";
                  }
                  setStudentNumber(val.slice(0, 8));
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
                placeholder="Format: XX-XXXXX (e.g. 23-00875)"
              />
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-[#8B92A5]">Must be in the format XX-XXXXX (e.g. 23-00875)</p>
            </div>
          )}

          {/* Role — only on create */}
          {mode === "create" && (
            <div>
              <label htmlFor="user-role" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
                Role
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "INSTRUCTOR" | "STUDENT")}
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Info for create */}
          {mode === "create" && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              A temporary password will be auto-generated and displayed after creation.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {loading ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
