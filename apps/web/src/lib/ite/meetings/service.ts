/**
 * apps/web/src/lib/ite/meetings/service.ts
 *
 * Core service orchestration for ITE Class Meetings.
 */

import { db } from "@/lib/db";
import { HttpError } from "@/lib/practicum/http";
import { createNotificationsForCourseStudents } from "@/lib/notifications";
import type { MeetingActor } from "./guard";
import { requireOwnedCourse, requireMeetingWithAccess } from "./guard";
import {
  validateMeetingUrl,
  detectProvider,
  deriveMeetingStatus,
  primaryTime,
  formatMeetingDateTime,
  formatMeetingTimeOnly,
  formatDuration,
  canEditMeeting,
  canTransitionStatus,
} from "./pure-logic";
import type {
  MeetingItemDto,
  CreateMeetingInput,
  UpdateMeetingInput,
  AttendanceResponse,
  MeetingStatus,
} from "./types";

function mapMeetingToDto(
  meeting: {
    id: string;
    courseId: string;
    createdById: string;
    title: string;
    description: string | null;
    provider: any;
    joinUrl: string;
    scheduledAt: Date | null;
    startedAt: Date | null;
    endedAt: Date | null;
    status: any;
    createdAt: Date;
    course: { id: string; code: string; title: string };
    _count?: { joins: number };
    joins?: { id: string }[];
  },
  actor: MeetingActor
): MeetingItemDto {
  const derivedStatus = deriveMeetingStatus({
    status: meeting.status as MeetingStatus,
    startedAt: meeting.startedAt,
    scheduledAt: meeting.scheduledAt,
  });

  const pt = primaryTime(meeting);

  return {
    id: meeting.id,
    courseId: meeting.courseId,
    courseCode: meeting.course.code,
    courseTitle: meeting.course.title,
    createdById: meeting.createdById,
    title: meeting.title,
    description: meeting.description,
    provider: meeting.provider,
    joinUrl: meeting.joinUrl,
    scheduledAt: meeting.scheduledAt ? meeting.scheduledAt.toISOString() : null,
    startedAt: meeting.startedAt ? meeting.startedAt.toISOString() : null,
    endedAt: meeting.endedAt ? meeting.endedAt.toISOString() : null,
    status: meeting.status as MeetingStatus,
    derivedStatus,
    primaryTimeIso: pt.toISOString(),
    formattedPrimaryDateTime: formatMeetingDateTime(pt),
    formattedStartedTime: meeting.startedAt ? formatMeetingTimeOnly(meeting.startedAt) : null,
    formattedEndedTime: meeting.endedAt ? formatMeetingTimeOnly(meeting.endedAt) : null,
    durationLabel: formatDuration(meeting.startedAt, meeting.endedAt) || null,
    joinCount: actor.role === "PROFESSOR" ? (meeting._count?.joins ?? 0) : undefined,
    hasJoined: actor.role === "STUDENT" ? Boolean(meeting.joins && meeting.joins.length > 0) : undefined,
    createdAt: meeting.createdAt.toISOString(),
  };
}

/**
 * Creates a new class meeting.
 */
export async function createMeeting(
  actor: MeetingActor,
  input: CreateMeetingInput
): Promise<MeetingItemDto> {
  if (actor.role !== "PROFESSOR") {
    throw new HttpError(403, "Only course instructors can create class meetings.");
  }

  const course = await requireOwnedCourse(input.courseId, actor.userId);

  const title = (input.title || "").trim();
  if (!title || title.length > 120) {
    throw new HttpError(400, "Meeting title is required and must not exceed 120 characters.");
  }

  const description = input.description ? input.description.trim() : null;
  if (description && description.length > 500) {
    throw new HttpError(400, "Description must not exceed 500 characters.");
  }

  const urlValidation = validateMeetingUrl(input.joinUrl);
  if (!urlValidation.valid) {
    throw new HttpError(400, urlValidation.error);
  }
  const joinUrl = urlValidation.url;
  const provider = detectProvider(joinUrl);

  let scheduledAtDate: Date | null = null;
  if (input.scheduledAt) {
    scheduledAtDate = new Date(input.scheduledAt);
    if (isNaN(scheduledAtDate.getTime())) {
      throw new HttpError(400, "Invalid scheduledAt timestamp.");
    }
  }

  const isStartNow = Boolean(input.startNow);
  const now = new Date();

  const meeting = await db.classMeeting.create({
    data: {
      courseId: course.id,
      createdById: actor.userId,
      title,
      description,
      provider,
      joinUrl,
      scheduledAt: scheduledAtDate,
      startedAt: isStartNow ? now : null,
      status: isStartNow ? "LIVE" : "SCHEDULED",
    },
    include: {
      course: {
        select: { id: true, code: true, title: true },
      },
    },
  });

  // Notifications for approved enrolled students
  if (isStartNow) {
    await createNotificationsForCourseStudents(course.id, {
      type: "REMINDER",
      title: `${course.code}: ${title} is live now`,
      message: `A live meeting has started for ${course.title}. Click to join.`,
      link: `/${actor.instituteCode}/meetings`,
    });
  } else if (scheduledAtDate) {
    await createNotificationsForCourseStudents(course.id, {
      type: "REMINDER",
      title: `${course.code}: ${title} scheduled for ${formatMeetingDateTime(scheduledAtDate)}`,
      message: `A class meeting has been scheduled for ${course.title}.`,
      link: `/${actor.instituteCode}/meetings`,
    });
  }

  return mapMeetingToDto(meeting, actor);
}

