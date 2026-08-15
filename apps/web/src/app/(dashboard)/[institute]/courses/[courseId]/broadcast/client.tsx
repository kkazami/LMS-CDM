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
  { value: "GENERAL", label: "General", icon: MessageCircle, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { value: "REMINDER", label: "Reminder", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "ALERT", label: "Alert", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${theme.colors.primary}14` }}
          >
            <Radio className="h-4 w-4" style={{ color: theme.colors.primary }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Send Notification</h2>
            <p className="text-xs text-gray-400">
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
            <label className="block text-xs font-medium text-gray-500 mb-2">
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
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150"
                    style={{
                      backgroundColor: isSelected ? `${theme.colors.primary}10` : "white",
                      borderColor: isSelected ? theme.colors.primary : "#e5e7eb",
                      color: isSelected ? theme.colors.primary : "#6b7280",
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
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Recipients
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScopeType("ALL")}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: scopeType === "ALL" ? `${theme.colors.primary}10` : "white",
                  borderColor: scopeType === "ALL" ? theme.colors.primary : "#e5e7eb",
                  color: scopeType === "ALL" ? theme.colors.primary : "#6b7280",
                }}
              >
                <Users className="h-3.5 w-3.5" />
                Entire Class ({enrolledStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeType("SELECT")}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor: scopeType === "SELECT" ? `${theme.colors.primary}10` : "white",
                  borderColor: scopeType === "SELECT" ? theme.colors.primary : "#e5e7eb",
                  color: scopeType === "SELECT" ? theme.colors.primary : "#6b7280",
                }}
              >
                <User className="h-3.5 w-3.5" />
                Select Students
              </button>
            </div>

            {/* Student multi-select */}
            {scopeType === "SELECT" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50">
                {/* Search + select controls */}
                <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
                  />
                  <div className="flex gap-1.5 text-[10px] font-medium shrink-0">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-gray-500 hover:underline"
                    >
                      All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-gray-500 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Student list */}
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredStudents.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
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
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white"
                        >
                          {/* Checkbox */}
                          <div
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                            style={{
                              backgroundColor: isChecked ? theme.colors.primary : "white",
                              borderColor: isChecked ? theme.colors.primary : "#d1d5db",
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
                            <p className="truncate text-xs font-medium text-gray-800">
                              {student.name}
                            </p>
                            <p className="truncate text-[10px] text-gray-400">
                              {student.email}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedStudents.size > 0 && (
                  <div className="border-t border-gray-200 px-3 py-2">
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
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Message
            </label>
            <textarea
              name="message"
              required
              rows={3}
              maxLength={500}
              placeholder="Type your notification message..."
              className="w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none transition-colors focus:border-gray-400 placeholder:text-gray-400"
            />
          </div>

          {/* Error / Success */}
          {state.message && state.message !== "success" && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <Check className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-700">
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <History className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Broadcast History</h2>
          {broadcasts.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">
              {broadcasts.length} sent
            </span>
          )}
        </div>

        {broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="rounded-full bg-gray-100 p-4 mb-3">
              <Inbox className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No broadcasts sent yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Sent notifications will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {broadcasts.map((b) => (
              <div key={b.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {getCategoryBadge(b.category)}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {b.message}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Sent to: {b.scopeLabel}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
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
