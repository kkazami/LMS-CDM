import { finalizeExpired } from './lifecycle';
import { Prisma } from '@prisma/client';
import { transaction } from './read';

export async function retentionHealth(now = new Date()) {
  const job = await transaction(tx => tx.attendanceJob.findUnique({ where: { id: 'retention' } }));
  return { healthy: !!job?.lastSuccessAt && now.getTime() - job.lastSuccessAt.getTime() < 30 * 3600000 && job.backlog === 0, lastSuccessAt: job?.lastSuccessAt?.toISOString() ?? null, backlog: job?.backlog ?? 0 };
}
export async function purgeAttendance(now = new Date()) {
  const lease = await transaction(async tx => {
    await tx.attendanceJob.upsert({ where: { id: 'retention' }, create: { id: 'retention' }, update: {} });
    return tx.attendanceJob.updateMany({ where: { id: 'retention', OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil: new Date(now.getTime() + 120000), lastStartedAt: now } });
  });
  if (!lease.count) return { leased: false, deleted: 0 };
  const started = Date.now(); let deleted = 0;
  const noHold = { record: { session: { legalHold: false } } };
  try {
    for (;;) {
      const count = await transaction(async tx => {
        const expired = await tx.attendanceSession.findMany({ where: { state: 'OPEN', closesAt: { lte: now } }, select: { courseId: true }, distinct: ['courseId'], take: 20 });
        for (const item of expired) await finalizeExpired(tx, item.courseId, now);
        const details = await tx.attendanceVerificationDetail.findMany({ where: { expiresAt: { lte: now }, ...noHold }, select: { id: true, record: { select: { sessionId: true } } }, take: 500 });
        const requests = await tx.attendanceRequest.findMany({ where: { textExpiresAt: { lte: now }, ...noHold }, select: { id: true, record: { select: { sessionId: true } } }, take: 500 });
        const events = await tx.attendanceEvent.findMany({ where: { expiresAt: { lte: now }, OR: [{ sessionId: null }, { session: { legalHold: false } }] }, select: { id: true, sessionId: true }, take: 500 });
        const sessions = await tx.attendanceSession.findMany({ where: { expiresAt: { lte: now }, legalHold: false, state: { not: 'OPEN' } }, select: { id: true }, take: 100 });
        const arrangements = await tx.attendanceArrangement.findMany({ where: { expiresAt: { lte: now } }, select: { id: true }, take: 500 });
        const lockedIds = [...new Set([...details.map(v => v.record.sessionId), ...requests.map(v => v.record.sessionId), ...events.flatMap(v => v.sessionId ? [v.sessionId] : []), ...sessions.map(v => v.id)])].sort();
        if (lockedIds.length) await tx.$queryRaw`SELECT id FROM "AttendanceSession" WHERE id IN (${Prisma.join(lockedIds)}) ORDER BY id FOR UPDATE`;
        // Recheck holds after locking: a hold may have been committed during candidate selection.
        await tx.attendanceVerificationDetail.deleteMany({ where: { id: { in: details.map(v => v.id) }, ...noHold } });
        await tx.attendanceRequest.updateMany({ where: { id: { in: requests.map(v => v.id) }, ...noHold }, data: { reason: null, decisionReason: null, textExpiresAt: null } });
        await tx.attendanceEvent.deleteMany({ where: { id: { in: events.map(v => v.id) }, OR: [{ sessionId: null }, { session: { legalHold: false } }] } });
        await tx.attendanceSession.deleteMany({ where: { id: { in: sessions.map(v => v.id) }, legalHold: false } });
        await tx.attendanceArrangement.deleteMany({ where: { id: { in: arrangements.map(v => v.id) } } });
        return expired.length + details.length + requests.length + events.length + sessions.length + arrangements.length;
      });
      deleted += count;
      if (!count || Date.now() - started > 40000) break;
    }
    const [details, texts, events, sessions, arrangements] = await transaction(tx => Promise.all([
      tx.attendanceVerificationDetail.count({ where: { expiresAt: { lte: now }, ...noHold } }),
      tx.attendanceRequest.count({ where: { textExpiresAt: { lte: now }, ...noHold } }),
      tx.attendanceEvent.count({ where: { expiresAt: { lte: now }, OR: [{ sessionId: null }, { session: { legalHold: false } }] } }),
      tx.attendanceSession.count({ where: { expiresAt: { lte: now }, legalHold: false, state: { not: 'OPEN' } } }),
      tx.attendanceArrangement.count({ where: { expiresAt: { lte: now } } }),
    ]));
    const backlog = details + texts + events + sessions + arrangements;
    await transaction(tx => tx.attendanceJob.update({ where: { id: 'retention' }, data: { lastSuccessAt: new Date(), leaseUntil: null, deletedCount: deleted, backlog } }));
    return { leased: true, deleted, backlog };
  } catch {
    await transaction(tx => tx.attendanceJob.update({ where: { id: 'retention' }, data: { leaseUntil: null } }));
    throw new Error('Attendance cleanup failed; inspect sanitized database health diagnostics.');
  }
}
