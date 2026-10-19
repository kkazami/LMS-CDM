import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
export const dynamic = "force-dynamic";
export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}
export async function POST(request: Request) {
  return NextResponse.json({
    code: "REGISTRATION_DISABLED",
    message: "CdM LMS accounts are created by authorized school personnel after enrollment verification. Please contact or visit the Office of the Registrar to request access.",
  }, { status: 403, headers: getCorsHeaders(request) });
}
