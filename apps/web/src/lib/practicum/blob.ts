import { head } from "@vercel/blob";
import { HttpError } from "./http";
import {
  blobPathnameFromUrl,
  getBlobStoreId,
  isOwnBlobUrl,
  parseVideoLink,
  validateUpload,
  type SubmissionType,
} from "./rules";

export function uploadsConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export interface SubmissionSource {
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  videoLink: string | null;
}

/**
 * Turns the client-supplied file reference or video link into trusted columns.
 * For uploads the server re-checks the URL (our store, this placement's folder), then reads
 * the real size and content type from Blob and re-applies the type/size rules, so nothing the
 * client reports about the file is trusted.
 */
export async function resolveSubmissionSource(args: {
  type: SubmissionType;
  placementId: string;
  fileUrl?: string;
  fileName?: string;
  videoLink?: string;
}): Promise<SubmissionSource> {
  const { type, placementId, fileUrl, fileName, videoLink } = args;

  if (videoLink) {
    if (type !== "DEMO_VIDEO") {
      throw new HttpError(400, "Video links are only allowed for demo videos.");
    }
    const parsed = parseVideoLink(videoLink);
    if (!parsed.ok) throw new HttpError(400, parsed.reason);
    return { fileUrl: null, fileName: null, fileType: null, fileSize: null, videoLink: parsed.url };
  }

  if (!fileUrl || !fileName) {
    throw new HttpError(400, "Provide either an uploaded file or a video link.");
  }
  if (!uploadsConfigured()) {
    throw new HttpError(503, "File uploads are not configured.");
  }

  const storeId = getBlobStoreId(process.env.BLOB_READ_WRITE_TOKEN);
  if (!isOwnBlobUrl(fileUrl, storeId, placementId)) {
    throw new HttpError(400, "The file was not uploaded to this placement.");
  }

  const pathname = blobPathnameFromUrl(fileUrl);
  const nameCheck = validateUpload(type, pathname);
  if (!nameCheck.ok) throw new HttpError(400, nameCheck.reason);

  let size: number;
  let contentType: string;
  try {
    const info = await head(fileUrl);
    size = info.size;
    contentType = info.contentType;
  } catch {
    throw new HttpError(400, "The uploaded file could not be found. Please upload it again.");
  }

  const check = validateUpload(type, pathname, contentType, size);
  if (!check.ok) throw new HttpError(400, check.reason);

  return {
    fileUrl,
    fileName: fileName.slice(0, 255),
    fileType: contentType,
    fileSize: size,
    videoLink: null,
  };
}
