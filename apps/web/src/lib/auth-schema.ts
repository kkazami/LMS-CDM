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
  .regex(/[0-9]/, "Password must contain at least one number.");

export const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters.").max(100, "Full name too long."),
    email: z.string().email("Enter a valid email address.").max(254, "Email address too long."),
    studentNumber: z.string().optional(),
    uniqueId: z.string().optional(),
    // Public self-registration only permits STUDENT (or optional INSTRUCTOR). ADMIN is strictly disallowed.
    role: z.enum(["STUDENT", "INSTRUCTOR"]).optional().default("STUDENT"),
    password: passwordSchema,
    confirmPassword: z.string().min(8, "Confirm your password."),
    instituteCode: instituteCodeSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "INSTRUCTOR") return true;
      if (!data.studentNumber) return false;
      return /^\d{2}-\d{5}$/.test(data.studentNumber);
    },
    {
      message: "Student number must be in the format XX-XXXXX (e.g. 23-00875).",
      path: ["studentNumber"],
    }
  );

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  instituteCode: instituteCodeSchema,
});