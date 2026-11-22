import { del } from "@vercel/blob";
import { uploadsConfigured } from "./blob";
import { HttpError } from "./http";
import { canDeletePlacement } from "./rules";
import type { PracticumActor } from "./guard";

export interface DeletePlacementTx {
  practicumPlacement: {
    findUnique: (args: {
      where: { id: string };
      select: {
        id: true;
        studentId: true;
        supervisorId: true;
        schoolName: true;
        subject: true;
        gradeLevel: true;
        schoolYear: true;
        rubricStorageKey: true;
        submissions: {
          select: {
            id: true;
            type: true;
            fileUrl: true;
            _count: { select: { feedback: true } };
          };
        };
      };
    }) => Promise<{
      id: string;
      studentId: string;
      supervisorId: string;
      schoolName: string;
      subject: string;
      gradeLevel: string;
      schoolYear: string;
      rubricStorageKey: string | null;
      submissions: Array<{
        id: string;
        type: string;
        fileUrl: string | null;
        _count: { feedback: number };
      }>;
    } | null>;
    deleteMany: (args: { where: { id: string } }) => Promise<{ count: number }>;
  };
  privateAsset: {
    deleteMany: (args: { where: { id: string } }) => Promise<{ count: number }>;
  };
  auditLog: {
    create: (args: {
      data: {
        adminId: string;
        targetId: string;
        action: string;
        ipAddress: string;
        metadata: string;
      };
    }) => Promise<unknown>;
  };
}

export interface DeletePlacementDeps {
  runTransaction: <T>(fn: (tx: DeletePlacementTx) => Promise<T>) => Promise<T>;
  deleteBlobs?: (urls: string[]) => Promise<void>;
  uploadsConfigured?: () => boolean;
}

export interface DeletePlacementResult {
  placementId: string;
  deletedSubmissions: number;
  deletedComments: number;
  deletedRubric: boolean;
  blobFilesAttempted: number;
  blobDeleteFailed: boolean;
}

function isPrismaConflictError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === "P2003" || code === "P2034";
}

/**
 * Deletes a placement and all owned rows (submissions, lesson plan files, feedback,
 * and rubric PrivateAsset) in one transaction, records an AuditLog entry, and then
 * best-effort deletes any file-backed Blob URLs after the transaction commits.
 */
export async function executeDeletePlacement(args: {
  placementId: string;
  actor: PracticumActor;
  ipAddress?: string;
  deps: DeletePlacementDeps;
}): Promise<DeletePlacementResult> {
  const { placementId, actor, ipAddress = "", deps } = args;
  const deleteBlobs = deps.deleteBlobs ?? ((urls: string[]) => del(urls));
  const isUploadsConfigured = deps.uploadsConfigured ?? uploadsConfigured;

  let txResult: {
    fileUrls: string[];
    deletedSubmissions: number;
    deletedComments: number;
    deletedRubric: boolean;
  };

  try {
    txResult = await deps.runTransaction(async (tx) => {
      const placement = await tx.practicumPlacement.findUnique({
        where: { id: placementId },
        select: {
          id: true,
          studentId: true,
          supervisorId: true,
          schoolName: true,
          subject: true,
          gradeLevel: true,
          schoolYear: true,
          rubricStorageKey: true,
          submissions: {
            select: {
              id: true,
              type: true,
              fileUrl: true,
              _count: { select: { feedback: true } },
            },
          },
        },
      });

      if (!placement) {
        throw new HttpError(404, "Placement not found.");
      }

      if (!canDeletePlacement({ id: actor.userId, role: actor.role, isIte: true }, placement)) {
        throw new HttpError(403, "You do not have permission to delete this placement.");
      }

      const deleted = await tx.practicumPlacement.deleteMany({
        where: { id: placementId },
      });
      if (deleted.count !== 1) {
        throw new HttpError(404, "Placement not found.");
      }

      let deletedRubric = false;
      if (placement.rubricStorageKey) {
        const assetResult = await tx.privateAsset.deleteMany({
          where: { id: placement.rubricStorageKey },
        });
        deletedRubric = assetResult.count > 0;
      }

      const deletedSubmissions = placement.submissions.length;
      const deletedComments = placement.submissions.reduce(
        (sum, s) => sum + s._count.feedback,
        0
      );
      const fileUrls = placement.submissions
        .map((s) => s.fileUrl)
        .filter((url): url is string => typeof url === "string" && url.trim().length > 0);

      await tx.auditLog.create({
        data: {
          adminId: actor.userId,
          targetId: placement.studentId,
          action: "PRACTICUM_PLACEMENT_DELETED",
          ipAddress,
          metadata: JSON.stringify({
            placementId: placement.id,
            studentId: placement.studentId,
            supervisorId: placement.supervisorId,
            schoolName: placement.schoolName,
            subject: placement.subject,
            gradeLevel: placement.gradeLevel,
            schoolYear: placement.schoolYear,
            deletedSubmissions,
            deletedComments,
            hadRubric: Boolean(placement.rubricStorageKey),
          }),
        },
      });

      return {
        fileUrls,
        deletedSubmissions,
        deletedComments,
        deletedRubric,
      };
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (isPrismaConflictError(err)) {
      throw new HttpError(
        409,
        "Could not delete this placement because of a concurrent update. Please try again."
      );
    }
    throw err;
  }

  let blobDeleteFailed = false;
  if (txResult.fileUrls.length > 0 && isUploadsConfigured()) {
    try {
      await deleteBlobs(txResult.fileUrls);
    } catch (err) {
      blobDeleteFailed = true;
      console.error("[PRACTICUM_BLOB_DELETE_FAILED]", {
        placementId,
        count: txResult.fileUrls.length,
        errorName: err instanceof Error ? err.name : "UnknownError",
      });
    }
  }

  return {
    placementId,
    deletedSubmissions: txResult.deletedSubmissions,
    deletedComments: txResult.deletedComments,
    deletedRubric: txResult.deletedRubric,
    blobFilesAttempted: isUploadsConfigured() ? txResult.fileUrls.length : 0,
    blobDeleteFailed,
  };
}
