import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { uploadsConfigured } from "@/lib/practicum/blob";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import {
  SUBMISSION_TYPES,
  UPLOAD_RULES,
  allowedContentTypes,
  isValidUploadPathname,
  validateUpload,
} from "@/lib/practicum/rules";
import { requirePlacementAccess } from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

const clientPayloadSchema = z.object({
  placementId: z.string().min(1),
  type: z.enum(SUBMISSION_TYPES),
});

/**
 * POST /api/practicum/upload
 * Issues a short-lived Vercel Blob client token. The file itself goes from the browser straight
 * to Blob (never through this route), so Vercel's request body limit does not apply.
 *
 * Only an ITE student with an ACTIVE placement can get a token, restricted to the type's
 * extensions / content types / maximum size, and to `practicum/<placementId>/`.
 * There is intentionally no onUploadCompleted callback (it never fires on localhost); the
 * client reports the finished upload to /api/practicum/submissions, which re-verifies it.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["STUDENT"]);

    if (!uploadsConfigured()) {
      throw new HttpError(503, "File uploads are not configured.");
    }

    const body = (await readJson(request)) as HandleUploadBody;
    if (body?.type !== "blob.generate-client-token") {
      throw new HttpError(400, "Unsupported upload event.");
    }

    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = clientPayloadSchema.safeParse(
          (() => {
            try {
              return JSON.parse(clientPayload ?? "");
            } catch {
              return null;
            }
          })()
        );
        if (!parsed.success) throw new HttpError(400, "Missing upload details.");
        const { placementId, type } = parsed.data;

        const { placement } = await requirePlacementAccess(placementId, actor, "student");
        if (placement.status !== "ACTIVE") {
          throw new HttpError(409, "This placement is completed and no longer accepts submissions.");
        }

        if (!isValidUploadPathname(pathname, placementId)) {
          throw new HttpError(400, "Invalid upload location.");
        }
        const nameCheck = validateUpload(type, pathname);
        if (!nameCheck.ok) throw new HttpError(400, nameCheck.reason);

        return {
          allowedContentTypes: allowedContentTypes(type),
          maximumSizeInBytes: UPLOAD_RULES[type].maxBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ placementId, type, userId: actor.userId }),
        };
      },
    });

    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err);
  }
}
