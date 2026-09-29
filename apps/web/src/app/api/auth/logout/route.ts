import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth-session";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // Extract Bearer token if provided by mobile/API client
    let bearerToken: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      bearerToken = authHeader.slice(7).trim();
    }

    await deleteSession(bearerToken);

    return NextResponse.json(
      { message: "Logout successful." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("LOGOUT_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong during logout." },
      { status: 500, headers: corsHeaders }
    );
  }
}
