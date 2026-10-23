import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'otpCodeHash',
  'encryptedToken',
  'sessionToken',
]);

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');

    if (!model) {
      return NextResponse.json({ message: 'Model query param is required.' }, { status: 400 });
    }

    const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (db as any)[delegateName];

    if (!delegate || typeof delegate.findMany !== 'function') {
      return NextResponse.json({ message: `Model '${model}' not found.` }, { status: 404 });
    }

    // Export up to 500 records
    const records = await delegate.findMany({ take: 500 });

    const sanitizedRecords = (records || []).map((row: any) => {
      const sanitized = { ...row };
      for (const key of Object.keys(sanitized)) {
        if (SENSITIVE_FIELDS.has(key)) {
          sanitized[key] = '[REDACTED_SECURITY_DATA]';
        }
      }
      return sanitized;
    });

    const filename = `${model.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(sanitizedRecords, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("DATABASE_EXPORT_ERROR", error);
    return NextResponse.json({ message: "Failed to export data." }, { status: 500 });
  }
}
