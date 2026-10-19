import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const envKey = process.env.DATABASE_URL
    ? "DATABASE_URL"
    : process.env.POSTGRES_PRISMA_URL
    ? "POSTGRES_PRISMA_URL"
    : process.env.POSTGRES_URL
    ? "POSTGRES_URL"
    : null;

  const rawUrl = envKey ? process.env[envKey] : null;

  let host = "unknown";
  let isLocal = false;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl.replace(/^postgresql:\/\//, "http://"));
      host = parsed.host;
      isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    } catch {
      host = "unparseable";
    }
  }

  if (!envKey) {
    return NextResponse.json(
      {
        status: "error",
        error: "Missing database environment variable.",
        details:
          "Neither DATABASE_URL, POSTGRES_PRISMA_URL, nor POSTGRES_URL is configured in your environment variables.",
        hints: [
          "Go to your Vercel Project Settings > Environment Variables.",
          "Add DATABASE_URL with your cloud PostgreSQL connection string (Supabase, Neon, etc.).",
          "Ensure you Redeploy your project after setting environment variables.",
        ],
      },
      { status: 503 }
    );
  }

  try {
    // 1. Test basic connectivity
    await db.$queryRawUnsafe("SELECT 1 as connected");

    // 2. Test table presence & seed status
    const instituteCount = await db.institute.count().catch(() => null);
    const userCount = await db.user.count().catch(() => null);

    const tablesExist = instituteCount !== null && userCount !== null;
    const isSeeded = (instituteCount ?? 0) >= 3;

    return NextResponse.json(
      {
        status: "ok",
        database: {
          connected: true,
          envVariable: envKey,
          host,
          mode: isLocal ? "localhost" : "remote (SSL enabled)",
          tablesReady: tablesExist,
          institutesCount: instituteCount ?? 0,
          usersCount: userCount ?? 0,
          seeded: isSeeded,
        },
        warnings: !isSeeded
          ? [
              "Database tables exist but initial seed data (institutes/default users) is missing.",
              "Run 'pnpm prisma:seed' or run 'npx tsx prisma/seed.ts' pointing to your database URL to create default institutes and accounts.",
            ]
          : [],
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const errMsg = err?.message || String(error);

    const hints: string[] = [];

    if (errMsg.includes("does not exist") || errMsg.includes("P2021")) {
      hints.push(
        "Database is reachable, but Prisma tables have not been created yet.",
        "Run 'npx prisma db push' from your local machine pointing to your remote DATABASE_URL, or include a migration step in your build."
      );
    } else if (errMsg.includes("ENOTFOUND") || errMsg.includes("ETIMEDOUT") || errMsg.includes("ECONNREFUSED")) {
      hints.push(
        "Connection timed out or failed to reach database host.",
        "If using Supabase on free tier, do NOT use direct port 5432 (IPv6-only). Use the Supabase Transaction Pooler on port 6543 (e.g. aws-0-[region].pooler.supabase.com:6543).",
        "Verify that your database allows incoming connections from Vercel (IP allowlist 0.0.0.0/0 on cloud providers)."
      );
    } else if (errMsg.includes("certificate") || errMsg.includes("SSL")) {
      hints.push(
        "SSL/TLS handshake error.",
        "Ensure sslmode=require is in your connection string and rejectUnauthorized: false is set in pg pool config."
      );
    } else if (errMsg.includes("password authentication failed")) {
      hints.push(
        "Invalid username or password.",
        "Check your DATABASE_URL credentials. If your password contains special characters (like #, @, %, &), they must be URL-encoded."
      );
    }

    return NextResponse.json(
      {
        status: "error",
        error: "Failed to connect to database.",
        message: errMsg,
        host,
        envVariable: envKey,
        hints,
      },
      { status: 503 }
    );
  }
}
