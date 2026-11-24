import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { ConsultationHttpError, ensureConsultationTables } from "./access";
import {
  canAccessAppointment,
  computeAvailableSlotsForDate,
  findConflictingAppointment,
  findOverlappingAvailability,
  formatManilaDateDisplay,
  formatManilaTimeRangeLabel,
  getEffectiveWindow,
  getManilaDayOfWeek,
  IBE_CONSULTATION_INSTITUTE_CODE,
  intervalsOverlap,
  isValidDateKey,
  manilaDateTimeToUtc,
  normalizeConsultationRole,
  toManilaDateKey,
  validateAvailabilityInput,
  validateConsultationAttachmentBytes,
  validateMeetingTypeSelection,
  validateStatusTransition,
  WEEKDAY_NAMES,
  type AppointmentMutationAction,
  type AvailabilityInput,
} from "./rules";
import type {
  AppointmentAttachmentDTO,
  AppointmentDTO,
  AppointmentMessageDTO,
  AttendanceOutcome,
  AvailabilityMeetingType,
  AvailableSlotDTO,
  ConsultationActor,
  ConsultationActorRole,
  ConsultationMeetingType,
  ConsultationStatus,
  EnrolledSubjectOptionDTO,
  InstructorAvailabilityDTO,
  InstructorBlockedDateDTO,
  InstructorConsultationStatsDTO,
  SlotDurationMinutes,
  StudentConsultationStatsDTO,
} from "./types";

const STUDENT_CONSULTATION_PATH = "/ibe/consultation";
const INSTRUCTOR_CONSULTATION_PATH = "/ibe/consultation-management";

type SqlExecutor = Pick<typeof db, "$queryRaw" | "$executeRaw">;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toNullableDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

// ─── Row Shapes & DTO Mappers ────────────────────────────────────────────────

export interface AvailabilityDbRow {
  id: string;
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxAppointmentsPerDay: number;
  meetingType: string;
  location: string;
  meetingLink: string;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BlockedDateDbRow {
  id: string;
  instructorId: string;
  startAt: Date | string;
  endAt: Date | string;
  reason: string;
  createdAt: Date | string;
}

export function toAvailabilityDTO(row: AvailabilityDbRow): InstructorAvailabilityDTO {
  const dayOfWeek = Number(row.dayOfWeek);
  return {
    id: row.id,
    instructorId: row.instructorId,
    dayOfWeek,
    dayName: WEEKDAY_NAMES[dayOfWeek] ?? "Monday",
    startTime: row.startTime,
    endTime: row.endTime,
    slotDuration: (Number(row.slotDuration) as SlotDurationMinutes) || 30,
    maxAppointmentsPerDay: Number(row.maxAppointmentsPerDay) || 8,
    meetingType: (row.meetingType as AvailabilityMeetingType) || "BOTH",
    location: row.location ?? "",
    meetingLink: row.meetingLink ?? "",
    isActive: Boolean(row.isActive),
    isSuspended: Boolean(row.isSuspended),
    createdAt: toDate(row.createdAt).toISOString(),
    updatedAt: toDate(row.updatedAt).toISOString(),
  };
}

export function toBlockedDateDTO(row: BlockedDateDbRow): InstructorBlockedDateDTO {
  return {
    id: row.id,
    instructorId: row.instructorId,
    startAt: toDate(row.startAt).toISOString(),
    endAt: toDate(row.endAt).toISOString(),
    reason: row.reason ?? "",
    createdAt: toDate(row.createdAt).toISOString(),
  };
}

export interface AppointmentRowWithRelations {
  id: string;
  studentId: string;
  instructorId: string;
  subjectId: string;
  availabilityId: string | null;
  title: string;
  reason: string;
  additionalMessage: string | null;
  requestedStartAt: Date;
  requestedEndAt: Date;
  proposedStartAt: Date | null;
  proposedEndAt: Date | null;
  meetingType: string;
  meetingLocation: string | null;
  meetingLink: string | null;
  status: string;
  attendanceOutcome: string | null;
  instructorResponse: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  cancelledByRole: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    name: string;
    email: string;
    studentNumber: string | null;
    role: string;
  };
  instructor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  subject: {
    id: string;
    code: string;
    title: string;
    section: string;
    room: string;
  };
  attachments: Array<{
    id: string;
    appointmentId: string;
    originalFileName: string;
    storedFileName: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Date;
  }>;
  messages: Array<{
    id: string;
    appointmentId: string;
    senderId: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    sender: {
      id: string;
      name: string;
      role: string;
    };
  }>;
}

interface RawJoinedAppointmentRow {
  id: string;
  studentId: string;
  instructorId: string;
  subjectId: string;
  availabilityId: string | null;
  title: string;
  reason: string;
  additionalMessage: string | null;
  requestedStartAt: Date | string;
  requestedEndAt: Date | string;
  proposedStartAt: Date | string | null;
  proposedEndAt: Date | string | null;
  meetingType: string;
  meetingLocation: string | null;
  meetingLink: string | null;
  status: string;
  attendanceOutcome: string | null;
  instructorResponse: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  cancelledByRole: string | null;
  confirmedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  studentName: string;
  studentEmail: string;
  studentStudentNumber: string | null;
  studentRole: string;
  instructorName: string;
  instructorEmail: string;
  instructorRole: string;
  subjectCode: string;
  subjectTitle: string;
  subjectSection: string;
  subjectRoom: string;
}

interface RawAttachmentRow {
  id: string;
  appointmentId: string;
  originalFileName: string;
  storedFileName: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date | string;
}

interface RawMessageRow {
  id: string;
  appointmentId: string;
  senderId: string;
  message: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  senderName: string;
  senderRole: string;
}

async function hydrateAppointmentsByIds(
  executor: SqlExecutor,
  appointmentIds: string[]
): Promise<AppointmentRowWithRelations[]> {
  if (appointmentIds.length === 0) return [];

  const [joinedRows, attachmentRows, messageRows] = await Promise.all([
    executor.$queryRaw<RawJoinedAppointmentRow[]>`
      SELECT
        a."id",
        a."studentId",
        a."instructorId",
        a."subjectId",
        a."availabilityId",
        a."title",
        a."reason",
        a."additionalMessage",
        a."requestedStartAt",
        a."requestedEndAt",
        a."proposedStartAt",
        a."proposedEndAt",
        a."meetingType",
        a."meetingLocation",
        a."meetingLink",
        a."status",
        a."attendanceOutcome",
        a."instructorResponse",
        a."rejectionReason",
        a."cancellationReason",
        a."cancelledByRole",
        a."confirmedAt",
        a."completedAt",
        a."createdAt",
        a."updatedAt",
        s."name" AS "studentName",
        s."email" AS "studentEmail",
        s."studentNumber" AS "studentStudentNumber",
        s."role" AS "studentRole",
        i."name" AS "instructorName",
        i."email" AS "instructorEmail",
        i."role" AS "instructorRole",
        c."code" AS "subjectCode",
        c."title" AS "subjectTitle",
        c."section" AS "subjectSection",
        c."room" AS "subjectRoom"
      FROM "Appointment" a
      INNER JOIN "User" s ON s."id" = a."studentId"
      INNER JOIN "User" i ON i."id" = a."instructorId"
      INNER JOIN "Course" c ON c."id" = a."subjectId"
      WHERE a."id" IN (${Prisma.join(appointmentIds)})
    `,
    executor.$queryRaw<RawAttachmentRow[]>`
      SELECT
        "id",
        "appointmentId",
        "originalFileName",
        "storedFileName",
        "storageKey",
        "mimeType",
        "fileSize",
        "uploadedAt"
      FROM "AppointmentAttachment"
      WHERE "appointmentId" IN (${Prisma.join(appointmentIds)})
      ORDER BY "uploadedAt" ASC
    `,
    executor.$queryRaw<RawMessageRow[]>`
      SELECT
        m."id",
        m."appointmentId",
        m."senderId",
        m."message",
        m."createdAt",
        m."updatedAt",
        u."name" AS "senderName",
        u."role" AS "senderRole"
      FROM "AppointmentMessage" m
      INNER JOIN "User" u ON u."id" = m."senderId"
      WHERE m."appointmentId" IN (${Prisma.join(appointmentIds)})
      ORDER BY m."createdAt" ASC
    `,
  ]);

  const attachmentsByAppt = new Map<string, AppointmentRowWithRelations["attachments"]>();
  for (const att of attachmentRows) {
    const list = attachmentsByAppt.get(att.appointmentId) ?? [];
    list.push({
      id: att.id,
      appointmentId: att.appointmentId,
      originalFileName: att.originalFileName,
      storedFileName: att.storedFileName,
      storageKey: att.storageKey,
      mimeType: att.mimeType,
      fileSize: Number(att.fileSize),
      uploadedAt: toDate(att.uploadedAt),
    });
    attachmentsByAppt.set(att.appointmentId, list);
  }

  const messagesByAppt = new Map<string, AppointmentRowWithRelations["messages"]>();
  for (const msg of messageRows) {
    const list = messagesByAppt.get(msg.appointmentId) ?? [];
    list.push({
      id: msg.id,
      appointmentId: msg.appointmentId,
      senderId: msg.senderId,
      message: msg.message,
      createdAt: toDate(msg.createdAt),
      updatedAt: toDate(msg.updatedAt),
      sender: {
        id: msg.senderId,
        name: msg.senderName,
        role: msg.senderRole,
      },
    });
    messagesByAppt.set(msg.appointmentId, list);
  }

  const byId = new Map<string, AppointmentRowWithRelations>();
  for (const r of joinedRows) {
    byId.set(r.id, {
      id: r.id,
      studentId: r.studentId,
      instructorId: r.instructorId,
      subjectId: r.subjectId,
      availabilityId: r.availabilityId ?? null,
      title: r.title,
      reason: r.reason,
      additionalMessage: r.additionalMessage ?? null,
      requestedStartAt: toDate(r.requestedStartAt),
      requestedEndAt: toDate(r.requestedEndAt),
      proposedStartAt: toNullableDate(r.proposedStartAt),
      proposedEndAt: toNullableDate(r.proposedEndAt),
      meetingType: r.meetingType,
      meetingLocation: r.meetingLocation ?? null,
      meetingLink: r.meetingLink ?? null,
      status: r.status,
      attendanceOutcome: r.attendanceOutcome ?? null,
      instructorResponse: r.instructorResponse ?? null,
      rejectionReason: r.rejectionReason ?? null,
      cancellationReason: r.cancellationReason ?? null,
      cancelledByRole: r.cancelledByRole ?? null,
      confirmedAt: toNullableDate(r.confirmedAt),
      completedAt: toNullableDate(r.completedAt),
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      student: {
        id: r.studentId,
        name: r.studentName,
        email: r.studentEmail,
        studentNumber: r.studentStudentNumber ?? null,
        role: r.studentRole,
      },
      instructor: {
        id: r.instructorId,
        name: r.instructorName,
        email: r.instructorEmail,
        role: r.instructorRole,
      },
      subject: {
        id: r.subjectId,
        code: r.subjectCode,
        title: r.subjectTitle,
        section: r.subjectSection,
        room: r.subjectRoom,
      },
      attachments: attachmentsByAppt.get(r.id) ?? [],
      messages: messagesByAppt.get(r.id) ?? [],
    });
  }

  // Preserve requested order
  const ordered: AppointmentRowWithRelations[] = [];
  for (const id of appointmentIds) {
    const item = byId.get(id);
    if (item) ordered.push(item);
  }
  return ordered;
}

