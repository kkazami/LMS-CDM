import { academicActor, academicError } from '@/lib/academic-structure/policy';
import { availableProgramInstructors, addProgramInstructor } from '@/lib/academic-structure/program-instructors';

type Context = { params: Promise<{ programId: string }> };
export async function GET(request: Request, context: Context) {
    try {
        const actor = await academicActor(request);
        const { programId } = await context.params;
        return Response.json(await availableProgramInstructors(actor, programId, new URL(request.url).searchParams.get('q') ?? ''), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) { return academicError(error); }
}
export async function POST(request: Request, context: Context) {
    try {
        const actor = await academicActor(request);
        const { programId } = await context.params;
        return Response.json(await addProgramInstructor(actor, programId, await request.json()), { status: 201 });
    } catch (error) { return academicError(error); }
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
