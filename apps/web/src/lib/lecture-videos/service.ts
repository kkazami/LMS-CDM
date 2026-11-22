import fs from "node:fs";
import path from "node:path";
import { del, head } from "@vercel/blob";
import { db } from "@/lib/db";
import { resolveIteStudentProgramFromRecord } from "@/lib/ite-programs/features";
import type { LectureVideosActor } from "./guard";
import {
  APPROVED_ENROLLMENT_STATUS,
  LECTURE_MIME_BY_EXTENSION,
  LECTURE_SOURCE_LABELS,
  LECTURE_UPLOADS_UNAVAILABLE_MESSAGE,
  buildFacultyLectureProgressReport,
  buildGoogleDriveLectureEmbedUrl,
  buildYouTubeLectureEmbedUrl,
  canActorAssignLectureToCourse,
  canActorViewLecture,
  canActorViewLectureProgress,
  canManageLecture,
  canUploadLecture,
  canWriteStudentLectureProgress,
  formatCourseSubjectLabel,
  getLectureBlobStoreId,
  getLectureFileExtension,
  isOwnLectureBlobUrl,
  isValidLectureUploadPathname,
  lectureBlobPathnameFromUrl,
  parseExternalLectureUrl,
  resolveStreamableUploadLecture,
  toStudentLectureProgressSummary,
  validateAndMergeLectureProgress,
  validateLectureMetadata,
  validateLectureSignature,
  validateLectureUpload,
  type FacultyLectureProgressReport,
  type IncomingProgressPayload,
  type IteCourseSummary,
  type IteLectureVideoDTO,
  type IteStudentIdentity,
  type LectureCourseAccessSnapshot,
  type LectureSourceType,
  type StudentLectureProgressSummary,
} from "./lectures";

export const LOCAL_LECTURE_URL_PREFIX = "local-lecture://";

export class LectureVideosHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function blobLectureUploadsConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function localLectureUploadsConfigured(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL !== "1";
}

export function lectureUploadsConfigured(): boolean {
  return blobLectureUploadsConfigured() || localLectureUploadsConfigured();
}

export function assertLectureUploadsConfigured(): void {
  if (!lectureUploadsConfigured()) {
    console.error(
      "[lecture-videos] File upload rejected: BLOB_READ_WRITE_TOKEN is not configured on the server."
    );
    throw new LectureVideosHttpError(503, LECTURE_UPLOADS_UNAVAILABLE_MESSAGE);
  }
}

export function getLocalLectureStorageRoot(): string {
  return path.resolve(process.cwd(), ".local-uploads", "lecture-videos");
}

export function resolveLocalLectureFilePath(pathname: string): string | null {
  const clean = pathname.replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.includes("\\")) {
    return null;
  }
  const root = getLocalLectureStorageRoot();
  const fullPath = path.resolve(root, clean);
  if (!fullPath.startsWith(root + path.sep)) {
    return null;
  }
  return fullPath;
}

export async function deleteLocalLectureFile(fileUrl: string): Promise<void> {
  if (!fileUrl.startsWith(LOCAL_LECTURE_URL_PREFIX)) return;
  const pathname = fileUrl.slice(LOCAL_LECTURE_URL_PREFIX.length);
  const fullPath = resolveLocalLectureFilePath(pathname);
  if (!fullPath) return;
  await fs.promises.unlink(fullPath).catch(() => {});
}

function normalizeSourceType(raw: unknown): LectureSourceType {
  if (raw === "YOUTUBE" || raw === "DRIVE") {
    return raw;
  }
  return "UPLOAD";
}

function toCourseAccessSnapshot(
  course: {
    id: string;
    instructorId?: string | null;
    isArchived?: boolean;
    institute?: { code: string } | null;
  } | null
): LectureCourseAccessSnapshot | null {
  if (!course) return null;
  return {
    id: course.id,
    instructorId: course.instructorId ?? null,
    isArchived: Boolean(course.isArchived),
    instituteCode: course.institute?.code?.toLowerCase() ?? "ite",
  };
}

