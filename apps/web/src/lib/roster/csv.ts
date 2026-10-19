import { parse } from "csv-parse/sync";
import { z } from "zod";
export { csvCell, csvFile } from "./csv-report";

export const HEADERS = {
  STUDENTS: [
    "student_Id",
    "last_name",
    "first_name",
    "email",
    "program",
    "section",
  ],
  COURSES: [
    "courseCode",
    "subject",
    "title",
    "section",
    "room",
    "description",
    "instructorEmail",
    "program",
  ],
  ENROLLMENTS: ["student_Id", "courseCode", "section"],
} as const;
export type ImportType = keyof typeof HEADERS;
export const importTypeSchema = z.enum(["STUDENTS", "COURSES", "ENROLLMENTS"]);
export const studentNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[A-Za-z0-9-]+$/,
    "Use letters, digits, and hyphens for the student ID.",
  );
export const normalizeCode = (value: string) => value.trim().toUpperCase();
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const STUDENT_SCHEMA = z
  .object({
    student_Id: studentNumberSchema.transform(normalizeCode),
    last_name: z.string().trim().min(1).max(100),
    first_name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    program: z.string().trim().min(1).max(100).transform(normalizeCode),
    section: z.string().trim().min(1).max(100).transform(normalizeCode),
  })
  .strict();
export const COURSE_SCHEMA = z
  .object({
    courseCode: z.string().trim().min(2).max(64).transform(normalizeCode),
    subject: z.string().trim().min(1).max(200),
    title: z.string().trim().min(3).max(300),
    section: z.string().trim().min(1).max(100).transform(normalizeCode),
    room: z.string().trim().max(200),
    description: z.string().trim().max(10000),
    instructorEmail: z.union([
      z.literal(""),
      z.string().trim().toLowerCase().email().max(254),
    ]),
    program: z.string().trim().max(100).transform(normalizeCode),
  })
  .strict();
export const ENROLLMENT_SCHEMA = STUDENT_SCHEMA.pick({
  student_Id: true,
  section: true,
}).extend({ courseCode: COURSE_SCHEMA.shape.courseCode });

export function parseRosterCsv(raw: string, type: ImportType) {
  if (Buffer.byteLength(raw, "utf8") > 2 * 1024 * 1024)
    throw new Error("CSV exceeds 2 MiB.");
  const expected = HEADERS[type];
  let headerSeen = false;
  let nonblankRecords = 0;
  const records = parse(raw, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    max_record_size: 2 * 1024 * 1024,
    info: true,
    on_record: (entry: {
      record: Record<string, string>;
      info: { lines: number };
    }) => {
      if (!Object.values(entry.record).some((value) => value.trim()))
        return null;
      if (++nonblankRecords > 500)
        throw new Error("Maximum 500 data rows per import.");
      return entry;
    },
    columns: (headers: string[]) => {
      headerSeen = true;
      const keys = headers.map((h) => h.trim().toLowerCase());
      if (
        keys.length !== expected.length ||
        new Set(keys).size !== keys.length ||
        expected.some((h) => !keys.includes(h.toLowerCase()))
      ) {
        throw new Error("CSV headers must be: " + expected.join(","));
      }
      return keys.map((h) => expected.find((e) => e.toLowerCase() === h)!);
    },
  }) as Array<{ record: Record<string, string>; info: { lines: number } }>;
  const rows = records.filter((r) =>
    Object.values(r.record).some((v) => v.trim()),
  );
  if (!headerSeen || rows.length === 0)
    throw new Error("Include a header and at least one data row.");
  if (records.length > 500)
    throw new Error("Maximum 500 data rows per import.");
  return rows.map((r) => ({ rowNumber: r.info.lines, values: r.record }));
}

export function template(type: ImportType) {
  return HEADERS[type].join(",") + "\r\n";
}
