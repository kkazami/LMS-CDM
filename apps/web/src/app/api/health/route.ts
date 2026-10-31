import { db } from '@/lib/db';
import { applicationWriterQualified } from '@/lib/super-user-v1/provisioning';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    if(process.env.OHMWARD_ENABLED==='true'){
      const [state]=await db.$queryRaw<Array<{ready:boolean}>>`SELECT COALESCE(bool_and(to_regclass(t.name) IS NOT NULL AND has_table_privilege(current_user,to_regclass(t.name),p.privilege)),false) AS ready FROM (VALUES ('public."OhmwardLearner"'),('public."OhmwardAttempt"'),('public."OhmwardProgress"')) t(name) CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE')) p(privilege)`;
      if(!state?.ready||!await applicationWriterQualified(db))throw Error('Feature database unavailable');
    }
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