export async function verifyAndResolveLectureBlob(args: {
  fileUrl: string;
  fileName: string;
  uploaderId: string;
}): Promise<{
  storageUrl: string;
  storagePathname: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}> {
  const { fileUrl, fileName, uploaderId } = args;

  if (!fileUrl || !fileName) {
    throw new LectureVideosHttpError(400, "Please upload a lecture video file.");
  }
  assertLectureUploadsConfigured();

  if (fileUrl.startsWith(LOCAL_LECTURE_URL_PREFIX)) {
    if (!localLectureUploadsConfigured()) {
      throw new LectureVideosHttpError(503, LECTURE_UPLOADS_UNAVAILABLE_MESSAGE);
    }
    const pathname = fileUrl.slice(LOCAL_LECTURE_URL_PREFIX.length);
    if (!isValidLectureUploadPathname(pathname, uploaderId)) {
      throw new LectureVideosHttpError(
        400,
        "The video file was not uploaded to the authorized lecture storage."
      );
    }
    const fullPath = resolveLocalLectureFilePath(pathname);
    if (!fullPath) {
      throw new LectureVideosHttpError(400, "Invalid upload destination.");
    }

    let size: number;
    try {
      const stat = await fs.promises.stat(fullPath);
      size = stat.size;
    } catch {
      throw new LectureVideosHttpError(
        400,
        "The uploaded video file could not be verified. Please upload it again."
      );
    }

    const ext = getLectureFileExtension(pathname);
    const contentType =
      ext === "mp4" || ext === "webm"
        ? LECTURE_MIME_BY_EXTENSION[ext]
        : "video/mp4";
    const check = validateLectureUpload(pathname, contentType, size);
    if (!check.ok) {
      await deleteLocalLectureFile(fileUrl);
      throw new LectureVideosHttpError(400, check.reason ?? "Invalid video file.");
    }

    try {
      const fd = await fs.promises.open(fullPath, "r");
      try {
        const headerBuffer = Buffer.alloc(Math.min(32, size));
        await fd.read(headerBuffer, 0, headerBuffer.length, 0);
        const sigCheck = validateLectureSignature(
          pathname,
          new Uint8Array(headerBuffer)
        );
        if (!sigCheck.ok) {
          await fd.close().catch(() => {});
          await deleteLocalLectureFile(fileUrl);
          throw new LectureVideosHttpError(
            400,
            sigCheck.reason ?? "Video file signature verification failed."
          );
        }
      } finally {
        await fd.close().catch(() => {});
      }
    } catch (err) {
      if (err instanceof LectureVideosHttpError) throw err;
      throw new LectureVideosHttpError(
        400,
        "Could not verify the uploaded video signature. Please try again."
      );
    }

    return {
      storageUrl: fileUrl,
      storagePathname: pathname,
      fileName: fileName.slice(0, 255),
      mimeType: contentType,
      fileSize: size,
    };
  }

  const storeId = getLectureBlobStoreId(process.env.BLOB_READ_WRITE_TOKEN);
  if (!isOwnLectureBlobUrl(fileUrl, storeId, uploaderId)) {
    throw new LectureVideosHttpError(
      400,
      "The video file was not uploaded to the authorized lecture storage."
    );
  }

  const pathname = lectureBlobPathnameFromUrl(fileUrl);
  const nameCheck = validateLectureUpload(pathname);
  if (!nameCheck.ok) {
    await del(fileUrl).catch(() => {});
    throw new LectureVideosHttpError(400, nameCheck.reason ?? "Invalid video file.");
  }

  let size: number;
  let contentType: string;
  try {
    const info = await head(fileUrl);
    size = info.size;
    contentType = info.contentType;
  } catch {
    throw new LectureVideosHttpError(
      400,
      "The uploaded video file could not be verified. Please upload it again."
    );
  }

  const check = validateLectureUpload(pathname, contentType, size);
  if (!check.ok) {
    await del(fileUrl).catch(() => {});
    throw new LectureVideosHttpError(400, check.reason ?? "Invalid video file.");
  }

  try {
    const rangeRes = await fetch(fileUrl, {
      headers: { Range: "bytes=0-31" },
      cache: "no-store",
    });
    if (rangeRes.ok || rangeRes.status === 206) {
      const headerBuffer = await rangeRes.arrayBuffer();
      const headerBytes = new Uint8Array(headerBuffer);
      const sigCheck = validateLectureSignature(pathname, headerBytes);
      if (!sigCheck.ok) {
        await del(fileUrl).catch(() => {});
        throw new LectureVideosHttpError(
          400,
          sigCheck.reason ?? "Video file signature verification failed."
        );
      }
    }
  } catch (err) {
    if (err instanceof LectureVideosHttpError) throw err;
    throw new LectureVideosHttpError(
      400,
      "Could not verify the uploaded video signature. Please try again."
    );
  }

  return {
    storageUrl: fileUrl,
    storagePathname: pathname,
    fileName: fileName.slice(0, 255),
    mimeType: contentType.split(";")[0]?.trim().toLowerCase() || "video/mp4",
    fileSize: size,
  };
}

