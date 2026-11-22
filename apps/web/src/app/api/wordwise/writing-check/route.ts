import { NextResponse } from "next/server";
import {
  requireWordWiseStudent,
  sameOriginViolation,
} from "@/lib/wordwise/access";
import { analyzeAcademicWriting } from "@/lib/wordwise/writing-helper";

export async function POST(req: Request) {
  const originError = sameOriginViolation(req);
  if (originError) return originError;

  const auth = await requireWordWiseStudent(req);
  if (auth.errorResponse) return auth.errorResponse;

  let body: { text?: unknown };
  try {
    body = (await req.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawText = typeof body.text === "string" ? body.text : "";
  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "Please enter a sentence or paragraph to check." },
      { status: 400 }
    );
  }

  const result = analyzeAcademicWriting(rawText);
  return NextResponse.json(result);
}
