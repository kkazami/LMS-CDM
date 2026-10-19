/**
 * apps/web/src/features/knowledge-exchange/schemas.ts
 *
 * Runtime validation schemas using Zod.
 */

import { z } from "zod";
import {
  KX_POST_TYPES,
  KX_FLAG_REASONS,
  KX_MODERATION_ACTIONS,
  KX_VALIDATION,
} from "./constants";

export const CreatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      KX_VALIDATION.MIN_TITLE_LENGTH,
      `Title must be at least ${KX_VALIDATION.MIN_TITLE_LENGTH} characters`
    )
    .max(
      KX_VALIDATION.MAX_TITLE_LENGTH,
      `Title must not exceed ${KX_VALIDATION.MAX_TITLE_LENGTH} characters`
    ),
  body: z
    .string()
    .trim()
    .min(
      KX_VALIDATION.MIN_BODY_LENGTH,
      `Body must be at least ${KX_VALIDATION.MIN_BODY_LENGTH} characters`
    )
    .max(
      KX_VALIDATION.MAX_BODY_LENGTH,
      `Body must not exceed ${KX_VALIDATION.MAX_BODY_LENGTH} characters`
    ),
  postType: z.enum(KX_POST_TYPES).default("QUESTION"),
  isAnonymous: z.boolean().default(false),
  tagIds: z
    .array(z.string())
    .min(KX_VALIDATION.MIN_TAGS, "Please select at least one tag")
    .max(KX_VALIDATION.MAX_TAGS, `Maximum ${KX_VALIDATION.MAX_TAGS} tags allowed`),
  courseId: z.string().nullish(),
  syllabusItemId: z.string().nullish(),
});

export const UpdatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(KX_VALIDATION.MIN_TITLE_LENGTH)
    .max(KX_VALIDATION.MAX_TITLE_LENGTH)
    .optional(),
  body: z
    .string()
    .trim()
    .min(KX_VALIDATION.MIN_BODY_LENGTH)
    .max(KX_VALIDATION.MAX_BODY_LENGTH)
    .optional(),
  summary: z.string().trim().default("Content revision"),
  tagIds: z
    .array(z.string())
    .min(1)
    .max(5)
    .optional(),
  courseId: z.string().nullish(),
  syllabusItemId: z.string().nullish(),
});

export const CreateAnswerSchema = z.object({
  body: z
    .string()
    .trim()
    .min(
      KX_VALIDATION.MIN_ANSWER_LENGTH,
      `Answer must be at least ${KX_VALIDATION.MIN_ANSWER_LENGTH} characters`
    )
    .max(
      KX_VALIDATION.MAX_ANSWER_LENGTH,
      `Answer must not exceed ${KX_VALIDATION.MAX_ANSWER_LENGTH} characters`
    ),
  isAnonymous: z.boolean().default(false),
});

export const CreateCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(
      KX_VALIDATION.MIN_COMMENT_LENGTH,
      `Comment must be at least ${KX_VALIDATION.MIN_COMMENT_LENGTH} characters`
    )
    .max(
      KX_VALIDATION.MAX_COMMENT_LENGTH,
      `Comment must not exceed ${KX_VALIDATION.MAX_COMMENT_LENGTH} characters`
    ),
  postId: z.string().nullish(),
  answerId: z.string().nullish(),
  isAnonymous: z.boolean().default(false),
});

export const VoteSchema = z.object({
  postId: z.string().nullish(),
  answerId: z.string().nullish(),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export const FlagSchema = z.object({
  postId: z.string().nullish(),
  answerId: z.string().nullish(),
  commentId: z.string().nullish(),
  reason: z.enum(KX_FLAG_REASONS),
  description: z.string().trim().max(1000).default(""),
});

export const ModerationActionSchema = z.object({
  targetType: z.enum(["POST", "ANSWER", "COMMENT"]),
  targetId: z.string(),
  postId: z.string().nullish(),
  actionType: z.enum(KX_MODERATION_ACTIONS),
  reason: z.string().trim().default(""),
});

export const AdminUpdatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(KX_VALIDATION.MIN_TITLE_LENGTH)
    .max(KX_VALIDATION.MAX_TITLE_LENGTH)
    .optional(),
  body: z
    .string()
    .trim()
    .min(KX_VALIDATION.MIN_BODY_LENGTH)
    .max(KX_VALIDATION.MAX_BODY_LENGTH)
    .optional(),
  status: z.enum(["OPEN", "CLOSED", "LOCKED"]).optional(),
  isPinned: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type VoteInput = z.infer<typeof VoteSchema>;
export type FlagInput = z.infer<typeof FlagSchema>;
export type ModerationActionInput = z.infer<typeof ModerationActionSchema>;
export type AdminUpdatePostInput = z.infer<typeof AdminUpdatePostSchema>;
