"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, AlertCircle, Shield, Key, Lock, Check } from "lucide-react";
import Input from "@/components/common/Input";
import type { InstituteTheme } from "@/lib/theme";
import { SYSTEM_PERMISSIONS, type SystemPermission, type UserRole } from "@/lib/admin-types";

interface PermissionsMatrixClientProps {
  theme: InstituteTheme;
}

type PermissionMatrix = Record<UserRole, SystemPermission[]>;

const ROLES: UserRole[] = ["ADMIN", "INSTRUCTOR", "STUDENT"];

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  "course:create": {
    label: "Create Courses",
    description: "Provision new classrooms and learning environments",
  },
  "course:archive": {
    label: "Archive Courses",
    description: "Remove courses from active dashboards",
  },
  "user:modify": {
    label: "Modify Users",
    description: "Edit user profile strings and account details",
  },
  "grade:export": {
    label: "Export Grades",
    description: "Generate .xlsx grading ledgers for download",
  },
};

export default function PermissionsMatrixClient({ theme }: PermissionsMatrixClientProps) {
  const [matrix, setMatrix] = useState<PermissionMatrix>({
    ADMIN: [],
    INSTRUCTOR: [],
    STUDENT: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalMatrix, setOriginalMatrix] = useState<PermissionMatrix | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showReAuth, setShowReAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    async function fetchMatrix() {
      try {
        const res = await fetch("/api/admin/permissions");
        if (!res.ok) throw new Error("Failed to fetch permissions");
        const data = await res.json();
        setMatrix(data.matrix);
        setOriginalMatrix(data.matrix);
      } catch (err) {
        console.error(err);
        showToast("Failed to load permission matrix.", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchMatrix();
  }, [showToast]);

  // Track changes
  useEffect(() => {
    if (!originalMatrix) return;
    const changed = JSON.stringify(matrix) !== JSON.stringify(originalMatrix);
    setHasChanges(changed);
  }, [matrix, originalMatrix]);

  function togglePermission(role: UserRole, perm: SystemPermission) {
    // ADMIN permissions cannot be reduced
    if (role === "ADMIN") return;

    setMatrix((prev) => {
      const current = prev[role];
      const has = current.includes(perm);
      return {
        ...prev,
        [role]: has ? current.filter((p) => p !== perm) : [...current, perm],
      };
    });
  }

  async function handleSave() {
    if (!adminPassword) {
      setShowReAuth(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix, adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOriginalMatrix(matrix);
      setHasChanges(false);
      setShowReAuth(false);
      setAdminPassword("");
      showToast("Permission matrix updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update permissions.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] max-w-md rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Permission Matrix</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8B92A5]">
            Configure fine-grained capability flags for each system role.
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={() => setShowReAuth(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-xs cursor-pointer"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        )}
      </div>

      {/* Matrix Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26]">
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Capability
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.colors.primary }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    {role}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {SYSTEM_PERMISSIONS.map((perm) => {
              const info = PERMISSION_LABELS[perm];
              return (
                <tr key={perm} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{info?.label ?? perm}</p>
                      <p className="text-xs text-slate-400 dark:text-[#8B92A5]">{info?.description ?? ""}</p>
                      <code className="mt-1 inline-block rounded-md bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-[#8B92A5]">
                        {perm}
                      </code>
                    </div>
                  </td>
                  {ROLES.map((role) => {
                    const isEnabled = matrix[role]?.includes(perm);
                    const isAdmin = role === "ADMIN";

                    return (
                      <td key={role} className="px-6 py-4 text-center">
                        <button
                          onClick={() => togglePermission(role, perm)}
                          disabled={isAdmin}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            isAdmin
                              ? "cursor-not-allowed opacity-70"
                              : "cursor-pointer"
                          } ${isEnabled ? "" : "bg-slate-200 dark:bg-white/10"}`}
                          style={{
                            backgroundColor: isEnabled ? theme.colors.primary : undefined,
                          }}
                          title={isAdmin ? "Admin permissions cannot be reduced" : `Toggle ${perm} for ${role}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                              isEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        {isAdmin && (
                          <Lock className="mx-auto mt-1 h-3 w-3 text-slate-400 dark:text-slate-500" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Admin Note */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5 text-xs text-amber-700 dark:text-amber-400">
        <strong>Security Note:</strong> ADMIN role permissions are locked to prevent accidental privilege removal.
        Changes to INSTRUCTOR and STUDENT roles require password re-authentication and are audit-logged.
      </div>

      {/* Re-Auth Dialog */}
      {showReAuth && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" style={{ color: theme.colors.primary }} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Confirm Changes</h3>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-[#8B92A5]">
              Re-enter your admin password to update the permission matrix.
            </p>
            <div className="mb-4">
              <Input
                id="admin-pass-matrix"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin password"
                theme={theme}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReAuth(false);
                  setAdminPassword("");
                }}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !adminPassword}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {saving ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
