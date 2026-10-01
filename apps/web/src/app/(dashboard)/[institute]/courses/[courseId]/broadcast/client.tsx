"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import UserAvatar from "@/components/common/UserAvatar";
import {
  Send,
  Radio,
  Clock,
  AlertTriangle,
  MessageCircle,
  Users,
  User,
  Check,
  Search,
  History,
  Inbox,
  Edit2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { sendBroadcast, updateBroadcast, deleteBroadcast } from "./actions";

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface BroadcastRecord {
  id: string;
  message: string;
  category: string;
  scopeLabel: string;
  recipientCount: number;
  createdAt: string;
}

interface BroadcastClientProps {
  courseId: string;
  courseCode: string;
  instituteCode: string;
  theme: InstituteTheme;
  enrolledStudents: EnrolledStudent[];
  broadcasts: BroadcastRecord[];
}

const CATEGORIES = [
  { value: "GENERAL", label: "General", icon: MessageCircle, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-900/50" },
  { value: "REMINDER", label: "Reminder", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900/50" },
  { value: "ALERT", label: "Alert", icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900/50" },
] as const;

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCategoryBadge(category: string) {
  const cat = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
  const Icon = cat.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.bg} ${cat.color} ${cat.border} border`}>
      <Icon className="h-3 w-3" />
      {cat.label}
    </span>
  );
}

const initialState = { message: "" };

export default function BroadcastClient({
  courseId,
  courseCode,
  instituteCode,
  theme,
  enrolledStudents,
  broadcasts,
}: BroadcastClientProps) {
  const [state, formAction] = useActionState(sendBroadcast, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [scopeType, setScopeType] = useState<"ALL" | "SELECT">("ALL");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("GENERAL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Broadcast history local state
  const [historyList, setHistoryList] = useState<BroadcastRecord[]>(broadcasts);
  useEffect(() => {
    setHistoryList(broadcasts);
  }, [broadcasts]);

  // Edit broadcast state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editCategory, setEditCategory] = useState<"GENERAL" | "REMINDER" | "ALERT">("GENERAL");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete broadcast state
  const [deletingBroadcast, setDeletingBroadcast] = useState<BroadcastRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reset form on successful send
  useEffect(() => {
    if (state.message === "success") {
      formRef.current?.reset();
      setSelectedStudents(new Set());
      setScopeType("ALL");
      setCategory("GENERAL");
      setSearchQuery("");
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStudents(new Set(enrolledStudents.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  const filteredStudents = enrolledStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Edit Handlers
  const handleStartEdit = (b: BroadcastRecord) => {
    setEditingId(b.id);
    setEditMessage(b.message);
    setEditCategory((b.category as "GENERAL" | "REMINDER" | "ALERT") || "GENERAL");
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMessage("");
    setEditError("");
  };

  const handleSaveEdit = async (b: BroadcastRecord) => {
    const trimmed = editMessage.trim();
    if (!trimmed) {
      setEditError("Message cannot be empty.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");

    try {
      const result = await updateBroadcast({
        broadcastId: b.id,
        courseId,
        instituteCode,
        message: trimmed,
        category: editCategory,
      });

      if (result.success) {
        setHistoryList((prev) =>
          prev.map((item) =>
            item.id === b.id
              ? { ...item, message: trimmed, category: editCategory }
              : item
          )
        );
        setEditingId(null);
      } else {
        setEditError(result.error || "Failed to update broadcast.");
      }
    } catch {
      setEditError("An unexpected error occurred.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Handlers
  const handleStartDelete = (b: BroadcastRecord) => {
    setDeletingBroadcast(b);
    setDeleteError("");
  };

  const handleCancelDelete = () => {
    setDeletingBroadcast(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!deletingBroadcast) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await deleteBroadcast({
        broadcastId: deletingBroadcast.id,
        courseId,
        instituteCode,
      });

      if (result.success) {
        setHistoryList((prev) => prev.filter((item) => item.id !== deletingBroadcast.id));
        setDeletingBroadcast(null);
      } else {
        setDeleteError(result.error || "Failed to delete broadcast.");
      }
    } catch {
      setDeleteError("An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute the scope value for the hidden form field
  const scopeValue = scopeType === "ALL" ? "ALL" : Array.from(selectedStudents).join(",");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── Send Notification Form ── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/10 px-5 py-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${theme.colors.primary}14` }}
          >
            <Radio className="h-4 w-4" style={{ color: theme.colors.primary }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Send Notification</h2>
            <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
              Send a direct message to students in {courseCode}
            </p>
          </div>
        </div>

        <form ref={formRef} action={formAction} className="p-5 space-y-5">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="instituteCode" value={instituteCode} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="scope" value={scopeValue} />

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#8B92A5] mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${cat.border} ${cat.bg} ring-2`
                        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#1A1D27]"
                    }`}
                    style={isSelected ? { ["--tw-ring-color" as string]: theme.colors.primary } : undefined}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-[#F0F2F8]">{cat.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Scope */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#8B92A5] mb-2">
              Recipients
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setScopeType("ALL");
                  setSelectedStudents(new Set());
                }}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                  scopeType === "ALL"
                    ? "border-slate-900 dark:border-white/30 bg-slate-50 dark:bg-white/5 ring-1 ring-slate-900 dark:ring-white/20"
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#1A1D27]"
                }`}
              >
                <Users className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-900 dark:text-[#F0F2F8]">Entire Class</p>
                  <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">
                    All {enrolledStudents.length} enrolled students
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScopeType("SELECT")}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                  scopeType === "SELECT"
                    ? "border-slate-900 dark:border-white/30 bg-slate-50 dark:bg-white/5 ring-1 ring-slate-900 dark:ring-white/20"
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#1A1D27]"
                }`}
              >
                <User className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-900 dark:text-[#F0F2F8]">Specific Students</p>
                  <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">
                    {selectedStudents.size > 0
                      ? `${selectedStudents.size} selected`
                      : "Choose recipients"}
                  </p>
                </div>
              </button>
            </div>

            {/* Student Multi-Select List */}
            {scopeType === "SELECT" && (
              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-[#8B92A5]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search students..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-white/20"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="px-2 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-[#8B92A5] py-4 text-center">
                      No students match your search
                    </p>
                  ) : (
                    filteredStudents.map((student) => {
                      const isChecked = selectedStudents.has(student.id);
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer ${
                            isChecked
                              ? "bg-white dark:bg-[#1A1D27] shadow-xs"
                              : "hover:bg-white/60 dark:hover:bg-white/5"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                              isChecked
                                ? "border-transparent text-white"
                                : "border-slate-300 dark:border-white/20 bg-white dark:bg-[#1A1D27]"
                            }`}
                            style={isChecked ? { backgroundColor: theme.colors.primary } : undefined}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                          <UserAvatar
                            name={student.name}
                            avatarUrl={student.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-900 dark:text-[#F0F2F8] truncate">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {student.email}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#8B92A5] mb-2">
              Message
            </label>
            <textarea
              name="message"
              required
              rows={3}
              maxLength={500}
              placeholder="Type your notification message..."
              className="w-full resize-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-3 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition-colors focus:border-slate-400 dark:focus:border-white/30 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Error / Success */}
          {state.message && state.message !== "success" && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          )}
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 px-3 py-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Notification sent successfully!
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              theme={theme}
              type="submit"
              disabled={scopeType === "SELECT" && selectedStudents.size === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </div>
        </form>
      </div>

      {/* ── Broadcast History ── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/10 px-5 py-4">
          <History className="h-4 w-4 text-slate-400 dark:text-[#8B92A5]" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Broadcast History</h2>
          {historyList.length > 0 && (
            <span className="ml-auto text-xs text-slate-400 dark:text-[#8B92A5]">
              {historyList.length} sent
            </span>
          )}
        </div>

        {historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="rounded-full bg-slate-100 dark:bg-white/5 p-4 mb-3">
              <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 dark:text-[#8B92A5]">No broadcasts sent yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Sent notifications will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {historyList.map((b) => {
              const isEditing = editingId === b.id;

              return (
                <div key={b.id} className="px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  {isEditing ? (
                    /* Inline Edit View */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Edit Broadcast
                        </span>
                        {/* Category Buttons */}
                        <div className="flex items-center gap-1.5">
                          {CATEGORIES.map((cat) => {
                            const isSelected = editCategory === cat.value;
                            return (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => setEditCategory(cat.value as "GENERAL" | "REMINDER" | "ALERT")}
                                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                                  isSelected
                                    ? `${cat.bg} ${cat.color} ${cat.border} border ring-1`
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                }`}
                              >
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Edit broadcast message..."
                        className="w-full resize-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-3 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-slate-400 dark:focus:border-white/30"
                      />

                      {editError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{editError}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span>{editMessage.length}/500 characters</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSavingEdit}
                            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(b)}
                            disabled={isSavingEdit || !editMessage.trim()}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            {isSavingEdit ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only History View */
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {getCategoryBadge(b.category)}
                        </div>
                        <p className="text-sm text-slate-800 dark:text-[#D1D5DB] whitespace-pre-wrap leading-relaxed">
                          {b.message}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 dark:text-[#8B92A5]">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Sent to: {b.scopeLabel}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(b.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions: Edit & Delete */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title="Edit Broadcast"
                          aria-label="Edit Broadcast"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartDelete(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Delete Broadcast"
                          aria-label="Delete Broadcast"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deletingBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141721] p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
                Delete Broadcast
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-[#8B92A5] leading-relaxed mb-4">
              Are you sure you want to delete this broadcast? This will remove it from your broadcast history and retract the notification from student inboxes.
            </p>

            <div className="rounded-lg bg-slate-50 dark:bg-[#1A1D27] p-3 border border-slate-100 dark:border-white/5 mb-5">
              <p className="text-xs text-slate-700 dark:text-[#D1D5DB] line-clamp-2 italic">
                &ldquo;{deletingBroadcast.message}&rdquo;
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Broadcast"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
