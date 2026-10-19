import { academicActor, academicError } from '@/lib/academic-structure/policy';
import { readOversight } from '@/lib/academic-structure/programs';
export async function GET(r: Request, c: {
    params: Promise<{
        programId: string;
        courseId: string;
    }>;
}) {
    try {
        const p = await c.params;
        return Response.json(await readOversight(await academicActor(r), p.programId, p.courseId), { headers: { 'Cache-Control': 'private, no-store' } });
    }
    catch (e) {
        return academicError(e);
    }
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
