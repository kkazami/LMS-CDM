import { ZodError } from 'zod';
import { actorFor, studentOnly } from './access';
import { completePrimer, personalProgress, readAttempt, readRoster, revealHint, saveAttempt, startAttempt, submitAttempt, readSandbox, saveSandbox } from './service';
import { LEVELS, MODULES, PRIMER } from '../curriculum/catalog';
import { hintSchema, OhmwardError, readBody } from '../domain/schema';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { studentInspection, submittedInspection } from './inspection';
import { readCohortAnalytics } from './analytics';

export async function handleOhmward(request: Request, segments: string[]): Promise<Response> {
  const respond = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const actor = await actorFor(request), path = segments.join('/'), method = request.method;
    if (!['GET', 'POST', 'PATCH'].includes(method)) return respond({ error: 'Method not allowed.' }, 405);
    if (method !== 'GET') {
      studentOnly(actor);
      const bucket = path.endsWith('/submit') ? 'submit' : path.endsWith('/hints') ? 'hints' : method === 'PATCH' ? 'save' : 'start';
      await persistentLimit(`ohmward:${actor.id}:${bucket}`, bucket === 'save' ? 120 : bucket === 'hints' ? 30 : 20, 60000);
    }
    if (method === 'GET' && path === 'catalog') return respond({ modules: MODULES, levels: LEVELS, primer: PRIMER });
    if (method === 'GET' && path === 'progress') return respond(await personalProgress(actor));
    if (method === 'GET' && path === 'sandbox') return respond(await readSandbox(actor));
    if(method==='GET'&&segments.length===2&&segments[0]==='submitted-attempts')return respond(await submittedInspection(actor,segments[1]));
    if(method==='GET'&&segments.length===2&&segments[0]==='students'){
      const page=new URL(request.url).searchParams.get('page')??'1';if(!/^[1-9]\d{0,5}$/.test(page))throw new OhmwardError(400,'Invalid attempt page.');
      return respond(await studentInspection(actor,segments[1],Number(page)));
    }
    if (method === 'PATCH' && path === 'sandbox') return respond(await saveSandbox(actor,await readBody(request)));
    if (method === 'POST' && path === 'primer/complete') return respond(await completePrimer(actor));
    if (method === 'GET' && path === 'analytics') {
      const search = new URL(request.url).searchParams, rawPage = search.get('page') ?? '1';
      if (!/^[1-9]\d{0,5}$/.test(rawPage) || (search.get('search')?.length ?? 0) > 100) throw new OhmwardError(400, 'Invalid page or search.');
      const courseId=search.get('courseId')||undefined;
      const [roster,analytics]=await Promise.all([readRoster(actor,{courseId,search:search.get('search')||undefined,page:Number(rawPage)}),readCohortAnalytics(actor,{courseId,from:search.get('from')||undefined,to:search.get('to')||undefined})]);
      return respond({...roster,analytics});
    }
    if (method === 'POST' && segments.length === 3 && segments[0] === 'levels' && segments[2] === 'attempts') return respond(await startAttempt(actor, segments[1]));
    if (segments[0] === 'attempts' && segments[1] && segments.length <= 3) {
      const id = segments[1];
      if (segments.length === 2 && method === 'GET') return respond(await readAttempt(actor, id));
      if (segments.length === 2 && method === 'PATCH') return respond(await saveAttempt(actor, id, await readBody(request)));
      if (segments[2] === 'hints' && method === 'POST') return respond(await revealHint(actor, id, hintSchema.parse(await readBody(request)).index));
      if (segments[2] === 'submit' && method === 'POST') return respond(await submitAttempt(actor, id, await readBody(request)));
    }
    return respond({ error: 'Endpoint not found.' }, 404);
  } catch (error) {
    if (error instanceof ZodError) return respond({ error: 'Check the workspace fields and try again.', fields: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }, 400);
    if (error instanceof OhmwardError) return respond({ error: error.message }, error.status);
    if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && 'message' in error && error.status >= 400 && error.status < 500) return respond({ error: String(error.message) }, error.status);
    return respond({ error: 'Ohmward could not save this change. Keep your work open and try again.' }, 503);
  }
}
