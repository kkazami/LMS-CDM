/**
 * apps/web/src/lib/ite/meetings/types.ts
 *
 * Types and contracts for ITE Class Meetings.
 */

import type { MeetingProvider, MeetingStatus } from "@prisma/client";

export type { MeetingProvider, MeetingStatus };

export interface MeetingItemDto {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  createdById: string;
  title: string;
  description: string | null;
  provider: MeetingProvider;
  joinUrl?: string; // Only populated for instructor owner or approved enrolled student
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: MeetingStatus;
  derivedStatus: MeetingStatus;
  primaryTimeIso: string;
  formattedPrimaryDateTime: string;
  formattedStartedTime: string | null;
  formattedEndedTime: string | null;
  durationLabel: string | null;
  joinCount?: number; // Instructor only
  hasJoined?: boolean; // Student only (whether this student has already joined)
  createdAt: string;
}

export interface MeetingAttendeeDto {
  userId: string;
  name: string;
  studentNumber: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  formattedJoinedAt: string;
}

export interface AttendanceResponse {
  meetingId: string;
  totalAttendees: number;
  attendees: MeetingAttendeeDto[];
}

export interface CreateMeetingInput {
  courseId: string;
  title: string;
  description?: string;
  joinUrl: string;
  scheduledAt?: string;
  startNow?: boolean;
}

export interface UpdateMeetingInput {
  action?: "start" | "end" | "cancel" | "edit";
  title?: string;
  description?: string;
  joinUrl?: string;
  scheduledAt?: string | null;
}
