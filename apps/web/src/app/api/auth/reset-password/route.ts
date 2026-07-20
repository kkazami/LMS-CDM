import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash, compare } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid OTP or email." }, { status: 400 });
    }

    // Find the latest active OTP for this user
    const latestOtpRecord = await db.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!latestOtpRecord) {
      return NextResponse.json({ message: "Invalid or expired OTP." }, { status: 400 });
    }

    if (latestOtpRecord.expiresAt < new Date()) {
      return NextResponse.json({ message: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    const isValidOtp = await compare(otp, latestOtpRecord.otpCodeHash);

    if (!isValidOtp) {
      return NextResponse.json({ message: "Invalid OTP." }, { status: 400 });
    }

    // OTP is valid and not expired. Update password and mark OTP as used.
    const hashedPassword = await hash(newPassword, 10);

    // Using a transaction to ensure both operations succeed together
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      db.passwordResetOtp.update({
        where: { id: latestOtpRecord.id },
        data: { isUsed: true },
      }),
    ]);

    // Optional: Also invalidate all active sessions for this user so they have to log in again
    await db.session.deleteMany({
      where: { userId: user.id }
    });

    return NextResponse.json({ message: "Password has been successfully reset." }, { status: 200 });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
