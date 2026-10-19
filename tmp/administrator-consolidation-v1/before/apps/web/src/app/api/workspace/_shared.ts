import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";

export async function requireWorkspaceSession() {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ message: "Unauthorized." }, { status: 401 }),
    };
  }

  return { session, response: null };
}

export function getQueryId(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("id");
}