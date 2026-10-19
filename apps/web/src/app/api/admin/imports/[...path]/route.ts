import { z } from "zod";
import { rosterActor, rosterError, boundedJson } from "@/lib/roster/policy";
import { previewImport, getBatch, commitImport } from "@/lib/roster/imports";
import { importTypeSchema, template, csvFile, HEADERS } from "@/lib/roster/csv";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await rosterActor(request),
      { path } = await context.params;
    if (path[0] === "templates" && path.length === 2) {
      const type = importTypeSchema.parse(path[1].toUpperCase());
      return new Response(template(type), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="' + type.toLowerCase() + '-template.csv"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    const batch = await getBatch(actor, path[0]);
    if (path[1] === "report" && path.length === 2) {
      const headers = HEADERS[importTypeSchema.parse(batch.type)];
      const rows = batch.rows.map((row) => [
        ...headers.map(
          (h) =>
            ((row.originalValues ?? row.values) as Record<string, string>)[h],
        ),
        row.rowNumber,
        row.outcome ?? row.proposedAction,
        row.error ?? (row.issues as string[]).join(" "),
      ]);
      return new Response(
        csvFile([[...headers, "row", "status", "errors"], ...rows]),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="import-report.csv"',
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    if (path.length !== 1)
      return Response.json({ message: "Not found." }, { status: 404 });
    return Response.json(batch, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return rosterError(error instanceof z.ZodError ? new SyntaxError() : error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const actor = await rosterActor(request),
      { path } = await context.params;
    const body = await boundedJson(request);
    if (path[0] === "preview" && path.length === 1)
      return Response.json(await previewImport(actor, body));
    if (path[1] === "commit" && path.length === 2)
      return Response.json(await commitImport(actor, path[0], body));
    return Response.json({ message: "Not found." }, { status: 404 });
  } catch (error) {
    return rosterError(error);
  }
}
