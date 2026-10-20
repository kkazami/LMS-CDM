import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TriageAlertBody {
  studentId: string;
  studentName?: string;
  riskLevel?: "high" | "medium" | "low";
  avgScore?: number;
  customMessage?: string;
  instituteCode?: string;
}

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST codelab/instructor/alert/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role.toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only instructors can send student intervention alerts." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as TriageAlertBody;
    const { studentId, studentName, riskLevel, avgScore, customMessage, instituteCode } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    // Verify student exists
    const targetStudent = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true },
    });

    if (!targetStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const resolvedName = studentName || targetStudent.name || "Student";
    const institute = instituteCode || "ics";

    // Formulate helpful alert message
    let messageText = customMessage?.trim();
    if (!messageText) {
      if (riskLevel === "high" || (typeof avgScore === "number" && avgScore < 50)) {
        messageText = `Your average CodeLab score is ${avgScore ?? 0}%. Your instructor recommends reviewing the levels you found difficult. Ask your instructor if you need help.`;
      } else if (riskLevel === "medium") {
        messageText = `Your instructor recommends more CodeLab practice. Try a level again or ask for help if you are stuck.`;
      } else {
        messageText = `Your instructor has asked you to review your CodeLab progress. Open CodeLab to continue practicing.`;
      }
    }

    // Create real Notification record in database
    await createNotification({
      userId: studentId,
      type: "ALERT",
      title: "CodeLab practice reminder",
      message: messageText,
      link: `/${institute}/activities/codelab`,
    });

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${resolvedName}.`,
    });
  } catch (error) {
    console.error("TRIAGE_ALERT_ERROR", error);
    return NextResponse.json({ error: "Failed to send alert" }, { status: 500 });
  }
}
