import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/super-user-v1/actor";
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import {
  canonicalRole,
  mayAdmitAccount,
} from "@/lib/super-user-v1/capabilities";
import {
  HEADERS,
  STUDENT_SCHEMA,
  COURSE_SCHEMA,
  ENROLLMENT_SCHEMA,
  parseRosterCsv,
  importTypeSchema,
  normalizeCode,
  type ImportType,
} from "./csv";
import {
  adminTransaction,
  audit,
  fingerprint,
  requireTerm,
  setStudentProgram,
  type RosterActor,
  type Tx,
} from "./policy";
import { joinCode } from "./terms";

const previewInput = z
  .object({
    type: importTypeSchema,
    csv: z.string().max(2 * 1024 * 1024),
    termId: z.string().min(1).optional(),
  })
  .strict();
const userSelect = {
  id: true,
  email: true,
  studentNumber: true,
  uniqueId: true,
  instituteId: true,
  role: true,
  name: true,
  firstName: true,
  lastName: true,
  section: true,
  isActive: true,
  activationStatus: true,
  programMemberships: {
    where: { kind: "STUDENT", isActive: true },
    select: { programId: true },
  },
} satisfies Prisma.UserSelect;
type Values = Record<string, string>;

async function context(
  tx: Tx,
  instituteId: string,
  type: ImportType,
  termId: string | null,
  rows: Values[],
) {
  if (type !== "STUDENTS") await requireTerm(tx, instituteId, termId);
  const ids = rows.map((r) => r.student_Id).filter(Boolean);
  const emails = rows
    .flatMap((r) => [r.email, r.instructorEmail])
    .filter(Boolean);
  const users = await tx.user.findMany({
    where: {
      OR: [
        { email: { in: emails, mode: "insensitive" } },
        { studentNumber: { in: ids, mode: "insensitive" } },
        {
          uniqueId: { in: ids, mode: "insensitive" },
          role: { equals: "STUDENT", mode: "insensitive" },
        },
      ],
    },
    select: userSelect,
  });
  const programs = await tx.academicProgram.findMany({
    where: { instituteId, isActive: true },
  });
  const courses =
    type === "STUDENTS"
      ? []
      : await tx.course.findMany({
          where: { instituteId, termId },
          select: {
            id: true,
            code: true,
            section: true,
            termId: true,
            title: true,
            subject: true,
            room: true,
            description: true,
            instructorId: true,
            instructor: { select: { email: true } },
            programId: true,
            isArchived: true,
            updatedAt: true,
          },
        });
  const enrollments =
    type === "ENROLLMENTS"
      ? await tx.enrollment.findMany({
          where: {
            courseId: { in: courses.map((c) => c.id) },
            studentId: { in: users.map((u) => u.id) },
          },
        })
      : [];
  return { users, programs, courses, enrollments };
}
type Context = Awaited<ReturnType<typeof context>>;

