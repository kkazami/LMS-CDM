import { NextResponse } from "next/server";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { errorResponse } from "@/lib/practicum/http";
import { getPlacementSubmissions, requirePlacementAccess } from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/practicum/placements/[id]/submissions
 * The placement's student or its supervisor only, with each submission's feedback history.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["STUDENT", "INSTRUCTOR"]);
    await requirePlacementAccess(id, actor);
    return NextResponse.json({ submissions: await getPlacementSubmissions(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
