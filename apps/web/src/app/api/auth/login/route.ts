import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth-schema";
import { createSession } from "@/lib/auth-session";

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

    const { email, password } = parsed.data;

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

    const session = await createSession(user.id);

    const instituteCode = user.institute?.code || "ics";
    const instituteName = user.institute?.name || "Institute of Computer Studies";

    return NextResponse.json(
      {
        message: "Login successful.",
        token: session.id,
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
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("LOGIN_ERROR:", error?.message || error, error?.stack);

    return NextResponse.json(
      {
        message: "Something went wrong during login.",
        detail: process.env.NODE_ENV !== "production" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}