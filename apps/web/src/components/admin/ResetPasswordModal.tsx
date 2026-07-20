"use client";

import { useState } from "react";
import { X, KeyRound, CheckCircle2 } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { LMSUser } from "@/lib/admin-types";

interface ResetPasswordModalProps {
  open: boolean;
  theme: InstituteTheme;
  user: LMSUser | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ResetPasswordModal({
  open,
  theme,
  user,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [customPassword, setCustomPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  if (!open || !user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTempPassword("");

    try {
      const res = await fetch(`/api/admin/users/${user?.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: customPassword || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (customPassword) {
        onSuccess(`Password successfully changed for ${user?.name}.`);
      } else {
        setTempPassword(data.temporaryPassword);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setCustomPassword("");
    setError("");
    setTempPassword("");
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  // Success state (auto-generated password)
  if (tempPassword) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2C2727]">Password Reset</h3>
            <button
              onClick={() => {
                handleClose();
                onSuccess("Password reset successfully.");
              }}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium text-sm">Account access restored</span>
            </div>
            
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Temporary Password</p>
              <p className="mt-1 text-xs text-amber-600">
                This password is shown only once. Share it securely with {user.name}.
              </p>
              <div className="mt-3 rounded-md bg-white px-3 py-2 font-mono text-sm text-[#2C2727] border border-amber-200 text-center tracking-wider">
                {tempPassword}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                handleClose();
                onSuccess("Password copied to clipboard.");
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
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#2C2727]">
            <KeyRound className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h3 className="text-lg font-semibold">Reset Password</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600">
            You are resetting the password for <strong className="text-gray-900">{user.name}</strong> 
            <span className="text-xs text-gray-400 ml-1">({user.email})</span>.
            <br className="mt-2" />
            This action will immediately terminate all active sessions for this user.
          </div>

          <div>
            <label htmlFor="custom-password" className="mb-1.5 block text-sm font-medium text-gray-700">
              New Password <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              id="custom-password"
              type="text"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400"
              placeholder="Leave blank to auto-generate securely..."
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.ring;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {customPassword.length > 0 && customPassword.length < 6 && (
              <p className="mt-1.5 text-xs text-amber-600">
                Password must be at least 6 characters.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (customPassword.length > 0 && customPassword.length < 6)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {loading ? "Resetting..." : customPassword ? "Save Password" : "Auto-Generate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
