import { z } from "zod";

/**
 * Dynamic institute code validation pattern:
 * Alphanumeric slug with underscores/hyphens, min 2 and max 20 chars.
 * Eliminates hardcoded institute lists and enables dynamic tenant provisioning.
 */
export const instituteCodeSchema = z
  .string()
  .min(2, "Institute code must be at least 2 characters.")
  .max(20, "Institute code cannot exceed 20 characters.")
  .regex(/^[a-zA-Z0-9_-]+$/, "Institute code can only contain letters, numbers, hyphens, and underscores.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .refine(value => new TextEncoder().encode(value).length <= 72, 'Password must not exceed 72 UTF-8 bytes.');

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254).optional(),
  identifier: z.string().trim().min(1).max(254).optional(),
  password: z.string().min(1, "Password is required."),
  instituteCode: instituteCodeSchema,
}).refine(data => Boolean(data.email) !== Boolean(data.identifier), 'Provide either email or student ID.');
