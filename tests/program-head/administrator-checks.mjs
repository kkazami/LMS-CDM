import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const requireWeb = createRequire(path.resolve('apps/web/package.json'));

export function asAccount(account, work) {
  const { workAsyncStorage } = requireWeb('next/dist/server/app-render/work-async-storage.external');
  const { workUnitAsyncStorage } = requireWeb('next/dist/server/app-render/work-unit-async-storage.external');
  const { RequestCookies } = requireWeb('next/dist/compiled/@edge-runtime/cookies');
  const headers = new Headers({ cookie: 'lumina_session=' + account.token });
  const cookies = new RequestCookies(headers);
  return workAsyncStorage.run({ page: '/fixture/page', route: '/fixture', isStaticGeneration: false, incrementalCache: {}, pendingRevalidatedTags: [], pendingRevalidates: {}, pendingRevalidateWrites: [], cacheLifeProfiles: {} }, () => workUnitAsyncStorage.run({ type: 'request', phase: 'action', url: { pathname: '/fixture', search: '' }, headers, cookies, mutableCookies: cookies, userspaceMutableCookies: cookies, draftMode: { isEnabled: false }, rootParams: {} }, work));
}

/** Called only after the parent starts an owned harness_* PostgreSQL database. */
export async function administratorChecks({ cluster, db, accounts, check }) {
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1');
  assert.match(cluster.database, /^harness_/);
  const { validateSessionToken } = await import('../../apps/web/src/lib/auth-session.ts');
  const capabilities = await import('../../apps/web/src/lib/super-user-v1/capabilities.ts');
  const faculty = await import('../../apps/web/src/lib/academic-structure/faculty.ts');
  const { requireLegacyActor, denyLegacyApi } = await import('../../apps/web/src/lib/super-user-v1/legacy-entry-guard.ts');
  const admin = accounts.admin.actor;
  const actor = { id: admin.id, sessionId: admin.sessionId, tokenHash: admin.tokenHash };
  const request = (url, body, method = 'POST') => new Request('http://localhost' + url, { method, headers: { Authorization: 'Bearer ' + accounts.admin.token, 'Content-Type': 'application/json' }, ...(!['GET','HEAD'].includes(method) ? { body: JSON.stringify(body ?? {}) } : {}) });
  await check('Administrator class program mapping preserves instructor, section and enrollments', async () => {
    const { adminSetCourseProgram } = await import('../../apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts');
    const form = (programId, id = 'program-class', instituteCode = 'ics') => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ id, instituteCode, programId })) data.set(key, value);
      return data;
    };
    const before = await db.course.findUnique({ where: { id: 'program-class' }, include: { enrollments: true } });
    for (const programId of ['other', '', 'bsit']) {
      const result = await asAccount(accounts.admin, () => adminSetCourseProgram({ message: '' }, form(programId)));
      assert.equal(result.message, 'Program saved.');
      const after = await db.course.findUnique({ where: { id: 'program-class' }, include: { enrollments: true } });
      assert.deepEqual(after, { ...before, programId: programId || null });
    }
    assert.equal((await asAccount(accounts.admin, () => adminSetCourseProgram({ message: '' }, form('foreign-program')))).message, 'Choose an active program in this institute.');
    await assert.rejects(() => asAccount(accounts.admin, () => adminSetCourseProgram({ message: '' }, form('bsit', 'foreign-course'))), e => e.status === 404);
    assert.equal((await asAccount(accounts.faculty, () => adminSetCourseProgram({ message: '' }, form('bsit')))).message, 'Administrator required.');
    const app = await cluster.connect();
    try {
      await assert.rejects(() => app.query('SELECT super_user_security.set_course_program($1,$2,$3,$4)', [accounts.head.actor.sessionId, accounts.head.actor.tokenHash, 'program-class', 'other']), e => e.code === '42501');
      await assert.rejects(() => app.query('UPDATE public."Course" SET "programId"=\'other\' WHERE id=\'program-class\''), e => e.code === '42501');
      await assert.rejects(() => app.query('SELECT super_user_security.set_course_program($1,$2,$3,$4)', [actor.sessionId, 'invalid', 'program-class', 'other']), e => e.code === '42501');
    } finally { await app.end(); }
    assert.equal(await db.auditLog.count({ where: { action: 'ADMIN_COURSE_PROGRAM_SET' } }), 3);
    await assert.rejects(() => asAccount({ token: 'invalid' }, () => adminSetCourseProgram({ message: '' }, form('other'))), e => e.status === 401);
    await cluster.owner.query(`CREATE FUNCTION public.reject_mapping_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ADMIN_COURSE_PROGRAM_SET' THEN RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_mapping_audit BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.reject_mapping_audit()`);
    try {
      assert.equal((await asAccount(accounts.admin, () => adminSetCourseProgram({ message: '' }, form('other')))).message, 'Could not save the program. Try again.');
      assert.deepEqual(await db.course.findUnique({ where: { id: 'program-class' }, include: { enrollments: true } }), before);
      assert.equal(await db.auditLog.count({ where: { action: 'ADMIN_COURSE_PROGRAM_SET' } }), 3);
    } finally { await cluster.owner.query('DROP TRIGGER reject_mapping_audit ON public."AuditLog"; DROP FUNCTION public.reject_mapping_audit()'); }
  });
  await check('single Administrator preserves existing login and rejects the retired role and public reset', async () => {
    assert.equal((await validateSessionToken(accounts.admin.token)).user.role, 'ADMIN');
    assert.equal(capabilities.canonicalRole('INSTITUTE_ADMIN'), 'UNKNOWN');
    assert.equal(capabilities.mayUsePublicReset({ role: 'ADMIN', isActive: true }), false);
    assert.equal(capabilities.mayAdmitAccount({ role: 'ADMIN', isActive: true, credentialProvisioningState: 'PENDING_HANDOFF' }), false);
    const row = (await cluster.owner.query('SELECT role,password,"isActive","credentialProvisioningState" FROM public."User" WHERE id=\'admin\'')).rows[0];
    assert.deepEqual(row, { role: 'ADMIN', password: accounts.admin.passwordHash, isActive: true, credentialProvisioningState: null });
  });
  await check('database prevents Administrator promotion, credential forgery and institute transfer', async () => {
    const app = await cluster.connect();
    for (const sql of [
      'UPDATE public."User" SET role=\'ADMIN\' WHERE id=\'faculty\'',
      'UPDATE public."User" SET password=\'ATTACK\' WHERE id=\'admin\'',
      'UPDATE public."User" SET "instituteId"=\'ibe\' WHERE id=\'admin\'',
      'UPDATE public."User" SET role=\'INSTITUTE_ADMIN\' WHERE id=\'admin\'',
      'UPDATE public."User" SET "credentialProvisioningState"=\'COMPLETE\' WHERE id=\'admin\'',
      'INSERT INTO public."User"(id,name,email,password,role,"instituteId") VALUES(\'forged-admin\',\'Forged\',\'forged@example.invalid\',\'UNUSABLE\',\'ADMIN\',\'ics\')',
    ]) await assert.rejects(() => app.query(sql), e => e.code === '42501');
    await app.end();
  });
  await check('existing ICS Administrator assigns and revokes Program Head without changing instructor role', async () => {
    const directory = await faculty.facultyDirectory(actor);
    const version = directory.programs.find(p => p.id === 'bsit').version;
    const input = { instructorId: 'faculty', designation: 'PROGRAM_HEAD', version };
    const result = await faculty.setFaculty(actor, 'bsit', input);
    assert.equal((await db.programHeadAssignment.findUnique({ where: { programId_userId: { programId: 'bsit', userId: 'faculty' } } })).isActive, true);
    assert.equal((await db.user.findUnique({ where: { id: 'faculty' } })).role, 'PROFESSOR');
    await assert.rejects(() => faculty.setFaculty(actor, 'bsit', input), e => e.status === 409);
    await faculty.setFaculty(actor, 'bsit', { ...input, designation: 'FACULTY', version: result.version });
    await assert.rejects(() => faculty.setFaculty(actor, 'bsit', { ...input, instructorId: 'foreign', version: result.version + 1 }), e => e.status === 403);
    await assert.rejects(() => faculty.setFaculty(actor, 'foreign-program', { ...input, version: 1 }), e => e.status === 404);
    await assert.rejects(() => faculty.facultyDirectory({ id: 'head', sessionId: 'session-head', tokenHash: accounts.head.actor.tokenHash }), e => e.status === 403);
    await assert.rejects(() => faculty.facultyDirectory({ id: 'otheradmin', sessionId: 'session-otheradmin', tokenHash: accounts.otheradmin.actor.tokenHash }), e => e.status === 403);
  });
  await check('Administrator faculty mutation and newly-created instructor roll back on audit failure', async () => {
    const version = (await db.academicProgram.findUnique({ where: { id: 'bsit' } })).chartVersion;
    await cluster.owner.query(`CREATE FUNCTION public.reject_faculty_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ICS_FACULTY_DESIGNATION_SET' THEN RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_faculty_audit BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.reject_faculty_audit()`);
    try {
      await assert.rejects(() => faculty.setFaculty(actor, 'bsit', { name: 'Must rollback', email: 'rollback-faculty@example.invalid', password: 'Synthetic-Only-457', designation: 'FACULTY', version }, true));
      assert.equal(await db.user.count({ where: { email: 'rollback-faculty@example.invalid' } }), 0);
      assert.equal((await db.academicProgram.findUnique({ where: { id: 'bsit' } })).chartVersion, version);
    } finally { await cluster.owner.query('DROP TRIGGER reject_faculty_audit ON public."AuditLog"; DROP FUNCTION public.reject_faculty_audit()'); }
  });
  await check('Administrator direct APIs and RSC scope deny foreign institutes, protected targets and global permissions', async () => {
    for (const req of [
      request('/api/admin/users?instituteCode=ibe', null, 'GET'),
      request('/api/admin/users/admin/status', { isActive: false }),
      request('/api/admin/users/otheradmin/status', { isActive: false }),
      request('/api/admin/permissions', { role: 'ADMIN' }, 'PUT'),
      request('/api/courses/foreign-course', null, 'GET'),
      request('/api/gamification/commend', { studentId: 'foreign', amount: 1 }),
      request('/api/admin/users', { instituteCode: 'ibe', role: 'STUDENT' }),
    ]) {
      const denial = await denyLegacyApi(req, 'owned Administrator fixture');
      assert.ok(denial && [403,404].includes(denial.status), new URL(req.url).pathname);
    }
    await assert.rejects(() => asAccount(accounts.admin, () => requireLegacyActor('RSC fixture', { institute: 'ibe' })), e => e.status === 403);
    assert.equal((await asAccount(accounts.admin, () => requireLegacyActor('RSC fixture', { institute: 'ics' }))).id, 'admin');
  });
  await check('callable administration binds real actor and institute before writes', async () => {
    const { bulkUserIngestion } = await import('../../apps/web/src/lib/skills/bulk-user-ingestion.ts');
    const { bulkAssignInstructor } = await import('../../apps/web/src/lib/skills/bulk-assign-instructor.ts');
    const { enrollmentManager } = await import('../../apps/web/src/lib/skills/enrollment-manager.ts');
    const { getInstructors } = await import('../../apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts');
    await assert.rejects(() => asAccount(accounts.admin, () => getInstructors('ibe')), e => e.status === 403);
    const csvData = 'name,email,role\nMust not create,forbidden@example.invalid,STUDENT';
    assert.equal((await asAccount(accounts.admin, () => bulkUserIngestion({ actorId: 'otheradmin', instituteCode: 'ics', csvData }))).success, false);
    assert.equal((await asAccount(accounts.admin, () => bulkUserIngestion({ actorId: 'admin', instituteCode: 'ibe', csvData }))).success, false);
    assert.equal((await asAccount(accounts.faculty, () => bulkAssignInstructor({ instituteId: 'ics', assignments: [] }))).success, false);
    assert.equal((await asAccount(accounts.admin, () => enrollmentManager({ actorId: 'otheradmin', courseId: 'program-class', action: 'auto-process', enrollmentIds: [] }))).success, false);
    assert.equal(await db.user.count({ where: { email: 'forbidden@example.invalid' } }), 0);
  });
}

