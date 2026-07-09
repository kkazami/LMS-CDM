import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { executeSkill } from "@/lib/skills";
import { exportGradebookSkill } from "@/lib/skills/gradebook-exporter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await executeSkill("gradebook-exporter", () =>
    exportGradebookSkill(courseId)
  );

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Export failed" },
      { status: 500 }
    );
  }

  const { csvContent, fileName } = result.data;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
