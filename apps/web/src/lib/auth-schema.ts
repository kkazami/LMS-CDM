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
  acceptedPolicies: z.literal(true, { error: "Agree to the Terms and Conditions and acknowledge the Privacy Policy to sign in." }),
}).refine(data => Boolean(data.email) !== Boolean(data.identifier), 'Provide either email or student ID.');

const studentRegistrationFields = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(150),
  studentNumber: z.string().trim().regex(/^\d{2}-\d{5}$/, 'Student ID must use the format XX-XXXXX (for example, 26-12345).'),
  email: z.string().trim().email('Enter a valid email address.').max(254).transform(value => value.toLowerCase()),
  password: passwordSchema,
  confirmPassword: z.string(),
  instituteCode: z.enum(['ics', 'ite', 'ibe']),
  acceptedPolicies: z.literal(true, { error: 'Agree to the Terms and Conditions and acknowledge the Privacy Policy.' }),
});
export const studentRegistrationSchema = studentRegistrationFields.refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.', path: ['confirmPassword'],
});
// Linking authenticates an existing account; it must not register or edit its student details.
export const googleLinkSchema = studentRegistrationFields.pick({
  email: true,
  instituteCode: true,
  acceptedPolicies: true,
}).extend({
  password: z.string().min(1, 'Enter your existing password.').max(1024),
});
