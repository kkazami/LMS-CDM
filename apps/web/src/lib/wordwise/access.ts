import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/api-auth";
import { resolveIbeStudentProgram } from "@/lib/ibe-programs/registration";
import { isWordWiseEligible } from "./eligibility";

export { isWordWiseEligible, type WordWiseAccessCandidate } from "./eligibility";

export interface AuthorizedWordWiseStudent {
  id: string;
  instituteId: string;
  name: string;
  instituteCode: "IBE";
  programCode: "BSBA HRM";
  programName: string;
}

/**
 * Enforces IBE student + BSBA HRM program authorization for WordWise API routes.
 */
export async function requireWordWiseStudent(
  request?: Request
): Promise<
  | { user: AuthorizedWordWiseStudent; errorResponse?: never }
  | { user?: never; errorResponse: NextResponse }
> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Please sign in." },
        { status: 401 }
      ),
    };
  }

  const { user } = session;
  const resolvedProgram = await resolveIbeStudentProgram(user.id);

  if (
    !isWordWiseEligible({
      role: user.role,
      instituteCode: user.institute?.code ?? null,
      programCode: resolvedProgram?.programCode ?? null,
    })
  ) {
    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Forbidden: IBE WordWise – Vocabulary & Academic Language Hub is available exclusively to IBE BSBA HRM students.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      id: user.id,
      instituteId: user.instituteId,
      name: user.name || "Student",
      instituteCode: "IBE",
      programCode: "BSBA HRM",
      programName:
        resolvedProgram?.programName ??
        "BS Business Administration Major in Human Resource Management",
    },
  };
}

/** Same-origin guard for state-changing requests (defense in depth). */
export function sameOriginViolation(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
    if (
      (originHost.includes("localhost") || originHost.includes("127.0.0.1")) &&
      (host?.includes("localhost") || host?.includes("127.0.0.1"))
    ) {
      return null;
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json(
    { error: "Cross-origin mutation rejected" },
    { status: 403 }
  );
}
