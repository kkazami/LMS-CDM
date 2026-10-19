import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';

// Called only by the disposable PostgreSQL integration runner.
export async function liveSuperUserDataChecks({ cluster, db, accounts, check }) {
  const listApi = await import('../../apps/web/src/app/api/academic-oversight/[institute]/courses/route.ts');
  const detailApi = await import('../../apps/web/src/app/api/academic-oversight/[institute]/courses/[courseId]/route.ts');
  const token = randomBytes(32).toString('hex');
  const session = await db.session.create({ data: {
    userId: accounts.super.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000),
  } });
  const request = (selectedToken = token, suffix = '') => new Request(`http://localhost/api/academic-oversight/ics/courses${suffix}`, { headers: selectedToken ? { Authorization: `Bearer ${selectedToken}` } : {} });
  const context = (institute = 'ics', courseId) => ({ params: Promise.resolve({ institute, ...(courseId ? { courseId } : {}) }) });
  const assertSafe = value => {
    if (Array.isArray(value)) return value.forEach(assertSafe);
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /student|enrollment|grade|submission|password|token|session|permission|answer/i);
      assertSafe(child);
    }
    assert.ok(!JSON.stringify(value).includes('SECRET-'));
  };

  try {
    await check('Super User course endpoints read current database records without an approval snapshot', async () => {
      const response = await listApi.GET(request(), context());
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const result = await response.json();
      assert.deepEqual(result.courses.map(course => course.id), ['program-class', 'unrelated-class']);
      assert.equal(new Set(result.courses.map(course => course.instructor?.id).filter(Boolean)).size, 1);
      assertSafe(result);
      const original = (await cluster.owner.query('SELECT title,section FROM public."Course" WHERE id=\'program-class\'')).rows[0];
      try {
        await cluster.owner.query('UPDATE public."Course" SET title=$1,section=$2 WHERE id=\'program-class\'', ['Updated course from database', 'BSIT 3B']);
        const next = await listApi.GET(request(), context());
        assert.equal(next.status, 200);
        const updated = (await next.json()).courses.find(course => course.id === 'program-class');
        assert.equal(updated.title, 'Updated course from database');
        assert.equal(updated.section, 'BSIT 3B');
        const detail = await detailApi.GET(request(), context('ics', 'program-class'));
        assert.equal(detail.status, 200);
        const body = await detail.json();
        assert.equal(body.course.title, updated.title);
        assert.equal(body.course.announcements.length, 1);
        assert.equal(body.course.announcements[0].content, '');
        assertSafe(body);
      } finally {
        await cluster.owner.query('UPDATE public."Course" SET title=$1,section=$2 WHERE id=\'program-class\'', [original.title, original.section]);
      }
    });

    await check('live course reads retain institute isolation, archive filtering and role restrictions', async () => {
      const foreign = await listApi.GET(request(), context('ibe'));
      assert.equal(foreign.status, 200);
      assert.deepEqual((await foreign.json()).courses.map(course => course.id), ['foreign-course']);
      assert.equal((await detailApi.GET(request(), context('ics', 'foreign-course'))).status, 404);
      assert.equal((await listApi.GET(request(null), context())).status, 401);
      for (const id of ['admin', 'head', 'student']) assert.equal((await listApi.GET(request(accounts[id].token), context())).status, 403, id);
      const manipulated = await listApi.GET(request(token, '?institute=ibe'), context());
      assert.equal(manipulated.status, 200);
      assert.ok(!(await manipulated.json()).courses.some(course => course.id === 'foreign-course'));
      await cluster.owner.query('UPDATE public."Course" SET "isArchived"=true WHERE id=\'unrelated-class\'');
      try {
        const result = await listApi.GET(request(), context());
        assert.equal(result.status, 200);
        assert.equal((await result.json()).courses.length, 1);
        assert.equal((await detailApi.GET(request(), context('ics', 'unrelated-class'))).status, 404);
      } finally { await cluster.owner.query('UPDATE public."Course" SET "isArchived"=false WHERE id=\'unrelated-class\''); }
    });

    await check('live course metadata is withheld on audit failure and revoked sessions', async () => {
      const before = await db.auditLog.count({ where: { adminId: accounts.super.id, action: 'ACADEMIC_OVERSIGHT_COURSE_LIST' } });
      assert.ok(before > 0);
      await cluster.owner.query('REVOKE INSERT ON public."AuditLog" FROM bqual_test_app');
      try {
        const denied = await listApi.GET(request(), context());
        assert.equal(denied.status, 503);
        assert.equal((await denied.json()).courses, undefined);
      } finally { await cluster.owner.query('GRANT INSERT ON public."AuditLog" TO bqual_test_app'); }
      await db.session.delete({ where: { id: session.id } });
      assert.equal((await listApi.GET(request(), context())).status, 401);
    });
  } finally { await db.session.deleteMany({ where: { id: session.id } }); }
}