function classify(
  type: ImportType,
  instituteId: string,
  raw: Values,
  ctx: Context,
) {
  const schema =
    type === "STUDENTS"
      ? STUDENT_SCHEMA
      : type === "COURSES"
        ? COURSE_SCHEMA
        : ENROLLMENT_SCHEMA;
  const parsed = schema.safeParse(raw);
  const issues = parsed.success
    ? []
    : parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message);
  const values: Values = parsed.success ? parsed.data : raw;
  let target: { id: string } | null = null;
  let previous: unknown = null;
  const program = values.program
    ? ctx.programs.filter(
        (p) => normalizeCode(p.code) === normalizeCode(values.program),
      )
    : [];
  if (values.program && program.length !== 1)
    issues.push("Program must match one active program in your institute.");
  const instructor = values.instructorEmail
    ? ctx.users.find(
        (u) => u.email.toLowerCase() === values.instructorEmail.toLowerCase(),
      )
    : null;
  if (type === "STUDENTS") {
    const matches = ctx.users.filter(
      (u) =>
        u.email.toLowerCase() === values.email?.toLowerCase() ||
        normalizeCode(u.studentNumber || u.uniqueId) ===
          normalizeCode(values.student_Id ?? ""),
    );
    if (matches.length) {
      const match = matches[0];
      if (
        matches.length !== 1 ||
        match.instituteId !== instituteId ||
        canonicalRole(match.role) !== "STUDENT" ||
        match.email.toLowerCase() !== values.email?.toLowerCase() ||
        normalizeCode(match.studentNumber || match.uniqueId) !==
          values.student_Id
      )
        issues.push(
          "Student ID or email conflicts with an existing account. Correct it separately.",
        );
      else {
        target = match;
        previous = match;
      }
    }
  } else if (type === "COURSES") {
    if (
      values.instructorEmail &&
      (!instructor ||
        instructor.instituteId !== instituteId ||
        canonicalRole(instructor.role) !== "INSTRUCTOR" ||
        !mayAdmitAccount(instructor))
    )
      issues.push(
        "Instructor email must belong to an eligible instructor in your institute.",
      );
    const matches = ctx.courses.filter(
      (c) =>
        normalizeCode(c.code) === values.courseCode &&
        normalizeCode(c.section) === values.section,
    );
    if (matches.length > 1)
      issues.push(
        "Multiple existing offerings match this course. Correct them separately.",
      );
    else if (matches.length) {
      target = matches[0];
      previous = matches[0];
    }
  } else {
    const student = ctx.users.find(
      (u) =>
        u.studentNumber === values.student_Id &&
        u.instituteId === instituteId &&
        canonicalRole(u.role) === "STUDENT" &&
        u.isActive,
    );
    const course = ctx.courses.find(
      (c) =>
        normalizeCode(c.code) === values.courseCode &&
        normalizeCode(c.section) === values.section &&
        !c.isArchived,
    );
    if (!student)
      issues.push(
        "Student must exist in your institute and must not be suspended.",
      );
    if (!course)
      issues.push(
        "An unarchived course must match this code and section in the selected term.",
      );
    if (student && course) {
      target =
        ctx.enrollments.find(
          (e) => e.studentId === student.id && e.courseId === course.id,
        ) ?? null;
      previous = target;
    }
  }
  return {
    values,
    issues,
    proposedAction: issues.length ? "ERROR" : target ? "EXISTING" : "NEW",
    targetId: target?.id ?? null,
    targetHash: target ? fingerprint(previous) : null,
    previous,
  };
}

export async function previewImport(actor: RosterActor, body: unknown, options?: { matchOnly?: boolean }) {
  const parsed = previewInput.safeParse(body);
  if (!parsed.success)
    throw new AccessError(
      400,
      "Provide import type, CSV, and an academic term for courses/enrollments.",
    );
  const { type, csv, termId } = parsed.data;
  let inputRows;
  try {
    inputRows = parseRosterCsv(csv, type);
  } catch (error) {
    throw new AccessError(
      400,
      error instanceof Error ? error.message : "Invalid CSV.",
    );
  }
  return adminTransaction(actor, async (tx) => {
    const normalized = inputRows.map((r) =>
      Object.fromEntries(
        Object.entries(r.values).map(([k, v]) => [
          k,
          k === "email" || k === "instructorEmail"
            ? v.trim().toLowerCase()
            : ["student_Id", "program", "section", "courseCode"].includes(k)
              ? normalizeCode(v)
              : v.trim(),
        ]),
      ),
    );
    const ctx = await context(
      tx,
      actor.instituteId,
      type,
      termId ?? null,
      normalized,
    );
    const keys = normalized.map((r) =>
      type === "STUDENTS"
        ? [r.email, r.student_Id]
        : type === "COURSES"
          ? [r.courseCode + "\0" + r.section]
          : [r.student_Id + "\0" + r.courseCode + "\0" + r.section],
    );
    const counts = new Map<string, number>();
    keys
      .flat()
      .filter(Boolean)
      .forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
    const rows = inputRows.map((row, index) => {
      const result = classify(type, actor.instituteId, normalized[index], ctx);
      if (keys[index].some((k) => k && (counts.get(k) ?? 0) > 1)) {
        result.issues.push("Duplicate identity or offering within this file.");
        result.proposedAction = "ERROR";
      }
      const oldUser = ctx.users.find((u) => u.id === result.targetId),
        oldCourse = ctx.courses.find((c) => c.id === result.targetId);
      const previousValues =
        oldUser && type === "STUDENTS"
          ? {
              first_name: oldUser.firstName ?? oldUser.name,
              last_name: oldUser.lastName ?? "",
              section: oldUser.section,
              program:
                ctx.programs.find(
                  (p) => p.id === oldUser.programMemberships[0]?.programId,
                )?.code ?? "",
            }
          : oldCourse && type === "COURSES"
            ? {
                title: oldCourse.title,
                subject: oldCourse.subject,
                room: oldCourse.room,
                description: oldCourse.description,
                instructorEmail: oldCourse.instructor?.email ?? "",
                program:
                  ctx.programs.find((p) => p.id === oldCourse.programId)
                    ?.code ?? "",
              }
            : type === 'ENROLLMENTS' && result.targetId
              ? { status: ctx.enrollments.find(e => e.id === result.targetId)?.status ?? '' }
              : undefined;
      return {
        rowNumber: row.rowNumber,
        values: result.values,
        originalValues: row.values,
        ...(previousValues ? { previousValues } : {}),
        issues: result.issues,
        proposedAction: result.proposedAction,
        targetId: result.targetId,
        targetHash: result.targetHash,
      };
    });
    const batch = await tx.importBatch.create({
      data: {
        type,
        instituteId: actor.instituteId,
        termId: termId ?? null,
        creatorId: actor.id,
        matchOnly: options?.matchOnly ?? false,
        expiresAt: new Date(Date.now() + 30 * 60000),
        rows: { create: rows },
      },
      include: { rows: { orderBy: { rowNumber: "asc" } } },
    });
    await audit(tx, actor.id, actor.id, "IMPORT_PREVIEW", {
      batchId: batch.id,
      type,
      count: rows.length,
    });
    return batch;
  });
}

