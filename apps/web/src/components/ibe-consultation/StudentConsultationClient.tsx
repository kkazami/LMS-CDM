"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Search,
  Plus,
  FileText,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Video,
  MapPin,
  Send,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageSquare,
  UserCheck,
  BookOpen,
  CalendarClock,
  Ban,
  RefreshCw,
  Check,
  XCircle,
  GraduationCap,
} from "lucide-react";
import type {
  AppointmentDTO,
  AvailableSlotDTO,
  ConsultationMeetingType,
  ConsultationStatus,
  EnrolledSubjectOption,
  StudentConsultationStats,
} from "@/lib/ibe-consultation/types";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  DAY_NAMES,
  MAX_ATTACHMENT_BYTES,
  formatManilaDate,
  formatManilaDateInput,
  formatManilaTimeRange,
  formatTimeLabel,
} from "@/lib/ibe-consultation/rules";

interface StudentConsultationClientProps {
  studentName: string;
  studentProgram: string | null;
  initialStats: StudentConsultationStats;
  initialSubjects: EnrolledSubjectOption[];
  initialAppointments: AppointmentDTO[];
  initialTotal: number;
}

type StudentTab = "OVERVIEW" | "INSTRUCTORS";

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
    label: "Schedule Proposed",
    className:
      "bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  },
  REJECTED: {
    label: "Declined",
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

export default function StudentConsultationClient({
  studentName,
  studentProgram,
  initialStats,
  initialSubjects,
  initialAppointments,
  initialTotal,
}: StudentConsultationClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StudentTab>("OVERVIEW");
  const [stats, setStats] = useState<StudentConsultationStats>(initialStats);
  const [subjects] = useState<EnrolledSubjectOption[]>(initialSubjects);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>(initialAppointments);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | "ALL">("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [meetingTypeFilter, setMeetingTypeFilter] =
    useState<ConsultationMeetingType | "ALL">("ALL");
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // Request Form Modal
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjects[0]?.subjectId ?? "",
  );
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(
    initialSubjects[0]?.instructor.id ?? "",
  );
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return formatManilaDateInput(tomorrow);
  });
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotDTO[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlotDTO | null>(null);
  const [meetingType, setMeetingType] = useState<ConsultationMeetingType>("FACE_TO_FACE");
  const [consultationTitle, setConsultationTitle] = useState<string>("");
  const [consultationReason, setConsultationReason] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Appointment Detail & Messages Modal
  const [activeAppointment, setActiveAppointment] = useState<AppointmentDTO | null>(null);
  const [studentModalMode, setStudentModalMode] = useState<"DETAILS" | "MESSAGES">("DETAILS");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [showCancelPrompt, setShowCancelPrompt] = useState<boolean>(false);
  const [declineNote, setDeclineNote] = useState<string>("");
  const [showDeclinePrompt, setShowDeclinePrompt] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Selected subject object
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.subjectId === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  );

  // Sync instructor automatically when subject changes
  useEffect(() => {
    if (selectedSubject) {
      setSelectedInstructorId(selectedSubject.instructor.id);
    } else {
      setSelectedInstructorId("");
    }
    setSelectedSlot(null);
  }, [selectedSubject]);

  // Fetch appointments list with filters
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
        if (data.stats || data.studentStats) {
          setStats(data.stats ?? data.studentStats);
        }
      } finally {
        setLoadingList(false);
      }
    },
    [page, pageSize, statusFilter, subjectFilter, meetingTypeFilter, searchQuery],
  );

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

  // Handle deep-linked appointmentId in URL
  useEffect(() => {
    const deepId = searchParams.get("appointmentId");
    if (!deepId) return;
    const existing = appointments.find((a) => a.id === deepId);
    if (existing) {
      setActiveAppointment(existing);
      return;
    }
    fetch(`/api/ibe/consultation/appointments/${encodeURIComponent(deepId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.appointment) {
          setActiveAppointment(data.appointment);
        }
      })
      .catch(() => {});
  }, [searchParams, appointments]);

  // Load slots when subject + instructor + preferredDate are selected
  useEffect(() => {
    if (!showRequestModal || !selectedSubjectId || !selectedInstructorId || !preferredDate) {
      setAvailableSlots([]);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);
    setSlotsReason(null);
    setSelectedSlot(null);

    const params = new URLSearchParams({
      subjectId: selectedSubjectId,
      instructorId: selectedInstructorId,
      date: preferredDate,
    });

    fetch(`/api/ibe/consultation/slots?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setAvailableSlots([]);
          setSlotsReason(data.error || "Unable to load schedule slots.");
          return;
        }
        const slots: AvailableSlotDTO[] = data.slots ?? [];
        setAvailableSlots(slots);
        if (data.blockedReason) {
          setSlotsReason(`Instructor is unavailable on this date: ${data.blockedReason}`);
        } else if (slots.length === 0) {
          setSlotsReason(
            "No published availability slots on this date. Select one of the instructor's published consultation days.",
          );
        } else {
          const firstAvailable = slots.find((s) => s.available) ?? null;
          setSelectedSlot(firstAvailable);
          if (firstAvailable && firstAvailable.meetingType !== "BOTH") {
            setMeetingType(firstAvailable.meetingType);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableSlots([]);
          setSlotsReason("Failed to load instructor availability.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showRequestModal, selectedSubjectId, selectedInstructorId, preferredDate]);

  // File change handler with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAttachmentFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const dotIndex = lowerName.lastIndexOf(".");
    const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : "";

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext as ".pdf" | ".doc" | ".docx")) {
      setFileError("Unsupported file format. Please upload a PDF, DOC, or DOCX document.");
      e.target.value = "";
      setAttachmentFile(null);
      return;
    }

    if (file.size <= 0) {
      setFileError("The selected file is empty.");
      e.target.value = "";
      setAttachmentFile(null);
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError("File size exceeds the 10 MB maximum limit.");
      e.target.value = "";
      setAttachmentFile(null);
      return;
    }

    setAttachmentFile(file);
  };

  const handleRemoveFile = () => {
    setAttachmentFile(null);
    setFileError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit consultation request with XMLHttpRequest for upload progress
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedSubjectId) {
      setFormError("Please select an enrolled subject.");
      return;
    }
    if (!selectedInstructorId) {
      setFormError("Please select the assigned instructor.");
      return;
    }
    if (!consultationReason.trim()) {
      setFormError("Please explain your reason for consultation.");
      return;
    }
    if (!selectedSlot || !selectedSlot.available) {
      setFormError("Please select an available consultation time slot.");
      return;
    }

    setSubmittingRequest(true);
    setUploadProgress(attachmentFile ? 5 : 30);

    try {
      const resolvedTitle =
        consultationTitle.trim() ||
        (selectedSubject?.courseCode
          ? `${selectedSubject.courseCode} Academic Consultation`
          : "Academic Consultation");
      const formData = new FormData();
      formData.set("subjectId", selectedSubjectId);
      formData.set("instructorId", selectedInstructorId);
      formData.set("availabilityId", selectedSlot.availabilityId);
      formData.set("title", resolvedTitle);
      formData.set("reason", consultationReason.trim());
      if (additionalMessage.trim()) {
        formData.set("additionalMessage", additionalMessage.trim());
      }
      formData.set("preferredDate", selectedSlot.dateKey || preferredDate);
      formData.set("startTime", selectedSlot.startTime);
      formData.set("endTime", selectedSlot.endTime);
      formData.set("requestedStartAt", selectedSlot.startAt);
      formData.set("requestedEndAt", selectedSlot.endAt);
      formData.set("meetingType", meetingType);
      if (attachmentFile) {
        formData.set("file", attachmentFile);
        formData.set("attachment", attachmentFile);
      }

      const response = await new Promise<{
        ok: boolean;
        status: number;
        body: Record<string, unknown>;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/ibe/consultation/appointments");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
            setUploadProgress(pct);
          }
        };
        xhr.onload = () => {
          setUploadProgress(100);
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(xhr.responseText || "{}");
          } catch {
            parsed = {};
          }
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            body: parsed,
          });
        };
        xhr.onerror = () =>
          reject(new Error("Network error while submitting consultation request."));
        xhr.send(formData);
      });

      if (!response.ok) {
        setFormError(
          (typeof response.body.error === "string" && response.body.error) ||
            "Unable to submit consultation request.",
        );
        setUploadProgress(0);
        return;
      }

      setFormSuccess("Your consultation request has been submitted and sent to your instructor.");
      setConsultationTitle("");
      setConsultationReason("");
      setAdditionalMessage("");
      handleRemoveFile();
      await fetchAppointments(1);
      setPage(1);

      setTimeout(() => {
        setShowRequestModal(false);
        setFormSuccess(null);
      }, 900);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit consultation request.");
      setUploadProgress(0);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Appointment status action handler (Accept/Decline proposed schedule, Confirm, Cancel)
  const handleStatusAction = async (
    action: "ACCEPT_RESCHEDULE" | "DECLINE_RESCHEDULE" | "CONFIRM" | "CANCEL",
    extraPayload: Record<string, unknown> = {},
  ) => {
    if (!activeAppointment) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/ibe/consultation/appointments/${activeAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...extraPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "Unable to update appointment.");
        return;
      }
      if (data.appointment) {
        setActiveAppointment(data.appointment);
        setAppointments((prev) =>
          prev.map((a) => (a.id === data.appointment.id ? data.appointment : a)),
        );
      }
      if (data.stats || data.studentStats) {
        setStats(data.stats ?? data.studentStats);
      }
      const actionSuccessMessage =
        action === "ACCEPT_RESCHEDULE"
          ? "Proposed schedule accepted! Your consultation appointment is now confirmed."
          : action === "DECLINE_RESCHEDULE"
            ? "Proposed schedule declined."
            : action === "CONFIRM"
              ? "Consultation appointment confirmed."
              : "Consultation appointment cancelled.";
      setActionSuccess(actionSuccessMessage);
      setShowCancelPrompt(false);
      setShowDeclinePrompt(false);
      setCancelReason("");
      setDeclineNote("");
      await fetchAppointments(page);
    } catch {
      setActionError("Network error while updating appointment.");
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
      setActionSuccess("Message sent to your instructor.");
      await fetchAppointments(page);
    } catch {
      setActionError("Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
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
                IBE Consultation &amp; Scheduling
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                Academic Consultation &amp; Appointment Hub
                {studentProgram ? ` • ${studentProgram}` : ""}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Welcome,{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {studentName}
              </span>
              . Request formal academic consultations with your enrolled subject instructors,
              attach supporting letters, and track appointment approvals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchAppointments(page)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setShowRequestModal(true);
              }}
              disabled={subjects.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Request Consultation
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards (Section 2.A) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Consultation Requests
            </span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalRequests}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            All submitted requests
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Awaiting review or confirmation
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Approved &amp; confirmed slots
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scheduled ahead in Manila time
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Fulfilled academic sessions
          </p>
        </div>
      </div>

      {/* Clean Underline Tabs — Matches IBE WordWise & IBE Learning Hub */}
      <div className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Overview &amp; Appointment History ({total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("INSTRUCTORS")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "INSTRUCTORS"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Find an Instructor ({subjects.length})
        </button>
      </div>

      {/* Enrolled Subjects & Assigned Instructors Directory (Section 2.B) */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-500" />
              Find an Instructor by Enrolled Subject
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select one of your currently enrolled IBE subjects to view your assigned instructor&apos;s published consultation hours and request an appointment.
            </p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-[#10131B] p-6 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No active IBE course enrollments found.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Once you are enrolled in an approved IBE subject, your assigned instructors and their consultation schedules will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subj) => {
              const activeWindows = subj.availability.filter(
                (a) => a.isActive && !a.isSuspended,
              );
              return (
                <div
                  key={subj.subjectId}
                  className="flex flex-col justify-between rounded-xl border-2 border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-[#10131B] p-4 hover:border-slate-300 dark:hover:border-white/25 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        {subj.subjectTitle}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {activeWindows.length} schedule window
                        {activeWindows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                      {subj.instructor.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {subj.instructor.email}
                    </p>

                    <div className="mt-3 space-y-1.5 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 p-2.5">
                      {activeWindows.length === 0 ? (
                        <p className="text-xs italic text-slate-500 dark:text-slate-400">
                          No active recurring hours published yet
                        </p>
                      ) : (
                        activeWindows.slice(0, 3).map((win) => (
                          <div
                            key={win.id}
                            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {DAY_NAMES[win.dayOfWeek]}
                            </span>
                            <span>
                              {formatTimeLabel(win.startTime)} – {formatTimeLabel(win.endTime)} (
                              {win.slotDuration}m)
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(subj.subjectId);
                      setSelectedInstructorId(subj.instructor.id);
                      setFormError(null);
                      setFormSuccess(null);
                      setShowRequestModal(true);
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#D97706] hover:bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Request Consultation
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Appointment History Table & Filters (Section 2.A) */}
      {activeTab === "OVERVIEW" && (
        <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 dark:border-white/10 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Appointment &amp; Consultation History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track approval statuses, review instructor responses, accept proposed schedules, or manage your consultations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[220px] flex-1 sm:flex-initial">
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
                    placeholder="Search instructor, subject, or reason..."
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Status Filter */}
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
                  <option value="RESCHEDULE_REQUESTED">Schedule Proposed</option>
                  <option value="APPROVED">Approved</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                {/* Subject Filter */}
                <select
                  aria-label="Filter by subject"
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">All Enrolled Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.subjectTitle}
                    </option>
                  ))}
                </select>

                {/* Meeting Type Filter */}
                <select
                  aria-label="Filter by meeting type"
                  value={meetingTypeFilter}
                  onChange={(e) => {
                    setMeetingTypeFilter(e.target.value as ConsultationMeetingType | "ALL");
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">All Meeting Types</option>
                  <option value="FACE_TO_FACE">Face-to-Face</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Reason for Consultation</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Requested Time</th>
                  <th className="py-3 px-4">Meeting Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
                {appointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-500 dark:text-slate-400"
                    >
                      No consultation records match your current filters.
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => {
                    const badge = STATUS_BADGE_MAP[appt.status] ?? STATUS_BADGE_MAP.PENDING;
                    const effectiveStart =
                      appt.status === "RESCHEDULE_REQUESTED" && appt.proposedStartAt
                        ? appt.proposedStartAt
                        : appt.requestedStartAt;
                    const effectiveEnd =
                      appt.status === "RESCHEDULE_REQUESTED" && appt.proposedEndAt
                        ? appt.proposedEndAt
                        : appt.requestedEndAt;

                    return (
                      <tr
                        key={appt.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {appt.instructor.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {appt.instructor.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {appt.subject.title}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-900 dark:text-white line-clamp-2">
                            {appt.reason}
                          </div>
                          {appt.instructorResponse && (
                            <div className="mt-1 rounded-md border border-blue-200/70 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-500/10 px-2 py-1 text-[11px] text-blue-800 dark:text-blue-300 line-clamp-2">
                              <strong>Instructor Reply:</strong> {appt.instructorResponse}
                            </div>
                          )}
                          {appt.rejectionReason && (
                            <div className="mt-1 rounded-md border border-rose-200/70 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/10 px-2 py-1 text-[11px] text-rose-800 dark:text-rose-300 line-clamp-2">
                              <strong>Declined Reason:</strong> {appt.rejectionReason}
                            </div>
                          )}
                          {!appt.instructorResponse &&
                            !appt.rejectionReason &&
                            appt.messages.length > 0 && (
                              <div className="mt-1 rounded-md border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#10131B] px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                                <strong>
                                  {appt.messages[appt.messages.length - 1].senderName}:
                                </strong>{" "}
                                {appt.messages[appt.messages.length - 1].message}
                              </div>
                            )}
                          {appt.attachments.length > 0 && (
                            <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <FileText className="h-3 w-3" />
                              {appt.attachments.length} attachment
                              {appt.attachments.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <div>{formatManilaDate(effectiveStart)}</div>
                          {appt.status === "RESCHEDULE_REQUESTED" && (
                            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                              Proposed by instructor
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatManilaTimeRange(effectiveStart, effectiveEnd)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {appt.meetingType === "ONLINE" ? (
                              <>
                                <Video className="h-3.5 w-3.5 text-blue-500" />
                                Online
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                Face-to-Face
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            {appt.attendanceOutcome === "NO_SHOW" && (
                              <span className="inline-flex items-center rounded border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                                Marked No-Show
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAppointment(appt);
                                setStudentModalMode("MESSAGES");
                                setActionError(null);
                                setActionSuccess(null);
                                setShowCancelPrompt(false);
                                setShowDeclinePrompt(false);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Messages ({buildConversationTimeline(appt).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAppointment(appt);
                                setStudentModalMode("DETAILS");
                                setActionError(null);
                                setActionSuccess(null);
                                setShowCancelPrompt(false);
                                setShowDeclinePrompt(false);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {appt.status === "RESCHEDULE_REQUESTED"
                                ? "Review Proposal"
                                : "View Details"}
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {appointments.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(page * pageSize, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{total}</span>{" "}
              requests
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Consultation Request Modal (Section 2.C) */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Submit Consultation Request
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your enrolled subject and instructor, choose an available schedule slot, and describe your academic concern.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Enrolled Subject */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Enrolled Subject <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  >
                    {subjects.map((subj) => (
                      <option key={subj.subjectId} value={subj.subjectId}>
                        {subj.subjectTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Instructor */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned Instructor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedInstructorId}
                    onChange={(e) => setSelectedInstructorId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  >
                    {selectedSubject ? (
                      <option value={selectedSubject.instructor.id}>
                        {selectedSubject.instructor.name} ({selectedSubject.instructor.email})
                      </option>
                    ) : (
                      <option value="">Select an enrolled subject first</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Instructor Published Weekly Schedule Summary */}
              {selectedSubject && (
                <div className="rounded-lg border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 p-3.5">
                  <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1.5">
                    Instructor&apos;s Published Weekly Consultation Schedule (Asia/Manila)
                  </div>
                  {selectedSubject.availability.filter((a) => a.isActive && !a.isSuspended)
                    .length === 0 ? (
                    <p className="text-xs text-amber-800/80 dark:text-amber-400">
                      This instructor has not published active recurring consultation hours yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedSubject.availability
                        .filter((a) => a.isActive && !a.isSuspended)
                        .map((win) => (
                          <span
                            key={win.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/80 dark:border-amber-500/30 bg-white dark:bg-[#10131B] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                          >
                            <Calendar className="h-3 w-3 text-amber-500" />
                            <strong>{DAY_NAMES[win.dayOfWeek]}</strong>:{" "}
                            {formatTimeLabel(win.startTime)}–{formatTimeLabel(win.endTime)} (
                            {win.slotDuration}m)
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preferred Date & Meeting Type */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Preferred Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={formatManilaDateInput(new Date())}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Meeting Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={
                        selectedSlot !== null &&
                        selectedSlot.meetingType !== "BOTH" &&
                        selectedSlot.meetingType !== "FACE_TO_FACE"
                      }
                      onClick={() => setMeetingType("FACE_TO_FACE")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        meetingType === "FACE_TO_FACE"
                          ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] text-slate-700 dark:text-slate-300"
                      } disabled:opacity-40`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Face-to-Face
                    </button>
                    <button
                      type="button"
                      disabled={
                        selectedSlot !== null &&
                        selectedSlot.meetingType !== "BOTH" &&
                        selectedSlot.meetingType !== "ONLINE"
                      }
                      onClick={() => setMeetingType("ONLINE")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        meetingType === "ONLINE"
                          ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] text-slate-700 dark:text-slate-300"
                      } disabled:opacity-40`}
                    >
                      <Video className="h-3.5 w-3.5" />
                      Online
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Time Slot Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Available Time Slot <span className="text-rose-500">*</span>
                </label>
                {loadingSlots ? (
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 text-xs text-slate-500">
                    Loading instructor consultation slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-[#10131B] p-4 text-xs text-slate-600 dark:text-slate-400">
                    {slotsReason || "No time slots available on the selected date."}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.startAt === slot.startAt;
                      return (
                        <button
                          key={slot.startAt}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => {
                            setSelectedSlot(slot);
                            if (slot.meetingType !== "BOTH") {
                              setMeetingType(slot.meetingType);
                            }
                          }}
                          className={`flex flex-col items-start rounded-lg border p-2.5 text-left text-xs transition-colors cursor-pointer ${
                            !slot.available
                              ? "border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#10131B]/50 text-slate-400 cursor-not-allowed"
                              : isSelected
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] hover:border-amber-400 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <span className="font-semibold">{slot.label}</span>
                          <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {slot.available
                              ? slot.meetingType === "BOTH"
                                ? "F2F / Online"
                                : slot.meetingType === "ONLINE"
                                  ? "Online only"
                                  : "Face-to-Face"
                              : slot.unavailableReason || "Unavailable"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason for Consultation */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Consultation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  value={consultationReason}
                  onChange={(e) => setConsultationReason(e.target.value)}
                  placeholder="Describe your academic concern, specific topics to discuss, and expected outcomes..."
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Optional Additional Message */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Message{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={additionalMessage}
                  onChange={(e) => setAdditionalMessage(e.target.value)}
                  placeholder="Any preparation notes, group member names, or context for your instructor..."
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Optional Supporting Letter or Document (PDF, DOC, DOCX) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Supporting Letter or Document{" "}
                  <span className="text-slate-400 font-normal">
                    (Optional — PDF, DOC, DOCX up to 10 MB)
                  </span>
                </label>

                {!attachmentFile ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-[#10131B] px-4 py-4 hover:border-amber-500 transition-colors">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      Click to attach a formal consultation letter or supporting document
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500">
                      Accepted formats: .pdf, .doc, .docx (Max 10 MB)
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-5 w-5 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                            {attachmentFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(attachmentFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={submittingRequest}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>

                    {uploadProgress > 0 && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          <span>Uploading document...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                          <div
                            className="h-full bg-[#D97706] transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {fileError && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {fileError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submittingRequest}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || !selectedSlot?.available}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D97706] hover:bg-amber-700 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {submittingRequest ? "Submitting Request..." : "Submit Consultation Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Student Consultation Messages & Replies Modal */}
      {activeAppointment && studentModalMode === "MESSAGES" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Messages &amp; Replies
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
                  Instructor: <strong>{activeAppointment.instructor.name}</strong> • Subject:{" "}
                  <strong>{activeAppointment.subject.title}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudentModalMode("DETAILS")}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Full Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAppointment(null);
                    if (searchParams.get("appointmentId")) {
                      router.replace("/ibe/consultation");
                    }
                  }}
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

              {/* Proposed Schedule Quick Action inside Messages Modal */}
              {activeAppointment.status === "RESCHEDULE_REQUESTED" &&
                activeAppointment.proposedStartAt &&
                activeAppointment.proposedEndAt && (
                  <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-4 text-xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                          Proposed Schedule from Instructor
                        </span>
                        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                          {formatManilaDate(activeAppointment.proposedStartAt)} •{" "}
                          {formatManilaTimeRange(
                            activeAppointment.proposedStartAt,
                            activeAppointment.proposedEndAt,
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleStatusAction("ACCEPT_RESCHEDULE")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept Schedule
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            handleStatusAction("DECLINE_RESCHEDULE", {
                              cancellationReason: "Student declined the proposed schedule.",
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-white dark:bg-[#10131B] px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </button>
                      </div>
                    </div>
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
                          ? "border-blue-200/80 dark:border-blue-500/25 bg-blue-50/60 dark:bg-blue-500/10 mr-4"
                          : "border-amber-200/80 dark:border-amber-500/25 bg-white dark:bg-[#141721] ml-4"
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
                            {isInstructor ? "Instructor" : "Student"}
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
                  placeholder={`Reply to ${activeAppointment.instructor.name}...`}
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

      {/* Appointment Details & Tracking Drawer/Modal (Section 2.D) */}
      {activeAppointment && studentModalMode === "DETAILS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xl my-8 max-h-[92vh] flex flex-col">
            {/* Header */}
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
                    <span className="inline-flex items-center rounded border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Attendance Outcome: No-Show
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                  {activeAppointment.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Subject: <strong>{activeAppointment.subject.title}</strong> • Instructor:{" "}
                  <strong>{activeAppointment.instructor.name}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudentModalMode("MESSAGES")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Messages ({buildConversationTimeline(activeAppointment).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAppointment(null);
                    if (searchParams.get("appointmentId")) {
                      router.replace("/ibe/consultation");
                    }
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-5">
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

              {/* Proposed Schedule Banner (When RESCHEDULE_REQUESTED) */}
              {activeAppointment.status === "RESCHEDULE_REQUESTED" &&
                activeAppointment.proposedStartAt &&
                activeAppointment.proposedEndAt && (
                  <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                          New Schedule Proposed by Instructor
                        </span>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {formatManilaDate(activeAppointment.proposedStartAt)} •{" "}
                          {formatManilaTimeRange(
                            activeAppointment.proposedStartAt,
                            activeAppointment.proposedEndAt,
                          )}
                        </p>
                        {activeAppointment.instructorResponse && (
                          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                            Note: &ldquo;{activeAppointment.instructorResponse}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleStatusAction("ACCEPT_RESCHEDULE")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept Proposed Schedule
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setShowDeclinePrompt((v) => !v)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-white dark:bg-[#10131B] hover:bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </button>
                      </div>
                    </div>

                    {showDeclinePrompt && (
                      <div className="mt-3 border-t border-purple-200 dark:border-purple-500/20 pt-3 space-y-2">
                        <input
                          type="text"
                          value={declineNote}
                          onChange={(e) => setDeclineNote(e.target.value)}
                          placeholder="Reason for declining the proposed schedule..."
                          className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDeclinePrompt(false)}
                            className="rounded px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() =>
                              handleStatusAction("DECLINE_RESCHEDULE", {
                                cancellationReason:
                                  declineNote.trim() ||
                                  "Student declined the proposed schedule.",
                              })
                            }
                            className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Confirm Decline
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Schedule & Meeting Metadata Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 text-xs">
                <div>
                  <span className="font-semibold uppercase text-slate-400">
                    Requested Schedule
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
                    Meeting Mode &amp; Details
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {activeAppointment.meetingType === "ONLINE"
                      ? "Online Consultation"
                      : "Face-to-Face Consultation"}
                  </p>
                  {activeAppointment.meetingLocation && (
                    <p className="text-slate-600 dark:text-slate-400">
                      Location: {activeAppointment.meetingLocation}
                    </p>
                  )}
                  {activeAppointment.meetingLink && (
                    <p className="text-blue-600 dark:text-blue-400 truncate">
                      Link:{" "}
                      <a
                        href={activeAppointment.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {activeAppointment.meetingLink}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Reason & Additional Message */}
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason for Consultation
                  </span>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {activeAppointment.reason}
                  </p>
                </div>

                {activeAppointment.additionalMessage && (
                  <div className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Additional Message
                    </span>
                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {activeAppointment.additionalMessage}
                    </p>
                  </div>
                )}

                {activeAppointment.instructorResponse && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      Instructor Response
                    </span>
                    <p className="mt-1 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-line">
                      {activeAppointment.instructorResponse}
                    </p>
                  </div>
                )}

                {activeAppointment.rejectionReason && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Rejection Reason
                    </span>
                    <p className="mt-1 text-sm text-rose-900 dark:text-rose-200 whitespace-pre-line">
                      {activeAppointment.rejectionReason}
                    </p>
                  </div>
                )}

                {activeAppointment.cancellationReason && (
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cancellation Reason
                    </span>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {activeAppointment.cancellationReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Attached Documents */}
              {activeAppointment.attachments.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Supporting Documents
                  </h3>
                  <div className="space-y-2">
                    {activeAppointment.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">
                              {att.originalFileName}
                            </p>
                            <p className="text-slate-500">
                              {(att.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {att.mimeType === "application/pdf" && (
                            <a
                              href={`${att.downloadUrl}?inline=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View PDF
                            </a>
                          )}
                          <a
                            href={att.downloadUrl}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#D97706] hover:bg-amber-700 px-2.5 py-1 font-semibold text-white"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consultation Messages Thread */}
              <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Consultation Messages &amp; Replies ({buildConversationTimeline(activeAppointment).length})
                </h3>

                <div className="max-h-60 overflow-y-auto space-y-2.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-3">
                  {buildConversationTimeline(activeAppointment).map((msg) => {
                    const isInstructor = msg.senderRole === "INSTRUCTOR";
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-lg border p-2.5 text-xs ${
                          isInstructor
                            ? "border-blue-200/80 dark:border-blue-500/25 bg-blue-50/60 dark:bg-blue-500/10"
                            : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {msg.senderName} ({isInstructor ? "INSTRUCTOR" : "STUDENT"})
                            </span>
                            {msg.badgeLabel && (
                              <span className="rounded bg-slate-200/70 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                {msg.badgeLabel}
                              </span>
                            )}
                          </div>
                          <span>{formatManilaDate(msg.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-line">
                          {msg.message}
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
                    placeholder={`Write a reply to ${activeAppointment.instructor.name}...`}
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

              {/* Cancel Appointment Prompt */}
              {showCancelPrompt && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/10 p-4 space-y-3">
                  <label className="block text-xs font-semibold uppercase text-rose-800 dark:text-rose-300">
                    Reason for Cancellation <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please explain why you need to cancel this consultation..."
                    className="w-full rounded-lg border border-rose-300 dark:border-rose-500/30 bg-white dark:bg-[#10131B] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Keep Appointment
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading || cancelReason.trim().length < 3}
                      onClick={() =>
                        handleStatusAction("CANCEL", {
                          cancellationReason: cancelReason.trim(),
                        })
                      }
                      className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-6 py-3.5">
              <div>
                {["PENDING", "APPROVED", "CONFIRMED", "RESCHEDULE_REQUESTED"].includes(
                  activeAppointment.status,
                ) &&
                  !showCancelPrompt && (
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 px-3.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel Appointment
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={() => setActiveAppointment(null)}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
