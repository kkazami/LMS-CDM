import type {
  FrameworkId,
  LessonPlanFormValues,
  LessonPlanFramework,
  StoredLessonPlanDraft,
} from "./types";

export const MAX_FIELD_LENGTH = 4000;
export const MAX_TOTAL_PLAN_BYTES = 60 * 1024; // 60 KB
export const DRAFT_STORAGE_VERSION = 1;

/**
 * Strips dangerous ASCII control characters (\x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F)
 * while preserving valid line breaks (\r, \n) and tabs (\t).
 */
export function sanitizeInput(text: string | null | undefined): string {
  if (!text) return "";
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Validates a single text field length against the 4000-character cap.
 */
export function validateField(value: string | null | undefined): {
  valid: boolean;
  length: number;
  error?: string;
} {
  const sanitized = sanitizeInput(value);
  const length = sanitized.length;
  if (length > MAX_FIELD_LENGTH) {
    return {
      valid: false,
      length,
      error: `Field exceeds maximum limit of ${MAX_FIELD_LENGTH.toLocaleString()} characters (currently ${length.toLocaleString()}).`,
    };
  }
  return { valid: true, length };
}

/**
 * Computes UTF-8 byte size for a string.
 */
export function computeUtf8ByteLength(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return Buffer.byteLength(text, "utf8");
}

/**
 * Validates all form fields and total plan size cap (60 KB).
 */
export function validatePlan(formValues: LessonPlanFormValues): {
  valid: boolean;
  errors: Record<string, string>;
  totalBytes: number;
} {
  const errors: Record<string, string> = {};

  // Validate header fields
  const headerKeys: Array<keyof LessonPlanFormValues["headers"]> = [
    "subject",
    "gradeLevel",
    "topic",
    "learningCompetency",
    "learningObjectives",
    "materials",
    "date",
    "preparedBy",
  ];

  for (const key of headerKeys) {
    const val = formValues.headers[key];
    const check = validateField(val);
    if (!check.valid && check.error) {
      errors[`header_${key}`] = check.error;
    }
  }

  // Validate stages
  for (const [stageId, content] of Object.entries(formValues.stages)) {
    const check = validateField(content);
    if (!check.valid && check.error) {
      errors[`stage_${stageId}`] = check.error;
    }
  }

  const serialized = JSON.stringify(formValues);
  const totalBytes = computeUtf8ByteLength(serialized);

  if (totalBytes > MAX_TOTAL_PLAN_BYTES) {
    errors["_total"] = `Plan data exceeds the 60 KB size limit (currently ${(totalBytes / 1024).toFixed(1)} KB).`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    totalBytes,
  };
}

/**
 * Generates clean plain-text/Markdown formatted lesson plan.
 */
export function buildPlanText(
  framework: LessonPlanFramework,
  formValues: LessonPlanFormValues
): string {
  const h = formValues.headers;
  const topicTitle = sanitizeInput(h.topic).trim() || "Untitled Lesson";
  const subject = sanitizeInput(h.subject).trim() || "Not specified";
  const gradeLevel = sanitizeInput(h.gradeLevel).trim() || "Not specified";
  const date = sanitizeInput(h.date).trim() || "Not specified";
  const preparedBy = sanitizeInput(h.preparedBy).trim() || "Not specified";
  const competency = sanitizeInput(h.learningCompetency).trim() || "Not specified";
  const objectives = sanitizeInput(h.learningObjectives).trim() || "Not specified";
  const materials = sanitizeInput(h.materials).trim() || "Not specified";

  const lines: string[] = [];

  lines.push(`# LESSON PLAN: ${topicTitle}`);
  lines.push(`**Framework**: ${framework.name}`);
  lines.push("");
  lines.push("## I. Lesson Details");
  lines.push(`- **Subject**: ${subject}`);
  lines.push(`- **Grade / Year Level**: ${gradeLevel}`);
  lines.push(`- **Topic**: ${topicTitle}`);
  lines.push(`- **Date**: ${date}`);
  lines.push(`- **Prepared by**: ${preparedBy}`);
  lines.push("");
  lines.push("## II. Curriculum & Objectives");
  lines.push(`- **Learning Competency**:\n  ${competency.replace(/\n/g, "\n  ")}`);
  lines.push("");
  lines.push(`- **Learning Objectives**:\n  ${objectives.replace(/\n/g, "\n  ")}`);
  lines.push("");
  lines.push(`- **Instructional Materials**:\n  ${materials.replace(/\n/g, "\n  ")}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`## III. Instructional Procedure (${framework.name})`);
  lines.push("");

  for (const stage of framework.stages) {
    const rawContent = formValues.stages[stage.id];
    const content = sanitizeInput(rawContent).trim();
    lines.push(`### ${stage.name}`);
    lines.push(`*Purpose: ${stage.purpose}*`);
    lines.push("");
    if (content) {
      lines.push(content);
    } else {
      lines.push("*(No procedure recorded)*");
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "_Templates for practice. Follow your instructor's required format and the latest DepEd guidelines._"
  );

  return lines.join("\n");
}

/**
 * Creates an ASCII-safe filename slug without slashes, dots, path traversal, or non-ASCII characters.
 */
export function generateFilenameSlug(
  topic: string | null | undefined,
  frameworkId: string,
  extension: "txt" | "md" = "txt"
): string {
  const rawTopic = sanitizeInput(topic ?? "");
  // Keep only ASCII alphanumeric characters and spaces/hyphens
  const asciiOnly = rawTopic.replace(/[^\x20-\x7E]/g, "");
  // Replace non-alphanumeric characters with hyphens
  let slug = asciiOnly
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length > 40) {
    slug = slug.substring(0, 40).replace(/-+$/, "");
  }

  const cleanFramework = frameworkId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeExtension = extension === "md" ? "md" : "txt";

  if (!slug) {
    return `lesson-plan-${cleanFramework || "template"}.${safeExtension}`;
  }

  return `lesson-plan-${cleanFramework}-${slug}.${safeExtension}`;
}

/**
 * Generates the local storage key for a framework draft.
 */
export function getDraftStorageKey(frameworkId: FrameworkId): string {
  return `cdm_lms_lp_draft_v1_${frameworkId}`;
}

/**
 * Serializes form values for localStorage with version and timestamp.
 */
export function serializeDraft(formValues: LessonPlanFormValues): string {
  const draft: StoredLessonPlanDraft = {
    version: 1,
    updatedAt: new Date().toISOString(),
    formValues,
  };
  return JSON.stringify(draft);
}

/**
 * Deserializes and validates a draft from localStorage.
 * Rejects unknown versions, corrupted data, or framework mismatches.
 */
export function deserializeDraft(
  jsonString: string | null | undefined,
  expectedFrameworkId?: FrameworkId
): LessonPlanFormValues | null {
  if (!jsonString) return null;
  try {
    const parsed = JSON.parse(jsonString);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      parsed.version !== DRAFT_STORAGE_VERSION ||
      !parsed.formValues
    ) {
      return null;
    }

    const fv = parsed.formValues as Partial<LessonPlanFormValues>;
    if (!fv.frameworkId || !fv.headers || typeof fv.stages !== "object") {
      return null;
    }

    if (expectedFrameworkId && fv.frameworkId !== expectedFrameworkId) {
      return null;
    }

    // Sanitize values
    const sanitizedHeaders = {
      subject: sanitizeInput(fv.headers.subject),
      gradeLevel: sanitizeInput(fv.headers.gradeLevel),
      topic: sanitizeInput(fv.headers.topic),
      learningCompetency: sanitizeInput(fv.headers.learningCompetency),
      learningObjectives: sanitizeInput(fv.headers.learningObjectives),
      materials: sanitizeInput(fv.headers.materials),
      date: sanitizeInput(fv.headers.date),
      preparedBy: sanitizeInput(fv.headers.preparedBy),
    };

    const sanitizedStages: Record<string, string> = {};
    for (const [key, val] of Object.entries(fv.stages ?? {})) {
      if (typeof val === "string") {
        sanitizedStages[key] = sanitizeInput(val);
      }
    }

    return {
      frameworkId: fv.frameworkId as FrameworkId,
      headers: sanitizedHeaders,
      stages: sanitizedStages,
    };
  } catch {
    return null;
  }
}

