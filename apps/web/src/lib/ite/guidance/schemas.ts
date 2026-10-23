/**
 * apps/web/src/lib/ite/guidance/schemas.ts
 *
 * Zod validation schemas for request bodies and AI model outputs.
 */

import { z } from "zod";

export const MaterialHelpRequestSchema = z.object({
  materialId: z.string().trim().min(1, "Material ID is required."),
});

export type MaterialHelpRequestInput = z.infer<typeof MaterialHelpRequestSchema>;

export const PracticeQuestionSchema = z.object({
  question: z.string().trim().min(10, "Question must be at least 10 characters.").max(1200),
  answer: z.string().trim().min(5, "Answer must be at least 5 characters.").max(1200),
});

export const StudyHelpContentSchema = z.object({
  summary: z.string().trim().min(20, "Summary must be at least 20 characters.").max(2500),
  keyPoints: z
    .array(z.string().trim().min(5, "Key point must be at least 5 characters.").max(600))
    .min(3, "At least 3 key points are required.")
    .max(7, "At most 7 key points allowed."),
  practiceQuestion: PracticeQuestionSchema,
  reflection: z.string().trim().min(10, "Reflection prompt must be at least 10 characters.").max(1200),
});

export type StudyHelpContentOutput = z.infer<typeof StudyHelpContentSchema>;
