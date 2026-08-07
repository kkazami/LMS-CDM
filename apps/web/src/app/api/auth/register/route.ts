import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/auth-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, studentNumber, password, instituteCode } = parsed.data;

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 }
      );
    }

    let institute = await db.institute.findUnique({
      where: { code: instituteCode },
    });

    if (!institute) {
      institute = await db.institute.create({
        data: {
          code: instituteCode,
          name: `${instituteCode.toUpperCase()} Institute`,
        },
      });
    }

    const hashedPassword = await hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        studentNumber,
        password: hashedPassword,
        role: "STUDENT", // using uppercase "STUDENT" to match schema
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
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong during registration." },
      { status: 500 }
    );
  }
}