export async function getBatch(actor: RosterActor, id: string) {
  const batch = await db.importBatch.findFirst({
    where: { id, instituteId: actor.instituteId, creatorId: actor.id },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });
  if (!batch) throw new AccessError(404, "Import not found.");
  return batch;
}

export const commitSchema = z
  .object({
    policy: z.enum(["SKIP", "UPDATE"]).default("SKIP"),
    rowIds: z.array(z.string()).max(500).optional(),
    overrideRejectedIds: z.array(z.string()).max(500).default([]),
  })
  .strict();
export async function commitImport(
  actor: RosterActor,
  id: string,
  body: unknown,
) {
  const input = commitSchema.safeParse(body);
  if (!input.success) throw new AccessError(400, "Invalid confirmation.");
  await adminTransaction(actor, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ImportBatch" WHERE id=${id} FOR UPDATE`;
    const batch = await tx.importBatch.findFirst({
      where: { id, instituteId: actor.instituteId, creatorId: actor.id },
      include: { rows: true },
    });
    if (!batch) throw new AccessError(404, "Import not found.");
    if (batch.status !== "PREVIEW") return;
    if (batch.expiresAt <= new Date())
      throw new AccessError(409, "Preview expired. Preview the CSV again.");
    const eligible = batch.rows.filter((r) => r.proposedAction !== "ERROR");
    const chosen = input.data.rowIds ?? eligible.map((r) => r.id);
    if (
      chosen.some((rowId) => !eligible.some((r) => r.id === rowId)) ||
      input.data.overrideRejectedIds.some((rowId) => !chosen.includes(rowId))
    )
      throw new AccessError(400, "Invalid row selection.");
    await tx.importRow.updateMany({
      where: { batchId: id },
      data: { outcome: "SKIPPED" },
    });
    await tx.importRow.updateMany({
      where: { batchId: id, proposedAction: "ERROR" },
      data: { outcome: "ERROR" },
    });
    await tx.importRow.updateMany({
      where: { batchId: id, id: { in: chosen } },
      data: { selected: true, outcome: null },
    });
    await tx.importRow.updateMany({
      where: { batchId: id, id: { in: input.data.overrideRejectedIds } },
      data: { overrideRejected: true },
    });
    await tx.importBatch.update({
      where: { id },
      data: { status: "PROCESSING", policy: input.data.policy },
    });
  });
  const start = Date.now();
  for (let count = 0; count < 50 && Date.now() - start < 20000; count++) {
    let attemptedRowId: string | null = null;
    try {
      const processed = await adminTransaction(actor, async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ImportBatch" WHERE id=${id} FOR UPDATE`;
        const batch = await tx.importBatch.findFirst({
          where: { id, instituteId: actor.instituteId, creatorId: actor.id },
          include: {
            rows: {
              where: { selected: true, outcome: null },
              orderBy: { rowNumber: "asc" },
              take: 1,
            },
          },
        });
        if (!batch) throw new AccessError(404, "Import not found.");
        if (batch.status !== "PROCESSING") return false;
        const row = batch.rows[0];
        if (!row) {
          await tx.importBatch.update({
            where: { id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          return false;
        }
        attemptedRowId = row.id;
        const type = importTypeSchema.parse(batch.type),
          values = row.values as Values;
        if (type === 'STUDENTS' && row.targetId) await lockAccounts(tx, [row.targetId]);
        if (type === 'COURSES') {
          if (values.instructorEmail) await tx.$queryRaw`SELECT id FROM "User" WHERE lower(btrim(email))=${values.instructorEmail} ORDER BY id FOR SHARE`;
          if (row.targetId) await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${row.targetId} FOR UPDATE`;
        }
        if (type === 'ENROLLMENTS') {
          await tx.$queryRaw`SELECT id FROM "User" WHERE "studentNumber"=${values.student_Id} AND "instituteId"=${actor.instituteId} FOR SHARE`;
          await tx.$queryRaw`SELECT id FROM "Course" WHERE "instituteId"=${actor.instituteId} AND "termId"=${batch.termId} AND upper(btrim(code))=${values.courseCode} AND upper(btrim(section))=${values.section} FOR SHARE`;
          if (row.targetId) await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id=${row.targetId} FOR UPDATE`;
        }
        const ctx = await context(tx, actor.instituteId, type, batch.termId, [
          values,
        ]);
        const current = classify(type, actor.instituteId, values, ctx);
        if (type === 'ENROLLMENTS' && batch.matchOnly && !current.issues.length) {
          const student = ctx.users.find(u => u.studentNumber === values.student_Id)!;
          const course = ctx.courses.find(c => normalizeCode(c.code) === values.courseCode && normalizeCode(c.section) === values.section)!;
          if (normalizeCode(student.section) !== values.section || !student.programMemberships.some(m => m.programId === course.programId)) current.issues.push('Program or section changed since matching. Generate a new preview.');
        }
        if (
          current.issues.length ||
          current.targetId !== row.targetId ||
          current.targetHash !== row.targetHash
        ) {
          await tx.importRow.update({
            where: { id: row.id },
            data: {
              outcome: "ERROR",
              error:
                current.issues.join(" ") ||
                "Record changed since preview. Preview again.",
            },
          });
          return true;
        }
        let outcome = "CREATED",
          targetId = row.targetId;
        if (type === "STUDENTS") {
          if (targetId && batch.policy === "SKIP") outcome = "SKIPPED";
          else {
            const program = ctx.programs.find(
              (p) => normalizeCode(p.code) === values.program,
            )!;
            const data = {
              firstName: values.first_name,
              lastName: values.last_name,
              name: values.first_name + " " + values.last_name,
              section: values.section,
            };
            if (targetId) {
              await tx.user.update({ where: { id: targetId }, data });
              outcome = "UPDATED";
            } else {
              const user = await tx.user.create({
                data: {
                  ...data,
                  studentNumber: values.student_Id,
                  uniqueId: values.student_Id,
                  email: values.email,
                  role: "STUDENT",
                  instituteId: actor.instituteId,
                  password: null,
                  activationStatus: "PENDING_ACTIVATION",
                },
              });
              targetId = user.id;
            }
            const prior = ctx.users.find((u) => u.id === targetId);
            if (
              !prior?.programMemberships.some((m) => m.programId === program.id)
            )
              await setStudentProgram(tx, actor, targetId, program.id);
          }
        } else if (type === "COURSES") {
          if (targetId && batch.policy === "SKIP") outcome = "SKIPPED";
          else {
            const instructor = values.instructorEmail
              ? ctx.users.find(
                  (u) => u.email.toLowerCase() === values.instructorEmail,
                )
              : null;
            const data = {
              title: values.title,
              subject: values.subject,
              room: values.room,
              description: values.description,
              instructorId: instructor?.id ?? null,
            };
            if (targetId) {
              await tx.course.update({ where: { id: targetId }, data });
              outcome = "UPDATED";
            } else {
              const course = await tx.course.create({
                data: {
                  ...data,
                  code: values.courseCode,
                  section: values.section,
                  instituteId: actor.instituteId,
                  termId: batch.termId,
                  courseCode: await joinCode(tx),
                },
              });
              targetId = course.id;
            }
            const programId =
              ctx.programs.find((p) => normalizeCode(p.code) === values.program)
                ?.id ?? null;
            await tx.$executeRaw`SELECT super_user_security.set_course_program(${actor.sessionId}, ${actor.tokenHash}, ${targetId}, ${programId})`;
          }
        } else {
          const student = ctx.users.find(
            (u) => u.studentNumber === values.student_Id,
          )!;
          const course = ctx.courses.find(
            (c) =>
              normalizeCode(c.code) === values.courseCode &&
              normalizeCode(c.section) === values.section,
          )!;
          const existing = ctx.enrollments.find((e) => e.id === targetId);
          if (existing?.status === "APPROVED") outcome = "SKIPPED";
          else if (
            existing &&
            existing.status !== "PENDING" &&
            !row.overrideRejected
          ) {
            outcome = "ERROR";
            await tx.importRow.update({
              where: { id: row.id },
              data: {
                error:
                  "Explicit approval is required to replace a rejected enrollment.",
              },
            });
          } else if (targetId) {
            await tx.enrollment.update({
              where: { id: targetId },
              data: { status: "APPROVED" },
            });
            outcome = "UPDATED";
          } else {
            const enrollment = await tx.enrollment.create({
              data: {
                studentId: student.id,
                courseId: course.id,
                status: "APPROVED",
              },
            });
            targetId = enrollment.id;
          }
        }
        await tx.importRow.update({ where: { id: row.id }, data: { outcome } });
        await audit(
          tx,
          actor.id,
          type === "STUDENTS" && targetId ? targetId : actor.id,
          "IMPORT_ROW_" + outcome,
          { batchId: id, row: row.rowNumber, type, recordId: targetId },
        );
        return true;
      });
      if (!processed) break;
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      // A concurrent unique-key insert rolls back the row transaction, not prior rows.
      await adminTransaction(actor, async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ImportBatch" WHERE id=${id} FOR UPDATE`;
        if (attemptedRowId)
          await tx.importRow.updateMany({
            where: { id: attemptedRowId, batchId: id, outcome: null },
            data: {
              outcome: "ERROR",
              error:
                "A conflicting record was created. Preview this row again.",
            },
          });
      });
    }
  }
  return getBatch(actor, id);
}

