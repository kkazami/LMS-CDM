import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import type { QuestionBankItemData } from "@/types/forms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET question-bank/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId");
    const qType = url.searchParams.get("type");
    const search = url.searchParams.get("q") || "";

    const items = await db.questionBankItem.findMany({
      where: {
        OR: [
          { createdBy: session.user.id },
          ...(courseId ? [{ courseId }] : []),
        ],
        ...(qType ? { questionType: qType } : {}),
        ...(search
          ? {
              prompt: { contains: search, mode: "insensitive" },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedItems: QuestionBankItemData[] = items.map((item) => {
      let cfg = {};
      let tags: string[] = [];
      try {
        cfg = JSON.parse(item.config || "{}");
      } catch {}
      try {
        tags = JSON.parse(item.tags || "[]");
      } catch {}

      return {
        ...item,
        questionType: item.questionType as QuestionBankItemData["questionType"],
        config: cfg,
        tags,
      };
    });

    return NextResponse.json({ items: parsedItems });
  } catch (error) {
    console.error("QUESTION_BANK_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch question bank." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST question-bank/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, questionType, prompt, config = {}, points = 1, tags = [] } = body;

    if (!prompt || !questionType) {
      return NextResponse.json({ message: "Prompt and questionType are required." }, { status: 400 });
    }

    const item = await db.questionBankItem.create({
      data: {
        courseId: courseId || null,
        createdBy: session.user.id,
        questionType,
        prompt: prompt.trim(),
        config: typeof config === "string" ? config : JSON.stringify(config),
        points: Number(points) || 1,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("QUESTION_BANK_POST_ERROR", error);
    return NextResponse.json({ message: "Failed to create question bank item." }, { status: 500 });
  }
}
