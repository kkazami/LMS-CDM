import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const eligibility = await checkKxEligibility(request);
  if (!eligibility) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "Forbidden: Knowledge Exchange is exclusive to ICS." },
      { status: 403 }
    );
  }

  // Strictly restricted to ADMIN role (AC-022, AC-024)
  if (eligibility.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Real author identity de-anonymization is restricted to administrators." },
      { status: 403 }
    );
  }

  // Fetch all anonymous posts
  const anonymousPosts = await db.kxPost.findMany({
    where: { isAnonymous: true },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          studentNumber: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const records = anonymousPosts.map((p) => {
    const isInstructor =
      p.author.role === "PROFESSOR" ||
      p.author.role === "INSTRUCTOR" ||
      p.author.role === "TEACHER";

    return {
      id: p.id,
      title: p.title,
      postType: p.postType,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      anonymousAlias: isInstructor ? "Anonymous Instructor" : "Anonymous Student",
      author: {
        id: p.author.id,
        name: p.author.name,
        email: p.author.email,
        studentNumber: p.author.studentNumber,
        role: p.author.role,
      },
    };
  });

  return NextResponse.json({ posts: records });
}
