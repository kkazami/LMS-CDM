import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { UserPreferences } from "@lms/types";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { preferences } = body as { preferences: Partial<UserPreferences> };

    if (typeof preferences !== "object" || Array.isArray(preferences) || preferences === null) {
      return NextResponse.json({ message: "Invalid preferences format. Expected an object." }, { status: 400 });
    }

    // Merge existing preferences with new preferences
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    let existingPrefs: Partial<UserPreferences> = {};
    try {
      existingPrefs = JSON.parse(user.preferences);
    } catch {
      // Ignore parse error, default to empty object
    }

    const mergedPrefs: UserPreferences = {
      ...existingPrefs,
      ...preferences,
    };

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        preferences: JSON.stringify(mergedPrefs),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[SETTINGS_UPDATE]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