export async function previewMatches(actor: RosterActor, termId: string) {
  const pairs = await adminTransaction(actor, async (tx) => {
    await requireTerm(tx, actor.instituteId, termId);
    const students = await tx.user.findMany({
      where: {
        instituteId: actor.instituteId,
        role: { equals: "STUDENT", mode: "insensitive" },
        isActive: true,
        studentNumber: { not: null },
        section: { not: "" },
      },
      select: userSelect,
    });
    const courses = await tx.course.findMany({
      where: {
        instituteId: actor.instituteId,
        termId,
        isArchived: false,
        programId: { not: null },
      },
    });
    const result: string[][] = [];
    for (const user of students)
      for (const course of courses)
        if (
          normalizeCode(user.section) === normalizeCode(course.section) &&
          user.programMemberships.some((m) => m.programId === course.programId)
        ) {
          result.push([user.studentNumber!, course.code, course.section]);
          if (result.length > 500)
            throw new AccessError(
              400,
              "More than 500 matches. Use enrollment CSV files with at most 500 rows each.",
            );
        }
    return result;
  });
  if (!pairs.length)
    throw new AccessError(
      400,
      "No matching student/program/section pairs found.",
    );
  const csv = [
    HEADERS.ENROLLMENTS.join(","),
    ...pairs.map((p) =>
      p.map((v) => '"' + v.replace(/"/g, '""') + '"').join(","),
    ),
  ].join("\r\n");
  return previewImport(actor, { type: "ENROLLMENTS", csv, termId }, { matchOnly: true });
}
