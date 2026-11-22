const assert = require('node:assert/strict');

module.exports = async function adminDatabaseCases(db, invoke, tokens, source) {
  const restore = source('admin/database/restore').POST;
  const request = records => invoke(restore, tokens.admin, '/api/admin/database/restore', 'POST', { model: 'User', records });
  let response = await request([{ id: 'student', bio: 'authorized-profile-restore' }]);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: 'student' } })).bio, 'authorized-profile-restore');
  response = await request([{ id: 'foreign-student', bio: 'foreign-write' }]);
  assert.equal(response.status, 404);
  response = await request([{ id: 'student', bio: 'must-rollback' }, { id: 'foreign-student', bio: 'foreign-write' }]);
  assert.equal(response.status, 404);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: 'student' } })).bio, 'authorized-profile-restore');
  for (const forbidden of [{ password: 'dummy-only' }, { role: 'ADMIN' }, { instituteId: 'ite' }, { sessions: { create: {} } }]) {
    assert.equal((await request([{ id: 'student', ...forbidden }])).status, 400);
  }
  assert.equal((await request([{ id: 'new-user', bio: 'no-provisioning' }])).status, 404);
  assert.equal(await db.user.count({ where: { id: 'new-user' } }), 0);
  const snapshotRestore = await invoke(restore, tokens.admin, '/api/admin/database/restore', 'POST', { snapshotId: 'not-a-backup' });
  assert.equal(snapshotRestore.status, 400);
  const rows = source('admin/database/tables/[tableName]').GET;
  response = await invoke(rows, tokens.admin, '/api/admin/database/tables/User', 'GET', undefined, { tableName: 'User' });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.totalCount, await db.user.count({ where: { instituteId: 'ics' } }));
  assert.ok(data.rows.length > 0);
  assert.ok(data.rows.every(row => row.instituteId === 'ics'));
  assert.ok(data.rows.every(row => !Object.keys(row).some(key => /password|token|secret|pin|credential|googleSubject/i.test(key))));
  for (const model of ['Session', 'PasswordResetOtp', 'GithubToken', '__proto__']) {
    assert.equal((await invoke(source('admin/database/export').GET, tokens.admin, `/api/admin/database/export?model=${model}`)).status, 403);
    assert.equal((await invoke(rows, tokens.admin, `/api/admin/database/tables/${model}`, 'GET', undefined, { tableName: model })).status, 403);
  }
  const overview = await invoke(source('admin/database/overview').GET, tokens.admin, '/api/admin/database/overview');
  assert.equal(overview.status, 200);
  const tables = (await overview.json()).categories.flatMap(category => category.tables);
  assert.equal(tables.find(table => table.model === 'User').count, data.totalCount);
  assert.ok(!tables.some(table => ['Session', 'PasswordResetOtp', 'GithubToken'].includes(table.model)));
  const backup = source('admin/database/backup');
  const created = await invoke(backup.POST, tokens.admin, '/api/admin/database/backup', 'POST', {});
  assert.equal(created.status, 201);
  const snapshot = (await created.json()).snapshot;
  assert.equal(snapshot.instituteId, 'ics');
  assert.equal(snapshot.recordsCount, await db.user.count({ where: { instituteId: 'ics' } }) +
    await db.course.count({ where: { instituteId: 'ics' } }) + await db.studentSubmission.count({ where: { syllabusItem: { course: { instituteId: 'ics' } } } }));
  for (const handler of [source('admin/database/export').GET, rows, source('admin/database/overview').GET, backup.GET]) {
    const denied = await invoke(handler, tokens.student, '/api/admin/database/export?model=User', 'GET', undefined, { tableName: 'User' });
    assert.equal(denied.status, 403);
  }
};
