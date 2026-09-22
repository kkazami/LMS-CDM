import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { ModerationActionSchema } from "@/features/knowledge-exchange/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  // Restricted to PROFESSOR and ADMIN roles
  if (eligibility.role !== "ADMIN" && eligibility.role !== "INSTRUCTOR") {
    return NextResponse.json(
      { error: "Forbidden: Moderation actions are restricted to instructors and administrators." },
      { status: 403 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = ModerationActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const { targetType, targetId, actionType, reason, postId } = parsed.data;
  const moderatorId = eligibility.session.user.id;

  await db.$transaction(async (tx) => {
    // 1. Execute the action on the target model
    if (targetType === "POST") {
      switch (actionType) {
        case "CLOSE":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { status: "CLOSED", closeReason: reason || "Closed by moderator" },
          });
          break;
        case "REOPEN":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { status: "OPEN", closeReason: null },
          });
          break;
        case "LOCK":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { status: "LOCKED" },
          });
          break;
        case "UNLOCK":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { status: "OPEN" },
          });
          break;
        case "PIN":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { isPinned: true },
          });
          break;
        case "UNPIN":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { isPinned: false },
          });
          break;
        case "DELETE":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { isDeleted: true },
          });
          break;
        case "RESTORE":
          await tx.kxPost.update({
            where: { id: targetId },
            data: { isDeleted: false },
          });
          break;
      }
    } else if (targetType === "ANSWER") {
      if (actionType === "DELETE") {
        await tx.kxAnswer.update({
          where: { id: targetId },
          data: { isDeleted: true },
        });
      } else if (actionType === "RESTORE") {
        await tx.kxAnswer.update({
          where: { id: targetId },
          data: { isDeleted: false },
        });
      }
    } else if (targetType === "COMMENT") {
      if (actionType === "DELETE") {
        await tx.kxComment.update({
          where: { id: targetId },
          data: { isDeleted: true },
        });
      } else if (actionType === "RESTORE") {
        await tx.kxComment.update({
          where: { id: targetId },
          data: { isDeleted: false },
        });
      }
    }

    // 2. Record immutable audit action in KxModerationAction
    await tx.kxModerationAction.create({
      data: {
        moderatorId,
        actionType,
        targetType,
        targetId,
        postId: postId || (targetType === "POST" ? targetId : null),
        reason: reason || "",
      },
    });

    // 3. Mark related flags as ACTIONED or REVIEWED
    if (targetType === "POST") {
      await tx.kxFlag.updateMany({
        where: { postId: targetId, status: "PENDING" },
        data: {
          status: "ACTIONED",
          reviewedById: moderatorId,
          reviewedAt: new Date(),
        },
      });
    } else if (targetType === "ANSWER") {
      await tx.kxFlag.updateMany({
        where: { answerId: targetId, status: "PENDING" },
        data: {
          status: "ACTIONED",
          reviewedById: moderatorId,
          reviewedAt: new Date(),
        },
      });
    }
  });

  return NextResponse.json({ success: true, message: `Action ${actionType} applied successfully.` });
}
