import { handleLabRequest } from '@/lib/labs/http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
type Context = { params: Promise<{ courseId: string; path?: string[] }> };
async function handle(request: Request, context: Context) { return handleLabRequest(request, await context.params); }
export { handle as GET, handle as POST, handle as PATCH };
