import type { Prisma } from '@prisma/client';

/** Marker alone is insufficient. Misbound/owner/unguarded APP connections deny admission. */
export async function applicationWriterQualified(tx: Prisma.TransactionClient): Promise<boolean> {
  try {
    const rows = await tx.$queryRaw<Array<{ qualified: boolean }>>`
      SELECT CASE WHEN NOT r.rolsuper AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid)
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_database d WHERE d.datname=current_database() AND d.datdba=r.oid)
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE p.proowner=r.oid AND n.nspname IN ('public','super_user_security'))
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relowner=r.oid AND n.nspname IN ('public','super_user_security'))
        THEN super_user_security.application_boundary_qualified() ELSE false END AS qualified
      FROM pg_catalog.pg_roles r WHERE r.rolname=session_user`;
    return rows.length === 1 && rows[0].qualified === true;
  } catch { return false; }
}
