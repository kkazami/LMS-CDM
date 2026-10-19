import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/api-auth";
import { generateQuestionsFromContent } from "@/lib/forms/ai-question-generator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/generate-questions/route.ts");
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
    const { contentOrTopic, count = 5, questionTypes, difficulty = "MEDIUM" } = body;

    if (!contentOrTopic || typeof contentOrTopic !== "string" || contentOrTopic.trim().length === 0) {
      return NextResponse.json({ message: "Content or topic prompt is required." }, { status: 400 });
    }

    const generated = await generateQuestionsFromContent({
      contentOrTopic: contentOrTopic.trim(),
      count: Math.min(Math.max(1, Number(count) || 5), 15),
      questionTypes,
      difficulty,
    });

    return NextResponse.json({ success: true, questions: generated });
  } catch (error) {
    console.error("AI_QUESTION_GEN_ERROR", error);
    return NextResponse.json({ message: "Failed to generate questions." }, { status: 500 });
  }
}
