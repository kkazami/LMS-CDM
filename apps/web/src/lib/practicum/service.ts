import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import {
  executeDeletePlacement,
  type DeletePlacementDeps,
  type DeletePlacementResult,
  type DeletePlacementTx,
} from "./delete-placement";
import { HttpError, PRACTICUM_TRANSACTION_OPTIONS } from "./http";
import type { FeedbackDTO, PlacementDTO, SubmissionDTO } from "./dto";
import {
  RUBRIC_MIME_BY_EXTENSION,
  canManagePlacementRubric,
  canViewPlacementRubric,
  getExtension,
  placementRoleFor,
  sanitizeRubricFileName,
  summarizeGroups,
  totalPendingReview,
  validateRubricSignature,
  validateRubricUpload,
  type PlacementRole,
  type PlacementSummary,
  type RubricExtension,
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
  const hasRubric = Boolean(row.rubricStorageKey && row.rubricFileName);
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
    rubricFileName: hasRubric ? row.rubricFileName : null,
    rubricMimeType: hasRubric ? row.rubricMimeType : null,
    rubricFileSize: hasRubric && row.rubricFileSize !== null ? Number(row.rubricFileSize) : null,
    rubricUploadedAt:
      hasRubric && row.rubricUploadedAt ? row.rubricUploadedAt.toISOString() : null,
    rubricUrl: hasRubric ? `/api/practicum/placements/${row.id}/rubric` : null,
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
    select: {
      id: true,
      studentId: true,
      supervisorId: true,
      status: true,
      schoolName: true,
      rubricStorageKey: true,
      rubricFileName: true,
      rubricMimeType: true,
      rubricFileSize: true,
      rubricUploadedAt: true,
      rubricUploadedById: true,
    },
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

/**
 * Verifies the actor is allowed to upload, replace or remove the placement's rubric
 * (the owning ITE instructor or an ITE admin; 403 for everyone else).
 */
export async function requirePlacementRubricManageAccess(
  placementId: string,
  actor: PracticumActor
) {
  const placement = await findPlacementOwnership(placementId);
  if (!placement) throw new HttpError(404, "Placement not found.");

  if (!canManagePlacementRubric({ id: actor.userId, role: actor.role, isIte: true }, placement)) {
    throw new HttpError(403, "You do not have permission to manage the rubric for this placement.");
  }
  return placement;
}

/**
 * Verifies the actor is allowed to view/download the placement's rubric
 * (the owning ITE instructor, an ITE admin, or the assigned student teacher; 403 for everyone else).
 */
export async function requirePlacementRubricViewAccess(
  placementId: string,
  actor: PracticumActor
) {
  const placement = await findPlacementOwnership(placementId);
  if (!placement) throw new HttpError(404, "Placement not found.");

  if (!canViewPlacementRubric({ id: actor.userId, role: actor.role, isIte: true }, placement)) {
    throw new HttpError(403, "You do not have access to this rubric.");
  }
  return placement;
}

export interface PreparedRubricUpload {
  assetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  bytes: Uint8Array<ArrayBuffer>;
  sha256: string;
}

/**
 * Validates a rubric File on the server (extension, MIME type, non-empty size <= RUBRIC_MAX_BYTES,
 * magic-byte file signature, and safe file name) and prepares its binary payload for transactional storage.
 */
export async function prepareRubricUpload(file: File): Promise<PreparedRubricUpload> {
  const ext = getExtension(file.name) as RubricExtension;
  const rawMime = (file.type || "").trim().toLowerCase().split(";")[0];
  const effectiveMime =
    !rawMime || rawMime === "application/octet-stream"
      ? RUBRIC_MIME_BY_EXTENSION[ext] ?? rawMime
      : rawMime;

  const preCheck = validateRubricUpload(file.name, effectiveMime, file.size);
  if (!preCheck.ok) {
    throw new HttpError(preCheck.reason.startsWith("File too large") ? 413 : 400, preCheck.reason);
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const postCheck = validateRubricUpload(file.name, effectiveMime, bytes.byteLength);
  if (!postCheck.ok) {
    throw new HttpError(postCheck.reason.startsWith("File too large") ? 413 : 400, postCheck.reason);
  }

  const signatureCheck = validateRubricSignature(file.name, bytes);
  if (!signatureCheck.ok) {
    throw new HttpError(400, signatureCheck.reason);
  }

  const expectedMime = RUBRIC_MIME_BY_EXTENSION[ext];
  const safeName = sanitizeRubricFileName(file.name);

  return {
    assetId: randomUUID(),
    fileName: safeName,
    mimeType: expectedMime,
    fileSize: bytes.byteLength,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const submissionSelect = {
  id: true,
  placementId: true,
  type: true,
  title: true,
  description: true,
  fileUrl: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  videoLink: true,
  status: true,
  version: true,
  submittedAt: true,
  updatedAt: true,
  feedback: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      authorId: true,
      comment: true,
      decision: true,
      score: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  },
} as const;

type SubmissionRow = Awaited<ReturnType<typeof findSubmissionRows>>[number];

function findSubmissionRows(placementId: string) {
  return db.practicumSubmission.findMany({
    where: { placementId },
    select: submissionSelect,
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
    score: f.score === null || f.score === undefined ? null : Number(f.score),
    createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt),
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
    fileSize: row.fileSize === null || row.fileSize === undefined ? null : Number(row.fileSize),
    videoLink: row.videoLink,
    status: row.status as SubmissionStatus,
    version: Number(row.version),
    submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : String(row.submittedAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
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
    select: submissionSelect,
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

// ─── Placement Deletion ────────────────────────────────────────────────────

export async function deletePlacement(args: {
  placementId: string;
  actor: PracticumActor;
  ipAddress?: string;
  deps?: Partial<DeletePlacementDeps>;
}): Promise<DeletePlacementResult> {
  return executeDeletePlacement({
    placementId: args.placementId,
    actor: args.actor,
    ipAddress: args.ipAddress,
    deps: {
      runTransaction:
        args.deps?.runTransaction ??
        (<T>(fn: (tx: DeletePlacementTx) => Promise<T>) =>
          db.$transaction(
            (tx) => fn(tx as unknown as DeletePlacementTx),
            PRACTICUM_TRANSACTION_OPTIONS
          )),
      deleteBlobs: args.deps?.deleteBlobs,
      uploadsConfigured: args.deps?.uploadsConfigured,
    },
  });
}