async function fetchAppointmentById(
  executor: SqlExecutor,
  appointmentId: string
): Promise<AppointmentRowWithRelations | null> {
  const rows = await hydrateAppointmentsByIds(executor, [appointmentId]);
  return rows[0] ?? null;
}

export function toAppointmentDTO(row: AppointmentRowWithRelations): AppointmentDTO {
  const effective = getEffectiveWindow(row);
  const requestedDateKey = toManilaDateKey(row.requestedStartAt);
  const requestedTimeRangeLabel = formatManilaTimeRangeLabel(
    row.requestedStartAt,
    row.requestedEndAt
  );
  const proposedDateKey = row.proposedStartAt
    ? toManilaDateKey(row.proposedStartAt)
    : null;
  const proposedTimeRangeLabel =
    row.proposedStartAt && row.proposedEndAt
      ? formatManilaTimeRangeLabel(row.proposedStartAt, row.proposedEndAt)
      : null;

  const attachments: AppointmentAttachmentDTO[] = row.attachments.map((att) => ({
    id: att.id,
    appointmentId: att.appointmentId,
    originalFileName: att.originalFileName,
    storedFileName: att.storedFileName,
    mimeType: att.mimeType,
    fileSize: att.fileSize,
    uploadedAt: att.uploadedAt.toISOString(),
    downloadUrl: `/api/ibe/consultation/attachments/${att.id}`,
  }));

  const messages: AppointmentMessageDTO[] = row.messages.map((msg) => ({
    id: msg.id,
    appointmentId: msg.appointmentId,
    senderId: msg.senderId,
    senderName: msg.sender.name,
    senderRole: normalizeConsultationRole(msg.sender.role) ?? "STUDENT",
    message: msg.message,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
  }));

  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student.name,
    studentNumber: row.student.studentNumber ?? null,
    studentEmail: row.student.email,
    student: {
      id: row.student.id,
      name: row.student.name,
      email: row.student.email,
      studentNumber: row.student.studentNumber ?? null,
      program: null,
    },
    instructorId: row.instructorId,
    instructorName: row.instructor.name,
    instructorEmail: row.instructor.email,
    instructor: {
      id: row.instructor.id,
      name: row.instructor.name,
      email: row.instructor.email,
    },
    subjectId: row.subjectId,
    subjectCode: row.subject.code,
    subjectTitle: row.subject.title,
    subjectSection: row.subject.section,
    subject: {
      id: row.subject.id,
      code: row.subject.code,
      title: row.subject.title,
      section: row.subject.section,
      room: row.subject.room,
    },
    availabilityId: row.availabilityId ?? null,
    title: row.title,
    reason: row.reason,
    additionalMessage: row.additionalMessage ?? null,
    requestedStartAt: row.requestedStartAt.toISOString(),
    requestedEndAt: row.requestedEndAt.toISOString(),
    proposedStartAt: row.proposedStartAt?.toISOString() ?? null,
    proposedEndAt: row.proposedEndAt?.toISOString() ?? null,
    effectiveStartAt: effective.startAt.toISOString(),
    effectiveEndAt: effective.endAt.toISOString(),
    dateKey: toManilaDateKey(effective.startAt),
    timeRangeLabel: formatManilaTimeRangeLabel(effective.startAt, effective.endAt),
    requestedDateKey,
    requestedTimeRangeLabel,
    proposedDateKey,
    proposedTimeRangeLabel,
    meetingType: (row.meetingType as ConsultationMeetingType) || "FACE_TO_FACE",
    meetingLocation: row.meetingLocation ?? null,
    meetingLink: row.meetingLink ?? null,
    status: (row.status as ConsultationStatus) || "PENDING",
    attendanceOutcome: (row.attendanceOutcome as AttendanceOutcome | null) ?? null,
    instructorResponse: row.instructorResponse ?? null,
    rejectionReason: row.rejectionReason ?? null,
    cancellationReason: row.cancellationReason ?? null,
    cancelledByRole: (row.cancelledByRole as ConsultationActorRole | null) ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    attachments,
    messages,
  };
}

// ─── Student Enrolled Subjects & Instructors ─────────────────────────────────

/**
 * Returns ONLY the IBE courses/subjects the student is currently enrolled in (APPROVED),
 * along with the assigned IBE instructor(s) and their published availability.
 */
export async function getStudentEnrolledSubjectsWithInstructors(
  actor: ConsultationActor
): Promise<EnrolledSubjectOptionDTO[]> {
  await ensureConsultationTables();

  const enrollments = await db.enrollment.findMany({
    where: {
      studentId: actor.userId,
      status: "APPROVED",
      course: {
        instituteId: actor.instituteId,
        isArchived: false,
        instructorId: { not: null },
      },
    },
    include: {
      course: {
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              avatarUrl: true,
              role: true,
              isActive: true,
              instituteId: true,
            },
          },
        },
      },
    },
    orderBy: [{ displayOrderIndex: "asc" }, { createdAt: "desc" }],
  });

  const validEnrollments = enrollments.filter((enrollment) => {
    const inst = enrollment.course.instructor;
    return (
      inst &&
      inst.isActive &&
      inst.instituteId === actor.instituteId &&
      normalizeConsultationRole(inst.role) === "INSTRUCTOR"
    );
  });

  const instructorIds = Array.from(
    new Set(validEnrollments.map((e) => e.course.instructor!.id))
  );

  const availByInstructor = new Map<string, InstructorAvailabilityDTO[]>();
  const blockedByInstructor = new Map<string, InstructorBlockedDateDTO[]>();

  if (instructorIds.length > 0) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [availRows, blockedRows] = await Promise.all([
      db.$queryRaw<AvailabilityDbRow[]>`
        SELECT
          "id",
          "instructorId",
          "dayOfWeek",
          "startTime",
          "endTime",
          "slotDuration",
          "maxAppointmentsPerDay",
          "meetingType",
          "location",
          "meetingLink",
          "isActive",
          "isSuspended",
          "createdAt",
          "updatedAt"
        FROM "InstructorAvailability"
        WHERE "instructorId" IN (${Prisma.join(instructorIds)})
          AND "isActive" = true
        ORDER BY "dayOfWeek" ASC, "startTime" ASC
      `,
      db.$queryRaw<BlockedDateDbRow[]>`
        SELECT
          "id",
          "instructorId",
          "startAt",
          "endAt",
          "reason",
          "createdAt"
        FROM "InstructorBlockedDate"
        WHERE "instructorId" IN (${Prisma.join(instructorIds)})
          AND "endAt" >= ${cutoff}
        ORDER BY "startAt" ASC
      `,
    ]);

    for (const row of availRows) {
      const list = availByInstructor.get(row.instructorId) ?? [];
      list.push(toAvailabilityDTO(row));
      availByInstructor.set(row.instructorId, list);
    }

    for (const row of blockedRows) {
      const list = blockedByInstructor.get(row.instructorId) ?? [];
      list.push(toBlockedDateDTO(row));
      blockedByInstructor.set(row.instructorId, list);
    }
  }

  const subjects: EnrolledSubjectOptionDTO[] = [];

  for (const enrollment of validEnrollments) {
    const course = enrollment.course;
    const inst = course.instructor!;
    const instAvails = availByInstructor.get(inst.id) ?? [];
    const instBlocked = blockedByInstructor.get(inst.id) ?? [];

    subjects.push({
      subjectId: course.id,
      subjectTitle: course.code ? `${course.code} — ${course.title}` : course.title,
      courseCode: course.code,
      courseTitle: course.title,
      section: course.section,
      room: course.room,
      instructor: {
        id: inst.id,
        name: inst.name,
        email: inst.email,
        department: inst.department || "IBE Faculty",
        avatarUrl: inst.avatarUrl ?? null,
      },
      availability: instAvails,
      blockedDates: instBlocked,
      instructors: [
        {
          instructorId: inst.id,
          instructorName: inst.name,
          instructorEmail: inst.email,
          department: inst.department || "IBE Faculty",
          avatarUrl: inst.avatarUrl ?? null,
          availabilities: instAvails,
          blockedDates: instBlocked,
        },
      ],
    });
  }

  return subjects;
}

