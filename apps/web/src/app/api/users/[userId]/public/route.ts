import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentNumber: true,
      uniqueId: true,
      avatarUrl: true,
      bio: true,
      phone: true,
      department: true,
      yearLevel: true,
      coverColor: true,
      createdAt: true,
      instituteId: true,
      institute: { select: { code: true, name: true } },
      taughtCourses: {
        where: { isArchived: false },
        select: { id: true, title: true, code: true },
        take: 5,
      },
      enrollments: {
        where: { status: "APPROVED" },
        select: { course: { select: { id: true, title: true, code: true } } },
        take: 5,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  // Security: only users in the same institute can view profiles
  const sessionUser = session.user as Record<string, unknown>;
  const sessionInstituteId = sessionUser.instituteId as string;

  if (user.instituteId !== sessionInstituteId) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ user });
}
