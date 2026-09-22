import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { AdminUpdatePostSchema } from "@/features/knowledge-exchange/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const eligibility = await checkKxEligibility(request);
  if (!eligibility || eligibility.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required." },
      { status: 403 }
    );
  }

  const { postId } = await params;
  const json = await request.json().catch(() => ({}));
  const parsed = AdminUpdatePostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { title, body, status, isPinned, isDeleted } = parsed.data;

  const updated = await db.kxPost.update({
    where: { id: postId },
    data: {
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(status !== undefined && { status }),
      ...(isPinned !== undefined && { isPinned }),
      ...(isDeleted !== undefined && { isDeleted }),
    },
  });

  return NextResponse.json({ success: true, post: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const eligibility = await checkKxEligibility(request);
  if (!eligibility || eligibility.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required." },
      { status: 403 }
    );
  }

  const { postId } = await params;
  const { searchParams } = new URL(request.url);
  const hard = searchParams.get("hard") === "true";

  if (hard) {
    await db.kxPost.delete({ where: { id: postId } });
  } else {
    await db.kxPost.update({
      where: { id: postId },
      data: { isDeleted: true },
    });
  }

  return NextResponse.json({ success: true, message: "Post deleted by admin." });
}