function mapLectureToDTO(
  row: {
    id: string;
    title: string;
    description: string | null;
    courseId: string;
    sourceType?: string;
    externalVideoId?: string | null;
    externalUrl?: string | null;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    durationSeconds: number;
    uploadedById: string;
    createdAt: Date;
    updatedAt: Date;
    course: {
      id: string;
      code: string;
      title: string;
      section: string;
      instructorId: string | null;
      isArchived: boolean;
      institute?: { code: string } | null;
    };
    uploadedBy: { id: string; name: string };
    progress?: Array<{
      lastPositionSeconds: number;
      watchedSeconds: number;
      durationSeconds: number;
      completedAt: Date | null;
      lastWatchedAt: Date;
    }>;
  },
  actor: LectureVideosActor
): IteLectureVideoDTO {
  const sourceType = normalizeSourceType(row.sourceType);
  const externalVideoId = row.externalVideoId ?? null;
  const externalUrl = row.externalUrl ?? null;

  let embedUrl: string | null = null;
  if (sourceType === "YOUTUBE" && externalVideoId) {
    embedUrl = buildYouTubeLectureEmbedUrl(externalVideoId);
  } else if (sourceType === "DRIVE" && externalVideoId) {
    embedUrl = buildGoogleDriveLectureEmbedUrl(externalVideoId);
  }

  const isProgressTracked = sourceType !== "DRIVE";
  const rawProgress = row.progress?.[0] ?? null;
  const courseSnapshot = toCourseAccessSnapshot(row.course);

  const courseCode = row.course.code;
  const courseTitle = row.course.title;
  const courseSection = row.course.section ?? "";
  const courseLabel = formatCourseSubjectLabel({
    code: courseCode,
    title: courseTitle,
    section: courseSection,
  });

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    courseId: row.courseId,
    courseCode,
    courseTitle,
    courseSection,
    courseLabel,
    sourceType,
    sourceLabel: LECTURE_SOURCE_LABELS[sourceType],
    externalVideoId,
    externalUrl,
    embedUrl,
    fileName: row.fileName ?? null,
    mimeType: row.mimeType ?? null,
    fileSize: row.fileSize ?? null,
    durationSeconds: row.durationSeconds,
    uploadedById: row.uploadedById,
    uploadedByName: row.uploadedBy.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    streamUrl:
      sourceType === "UPLOAD" ? `/api/lecture-videos/${row.id}/stream` : null,
    isProgressTracked,
    canManage: canManageLecture(
      {
        userId: actor.userId,
        role: actor.role,
        instituteCode: actor.instituteCode,
      },
      {
        uploadedById: row.uploadedById,
        course: courseSnapshot,
      }
    ),
    canViewProgress: canActorViewLectureProgress(
      {
        userId: actor.userId,
        role: actor.role,
        instituteCode: actor.instituteCode,
      },
      courseSnapshot
    ),
    myProgress:
      actor.role === "STUDENT" && isProgressTracked
        ? toStudentLectureProgressSummary(rawProgress, row.durationSeconds)
        : null,
  };
}

/**
 * Lists the active ITE courses visible/selectable for the current actor:
 * - STUDENT: courses in ITE where the student has an APPROVED enrollment.
 * - INSTRUCTOR: active ITE courses taught by this instructor (`instructorId === actor.userId`).
 * - ADMIN: all active ITE courses.
 */
