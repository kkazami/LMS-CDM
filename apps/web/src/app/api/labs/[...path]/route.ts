import { handleLabRequest } from '@/lib/labs/http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) { return handleLabRequest(request, await context.params); }
export { handle as GET, handle as POST, handle as PATCH };
