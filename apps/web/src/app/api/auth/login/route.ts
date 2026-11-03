import { mobileCapabilities } from '@/lib/mobile-capabilities';
import { NextResponse, after } from "next/server";
import { getInstituteName } from "@lms/types";
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
import { logActivity } from "@/lib/ite/activity-logger";
import { persistentLimit } from '@/lib/roster/rate-limit';
import { AccessError } from '@/lib/super-user-v1/actor';
import { needsClassEnrollment } from '@/lib/student-access';

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const clientIp = getClientIp(request);
  let stage = "rate-limit";
  const startedAt = performance.now();
  const durations: Record<string, number> = {};
  const timed = async <T,>(name: string, operation: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try { return await operation(); }
    catch (error) { stage = name; throw error; }
    finally { durations[name] = Math.round(performance.now() - start); }
  };
  const responseHeaders = () => ({
    ...corsHeaders,
    'Server-Timing': [...Object.entries(durations).map(([name, duration]) => `${name};dur=${duration}`), `total;dur=${Math.round(performance.now() - startedAt)}`].join(', '),
  });

  try {
    await timed('rate-limit', () => persistentLimit('login-ip:' + clientIp, RATE_LIMIT_CONFIG.loginIp.maxRequests, RATE_LIMIT_CONFIG.loginIp.windowMs));
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
          message: parsed.error.flatten().fieldErrors.acceptedPolicies?.[0] || "Validation failed.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { password, instituteCode: requestedInstituteCode } = parsed.data;
    const identifier = (parsed.data.identifier ?? parsed.data.email!).trim();

    // 3. User lookup
    stage = "account-lookup";
    const matches = await timed('account-lookup', () => db.user.findMany({
      where: identifier.includes('@') ? { email: { equals: identifier.toLowerCase(), mode: 'insensitive' } } : { studentNumber: identifier.toUpperCase(), role: { equals: 'STUDENT', mode: 'insensitive' } },
      include: {
        institute: true,
      },
      take: 2,
    }));
    // Legacy rosters may contain duplicate IDs until reconciliation is complete.
    const user = matches.length === 1 ? matches[0] : null;

    await timed('account-limit', () => persistentLimit('login-account:' + (user?.id ?? identifier.toLowerCase()), RATE_LIMIT_CONFIG.loginAccount.maxRequests, RATE_LIMIT_CONFIG.loginAccount.windowMs));
    if (user && user.activationStatus === undefined) {
      console.warn('LOGIN_DATABASE_CLIENT_SCHEMA_STALE');
      return NextResponse.json(
        { message: 'Sign-in is temporarily unavailable. The server must reload its updated database client.' },
        { status: 503, headers: corsHeaders }
      );
    }
    if (!user || !user.password || user.activationStatus !== 'ACTIVE') {
      return NextResponse.json(
        { message: "Invalid email, password, or institute." },
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. Verify password hash
    stage = "password-check";
    const passwordMatches = await timed('password-check', () => compare(password, user.password!));
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
      const userInstituteName = getInstituteName(userInstituteCode, user.institute?.name || userInstituteCode?.toUpperCase() || 'Institute');
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
    stage = "session-creation";
    // Enrollment only chooses the next screen; every protected request checks it
    // again. Its read can overlap session creation after credentials are verified.
    const [sessionResult, enrollmentResult] = await Promise.allSettled([
      timed('session-creation', () => createSession(user.id, {
        userAgent,
        ipAddress: clientIp,
      }, user.password!, { role: user.role, instituteId: user.instituteId, credentialProvisioningState: user.credentialProvisioningState })),
      timed('enrollment-check', () => needsClassEnrollment(user)),
    ]);
    // Drain both operations before responding, including failures, so session
    // creation cannot finish and try to write a cookie after the response closes.
    if (sessionResult.status === 'rejected') { stage = 'session-creation'; throw sessionResult.reason; }
    if (enrollmentResult.status === 'rejected') { stage = 'enrollment-check'; throw enrollmentResult.reason; }
    const { token, expiresAt } = sessionResult.value;
    const requiresEnrollment = enrollmentResult.value;
    // 8. Daily login rewards (for enrolled students)
    let loginRewardResult: { rewarded: boolean; streak: number } | null = null;
    try {
      // Web renders daily EXP and its receipt in the dashboard, which processes
      // any due reward before display. API/mobile callers keep an immediate receipt.
      if (user.role === "STUDENT" && !requiresEnrollment && request.headers.get('x-lms-login-rewards') !== 'dashboard') {
        loginRewardResult = await timed('login-reward', () => processLoginReward(user.id));
      }
    } catch (rewardErr) {
      console.error("LOGIN_REWARD_ERROR", rewardErr);
    }

    // 8b. ITE Participation: log LOGIN activity event (silent no-op for non-ITE)
    after(async () => {
      try {
        await logActivity({
          userId: user.id,
          instituteId: user.instituteId,
          type: "LOGIN",
        });
      } catch (err) {
        console.error("[activity-logger] login error:", err);
      }
    });

    const instituteCode = isSuperUser ? 'ics' : user.institute?.code || targetInstituteCode;
    const instituteName = getInstituteName(instituteCode, initialSuperInstitute?.name || user.institute?.name || `${instituteCode.toUpperCase()} Institute`);

    // 9. Return opaque token (NOT internal session.id)
    return NextResponse.json(
      {
        mobileCapabilities,
        message: "Login successful.",
        token, // Opaque client-facing bearer token
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          instituteId: user.instituteId,
          name: user.name,
          email: user.email,
          role: user.role,
          requiresEnrollment,
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
      { status: 200, headers: responseHeaders() }
    );
  } catch (error: unknown) {
    if (error instanceof AccessError) return NextResponse.json({ message: error.message }, { status: error.status, headers: corsHeaders });
    if (error instanceof SessionAdmissionError) return NextResponse.json({ message: error.message }, {
      status: error.status,
      headers: { ...responseHeaders(), ...(error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : {}) },
    });
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : error instanceof Error ? error.name : "UNKNOWN";
    console.error('LOGIN_OPERATION_UNAVAILABLE', { stage, code: /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : "UNKNOWN" });

    return NextResponse.json(
      {
        message: "Something went wrong during login.",
      },
      { status: 500, headers: responseHeaders() }
    );
  }
}
