"use client";

import { useState, useRef } from "react";
import { X, Calendar, Clock, Loader2, Video } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { detectProvider, validateMeetingUrl } from "@/lib/ite/meetings/pure-logic";
import ProviderBadge from "./ProviderBadge";
import type { MeetingItemDto } from "@/lib/ite/meetings/types";

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingItemDto;
  onUpdated: (meeting: MeetingItemDto) => void;
  primaryColor?: string;
}

export default function EditMeetingModal({
  isOpen,
  onClose,
  meeting,
  onUpdated,
  primaryColor = "#2563EB",
}: EditMeetingModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(isOpen, onClose, panelRef);

  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description || "");
  const [joinUrl, setJoinUrl] = useState(meeting.joinUrl || "");

  // Parse existing scheduledAt if available into YYYY-MM-DD and HH:mm in Manila time
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (!meeting.scheduledAt) return "";
    try {
      const d = new Date(meeting.scheduledAt);
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
    } catch {
      return "";
    }
  });

  const [scheduledTime, setScheduledTime] = useState(() => {
    if (!meeting.scheduledAt) return "";
    try {
      const d = new Date(meeting.scheduledAt);
      const hours = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).format(d);
      const mins = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", minute: "2-digit" }).format(d);
      return `${hours.padStart(2, "0")}:${mins.padStart(2, "0")}`;
    } catch {
      return "";
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const detectedProvider = detectProvider(joinUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Meeting title is required.");
      return;
    }

    const urlCheck = validateMeetingUrl(joinUrl);
    if (!urlCheck.valid) {
      setErrorMessage(urlCheck.error);
      return;
    }

    let scheduledAtIso: string | null = null;
    if (scheduledDate) {
      const timeVal = scheduledTime || "00:00";
      const manilaIsoString = `${scheduledDate}T${timeVal}:00+08:00`;
      const parsedDate = new Date(manilaIsoString);
      if (isNaN(parsedDate.getTime())) {
        setErrorMessage("Please enter a valid scheduled date and time.");
        return;
      }
      scheduledAtIso = parsedDate.toISOString();
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/ite/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          title: title.trim(),
          description: description.trim() || undefined,
          joinUrl: urlCheck.url,
          scheduledAt: scheduledAtIso,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update meeting.");
      }

      onUpdated(data);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        aria-labelledby="edit-meeting-title"
        className="relative z-10 w-full max-w-lg bg-white dark:bg-[#161922] rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-meeting-title" className="text-lg font-bold tracking-tight">
                Edit Meeting Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {meeting.courseCode} — {meeting.courseTitle}
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

        {errorMessage && (
          <div
            className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Meeting Title */}
          <div>
            <label htmlFor="edit-meeting-title-input" className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-meeting-title-input"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              required
            />
          </div>

          {/* Meeting Link Field with Live Provider Badge */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-meeting-url" className="block font-semibold text-slate-700 dark:text-slate-300">
                Meeting Link (https://) <span className="text-rose-500">*</span>
              </label>
              {joinUrl.trim() && <ProviderBadge provider={detectedProvider} />}
            </div>
            <input
              id="edit-meeting-url"
              type="url"
              maxLength={2048}
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              required
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label htmlFor="edit-meeting-desc" className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Agenda or Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="edit-meeting-desc"
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Scheduled Date and Time (Manila Time) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Scheduled Date & Time (Asia/Manila)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-meeting-date" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <input
                  id="edit-meeting-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label htmlFor="edit-meeting-time" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time
                </label>
                <input
                  id="edit-meeting-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-white font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
