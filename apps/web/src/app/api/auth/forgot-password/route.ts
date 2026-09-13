import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

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

    const otpRecord = await db.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpCodeHash,
        expiresAt,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("=================================================");
      console.log(`🔑 [DEV OTP] Code for ${user.email}: ${otpCode}`);
      console.log("=================================================");
    }

    // Send email
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
        <h2 style="color: #111827; margin-bottom: 8px;">Password Reset Request</h2>
        <p>Hello ${user.name || "Student"},</p>
        <p>You requested a password reset for your CdM LMS account. Please use the following 6-digit verification code to complete the process:</p>
        <div style="margin: 28px 0; padding: 20px; background: #f3f4f6; border-radius: 12px; text-align: center;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1f2937; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: "CdM LMS — Your Password Reset Code",
        html: emailHtml,
      });

      const isDevFallback = emailResult?.deliveredVia === "console_fallback" || emailResult?.deliveredVia === "console";

      return NextResponse.json(
        {
          message: isDevFallback
            ? "Reset code generated! (Dev mode: Check server terminal for code)"
            : "If that email exists, an OTP has been sent.",
          devOtp: process.env.NODE_ENV !== "production" ? otpCode : undefined,
        },
        { status: 200 }
      );
    } catch (emailError: any) {
      // If email sending failed completely in production, remove the newly created OTP
      // so the user does NOT get locked out by rate limiting on delivery failures
      await db.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      }).catch(() => {});

      console.error("FORGOT_PASSWORD_EMAIL_FAILED", emailError);
      return NextResponse.json(
        { message: "Unable to send email right now. Please check your SMTP configuration or try again later." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
