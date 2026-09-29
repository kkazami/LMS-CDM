import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/auth-schema";
import {
  getClientIp,
  checkRateLimit,
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

  // 1. Rate limiting check (IP-based)
  const clientIp = getClientIp(request);
  const rateLimitResult = await checkRateLimit(`rl:reg:${clientIp}`, RATE_LIMIT_CONFIG.registerIp);
  if (!rateLimitResult.allowed) {
    const rateLimitResponse = createRateLimitResponse(rateLimitResult);
    for (const [k, v] of Object.entries(corsHeaders)) {
      rateLimitResponse.headers.set(k, v);
    }
    return rateLimitResponse;
  }

  try {
    const body = await request.json();

    // 2. Explicit server-side check: Public registration can NEVER create ADMIN accounts
    if (body?.role?.toUpperCase() === "ADMIN") {
      return NextResponse.json(
        {
          message: "Unauthorized role selection: Administrator accounts cannot be self-registered.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Schema validation
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { name, email, studentNumber, uniqueId, role, password, instituteCode } = parsed.data;

    // 4. Duplicate email verification
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409, headers: corsHeaders }
      );
    }

    // 5. Dynamic Institute validation (Strict: NO auto-creation)
    const institute = await db.institute.findUnique({
      where: { code: instituteCode.toLowerCase() },
    });

    if (!institute) {
      return NextResponse.json(
        {
          message: `Invalid institute code '${instituteCode}'. Registration must be with an existing registered institute.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 6. Secure Password Hashing (12 rounds)
    const hashedPassword = await hash(password, 12);
    // Explicitly restrict to allowed public roles: STUDENT or INSTRUCTOR (mapped to PROFESSOR)
    const userRole = role === "INSTRUCTOR" ? "PROFESSOR" : "STUDENT";

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        studentNumber: userRole === "STUDENT" ? studentNumber || null : null,
        uniqueId: uniqueId || "",
        password: hashedPassword,
        role: userRole,
        instituteId: institute.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institute: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong during registration." },
      { status: 500, headers: corsHeaders }
    );
  }
}