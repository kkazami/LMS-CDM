import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { requireCourseAccess } from "@/lib/course-access";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";
import { AccessError } from "@/lib/super-user-v1/actor";

export const dynamic = "force-dynamic";

interface ImportRowInput {
  studentEmail?: string;
  studentNumber?: string;
  supplementaryScore?: any;
}

interface ParsedRowResult {
  identifier: string;
  matchedStudent: {
    id: string;
    name: string;
    email: string;
    studentNumber: string | null;
  } | null;
  score: number | null;
  isValid: boolean;
  error?: string;
}

/**
 * POST /api/analytics/supplementary-import
 * Handles parsing, preview validation, and transactional commit of supplementary scores.
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, rows, commit } = body as {
      courseId: string;
      rows: ImportRowInput[];
      commit?: boolean;
    };

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required." }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ message: "No data rows provided in CSV." }, { status: 400 });
    }

    // Verify course exists, belongs to user's institute, and user has instructor/admin rights
    let course;
    try {
      course = await requireCourseAccess(session.user, courseId, true);
    } catch (err) {
      if (err instanceof AccessError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
    }

    // Fetch approved enrollments for matching within the same institute
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        status: "APPROVED",
        student: {
          instituteId: session.user.instituteId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentNumber: true,
          },
        },
      },
    });

    // Lookup maps: by lowercase email and student number
    const studentByEmail = new Map<string, typeof enrollments[0]["student"]>();
    const studentByNumber = new Map<string, typeof enrollments[0]["student"]>();

    for (const e of enrollments) {
      if (e.student.email) {
        studentByEmail.set(e.student.email.trim().toLowerCase(), e.student);
      }
      if (e.student.studentNumber) {
        studentByNumber.set(e.student.studentNumber.trim().toLowerCase(), e.student);
      }
    }

    const parsedResults: ParsedRowResult[] = [];
    const validRowsToCommit: Array<{ studentId: string; score: number }> = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rawEmail = row.studentEmail ? String(row.studentEmail).trim() : "";
      const rawNumber = row.studentNumber ? String(row.studentNumber).trim() : "";
      const identifier = rawEmail || rawNumber || `Row ${index + 1}`;

      // 1. Match student
      let matchedStudent = null;
      if (rawEmail) {
        matchedStudent = studentByEmail.get(rawEmail.toLowerCase()) || null;
      }
      if (!matchedStudent && rawNumber) {
        matchedStudent = studentByNumber.get(rawNumber.toLowerCase()) || null;
      }

      // 2. Validate score (must be 0-100)
      const rawScore = row.supplementaryScore;
      const numScore = parseFloat(String(rawScore));
      const isScoreValid = !isNaN(numScore) && isFinite(numScore) && numScore >= 0 && numScore <= 100;

      let errorMsg: string | undefined;

      if (!matchedStudent) {
        errorMsg = `Student "${identifier}" is not an enrolled student in ${course.code}.`;
      } else if (!isScoreValid) {
        errorMsg = `Invalid score "${rawScore}". Must be a number between 0 and 100.`;
      }

      const isValid = Boolean(matchedStudent && isScoreValid);

      parsedResults.push({
        identifier,
        matchedStudent: matchedStudent
          ? {
              id: matchedStudent.id,
              name: matchedStudent.name,
              email: matchedStudent.email,
              studentNumber: matchedStudent.studentNumber,
            }
          : null,
        score: isScoreValid ? numScore : null,
        isValid,
        error: errorMsg,
      });

      if (isValid && matchedStudent) {
        validRowsToCommit.push({
          studentId: matchedStudent.id,
          score: numScore,
        });
      }
    }

    const invalidCount = parsedResults.filter((r) => !r.isValid).length;
    const validCount = parsedResults.filter((r) => r.isValid).length;
    const canCommit = invalidCount === 0 && validCount > 0;

    // If this is just a preview validation request, return the report
    if (!commit) {
      return NextResponse.json({
        courseTitle: course.title,
        courseCode: course.code,
        totalRows: rows.length,
        validCount,
        invalidCount,
        canCommit,
        results: parsedResults,
      });
    }

    // ── COMMIT TRANSACTION ──
    if (!canCommit) {
      return NextResponse.json(
        {
          message: `Cannot commit import: ${invalidCount} invalid or unmatched row(s) found.`,
          results: parsedResults,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      // 1. Re-use existing "Supplementary Offline Assessment" or create one if none exists
      let syllabusItem = await tx.syllabusItem.findFirst({
        where: {
          courseId,
          title: "Supplementary Offline Assessment",
        },
      });

      let wasCreated = false;
      if (!syllabusItem) {
        syllabusItem = await tx.syllabusItem.create({
          data: {
            courseId,
            title: "Supplementary Offline Assessment",
            description: "Supplementary offline assessment grades (imported via Student Analytics)",
            type: "ASSIGNMENT",
            maxPoints: 100,
            dueDate: null,
          },
        });
        wasCreated = true;
      }

      // 2. Upsert submissions for matched students
      for (const row of validRowsToCommit) {
        await tx.studentSubmission.upsert({
          where: {
            syllabusItemId_studentId: {
              syllabusItemId: syllabusItem.id,
              studentId: row.studentId,
            },
          },
          update: {
            grade: row.score,
            status: "RETURNED",
            isReturned: true,
            submittedAt: now,
            updatedAt: now,
          },
          create: {
            syllabusItemId: syllabusItem.id,
            studentId: row.studentId,
            grade: row.score,
            status: "RETURNED",
            isReturned: true,
            submittedAt: now,
          },
        });
      }

      return {
        syllabusItemId: syllabusItem.id,
        wasCreated,
        count: validRowsToCommit.length,
      };
    });

    console.log(
      `[SUPPLEMENTARY_IMPORT] Imported ${result.count} grades for course ${course.code} (SyllabusItem ${result.syllabusItemId}, created: ${result.wasCreated}).`
    );

    return NextResponse.json({
      success: true,
      courseCode: course.code,
      courseTitle: course.title,
      importedCount: result.count,
      validCount: result.count,
      updatedCount: result.count,
      syllabusItemId: result.syllabusItemId,
      createdAssignmentId: result.syllabusItemId,
      wasItemCreated: result.wasCreated,
    });
  } catch (error) {
    console.error("SUPPLEMENTARY_IMPORT_ERROR", error);
    return NextResponse.json({ message: "Failed to process import." }, { status: 500 });
  }
}
