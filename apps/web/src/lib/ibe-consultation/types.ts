/**
 * Shared types and DTOs for the IBE Consultation & Appointment Scheduling System.
 * Exclusive to Colegio de Montalban – Institute of Business and Entrepreneurship (IBE).
 */

export const CONSULTATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RESCHEDULE_REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const CONSULTATION_MEETING_TYPES = ["FACE_TO_FACE", "ONLINE"] as const;
export type ConsultationMeetingType = (typeof CONSULTATION_MEETING_TYPES)[number];

export const AVAILABILITY_MEETING_TYPES = [
  "FACE_TO_FACE",
  "ONLINE",
  "BOTH",
] as const;
export type AvailabilityMeetingType = (typeof AVAILABILITY_MEETING_TYPES)[number];

export const SLOT_DURATIONS = [15, 30, 60] as const;
export type SlotDurationMinutes = (typeof SLOT_DURATIONS)[number];

export const ATTENDANCE_OUTCOMES = ["COMPLETED", "ATTENDED", "NO_SHOW"] as const;
export type AttendanceOutcome = (typeof ATTENDANCE_OUTCOMES)[number];

export type ConsultationActorRole = "STUDENT" | "INSTRUCTOR";

export interface ConsultationActor {
  userId: string;
  name: string;
  email: string;
  role: ConsultationActorRole;
  instituteId: string;
  instituteCode: "ibe";
  studentNumber?: string | null;
  programCode?: "BSBA HRM" | "BS ENTREP" | null;
}

export interface InstructorAvailabilityDTO {
  id: string;
  instructorId: string;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  dayName: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  slotDuration: SlotDurationMinutes;
  maxAppointmentsPerDay: number;
  meetingType: AvailabilityMeetingType;
  location: string;
  meetingLink: string;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorBlockedDateDTO {
  id: string;
  instructorId: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdAt: string;
}

export interface AvailableSlotDTO {
  availabilityId: string;
  dateKey: string; // "YYYY-MM-DD" in Asia/Manila
  startTime: string; // "HH:mm" in Asia/Manila
  endTime: string; // "HH:mm" in Asia/Manila
  startAt: string; // ISO UTC string
  endAt: string; // ISO UTC string
  label: string; // e.g. "09:00 AM – 09:30 AM"
  slotDuration: SlotDurationMinutes;
  meetingType: AvailabilityMeetingType;
  location: string;
  meetingLink: string;
  isAvailable: boolean;
  available: boolean;
  unavailableReason?: string;
}

export interface EnrolledInstructorOptionDTO {
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  department: string;
  avatarUrl: string | null;
  availabilities: InstructorAvailabilityDTO[];
  blockedDates: InstructorBlockedDateDTO[];
}

export interface EnrolledSubjectOptionDTO {
  subjectId: string; // Course.id
  subjectTitle: string; // Display title e.g. "ENT101 — Entrepreneurial Mind"
  courseCode: string; // Course.code
  courseTitle: string; // Course.title
  section: string;
  room: string;
  instructor: {
    id: string;
    name: string;
    email: string;
    department: string;
    avatarUrl: string | null;
  };
  availability: InstructorAvailabilityDTO[];
  blockedDates: InstructorBlockedDateDTO[];
  instructors: EnrolledInstructorOptionDTO[];
}

export type EnrolledSubjectOption = EnrolledSubjectOptionDTO;

export interface AppointmentAttachmentDTO {
  id: string;
  appointmentId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface AppointmentMessageDTO {
  id: string;
  appointmentId: string;
  senderId: string;
  senderName: string;
  senderRole: ConsultationActorRole;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentDTO {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  studentEmail: string;
  student: {
    id: string;
    name: string;
    email: string;
    studentNumber: string | null;
    program: string | null;
  };
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  subjectSection: string;
  subject: {
    id: string;
    code: string;
    title: string;
    section: string;
    room: string;
  };
  availabilityId: string | null;
  title: string;
  reason: string;
  additionalMessage: string | null;
  requestedStartAt: string;
  requestedEndAt: string;
  proposedStartAt: string | null;
  proposedEndAt: string | null;
  effectiveStartAt: string;
  effectiveEndAt: string;
  dateKey: string; // "YYYY-MM-DD" in Asia/Manila for effectiveStartAt
  timeRangeLabel: string; // e.g. "09:00 AM – 09:30 AM" in Asia/Manila
  requestedDateKey: string;
  requestedTimeRangeLabel: string;
  proposedDateKey: string | null;
  proposedTimeRangeLabel: string | null;
  meetingType: ConsultationMeetingType;
  meetingLocation: string | null;
  meetingLink: string | null;
  status: ConsultationStatus;
  attendanceOutcome: AttendanceOutcome | null;
  instructorResponse: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  cancelledByRole: ConsultationActorRole | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: AppointmentAttachmentDTO[];
  messages: AppointmentMessageDTO[];
}

export interface StudentConsultationStatsDTO {
  totalRequests: number;
  pendingRequests: number;
  approvedAppointments: number;
  upcomingConsultations: number;
  completedConsultations: number;
}

export type StudentConsultationStats = StudentConsultationStatsDTO;

export interface InstructorConsultationStatsDTO {
  totalRequests: number;
  pendingRequests: number;
  approvedAppointments: number;
  todaysConsultations: number;
  upcomingConsultations: number;
  completedConsultations: number;
}

export type InstructorConsultationStats = InstructorConsultationStatsDTO;
