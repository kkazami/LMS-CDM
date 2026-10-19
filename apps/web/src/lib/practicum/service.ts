import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { HttpError } from "./http";
import type { FeedbackDTO, PlacementDTO, SubmissionDTO } from "./dto";
import {
  placementRoleFor,
  summarizeGroups,
  totalPendingReview,
  type PlacementRole,
  type PlacementSummary,
  type SubmissionStatus,
  type SubmissionType,
} from "./rules";
import type { PracticumActor } from "./guard";

/** Everything Practicum reads from the database lives here, so pages and routes share it. */

const placementInclude = {
  student: { select: { id: true, name: true } },
  supervisor: { select: { id: true, name: true } },
} as const;

type PlacementRow = Awaited<ReturnType<typeof findPlacementRows>>[number];

function findPlacementRows(where: { studentId?: string; supervisorId?: string; id?: string }) {
  return db.practicumPlacement.findMany({
    where,
    include: placementInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

async function summariesFor(placementIds: string[]): Promise<Map<string, PlacementSummary>> {
  const result = new Map<string, PlacementSummary>();
  if (placementIds.length === 0) return result;

  const groups = await db.practicumSubmission.groupBy({
    by: ["placementId", "type", "status"],
    where: { placementId: { in: placementIds } },
    _count: { _all: true },
  });

  for (const id of placementIds) {
    result.set(
      id,
      summarizeGroups(
        groups
          .filter((g) => g.placementId === id)
          .map((g) => ({ type: g.type, status: g.status, count: g._count._all }))
      )
    );
  }
  return result;
}

function toPlacementDTO(row: PlacementRow, summary: PlacementSummary): PlacementDTO {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student.name,
    supervisorId: row.supervisorId,
    supervisorName: row.supervisor.name,
    schoolName: row.schoolName,
    subject: row.subject,
    gradeLevel: row.gradeLevel,
    schoolYear: row.schoolYear,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    summary,
    pendingReview: totalPendingReview(summary),
  };
}

async function buildPlacementDTOs(rows: PlacementRow[]): Promise<PlacementDTO[]> {
  const summaries = await summariesFor(rows.map((r) => r.id));
  return rows.map((row) => toPlacementDTO(row, summaries.get(row.id) as PlacementSummary));
}

/** The student's own placements (ACTIVE first), with real progress counts. */
export async function getStudentPlacements(studentId: string): Promise<PlacementDTO[]> {
  return buildPlacementDTOs(await findPlacementRows({ studentId }));
}

/** Placements this instructor supervises, with real per-type counts. */
export async function getSupervisorPlacements(supervisorId: string): Promise<PlacementDTO[]> {
  return buildPlacementDTOs(await findPlacementRows({ supervisorId }));
}

export async function getPlacementDTO(placementId: string): Promise<PlacementDTO | null> {
  const rows = await findPlacementRows({ id: placementId });
  if (rows.length === 0) return null;
  return (await buildPlacementDTOs(rows))[0];
}

/** Raw ownership row. Callers must pass it through requirePlacementAccess. */
export async function findPlacementOwnership(placementId: string) {
  return db.practicumPlacement.findUnique({
    where: { id: placementId },
    select: { id: true, studentId: true, supervisorId: true, status: true, schoolName: true },
  });
}

/**
 * Loads a placement and verifies the actor is its student or its supervisor (404 if missing,
 * 403 for anyone else). `required` narrows it to one side.
 */
export async function requirePlacementAccess(
  placementId: string,
  actor: PracticumActor,
  required?: PlacementRole
) {
  const placement = await findPlacementOwnership(placementId);
  if (!placement) throw new HttpError(404, "Placement not found.");

  const role = placementRoleFor({ id: actor.userId, role: actor.role }, placement);
  if (!role || (required && role !== required)) {
    throw new HttpError(403, "You do not have access to this placement.");
  }
  return { placement, role };
}

const submissionInclude = {
  feedback: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  },
} as const;

type SubmissionRow = Awaited<ReturnType<typeof findSubmissionRows>>[number];

function findSubmissionRows(placementId: string) {
  return db.practicumSubmission.findMany({
    where: { placementId },
    include: submissionInclude,
    orderBy: { submittedAt: "desc" },
  });
}

export function toSubmissionDTO(row: SubmissionRow): SubmissionDTO {
  const feedback: FeedbackDTO[] = row.feedback.map((f) => ({
    id: f.id,
    authorId: f.authorId,
    authorName: f.author.name,
    comment: f.comment,
    decision: f.decision,
    score: f.score,
    createdAt: f.createdAt.toISOString(),
  }));

  return {
    id: row.id,
    placementId: row.placementId,
    type: row.type as SubmissionType,
    title: row.title,
    description: row.description,
    fileUrl: row.fileUrl,
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
    videoLink: row.videoLink,
    status: row.status as SubmissionStatus,
    version: row.version,
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    feedback,
  };
}

/** All submissions of a placement with their feedback history. Check access first. */
export async function getPlacementSubmissions(placementId: string): Promise<SubmissionDTO[]> {
  return (await findSubmissionRows(placementId)).map(toSubmissionDTO);
}

export async function getSubmissionDTO(submissionId: string): Promise<SubmissionDTO | null> {
  const row = await db.practicumSubmission.findUnique({
    where: { id: submissionId },
    include: submissionInclude,
  });
  return row ? toSubmissionDTO(row) : null;
}

// ─── Notifications ─────────────────────────────────────────────────────────

const ITE_BASE = "/ite/practicum";

export async function notifySupervisorOfSubmission(args: {
  supervisorId: string;
  placementId: string;
  studentName: string;
  title: string;
  resubmitted: boolean;
}) {
  await createNotification({
    userId: args.supervisorId,
    type: "CLASSWORK",
    title: args.resubmitted ? "Practicum resubmission" : "New practicum submission",
    message: `${args.studentName} ${args.resubmitted ? "resubmitted" : "submitted"}: ${args.title}`,
    link: `${ITE_BASE}/${args.placementId}`,
  });
}

export async function notifyStudentOfFeedback(args: {
  studentId: string;
  supervisorName: string;
  title: string;
  decision: "COMMENT" | "NEEDS_REVISION" | "APPROVED";
}) {
  const outcome =
    args.decision === "APPROVED"
      ? "approved"
      : args.decision === "NEEDS_REVISION"
        ? "requested a revision of"
        : "commented on";
  await createNotification({
    userId: args.studentId,
    type: "GRADE",
    title: "Practicum feedback",
    message: `${args.supervisorName} ${outcome} your submission: ${args.title}`,
    link: ITE_BASE,
  });
}

export async function notifyStudentOfPlacement(args: {
  studentId: string;
  supervisorName: string;
  schoolName: string;
}) {
  await createNotification({
    userId: args.studentId,
    type: "ANNOUNCEMENT",
    title: "Practicum placement assigned",
    message: `${args.supervisorName} added you to a practicum placement at ${args.schoolName}.`,
    link: ITE_BASE,
  });
}
