import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function isStatusError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { status?: unknown }).status === "number" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

/** Maps anything thrown inside a route handler to a JSON error response. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError || isStatusError(err)) {
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return NextResponse.json({ message: `${where}${first?.message ?? "Invalid request."}` }, { status: 400 });
  }
  console.error("[PRACTICUM_API_ERROR]", err);
  return NextResponse.json({ message: "Internal error." }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
