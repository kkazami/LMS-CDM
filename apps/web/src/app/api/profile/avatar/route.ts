import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { requireOwnedUpload } from '@/lib/private-upload';
import { AccessError } from '@/lib/super-user-v1/actor';

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "PUT profile/avatar/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { avatarUrl: string | null };

  // Validate: must be null, a relative path starting with /uploads/, a data: URI, or an https:// URL
  if (body.avatarUrl !== null) {
    const isRelativePath =
      typeof body.avatarUrl === "string" && (/^\/api\/assets\/[a-zA-Z0-9-]{1,100}$/.test(body.avatarUrl) || body.avatarUrl.startsWith("/uploads/"));
    const isDataUri =
      typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("data:image/");
    const isBlobUrl =
      typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("https://");

    if (!isRelativePath && !isDataUri && !isBlobUrl) {
      return NextResponse.json({ message: "Invalid avatar URL." }, { status: 400 });
    }
  }

  if (body.avatarUrl) {
    try { await requireOwnedUpload(db, session.user, body.avatarUrl); }
    catch (error) { return NextResponse.json({ message: 'Invalid avatar upload.' }, { status: error instanceof AccessError ? error.status : 503 }); }
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: body.avatarUrl },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ avatarUrl: updated.avatarUrl });
}
