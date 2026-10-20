-- Migration: 20261020150000_ite_meetings
-- Additive only: creates MeetingProvider, MeetingStatus enums, ClassMeeting and MeetingJoin tables, indexes, and foreign keys.
-- Touches only the new ITE Meetings objects; no existing table, column, type, or index is changed.

-- CreateEnum
CREATE TYPE "MeetingProvider" AS ENUM ('GOOGLE_MEET', 'GOOGLE_CLASSROOM', 'ZOOM', 'MICROSOFT_TEAMS', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ClassMeeting" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" "MeetingProvider" NOT NULL,
    "joinUrl" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingJoin" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingJoin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassMeeting_courseId_createdAt_idx" ON "ClassMeeting"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassMeeting_courseId_status_idx" ON "ClassMeeting"("courseId", "status");

-- CreateIndex
CREATE INDEX "ClassMeeting_createdById_idx" ON "ClassMeeting"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingJoin_meetingId_userId_key" ON "MeetingJoin"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "MeetingJoin_meetingId_idx" ON "MeetingJoin"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingJoin_userId_idx" ON "MeetingJoin"("userId");

-- AddForeignKey
ALTER TABLE "ClassMeeting" ADD CONSTRAINT "ClassMeeting_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMeeting" ADD CONSTRAINT "ClassMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingJoin" ADD CONSTRAINT "MeetingJoin_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "ClassMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingJoin" ADD CONSTRAINT "MeetingJoin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
