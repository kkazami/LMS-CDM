import assert from 'node:assert/strict';
import { Client } from 'pg';
import { performance } from 'node:perf_hooks';
import { asAccount } from './administrator-checks.mjs';

// Counts actual driver calls, never SQL text or credentials. Owned fixture only.
export async function performanceChecks({ cluster, db, accounts, check, report }) {
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1');
  assert.match(cluster.database, /^harness_/);
  const { getSession } = await import('../../apps/web/src/lib/auth-session.ts');
  const notifications = await import('../../apps/web/src/app/api/notifications/route.ts');
  const badges = await import('../../apps/web/src/app/api/gamification/new-badges/route.ts');
  const posts = await import('../../apps/web/src/app/api/knowledge-exchange/posts/route.ts');
  await db.kxPost.create({ data: { id: 'perf-post', title: 'Synthetic performance fixture', body: 'Fixture', authorId: 'faculty', instituteId: 'ics' } });
  await db.kxPost.create({ data: { id: 'perf-foreign', title: 'Foreign fixture', body: 'Must stay private', authorId: 'foreign', instituteId: 'ibe' } });
  const request = (url) => new Request('http://localhost' + url);
  let calls = 0;
  const original = Client.prototype.query;
  Client.prototype.query = function (...args) { calls++; return original.apply(this, args); };
  report.performance = { database: 'owned loopback fixture', samples: 7, measurements: [] };
  try {
    const measure = async (name, account, work) => {
      const samples = [];
      await asAccount(account, work); // Warm imports, pool, and database plans.
      for (let i = 0; i < 7; i++) {
        calls = 0;
        const start = performance.now();
        await asAccount(account, work);
        samples.push({ ms: performance.now() - start, queries: calls });
      }
      assert.ok(samples.every(s => s.queries > 0), 'Driver instrumentation must observe queries');
      const median = [...samples].sort((a, b) => a.ms - b.ms)[3];
      const result = { name, medianMs: +median.ms.toFixed(2), queries: median.queries };
      const budgets = { 'student session': 1, 'administrator session': 2, notifications: 4, 'new badges': 3, 'Knowledge Exchange feed': 4 };
      assert.ok(result.queries <= budgets[name], `${name} exceeded its database round-trip budget`);
      report.performance.measurements.push(result);
      console.log('MEASURE ' + JSON.stringify(result));
    };
    await check('shared session and representative API performance preserves scoped results', async () => {
      await measure('student session', accounts.student, async () => assert.equal((await getSession()).user.id, 'student'));
      await measure('administrator session', accounts.admin, async () => assert.equal((await getSession()).user.id, 'admin'));
      await measure('notifications', accounts.student, async () => {
        const res = await notifications.GET(request('/api/notifications?limit=20'));
        assert.equal(res.status, 200); assert.ok(Array.isArray((await res.json()).notifications));
      });
      await measure('new badges', accounts.student, async () => {
        const res = await badges.GET(request('/api/gamification/new-badges'));
        assert.equal(res.status, 200); assert.ok(Array.isArray(await res.json()));
      });
      await measure('Knowledge Exchange feed', accounts.student, async () => {
        const res = await posts.GET(request('/api/knowledge-exchange/posts'));
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.deepEqual(data.posts.map(p => p.id), ['perf-post']);
      });
    });
  } finally {
    Client.prototype.query = original;
    await db.kxPost.deleteMany({ where: { id: { in: ['perf-post', 'perf-foreign'] } } });
  }
  await check('session optimization keeps subsequent revocation and identity checks live', async () => {
    const originalSession = await db.session.findUniqueOrThrow({ where: { id: 'session-student' } });
    for (const mutation of [
      'DELETE FROM public."Session" WHERE id=\'session-student\'',
      'UPDATE public."Session" SET "expiresAt"=CURRENT_TIMESTAMP-interval \'1 minute\' WHERE id=\'session-student\'',
      'UPDATE public."User" SET "isActive"=false WHERE id=\'student\'',
      'UPDATE public."User" SET role=\'PROFESSOR\' WHERE id=\'student\'',
      'UPDATE public."User" SET "instituteId"=\'ibe\' WHERE id=\'student\'',
      'UPDATE public."Session" SET "tokenHash"=repeat(\'0\',64) WHERE id=\'session-student\'',
    ]) {
      try {
        await asAccount(accounts.student, async () => {
          const bearer = new Request('http://localhost/fixture', { headers: { authorization: 'Bearer ' + accounts.head.token } });
          const first = await Promise.all([getSession(bearer), getSession(bearer)]);
          assert.ok(first.every(session => session.user.id === 'student'), 'Cookie wins for concurrent callers');
          await cluster.owner.query(mutation);
          assert.equal(await getSession(bearer), null, 'Must not reuse authorization or switch to the Bearer account');
        });
      } finally {
        await cluster.owner.query('UPDATE public."User" SET "isActive"=true,role=\'STUDENT\',"instituteId"=\'ics\' WHERE id=\'student\'');
        await cluster.owner.query('INSERT INTO public."Session" (id,"tokenHash","userId","expiresAt") VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET "tokenHash"=EXCLUDED."tokenHash","expiresAt"=EXCLUDED."expiresAt"', [originalSession.id, originalSession.tokenHash, originalSession.userId, originalSession.expiresAt]);
      }
    }
    await asAccount({ token: 'invalid_cookie_token_123' }, async () => {
      const bearer = new Request('http://localhost/fixture', { headers: { authorization: 'Bearer ' + accounts.student.token } });
      assert.equal((await getSession(bearer)).user.id, 'student', 'Invalid Cookie still permits valid Bearer fallback');
    });
    await asAccount(accounts.admin, async () => {
      assert.equal((await getSession()).user.id, 'admin');
      try {
        await cluster.owner.query("UPDATE super_user_security.writer_bindings SET enabled=false WHERE principal='bqual_test_app'");
        assert.equal(await getSession(), null, 'Database qualification must remain live');
      } finally {
        await cluster.owner.query("UPDATE super_user_security.writer_bindings SET enabled=true WHERE principal='bqual_test_app'");
      }
    });
  });
  await check('badge reads and acknowledgements affect only the authenticated account', async () => {
    const profiles = [];
    try {
      for (const id of ['student', 'faculty']) {
        const profile = await db.gamificationProfile.create({ data: { studentId: id, badges: { create: { id: 'perf-badge-' + id, badgeRuleId: 'fixture' } } } });
        profiles.push(profile.id);
      }
      await asAccount(accounts.student, async () => {
        const data = await (await badges.GET(request('/api/gamification/new-badges'))).json();
        assert.deepEqual(data.map(b => b.id), ['perf-badge-student']);
        const res = await badges.POST(new Request('http://localhost/api/gamification/new-badges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ badgeIds: ['perf-badge-student', 'perf-badge-faculty'] }) }));
        assert.equal(res.status, 200);
        assert.equal((await db.studentBadge.findUniqueOrThrow({ where: { id: 'perf-badge-student' } })).isNew, false);
        assert.equal((await db.studentBadge.findUniqueOrThrow({ where: { id: 'perf-badge-faculty' } })).isNew, true);
      });
    } finally {
      await db.gamificationProfile.deleteMany({ where: { id: { in: profiles } } });
    }
  });
}

export async function performanceBrowserChecks({ pageFor, base, db, check }) {
  await check('student dashboard retains enrolled classes and excludes completed deadlines', async () => {
    const enrollment = await db.enrollment.create({ data: { courseId: 'program-class', studentId: 'student', status: 'APPROVED' } });
    const ids = ['perf-due', 'perf-done', 'perf-draft', 'perf-foreign-due'];
    let page;
    try {
      for (const id of ids) await db.syllabusItem.create({ data: { id, title: id, courseId: id === 'perf-foreign-due' ? 'foreign-course' : 'program-class', type: 'ASSIGNMENT', dueDate: new Date(Date.now() + 86400000) } });
      for (const [id, status] of [['perf-done', 'GRADED'], ['perf-draft', 'DRAFT']]) await db.studentSubmission.create({ data: { syllabusItemId: id, studentId: 'student', status } });
      page = await pageFor('student');
      await page.addInitScript(() => sessionStorage.setItem('gamification_daily_reward_dismissed_student', '1'));
      assert.equal((await page.goto(base + '/ics/students')).status(), 200);
      const due = page.locator('div.space-y-4').filter({ has: page.getByRole('heading', { name: 'Due Soon', exact: true }) }).last();
      await due.getByText('perf-due', { exact: true }).waitFor();
      await due.getByText('perf-draft', { exact: true }).waitFor();
      assert.equal(await due.getByText('perf-done', { exact: true }).count(), 0);
      assert.equal(await page.getByText('perf-foreign-due', { exact: true }).count(), 0);
    } finally {
      await page?.context().close();
      await db.syllabusItem.deleteMany({ where: { id: { in: ids } } });
      await db.enrollment.delete({ where: { id: enrollment.id } });
    }
  });
  await check('background requests pause while hidden, resume on return and never overlap', async () => {
    const page = await pageFor('faculty');
    let requests = 0, badgeRequests = 0, held = false, release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      await page.clock.install();
      await page.addInitScript(() => {
        window.__testVisibility = 'visible';
        Object.defineProperty(document, 'visibilityState', { get: () => window.__testVisibility });
      });
      page.on('request', req => { if (req.url().includes('/api/gamification/new-badges')) badgeRequests++; });
      await page.route('**/api/notifications?*', async route => {
        requests++;
        if (held) await gate;
        await route.fulfill({ json: { notifications: [], unreadCount: 0 } });
      });
      const firstResponse = page.waitForResponse('**/api/notifications?*');
      await page.goto(base + '/ics/teachers');
      await page.waitForFunction(() => document.querySelector('[aria-label="Notifications"]'));
      await firstResponse;
      const initial = requests;
      await page.evaluate(() => { window.__testVisibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(61000);
      assert.equal(requests, initial, 'Hidden tabs must not poll');
      held = true;
      const incoming = page.waitForRequest('**/api/notifications?*');
      await page.evaluate(() => { window.__testVisibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
      await incoming;
      await page.getByRole('button', { name: 'Notifications', exact: true }).click();
      await page.clock.runFor(61000);
      assert.equal(requests, initial + 1, 'Timer and panel clicks must share the pending request');
      const response = page.waitForResponse('**/api/notifications?*');
      release(); await response;
      assert.equal(badgeRequests, 0, 'Instructor shell must not fetch student badges');
    } finally {
      release(); await page.context().close();
    }
  });
}
