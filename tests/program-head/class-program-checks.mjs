import assert from 'node:assert/strict';
import path from 'node:path';
import { asAccount } from './administrator-checks.mjs';

export async function classProgramChecks({ db, cluster, accounts, check }) {
  const { instructorCreateCourse, instructorUpdateCourse, getClassPrograms } = await import('../../apps/web/src/app/(dashboard)/[institute]/courses/actions.ts');
  const form = (programId, id) => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ code: 'PROGRAM-FORM', title: 'Program form fixture', subject: 'Computing', instituteCode: 'ics', section: 'BSCS-1A', scheduleDays: '1', scheduleStart: '09:00', scheduleEnd: '10:00', scheduleStartDate: '2026-06-01', scheduleEndDate: '2026-12-30', ...(programId !== undefined ? { programId } : {}), ...(id ? { id } : {}) })) data.set(key, value);
    return data;
  };
  await check('pictured instructor create/edit forms persist optional programs and enforce ownership', async () => {
    const run = work => asAccount(accounts.faculty, work);
    const ids = (await run(() => getClassPrograms('ics'))).programs.map(p => p.id);
    assert.ok(ids.includes('bsit') && ids.includes('other') && !ids.includes('foreign-program'));
    await assert.rejects(() => run(() => getClassPrograms('ibe')), e => e.status === 403);
    await assert.rejects(() => asAccount(accounts.student, () => getClassPrograms('ics')), e => e.status === 403);
    assert.equal((await run(() => instructorCreateCourse({}, form('foreign-program')))).message, 'Choose an active program in this institute.');
    assert.equal(await db.course.count({ where: { code: 'PROGRAM-FORM' } }), 0);
    assert.equal((await run(() => instructorCreateCourse({}, form('bsit')))).message, 'success');
    const course = await db.course.findFirstOrThrow({ where: { code: 'PROGRAM-FORM' } });
    try {
      assert.equal(course.programId, 'bsit');
      assert.equal(course.instructorId, 'faculty');
      await db.enrollment.create({ data: { courseId: course.id, studentId: 'student', status: 'APPROVED' } });
      const before = await db.course.findUnique({ where: { id: course.id }, include: { enrollments: true } });
      for (const programId of ['other', '', 'bsit']) {
        assert.equal((await run(() => instructorUpdateCourse({}, form(programId, course.id)))).message, 'success');
        const after = await db.course.findUnique({ where: { id: course.id }, include: { enrollments: true } });
        assert.deepEqual(after, { ...before, programId: programId || null, updatedAt: after.updatedAt });
      }
      assert.equal((await run(() => instructorUpdateCourse({}, form(undefined, course.id)))).message, 'success');
      assert.equal((await run(() => getClassPrograms('ics', course.id))).currentProgram.id, 'bsit');
      await assert.rejects(() => asAccount(accounts.head, () => getClassPrograms('ics', course.id)), e => e.status === 404);
      assert.equal((await asAccount(accounts.head, () => instructorUpdateCourse({}, form('other', course.id)))).message, 'Unauthorized to edit this course.');
      const app = await cluster.connect();
      try {
        for (const who of ['head', 'student']) await assert.rejects(() => app.query('SELECT super_user_security.set_course_program($1,$2,$3,$4)', [accounts[who].actor.sessionId, accounts[who].actor.tokenHash, course.id, 'other']), e => e.code === '42501');
        await assert.rejects(() => app.query('SELECT super_user_security.set_course_program($1,$2,$3,$4)', [accounts.faculty.actor.sessionId, accounts.faculty.actor.tokenHash, course.id, 'foreign-program']), e => e.code === 'P0002');
      } finally { await app.end(); }
    } finally { await db.course.delete({ where: { id: course.id } }); }
  });
  await check('Administrator create/edit course forms retain the chosen instructor and program', async () => {
    const { adminCreateCourse, adminUpdateCourse } = await import('../../apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts');
    const data = form('bsit');
    data.set('code', 'ADMIN-PROGRAM');
    data.set('instructorId', 'faculty');
    assert.equal((await asAccount(accounts.admin, () => adminCreateCourse({}, data))).message, 'success');
    const course = await db.course.findFirstOrThrow({ where: { code: 'ADMIN-PROGRAM' } });
    try {
      assert.equal(course.programId, 'bsit');
      assert.equal(course.instructorId, 'faculty');
      await db.enrollment.create({ data: { courseId: course.id, studentId: 'student', status: 'APPROVED' } });
      const before = await db.course.findUnique({ where: { id: course.id }, include: { enrollments: true } });
      data.set('id', course.id);
      data.set('programId', 'other');
      assert.equal((await asAccount(accounts.admin, () => adminUpdateCourse({}, data))).message, 'success');
      const after = await db.course.findUnique({ where: { id: course.id }, include: { enrollments: true } });
      assert.deepEqual(after, { ...before, programId: 'other', updatedAt: after.updatedAt });
    } finally { await db.course.delete({ where: { id: course.id } }); }
  });
}

export async function classProgramBrowserChecks({ pageFor, base, db, check, output }) {
  await check('pictured class modals create, reload and edit programs on desktop and phone', async () => {
    const page = await pageFor('faculty');
    await page.goto(base + '/ics/teachers');
    await page.getByText('Add Class', { exact: true }).first().click();
    const modal = page.locator('form').filter({ has: page.locator('select[name="programId"]') });
    await modal.getByLabel('Program', { exact: true }).selectOption('bsit');
    for (const [name, value] of Object.entries({ code: 'BROWSER-PROGRAM', subject: 'Computing', title: 'Browser program fixture', scheduleStart: '09:00', scheduleEnd: '10:00', scheduleStartDate: '2026-06-01', scheduleEndDate: '2026-12-30' })) await modal.locator(`[name="${name}"]`).fill(value);
    await modal.locator('[name="scheduleDays"][value="1"]').check();
    await page.screenshot({ path: path.join(output, 'create-class-program.png'), fullPage: true });
    await modal.getByRole('button', { name: 'Create Class', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    const course = await db.course.findFirstOrThrow({ where: { code: 'BROWSER-PROGRAM' } });
    try {
      assert.equal(course.programId, 'bsit');
      await page.reload();
      const card = page.locator('[draggable="true"]').filter({ hasText: 'Browser program fixture' });
      await card.getByRole('button', { name: 'Course options', exact: true }).click();
      await card.getByRole('button', { name: 'Edit', exact: true }).click();
      await modal.getByLabel('Program', { exact: true }).waitFor();
      assert.equal(await modal.getByLabel('Program', { exact: true }).inputValue(), 'bsit');
      await modal.getByLabel('Program', { exact: true }).selectOption('other');
      await page.screenshot({ path: path.join(output, 'edit-class-program.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await modal.getByLabel('Program', { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'edit-class-program-mobile.png'), fullPage: true });
      await modal.getByRole('button', { name: 'Save Changes', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      assert.equal((await db.course.findUnique({ where: { id: course.id } })).programId, 'other');
    } finally { await db.course.delete({ where: { id: course.id } }); await page.context().close(); }
  });
}