/**
 * Verifies on the backend that:
 * 1. The subject (Course) belongs to IBE and is active.
 * 2. The instructor is assigned to that subject and is an active IBE instructor.
 * 3. The student has an APPROVED enrollment in that subject.
 */
export async function verifyStudentSubjectInstructorEnrollment(params: {
  studentId: string;
  instituteId: string;
  subjectId: string;
  instructorId: string;
}) {
  const { studentId, instituteId, subjectId, instructorId } = params;

  const [course, enrollment] = await Promise.all([
    db.course.findFirst({
      where: {
        id: subjectId,
        instituteId,
        isArchived: false,
      },
      include: {
        institute: { select: { code: true } },
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            instituteId: true,
          },
        },
      },
    }),
    db.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: subjectId,
          studentId,
        },
      },
      select: { id: true, status: true },
    }),
  ]);

  if (
    !course ||
    course.institute.code.toLowerCase() !== IBE_CONSULTATION_INSTITUTE_CODE
  ) {
    throw new ConsultationHttpError(
      404,
      "The selected IBE subject could not be found."
    );
  }

  if (!enrollment || enrollment.status.toUpperCase() !== "APPROVED") {
    throw new ConsultationHttpError(
      403,
      "Forbidden: You can only request consultations for subjects in which you are currently enrolled."
    );
  }

  if (
    !course.instructor ||
    course.instructor.id !== instructorId ||
    course.instructor.instituteId !== instituteId ||
    !course.instructor.isActive ||
    normalizeConsultationRole(course.instructor.role) !== "INSTRUCTOR"
  ) {
    throw new ConsultationHttpError(
      403,
      "Forbidden: The selected instructor is not assigned to this enrolled subject."
    );
  }

  return { course, instructor: course.instructor };
}

/**
 * Computes available slots for a given instructor on a requested Asia/Manila dateKey.
 * If called by a student, verifies the student is enrolled in at least one subject with this instructor.
 */
export async function getInstructorAvailableSlotsForDate(params: {
  actor: ConsultationActor;
  instructorId: string;
  subjectId?: string;
  dateKey: string;
}): Promise<AvailableSlotDTO[]> {
  await ensureConsultationTables();
  const { actor, instructorId, subjectId, dateKey } = params;

  if (!isValidDateKey(dateKey)) {
    throw new ConsultationHttpError(400, "Invalid date format (expected YYYY-MM-DD).");
  }

  if (actor.role === "STUDENT") {
    if (subjectId) {
      await verifyStudentSubjectInstructorEnrollment({
        studentId: actor.userId,
        instituteId: actor.instituteId,
        subjectId,
        instructorId,
      });
    } else {
      const enrolledWithInstructor = await db.enrollment.findFirst({
        where: {
          studentId: actor.userId,
          status: "APPROVED",
          course: {
            instituteId: actor.instituteId,
            instructorId,
            isArchived: false,
          },
        },
        select: { id: true },
      });
      if (!enrolledWithInstructor) {
        throw new ConsultationHttpError(
          403,
          "Forbidden: You can only view availability for instructors of your enrolled subjects."
        );
      }
    }
  } else if (actor.role === "INSTRUCTOR" && actor.userId !== instructorId) {
    throw new ConsultationHttpError(
      403,
      "Forbidden: Instructors can only inspect their own consultation schedule."
    );
  }

  const dayOfWeek = getManilaDayOfWeek(dateKey);
  const dayStartUtc = manilaDateTimeToUtc(dateKey, "00:00");
  const dayEndUtc = manilaDateTimeToUtc(dateKey, "23:59");

  const [availabilities, blockedDates, existingAppointments] = await Promise.all([
    db.$queryRaw<AvailabilityDbRow[]>`
      SELECT
        "id",
        "instructorId",
        "dayOfWeek",
        "startTime",
        "endTime",
        "slotDuration",
        "maxAppointmentsPerDay",
        "meetingType",
        "location",
        "meetingLink",
        "isActive",
        "isSuspended",
        "createdAt",
        "updatedAt"
      FROM "InstructorAvailability"
      WHERE "instructorId" = ${instructorId}
        AND "dayOfWeek" = ${dayOfWeek}
        AND "isActive" = true
      ORDER BY "startTime" ASC
    `,
    db.$queryRaw<BlockedDateDbRow[]>`
      SELECT
        "id",
        "instructorId",
        "startAt",
        "endAt",
        "reason",
        "createdAt"
      FROM "InstructorBlockedDate"
      WHERE "instructorId" = ${instructorId}
        AND "startAt" <= ${dayEndUtc}
        AND "endAt" >= ${dayStartUtc}
    `,
    db.$queryRaw<
      Array<{
        id: string;
        status: string;
        requestedStartAt: Date | string;
        requestedEndAt: Date | string;
        proposedStartAt: Date | string | null;
        proposedEndAt: Date | string | null;
      }>
    >`
      SELECT
        "id",
        "status",
        "requestedStartAt",
        "requestedEndAt",
        "proposedStartAt",
        "proposedEndAt"
      FROM "Appointment"
      WHERE "instructorId" = ${instructorId}
        AND "status" IN ('APPROVED', 'CONFIRMED')
        AND (
          ("requestedStartAt" <= ${dayEndUtc} AND "requestedEndAt" >= ${dayStartUtc})
          OR ("proposedStartAt" <= ${dayEndUtc} AND "proposedEndAt" >= ${dayStartUtc})
        )
    `,
  ]);

  return computeAvailableSlotsForDate({
    dateKey,
    availabilities: availabilities.map(toAvailabilityDTO),
    blockedDates: blockedDates.map(toBlockedDateDTO),
    existingAppointments: existingAppointments.map((a) => ({
      id: a.id,
      status: a.status,
      requestedStartAt: toDate(a.requestedStartAt),
      requestedEndAt: toDate(a.requestedEndAt),
      proposedStartAt: toNullableDate(a.proposedStartAt),
      proposedEndAt: toNullableDate(a.proposedEndAt),
    })),
  });
}

// ─── Instructor Availability & Blocked Dates Management ──────────────────────

export async function getInstructorScheduleConfig(instructorId: string): Promise<{
  availabilities: InstructorAvailabilityDTO[];
  blockedDates: InstructorBlockedDateDTO[];
}> {
  await ensureConsultationTables();
  const [availabilities, blockedDates] = await Promise.all([
    db.$queryRaw<AvailabilityDbRow[]>`
      SELECT
        "id",
        "instructorId",
        "dayOfWeek",
        "startTime",
        "endTime",
        "slotDuration",
        "maxAppointmentsPerDay",
        "meetingType",
        "location",
        "meetingLink",
        "isActive",
        "isSuspended",
        "createdAt",
        "updatedAt"
      FROM "InstructorAvailability"
      WHERE "instructorId" = ${instructorId}
      ORDER BY "dayOfWeek" ASC, "startTime" ASC
    `,
    db.$queryRaw<BlockedDateDbRow[]>`
      SELECT
        "id",
        "instructorId",
        "startAt",
        "endAt",
        "reason",
        "createdAt"
      FROM "InstructorBlockedDate"
      WHERE "instructorId" = ${instructorId}
      ORDER BY "startAt" ASC
    `,
  ]);

  return {
    availabilities: availabilities.map(toAvailabilityDTO),
    blockedDates: blockedDates.map(toBlockedDateDTO),
  };
}

export async function createInstructorAvailability(
  actor: ConsultationActor,
  input: AvailabilityInput
): Promise<InstructorAvailabilityDTO> {
  await ensureConsultationTables();
  if (actor.role !== "INSTRUCTOR") {
    throw new ConsultationHttpError(
      403,
      "Only IBE instructors can configure consultation availability."
    );
  }

  const validated = validateAvailabilityInput(input);
  if (!validated.ok) {
    throw new ConsultationHttpError(400, validated.error);
  }

  const existing = await db.$queryRaw<
    Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>
  >`
    SELECT "id", "dayOfWeek", "startTime", "endTime"
    FROM "InstructorAvailability"
    WHERE "instructorId" = ${actor.userId}
      AND "dayOfWeek" = ${validated.value.dayOfWeek}
  `;

  const overlap = findOverlappingAvailability(validated.value, existing);
  if (overlap) {
    throw new ConsultationHttpError(
      409,
      `This schedule overlaps with your existing availability on ${
        WEEKDAY_NAMES[validated.value.dayOfWeek]
      } (${overlap.startTime} – ${overlap.endTime}).`
    );
  }

  const id = randomUUID();
  const now = new Date();
  const inserted = await db.$queryRaw<AvailabilityDbRow[]>`
    INSERT INTO "InstructorAvailability" (
      "id",
      "instructorId",
      "dayOfWeek",
      "startTime",
      "endTime",
      "slotDuration",
      "maxAppointmentsPerDay",
      "meetingType",
      "location",
      "meetingLink",
      "isActive",
      "isSuspended",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${id},
      ${actor.userId},
      ${validated.value.dayOfWeek},
      ${validated.value.startTime},
      ${validated.value.endTime},
      ${validated.value.slotDuration},
      ${validated.value.maxAppointmentsPerDay},
      ${validated.value.meetingType},
      ${validated.value.location},
      ${validated.value.meetingLink},
      ${validated.value.isActive},
      ${validated.value.isSuspended},
      ${now},
      ${now}
    )
    RETURNING
      "id",
      "instructorId",
      "dayOfWeek",
      "startTime",
      "endTime",
      "slotDuration",
      "maxAppointmentsPerDay",
      "meetingType",
      "location",
      "meetingLink",
      "isActive",
      "isSuspended",
      "createdAt",
      "updatedAt"
  `;

  return toAvailabilityDTO(inserted[0]);
}

