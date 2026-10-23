"use client";

import { useState, useMemo } from "react";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  Play,
  Square,
  XCircle,
  Edit3,
  Loader2,
  RefreshCw,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import ProviderBadge from "./ProviderBadge";
import StatusBadge from "./StatusBadge";
import NewMeetingModal from "./NewMeetingModal";
import EditMeetingModal from "./EditMeetingModal";
import AttendanceModal from "./AttendanceModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { groupMeetingsByManilaDay, formatMeetingAttendeesCount } from "@/lib/ite/meetings/pure-logic";
import type { MeetingItemDto, MeetingStatus } from "@/lib/ite/meetings/types";

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

interface MeetingsClientProps {
  initialMeetings: MeetingItemDto[];
  initialNextCursor: string | null;
  courses: CourseOption[];
  role: "STUDENT" | "PROFESSOR";
  primaryColor?: string;
  instituteCode: string;
}

export default function MeetingsClient({
  initialMeetings,
  initialNextCursor,
  courses,
  role,
  primaryColor = "#2563EB",
  instituteCode,
}: MeetingsClientProps) {
  const isInstructor = role === "PROFESSOR";

  const [meetings, setMeetings] = useState<MeetingItemDto[]>(initialMeetings);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItemDto | null>(null);
  const [attendanceMeeting, setAttendanceMeeting] = useState<MeetingItemDto | null>(null);

  // Confirm dialogs
  const [meetingToEnd, setMeetingToEnd] = useState<MeetingItemDto | null>(null);
  const [meetingToCancel, setMeetingToCancel] = useState<MeetingItemDto | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [joiningMeetingId, setJoiningMeetingId] = useState<string | null>(null);

  // Refresh meetings list
  const refreshList = async () => {
    setIsRefreshing(true);
    setStatusMessage(null);
    try {
      const url = new URL("/api/ite/meetings", window.location.origin);
      if (selectedCourseId !== "ALL") url.searchParams.set("courseId", selectedCourseId);
      if (selectedStatus !== "ALL") url.searchParams.set("status", selectedStatus);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setMeetings(data.meetings);
        setNextCursor(data.nextCursor);
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load more
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const url = new URL("/api/ite/meetings", window.location.origin);
      if (selectedCourseId !== "ALL") url.searchParams.set("courseId", selectedCourseId);
      if (selectedStatus !== "ALL") url.searchParams.set("status", selectedStatus);
      url.searchParams.set("cursor", nextCursor);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setMeetings((prev) => [...prev, ...data.meetings]);
        setNextCursor(data.nextCursor);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle Join
  const handleJoinMeeting = async (meeting: MeetingItemDto) => {
    setJoiningMeetingId(meeting.id);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/ite/meetings/${meeting.id}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to join meeting.");
        return;
      }

      // Open in a new tab securely
      window.open(data.joinUrl, "_blank", "noopener,noreferrer");

      // Update state locally
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meeting.id
            ? { ...m, hasJoined: true, joinCount: (m.joinCount ?? 0) + 1 }
            : m
        )
      );
      setStatusMessage("Meeting link opened in a new tab.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error joining meeting.");
    } finally {
      setJoiningMeetingId(null);
    }
  };

  // Handle Start
  const handleStartMeeting = async (meeting: MeetingItemDto) => {
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/ite/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const updated = await res.json();
      if (!res.ok) {
        alert(updated.message || "Failed to start meeting.");
        return;
      }
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setStatusMessage(`Started meeting: "${meeting.title}" is now LIVE.`);
    } catch {
      alert("Error starting meeting.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Handle End
  const handleConfirmEnd = async () => {
    if (!meetingToEnd) return;
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/ite/meetings/${meetingToEnd.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      const updated = await res.json();
      if (!res.ok) {
        alert(updated.message || "Failed to end meeting.");
        return;
      }
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setStatusMessage(`Ended meeting: "${meetingToEnd.title}".`);
      setMeetingToEnd(null);
    } catch {
      alert("Error ending meeting.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!meetingToCancel) return;
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/ite/meetings/${meetingToCancel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const updated = await res.json();
      if (!res.ok) {
        alert(updated.message || "Failed to cancel meeting.");
        return;
      }
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setStatusMessage(`Cancelled meeting: "${meetingToCancel.title}".`);
      setMeetingToCancel(null);
    } catch {
      alert("Error cancelling meeting.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Filtered lists
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedCourseId !== "ALL" && m.courseId !== selectedCourseId) return false;
      if (selectedStatus !== "ALL" && m.derivedStatus !== selectedStatus) return false;
      return true;
    });
  }, [meetings, selectedCourseId, selectedStatus]);

  // Live Now meetings
  const liveMeetings = useMemo(() => {
    return filteredMeetings.filter((m) => m.derivedStatus === "LIVE");
  }, [filteredMeetings]);

  // Upcoming meetings
  const upcomingMeetings = useMemo(() => {
    return filteredMeetings.filter((m) => m.derivedStatus === "SCHEDULED");
  }, [filteredMeetings]);

  // Grouped history list (all meetings sorted by day newest first)
  const dayGroups = useMemo(() => {
    return groupMeetingsByManilaDay(filteredMeetings);
  }, [filteredMeetings]);

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-16">
      {/* Aria-live region for accessibility announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-[#161922] dark:via-[#161922] dark:to-[#1C2030] p-6 sm:p-8 border border-slate-200/80 dark:border-white/5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Video className="w-3.5 h-3.5" />
              ITE Class Meetings
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Course Video Meetings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {isInstructor
                ? "Start instant video classes or schedule upcoming sessions with Google Meet, Zoom, or Teams."
                : "Join live class video meetings and review your upcoming schedule and past class attendance."}
            </p>
          </div>

          {isInstructor && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4" />
                New meeting
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-white/5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Course Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 pl-1">Course:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL" className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                All Courses
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 pl-2">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL" className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                All Statuses
              </option>
              <option value="LIVE" className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                Live Now
              </option>
              <option value="SCHEDULED" className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                Scheduled
              </option>
              <option value="ENDED" className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                Ended
              </option>
              <option value="CANCELLED" className="bg-white dark:bg-[#161922] text-slate-900 dark:text-slate-100">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshList}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors self-end sm:self-auto"
          title="Refresh meetings"
          aria-label="Refresh meetings"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ─── LIVE NOW SECTION ─── */}
      {liveMeetings.length > 0 && (
        <section aria-labelledby="live-meetings-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <h2 id="live-meetings-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Live Now ({liveMeetings.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMeetings.map((m) => (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-3xl p-5 bg-white dark:bg-[#161922] border-2 border-rose-500/40 shadow-lg dark:shadow-rose-950/20 flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top line with date and time */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      {m.formattedPrimaryDateTime}
                    </span>
                    <StatusBadge status="LIVE" />
                  </div>

                  {/* Title & Course */}
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {m.courseCode} — {m.courseTitle}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                      {m.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <ProviderBadge provider={m.provider} />
                    {isInstructor && (
                      <button
                        type="button"
                        onClick={() => setAttendanceMeeting(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        {formatMeetingAttendeesCount(m.joinCount ?? 0, "joined")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    {isInstructor ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleJoinMeeting(m)}
                          disabled={joiningMeetingId === m.id}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                        >
                          {joiningMeetingId === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5" />
                          )}
                          Enter meeting
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeetingToEnd(m)}
                          className="px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          End meeting
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleJoinMeeting(m)}
                        disabled={joiningMeetingId === m.id}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                      >
                        {joiningMeetingId === m.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                        Join Class Meeting
                      </button>
                    )}
                  </div>

                  {!isInstructor && (
                    <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                      <Info className="w-3 h-3 text-slate-400 shrink-0" />
                      Opens in a new tab. Joining is recorded for your participation.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── UPCOMING SECTION ─── */}
      {upcomingMeetings.length > 0 && (
        <section aria-labelledby="upcoming-meetings-heading" className="space-y-3">
          <h2 id="upcoming-meetings-heading" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map((m) => (
              <div
                key={m.id}
                className="rounded-3xl p-5 bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-white/5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      {m.formattedPrimaryDateTime}
                    </span>
                    <StatusBadge status="SCHEDULED" />
                  </div>

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {m.courseCode} — {m.courseTitle}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                      {m.description}
                    </p>
                  )}

                  <div className="mt-2">
                    <ProviderBadge provider={m.provider} />
                  </div>
                </div>

                {isInstructor ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartMeeting(m)}
                      disabled={isActionSubmitting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start now
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMeeting(m)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      title="Edit meeting"
                      aria-label="Edit meeting"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingToCancel(m)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title="Cancel meeting"
                      aria-label="Cancel meeting"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Join link will activate when your instructor starts the meeting.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── MEETING HISTORY SECTION ─── */}
      <section aria-labelledby="history-meetings-heading" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/5">
          <h2 id="history-meetings-heading" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Meeting History
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {filteredMeetings.length} total meetings
          </span>
        </div>

        {dayGroups.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-white/5">
            <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No meetings yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {isInstructor
                ? "Click 'New meeting' to schedule a class session or launch an instant video call."
                : "No meetings have been scheduled or completed for your enrolled courses."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dayGroups.map((group) => (
              <div key={group.dateKey} className="space-y-2.5">
                {/* Day Header */}
                <div className="sticky top-16 z-10 bg-slate-100/90 dark:bg-[#0E1017]/90 backdrop-blur-xs py-1 px-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Day Entries */}
                <div className="space-y-2">
                  {group.meetings.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors shadow-xs"
                    >
                      {/* TOP LINE: DATE AND TIME MANDATORY REQUIREMENT */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-white/5">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {m.startedAt
                              ? m.formattedPrimaryDateTime
                              : `Scheduled: ${m.formattedPrimaryDateTime}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ProviderBadge provider={m.provider} />
                          <StatusBadge status={m.derivedStatus} />
                        </div>
                      </div>

                      {/* Middle: Title, Course, Timing info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            {m.courseCode} — {m.courseTitle}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {m.title}
                          </h4>
                          {m.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {m.description}
                            </p>
                          )}
                        </div>

                        {/* Timing details & attendance badge */}
                        <div className="flex flex-wrap items-center gap-3 text-xs shrink-0 text-slate-500 dark:text-slate-400">
                          {m.formattedStartedTime && (
                            <span>Started: <strong className="text-slate-700 dark:text-slate-200">{m.formattedStartedTime}</strong></span>
                          )}
                          {m.formattedEndedTime && (
                            <span>Ended: <strong className="text-slate-700 dark:text-slate-200">{m.formattedEndedTime}</strong></span>
                          )}
                          {m.durationLabel && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              {m.durationLabel}
                            </span>
                          )}

                          {isInstructor && (
                            <button
                              type="button"
                              onClick={() => setAttendanceMeeting(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{formatMeetingAttendeesCount(m.joinCount ?? 0, "joined")}</span>
                            </button>
                          )}

                          {!isInstructor && m.derivedStatus === "LIVE" && (
                            <button
                              type="button"
                              onClick={() => handleJoinMeeting(m)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination Load More */}
            {nextCursor && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Load more meetings
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── MODALS ─── */}

      {/* New Meeting Modal */}
      {isInstructor && (
        <NewMeetingModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          courses={courses}
          onCreated={(newMeeting) => {
            setMeetings((prev) => [newMeeting, ...prev]);
            setStatusMessage(`Created meeting "${newMeeting.title}".`);
          }}
          primaryColor={primaryColor}
        />
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && isInstructor && (
        <EditMeetingModal
          isOpen={Boolean(editingMeeting)}
          onClose={() => setEditingMeeting(null)}
          meeting={editingMeeting}
          onUpdated={(updated) => {
            setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setStatusMessage(`Updated meeting "${updated.title}".`);
          }}
          primaryColor={primaryColor}
        />
      )}

      {/* Attendance Modal */}
      {attendanceMeeting && isInstructor && (
        <AttendanceModal
          isOpen={Boolean(attendanceMeeting)}
          onClose={() => setAttendanceMeeting(null)}
          meeting={attendanceMeeting}
          primaryColor={primaryColor}
        />
      )}

      {/* Confirm End Meeting Dialog */}
      {meetingToEnd && (
        <ConfirmDialog
          title="End Live Meeting?"
          description={`Are you sure you want to end "${meetingToEnd.title}"? Students will no longer be able to join.`}
          onClose={() => setMeetingToEnd(null)}
        >
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => setMeetingToEnd(null)}
              disabled={isActionSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmEnd}
              disabled={isActionSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              {isActionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              End meeting
            </button>
          </div>
        </ConfirmDialog>
      )}

      {/* Confirm Cancel Meeting Dialog */}
      {meetingToCancel && (
        <ConfirmDialog
          title="Cancel Scheduled Meeting?"
          description={`Are you sure you want to cancel "${meetingToCancel.title}"? This cannot be undone.`}
          onClose={() => setMeetingToCancel(null)}
        >
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => setMeetingToCancel(null)}
              disabled={isActionSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isActionSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              {isActionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Cancel meeting
            </button>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
