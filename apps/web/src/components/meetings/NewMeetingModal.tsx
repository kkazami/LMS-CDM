"use client";

import { useState, useRef } from "react";
import { X, Calendar, Clock, Loader2, Sparkles, Video } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { detectProvider, validateMeetingUrl } from "@/lib/ite/meetings/pure-logic";
import ProviderBadge from "./ProviderBadge";
import type { MeetingItemDto } from "@/lib/ite/meetings/types";

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseOption[];
  onCreated: (meeting: MeetingItemDto) => void;
  primaryColor?: string;
}

export default function NewMeetingModal({
  isOpen,
  onClose,
  courses,
  onCreated,
  primaryColor = "#2563EB",
}: NewMeetingModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(isOpen, onClose, panelRef);

  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const detectedProvider = detectProvider(joinUrl);

  const handleSubmit = async (startNow: boolean) => {
    setErrorMessage(null);

    if (!courseId) {
      setErrorMessage("Please select a course.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Meeting title is required.");
      return;
    }

    const urlCheck = validateMeetingUrl(joinUrl);
    if (!urlCheck.valid) {
      setErrorMessage(urlCheck.error);
      return;
    }

    let scheduledAtIso: string | undefined = undefined;
    if (!startNow && scheduledDate) {
      const timeVal = scheduledTime || "00:00";
      // Construct ISO timestamp for Asia/Manila (+08:00)
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
      const res = await fetch("/api/ite/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          description: description.trim() || undefined,
          joinUrl: urlCheck.url,
          scheduledAt: scheduledAtIso,
          startNow,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create meeting.");
      }

      onCreated(data);
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
        aria-labelledby="new-meeting-title"
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
              <h2 id="new-meeting-title" className="text-lg font-bold tracking-tight">
                New Class Meeting
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create a scheduled or instant video meeting for your students
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
          className="space-y-4 text-xs"
        >
          {/* Course Picker */}
          <div>
            <label htmlFor="meeting-course" className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Course <span className="text-rose-500">*</span>
            </label>
            <select
              id="meeting-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
              required
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Title */}
          <div>
            <label htmlFor="meeting-title" className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="meeting-title"
              type="text"
              maxLength={120}
              placeholder="e.g., Week 8: Lesson Planning Workshop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              required
            />
          </div>

          {/* Meeting Link Field with Live Provider Badge */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="meeting-url" className="block font-semibold text-slate-700 dark:text-slate-300">
                Meeting Link (https://) <span className="text-rose-500">*</span>
              </label>
              {joinUrl.trim() && <ProviderBadge provider={detectedProvider} />}
            </div>
            <input
              id="meeting-url"
              type="url"
              maxLength={2048}
              placeholder="https://meet.google.com/abc-defg-hij or Zoom / Teams link"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Supported: Google Meet, Zoom, Google Classroom, Microsoft Teams, or any valid https link.
            </p>
          </div>

          {/* Description (Optional) */}
          <div>
            <label htmlFor="meeting-desc" className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Agenda or Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="meeting-desc"
              rows={2}
              maxLength={500}
              placeholder="Topics to discuss, preparation instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Scheduled Date and Time (Manila Time) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Schedule for Later (Asia/Manila Time)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="meeting-date" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <input
                  id="meeting-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label htmlFor="meeting-time" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time
                </label>
                <input
                  id="meeting-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Save as scheduled
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Start now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
