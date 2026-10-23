/**
 * apps/web/src/lib/ite/focus/route-context.ts
 *
 * Pure function to map browser pathname to Focus Mode context, courseId, and refId.
 */

import type { FocusContextType } from "./types";

export interface ResolvedFocusContext {
  contextType: FocusContextType;
  courseId: string | null;
  refId: string | null;
}

/**
 * Resolves the appropriate Focus Mode context from a URL pathname.
 * Pure function: handles query strings, hashes, trailing slashes, and institute prefixes.
 *
 * Rules:
 * - /courses/[courseId]/classwork/forms/[formId]/respond (or a form/quiz item) -> QUIZ, refId = formId or itemId
 * - /learning-materials/... -> MATERIAL, refId = materialId
 * - /flashcards... -> FLASHCARDS
 * - everything else -> STUDY
 * - courseId = extracted from /courses/[courseId]/ when present
 */
export function resolveFocusContextFromPath(rawPathname: string | null | undefined): ResolvedFocusContext {
  if (!rawPathname) {
    return { contextType: "STUDY", courseId: null, refId: null };
  }

  // 1. Clean query params, hashes, and decode URI
  const cleanPath = rawPathname.split("?")[0].split("#")[0].trim();
  const segments = cleanPath.split("/").filter(Boolean);

  // 2. Extract courseId if present under /courses/[courseId]
  let courseId: string | null = null;
  const coursesIdx = segments.indexOf("courses");
  if (coursesIdx !== -1 && coursesIdx + 1 < segments.length) {
    const candidate = segments[coursesIdx + 1];
    if (candidate && candidate !== "archived") {
      courseId = candidate;
    }
  }

  // 3. Check for Quiz / Form Respond / Form / Quiz item
  const formsIdx = segments.indexOf("forms");
  if (formsIdx !== -1 && formsIdx + 1 < segments.length) {
    const formId = segments[formsIdx + 1];
    return {
      contextType: "QUIZ",
      courseId,
      refId: formId,
    };
  }

  const classworkIdx = segments.indexOf("classwork");
  if (classworkIdx !== -1 && classworkIdx + 1 < segments.length) {
    const nextSeg = segments[classworkIdx + 1];
    if (nextSeg && nextSeg !== "forms") {
      if (nextSeg === "quiz" && classworkIdx + 2 < segments.length) {
        return {
          contextType: "QUIZ",
          courseId,
          refId: segments[classworkIdx + 2],
        };
      }
      return {
        contextType: "QUIZ",
        courseId,
        refId: nextSeg,
      };
    }
  }

  // 4. Check for Learning Materials: /learning-materials/...
  const lmIdx = segments.indexOf("learning-materials");
  if (lmIdx !== -1) {
    const remaining = segments.slice(lmIdx + 1).filter((s) => s !== "read");
    let materialId: string | null = null;
    if (remaining.length >= 2) {
      if (!courseId) courseId = remaining[0];
      materialId = remaining[1];
    } else if (remaining.length === 1) {
      // If courseId was already extracted, this single segment is the materialId;
      // otherwise, if it looks like /learning-materials/[courseId], materialId is null
      if (courseId) {
        materialId = remaining[0];
      }
    }
    return {
      contextType: "MATERIAL",
      courseId,
      refId: materialId,
    };
  }

  // 5. Check for Flashcards: /flashcards...
  const fcIdx = segments.indexOf("flashcards");
  if (fcIdx !== -1) {
    const remaining = segments.slice(fcIdx + 1);
    const deckId = remaining.length > 0 ? remaining[0] : null;
    return {
      contextType: "FLASHCARDS",
      courseId,
      refId: deckId,
    };
  }

  // 6. Default to STUDY
  return {
    contextType: "STUDY",
    courseId,
    refId: null,
  };
}
