import { db } from "@/lib/db";

export async function GET() {
  const institutes = await db.institute.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(institutes);
}