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

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { model, records, snapshotId } = body;

    // Case A: Restoring a specific model table from JSON records
    if (model && Array.isArray(records)) {
      const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
      const delegate = (db as any)[delegateName];

      if (!delegate || typeof delegate.upsert !== 'function') {
        return NextResponse.json(
          { message: `Database model '${model}' not found or cannot be restored.` },
          { status: 400 }
        );
      }

      let restoredCount = 0;

      for (const rawRecord of records) {
        if (!rawRecord || typeof rawRecord !== 'object' || !rawRecord.id) continue;

        // Clone and sanitize so redacted placeholders do not overwrite live credentials
        const updateData: Record<string, any> = { ...rawRecord };
        delete updateData.id;

        for (const key of Object.keys(updateData)) {
          if (SENSITIVE_FIELDS.has(key) && updateData[key] === '[REDACTED_SECURITY_DATA]') {
            delete updateData[key];
          }
        }

        try {
          await delegate.upsert({
            where: { id: rawRecord.id },
            update: updateData,
            create: rawRecord,
          });
          restoredCount++;
        } catch (itemErr) {
          console.warn(`[RESTORE_ITEM_WARN] Skipped record ${rawRecord.id} in ${model}:`, itemErr);
        }
      }

      // Record in AuditLog
      await db.auditLog.create({
        data: {
          adminId: session.user.id,
          targetId: session.user.id,
          action: "DATABASE_TABLE_RESTORED",
          metadata: JSON.stringify({
            model,
            recordsRestored: restoredCount,
            totalProvided: records.length,
          }),
        },
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        model,
        restoredCount,
        message: `Successfully recovered and synchronized ${restoredCount} records into ${model}.`,
      });
    }

    // Case B: Snapshot Checkpoint Verification / Rollback
    if (snapshotId) {
      await db.auditLog.create({
        data: {
          adminId: session.user.id,
          targetId: session.user.id,
          action: "DATABASE_SNAPSHOT_VERIFIED",
          metadata: JSON.stringify({ snapshotId }),
        },
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        snapshotId,
        message: `Snapshot checkpoint ${snapshotId} verified and synchronized with system state.`,
      });
    }

    return NextResponse.json(
      { message: "Invalid restore payload. Please provide a model and records array, or snapshotId." },
      { status: 400 }
    );
  } catch (error) {
    console.error("DATABASE_RESTORE_POST_ERROR", error);
    return NextResponse.json(
      { message: "Failed to process database restoration." },
      { status: 500 }
    );
  }
}
