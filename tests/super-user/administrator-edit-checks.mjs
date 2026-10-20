import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { installAdministratorCredentials } from '../../scripts/install-administrator-credentials.mjs';

export async function administratorEditChecks({ cluster, db, accounts, check }) {
  const service = await import('../../apps/web/src/lib/super-user-v1/institute-admin.ts');
  const api = await import('../../apps/web/src/app/api/super-user/[institute]/institute-admins/[userId]/route.ts');
  const { validateSessionToken } = await import('../../apps/web/src/lib/auth-session.ts');
  const limits = await import('../../apps/web/src/lib/rate-limit.ts');
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = await db.session.create({ data: { userId: accounts.super.id, tokenHash, expiresAt: new Date(Date.now() + 3600000) } });
  const actor = { id: accounts.super.id, sessionId: session.id, tokenHash };
  const institute = { id: 'ics', code: 'ics' };
  const secret = 'Synthetic-Super-Only-12345';
  const nextPassword = 'Synthetic-Updated-Admin-12345';
  const input = { name: 'Updated Administrator', email: 'updated-admin@example.invalid', currentPassword: secret };
  let id;
  const oldStore = limits.getRateLimitStore();
  try {
    await check('credential successor installs without changing existing users and is idempotent', async () => {
      const before = await db.user.findUnique({ where: { id: 'admin' } });
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, 'admin', { ...input, newPassword: nextPassword }), error => error.status === 503 && error.message === 'CREDENTIAL_SETUP_REQUIRED');
      assert.deepEqual(await db.user.findUnique({ where: { id: 'admin' } }), before);
      assert.equal((await installAdministratorCredentials(cluster.owner)).applied, true);
      assert.equal((await installAdministratorCredentials(cluster.owner)).alreadyInstalled, true);
      assert.deepEqual(await db.user.findUnique({ where: { id: 'admin' } }), before);
      const created = await service.createInstituteAdmin(actor, institute, { name: 'Editable Administrator', email: 'editable-admin@example.invalid' });
      id = created.instituteAdmin.id;
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, id, { ...input, newPassword: nextPassword }), error => error.status === 409);
      const pending = await db.user.findUnique({ where: { id } });
      const operator = await cluster.connect('bqual_test_operator');
      await operator.query('SELECT super_user_security.complete_handoff($1,$2,$3,$4,$5,$6,$7)', [id, 'ics', pending.password, await hash('Synthetic-Original-Admin-12345', 10), 'synthetic_admin_edit_handoff_01', createHash('sha256').update('SYNTHETIC_ONLY').digest('hex'), 'SYNTHETIC_FIXTURE_ONLY']);
      await service.changeInstituteAdminStatus(actor, institute, id, true);
    });

    await check('administrator profile editing validates actor password, target, input and origin', async () => {
      const context = { params: Promise.resolve({ institute: 'ics', userId: id }) };
      const request = (body, selectedToken = token, origin) => new Request(`http://localhost/api/super-user/ics/institute-admins/${id}`, { method: 'PATCH', headers: { ...(selectedToken ? { Authorization: `Bearer ${selectedToken}` } : {}), 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
      assert.equal((await api.PATCH(request(input, null), context)).status, 401);
      assert.equal((await api.PATCH(request(input, accounts.admin.token), context)).status, 403);
      assert.equal((await api.PATCH(request(input, token, 'https://foreign.invalid'), context)).status, 403);
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, id, { ...input, currentPassword: 'wrong' }), error => error.status === 403);
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, id, { ...input, role: 'SUPER_USER' }), error => error.status === 400);
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, id, { ...input, newPassword: 'weak' }), error => error.status === 400);
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, 'head', input), error => error.status === 403);
      await assert.rejects(() => service.updateInstituteAdmin(actor, { id: 'ibe', code: 'ibe' }, id, input), error => error.status === 403);
      await assert.rejects(() => service.updateInstituteAdmin(actor, institute, id, { ...input, email: 'admin@example.invalid' }), error => error.status === 409);
      const oldSession = await db.session.create({ data: { userId: id, tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
      const response = await api.PATCH(request(input), context);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.instituteAdmin.name, input.name);
      assert.equal(body.instituteAdmin.email, input.email);
      assert.equal(body.sessionsEnded, true);
      assert.equal(await db.session.findUnique({ where: { id: oldSession.id } }), null);
      assert.ok(!JSON.stringify(body).includes('password'));
      const unchangedSession = await db.session.create({ data: { userId: id, tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
      const profileOnly = await service.updateInstituteAdmin(actor, institute, id, { ...input, name: 'Profile name only' });
      assert.equal(profileOnly.sessionsEnded, false);
      assert.ok(await db.session.findUnique({ where: { id: unchangedSession.id } }));
    });

    await check('administrator password changes hash credentials, end sessions, consume resets and preserve privileges', async () => {
      const before = await db.user.findUnique({ where: { id } });
      const targetToken = randomBytes(32).toString('hex');
      await db.session.create({ data: { userId: id, tokenHash: createHash('sha256').update(targetToken).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
      await db.passwordResetOtp.create({ data: { userId: id, otpCodeHash: 'SYNTHETIC_ONLY', expiresAt: new Date(Date.now() + 3600000) } });
      const result = await service.updateInstituteAdmin(actor, institute, id, { ...input, newPassword: nextPassword });
      const after = await db.user.findUnique({ where: { id } });
      assert.equal(await compare(nextPassword, after.password), true);
      assert.notEqual(after.password, nextPassword);
      for (const key of ['role', 'instituteId', 'permissions', 'isActive', 'credentialProvisioningState']) assert.equal(after[key], before[key]);
      assert.equal(result.credentialsChanged, true);
      assert.equal(await validateSessionToken(targetToken), null);
      assert.equal(await db.passwordResetOtp.count({ where: { userId: id, isUsed: false } }), 0);
      assert.equal(await db.auditLog.count({ where: { targetId: id, action: 'ADMIN_RESET_PASSWORD' } }), 1);
      const app = await cluster.connect();
      const attackHash = await hash('Synthetic-Attack-12345', 12);
      await assert.rejects(() => app.query('UPDATE public."User" SET password=$1 WHERE id=$2', [attackHash, id]), error => error.code === '42501');
      await assert.rejects(() => app.query('INSERT INTO super_user_security.academic_assignment_permits VALUES(pg_backend_pid(),txid_current(),\'User\',\'UPDATE\',\'ics\',$1)', [id]), error => error.code === '42501');
      await assert.rejects(() => app.query('SELECT super_user_security.reset_administrator_password($1,$2,$3,$4,$5)', [accounts.head.actor.sessionId, accounts.head.actor.tokenHash, id, 'ics', after.password]), error => error.code === '42501');
      assert.equal((await cluster.owner.query('SELECT count(*)::int n FROM super_user_security.academic_assignment_permits WHERE table_name=\'User\'')).rows[0].n, 0);
    });

    await check('failed credential audits roll back profile, password and session changes', async () => {
      const before = await db.user.findUnique({ where: { id } });
      const targetSession = await db.session.create({ data: { userId: id, tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
      await cluster.owner.query(`CREATE FUNCTION public.reject_credential_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ADMIN_RESET_PASSWORD' THEN RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_credential_audit BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.reject_credential_audit()`);
      try { await assert.rejects(() => service.updateInstituteAdmin(actor, institute, id, { ...input, name: 'Must roll back', newPassword: 'Synthetic-Rollback-12345' })); }
      finally { await cluster.owner.query('DROP TRIGGER reject_credential_audit ON public."AuditLog"; DROP FUNCTION public.reject_credential_audit()'); }
      assert.deepEqual(await db.user.findUnique({ where: { id } }), before);
      assert.ok(await db.session.findUnique({ where: { id: targetSession.id } }));
      assert.equal((await cluster.owner.query('SELECT count(*)::int n FROM super_user_security.academic_assignment_permits WHERE table_name=\'User\'')).rows[0].n, 0);
    });

    await check('administrator edit reauthentication attempts are rate-limited', async () => {
      limits.setRateLimitStore(new limits.MemoryRateLimitStore());
      const context = { params: Promise.resolve({ institute: 'ics', userId: id }) };
      const request = () => new Request(`http://localhost/api/super-user/ics/institute-admins/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, currentPassword: 'wrong' }) });
      for (let attempt = 0; attempt < 5; attempt++) assert.equal((await api.PATCH(request(), context)).status, 403);
      assert.equal((await api.PATCH(request(), context)).status, 429);
    });
  } finally {
    limits.setRateLimitStore(oldStore);
    await db.session.deleteMany({ where: { id: session.id } });
  }
}