export async function listActorIteCourses(
  actor: LectureVideosActor
): Promise<IteCourseSummary[]> {
  try {
    if (actor.role === "STUDENT") {
      const enrollments = await db.enrollment.findMany({
        where: {
          studentId: actor.userId,
          status: APPROVED_ENROLLMENT_STATUS,
          course: {
            isArchived: false,
            institute: { code: "ite" },
          },
        },
        select: {
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              section: true,
            },
          },
        },
        orderBy: [
          { course: { code: "asc" } },
          { course: { section: "asc" } },
          { course: { title: "asc" } },
        ],
      });

      return enrollments.map(({ course }) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        section: course.section ?? "",
        displayLabel: formatCourseSubjectLabel(course),
      }));
    }

    const courses = await db.course.findMany({
      where: {
        isArchived: false,
        institute: { code: "ite" },
        ...(actor.role === "INSTRUCTOR" ? { instructorId: actor.userId } : {}),
      },
      select: {
        id: true,
        code: true,
        title: true,
        section: true,
      },
      orderBy: [{ code: "asc" }, { section: "asc" }, { title: "asc" }],
    });

    return courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      section: course.section ?? "",
      displayLabel: formatCourseSubjectLabel(course),
    }));
  } catch {
    return [];
  }
}

/**
 * Lists recorded lectures visible to the current actor:
 * - STUDENT: only lectures belonging to active ITE courses where the student has an APPROVED enrollment.
 * - INSTRUCTOR: only lectures belonging to active ITE courses they teach.
 * - ADMIN: all lectures belonging to active ITE courses.
 */
export async function listIteLectureVideos(
  actor: LectureVideosActor,
  options?: { courseId?: string | null }
): Promise<IteLectureVideoDTO[]> {
  try {
    const courseFilterId = (options?.courseId ?? "").trim() || undefined;

    const courseWhere =
      actor.role === "STUDENT"
        ? {
            isArchived: false,
            institute: { code: "ite" },
            enrollments: {
              some: {
                studentId: actor.userId,
                status: APPROVED_ENROLLMENT_STATUS,
              },
            },
          }
        : actor.role === "INSTRUCTOR"
          ? {
              isArchived: false,
              institute: { code: "ite" },
              instructorId: actor.userId,
            }
          : {
              isArchived: false,
              institute: { code: "ite" },
            };

    const rows = await db.iteLectureVideo.findMany({
      where: {
        ...(courseFilterId ? { courseId: courseFilterId } : {}),
        course: courseWhere,
      },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            section: true,
            instructorId: true,
            isArchived: true,
            institute: {
              select: { code: true },
            },
          },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        ...(actor.role === "STUDENT"
          ? {
              progress: {
                where: { studentId: actor.userId },
                take: 1,
              },
            }
          : {}),
      },
    });
    return rows.map((row) => mapLectureToDTO(row, actor));
  } catch {
    return [];
  }
}

/**
 * Fetches a single lecture by ID and enforces course-level visibility:
 * - Student must have an APPROVED enrollment in `lecture.courseId`.
 * - Instructor must teach `lecture.courseId`.
 * - Admin can view any active ITE lecture.
 */
export async function getIteLectureVideoById(
  actor: LectureVideosActor,
  lectureId: string
): Promise<IteLectureVideoDTO> {
  const row = await db.iteLectureVideo.findUnique({
    where: { id: lectureId },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          section: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
      ...(actor.role === "STUDENT"
        ? {
            progress: {
              where: { studentId: actor.userId },
              take: 1,
            },
          }
        : {}),
    },
  });

  if (!row) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }

  let enrollmentStatus: string | null = null;
  if (actor.role === "STUDENT") {
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: row.courseId,
          studentId: actor.userId,
        },
      },
      select: { status: true },
    });
    enrollmentStatus = enrollment?.status ?? null;
  }

  const allowed = canActorViewLecture(
    {
      userId: actor.userId,
      role: actor.role,
      instituteCode: actor.instituteCode,
    },
    {
      course: toCourseAccessSnapshot(row.course),
      enrollmentStatus,
    }
  );

  if (!allowed) {
    throw new LectureVideosHttpError(
      403,
      "You do not have access to this course's lecture videos."
    );
  }

  return mapLectureToDTO(row, actor);
}

