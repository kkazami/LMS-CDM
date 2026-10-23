/**
 * apps/web/src/lib/ite/guidance/service.ts
 *
 * Core service executing ITE Study Help requests.
 * Manages database auditing (AiGuidanceRequest), in-memory response caching (30m),
 * rate limiting, and text extraction.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/practicum/http";
import { assertMaterialAccess } from "./guard";
import { checkGuidanceRateLimit } from "./rate-limit";
import { extractMaterialText } from "./text-extractor";
import { requestStudyHelp, type ModelCaller } from "./ai-client";
import type { StudyHelpContent, StudyHelpResponse } from "./types";

interface CacheEntry {
  content: StudyHelpContent;
  expiresAt: number;
}

const cacheMap = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(materialId: string, cleanText: string): string {
  const hash = crypto.createHash("sha256").update(cleanText).digest("hex").slice(0, 16);
  return `${materialId}:${hash}`;
}

export async function logGuidanceRequest({
  userId,
  courseId,
  materialId,
  kind = "MATERIAL_HELP",
  status,
  provider,
}: {
  userId: string;
  courseId?: string | null;
  materialId?: string | null;
  kind?: string;
  status: "OK" | "FAILED" | "BLOCKED";
  provider?: string | null;
}): Promise<void> {
  try {
    await db.aiGuidanceRequest.create({
      data: {
        userId,
        courseId: courseId ?? null,
        materialId: materialId ?? null,
        kind,
        status,
        provider: provider ?? null,
      },
    });
  } catch (err: unknown) {
    console.error("[AiGuidanceRequest] Failed to record request audit log:", err);
  }
}

export async function processMaterialHelp({
  userId,
  materialId,
  modelCaller,
  now = new Date(),
}: {
  userId: string;
  materialId: string;
  modelCaller?: ModelCaller;
  now?: Date;
}): Promise<StudyHelpResponse> {
  // 1. Verify access to material and course
  const materialContext = await assertMaterialAccess(userId, materialId);

  // 2. Rate limit and cooldown check
  const rateLimit = await checkGuidanceRateLimit(userId, now);
  if (!rateLimit.allowed) {
    // Log BLOCKED request
    await logGuidanceRequest({
      userId,
      courseId: materialContext.courseId,
      materialId,
      status: "BLOCKED",
    });

    if (rateLimit.reason === "COOLDOWN_ACTIVE") {
      throw new HttpError(
        429,
        `Please wait ${rateLimit.cooldownSecondsRemaining} second(s) before requesting study help again.`
      );
    }

    throw new HttpError(
      429,
      `You have reached your daily limit of 10 study help requests. Resets at midnight (Asia/Manila).`
    );
  }

  // 3. Extract text from material
  const extraction = extractMaterialText({
    title: materialContext.title,
    description: materialContext.description,
    attachments: materialContext.attachments,
  });

  if (!extraction.available) {
    // Log BLOCKED request (no text to summarize)
    await logGuidanceRequest({
      userId,
      courseId: materialContext.courseId,
      materialId,
      status: "BLOCKED",
    });

    throw new HttpError(
      422,
      extraction.reason || "Study help isn't available for this material."
    );
  }

  // 4. In-Memory Cache Check
  const cacheKey = getCacheKey(materialId, extraction.cleanText);
  const cached = cacheMap.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime()) {
    // Cached response does NOT deduct an additional daily quota, but we log an OK request
    await logGuidanceRequest({
      userId,
      courseId: materialContext.courseId,
      materialId,
      status: "OK",
      provider: "cache",
    });

    return {
      ...cached.content,
      materialId,
      remainingToday: Math.max(0, rateLimit.remainingToday - 1),
      cached: true,
    };
  }

  // 5. Invoke AI Client
  const execution = await requestStudyHelp({
    cleanMaterialText: extraction.cleanText,
    caller: modelCaller,
  });

  if (!execution.success || !execution.content) {
    // Log FAILED request
    await logGuidanceRequest({
      userId,
      courseId: materialContext.courseId,
      materialId,
      status: "FAILED",
      provider: execution.provider,
    });

    throw new HttpError(
      execution.statusCode || 500,
      execution.error || "The study assistant is currently unavailable. Please try again later."
    );
  }

  // 6. Store in cache
  cacheMap.set(cacheKey, {
    content: execution.content,
    expiresAt: now.getTime() + CACHE_TTL_MS,
  });

  // 7. Log OK request
  await logGuidanceRequest({
    userId,
    courseId: materialContext.courseId,
    materialId,
    status: "OK",
    provider: execution.provider,
  });

  return {
    ...execution.content,
    materialId,
    remainingToday: Math.max(0, rateLimit.remainingToday - 1),
    cached: false,
  };
}
