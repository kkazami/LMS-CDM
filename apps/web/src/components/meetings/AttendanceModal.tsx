"use client";

import { useState, useEffect, useRef } from "react";
import { X, Users, Loader2, Clock } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import UserAvatar from "@/components/common/UserAvatar";
import type { AttendanceResponse, MeetingItemDto } from "@/lib/ite/meetings/types";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingItemDto;
  primaryColor?: string;
}

export default function AttendanceModal({
  isOpen,
  onClose,
  meeting,
  primaryColor = "#2563EB",
}: AttendanceModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(isOpen, onClose, panelRef);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function loadAttendance() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ite/meetings/${meeting.id}/attendance`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Failed to load attendance records.");
        }
        if (!cancelled) {
          setData(json);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error loading attendance.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [isOpen, meeting.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-modal-title"
        className="relative z-10 w-full max-w-lg bg-white dark:bg-[#161922] rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9] max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="attendance-modal-title" className="text-lg font-bold tracking-tight">
                Meeting Attendance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {meeting.title} ({meeting.courseCode})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 min-h-[160px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading attendee records…</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          ) : !data || data.attendees.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
              No students have joined this meeting yet.
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-1 flex items-center justify-between">
                <span>Total Joined: {data.totalAttendees}</span>
                <span>Asia/Manila Time</span>
              </div>
              <ul className="space-y-2">
                {data.attendees.map((att) => (
                  <li
                    key={att.userId}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={att.name}
                        avatarUrl={att.avatarUrl}
                        size="sm"
                        className="h-8 w-8 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {att.name}
                        </div>
                        {att.studentNumber && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {att.studentNumber}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {att.formattedJoinedAt}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
