import { academicActor, academicError } from '@/lib/academic-structure/policy';
import { readChart, changeChart } from '@/lib/academic-structure/programs';
type C = {
    params: Promise<{
        programId: string;
    }>;
};
export async function GET(r: Request, c: C) {
    try {
        return Response.json(await readChart(await academicActor(r), (await c.params).programId), { headers: { 'Cache-Control': 'private, no-store' } });
    }
    catch (e) {
        return academicError(e);
    }
}
export async function PATCH(r: Request, c: C) {
    try {
        return Response.json(await changeChart(await academicActor(r), (await c.params).programId, await r.json()));
    }
    catch (e) {
        return academicError(e);
    }
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
