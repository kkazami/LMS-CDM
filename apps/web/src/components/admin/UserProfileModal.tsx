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
          body: JSON.stringify({ name, email, uniqueId, role, instituteCode }),
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
          body: JSON.stringify({ name, email, uniqueId }),
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
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2C2727]">Account Created</h3>
            <button
              onClick={() => {
                setTempPassword("");
                onSuccess("User created successfully.");
              }}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Temporary Password</p>
              <p className="mt-1 text-xs text-amber-600">
                This password is shown only once. Share it securely with the user.
              </p>
              <div className="mt-3 rounded-md bg-white px-3 py-2 font-mono text-sm text-[#2C2727] border border-amber-200">
                {tempPassword}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                setTempPassword("");
                onSuccess("User created. Password copied to clipboard.");
              }}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#2C2727]">
            {mode === "create" ? "Create New User" : "Edit User Profile"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="user-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400"
              placeholder="e.g. Juan Dela Cruz"
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

          {/* Email */}
          <div>
            <label htmlFor="user-email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Institutional Email
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400"
              placeholder="e.g. jdelacruz@university.edu"
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

          {/* Unique ID */}
          <div>
            <label htmlFor="user-uniqueid" className="mb-1.5 block text-sm font-medium text-gray-700">
              {mode === "create" && role === "STUDENT" ? "Student Number" : "Employee / Student ID"}
            </label>
            <input
              id="user-uniqueid"
              type="text"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400"
              placeholder="e.g. 24-00123 or EMP-042"
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

          {/* Role — only on create */}
          {mode === "create" && (
            <div>
              <label htmlFor="user-role" className="mb-1.5 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "INSTRUCTOR" | "STUDENT")}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none"
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Info for create */}
          {mode === "create" && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-600">
              A temporary password will be auto-generated and displayed after creation.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
