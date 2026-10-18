import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth-schema";
import { createSession, SessionAdmissionError } from "@/lib/auth-session";
import { canonicalRole, mayAdmitAccount, supportedInstitute } from '@/lib/super-user-v1/capabilities';
import { processLoginReward } from "@/lib/gamification/login-rewards";
import {
  getClientIp,
  checkDualRateLimit,
  RATE_LIMIT_CONFIG,
  createRateLimitResponse,
} from "@/lib/rate-limit";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const clientIp = getClientIp(request);

  try {
    const body = await request.json();

    // 1. Dual Rate Limiting (IP-based and Account-based)
    const rateLimitResult = await checkDualRateLimit({
      ip: clientIp,
      account: typeof body?.email === "string" ? body.email : undefined,
      ipPolicy: RATE_LIMIT_CONFIG.loginIp,
      accountPolicy: RATE_LIMIT_CONFIG.loginAccount,
    });

    if (!rateLimitResult.allowed) {
      const resp = createRateLimitResponse(rateLimitResult);
      for (const [k, v] of Object.entries(corsHeaders)) {
        resp.headers.set(k, v);
      }
      return resp;
    }

    // 2. Validate input schema
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password, instituteCode: requestedInstituteCode } = parsed.data;

    // 3. User lookup
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        institute: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { message: "Invalid email, password, or institute." },
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. Verify password hash
    const passwordMatches = await compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Invalid email, password, or institute." },
        { status: 401, headers: corsHeaders }
      );
    }

    // 5. Account status check
    if (!mayAdmitAccount(user)) {
      return NextResponse.json(
        { message: "Your account has been deactivated. Please contact administration." },
        { status: 403, headers: corsHeaders }
      );
    }

    // 6. Enforce dynamic institute scoping
    const userRole = (user.role || "").toUpperCase();
    const isAdmin = userRole === "ADMIN";
    const isSuperUser = canonicalRole(userRole) === 'SUPER_USER';
    const userInstituteCode = user.institute?.code?.toLowerCase();
    const targetInstituteCode = requestedInstituteCode.toLowerCase();

    // Students and teachers are locked to their appointed portal. Admins can log in from any portal.
    if (isSuperUser && !supportedInstitute(targetInstituteCode)) {
      return NextResponse.json({ message: 'Unsupported institute.' }, { status: 400, headers: corsHeaders });
    }
    if (!isAdmin && !isSuperUser && userInstituteCode !== targetInstituteCode) {
      const userInstituteName = user.institute?.name || userInstituteCode?.toUpperCase();
      return NextResponse.json(
        {
          message: `Access denied. Your account is registered under ${userInstituteName} (${userInstituteCode?.toUpperCase()}). You cannot log in through the ${targetInstituteCode.toUpperCase()} portal.`,
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 7. Create database session with 256-bit CSPRNG token (SHA-256 hashed in DB)
    const initialSuperInstitute = isSuperUser ? await db.institute.findUnique({ where: { code: 'ics' }, select: { code: true, name: true } }) : null;
    if (isSuperUser && !initialSuperInstitute) return NextResponse.json({ message: 'Institute not found.' }, { status: 404, headers: corsHeaders });
    const userAgent = request.headers.get("user-agent") || undefined;
    const { token, expiresAt } = await createSession(user.id, {
      userAgent,
      ipAddress: clientIp,
    }, user.password, { role: user.role, instituteId: user.instituteId, credentialProvisioningState: user.credentialProvisioningState });

    // 8. Daily login rewards (for students)
    let loginRewardResult: { rewarded: boolean; streak: number } | null = null;
    try {
      if (user.role === "STUDENT") {
        loginRewardResult = await processLoginReward(user.id);
      }
    } catch (rewardErr) {
      console.error("LOGIN_REWARD_ERROR", rewardErr);
    }

    const instituteCode = isSuperUser ? 'ics' : user.institute?.code || targetInstituteCode;
    const instituteName = initialSuperInstitute?.name || user.institute?.name || `${instituteCode.toUpperCase()} Institute`;

    // 9. Return opaque token (NOT internal session.id)
    return NextResponse.json(
      {
        message: "Login successful.",
        token, // Opaque client-facing bearer token
        expiresAt: expiresAt.toISOString(),
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
        rewardReceipt: loginRewardResult
          ? {
              rewarded: loginRewardResult.rewarded,
              streak: loginRewardResult.streak,
              expEarned: loginRewardResult.rewarded ? 10 : 0,
            }
          : null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: unknown) {
    if (error instanceof SessionAdmissionError) return NextResponse.json({ message: error.message }, { status: error.status, headers: corsHeaders });
    console.error('LOGIN_OPERATION_UNAVAILABLE');

    return NextResponse.json(
      {
        message: "Something went wrong during login.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
