import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    tableName: string;
  }>;
};

// Safe field sanitization for sensitive columns
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'otpCodeHash',
  'encryptedToken',
  'sessionToken',
]);

export async function GET(request: Request, props: RouteProps) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { tableName } = await props.params;

    // Convert PascalCase model name to camelCase delegate
    const delegateName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
    const delegate = (db as any)[delegateName];

    if (!delegate || typeof delegate.findMany !== 'function') {
      return NextResponse.json({ message: `Model '${tableName}' not found.` }, { status: 404 });
    }

    const [totalCount, rows] = await Promise.all([
      delegate.count().catch(() => 0),
      delegate.findMany({
        take: 25,
        orderBy: delegate.fields?.createdAt ? { createdAt: 'desc' } : undefined,
      }).catch(async () => {
        // Fallback without orderBy
        return delegate.findMany({ take: 25 });
      }),
    ]);

    // Sanitize rows
    const sanitizedRows = (rows || []).map((row: any) => {
      const sanitized = { ...row };
      for (const key of Object.keys(sanitized)) {
        if (SENSITIVE_FIELDS.has(key)) {
          sanitized[key] = '•••••••• (Encrypted)';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          try {
            sanitized[key] = JSON.stringify(sanitized[key]);
          } catch {
            sanitized[key] = '[Object]';
          }
        }
      }
      return sanitized;
    });

    // Detect column list
    const columns = sanitizedRows.length > 0 
      ? Object.keys(sanitizedRows[0])
      : ['id'];

    return NextResponse.json({
      model: tableName,
      totalCount,
      sampleCount: sanitizedRows.length,
      columns,
      rows: sanitizedRows,
    });
  } catch (error) {
    console.error("DATABASE_TABLE_INSPECT_ERROR", error);
    return NextResponse.json({ message: "Failed to inspect model." }, { status: 500 });
  }
}
