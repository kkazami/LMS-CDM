import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

interface ShareMilestoneRequest {
  courseId: string;
  problemId: string;
  problemTitle: string;
  level: number;
  tier: string;
  language: string;
  score: number;
  customMessage?: string;
  instituteCode: string;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ShareMilestoneRequest;
    const {
      courseId,
      problemId,
      problemTitle,
      level,
      tier,
      language,
      score,
      customMessage,
      instituteCode,
    } = body;

    if (!courseId || !problemId || !problemTitle) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, problemId, problemTitle" },
        { status: 400 }
      );
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Build milestone announcement text
    const badgeEmoji = score === 100 ? "🏆" : "⭐";
    const tierName = tier.toUpperCase();
    const langName = language.toUpperCase();

    const formattedContent = `${badgeEmoji} **CodeLab Milestone Reached!**
I just completed Level ${level} — **${problemTitle}** (${langName}) in the CodeLab with a **${score}% score**!

🏷️ **Tier:** ${tierName} | **Level:** ${level} | **Language:** ${langName}
${customMessage ? `\n> "${customMessage}"\n` : ""}
[Solve this challenge in CodeLab](/${instituteCode}/activities/codelab/${problemId}/${session.user.id}-${problemId})`;

    // Create the announcement post in the course stream
    const announcement = await db.announcement.create({
      data: {
        content: formattedContent,
        courseId,
        authorId: session.user.id,
      },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/stream`);

    return NextResponse.json({
      success: true,
      announcementId: announcement.id,
      message: `Achievement broadcasted to ${course.title}!`,
    });
  } catch (error) {
    console.error("SHARE_CODELAB_MILESTONE_ERROR", error);
    return NextResponse.json({ error: "Failed to broadcast achievement" }, { status: 500 });
  }
}
