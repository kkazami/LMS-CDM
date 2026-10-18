import { facultyAdministrator, facultyDirectory } from '@/lib/academic-structure/faculty';
import { academicError } from '@/lib/academic-structure/policy';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try { return Response.json(await facultyDirectory(await facultyAdministrator(request)), { headers: { 'Cache-Control': 'private, no-store' } }); }
    catch (error) { return academicError(error); }
}