export async function cleanupUncommittedLectureBlob(
  actor: LectureVideosActor,
  fileUrl: string
): Promise<{ cleaned: boolean }> {
  if (
    !canUploadLecture({
      role: actor.role,
      instituteCode: actor.instituteCode,
    })
  ) {
    throw new LectureVideosHttpError(
      403,
      "Only ITE faculty and administrators can manage lecture uploads."
    );
  }

  if (!fileUrl || !lectureUploadsConfigured()) {
    return { cleaned: false };
  }

  if (fileUrl.startsWith(LOCAL_LECTURE_URL_PREFIX)) {
    const pathname = fileUrl.slice(LOCAL_LECTURE_URL_PREFIX.length);
    if (!isValidLectureUploadPathname(pathname, actor.userId)) {
      throw new LectureVideosHttpError(
        400,
        "Cannot delete a blob outside your lecture upload namespace."
      );
    }
    const existingLocal = await db.iteLectureVideo
      .findFirst({
        where: { storageUrl: fileUrl },
        select: { id: true },
      })
      .catch(() => null);
    if (existingLocal) {
      return { cleaned: false };
    }
    await deleteLocalLectureFile(fileUrl);
    return { cleaned: true };
  }

  const storeId = getLectureBlobStoreId(process.env.BLOB_READ_WRITE_TOKEN);
  if (!isOwnLectureBlobUrl(fileUrl, storeId, actor.userId)) {
    throw new LectureVideosHttpError(
      400,
      "Cannot delete a blob outside your lecture upload namespace."
    );
  }

  const existing = await db.iteLectureVideo
    .findFirst({
      where: { storageUrl: fileUrl },
      select: { id: true },
    })
    .catch(() => null);

  if (existing) {
    return { cleaned: false };
  }

  await del(fileUrl).catch(() => {});
  return { cleaned: true };
}

async function resolveAndAuthorizeTargetCourse(
  actor: LectureVideosActor,
  courseId: string
) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      code: true,
      title: true,
      section: true,
      instructorId: true,
      isArchived: true,
      institute: {
        select: { code: true },
      },
    },
  });

  const check = canActorAssignLectureToCourse(
    {
      userId: actor.userId,
      role: actor.role,
      instituteCode: actor.instituteCode,
    },
    toCourseAccessSnapshot(course)
  );

  if (!check.ok) {
    throw new LectureVideosHttpError(check.status, check.reason);
  }

  return course!;
}

