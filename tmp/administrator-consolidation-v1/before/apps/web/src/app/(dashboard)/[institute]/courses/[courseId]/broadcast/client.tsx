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
} from "lucide-react";
import { sendBroadcast } from "./actions";

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

          {/* Category selector */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#8B92A5] mb-2">
              Category
            </label>
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer bg-white dark:bg-[#1A1D27] text-slate-600 dark:text-[#8B92A5]"
                    style={{
                      backgroundColor: isSelected ? `${theme.colors.primary}14` : undefined,
                      borderColor: isSelected ? theme.colors.primary : undefined,
                      color: isSelected ? theme.colors.primary : undefined,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient scope */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#8B92A5] mb-2">
              Recipients
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScopeType("ALL")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer bg-white dark:bg-[#1A1D27] text-slate-600 dark:text-[#8B92A5]"
                style={{
                  backgroundColor: scopeType === "ALL" ? `${theme.colors.primary}14` : undefined,
                  borderColor: scopeType === "ALL" ? theme.colors.primary : undefined,
                  color: scopeType === "ALL" ? theme.colors.primary : undefined,
                }}
              >
                <Users className="h-3.5 w-3.5" />
                Entire Class ({enrolledStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeType("SELECT")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer bg-white dark:bg-[#1A1D27] text-slate-600 dark:text-[#8B92A5]"
                style={{
                  backgroundColor: scopeType === "SELECT" ? `${theme.colors.primary}14` : undefined,
                  borderColor: scopeType === "SELECT" ? theme.colors.primary : undefined,
                  color: scopeType === "SELECT" ? theme.colors.primary : undefined,
                }}
              >
                <User className="h-3.5 w-3.5" />
                Select Students
              </button>
            </div>

            {/* Student multi-select */}
            {scopeType === "SELECT" && (
              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26]">
                {/* Search + select controls */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-slate-400 dark:text-[#8B92A5] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <div className="flex gap-1.5 text-[10px] font-medium shrink-0">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-slate-500 dark:text-[#8B92A5] hover:underline cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-slate-500 dark:text-[#8B92A5] hover:underline cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Student list */}
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredStudents.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400 dark:text-[#8B92A5]">
                      No students found
                    </p>
                  ) : (
                    filteredStudents.map((student) => {
                      const isChecked = selectedStudents.has(student.id);
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white dark:hover:bg-white/5 cursor-pointer"
                        >
                          {/* Checkbox */}
                          <div
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors border-slate-300 dark:border-white/20 bg-white dark:bg-[#141721]"
                            style={{
                              backgroundColor: isChecked ? theme.colors.primary : undefined,
                              borderColor: isChecked ? theme.colors.primary : undefined,
                            }}
                          >
                            {isChecked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <UserAvatar
                            name={student.name}
                            avatarUrl={student.avatarUrl}
                            size="sm"
                            color={theme.colors.primary}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-800 dark:text-[#F0F2F8]">
                              {student.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-400 dark:text-[#8B92A5]">
                              {student.email}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedStudents.size > 0 && (
                  <div className="border-t border-slate-200 dark:border-white/10 px-3 py-2">
                    <p className="text-[11px] font-medium" style={{ color: theme.colors.primary }}>
                      {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                )}
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
          {broadcasts.length > 0 && (
            <span className="ml-auto text-xs text-slate-400 dark:text-[#8B92A5]">
              {broadcasts.length} sent
            </span>
          )}
        </div>

        {broadcasts.length === 0 ? (
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
            {broadcasts.map((b) => (
              <div key={b.id} className="px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
