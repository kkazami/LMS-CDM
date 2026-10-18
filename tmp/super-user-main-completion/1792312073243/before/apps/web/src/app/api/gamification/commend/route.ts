import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { grantExp } from "@/lib/gamification/grant-exp";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { studentId, courseId, amount, reason } = (await req.json()) as {
      studentId: string;
      courseId?: string;
      amount: number;
      reason: string;
    };

    if (!studentId || !amount || !reason?.trim()) {
      return NextResponse.json({ error: "Invalid commendation parameters" }, { status: 400 });
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Cap single manual grant to 250 EXP to prevent inflation
    const sanitizedAmount = Math.min(Math.max(Number(amount), 5), 250);

    const instructorName = (session.user.name as string) || "Instructor";

    const result = await grantExp({
      userId: studentId,
      amount: sanitizedAmount,
      reason: `Instructor Commendation: ${reason.trim()} (by ${instructorName})`,
      source: "grade_incentive",
      courseId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("COMMEND_STUDENT_ERROR", error);
    return NextResponse.json({ error: "Failed to issue commendation" }, { status: 500 });
  }
}