export async function createIteLectureVideo(
  actor: LectureVideosActor,
  input: {
    title: unknown;
    description?: unknown;
    courseId: unknown;
    sourceType?: unknown;
    externalUrl?: unknown;
    fileUrl?: string;
    fileName?: string;
    durationSeconds?: number;
  }
): Promise<IteLectureVideoDTO> {
  if (
    !canUploadLecture({
      role: actor.role,
      instituteCode: actor.instituteCode,
    })
  ) {
    throw new LectureVideosHttpError(
      403,
      "Only ITE faculty and administrators can upload recorded lectures."
    );
  }

  const rawSourceType =
    input.sourceType === undefined ? "UPLOAD" : input.sourceType;
  if (
    rawSourceType !== "UPLOAD" &&
    rawSourceType !== "YOUTUBE" &&
    rawSourceType !== "DRIVE"
  ) {
    throw new LectureVideosHttpError(400, "Invalid lecture source type.");
  }
  const sourceType: LectureSourceType = rawSourceType;

  const meta = validateLectureMetadata({
    title: input.title,
    description: input.description,
    courseId: input.courseId,
  });
  if (!meta.ok) {
    if (sourceType === "UPLOAD" && input.fileUrl) {
      await cleanupUncommittedLectureBlob(actor, input.fileUrl).catch(() => {});
    }
    throw new LectureVideosHttpError(400, meta.reason);
  }

  try {
    await resolveAndAuthorizeTargetCourse(actor, meta.courseId);
  } catch (err) {
    if (sourceType === "UPLOAD" && input.fileUrl) {
      await cleanupUncommittedLectureBlob(actor, input.fileUrl).catch(() => {});
    }
    throw err;
  }

  if (sourceType === "YOUTUBE" || sourceType === "DRIVE") {
    const parsedLink = parseExternalLectureUrl(sourceType, input.externalUrl);
    if (!parsedLink.ok) {
      throw new LectureVideosHttpError(400, parsedLink.reason);
    }

    const created = await db.iteLectureVideo.create({
      data: {
        title: meta.title,
        description: meta.description,
        courseId: meta.courseId,
        sourceType: parsedLink.sourceType,
        externalVideoId: parsedLink.videoId,
        externalUrl: parsedLink.canonicalUrl,
        storageUrl: null,
        storagePathname: null,
        fileName: null,
        mimeType: null,
        fileSize: null,
        durationSeconds: 0,
        uploadedById: actor.userId,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            section: true,
            instructorId: true,
            isArchived: true,
            institute: {
              select: { code: true },
            },
          },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return mapLectureToDTO(created, actor);
  }

  const resolvedBlob = await verifyAndResolveLectureBlob({
    fileUrl: input.fileUrl ?? "",
    fileName: input.fileName ?? "",
    uploaderId: actor.userId,
  });

  const durationSeconds =
    typeof input.durationSeconds === "number" &&
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds >= 0
      ? Math.round(input.durationSeconds * 100) / 100
      : 0;

  try {
    const created = await db.iteLectureVideo.create({
      data: {
        title: meta.title,
        description: meta.description,
        courseId: meta.courseId,
        sourceType: "UPLOAD",
        externalVideoId: null,
        externalUrl: null,
        storageUrl: resolvedBlob.storageUrl,
        storagePathname: resolvedBlob.storagePathname,
        fileName: resolvedBlob.fileName,
        mimeType: resolvedBlob.mimeType,
        fileSize: resolvedBlob.fileSize,
        durationSeconds,
        uploadedById: actor.userId,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            section: true,
            instructorId: true,
            isArchived: true,
            institute: {
              select: { code: true },
            },
          },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return mapLectureToDTO(created, actor);
  } catch (err) {
    if (resolvedBlob.storageUrl.startsWith(LOCAL_LECTURE_URL_PREFIX)) {
      await deleteLocalLectureFile(resolvedBlob.storageUrl);
    } else {
      await del(resolvedBlob.storageUrl).catch(() => {});
    }
    throw err;
  }
}

export async function updateIteLectureVideo(
  actor: LectureVideosActor,
  lectureId: string,
  input: {
    title: unknown;
    description?: unknown;
    courseId?: unknown;
  }
): Promise<IteLectureVideoDTO> {
  const existing = await db.iteLectureVideo.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      uploadedById: true,
      courseId: true,
      course: {
        select: {
          id: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
    },
  });
  if (!existing) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }

  if (
    !canManageLecture(
      {
        userId: actor.userId,
        role: actor.role,
        instituteCode: actor.instituteCode,
      },
      {
        uploadedById: existing.uploadedById,
        course: toCourseAccessSnapshot(existing.course),
      }
    )
  ) {
    throw new LectureVideosHttpError(
      403,
      "You can only edit your own recorded lectures."
    );
  }

  const targetCourseId =
    input.courseId !== undefined && input.courseId !== null
      ? input.courseId
      : existing.courseId;

  const meta = validateLectureMetadata({
    title: input.title,
    description: input.description,
    courseId: targetCourseId,
  });
  if (!meta.ok) {
    throw new LectureVideosHttpError(400, meta.reason);
  }

  await resolveAndAuthorizeTargetCourse(actor, meta.courseId);

  const updated = await db.iteLectureVideo.update({
    where: { id: lectureId },
    data: {
      title: meta.title,
      description: meta.description,
      courseId: meta.courseId,
    },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          section: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });

  return mapLectureToDTO(updated, actor);
}

export async function deleteIteLectureVideo(
  actor: LectureVideosActor,
  lectureId: string
): Promise<{ deletedId: string }> {
  const existing = await db.iteLectureVideo.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      uploadedById: true,
      sourceType: true,
      storageUrl: true,
      course: {
        select: {
          id: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
    },
  });
  if (!existing) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }

  if (
    !canManageLecture(
      {
        userId: actor.userId,
        role: actor.role,
        instituteCode: actor.instituteCode,
      },
      {
        uploadedById: existing.uploadedById,
        course: toCourseAccessSnapshot(existing.course),
      }
    )
  ) {
    throw new LectureVideosHttpError(
      403,
      "You can only delete your own recorded lectures."
    );
  }

  await db.iteLectureVideo.delete({
    where: { id: lectureId },
  });

  if (
    normalizeSourceType(existing.sourceType) === "UPLOAD" &&
    existing.storageUrl &&
    lectureUploadsConfigured()
  ) {
    if (existing.storageUrl.startsWith(LOCAL_LECTURE_URL_PREFIX)) {
      await deleteLocalLectureFile(existing.storageUrl);
    } else if (blobLectureUploadsConfigured()) {
      await del(existing.storageUrl).catch(() => {});
    }
  }

  return { deletedId: lectureId };
}

