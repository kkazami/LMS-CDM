import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../api-auth";
import { isMockInterviewEligible, MOCK_INTERVIEW_INSTITUTE_CODE } from "./eligibility";

export { isMockInterviewEligible, MOCK_INTERVIEW_INSTITUTE_CODE };

export type MockInterviewStudentAccess =
  | { ok: true; userId: string; instituteId: string; name: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireMockInterviewStudent(request?: Request): Promise<MockInterviewStudentAccess> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized: Please sign in." };
  }
  const user = session.user;
  if (!isMockInterviewEligible(user)) {
    return {
      ok: false,
      status: 403,
      message: "The Mock Interview Feature is available to authenticated IBE students only.",
    };
  }
  return {
    ok: true,
    userId: user.id,
    instituteId: user.instituteId,
    name: user.name || "Student",
  };
}

/** Same-origin guard for state-changing requests (defense in depth). */
export function sameOriginViolation(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
    // Allow localhost / 127.0.0.1 in development environments
    if (
      (originHost.includes("localhost") || originHost.includes("127.0.0.1")) &&
      (host?.includes("localhost") || host?.includes("127.0.0.1"))
    ) {
      return null;
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({ message: "Cross-origin request blocked." }, { status: 403 });
}

export function denied(access: Extract<MockInterviewStudentAccess, { ok: false }>): NextResponse {
  return NextResponse.json({ message: access.message }, { status: access.status });
}
