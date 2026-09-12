import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth-schema";
import { createSession } from "@/lib/auth-session";

import { processLoginReward } from "@/lib/gamification/login-rewards";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, instituteCode: requestedInstituteCode } = parsed.data;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        institute: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check if the account is deactivated
    if (user.isActive === false) {
      return NextResponse.json(
        { message: "Your account has been deactivated. Please contact administration." },
        { status: 403 }
      );
    }

    // Enforce institute scoping: accounts can only sign in through their own institute's portal
    if (requestedInstituteCode && user.institute?.code) {
      const userInstituteCode = user.institute.code.toLowerCase();
      const targetInstituteCode = requestedInstituteCode.toLowerCase();

      if (userInstituteCode !== targetInstituteCode) {
        const userInstituteName = user.institute.name || userInstituteCode.toUpperCase();
        return NextResponse.json(
          {
            message: `Access denied. Your account is registered under ${userInstituteName} (${userInstituteCode.toUpperCase()}). You cannot log in through the ${targetInstituteCode.toUpperCase()} portal.`,
          },
          { status: 403 }
        );
      }
    }

    const session = await createSession(user.id);

    // Process Daily Login Rewards asynchronously / before responding
    let loginRewardResult: { rewarded: boolean; streak: number } | null = null;
    try {
      if (user.role === "STUDENT") {
        loginRewardResult = await processLoginReward(user.id);
      }
    } catch (rewardErr) {
      console.error("LOGIN_REWARD_ERROR", rewardErr);
    }

    const instituteCode = user.institute?.code || "ics";
    const instituteName = user.institute?.name || "Institute of Computer Studies";

    return NextResponse.json(
      {
        message: "Login successful.",
        token: session.id,
        expiresAt: session.expiresAt.toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentNumber: (user as Record<string, unknown>).studentNumber as string | undefined || null,
          institute: {
            code: instituteCode,
            name: instituteName,
          },
        },
        rewardReceipt: loginRewardResult ? {
          rewarded: loginRewardResult.rewarded,
          streak: loginRewardResult.streak,
          expEarned: loginRewardResult.rewarded ? 10 : 0,
        } : null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error("LOGIN_ERROR:", err?.message || error, err?.stack);

    return NextResponse.json(
      {
        message: "Something went wrong during login.",
        detail: process.env.NODE_ENV !== "production" ? err?.message : undefined,
      },
      { status: 500 }
    );
  }
}