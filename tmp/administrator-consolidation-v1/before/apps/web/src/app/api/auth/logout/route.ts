import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth-session";
import { getSessionFromRequest } from '@/lib/api-auth';
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    await getSessionFromRequest(request); // Pin Cookie precedence / initial Bearer fallback.
    await deleteSession();

    return NextResponse.json(
      { message: "Logout successful." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('LOGOUT_OPERATION_UNAVAILABLE');
    return NextResponse.json(
      { message: "Something went wrong during logout." },
      { status: 500, headers: corsHeaders }
    );
  }
}
