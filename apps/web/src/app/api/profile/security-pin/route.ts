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

    const { currentPassword, newPin } = await req.json();

    if (!currentPassword || !newPin) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
    }

    // Fetch the user to get their current hashed password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found or password not set" }, { status: 404 });
    }

    // Verify current password
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    // Hash new PIN and save
    const hashedPin = await hash(newPin, 10);
    
    await db.user.update({
      where: { id: session.user.id },
      data: { securityPin: hashedPin },
    });

    return NextResponse.json({ success: true, message: "Security PIN updated successfully" });
  } catch (error) {
    console.error("[SECURITY_PIN]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
