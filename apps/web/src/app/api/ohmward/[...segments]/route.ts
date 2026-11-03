import { handleOhmward } from '@/features/interactive-activities/ohmward/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ segments: string[] }> };
async function route(request: Request, context: Context) { return handleOhmward(request, (await context.params).segments); }
export { route as GET, route as POST, route as PATCH, route as PUT, route as DELETE };