export async function getLectureForStreaming(
  actor: LectureVideosActor,
  lectureId: string
): Promise<{
  id: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
}> {
  if (!actor.userId) {
    throw new LectureVideosHttpError(401, "Authentication required.");
  }
  const lecture = await db.iteLectureVideo.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      courseId: true,
      sourceType: true,
      storageUrl: true,
      mimeType: true,
      fileSize: true,
      fileName: true,
      course: {
        select: {
          id: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!lecture) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }

  let enrollmentStatus: string | null = null;
  if (actor.role === "STUDENT") {
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: lecture.courseId,
          studentId: actor.userId,
        },
      },
      select: { status: true },
    });
    enrollmentStatus = enrollment?.status ?? null;
  }

  const allowed = canActorViewLecture(
    {
      userId: actor.userId,
      role: actor.role,
      instituteCode: actor.instituteCode,
    },
    {
      course: toCourseAccessSnapshot(lecture.course),
      enrollmentStatus,
    }
  );

  if (!allowed) {
    throw new LectureVideosHttpError(
      403,
      "You do not have access to this course's lecture videos."
    );
  }

  const streamable = resolveStreamableUploadLecture(lecture);
  if (!streamable) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }
  return streamable;
}

export async function recordStudentLectureProgress(
  actor: LectureVideosActor,
  lectureId: string,
  payload: IncomingProgressPayload
): Promise<StudentLectureProgressSummary> {
  const perm = canWriteStudentLectureProgress(
    {
      userId: actor.userId,
      role: actor.role,
      instituteCode: actor.instituteCode,
    },
    payload.studentId
  );
  if (!perm.ok) {
    throw new LectureVideosHttpError(perm.status, perm.reason);
  }

  const lecture = await db.iteLectureVideo.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      courseId: true,
      sourceType: true,
      durationSeconds: true,
      course: {
        select: {
          id: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
    },
  });
  if (!lecture) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }

  const enrollment = await db.enrollment.findUnique({
    where: {
      courseId_studentId: {
        courseId: lecture.courseId,
        studentId: perm.studentId,
      },
    },
    select: { status: true },
  });

  if (
    !canActorViewLecture(
      {
        userId: actor.userId,
        role: actor.role,
        instituteCode: actor.instituteCode,
      },
      {
        course: toCourseAccessSnapshot(lecture.course),
        enrollmentStatus: enrollment?.status ?? null,
      }
    )
  ) {
    throw new LectureVideosHttpError(
      403,
      "You must be enrolled in this course to record lecture progress."
    );
  }

  const sourceType = normalizeSourceType(lecture.sourceType);

  const existing = await db.iteLectureVideoProgress.findUnique({
    where: {
      lectureId_studentId: {
        lectureId,
        studentId: perm.studentId,
      },
    },
  });

  const now = new Date();
  const merged = validateAndMergeLectureProgress({
    existing,
    input: payload,
    lectureDurationSeconds: lecture.durationSeconds,
    sourceType,
    now,
  });

  if (!merged.ok) {
    throw new LectureVideosHttpError(400, merged.reason);
  }

  const { value } = merged;

  const saved = await db.iteLectureVideoProgress.upsert({
    where: {
      lectureId_studentId: {
        lectureId,
        studentId: perm.studentId,
      },
    },
    create: {
      lectureId,
      studentId: perm.studentId,
      lastPositionSeconds: value.lastPositionSeconds,
      watchedSeconds: value.watchedSeconds,
      durationSeconds: value.durationSeconds,
      completedAt: value.completedAt,
      lastWatchedAt: now,
    },
    update: {
      lastPositionSeconds: value.lastPositionSeconds,
      watchedSeconds: value.watchedSeconds,
      durationSeconds: value.durationSeconds,
      completedAt: value.completedAt,
      lastWatchedAt: now,
    },
  });

  if (lecture.durationSeconds <= 0 && value.durationSeconds > 0) {
    await db.iteLectureVideo
      .update({
        where: { id: lectureId },
        data: { durationSeconds: value.durationSeconds },
      })
      .catch(() => {});
  }

  return toStudentLectureProgressSummary(
    saved,
    lecture.durationSeconds > 0 ? lecture.durationSeconds : value.durationSeconds
  )!;
}

