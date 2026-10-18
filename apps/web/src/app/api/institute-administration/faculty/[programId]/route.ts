import { facultyAdministrator, setFaculty } from '@/lib/academic-structure/faculty';
import { academicError } from '@/lib/academic-structure/policy';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ programId: string }> };
async function apply(request: Request, context: Context, creating: boolean) {
    try { const actor = await facultyAdministrator(request), { programId } = await context.params;
        return Response.json(await setFaculty(actor, programId, await request.json(), creating), { status: creating ? 201 : 200, headers: { 'Cache-Control': 'private, no-store' } }); }
    catch (error) { return academicError(error); }
}
export const POST = (request: Request, context: Context) => apply(request, context, true);
export const PATCH = (request: Request, context: Context) => apply(request, context, false);
