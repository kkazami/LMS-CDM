import { z } from "zod";
import { SUBMISSION_TYPES } from "./rules";

const trimmed = (max: number) => z.string().trim().min(1, "Required.").max(max, `Must be at most ${max} characters.`);

const schoolYear = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}$/, "Use the format 2025-2026.");

export const createPlacementSchema = z
  .object({
    studentId: z.string().min(1, "Choose a student."),
    schoolName: trimmed(200),
    subject: trimmed(120),
    gradeLevel: trimmed(60),
    schoolYear,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export const updatePlacementSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
    schoolName: trimmed(200).optional(),
    subject: trimmed(120).optional(),
    gradeLevel: trimmed(60).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Nothing to update." });

const optionalDescription = z.string().trim().max(4000).optional();

export const createSubmissionSchema = z
  .object({
    placementId: z.string().min(1),
    type: z.enum(SUBMISSION_TYPES),
    title: trimmed(200),
    description: optionalDescription,
    fileUrl: z.string().url().max(2048).optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    videoLink: z.string().trim().max(2048).optional(),
  })
  .refine((v) => Boolean(v.fileUrl) !== Boolean(v.videoLink), {
    message: "Provide either an uploaded file or a video link.",
    path: ["fileUrl"],
  })
  .refine((v) => !v.fileUrl || Boolean(v.fileName), { message: "File name is required.", path: ["fileName"] });

export const resubmitSchema = z
  .object({
    title: trimmed(200).optional(),
    description: optionalDescription,
    fileUrl: z.string().url().max(2048).optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    videoLink: z.string().trim().max(2048).optional(),
  })
  .refine((v) => Boolean(v.fileUrl) !== Boolean(v.videoLink), {
    message: "Provide either a new file or a new video link.",
    path: ["fileUrl"],
  })
  .refine((v) => !v.fileUrl || Boolean(v.fileName), { message: "File name is required.", path: ["fileName"] });

export const feedbackSchema = z.object({
  comment: trimmed(4000),
  decision: z.enum(["COMMENT", "NEEDS_REVISION", "APPROVED"]),
  score: z.number().int("Score must be a whole number.").min(0).max(100).nullable().optional(),
});

export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;
export type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ResubmitInput = z.infer<typeof resubmitSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
