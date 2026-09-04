import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Enter a valid email address."),
    studentNumber: z.string().optional(),
    uniqueId: z.string().optional(),
    role: z.enum(["STUDENT", "ADMIN", "INSTRUCTOR"]).optional().default("STUDENT"),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(6, "Confirm your password."),
    instituteCode: z.enum(["ics", "ibe", "ite"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "ADMIN") return true;
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
});