/**
 * Lists meetings visible to the current actor.
 */
export async function listMeetings(
  actor: MeetingActor,
  params: {
    courseId?: string | null;
    status?: string | null;
    cursor?: string | null;
    take?: number;
  }
): Promise<{ meetings: MeetingItemDto[]; nextCursor: string | null }> {
  let allowedCourseIds: string[] = [];

  if (actor.role === "PROFESSOR") {
    const owned = await db.course.findMany({
      where: {
        instructorId: actor.userId,
        institute: { code: "ite" },
        isArchived: false,
      },
      select: { id: true },
    });
    allowedCourseIds = owned.map((c) => c.id);
  } else {
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: actor.userId,
        status: "APPROVED",
        course: { institute: { code: "ite" } },
      },
      select: { courseId: true },
    });
    allowedCourseIds = enrollments.map((e) => e.courseId);
  }

  if (allowedCourseIds.length === 0) {
    return { meetings: [], nextCursor: null };
  }

  let targetCourseIds = allowedCourseIds;
  if (params.courseId) {
    if (!allowedCourseIds.includes(params.courseId)) {
      // User does not have access to this course
      return { meetings: [], nextCursor: null };
    }
    targetCourseIds = [params.courseId];
  }

  const take = Math.min(Math.max(params.take ?? 20, 1), 50);

  const rawMeetings = await db.classMeeting.findMany({
    where: {
      courseId: { in: targetCourseIds },
    },
    take: take + 1,
    skip: params.cursor ? 1 : 0,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    orderBy: [{ createdAt: "desc" }],
    include: {
      course: {
        select: { id: true, code: true, title: true },
      },
      ...(actor.role === "PROFESSOR" ? { _count: { select: { joins: true } } } : {}),
      ...(actor.role === "STUDENT"
        ? { joins: { where: { userId: actor.userId }, select: { id: true } } }
        : {}),
    },
  });

  const hasNextPage = rawMeetings.length > take;
  const items = hasNextPage ? rawMeetings.slice(0, take) : rawMeetings;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  let dtos = items.map((m) => mapMeetingToDto(m, actor));

  if (params.status) {
    const filterStatus = params.status.toUpperCase();
    dtos = dtos.filter((d) => d.derivedStatus === filterStatus);
  }

  return {
    meetings: dtos,
    nextCursor,
  };
}

/**
 * Updates, starts, ends, or cancels a meeting.
 */