/**
 * Fetches ONLY the active ITE students currently enrolled (`status: "APPROVED"`) in the specified course.
 * Students who are not enrolled or whose enrollment is `PENDING`, `DROPPED`, or `REJECTED` are excluded.
 */
export async function listEnrolledStudentsForCourseFromDb(
  courseId: string,
  courseSection = ""
): Promise<IteStudentIdentity[]> {
  const enrollments = await db.enrollment.findMany({
    where: {
      courseId,
      status: APPROVED_ENROLLMENT_STATUS,
      student: {
        role: "STUDENT",
        isActive: true,
        institute: { code: "ite" },
      },
    },
    select: {
      status: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentNumber: true,
          department: true,
          section: true,
          programMemberships: {
            where: { isActive: true },
            select: {
              isActive: true,
              kind: true,
              program: {
                select: { code: true, name: true },
              },
            },
          },
          enrollments: {
            where: { status: APPROVED_ENROLLMENT_STATUS },
            select: {
              status: true,
              course: {
                select: {
                  section: true,
                  program: {
                    select: { code: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  return enrollments.map((row) => {
    const user = row.student;
    const resolved = resolveIteStudentProgramFromRecord(user);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      studentNumber: user.studentNumber,
      programCode: resolved?.programCode ?? null,
      section: user.section || courseSection || null,
      enrollmentStatus: row.status,
    };
  });
}

export async function getFacultyLectureProgress(
  actor: LectureVideosActor,
  lectureId: string
): Promise<FacultyLectureProgressReport> {
  const lecture = await db.iteLectureVideo.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      title: true,
      courseId: true,
      sourceType: true,
      durationSeconds: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          section: true,
          instructorId: true,
          isArchived: true,
          institute: {
            select: { code: true },
          },
        },
      },
      progress: {
        select: {
          studentId: true,
          lastPositionSeconds: true,
          watchedSeconds: true,
          durationSeconds: true,
          completedAt: true,
          lastWatchedAt: true,
        },
      },
    },
  });

  if (!lecture) {
    throw new LectureVideosHttpError(404, "Recorded lecture not found.");
  }

  if (
    !canActorViewLectureProgress(
      {
        userId: actor.userId,
        role: actor.role,
        instituteCode: actor.instituteCode,
      },
      toCourseAccessSnapshot(lecture.course)
    )
  ) {
    throw new LectureVideosHttpError(
      403,
      "Only instructors of this course and ITE administrators can view student lecture progress."
    );
  }

  const students = await listEnrolledStudentsForCourseFromDb(
    lecture.courseId,
    lecture.course.section ?? ""
  );
  const lectureSourceType = normalizeSourceType(lecture.sourceType);

  return buildFacultyLectureProgressReport({
    lectureId: lecture.id,
    lectureTitle: lecture.title,
    courseId: lecture.course.id,
    courseCode: lecture.course.code,
    courseTitle: lecture.course.title,
    courseSection: lecture.course.section ?? "",
    lectureSourceType,
    lectureDurationSeconds: lecture.durationSeconds,
    students,
    progressRows: lecture.progress,
  });
}
