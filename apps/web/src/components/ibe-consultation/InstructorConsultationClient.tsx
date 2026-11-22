"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Send,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageSquare,
  UserCheck,
  CalendarClock,
  RefreshCw,
  Check,
  XCircle,
  Edit3,
  Trash2,
  PauseCircle,
  PlayCircle,
  CalendarOff,
  Sliders,
  X,
  UserX,
  GraduationCap,
} from "lucide-react";
import type {
  AppointmentDTO,
  AvailabilityMeetingType,
  ConsultationMeetingType,
  ConsultationStatus,
  InstructorAvailabilityDTO,
  InstructorBlockedDateDTO,
  InstructorConsultationStats,
  SlotDurationMinutes,
} from "@/lib/ibe-consultation/types";
import {
  DAY_NAMES,
  buildManilaDateTime,
  formatManilaDate,
  formatManilaDateInput,
  formatManilaTimeRange,
  formatMinutesToTime,
  formatTimeLabel,
  getManilaDayOfWeek,
  parseTimeMinutes,
  toManilaTimeString,
} from "@/lib/ibe-consultation/rules";

interface InstructorSubjectOption {
  id: string;
  title: string;
}

interface InstructorConsultationClientProps {
  instructorName: string;
  initialStats: InstructorConsultationStats;
  initialAvailability: InstructorAvailabilityDTO[];
  initialBlockedDates: InstructorBlockedDateDTO[];
  initialAppointments: AppointmentDTO[];
  initialTotal: number;
  instructorSubjects: InstructorSubjectOption[];
}

type InstructorTab = "REQUESTS" | "APPOINTMENTS" | "CALENDAR" | "AVAILABILITY";
type CalendarViewMode = "DAILY" | "WEEKLY" | "MONTHLY";

const STATUS_BADGE_MAP: Record<
  ConsultationStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending Review",
    className:
      "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  },
  APPROVED: {
    label: "Approved",
    className:
      "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  },
  RESCHEDULE_REQUESTED: {
    label: "Reschedule Proposed",
    className:
      "bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-500 border-slate-200/70 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
  },
};

interface ConversationTimelineEntry {
  id: string;
  senderName: string;
  senderRole: "STUDENT" | "INSTRUCTOR";
  badgeLabel?: string;
  message: string;
  createdAt: string;
}

function buildConversationTimeline(appt: AppointmentDTO): ConversationTimelineEntry[] {
  const entries: ConversationTimelineEntry[] = [];
  const rawMessages = appt.messages ?? [];

  const hasInitialInMessages = rawMessages.some((m) =>
    m.message.includes(appt.reason.slice(0, 32)),
  );
  if (!hasInitialInMessages && appt.reason) {
    entries.push({
      id: `init-${appt.id}`,
      senderName: appt.student.name,
      senderRole: "STUDENT",
      badgeLabel: "Initial Consultation Request",
      message: appt.additionalMessage
        ? `${appt.reason}\n\nAdditional Note: ${appt.additionalMessage}`
        : appt.reason,
      createdAt: appt.createdAt,
    });
  }

  if (appt.instructorResponse) {
    const respText = appt.instructorResponse;
    const alreadyInMessages = rawMessages.some((m) => m.message.includes(respText));
    if (!alreadyInMessages) {
      entries.push({
        id: `inst-resp-${appt.id}`,
        senderName: appt.instructor.name,
        senderRole: "INSTRUCTOR",
        badgeLabel:
          appt.status === "RESCHEDULE_REQUESTED"
            ? "Proposed Schedule Note"
            : "Instructor Response",
        message: respText,
        createdAt: appt.updatedAt,
      });
    }
  }

  if (appt.rejectionReason) {
    const rejText = appt.rejectionReason;
    const alreadyInMessages = rawMessages.some((m) => m.message.includes(rejText));
    if (!alreadyInMessages) {
      entries.push({
        id: `inst-rej-${appt.id}`,
        senderName: appt.instructor.name,
        senderRole: "INSTRUCTOR",
        badgeLabel: "Declined Request Reason",
        message: rejText,
        createdAt: appt.updatedAt,
      });
    }
  }

  for (const m of rawMessages) {
    entries.push({
      id: m.id,
      senderName: m.senderName,
      senderRole: m.senderRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT",
      message: m.message,
      createdAt: m.createdAt,
    });
  }

  return entries;
}