export async function updateInstructorAvailability(
  actor: ConsultationActor,
  availabilityId: string,
  input: AvailabilityInput
): Promise<InstructorAvailabilityDTO> {
  await ensureConsultationTables();
  if (actor.role !== "INSTRUCTOR") {
    throw new ConsultationHttpError(403, "Forbidden.");
  }

  const currentRows = await db.$queryRaw<AvailabilityDbRow[]>`
    SELECT
      "id",
      "instructorId",
      "dayOfWeek",
      "startTime",
      "endTime",
      "slotDuration",
      "maxAppointmentsPerDay",
      "meetingType",
      "location",
      "meetingLink",
      "isActive",
      "isSuspended",
      "createdAt",
      "updatedAt"
    FROM "InstructorAvailability"
    WHERE "id" = ${availabilityId}
    LIMIT 1
  `;
  const current = currentRows[0];
  if (!current || current.instructorId !== actor.userId) {
    throw new ConsultationHttpError(404, "Availability schedule not found.");
  }

  const validated = validateAvailabilityInput({
    dayOfWeek: input.dayOfWeek ?? current.dayOfWeek,
    startTime: input.startTime ?? current.startTime,
    endTime: input.endTime ?? current.endTime,
    slotDuration: input.slotDuration ?? current.slotDuration,
    maxAppointmentsPerDay:
      input.maxAppointmentsPerDay ?? current.maxAppointmentsPerDay,
    meetingType: input.meetingType ?? current.meetingType,
    location: input.location ?? current.location,
    meetingLink: input.meetingLink ?? current.meetingLink,
    isActive: input.isActive ?? current.isActive,
    isSuspended: input.isSuspended ?? current.isSuspended,
  });

  if (!validated.ok) {
    throw new ConsultationHttpError(400, validated.error);
  }

  const existing = await db.$queryRaw<
    Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>
  >`
    SELECT "id", "dayOfWeek", "startTime", "endTime"
    FROM "InstructorAvailability"
    WHERE "instructorId" = ${actor.userId}
      AND "dayOfWeek" = ${validated.value.dayOfWeek}
  `;

  const overlap = findOverlappingAvailability(
    validated.value,
    existing,
    availabilityId
  );
  if (overlap) {
    throw new ConsultationHttpError(
      409,
      `This schedule overlaps with another availability period on ${
        WEEKDAY_NAMES[validated.value.dayOfWeek]
      } (${overlap.startTime} – ${overlap.endTime}).`
    );
  }

  const now = new Date();
  // Updating availability never silently cancels already approved or confirmed appointments.
  const updatedRows = await db.$queryRaw<AvailabilityDbRow[]>`
    UPDATE "InstructorAvailability"
    SET
      "dayOfWeek" = ${validated.value.dayOfWeek},
      "startTime" = ${validated.value.startTime},
      "endTime" = ${validated.value.endTime},
      "slotDuration" = ${validated.value.slotDuration},
      "maxAppointmentsPerDay" = ${validated.value.maxAppointmentsPerDay},
      "meetingType" = ${validated.value.meetingType},
      "location" = ${validated.value.location},
      "meetingLink" = ${validated.value.meetingLink},
      "isActive" = ${validated.value.isActive},
      "isSuspended" = ${validated.value.isSuspended},
      "updatedAt" = ${now}
    WHERE "id" = ${availabilityId}
    RETURNING
      "id",
      "instructorId",
      "dayOfWeek",
      "startTime",
      "endTime",
      "slotDuration",
      "maxAppointmentsPerDay",
      "meetingType",
      "location",
      "meetingLink",
      "isActive",
      "isSuspended",
      "createdAt",
      "updatedAt"
  `;

  return toAvailabilityDTO(updatedRows[0]);
}

export async function deleteInstructorAvailability(
  actor: ConsultationActor,
  availabilityId: string
): Promise<{ preservedAppointmentsCount: number }> {
  await ensureConsultationTables();
  if (actor.role !== "INSTRUCTOR") {
    throw new ConsultationHttpError(403, "Forbidden.");
  }

  const currentRows = await db.$queryRaw<Array<{ id: string; instructorId: string }>>`
    SELECT "id", "instructorId"
    FROM "InstructorAvailability"
    WHERE "id" = ${availabilityId}
    LIMIT 1
  `;
  const current = currentRows[0];
  if (!current || current.instructorId !== actor.userId) {
    throw new ConsultationHttpError(404, "Availability schedule not found.");
  }

  // Count any approved/confirmed appointments tied to this availability so we can report preservation;
  // FK is ON DELETE SET NULL so existing appointments are preserved intact.
  const countRows = await db.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS "count"
    FROM "Appointment"
    WHERE "availabilityId" = ${availabilityId}
      AND "status" IN ('APPROVED', 'CONFIRMED')
  `;
  const preservedAppointmentsCount = Number(countRows[0]?.count ?? 0);

  await db.$executeRaw`
    DELETE FROM "InstructorAvailability"
    WHERE "id" = ${availabilityId}
  `;

  return { preservedAppointmentsCount };
}

export async function createInstructorBlockedDate(
  actor: ConsultationActor,
  raw: { startAt?: unknown; endAt?: unknown; dateKey?: unknown; reason?: unknown }
): Promise<InstructorBlockedDateDTO> {
  await ensureConsultationTables();
  if (actor.role !== "INSTRUCTOR") {
    throw new ConsultationHttpError(403, "Forbidden.");
  }

  let startAt: Date;
  let endAt: Date;

  if (typeof raw.dateKey === "string" && isValidDateKey(raw.dateKey.trim())) {
    const dk = raw.dateKey.trim();
    startAt = manilaDateTimeToUtc(dk, "00:00");
    endAt = manilaDateTimeToUtc(dk, "23:59");
  } else {
    startAt = new Date(String(raw.startAt ?? ""));
    endAt = new Date(String(raw.endAt ?? ""));
  }

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new ConsultationHttpError(
      400,
      "Please provide a valid blocked date or time range."
    );
  }

  const reason =
    typeof raw.reason === "string" ? raw.reason.trim().slice(0, 300) : "";

  const id = randomUUID();
  const now = new Date();
  const inserted = await db.$queryRaw<BlockedDateDbRow[]>`
    INSERT INTO "InstructorBlockedDate" (
      "id",
      "instructorId",
      "startAt",
      "endAt",
      "reason",
      "createdAt"
    ) VALUES (
      ${id},
      ${actor.userId},
      ${startAt},
      ${endAt},
      ${reason},
      ${now}
    )
    RETURNING
      "id",
      "instructorId",
      "startAt",
      "endAt",
      "reason",
      "createdAt"
  `;

  return toBlockedDateDTO(inserted[0]);
}

export async function deleteInstructorBlockedDate(
  actor: ConsultationActor,
  blockedId: string
): Promise<void> {
  await ensureConsultationTables();
  if (actor.role !== "INSTRUCTOR") {
    throw new ConsultationHttpError(403, "Forbidden.");
  }

  const rows = await db.$queryRaw<Array<{ id: string; instructorId: string }>>`
    SELECT "id", "instructorId"
    FROM "InstructorBlockedDate"
    WHERE "id" = ${blockedId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.instructorId !== actor.userId) {
    throw new ConsultationHttpError(404, "Blocked date entry not found.");
  }

  await db.$executeRaw`
    DELETE FROM "InstructorBlockedDate"
    WHERE "id" = ${blockedId}
  `;
}

// ─── Student Consultation Request Submission ─────────────────────────────────

export interface SubmitConsultationRequestInput {
  subjectId: string;
  instructorId: string;
  availabilityId?: string | null;
  title?: string | null;
  reason: string;
  additionalMessage?: string | null;
  preferredDate: string; // "YYYY-MM-DD" in Asia/Manila
  startTime: string; // "HH:mm" in Asia/Manila
  endTime: string; // "HH:mm" in Asia/Manila
  meetingType: string; // "FACE_TO_FACE" | "ONLINE"
  attachmentFile?: {
    originalFileName: string;
    declaredMimeType: string;
    bytes: Uint8Array;
  } | null;
}