export async function administratorBrowserChecks({ browser, base, db, check, output, report }) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  try {
    await check('actual Administrator login retains the main dashboard and ICS faculty navigation', async () => {
      const login = await context.request.post(base + '/api/auth/login', { data: { email: 'admin@example.invalid', password: 'Synthetic-Admin-Only-12345', instituteCode: 'ics', acceptedPolicies: true } });
      assert.equal(login.status(), 200);
      assert.equal((await login.json()).user.role, 'ADMIN');
      await page.goto(base + '/ics/admin');
      await page.getByRole('link', { name: 'Faculty & Program Heads', exact: true }).first().click();
      await page.getByRole('heading', { name: 'ICS faculty & Program Heads', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/ics/admin/faculty');
      assert.equal(await page.getByText('Switch Campus', { exact: true }).count(), 0);
      await page.getByLabel('ICS program', { exact: true }).selectOption('bsit');
      await page.getByLabel('Instructor', { exact: true }).selectOption('faculty');
      await page.getByLabel('Program designation', { exact: true }).selectOption('PROGRAM_HEAD');
      await page.getByRole('button', { name: 'Save designation', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Designation updated.' }).waitFor();
      assert.equal((await db.programHeadAssignment.findUnique({ where: { programId_userId: { programId: 'bsit', userId: 'faculty' } } })).isActive, true);
      await page.getByLabel('Instructor', { exact: true }).selectOption('faculty');
      await page.getByLabel('Program designation', { exact: true }).selectOption('FACULTY');
      await page.getByRole('button', { name: 'Save designation', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Designation updated.' }).waitFor();
      await page.screenshot({ path: path.join(output, 'administrator-faculty.png'), fullPage: true });
    });
    await check('Administrator filters instructor classes and saves programs on desktop and mobile', async () => {
      await page.goto(base + '/ics/admin/courses?instructor=faculty');
      await page.getByRole('heading', { name: 'Course Management', exact: true }).waitFor();
      await page.getByLabel('Instructor', { exact: true }).selectOption('faculty');
      const row = page.getByRole('row').filter({ hasText: 'Synthetic program-class' });
      const before = await db.course.findUnique({ where: { id: 'program-class' }, include: { enrollments: true } });
      await row.getByRole('combobox').selectOption('other');
      await row.getByRole('button', { name: 'Save program', exact: true }).click();
      await row.getByRole('status').filter({ hasText: 'Program saved.' }).waitFor();
      assert.deepEqual(await db.course.findUnique({ where: { id: 'program-class' }, include: { enrollments: true } }), { ...before, programId: 'other' });
      await page.reload();
      await page.getByLabel('Instructor', { exact: true }).selectOption('faculty');
      assert.equal(await row.getByRole('combobox').inputValue(), 'other');
      await page.screenshot({ path: path.join(output, 'administrator-class-program-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.getByLabel('Instructor', { exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('main').getBoundingClientRect().x < 50);
      await row.getByRole('combobox').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'administrator-class-program-mobile.png'), fullPage: true });
      await row.getByRole('combobox').selectOption('bsit');
      await row.getByRole('button', { name: 'Save program', exact: true }).click();
      await row.getByRole('status').filter({ hasText: 'Program saved.' }).waitFor();
      await page.setViewportSize({ width: 1366, height: 900 });
      await row.getByRole('button', { name: 'Edit course', exact: true }).click();
      assert.equal(await page.getByLabel('Program', { exact: true }).inputValue(), 'bsit');
      await page.getByRole('button', { name: 'Close modal', exact: true }).click();
    });
    await check('real HTTP Administrator requests enforce own institute and protect peer/higher accounts', async () => {
      const call = (url, method = 'GET', body) => page.evaluate(async ({ url, method, body }) => {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: res.status, body: await res.json() };
      }, { url, method, body });
      const list = await call('/api/admin/users?instituteCode=ics');
      assert.equal(list.status, 200);
      assert.ok(list.body.data.every(u => u.instituteCode === 'ics' && ['INSTRUCTOR','STUDENT'].includes(u.role)));
      assert.equal((await call('/api/courses?institute=ics')).status, 200);
      const created = await call('/api/admin/users', 'POST', { name: 'Own student', email: 'own-student@example.invalid', role: 'STUDENT', instituteCode: 'ics' });
      assert.equal(created.status, 201);
      assert.equal(created.body.user.role, 'STUDENT');
      assert.equal((await db.user.findUnique({ where: { id: created.body.user.id } })).instituteId, 'ics');
      assert.equal((await call('/api/admin/users/' + created.body.user.id + '/status', 'PATCH', { isActive: false })).status, 200);
      const audit = await call('/api/admin/audit-logs');
      assert.equal(audit.status, 200);
      assert.ok(audit.body.data.every(row => row.adminId !== 'otheradmin' && !row.action.startsWith('OPERATOR_')));
      for (const [url, method, body, status] of [
        ['/api/courses?institute=ibe','GET',undefined,403],
        ['/api/courses/foreign-course','GET',undefined,404],
        ['/api/admin/users/foreign','GET',undefined,404],
        ['/api/admin/users/admin/status','PATCH',{isActive:false},403],
        ['/api/admin/users/otheradmin/role','PATCH',{newRole:'STUDENT',adminPassword:'not-used'},404],
        ['/api/admin/users','POST',{name:'Forbidden',email:'forged-admin@example.invalid',role:'ADMIN',instituteCode:'ics'},403],
        ['/api/admin/users','POST',{name:'Forbidden',email:'forged-student@example.invalid',role:'STUDENT',instituteCode:'ibe'},403],
        ['/api/admin/permissions','PUT',{matrix:{}},403],
        ['/api/super-user/ics/institute-admins','GET',undefined,403],
      ]) assert.equal((await call(url,method,body)).status,status,method+' '+url);
      await page.goto(base + '/ics/institute-administration/faculty');
      assert.equal(new URL(page.url()).pathname, '/ics/admin/faculty');
      const foreign = await page.goto(base + '/ibe/admin');
      report.administratorForeignNavigation = { requestedPath: '/ibe/admin', finalPath: new URL(page.url()).pathname, status: foreign.status() };
      // A layout redirect may complete before the parallel RSC not-found result.
      // A streamed not-found can also carry 200; require the actual denial UI.
      if (new URL(page.url()).pathname.startsWith('/ics')) assert.equal(foreign.status(), 200);
      else {
        assert.ok([200,404].includes(foreign.status()));
        await page.getByRole('heading', { name: 'This page could not be found.', exact: true }).waitFor();
      }
      assert.ok(!(await page.locator('body').innerText()).includes('Foreign private class'));
    });
  } finally {
    await context.request.post(base + '/api/auth/logout');
    await context.close();
  }
}