export async function updateMeeting(
  actor: MeetingActor,
  meetingId: string,
  input: UpdateMeetingInput
): Promise<MeetingItemDto> {
  if (actor.role !== "PROFESSOR") {
    throw new HttpError(403, "Only course instructors can update class meetings.");
  }

  const meeting = await requireMeetingWithAccess(meetingId, actor);

  const action = input.action ?? "edit";

  if (action === "start") {
    if (meeting.status !== "SCHEDULED") {
      throw new HttpError(409, "Only scheduled meetings can be started.");
    }
    const now = new Date();
    const updated = await db.classMeeting.update({
      where: { id: meetingId },
      data: {
        status: "LIVE",
        startedAt: now,
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        _count: { select: { joins: true } },
      },
    });

    await createNotificationsForCourseStudents(meeting.courseId, {
      type: "REMINDER",
      title: `${meeting.course.code}: ${meeting.title} is live now`,
      message: `A live meeting has started for ${meeting.course.title}. Click to join.`,
      link: `/${actor.instituteCode}/meetings`,
    });

    return mapMeetingToDto(updated, actor);
  }

  if (action === "end") {
    if (meeting.status !== "LIVE") {
      throw new HttpError(409, "Only live meetings can be ended.");
    }
    const now = new Date();
    const updated = await db.classMeeting.update({
      where: { id: meetingId },
      data: {
        status: "ENDED",
        endedAt: now,
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        _count: { select: { joins: true } },
      },
    });
    return mapMeetingToDto(updated, actor);
  }

  if (action === "cancel") {
    if (meeting.status !== "SCHEDULED") {
      throw new HttpError(409, "Only scheduled meetings can be cancelled.");
    }
    const updated = await db.classMeeting.update({
      where: { id: meetingId },
      data: {
        status: "CANCELLED",
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        _count: { select: { joins: true } },
      },
    });
    return mapMeetingToDto(updated, actor);
  }

  // Edit fields
  if (!canEditMeeting(meeting.status as MeetingStatus)) {
    throw new HttpError(409, "Ended or cancelled meetings cannot be edited.");
  }

  const dataToUpdate: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed || trimmed.length > 120) {
      throw new HttpError(400, "Meeting title is required and must not exceed 120 characters.");
    }
    dataToUpdate.title = trimmed;
  }

  if (input.description !== undefined) {
    const trimmed = input.description ? input.description.trim() : null;
    if (trimmed && trimmed.length > 500) {
      throw new HttpError(400, "Description must not exceed 500 characters.");
    }
    dataToUpdate.description = trimmed;
  }

  if (input.joinUrl !== undefined) {
    const urlValidation = validateMeetingUrl(input.joinUrl);
    if (!urlValidation.valid) {
      throw new HttpError(400, urlValidation.error);
    }
    dataToUpdate.joinUrl = urlValidation.url;
    dataToUpdate.provider = detectProvider(urlValidation.url);
  }

  if (input.scheduledAt !== undefined) {
    if (input.scheduledAt === null || input.scheduledAt === "") {
      dataToUpdate.scheduledAt = null;
    } else {
      const d = new Date(input.scheduledAt);
      if (isNaN(d.getTime())) {
        throw new HttpError(400, "Invalid scheduledAt timestamp.");
      }
      dataToUpdate.scheduledAt = d;
    }
  }

  const updated = await db.classMeeting.update({
    where: { id: meetingId },
    data: dataToUpdate,
    include: {
      course: { select: { id: true, code: true, title: true } },
      _count: { select: { joins: true } },
    },
  });

  return mapMeetingToDto(updated, actor);
}

/**
 * Handles a join request.
 * Meeting must be LIVE.
 * Records the join in MeetingJoin for students.
 */
export async function joinMeeting(
  actor: MeetingActor,
  meetingId: string
): Promise<{ joinUrl: string; courseId: string; meetingId: string }> {
  const meeting = await requireMeetingWithAccess(meetingId, actor);

  const derivedStatus = deriveMeetingStatus({
    status: meeting.status as MeetingStatus,
    startedAt: meeting.startedAt,
    scheduledAt: meeting.scheduledAt,
  });

  if (derivedStatus !== "LIVE") {
    throw new HttpError(409, "This meeting is not currently live.");
  }

  if (actor.role === "STUDENT") {
    await db.meetingJoin.upsert({
      where: {
        meetingId_userId: {
          meetingId,
          userId: actor.userId,
        },
      },
      create: {
        meetingId,
        userId: actor.userId,
      },
      update: {},
    });
  }

  return {
    joinUrl: meeting.joinUrl,
    courseId: meeting.courseId,
    meetingId: meeting.id,
  };
}

/**
 * Retrieves attendance list for an owning instructor.
 */
export async function getMeetingAttendance(
  actor: MeetingActor,
  meetingId: string
): Promise<AttendanceResponse> {
  if (actor.role !== "PROFESSOR") {
    throw new HttpError(403, "Only course instructors can view meeting attendance.");
  }

  await requireMeetingWithAccess(meetingId, actor);

  const joins = await db.meetingJoin.findMany({
    where: { meetingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          studentNumber: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return {
    meetingId,
    totalAttendees: joins.length,
    attendees: joins.map((j) => ({
      userId: j.user.id,
      name: j.user.name,
      studentNumber: j.user.studentNumber,
      avatarUrl: j.user.avatarUrl,
      joinedAt: j.joinedAt.toISOString(),
      formattedJoinedAt: formatMeetingDateTime(j.joinedAt),
    })),
  };
}