export async function submitStudentConsultationRequest(
  actor: ConsultationActor,
  input: SubmitConsultationRequestInput
): Promise<AppointmentDTO> {
  await ensureConsultationTables();

  if (actor.role !== "STUDENT") {
    throw new ConsultationHttpError(
      403,
      "Only IBE students can submit a consultation request."
    );
  }

  const rawTitle = (input.title || "").trim();
  const reason = (input.reason || "").trim();
  const additionalMessage = input.additionalMessage
    ? input.additionalMessage.trim()
    : null;

  if (rawTitle.length > 200) {
    throw new ConsultationHttpError(
      400,
      "Consultation title must be 200 characters or fewer."
    );
  }
  if (!reason) {
    throw new ConsultationHttpError(
      400,
      "Reason for consultation is required."
    );
  }
  if (reason.length > 5000) {
    throw new ConsultationHttpError(
      400,
      "Reason for consultation must be 5,000 characters or fewer."
    );
  }
  if (additionalMessage && additionalMessage.length > 5000) {
    throw new ConsultationHttpError(
      400,
      "Additional message must be 5,000 characters or fewer."
    );
  }

  // 1. Verify student enrollment & instructor assignment on the backend
  const { course, instructor } = await verifyStudentSubjectInstructorEnrollment({
    studentId: actor.userId,
    instituteId: actor.instituteId,
    subjectId: input.subjectId,
    instructorId: input.instructorId,
  });

  const title =
    rawTitle ||
    (course.code ? `${course.code} Academic Consultation` : "Academic Consultation");

  // 2. Verify date and time slot against instructor's published availability
  const slots = await getInstructorAvailableSlotsForDate({
    actor,
    instructorId: instructor.id,
    subjectId: course.id,
    dateKey: input.preferredDate,
  });

  const matchingSlot = slots.find(
    (s) =>
      s.startTime === input.startTime.trim() &&
      s.endTime === input.endTime.trim() &&
      (!input.availabilityId || s.availabilityId === input.availabilityId)
  );

  if (!matchingSlot) {
    throw new ConsultationHttpError(
      400,
      "The selected consultation date and time slot is not part of the instructor's published availability."
    );
  }

  if (!matchingSlot.isAvailable) {
    throw new ConsultationHttpError(
      409,
      matchingSlot.unavailableReason ||
        "The selected time slot is no longer available."
    );
  }

  // 3. Validate meeting type compatibility with the slot
  const meetingTypeCheck = validateMeetingTypeSelection(
    input.meetingType,
    matchingSlot.meetingType
  );
  if (!meetingTypeCheck.ok) {
    throw new ConsultationHttpError(400, meetingTypeCheck.error);
  }

  // 4. Validate optional attachment before opening DB transaction
  let validatedAttachment: {
    originalFileName: string;
    storedFileName: string;
    canonicalMimeType: string;
    bytes: Buffer;
    sha256: string;
  } | null = null;

  if (input.attachmentFile) {
    const cleanOriginalName =
      path
        .basename(input.attachmentFile.originalFileName.replace(/\\/g, "/"))
        .replace(/[\x00-\x1f\x7f]/g, "")
        .slice(0, 200) || "consultation-document.pdf";

    const check = validateConsultationAttachmentBytes(
      input.attachmentFile.bytes,
      cleanOriginalName,
      input.attachmentFile.declaredMimeType
    );

    if (!check.ok) {
      throw new ConsultationHttpError(400, check.error);
    }

    const buffer = Buffer.from(input.attachmentFile.bytes);
    validatedAttachment = {
      originalFileName: cleanOriginalName,
      storedFileName: `ibe_consult_${randomUUID()}.${check.ext}`,
      canonicalMimeType: check.canonicalMimeType,
      bytes: buffer,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    };
  }

  const requestedStartAt = new Date(matchingSlot.startAt);
  const requestedEndAt = new Date(matchingSlot.endAt);

  // 5. Execute inside a transaction with advisory lock to prevent conflicting bookings
  const createdAppointment = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`ibe-consultation:${instructor.id}`}, 0))`;

    // Re-check that no APPROVED or CONFIRMED appointment took this slot concurrently
    const activeConflictRows = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        requestedStartAt: Date | string;
        requestedEndAt: Date | string;
        proposedStartAt: Date | string | null;
        proposedEndAt: Date | string | null;
      }>
    >`
      SELECT
        "id",
        "status",
        "requestedStartAt",
        "requestedEndAt",
        "proposedStartAt",
        "proposedEndAt"
      FROM "Appointment"
      WHERE "instructorId" = ${instructor.id}
        AND "status" IN ('APPROVED', 'CONFIRMED')
    `;

    const activeConflicts = activeConflictRows.map((a) => ({
      id: a.id,
      status: a.status,
      requestedStartAt: toDate(a.requestedStartAt),
      requestedEndAt: toDate(a.requestedEndAt),
      proposedStartAt: toNullableDate(a.proposedStartAt),
      proposedEndAt: toNullableDate(a.proposedEndAt),
    }));

    if (
      findConflictingAppointment(
        requestedStartAt,
        requestedEndAt,
        activeConflicts
      )
    ) {
      throw new ConsultationHttpError(
        409,
        "This consultation time slot was just booked by another student. Please choose a different slot."
      );
    }

    const appointmentId = randomUUID();
    const now = new Date();
    const meetingLocation =
      meetingTypeCheck.value === "FACE_TO_FACE"
        ? matchingSlot.location || course.room || "IBE Faculty Consultation Room"
        : null;
    const meetingLink =
      meetingTypeCheck.value === "ONLINE"
        ? matchingSlot.meetingLink || null
        : null;

    await tx.$executeRaw`
      INSERT INTO "Appointment" (
        "id",
        "studentId",
        "instructorId",
        "subjectId",
        "availabilityId",
        "title",
        "reason",
        "additionalMessage",
        "requestedStartAt",
        "requestedEndAt",
        "meetingType",
        "meetingLocation",
        "meetingLink",
        "status",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${appointmentId},
        ${actor.userId},
        ${instructor.id},
        ${course.id},
        ${matchingSlot.availabilityId},
        ${title},
        ${reason},
        ${additionalMessage},
        ${requestedStartAt},
        ${requestedEndAt},
        ${meetingTypeCheck.value},
        ${meetingLocation},
        ${meetingLink},
        ${"PENDING"},
        ${now},
        ${now}
      )
    `;

    // Record the student's initial consultation message in the communication thread
    const initialThreadMessage = additionalMessage
      ? `Reason: ${reason}\n\nAdditional Message: ${additionalMessage}`
      : `Reason: ${reason}`;
    await tx.$executeRaw`
      INSERT INTO "AppointmentMessage" (
        "id",
        "appointmentId",
        "senderId",
        "message",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${appointmentId},
        ${actor.userId},
        ${initialThreadMessage},
        ${now},
        ${now}
      )
    `;

    if (validatedAttachment) {
      const assetId = randomUUID();
      await tx.privateAsset.create({
        data: {
          id: assetId,
          ownerId: actor.userId,
          instituteId: actor.instituteId,
          fileName: validatedAttachment.originalFileName,
          mimeType: validatedAttachment.canonicalMimeType,
          size: validatedAttachment.bytes.byteLength,
          content: new Uint8Array(validatedAttachment.bytes),
          scanStatus: "UNSCANNED",
          sha256: validatedAttachment.sha256,
        },
      });

      const attachmentId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "AppointmentAttachment" (
          "id",
          "appointmentId",
          "originalFileName",
          "storedFileName",
          "storageKey",
          "mimeType",
          "fileSize",
          "uploadedAt"
        ) VALUES (
          ${attachmentId},
          ${appointmentId},
          ${validatedAttachment.originalFileName},
          ${validatedAttachment.storedFileName},
          ${assetId},
          ${validatedAttachment.canonicalMimeType},
          ${validatedAttachment.bytes.byteLength},
          ${now}
        )
      `;
    }

    const hydrated = await fetchAppointmentById(tx, appointmentId);
    if (!hydrated) {
      throw new ConsultationHttpError(500, "Failed to load created consultation appointment.");
    }
    return hydrated;
  });

  const dto = toAppointmentDTO(createdAppointment);
  const dateDisplay = formatManilaDateDisplay(dto.requestedDateKey);

  // 6. Send internal notifications to both student and instructor
  await Promise.all([
    createNotification({
      userId: actor.userId,
      type: "REMINDER",
      title: "Consultation Request Submitted",
      message: `Your consultation request "${dto.title}" for ${dto.subjectCode} with ${dto.instructorName} (${dateDisplay}, ${dto.requestedTimeRangeLabel}) has been submitted and is awaiting approval.`,
      link: `${STUDENT_CONSULTATION_PATH}?appointmentId=${dto.id}`,
    }),
    createNotification({
      userId: instructor.id,
      type: "ALERT",
      title: "New Consultation Request",
      message: `${actor.name} requested a consultation for ${dto.subjectCode}: "${dto.title}" on ${dateDisplay} (${dto.requestedTimeRangeLabel}).`,
      link: `${INSTRUCTOR_CONSULTATION_PATH}?appointmentId=${dto.id}`,
    }),
  ]);

  return dto;
}

// ─── Appointment Status Transitions & Concurrency-Safe Booking ───────────────

export interface MutateAppointmentStatusInput {
  appointmentId: string;
  action: AppointmentMutationAction;
  instructorResponse?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  proposedDateKey?: string | null;
  proposedStartTime?: string | null;
  proposedEndTime?: string | null;
  meetingLocation?: string | null;
  meetingLink?: string | null;
}

