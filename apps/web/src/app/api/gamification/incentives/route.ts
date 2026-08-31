import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — List incentive rules for courses taught by the instructor / admin
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const rules = await db.gradeIncentiveRule.findMany({
    where: courseId ? { courseId } : { createdBy: session.user.id },
    include: { course: { select: { title: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

// POST — Create a new grade incentive rule
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
    const { courseId, label, gradeMin, bonusExp } = (await req.json()) as {
      courseId: string;
      label: string;
      gradeMin: number;
      bonusExp: number;
    };

    if (!courseId || !label || isNaN(gradeMin) || isNaN(bonusExp)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rule = await db.gradeIncentiveRule.create({
      data: {
        courseId,
        createdBy: session.user.id,
        label: label.trim(),
        gradeMin: Number(gradeMin),
        bonusExp: Math.max(1, Number(bonusExp)),
        isActive: true,
      },
      include: {
        course: { select: { title: true, code: true } },
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("CREATE_INCENTIVE_RULE_ERROR", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

// PATCH — Toggle active state
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { ruleId, isActive } = (await req.json()) as {
      ruleId: string;
      isActive: boolean;
    };

    if (!ruleId) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const updated = await db.gradeIncentiveRule.update({
      where: { id: ruleId },
      data: { isActive: Boolean(isActive) },
      include: { course: { select: { title: true, code: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("TOGGLE_INCENTIVE_RULE_ERROR", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

// DELETE — Remove rule
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    await db.gradeIncentiveRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_INCENTIVE_RULE_ERROR", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