export default function InstructorConsultationClient({
  instructorName,
  initialStats,
  initialAvailability,
  initialBlockedDates,
  initialAppointments,
  initialTotal,
  instructorSubjects,
}: InstructorConsultationClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<InstructorTab>("REQUESTS");
  const [stats, setStats] = useState<InstructorConsultationStats>(initialStats);
  const [availability, setAvailability] =
    useState<InstructorAvailabilityDTO[]>(initialAvailability);
  const [blockedDates, setBlockedDates] =
    useState<InstructorBlockedDateDTO[]>(initialBlockedDates);
  const [appointments, setAppointments] =
    useState<AppointmentDTO[]>(initialAppointments);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // Filters for Appointments tab
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | "ALL">("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [meetingTypeFilter, setMeetingTypeFilter] =
    useState<ConsultationMeetingType | "ALL">("ALL");
  const [quickBucket, setQuickBucket] = useState<
    "ALL" | "UPCOMING" | "TODAY" | "COMPLETED" | "NO_SHOW" | "REJECTED" | "CANCELLED"
  >("ALL");

  // Active Appointment Modal / Review Drawer
  const [activeAppointment, setActiveAppointment] = useState<AppointmentDTO | null>(null);
  const [decisionMode, setDecisionMode] = useState<
    "NONE" | "APPROVE" | "REJECT" | "RESCHEDULE" | "CANCEL" | "MESSAGES"
  >("NONE");
  const [instructorResponse, setInstructorResponse] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [meetingLocationInput, setMeetingLocationInput] = useState<string>("");
  const [meetingLinkInput, setMeetingLinkInput] = useState<string>("");
  const [proposedDate, setProposedDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return formatManilaDateInput(tomorrow);
  });
  const [proposedStartTime, setProposedStartTime] = useState<string>("09:00");
  const [proposedDuration, setProposedDuration] = useState<SlotDurationMinutes>(30);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pageFeedback, setPageFeedback] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Availability Form State
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [availDayOfWeek, setAvailDayOfWeek] = useState<number>(1);
  const [availStartTime, setAvailStartTime] = useState<string>("09:00");
  const [availEndTime, setAvailEndTime] = useState<string>("11:00");
  const [availSlotDuration, setAvailSlotDuration] = useState<SlotDurationMinutes>(30);
  const [availMaxPerDay, setAvailMaxPerDay] = useState<number>(6);
  const [availMeetingType, setAvailMeetingType] =
    useState<AvailabilityMeetingType>("BOTH");
  const [availLocation, setAvailLocation] = useState<string>("IBE Faculty Consultation Room");
  const [availMeetingLink, setAvailMeetingLink] = useState<string>("");
  const [availSaving, setAvailSaving] = useState<boolean>(false);
  const [availFeedback, setAvailFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Blocked Date Form State
  const [blockDateStart, setBlockDateStart] = useState<string>(() =>
    formatManilaDateInput(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
  );
  const [blockDateEnd, setBlockDateEnd] = useState<string>(() =>
    formatManilaDateInput(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
  );
  const [blockReason, setBlockReason] = useState<string>("");
  const [blockSaving, setBlockSaving] = useState<boolean>(false);

  // Calendar State
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("WEEKLY");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState<string>(() =>
    formatManilaDateInput(new Date()),
  );

  // Fetch appointments & stats
  const fetchAppointments = useCallback(
    async (targetPage = page) => {
      setLoadingList(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("pageSize", String(pageSize));
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (subjectFilter !== "ALL") params.set("subjectId", subjectFilter);
        if (meetingTypeFilter !== "ALL") params.set("meetingType", meetingTypeFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/ibe/consultation/appointments?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setAppointments(data.appointments ?? data.items ?? []);
        setTotal(data.total ?? 0);
        if (data.stats || data.instructorStats) {
          setStats(data.stats ?? data.instructorStats);
        }
      } finally {
        setLoadingList(false);
      }
    },
    [page, pageSize, statusFilter, subjectFilter, meetingTypeFilter, searchQuery],
  );

  const fetchAvailabilityAndBlocks = useCallback(async () => {
    const res = await fetch("/api/ibe/consultation/availability", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAvailability(data.availabilities ?? data.availability ?? []);
    setBlockedDates(data.blockedDates ?? []);
  }, []);

  const hasSkippedInitialFetch = useRef(false);

  useEffect(() => {
    if (!hasSkippedInitialFetch.current) {
      hasSkippedInitialFetch.current = true;
      if (
        page === 1 &&
        statusFilter === "ALL" &&
        subjectFilter === "ALL" &&
        meetingTypeFilter === "ALL" &&
        !searchQuery.trim()
      ) {
        return;
      }
    }
    const timer = setTimeout(() => {
      fetchAppointments(page);
    }, searchQuery.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [page, statusFilter, subjectFilter, meetingTypeFilter, searchQuery, fetchAppointments]);

  // Deep link support for `?appointmentId=...`
  useEffect(() => {
    const deepId = searchParams.get("appointmentId");
    if (!deepId) return;
    const found = appointments.find((a) => a.id === deepId);
    if (found) {
      openAppointmentModal(found);
      return;
    }
    fetch(`/api/ibe/consultation/appointments/${encodeURIComponent(deepId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.appointment) {
          openAppointmentModal(data.appointment);
        }
      })
      .catch(() => {});
  }, [searchParams, appointments]);

  const openAppointmentModal = (
    appt: AppointmentDTO,
    mode: "NONE" | "APPROVE" | "REJECT" | "RESCHEDULE" | "CANCEL" | "MESSAGES" = "NONE",
  ) => {
    setActiveAppointment(appt);
    setDecisionMode(mode);
    setActionError(null);
    setActionSuccess(null);
    setInstructorResponse(appt.instructorResponse ?? "");
    setRejectionReason(appt.rejectionReason ?? "");
    setCancellationReason("");
    setMeetingLocationInput(appt.meetingLocation ?? "IBE Faculty Consultation Room");
    setMeetingLinkInput(appt.meetingLink ?? "");

    // Default proposed schedule to a guaranteed future date/time in Asia/Manila
    const nowMs = Date.now();
    const candidateIso =
      appt.proposedStartAt && new Date(appt.proposedStartAt).getTime() > nowMs
        ? appt.proposedStartAt
        : new Date(appt.requestedStartAt).getTime() > nowMs + 60 * 60 * 1000
          ? appt.requestedStartAt
          : new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();

    setProposedDate(formatManilaDateInput(candidateIso));
    const candidateTime = toManilaTimeString(candidateIso);
    setProposedStartTime(candidateTime && candidateTime !== "00:00" ? candidateTime : "10:00");
  };

  // Filtered Pending Requests for Requests tab
  const pendingQueue = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === "PENDING" || a.status === "RESCHEDULE_REQUESTED",
      ),
    [appointments],
  );

  // Filtered appointments for Appointment Management tab
  const displayedAppointments = useMemo(() => {
    const now = Date.now();
    const todayManila = formatManilaDateInput(new Date());
    return appointments.filter((a) => {
      if (quickBucket === "UPCOMING") {
        return (
          (a.status === "APPROVED" || a.status === "CONFIRMED") &&
          new Date(a.requestedStartAt).getTime() >= now
        );
      }
      if (quickBucket === "TODAY") {
        return (
          (a.status === "APPROVED" || a.status === "CONFIRMED") &&
          formatManilaDateInput(a.requestedStartAt) === todayManila
        );
      }
      if (quickBucket === "COMPLETED") {
        return a.status === "COMPLETED";
      }
      if (quickBucket === "NO_SHOW") {
        return a.attendanceOutcome === "NO_SHOW";
      }
      if (quickBucket === "REJECTED") {
        return a.status === "REJECTED";
      }
      if (quickBucket === "CANCELLED") {
        return a.status === "CANCELLED";
      }
      return true;
    });
  }, [appointments, quickBucket]);

  // Execute status transition on active appointment
  const handleAppointmentDecision = async (
    action:
      | "APPROVE"
      | "REJECT"
      | "PROPOSE_RESCHEDULE"
      | "CANCEL"
      | "COMPLETE"
      | "MARK_NO_SHOW",
  ) => {
    if (!activeAppointment) return;
    setActionError(null);
    setActionSuccess(null);

    if (action === "REJECT" && rejectionReason.trim().length < 3) {
      setActionError("Please enter a rejection reason (at least 3 characters) before declining this request.");
      return;
    }

    if (action === "CANCEL" && cancellationReason.trim().length < 3) {
      setActionError("Please enter a cancellation reason (at least 3 characters).");
      return;
    }

    let payload: Record<string, unknown> = {
      action,
      instructorResponse: instructorResponse.trim() || undefined,
      meetingLocation: meetingLocationInput.trim() || undefined,
      meetingLink: meetingLinkInput.trim() || undefined,
    };

    if (action === "REJECT") {
      payload.rejectionReason = rejectionReason.trim();
    }

    if (action === "CANCEL") {
      payload.cancellationReason = cancellationReason.trim();
    }

    if (action === "PROPOSE_RESCHEDULE") {
      const startDateObj = buildManilaDateTime(proposedDate, proposedStartTime);
      if (!startDateObj) {
        setActionError("Please select a valid proposed date and start time.");
        return;
      }
      const startMins = parseTimeMinutes(proposedStartTime) ?? 9 * 60;
      const proposedEndTime = formatMinutesToTime(startMins + proposedDuration);
      const endDateObj = new Date(
        startDateObj.getTime() + proposedDuration * 60 * 1000,
      );
      payload = {
        ...payload,
        proposedDateKey: proposedDate,
        proposedStartTime,
        proposedEndTime,
        proposedStartAt: startDateObj.toISOString(),
        proposedEndAt: endDateObj.toISOString(),
      };
    }

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/ibe/consultation/appointments/${activeAppointment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "Unable to update consultation request.");
        return;
      }

      const updatedAppt: AppointmentDTO | undefined = data.appointment;
      if (updatedAppt) {
        setActiveAppointment(updatedAppt);
        setAppointments((prev) =>
          prev.map((item) => (item.id === updatedAppt.id ? updatedAppt : item)),
        );
      }
      if (data.stats || data.instructorStats) {
        setStats(data.stats ?? data.instructorStats);
      }

      const feedbackMessage =
        action === "APPROVE"
          ? `Approved consultation schedule for ${activeAppointment.student.name}.`
          : action === "PROPOSE_RESCHEDULE"
            ? `Proposed a new schedule to ${activeAppointment.student.name}. Awaiting student acceptance.`
            : action === "REJECT"
              ? `Declined consultation request from ${activeAppointment.student.name}.`
              : action === "COMPLETE"
                ? `Marked consultation with ${activeAppointment.student.name} as Completed.`
                : action === "MARK_NO_SHOW"
                  ? `Recorded No-Show attendance outcome for ${activeAppointment.student.name}.`
                  : `Cancelled consultation appointment with ${activeAppointment.student.name}.`;

      setActionSuccess(feedbackMessage);
      setPageFeedback(feedbackMessage);
      await fetchAppointments(page);

      setTimeout(() => {
        setActiveAppointment(null);
        setDecisionMode("NONE");
        setActionSuccess(null);
      }, 650);
    } catch {
      setActionError("Network error while updating consultation status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Send message inside appointment detail modal
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment || !newMessage.trim()) return;
    setSendingMessage(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/ibe/consultation/appointments/${activeAppointment.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: newMessage.trim() }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "Unable to send message.");
        return;
      }
      if (data.appointment) {
        setActiveAppointment(data.appointment);
        setAppointments((prev) =>
          prev.map((a) => (a.id === data.appointment.id ? data.appointment : a)),
        );
      }
      setNewMessage("");
      setActionSuccess("Message sent to student.");
      await fetchAppointments(page);
    } catch {
      setActionError("Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Save or update recurring availability
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailSaving(true);
    setAvailFeedback(null);

    try {
      const method = editingAvailabilityId ? "PATCH" : "POST";
      const res = await fetch("/api/ibe/consultation/availability", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAvailabilityId ?? undefined,
          dayOfWeek: availDayOfWeek,
          startTime: availStartTime,
          endTime: availEndTime,
          slotDuration: availSlotDuration,
          maxAppointmentsPerDay: availMaxPerDay,
          meetingType: availMeetingType,
          location: availLocation.trim() || null,
          meetingLink: availMeetingLink.trim() || null,
          isActive: true,
          isSuspended: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvailFeedback({
          type: "error",
          message: data.error || "Unable to save availability schedule.",
        });
        return;
      }

      setAvailFeedback({
        type: "success",
        message: editingAvailabilityId
          ? "Availability window updated. Existing approved/confirmed appointments remain intact."
          : "Recurring weekly availability window added.",
      });
      setEditingAvailabilityId(null);
      await fetchAvailabilityAndBlocks();
    } catch {
      setAvailFeedback({
        type: "error",
        message: "Failed to save availability settings.",
      });
    } finally {
      setAvailSaving(false);
    }
  };

  const handleToggleSuspendAvailability = async (slot: InstructorAvailabilityDTO) => {
    setAvailFeedback(null);
    const res = await fetch("/api/ibe/consultation/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: slot.id,
        isSuspended: !slot.isSuspended,
      }),
    });
    if (res.ok) {
      setAvailFeedback({
        type: "success",
        message: !slot.isSuspended
          ? "Schedule temporarily suspended for new requests. Existing confirmed appointments are preserved."
          : "Schedule resumed for new consultation requests.",
      });
      await fetchAvailabilityAndBlocks();
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    setAvailFeedback(null);
    const res = await fetch(
      `/api/ibe/consultation/availability?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setAvailFeedback({
        type: "success",
        message:
          "Availability window removed. Any previously approved or confirmed appointments remain scheduled.",
      });
      if (editingAvailabilityId === id) {
        setEditingAvailabilityId(null);
      }
      await fetchAvailabilityAndBlocks();
    }
  };

  // Add blocked date range
  const handleCreateBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockSaving(true);
    setAvailFeedback(null);

    try {
      const startObj = buildManilaDateTime(blockDateStart, "00:00");
      const endObj = buildManilaDateTime(blockDateEnd, "23:59");
      if (!startObj || !endObj || endObj < startObj) {
        setAvailFeedback({
          type: "error",
          message: "Please provide a valid blocked date range.",
        });
        return;
      }

      const res = await fetch("/api/ibe/consultation/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: startObj.toISOString(),
          endAt: endObj.toISOString(),
          reason: blockReason.trim() || "Faculty academic commitment",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvailFeedback({
          type: "error",
          message: data.error || "Unable to block date.",
        });
        return;
      }
      setBlockReason("");
      setAvailFeedback({
        type: "success",
        message: "Unavailable date range added to your schedule.",
      });
      await fetchAvailabilityAndBlocks();
    } finally {
      setBlockSaving(false);
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    const res = await fetch(
      `/api/ibe/consultation/blocked-dates?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      await fetchAvailabilityAndBlocks();
    }
  };

  // Calendar days generator based on Daily / Weekly / Monthly view
  const calendarDays = useMemo(() => {
    const anchor = buildManilaDateTime(calendarAnchorDate, "12:00") ?? new Date();
    if (calendarView === "DAILY") {
      return [anchor];
    }
    if (calendarView === "WEEKLY") {
      const dow = getManilaDayOfWeek(anchor);
      const sunday = new Date(anchor.getTime() - dow * 24 * 60 * 60 * 1000);
      return Array.from({ length: 7 }, (_, i) => {
        return new Date(sunday.getTime() + i * 24 * 60 * 60 * 1000);
      });
    }
    // MONTHLY: 28-35 days starting from start of month's week
    const [yearStr, monthStr] = calendarAnchorDate.split("-");
    const firstOfMonth =
      buildManilaDateTime(`${yearStr}-${monthStr}-01`, "12:00") ?? anchor;
    const startDow = getManilaDayOfWeek(firstOfMonth);
    const gridStart = new Date(
      firstOfMonth.getTime() - startDow * 24 * 60 * 60 * 1000,
    );
    return Array.from({ length: 35 }, (_, i) => {
      return new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000);
    });
  }, [calendarAnchorDate, calendarView]);

  const shiftCalendarAnchor = (direction: -1 | 1) => {
    const anchor = buildManilaDateTime(calendarAnchorDate, "12:00") ?? new Date();
    const daysDelta =
      calendarView === "DAILY" ? 1 : calendarView === "WEEKLY" ? 7 : 30;
    const next = new Date(
      anchor.getTime() + direction * daysDelta * 24 * 60 * 60 * 1000,
    );
    setCalendarAnchorDate(formatManilaDateInput(next));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Compact Header Card — Matches IBE WordWise & IBE Learning Hub */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                IBE Consultation Management
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                Faculty Consultation &amp; Scheduling Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Welcome,{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {instructorName}
              </span>
              . Publish recurring consultation hours, review student consultation letters and
              requests, and manage confirmed appointments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                fetchAppointments(page);
                fetchAvailabilityAndBlocks();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("AVAILABILITY")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Manage Availability
            </button>
          </div>
        </div>
      </div>

      {/* Instructor Stat Cards (Section 3.A: 6 Metrics) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Requests
            </span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalRequests}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            All student submissions
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Requests
            </span>
            <Clock3 className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.pendingRequests}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Needs instructor decision
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Approved Appointments
            </span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.approvedAppointments}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Approved &amp; confirmed
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Today&apos;s Consultations
            </span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.todaysConsultations}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Scheduled today (Manila)
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Upcoming Consultations
            </span>
            <CalendarClock className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.upcomingConsultations}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Future scheduled sessions
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Completed Consultations
            </span>
            <UserCheck className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.completedConsultations}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Fulfilled meetings
          </p>
        </div>
      </div>

      {/* Clean Underline Tabs — Matches IBE WordWise & IBE Learning Hub */}
      <div className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("REQUESTS")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "REQUESTS"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Clock3 className="w-4 h-4" />
          Review Consultation Requests
          {stats.pendingRequests > 0 && (
            <span className="rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {stats.pendingRequests}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("APPOINTMENTS")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "APPOINTMENTS"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Appointment Management ({total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CALENDAR")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "CALENDAR"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Consultation Calendar
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("AVAILABILITY")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "AVAILABILITY"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Manage Availability ({availability.length})
        </button>
      </div>

      {/* Page-level Action Confirmation Banner */}
      {pageFeedback && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{pageFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageFeedback(null)}
            className="rounded p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: REVIEW CONSULTATION REQUESTS (Section 3.C) */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Incoming Consultation Requests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review student academic concerns and supporting letters. Approve the requested slot, decline with a reason, or propose another available schedule.
              </p>
            </div>
          </div>

          {pendingQueue.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-10 text-center shadow-xs">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                All caught up on consultation requests
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                There are currently no pending consultation requests awaiting your decision.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQueue.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs hover:border-slate-300 dark:hover:border-white/25 transition-colors"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                            STATUS_BADGE_MAP[req.status]?.className ?? ""
                          }`}
                        >
                          {STATUS_BADGE_MAP[req.status]?.label ?? req.status}
                        </span>
                        <span className="rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          {req.subject.title}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Submitted {formatManilaDate(req.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {req.title}
                      </h3>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-[#10131B] rounded-lg p-3 border border-slate-200/80 dark:border-white/10">
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">
                            Student Name &amp; ID
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {req.student.name}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            ID: {req.student.id.slice(0, 8).toUpperCase()} •{" "}
                            {req.student.program || "IBE Student"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">
                            Preferred Date &amp; Time
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatManilaDate(req.requestedStartAt)}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {formatManilaTimeRange(req.requestedStartAt, req.requestedEndAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">
                            Meeting Type
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {req.meetingType === "ONLINE" ? "Online Meeting" : "Face-to-Face"}
                          </span>
                        </div>
                      </div>

                      {req.status === "RESCHEDULE_REQUESTED" &&
                        req.proposedStartAt &&
                        req.proposedEndAt && (
                          <div className="rounded-lg border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-3 text-xs">
                            <span className="font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                              Proposed Schedule Sent to Student (Awaiting Student Acceptance)
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                              {formatManilaDate(req.proposedStartAt)} •{" "}
                              {formatManilaTimeRange(req.proposedStartAt, req.proposedEndAt)}
                            </span>
                            {req.instructorResponse && (
                              <span className="text-slate-600 dark:text-slate-300 mt-0.5 block">
                                Note: &ldquo;{req.instructorResponse}&rdquo;
                              </span>
                            )}
                          </div>
                        )}

                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <p>
                          <strong className="text-slate-900 dark:text-white">Reason:</strong>{" "}
                          {req.reason}
                        </p>
                        {req.additionalMessage && (
                          <p>
                            <strong className="text-slate-900 dark:text-white">
                              Additional Message:
                            </strong>{" "}
                            {req.additionalMessage}
                          </p>
                        )}
                      </div>

                      {req.messages.length > 0 && (
                        <div className="rounded-lg border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 p-2.5 text-xs">
                          <span className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 text-[10px] block">
                            Latest Reply ({req.messages[req.messages.length - 1].senderName})
                          </span>
                          <p className="mt-0.5 text-slate-800 dark:text-slate-200 line-clamp-2">
                            {req.messages[req.messages.length - 1].message}
                          </p>
                        </div>
                      )}

                      {req.attachments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {req.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.downloadUrl}
                              className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {att.originalFileName} ({(att.fileSize / 1024).toFixed(1)} KB)
                              <Download className="h-3 w-3 ml-1" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Three Primary Actions + Messages + View Details */}
                    <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 min-w-[205px]">
                      <button
                        type="button"
                        onClick={() => openAppointmentModal(req, "APPROVE")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {req.status === "RESCHEDULE_REQUESTED"
                          ? "Approve Requested Slot"
                          : "Approve Schedule"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openAppointmentModal(req, "RESCHEDULE")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-500/20 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {req.status === "RESCHEDULE_REQUESTED"
                          ? "Update Proposed Schedule"
                          : "Propose Another Schedule"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openAppointmentModal(req, "REJECT")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject Request
                      </button>

                      <button
                        type="button"
                        onClick={() => openAppointmentModal(req, "MESSAGES")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 hover:bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Messages &amp; Replies ({buildConversationTimeline(req).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => openAppointmentModal(req, "NONE")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] hover:bg-slate-50 dark:hover:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Full Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENT MANAGEMENT (Section 3.D) */}
      {activeTab === "APPOINTMENTS" && (
        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 dark:border-white/10 p-4 sm:p-5 space-y-4">
            {/* Quick Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "ALL", label: "All Records" },
                  { id: "UPCOMING", label: "Upcoming Appointments" },
                  { id: "TODAY", label: "Today's Consultations" },
                  { id: "COMPLETED", label: "Completed" },
                  { id: "NO_SHOW", label: "No-Show Outcomes" },
                  { id: "REJECTED", label: "Rejected Requests" },
                  { id: "CANCELLED", label: "Cancelled" },
                ] as const
              ).map((bucket) => (
                <button
                  key={bucket.id}
                  type="button"
                  onClick={() => setQuickBucket(bucket.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    quickBucket === bucket.id
                      ? "bg-[#D97706] text-white"
                      : "bg-slate-100 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5"
                  }`}
                >
                  {bucket.label}
                </button>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      fetchAppointments(1);
                    }
                  }}
                  placeholder="Search student name, subject, or consultation reason..."
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ConsultationStatus | "ALL");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="RESCHEDULE_REQUESTED">Reschedule Proposed</option>
                <option value="APPROVED">Approved</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                aria-label="Filter by subject"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="ALL">All Assigned Subjects</option>
                {instructorSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by meeting type"
                value={meetingTypeFilter}
                onChange={(e) => {
                  setMeetingTypeFilter(e.target.value as ConsultationMeetingType | "ALL");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="ALL">All Meeting Modes</option>
                <option value="FACE_TO_FACE">Face-to-Face</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Reason for Consultation</th>
                  <th className="py-3 px-4">Scheduled Date &amp; Time</th>
                  <th className="py-3 px-4">Meeting Type</th>
                  <th className="py-3 px-4">Status / Outcome</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
                {displayedAppointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-slate-500 dark:text-slate-400"
                    >
                      No consultations match your current filter selection.
                    </td>
                  </tr>
                ) : (
                  displayedAppointments.map((appt) => {
                    const badge = STATUS_BADGE_MAP[appt.status] ?? STATUS_BADGE_MAP.PENDING;
                    return (
                      <tr
                        key={appt.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {appt.student.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {appt.student.id.slice(0, 8).toUpperCase()} •{" "}
                            {appt.student.program || "IBE"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {appt.subject.title}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-900 dark:text-white line-clamp-2">
                            {appt.reason}
                          </div>
                          {appt.messages.length > 0 && (
                            <div className="mt-1 rounded-md border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#10131B] px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                              <strong>
                                {appt.messages[appt.messages.length - 1].senderName}:
                              </strong>{" "}
                              {appt.messages[appt.messages.length - 1].message}
                            </div>
                          )}
                          {appt.attachments.length > 0 && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <FileText className="h-3 w-3" />
                              {appt.attachments.length} document
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {formatManilaDate(appt.requestedStartAt)}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {formatManilaTimeRange(appt.requestedStartAt, appt.requestedEndAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                          {appt.meetingType === "ONLINE" ? "Online" : "Face-to-Face"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            {appt.attendanceOutcome === "NO_SHOW" && (
                              <span className="rounded border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                                Attendance: No-Show
                              </span>
                            )}
                            {appt.attendanceOutcome === "ATTENDED" && (
                              <span className="rounded border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                Attendance: Attended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openAppointmentModal(appt, "MESSAGES")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Messages ({buildConversationTimeline(appt).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => openAppointmentModal(appt, "NONE")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Page {page} of {totalPages} ({total} total records)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONSULTATION CALENDAR (Daily, Weekly, Monthly views) */}
      {activeTab === "CALENDAR" && (
        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Instructor Schedule &amp; Consultation Calendar (Asia/Manila)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                View your recurring availability windows, blocked dates, and scheduled student appointments across daily, weekly, and monthly views.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] p-0.5">
                {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCalendarView(mode)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      calendarView === mode
                        ? "bg-[#D97706] text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {mode === "DAILY" ? "Daily" : mode === "WEEKLY" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => shiftCalendarAnchor(-1)}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] p-1.5 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={calendarAnchorDate}
                onChange={(e) => setCalendarAnchorDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => shiftCalendarAnchor(1)}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] p-1.5 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={`grid gap-3 ${
              calendarView === "DAILY"
                ? "grid-cols-1"
                : calendarView === "WEEKLY"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
                  : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-7"
            }`}
          >
            {calendarDays.map((dayObj) => {
              const dateIso = formatManilaDateInput(dayObj);
              const dow = getManilaDayOfWeek(dayObj);
              const dayAvail = availability.filter(
                (a) => a.dayOfWeek === dow && a.isActive,
              );
              const dayAppts = appointments.filter(
                (a) =>
                  formatManilaDateInput(a.requestedStartAt) === dateIso &&
                  a.status !== "CANCELLED" &&
                  a.status !== "REJECTED",
              );
              const dayBlocked = blockedDates.filter(
                (b) =>
                  formatManilaDateInput(b.startAt) <= dateIso &&
                  formatManilaDateInput(b.endAt) >= dateIso,
              );

              return (
                <div
                  key={dateIso}
                  className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3 min-h-[140px] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-1.5 mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {DAY_NAMES[dow].slice(0, 3)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {dateIso}
                      </span>
                    </div>

                    {dayBlocked.length > 0 && (
                      <div className="mb-1.5 rounded bg-rose-50 dark:bg-rose-500/10 border border-rose-200/70 dark:border-rose-500/20 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                        Blocked: {dayBlocked[0].reason || "Unavailable"}
                      </div>
                    )}

                    {dayAvail.map((win) => (
                      <div
                        key={win.id}
                        className={`mb-1.5 rounded px-2 py-1 text-[10px] font-medium ${
                          win.isSuspended
                            ? "bg-slate-200 dark:bg-white/5 text-slate-500 line-through"
                            : "bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        Avail: {formatTimeLabel(win.startTime)}–{formatTimeLabel(win.endTime)}
                      </div>
                    ))}

                    <div className="space-y-1.5 mt-2">
                      {dayAppts.map((appt) => (
                        <button
                          key={appt.id}
                          type="button"
                          onClick={() => openAppointmentModal(appt)}
                          className="w-full text-left rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-[#141721] p-1.5 text-[11px] hover:border-amber-500 shadow-2xs cursor-pointer"
                        >
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {appt.student.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {formatManilaTimeRange(appt.requestedStartAt, appt.requestedEndAt)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MANAGE AVAILABILITY & BLOCKED DATES (Section 3.B) */}
      {activeTab === "AVAILABILITY" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Configure Recurring Weekly Availability Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {editingAvailabilityId
                  ? "Edit Availability Window"
                  : "Add Recurring Weekly Availability"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Configure your weekly consultation slots. Changes to availability never silently cancel already approved or confirmed appointments.
              </p>

              {availFeedback && (
                <div
                  className={`mt-3 rounded-lg border p-3 text-xs font-medium ${
                    availFeedback.type === "error"
                      ? "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {availFeedback.message}
                </div>
              )}

              <form onSubmit={handleSaveAvailability} className="mt-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Available Day
                    </label>
                    <select
                      value={availDayOfWeek}
                      onChange={(e) => setAvailDayOfWeek(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                      {DAY_NAMES.map((day, idx) => (
                        <option key={day} value={idx}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Slot Duration
                    </label>
                    <select
                      value={availSlotDuration}
                      onChange={(e) =>
                        setAvailSlotDuration(Number(e.target.value) as SlotDurationMinutes)
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={availStartTime}
                      onChange={(e) => setAvailStartTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={availEndTime}
                      onChange={(e) => setAvailEndTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Max Appointments / Day
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      required
                      value={availMaxPerDay}
                      onChange={(e) => setAvailMaxPerDay(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Meeting Type
                    </label>
                    <select
                      value={availMeetingType}
                      onChange={(e) =>
                        setAvailMeetingType(e.target.value as AvailabilityMeetingType)
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="BOTH">Face-to-Face &amp; Online</option>
                      <option value="FACE_TO_FACE">Face-to-Face Only</option>
                      <option value="ONLINE">Online Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Consultation Location (Room / Office)
                  </label>
                  <input
                    type="text"
                    value={availLocation}
                    onChange={(e) => setAvailLocation(e.target.value)}
                    placeholder="e.g., IBE Faculty Room 204"
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Online Meeting Link / Info
                  </label>
                  <input
                    type="text"
                    value={availMeetingLink}
                    onChange={(e) => setAvailMeetingLink(e.target.value)}
                    placeholder="e.g., https://meet.google.com/..."
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {editingAvailabilityId && (
                    <button
                      type="button"
                      onClick={() => setEditingAvailabilityId(null)}
                      className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={availSaving}
                    className="rounded-lg bg-[#D97706] hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    {availSaving
                      ? "Saving..."
                      : editingAvailabilityId
                        ? "Update Availability"
                        : "Add Availability Period"}
                  </button>
                </div>
              </form>
            </div>

            {/* Block Unavailable Dates */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-rose-500" />
                Block Unavailable Dates
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Block specific dates for institutional events, exams, or leave.
              </p>

              <form onSubmit={handleCreateBlockedDate} className="mt-3 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={blockDateStart}
                      onChange={(e) => setBlockDateStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={blockDateEnd}
                      onChange={(e) => setBlockDateEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g., IBE Department Research Colloquium"
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={blockSaving}
                  className="w-full rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                >
                  {blockSaving ? "Blocking..." : "Block Selected Date Range"}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Published Availability Windows & Blocked Dates List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Published Weekly Availability Periods
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overlapping periods on the same day are automatically prevented. You may temporarily suspend or edit any window.
              </p>

              <div className="mt-4 space-y-3">
                {availability.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                    No recurring consultation availability configured yet.
                  </p>
                ) : (
                  availability.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {DAY_NAMES[slot.dayOfWeek]}
                          </span>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            {formatTimeLabel(slot.startTime)} – {formatTimeLabel(slot.endTime)}
                          </span>
                          <span className="rounded bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {slot.slotDuration} min slots
                          </span>
                          {slot.isSuspended ? (
                            <span className="rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              Suspended
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Max {slot.maxAppointmentsPerDay}/day • Mode: {slot.meetingType} •{" "}
                          {slot.location || "No room specified"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSuspendAvailability(slot)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {slot.isSuspended ? (
                            <>
                              <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />
                              Resume
                            </>
                          ) : (
                            <>
                              <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                              Suspend
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingAvailabilityId(slot.id);
                            setAvailDayOfWeek(slot.dayOfWeek);
                            setAvailStartTime(slot.startTime);
                            setAvailEndTime(slot.endTime);
                            setAvailSlotDuration(slot.slotDuration);
                            setAvailMaxPerDay(slot.maxAppointmentsPerDay);
                            setAvailMeetingType(slot.meetingType);
                            setAvailLocation(slot.location ?? "");
                            setAvailMeetingLink(slot.meetingLink ?? "");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAvailability(slot.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Blocked Dates List */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Blocked Unavailable Dates
              </h2>
              <div className="mt-3 space-y-2">
                {blockedDates.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No blocked dates configured.
                  </p>
                ) : (
                  blockedDates.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatManilaDate(b.startAt)} — {formatManilaDate(b.endAt)}
                        </span>
                        {b.reason && (
                          <p className="text-slate-500 dark:text-slate-400">{b.reason}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlockedDate(b.id)}
                        className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL 1: APPROVE CONSULTATION SCHEDULE */}
      {activeAppointment && decisionMode === "APPROVE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                  Approve Consultation Schedule
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student: <strong>{activeAppointment.student.name}</strong> • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppointment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3 font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Schedule Being Approved
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatManilaDate(activeAppointment.requestedStartAt)} •{" "}
                  {formatManilaTimeRange(
                    activeAppointment.requestedStartAt,
                    activeAppointment.requestedEndAt,
                  )}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Mode:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {activeAppointment.meetingType === "ONLINE"
                      ? "Online Consultation"
                      : "Face-to-Face Consultation"}
                  </strong>
                </div>
                <div className="pt-1 text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-800 dark:text-slate-200">
                    Student&apos;s Reason:
                  </strong>{" "}
                  {activeAppointment.reason}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Meeting Location (Room / Office)
                  </label>
                  <input
                    type="text"
                    value={meetingLocationInput}
                    onChange={(e) => setMeetingLocationInput(e.target.value)}
                    placeholder="e.g., IBE Faculty Consultation Room"
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Online Meeting Link
                  </label>
                  <input
                    type="text"
                    value={meetingLinkInput}
                    onChange={(e) => setMeetingLinkInput(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Instructor Response / Preparation Note{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={instructorResponse}
                  onChange={(e) => setInstructorResponse(e.target.value)}
                  placeholder="Add any preparation instructions, required documents, or confirmation notes for the student..."
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setDecisionMode("NONE")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                View Full Details &amp; Messages
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAppointment(null)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAppointmentDecision("APPROVE")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  {actionLoading ? "Approving..." : "Confirm Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL 2: PROPOSE ANOTHER SCHEDULE */}
      {activeAppointment && decisionMode === "RESCHEDULE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-500/10 border border-purple-200/70 dark:border-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <Clock className="h-3.5 w-3.5" />
                  Propose Another Schedule
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student: <strong>{activeAppointment.student.name}</strong> • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppointment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3 font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Student&apos;s Originally Requested Schedule
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatManilaDate(activeAppointment.requestedStartAt)} •{" "}
                  {formatManilaTimeRange(
                    activeAppointment.requestedStartAt,
                    activeAppointment.requestedEndAt,
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 pt-1">
                  The student will receive a notification and must explicitly accept the proposed schedule before the appointment becomes confirmed.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Proposed Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={formatManilaDateInput(new Date())}
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Time (Manila) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={proposedStartTime}
                    onChange={(e) => setProposedStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Slot Duration <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={proposedDuration}
                    onChange={(e) =>
                      setProposedDuration(Number(e.target.value) as SlotDurationMinutes)
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Meeting Location (Room / Office)
                  </label>
                  <input
                    type="text"
                    value={meetingLocationInput}
                    onChange={(e) => setMeetingLocationInput(e.target.value)}
                    placeholder="e.g., IBE Faculty Consultation Room"
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Online Meeting Link
                  </label>
                  <input
                    type="text"
                    value={meetingLinkInput}
                    onChange={(e) => setMeetingLinkInput(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Message / Note to Student
                </label>
                <textarea
                  rows={2}
                  value={instructorResponse}
                  onChange={(e) => setInstructorResponse(e.target.value)}
                  placeholder="Explain why you are proposing this alternative schedule..."
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setDecisionMode("NONE")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                View Full Details &amp; Messages
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAppointment(null)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAppointmentDecision("PROPOSE_RESCHEDULE")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {actionLoading ? "Sending Proposal..." : "Send Proposed Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL 3: REJECT CONSULTATION REQUEST */}
      {activeAppointment && decisionMode === "REJECT" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200/70 dark:border-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <XCircle className="h-3.5 w-3.5" />
                  Reject Consultation Request
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student: <strong>{activeAppointment.student.name}</strong> • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppointment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3 font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Requested Consultation Details
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatManilaDate(activeAppointment.requestedStartAt)} •{" "}
                  {formatManilaTimeRange(
                    activeAppointment.requestedStartAt,
                    activeAppointment.requestedEndAt,
                  )}
                </div>
                <div className="text-slate-600 dark:text-slate-300 pt-1">
                  <strong className="text-slate-800 dark:text-slate-200">
                    Student&apos;s Reason:
                  </strong>{" "}
                  {activeAppointment.reason}
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-1.5">
                  Rejection Reason (Required) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a clear academic or scheduling reason for declining this consultation request..."
                  className="w-full rounded-lg border border-rose-300 dark:border-rose-500/30 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  This reason will be recorded on the appointment and shared with the student.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setDecisionMode("NONE")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                View Full Details &amp; Messages
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAppointment(null)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAppointmentDecision("REJECT")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {actionLoading ? "Declining..." : "Submit Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL 4: CANCEL APPOINTMENT */}
      {activeAppointment && decisionMode === "CANCEL" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200/70 dark:border-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Scheduled Consultation
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student: <strong>{activeAppointment.student.name}</strong> • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppointment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-1.5">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Provide a reason for cancelling this consultation appointment..."
                  className="w-full rounded-lg border border-rose-300 dark:border-rose-500/30 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setDecisionMode("NONE")}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Back to Details
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAppointment(null)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAppointmentDecision("CANCEL")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL 5: FULL CONSULTATION DETAILS & COMMUNICATION THREAD */}
      {activeAppointment && decisionMode === "NONE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_BADGE_MAP[activeAppointment.status]?.className ?? ""
                    }`}
                  >
                    {STATUS_BADGE_MAP[activeAppointment.status]?.label ??
                      activeAppointment.status}
                  </span>
                  {activeAppointment.attendanceOutcome === "NO_SHOW" && (
                    <span className="rounded border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Marked No-Show
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student: <strong>{activeAppointment.student.name}</strong> (ID:{" "}
                  {activeAppointment.student.id.slice(0, 8).toUpperCase()}) • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveAppointment(null);
                  if (searchParams.get("appointmentId")) {
                    router.replace("/ibe/consultation-management");
                  }
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Proposed Schedule Callout if RESCHEDULE_REQUESTED */}
              {activeAppointment.status === "RESCHEDULE_REQUESTED" &&
                activeAppointment.proposedStartAt &&
                activeAppointment.proposedEndAt && (
                  <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-4 text-xs">
                    <span className="font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                      Proposed Schedule Sent to Student (Awaiting Student Acceptance)
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {formatManilaDate(activeAppointment.proposedStartAt)} •{" "}
                      {formatManilaTimeRange(
                        activeAppointment.proposedStartAt,
                        activeAppointment.proposedEndAt,
                      )}
                    </p>
                    {activeAppointment.instructorResponse && (
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        Note: &ldquo;{activeAppointment.instructorResponse}&rdquo;
                      </p>
                    )}
                  </div>
                )}

              {/* Student & Schedule Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 text-xs">
                <div>
                  <span className="font-semibold uppercase text-slate-400">
                    Requested Consultation Schedule
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatManilaDate(activeAppointment.requestedStartAt)}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {formatManilaTimeRange(
                      activeAppointment.requestedStartAt,
                      activeAppointment.requestedEndAt,
                    )}{" "}
                    (Asia/Manila)
                  </p>
                </div>
                <div>
                  <span className="font-semibold uppercase text-slate-400">
                    Student Information
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {activeAppointment.student.name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {activeAppointment.student.email} •{" "}
                    {activeAppointment.student.program || "IBE"}
                  </p>
                </div>
              </div>

              {/* Student Reason & Message */}
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3.5">
                  <span className="font-semibold uppercase text-slate-500">
                    Student&apos;s Reason for Consultation
                  </span>
                  <p className="mt-1 text-sm text-slate-900 dark:text-white whitespace-pre-line">
                    {activeAppointment.reason}
                  </p>
                </div>
                {activeAppointment.additionalMessage && (
                  <div className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3.5">
                    <span className="font-semibold uppercase text-slate-500">
                      Additional Message
                    </span>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white whitespace-pre-line">
                      {activeAppointment.additionalMessage}
                    </p>
                  </div>
                )}
                {activeAppointment.instructorResponse && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 p-3.5">
                    <span className="font-semibold uppercase text-blue-800 dark:text-blue-300">
                      Instructor Response
                    </span>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white whitespace-pre-line">
                      {activeAppointment.instructorResponse}
                    </p>
                  </div>
                )}
                {activeAppointment.rejectionReason && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 p-3.5">
                    <span className="font-semibold uppercase text-rose-800 dark:text-rose-300">
                      Rejection Reason
                    </span>
                    <p className="mt-1 text-sm text-rose-900 dark:text-rose-200 whitespace-pre-line">
                      {activeAppointment.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Supporting Documents */}
              {activeAppointment.attachments.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Uploaded Supporting Documents
                  </h3>
                  <div className="space-y-2">
                    {activeAppointment.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {att.originalFileName}
                          </span>
                          <span className="text-slate-400">
                            ({(att.fileSize / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {att.mimeType === "application/pdf" && (
                            <a
                              href={`${att.downloadUrl}?inline=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-200"
                            >
                              View PDF
                            </a>
                          )}
                          <a
                            href={att.downloadUrl}
                            className="rounded-lg bg-[#D97706] hover:bg-amber-700 px-2.5 py-1 font-semibold text-white"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Action Buttons to Launch Dedicated Action Modals */}
              {["PENDING", "RESCHEDULE_REQUESTED", "APPROVED", "CONFIRMED"].includes(
                activeAppointment.status,
              ) && (
                <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Instructor Decision &amp; Schedule Actions
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(activeAppointment.status === "PENDING" ||
                      activeAppointment.status === "RESCHEDULE_REQUESTED") && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDecisionMode("APPROVE")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionMode("RESCHEDULE")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Propose Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionMode("REJECT")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {(activeAppointment.status === "APPROVED" ||
                      activeAppointment.status === "CONFIRMED") && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleAppointmentDecision("COMPLETE")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleAppointmentDecision("MARK_NO_SHOW")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 cursor-pointer"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Mark No-Show
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionMode("RESCHEDULE")}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 cursor-pointer"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionMode("CANCEL")}
                          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Communication History */}
              <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Student &amp; Instructor Messages ({buildConversationTimeline(activeAppointment).length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3">
                  {buildConversationTimeline(activeAppointment).map((m) => {
                    const isInstructor = m.senderRole === "INSTRUCTOR";
                    return (
                      <div
                        key={m.id}
                        className={`rounded-lg border p-2.5 text-xs ${
                          isInstructor
                            ? "border-blue-200/80 dark:border-blue-500/25 bg-blue-50/60 dark:bg-blue-500/10"
                            : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721]"
                        }`}
                      >
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {m.senderName} ({isInstructor ? "INSTRUCTOR" : "STUDENT"})
                            </span>
                            {m.badgeLabel && (
                              <span className="rounded bg-slate-200/70 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                {m.badgeLabel}
                              </span>
                            )}
                          </div>
                          <span>{formatManilaDate(m.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-line">
                          {m.message}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Write a reply to ${activeAppointment.student.name}...`}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97706] hover:bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Reply
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL 6: CONSULTATION MESSAGES & REPLIES THREAD */}
      {activeAppointment && decisionMode === "MESSAGES" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Consultation Messages &amp; Replies
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      STATUS_BADGE_MAP[activeAppointment.status]?.className ?? ""
                    }`}
                  >
                    {STATUS_BADGE_MAP[activeAppointment.status]?.label ??
                      activeAppointment.status}
                  </span>
                </div>
                <h2 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student: <strong>{activeAppointment.student.name}</strong> • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionMode("NONE")}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Full Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAppointment(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 max-h-96 overflow-y-auto">
                {buildConversationTimeline(activeAppointment).map((entry) => {
                  const isInstructor = entry.senderRole === "INSTRUCTOR";
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-xl border p-3.5 text-xs ${
                        isInstructor
                          ? "border-blue-200/80 dark:border-blue-500/25 bg-blue-50/60 dark:bg-blue-500/10 ml-4"
                          : "border-amber-200/80 dark:border-amber-500/25 bg-white dark:bg-[#141721] mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {entry.senderName}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              isInstructor
                                ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                                : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {isInstructor ? "Instructor (You)" : "Student"}
                          </span>
                          {entry.badgeLabel && (
                            <span className="rounded bg-slate-200/70 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                              {entry.badgeLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatManilaDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {entry.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Reply to ${activeAppointment.student.name}...`}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97706] hover:bg-amber-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  {sendingMessage ? "Sending..." : "Send Reply"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
