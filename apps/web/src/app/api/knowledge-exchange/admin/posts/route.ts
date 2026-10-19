import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET knowledge-exchange/admin/posts/route.ts");
  if (ceilingDenial) return ceilingDenial;

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

  if (eligibility.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required." },
      { status: 403 }
    );
  }

  const posts = await db.kxPost.findMany({
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
      tags: {
        include: { tag: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ posts });
}
