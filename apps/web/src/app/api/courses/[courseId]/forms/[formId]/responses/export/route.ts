import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/forms/[formId]/responses/export/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        questions: {
          where: { questionType: { not: "SECTION_HEADER" } },
          orderBy: { position: "asc" },
        },
        attempts: {
          where: { status: { in: ["SUBMITTED", "TIMED_OUT"] } },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                studentNumber: true,
              },
            },
            answers: true,
          },
          orderBy: { submittedAt: "asc" },
        },
      },
    });

    if (!form || form.courseId !== courseId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // CSV Headers
    const baseHeaders = [
      "Student Name",
      "Student Number",
      "Email",
      "Attempt Number",
      "Status",
      "Raw Score",
      "Total Points",
      "Percentage",
      "Passed",
      "Time Spent (Seconds)",
      "Submitted At",
      "Tab Switches",
      "Copy Pastes",
    ];

    const questionHeaders = form.questions.map((q, i) => `Q${i + 1}: ${q.prompt.replace(/"/g, '""')}`);
    const allHeaders = [...baseHeaders, ...questionHeaders];

    const csvRows: string[] = [];
    csvRows.push(allHeaders.map((h) => `"${h}"`).join(","));

    form.attempts.forEach((att) => {
      const answersByQ = new Map<string, (typeof att.answers)[0]>();
      att.answers.forEach((a) => answersByQ.set(a.questionId, a));

      const rowValues = [
        att.user.name,
        att.user.studentNumber || "N/A",
        att.user.email,
        String(att.attemptNumber),
        att.status,
        String(att.rawScore ?? 0),
        String(att.totalPoints ?? form.totalPoints ?? 0),
        `${att.percentage ?? 0}%`,
        att.passed === null ? "N/A" : att.passed ? "PASSED" : "FAILED",
        String(att.timeSpentSecs ?? 0),
        att.submittedAt ? att.submittedAt.toISOString() : "",
        String(att.tabSwitchCount),
        String(att.copyPasteCount),
      ];

      // Append per-question answers
      form.questions.forEach((q) => {
        const ans = answersByQ.get(q.id);
        if (!ans) {
          rowValues.push("");
          return;
        }

        let answerDisplay = "";
        if (ans.answerText) {
          answerDisplay = ans.answerText;
        } else if (ans.answerOptions) {
          try {
            const opts: string[] = JSON.parse(ans.answerOptions);
            answerDisplay = opts.join("; ");
          } catch {
            answerDisplay = ans.answerOptions;
          }
        } else if (ans.answerNumber !== null && ans.answerNumber !== undefined) {
          answerDisplay = String(ans.answerNumber);
        } else if (ans.answerDate) {
          answerDisplay = ans.answerDate.toISOString().split("T")[0];
        } else if (ans.fileUrl) {
          answerDisplay = ans.fileUrl;
        } else if (ans.answerMatrix) {
          answerDisplay = ans.answerMatrix;
        } else if (ans.answerRanking) {
          answerDisplay = ans.answerRanking;
        }

        rowValues.push(answerDisplay.replace(/"/g, '""'));
      });

      csvRows.push(rowValues.map((v) => `"${v}"`).join(","));
    });

    const csvString = csvRows.join("\n");
    const filename = `${form.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_responses.csv`;

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("EXPORT_CSV_ERROR", error);
    return new NextResponse("Export Failed", { status: 500 });
  }
}
