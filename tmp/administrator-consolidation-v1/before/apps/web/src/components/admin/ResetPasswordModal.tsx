"use client";

import { useState } from "react";
import { X, KeyRound, CheckCircle2 } from "lucide-react";
import Input from "@/components/common/Input";
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
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Password Reset</h3>
            <button
              onClick={() => {
                handleClose();
                onSuccess("Password reset successfully.");
              }}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold text-xs">Account access restored</span>
            </div>
            
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Temporary Password</p>
              <p className="mt-1 text-[11px] text-amber-600/90 dark:text-amber-300/80">
                This password is shown only once. Share it securely with {user.name}.
              </p>
              <div className="mt-3 rounded-xl bg-white dark:bg-[#1E2132] px-3 py-2 font-mono text-sm text-slate-900 dark:text-[#F0F2F8] border border-amber-500/30 text-center tracking-wider font-bold">
                {tempPassword}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                handleClose();
                onSuccess("Password copied to clipboard.");
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-[#F0F2F8]">
            <KeyRound className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h3 className="text-lg font-bold">Reset Password</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-slate-600 dark:text-[#8B92A5] leading-relaxed">
            You are resetting the password for <strong className="text-slate-900 dark:text-[#F0F2F8]">{user.name}</strong> 
            <span className="text-slate-400 dark:text-slate-500 ml-1">({user.email})</span>.
            <br className="mt-2" />
            This action will immediately terminate all active sessions for this user.
          </div>

          <Input
            id="custom-password"
            type="password"
            label="New Password (Optional)"
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            theme={theme}
            placeholder="Leave blank to auto-generate securely..."
          />
          {customPassword.length > 0 && customPassword.length < 6 && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              Password must be at least 6 characters.
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (customPassword.length > 0 && customPassword.length < 6)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
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
