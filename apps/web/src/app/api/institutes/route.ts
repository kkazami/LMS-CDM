import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const institutes = await db.institute.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(institutes);
}