export async function mutateAppointmentStatus(
  actor: ConsultationActor,
  input: MutateAppointmentStatusInput
): Promise<AppointmentDTO> {
  await ensureConsultationTables();

  const existing = await fetchAppointmentById(db, input.appointmentId);

  if (!existing) {
    throw new ConsultationHttpError(404, "Consultation appointment not found.");
  }

  if (
    !canAccessAppointment(actor, {
      studentId: existing.studentId,
      instructorId: existing.instructorId,
    })
  ) {
    throw new ConsultationHttpError(
      403,
      "Forbidden: You do not have permission to access or modify this consultation appointment."
    );
  }

  let proposedStartAt: Date | null = null;
  let proposedEndAt: Date | null = null;

  if (input.action === "PROPOSE_RESCHEDULE") {
    const dk = (input.proposedDateKey || "").trim();
    const st = (input.proposedStartTime || "").trim();
    const et = (input.proposedEndTime || "").trim();
    if (!isValidDateKey(dk) || !st || !et) {
      throw new ConsultationHttpError(
        400,
        "Please provide a valid proposed date (YYYY-MM-DD), start time (HH:mm), and end time (HH:mm)."
      );
    }
    proposedStartAt = manilaDateTimeToUtc(dk, st);
    proposedEndAt = manilaDateTimeToUtc(dk, et);
  }

  const transition = validateStatusTransition({
    currentStatus: existing.status as ConsultationStatus,
    action: input.action,
    actorRole: actor.role,
    rejectionReason: input.rejectionReason,
    cancellationReason: input.cancellationReason,
    proposedStartAt,
    proposedEndAt,
  });

  if (!transition.ok) {
    throw new ConsultationHttpError(400, transition.error);
  }

  const updatedRow = await db.$transaction(async (tx) => {
    // Acquire per-instructor transaction lock for all schedule-confirming or schedule-proposing actions
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`ibe-consultation:${existing.instructorId}`}, 0))`;

    const freshRows = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        requestedStartAt: Date | string;
        requestedEndAt: Date | string;
        proposedStartAt: Date | string | null;
        proposedEndAt: Date | string | null;
        confirmedAt: Date | string | null;
        completedAt: Date | string | null;
        attendanceOutcome: string | null;
        instructorResponse: string | null;
        rejectionReason: string | null;
        cancellationReason: string | null;
        cancelledByRole: string | null;
        meetingLocation: string | null;
        meetingLink: string | null;
      }>
    >`
      SELECT
        "id",
        "status",
        "requestedStartAt",
        "requestedEndAt",
        "proposedStartAt",
        "proposedEndAt",
        "confirmedAt",
        "completedAt",
        "attendanceOutcome",
        "instructorResponse",
        "rejectionReason",
        "cancellationReason",
        "cancelledByRole",
        "meetingLocation",
        "meetingLink"
      FROM "Appointment"
      WHERE "id" = ${existing.id}
      LIMIT 1
    `;
    const fresh = freshRows[0];
    if (!fresh || fresh.status !== existing.status) {
      throw new ConsultationHttpError(
        409,
        "This appointment was modified by another request. Please refresh and try again."
      );
    }

    const freshRequestedStart = toDate(fresh.requestedStartAt);
    const freshRequestedEnd = toDate(fresh.requestedEndAt);
    const freshProposedStart = toNullableDate(fresh.proposedStartAt);
    const freshProposedEnd = toNullableDate(fresh.proposedEndAt);

    // Check conflicts when approving, confirming, accepting reschedule, or proposing reschedule
    if (
      input.action === "APPROVE" ||
      input.action === "CONFIRM" ||
      input.action === "ACCEPT_RESCHEDULE" ||
      input.action === "PROPOSE_RESCHEDULE"
    ) {
      const targetStart =
        input.action === "PROPOSE_RESCHEDULE"
          ? proposedStartAt!
          : input.action === "ACCEPT_RESCHEDULE"
          ? freshProposedStart ?? freshRequestedStart
          : freshProposedStart && fresh.status === "CONFIRMED"
          ? freshProposedStart
          : freshRequestedStart;

      const targetEnd =
        input.action === "PROPOSE_RESCHEDULE"
          ? proposedEndAt!
          : input.action === "ACCEPT_RESCHEDULE"
          ? freshProposedEnd ?? freshRequestedEnd
          : freshProposedEnd && fresh.status === "CONFIRMED"
          ? freshProposedEnd
          : freshRequestedEnd;

      const instructorActiveRows = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          requestedStartAt: Date | string;
          requestedEndAt: Date | string;
          proposedStartAt: Date | string | null;
          proposedEndAt: Date | string | null;
        }>
      >`
        SELECT
          "id",
          "status",
          "requestedStartAt",
          "requestedEndAt",
          "proposedStartAt",
          "proposedEndAt"
        FROM "Appointment"
        WHERE "instructorId" = ${existing.instructorId}
          AND "status" IN ('APPROVED', 'CONFIRMED')
          AND "id" <> ${existing.id}
      `;

      const instructorActiveAppointments = instructorActiveRows.map((a) => ({
        id: a.id,
        status: a.status,
        requestedStartAt: toDate(a.requestedStartAt),
        requestedEndAt: toDate(a.requestedEndAt),
        proposedStartAt: toNullableDate(a.proposedStartAt),
        proposedEndAt: toNullableDate(a.proposedEndAt),
      }));

      const conflict = findConflictingAppointment(
        targetStart,
        targetEnd,
        instructorActiveAppointments,
        existing.id
      );

      if (conflict) {
        throw new ConsultationHttpError(
          409,
          "Conflict detected: Another approved or confirmed consultation already occupies this instructor time slot."
        );
      }

      // Also check blocked dates when proposing a reschedule
      if (input.action === "PROPOSE_RESCHEDULE") {
        const blocked = await tx.$queryRaw<BlockedDateDbRow[]>`
          SELECT "id", "instructorId", "startAt", "endAt", "reason", "createdAt"
          FROM "InstructorBlockedDate"
          WHERE "instructorId" = ${existing.instructorId}
            AND "startAt" <= ${targetEnd}
            AND "endAt" >= ${targetStart}
        `;
        if (
          blocked.some((b) =>
            intervalsOverlap(
              targetStart,
              targetEnd,
              toDate(b.startAt),
              toDate(b.endAt)
            )
          )
        ) {
          throw new ConsultationHttpError(
            409,
            "The proposed schedule conflicts with one of your blocked dates."
          );
        }
      }
    }

    const now = new Date();
    const nextStatus = transition.nextStatus;
    let nextRequestedStartAt = freshRequestedStart;
    let nextRequestedEndAt = freshRequestedEnd;
    let nextProposedStartAt = freshProposedStart;
    let nextProposedEndAt = freshProposedEnd;
    let nextConfirmedAt = toNullableDate(fresh.confirmedAt);
    let nextCompletedAt = toNullableDate(fresh.completedAt);
    let nextAttendanceOutcome = fresh.attendanceOutcome;
    let nextInstructorResponse = fresh.instructorResponse;
    let nextRejectionReason = fresh.rejectionReason;
    let nextCancellationReason = fresh.cancellationReason;
    let nextCancelledByRole = fresh.cancelledByRole;
    let nextMeetingLocation = fresh.meetingLocation;
    let nextMeetingLink = fresh.meetingLink;

    if (input.instructorResponse !== undefined && actor.role === "INSTRUCTOR") {
      nextInstructorResponse = input.instructorResponse?.trim() || null;
    }
    if (input.meetingLocation !== undefined && actor.role === "INSTRUCTOR") {
      nextMeetingLocation = input.meetingLocation?.trim() || null;
    }
    if (input.meetingLink !== undefined && actor.role === "INSTRUCTOR") {
      nextMeetingLink = input.meetingLink?.trim() || null;
    }

    if (input.action === "APPROVE") {
      nextConfirmedAt = now;
      if (fresh.status === "RESCHEDULE_REQUESTED" && freshProposedStart && freshProposedEnd) {
        // If approving while a reschedule was proposed, keep requested schedule or clear pending proposal
        nextProposedStartAt = null;
        nextProposedEndAt = null;
      }
    } else if (input.action === "CONFIRM") {
      nextConfirmedAt = nextConfirmedAt ?? now;
    } else if (input.action === "REJECT") {
      nextRejectionReason = input.rejectionReason!.trim();
    } else if (input.action === "PROPOSE_RESCHEDULE") {
      nextProposedStartAt = proposedStartAt;
      nextProposedEndAt = proposedEndAt;
    } else if (input.action === "ACCEPT_RESCHEDULE") {
      nextConfirmedAt = now;
      if (freshProposedStart && freshProposedEnd) {
        nextRequestedStartAt = freshProposedStart;
        nextRequestedEndAt = freshProposedEnd;
      }
    } else if (input.action === "DECLINE_RESCHEDULE") {
      nextCancellationReason =
        input.cancellationReason?.trim() ||
        "Student declined the proposed reschedule.";
      nextCancelledByRole = "STUDENT";
    } else if (input.action === "CANCEL") {
      nextCancellationReason = input.cancellationReason!.trim();
      nextCancelledByRole = actor.role;
    } else if (input.action === "COMPLETE") {
      nextCompletedAt = now;
      nextAttendanceOutcome = "COMPLETED";
    } else if (input.action === "MARK_NO_SHOW") {
      nextCompletedAt = now;
      nextAttendanceOutcome = "NO_SHOW";
    }

    await tx.$executeRaw`
      UPDATE "Appointment"
      SET
        "status" = ${nextStatus},
        "requestedStartAt" = ${nextRequestedStartAt},
        "requestedEndAt" = ${nextRequestedEndAt},
        "proposedStartAt" = ${nextProposedStartAt},
        "proposedEndAt" = ${nextProposedEndAt},
        "confirmedAt" = ${nextConfirmedAt},
        "completedAt" = ${nextCompletedAt},
        "attendanceOutcome" = ${nextAttendanceOutcome},
        "instructorResponse" = ${nextInstructorResponse},
        "rejectionReason" = ${nextRejectionReason},
        "cancellationReason" = ${nextCancellationReason},
        "cancelledByRole" = ${nextCancelledByRole},
        "meetingLocation" = ${nextMeetingLocation},
        "meetingLink" = ${nextMeetingLink},
        "updatedAt" = ${now}
      WHERE "id" = ${existing.id}
    `;

    // Record a reply/decision entry in AppointmentMessage so both student and instructor see it in the conversation thread
    let autoThreadReply: string | null = null;
    if (input.action === "APPROVE") {
      const slotLabel = `${formatManilaDateDisplay(toManilaDateKey(nextRequestedStartAt))}, ${formatManilaTimeRangeLabel(nextRequestedStartAt, nextRequestedEndAt)}`;
      autoThreadReply = nextInstructorResponse
        ? `[Approved Schedule: ${slotLabel}]\n${nextInstructorResponse}`
        : `[Approved Schedule: ${slotLabel}] Your consultation appointment has been approved.`;
    } else if (input.action === "PROPOSE_RESCHEDULE" && nextProposedStartAt && nextProposedEndAt) {
      const propLabel = `${formatManilaDateDisplay(toManilaDateKey(nextProposedStartAt))}, ${formatManilaTimeRangeLabel(nextProposedStartAt, nextProposedEndAt)}`;
      autoThreadReply = nextInstructorResponse
        ? `[Proposed New Schedule: ${propLabel}]\n${nextInstructorResponse}`
        : `[Proposed New Schedule: ${propLabel}] Please review and accept or decline this proposed consultation slot.`;
    } else if (input.action === "REJECT") {
      autoThreadReply = `[Request Declined]\nReason: ${nextRejectionReason}`;
    } else if (input.action === "ACCEPT_RESCHEDULE") {
      const slotLabel = `${formatManilaDateDisplay(toManilaDateKey(nextRequestedStartAt))}, ${formatManilaTimeRangeLabel(nextRequestedStartAt, nextRequestedEndAt)}`;
      autoThreadReply = `[Accepted Proposed Schedule: ${slotLabel}] I have accepted the proposed consultation schedule.`;
    } else if (input.action === "DECLINE_RESCHEDULE") {
      autoThreadReply = `[Declined Proposed Schedule]\nReason: ${nextCancellationReason}`;
    } else if (input.action === "CANCEL") {
      autoThreadReply = `[Consultation Cancelled]\nReason: ${nextCancellationReason}`;
    }

    if (autoThreadReply) {
      await tx.$executeRaw`
        INSERT INTO "AppointmentMessage" (
          "id",
          "appointmentId",
          "senderId",
          "message",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${randomUUID()},
          ${existing.id},
          ${actor.userId},
          ${autoThreadReply},
          ${now},
          ${now}
        )
      `;
    }

    const hydrated = await fetchAppointmentById(tx, existing.id);
    if (!hydrated) {
      throw new ConsultationHttpError(500, "Failed to reload updated consultation appointment.");
    }
    return hydrated;
  });

  const dto = toAppointmentDTO(updatedRow);
  await dispatchAppointmentStatusNotifications(actor, input.action, dto);

  return dto;
}

async function dispatchAppointmentStatusNotifications(
  actor: ConsultationActor,
  action: AppointmentMutationAction,
  dto: AppointmentDTO
): Promise<void> {
  const studentLink = `${STUDENT_CONSULTATION_PATH}?appointmentId=${dto.id}`;
  const instructorLink = `${INSTRUCTOR_CONSULTATION_PATH}?appointmentId=${dto.id}`;
  const dateDisplay = formatManilaDateDisplay(dto.dateKey);

  switch (action) {
    case "APPROVE":
      await createNotification({
        userId: dto.studentId,
        type: "ANNOUNCEMENT",
        title: "Consultation Approved",
        message: `${dto.instructorName} approved your consultation "${dto.title}" (${dto.subjectCode}) for ${dateDisplay}, ${dto.timeRangeLabel}.`,
        link: studentLink,
      });
      break;

    case "REJECT":
      await createNotification({
        userId: dto.studentId,
        type: "ALERT",
        title: "Consultation Request Declined",
        message: `${dto.instructorName} declined your consultation request "${dto.title}" (${dto.subjectCode}). Reason: ${dto.rejectionReason}`,
        link: studentLink,
      });
      break;

    case "PROPOSE_RESCHEDULE": {
      const propDisplay = dto.proposedDateKey
        ? formatManilaDateDisplay(dto.proposedDateKey)
        : dateDisplay;
      await createNotification({
        userId: dto.studentId,
        type: "REMINDER",
        title: "New Consultation Schedule Proposed",
        message: `${dto.instructorName} proposed a new schedule for "${dto.title}" (${dto.subjectCode}): ${propDisplay}, ${dto.proposedTimeRangeLabel}. Please review and accept or decline.`,
        link: studentLink,
      });
      break;
    }

    case "ACCEPT_RESCHEDULE":
      await Promise.all([
        createNotification({
          userId: dto.instructorId,
          type: "ANNOUNCEMENT",
          title: "Proposed Schedule Accepted",
          message: `${dto.studentName} accepted your proposed consultation schedule for "${dto.title}" (${dto.subjectCode}) on ${dateDisplay}, ${dto.timeRangeLabel}.`,
          link: instructorLink,
        }),
        createNotification({
          userId: dto.studentId,
          type: "ANNOUNCEMENT",
          title: "Consultation Confirmed",
          message: `Your rescheduled consultation "${dto.title}" with ${dto.instructorName} is now confirmed for ${dateDisplay}, ${dto.timeRangeLabel}.`,
          link: studentLink,
        }),
      ]);
      break;

    case "DECLINE_RESCHEDULE":
      await createNotification({
        userId: dto.instructorId,
        type: "ALERT",
        title: "Proposed Schedule Declined",
        message: `${dto.studentName} declined the proposed schedule for "${dto.title}" (${dto.subjectCode}).`,
        link: instructorLink,
      });
      break;

    case "CANCEL":
      if (actor.role === "STUDENT") {
        await createNotification({
          userId: dto.instructorId,
          type: "ALERT",
          title: "Consultation Cancelled by Student",
          message: `${dto.studentName} cancelled the consultation "${dto.title}" (${dto.subjectCode}). Reason: ${dto.cancellationReason}`,
          link: instructorLink,
        });
      } else {
        await createNotification({
          userId: dto.studentId,
          type: "ALERT",
          title: "Consultation Cancelled",
          message: `${dto.instructorName} cancelled the consultation "${dto.title}" (${dto.subjectCode}). Reason: ${dto.cancellationReason}`,
          link: studentLink,
        });
      }
      break;

    case "COMPLETE":
      await createNotification({
        userId: dto.studentId,
        type: "ANNOUNCEMENT",
        title: "Consultation Completed",
        message: `Your consultation "${dto.title}" (${dto.subjectCode}) with ${dto.instructorName} has been marked as completed.`,
        link: studentLink,
      });
      break;

    case "MARK_NO_SHOW":
      await createNotification({
        userId: dto.studentId,
        type: "ALERT",
        title: "Consultation Attendance Recorded (No-Show)",
        message: `${dto.instructorName} recorded a No-Show attendance outcome for "${dto.title}" (${dto.subjectCode}).`,
        link: studentLink,
      });
      break;

    default:
      break;
  }
}

// ─── Appointment Communication Messages ──────────────────────────────────────

export async function addAppointmentMessage(
  actor: ConsultationActor,
  appointmentId: string,
  rawMessage: string
): Promise<AppointmentMessageDTO> {
  await ensureConsultationTables();

  const message = (rawMessage || "").trim();
  if (!message) {
    throw new ConsultationHttpError(400, "Message cannot be empty.");
  }
  if (message.length > 4000) {
    throw new ConsultationHttpError(
      400,
      "Message must be 4,000 characters or fewer."
    );
  }

  const apptRows = await db.$queryRaw<
    Array<{
      id: string;
      studentId: string;
      instructorId: string;
      title: string;
      subjectCode: string;
    }>
  >`
    SELECT
      a."id",
      a."studentId",
      a."instructorId",
      a."title",
      c."code" AS "subjectCode"
    FROM "Appointment" a
    INNER JOIN "Course" c ON c."id" = a."subjectId"
    WHERE a."id" = ${appointmentId}
    LIMIT 1
  `;
  const appointment = apptRows[0];

  if (!appointment) {
    throw new ConsultationHttpError(404, "Consultation appointment not found.");
  }

  if (
    !canAccessAppointment(actor, {
      studentId: appointment.studentId,
      instructorId: appointment.instructorId,
    })
  ) {
    throw new ConsultationHttpError(
      403,
      "Forbidden: You do not have permission to message on this appointment."
    );
  }

  const msgId = randomUUID();
  const now = new Date();
  await db.$executeRaw`
    INSERT INTO "AppointmentMessage" (
      "id",
      "appointmentId",
      "senderId",
      "message",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${msgId},
      ${appointmentId},
      ${actor.userId},
      ${message},
      ${now},
      ${now}
    )
  `;

  const recipientId =
    actor.role === "STUDENT" ? appointment.instructorId : appointment.studentId;
  const link =
    actor.role === "STUDENT"
      ? `${INSTRUCTOR_CONSULTATION_PATH}?appointmentId=${appointment.id}`
      : `${STUDENT_CONSULTATION_PATH}?appointmentId=${appointment.id}`;

  await createNotification({
    userId: recipientId,
    type: "REMINDER",
    title: `Consultation Message (${appointment.subjectCode})`,
    message: `${actor.name} sent a message on "${appointment.title}": ${message.slice(0, 120)}${
      message.length > 120 ? "…" : ""
    }`,
    link,
  });

  return {
    id: msgId,
    appointmentId,
    senderId: actor.userId,
    senderName: actor.name,
    senderRole: actor.role,
    message,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

// ─── Authorized Private Attachment Retrieval ─────────────────────────────────

export async function readAuthorizedAppointmentAttachment(
  actor: ConsultationActor,
  attachmentId: string
): Promise<{
  bytes: Buffer;
  mimeType: string;
  originalFileName: string;
}> {
  await ensureConsultationTables();

  const attRows = await db.$queryRaw<
    Array<{
      id: string;
      appointmentId: string;
      originalFileName: string;
      storedFileName: string;
      storageKey: string;
      mimeType: string;
      fileSize: number;
      studentId: string;
      instructorId: string;
    }>
  >`
    SELECT
      att."id",
      att."appointmentId",
      att."originalFileName",
      att."storedFileName",
      att."storageKey",
      att."mimeType",
      att."fileSize",
      a."studentId",
      a."instructorId"
    FROM "AppointmentAttachment" att
    INNER JOIN "Appointment" a ON a."id" = att."appointmentId"
    WHERE att."id" = ${attachmentId}
    LIMIT 1
  `;
  const attachment = attRows[0];

  if (!attachment) {
    throw new ConsultationHttpError(404, "Attachment not found.");
  }

  if (
    !canAccessAppointment(actor, {
      studentId: attachment.studentId,
      instructorId: attachment.instructorId,
    })
  ) {
    throw new ConsultationHttpError(
      403,
      "Forbidden: You do not have permission to access this consultation document."
    );
  }

  const asset = await db.privateAsset.findUnique({
    where: { id: attachment.storageKey },
  });

  if (!asset) {
    throw new ConsultationHttpError(
      404,
      "Stored consultation document could not be found."
    );
  }

  return {
    bytes: Buffer.from(asset.content),
    mimeType: attachment.mimeType || asset.mimeType,
    originalFileName: attachment.originalFileName || asset.fileName,
  };
}

// ─── Paginated Queries, Details & Dashboard Summaries ────────────────────────

export async function getAppointmentDetailsForActor(
  actor: ConsultationActor,
  appointmentId: string
): Promise<AppointmentDTO> {
  await ensureConsultationTables();

  const row = await fetchAppointmentById(db, appointmentId);

  if (!row) {
    throw new ConsultationHttpError(404, "Appointment not found.");
  }

  if (
    !canAccessAppointment(actor, {
      studentId: row.studentId,
      instructorId: row.instructorId,
    })
  ) {
    throw new ConsultationHttpError(
      403,
      "Forbidden: You do not have permission to view this appointment."
    );
  }

  return toAppointmentDTO(row);
}

export interface ListAppointmentsQuery {
  status?: string;
  search?: string;
  subjectId?: string;
  meetingType?: string;
  page?: number;
  pageSize?: number;
}

export async function listAppointmentsForActor(
  actor: ConsultationActor,
  query: ListAppointmentsQuery = {}
): Promise<{
  appointments: AppointmentDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await ensureConsultationTables();

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
  const skip = (page - 1) * pageSize;

  const conditions: Prisma.Sql[] = [
    actor.role === "STUDENT"
      ? Prisma.sql`a."studentId" = ${actor.userId}`
      : Prisma.sql`a."instructorId" = ${actor.userId}`,
  ];

  if (query.status && query.status !== "ALL") {
    if (query.status === "APPROVED_OR_CONFIRMED") {
      conditions.push(Prisma.sql`a."status" IN ('APPROVED', 'CONFIRMED')`);
    } else if (query.status === "NO_SHOW") {
      conditions.push(Prisma.sql`a."attendanceOutcome" = 'NO_SHOW'`);
    } else {
      conditions.push(Prisma.sql`a."status" = ${query.status}`);
    }
  }

  if (query.subjectId && query.subjectId !== "ALL") {
    conditions.push(Prisma.sql`a."subjectId" = ${query.subjectId}`);
  }

  if (query.meetingType && query.meetingType !== "ALL") {
    conditions.push(Prisma.sql`a."meetingType" = ${query.meetingType}`);
  }

  const trimmedSearch = (query.search || "").trim();
  if (trimmedSearch) {
    const pattern = `%${trimmedSearch}%`;
    conditions.push(
      Prisma.sql`(
        a."title" ILIKE ${pattern}
        OR a."reason" ILIKE ${pattern}
        OR c."code" ILIKE ${pattern}
        OR c."title" ILIKE ${pattern}
        OR s."name" ILIKE ${pattern}
        OR COALESCE(s."studentNumber", '') ILIKE ${pattern}
        OR i."name" ILIKE ${pattern}
      )`
    );
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const [idRows, countRows] = await Promise.all([
    db.$queryRaw<Array<{ id: string }>>`
      SELECT a."id"
      FROM "Appointment" a
      INNER JOIN "User" s ON s."id" = a."studentId"
      INNER JOIN "User" i ON i."id" = a."instructorId"
      INNER JOIN "Course" c ON c."id" = a."subjectId"
      WHERE ${whereClause}
      ORDER BY a."createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${skip}
    `,
    db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS "count"
      FROM "Appointment" a
      INNER JOIN "User" s ON s."id" = a."studentId"
      INNER JOIN "User" i ON i."id" = a."instructorId"
      INNER JOIN "Course" c ON c."id" = a."subjectId"
      WHERE ${whereClause}
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const rows = await hydrateAppointmentsByIds(
    db,
    idRows.map((r) => r.id)
  );

  return {
    appointments: rows.map(toAppointmentDTO),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getStudentConsultationStats(
  studentId: string
): Promise<StudentConsultationStatsDTO> {
  await ensureConsultationTables();
  const now = new Date();

  const statsRows = await db.$queryRaw<
    Array<{
      totalRequests: number;
      pendingRequests: number;
      approvedAppointments: number;
      upcomingConsultations: number;
      completedConsultations: number;
    }>
  >`
    SELECT
      COUNT(*)::int AS "totalRequests",
      COUNT(*) FILTER (WHERE "status" IN ('PENDING', 'RESCHEDULE_REQUESTED'))::int AS "pendingRequests",
      COUNT(*) FILTER (WHERE "status" IN ('APPROVED', 'CONFIRMED'))::int AS "approvedAppointments",
      COUNT(*) FILTER (WHERE "status" IN ('APPROVED', 'CONFIRMED') AND "requestedEndAt" >= ${now})::int AS "upcomingConsultations",
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS "completedConsultations"
    FROM "Appointment"
    WHERE "studentId" = ${studentId}
  `;

  const row = statsRows[0];

  // Also ensure approaching consultations within 24 hours have a reminder notification
  void notifyApproachingStudentConsultations(studentId, now).catch(() => {});

  return {
    totalRequests: Number(row?.totalRequests ?? 0),
    pendingRequests: Number(row?.pendingRequests ?? 0),
    approvedAppointments: Number(row?.approvedAppointments ?? 0),
    upcomingConsultations: Number(row?.upcomingConsultations ?? 0),
    completedConsultations: Number(row?.completedConsultations ?? 0),
  };
}

async function notifyApproachingStudentConsultations(
  studentId: string,
  now: Date
): Promise<void> {
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const approaching = await db.$queryRaw<
    Array<{
      id: string;
      title: string;
      requestedStartAt: Date | string;
      requestedEndAt: Date | string;
      instructorName: string;
      subjectCode: string;
    }>
  >`
    SELECT
      a."id",
      a."title",
      a."requestedStartAt",
      a."requestedEndAt",
      i."name" AS "instructorName",
      c."code" AS "subjectCode"
    FROM "Appointment" a
    INNER JOIN "User" i ON i."id" = a."instructorId"
    INNER JOIN "Course" c ON c."id" = a."subjectId"
    WHERE a."studentId" = ${studentId}
      AND a."status" IN ('APPROVED', 'CONFIRMED')
      AND a."requestedStartAt" >= ${now}
      AND a."requestedStartAt" <= ${next24h}
    LIMIT 5
  `;

  for (const appt of approaching) {
    const link = `${STUDENT_CONSULTATION_PATH}?appointmentId=${appt.id}`;
    const existingReminder = await db.notification.findFirst({
      where: {
        userId: studentId,
        type: "REMINDER",
        title: "Upcoming Consultation Reminder",
        link,
      },
      select: { id: true },
    });
    if (!existingReminder) {
      const startAt = toDate(appt.requestedStartAt);
      const endAt = toDate(appt.requestedEndAt);
      const dateDisplay = formatManilaDateDisplay(toManilaDateKey(startAt));
      const timeRange = formatManilaTimeRangeLabel(startAt, endAt);
      await createNotification({
        userId: studentId,
        type: "REMINDER",
        title: "Upcoming Consultation Reminder",
        message: `Reminder: Your consultation "${appt.title}" (${appt.subjectCode}) with ${appt.instructorName} is scheduled for ${dateDisplay}, ${timeRange}.`,
        link,
      });
    }
  }
}

export async function getInstructorConsultationStats(
  instructorId: string
): Promise<InstructorConsultationStatsDTO> {
  await ensureConsultationTables();
  const now = new Date();
  const todayKey = toManilaDateKey(now);
  const todayStart = manilaDateTimeToUtc(todayKey, "00:00");
  const todayEnd = manilaDateTimeToUtc(todayKey, "23:59");

  const statsRows = await db.$queryRaw<
    Array<{
      totalRequests: number;
      pendingRequests: number;
      approvedAppointments: number;
      todaysConsultations: number;
      upcomingConsultations: number;
      completedConsultations: number;
    }>
  >`
    SELECT
      COUNT(*)::int AS "totalRequests",
      COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pendingRequests",
      COUNT(*) FILTER (WHERE "status" IN ('APPROVED', 'CONFIRMED'))::int AS "approvedAppointments",
      COUNT(*) FILTER (WHERE "status" IN ('APPROVED', 'CONFIRMED') AND "requestedStartAt" >= ${todayStart} AND "requestedStartAt" <= ${todayEnd})::int AS "todaysConsultations",
      COUNT(*) FILTER (WHERE "status" IN ('APPROVED', 'CONFIRMED') AND "requestedEndAt" >= ${now})::int AS "upcomingConsultations",
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS "completedConsultations"
    FROM "Appointment"
    WHERE "instructorId" = ${instructorId}
  `;

  const row = statsRows[0];

  return {
    totalRequests: Number(row?.totalRequests ?? 0),
    pendingRequests: Number(row?.pendingRequests ?? 0),
    approvedAppointments: Number(row?.approvedAppointments ?? 0),
    todaysConsultations: Number(row?.todaysConsultations ?? 0),
    upcomingConsultations: Number(row?.upcomingConsultations ?? 0),
    completedConsultations: Number(row?.completedConsultations ?? 0),
  };
}
