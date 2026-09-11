import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { compare, hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Fetch the user to get their current hashed password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    // Hash new password and save
    const hashedPassword = await hash(newPassword, 10);
    
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("[CHANGE_PASSWORD]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
