import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // For security, don't reveal that the user doesn't exist
      return NextResponse.json({ message: "If that email exists, an OTP has been sent." }, { status: 200 });
    }

    // Rate Limiting check (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await db.passwordResetOtp.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequests >= 3) {
      return NextResponse.json(
        { message: "Too many password reset requests. Please try again later." },
        { status: 429 }
      );
    }

    // Clear any unused previous OTPs for this user
    await db.passwordResetOtp.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCodeHash = await hash(otpCode, 10);
    
    // Expires in 15 mins
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpCodeHash,
        expiresAt,
      },
    });

    // Send email
    const emailHtml = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset for your account. Please use the following 6-digit verification code to complete the process.</p>
        <div style="margin: 32px 0; padding: 24px; background: #f3f4f6; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${otpCode}</span>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "Your Password Reset Code",
      html: emailHtml,
    });

    return NextResponse.json({ message: "If that email exists, an OTP has been sent." }, { status: 200 });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
