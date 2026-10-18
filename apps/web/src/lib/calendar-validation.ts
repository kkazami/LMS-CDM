import { z } from "zod";

export const classScheduleSchema = z.object({
  scheduleDays: z.array(z.number().int().min(0).max(6)).min(1, "Choose at least one class day.").max(7),
  scheduleStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time."),
  scheduleEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose an end time."),
  scheduleStartDate: z.iso.date("Choose a valid class start date."),
  scheduleEndDate: z.iso.date("Choose a valid class end date."),
}).refine((data) => data.scheduleEnd > data.scheduleStart, { message: "End time must be after start time.", path: ["scheduleEnd"] })
  .refine((data) => data.scheduleEndDate >= data.scheduleStartDate, { message: "Class end date must be on or after the start date.", path: ["scheduleEndDate"] });

export const calendarEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  professorName: z.string().max(200).default(""),
  maxPoints: z.number().int().nonnegative().nullable().optional(),
  eventDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  eventType: z.enum(["personal", "assignment", "exam", "submission", "event"]).default("personal"),
  deepLink: z.string().max(1000).refine((value) => value === "#" || (/^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value)), "Use a local LMS link.").default("#"),
  courseId: z.string().nullable().optional(),
}).refine((data) => !data.endDate || new Date(data.endDate) > new Date(data.eventDate), {
  message: "End time must be after start time.", path: ["endDate"],
});
