/**
 * Interactive Activities — Zod Validation Schemas
 *
 * These schemas validate payloads at the API boundary (POST /api/activities/submit).
 * They mirror the TypeScript interfaces in types.ts — keep them in sync.
 *
 * Usage:
 *   import { activitySubmissionSchema } from "@/features/interactive-activities/shared/schemas";
 *   const result = activitySubmissionSchema.safeParse(requestBody);
 */

import { z } from "zod";
import { ACTIVITY_TYPES } from "./types";

/**
 * Validates an ActivitySubmission payload from a student.
 *
 * Enforced at the API layer before writing to the database.
 * All fields are required except errorLog (optional diagnostic hints).
 */
export const activitySubmissionSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  assignmentId: z.string().min(1, "assignmentId is required"),
  activityType: z.enum(ACTIVITY_TYPES, {
    message: `activityType must be one of: ${ACTIVITY_TYPES.join(", ")}`,
  }),
  variantSeed: z.string().min(1, "variantSeed is required"),
  startedAt: z
    .string()
    .datetime({ message: "startedAt must be a valid ISO 8601 timestamp" }),
  completionTimeSeconds: z
    .number()
    .int()
    .nonnegative("completionTimeSeconds must be >= 0"),
  attempts: z.number().int().min(1, "attempts must be >= 1"),
  stateCheck: z.record(
    z.string(),
    z.union([z.boolean(), z.number(), z.string()])
  ),
  score: z.number().min(0).max(100, "score must be between 0 and 100"),
  maxScore: z.number().min(0, "maxScore must be >= 0"),
  passed: z.boolean(),
  errorLog: z.array(z.string()).optional(),
});

/** TypeScript type inferred from the Zod schema — use this for type-safe handling. */
export type ActivitySubmissionPayload = z.infer<typeof activitySubmissionSchema>;

/**
 * Validates an ActivityTemplate created by an instructor.
 * Used when instructors create/edit activity assignments.
 */
export const activityTemplateSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
  activityType: z.enum(ACTIVITY_TYPES),
  courseId: z.string().min(1, "courseId is required"),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)], {
    message: "difficulty must be 1, 2, or 3",
  }),
  variables: z.record(z.string(), z.unknown()),
  faultPool: z.array(z.string()).optional(),
  hiddenTestCases: z.array(z.unknown()).optional(),
  createdBy: z.string().min(1, "createdBy is required"),
});

export type ActivityTemplatePayload = z.infer<typeof activityTemplateSchema>;
